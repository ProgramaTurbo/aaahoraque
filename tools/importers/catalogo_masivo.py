#!/usr/bin/env python3
"""AAAhoraQue: importación masiva conservadora de catálogos universitarios oficiales.

Proveedor habilitado en v1: Universidad de Cantabria, grados 2026-2027.
Dos conjuntos de datos institucionales, descargados una sola vez cada uno.

Comandos:
  stage   -> descarga, guarda fuentes originales + manifiesto validado (SIN DB)
  audit   -> consulta QEDU en modo lectura, cruza las ofertas EXACTAS, genera informe
  apply   -> EXIGE auditoría confirmada, backup y transacción; SIN modificar synthetic_*
  coverage -> auditoría nacional de la cobertura de universidades y ofertas
  selftest -> pruebas internas, sin red y sin DB

Requisitos: Python >=3.10, psql y pg_dump. No requiere Node/pnpm.
No convierte datos faltantes en supuestos, ni vincula asignaturas por similitud.
"""
from __future__ import annotations
import argparse
import base64
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unicodedata
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
import uuid

COURSE = '2026-2027'
PROVIDER = 'UNIVERSIDAD DE CANTABRIA'
ROOT = Path(os.environ.get('AAAHORAQUE_MASS_ROOT', '/home/alumno/Aaahoraque/imports/official-national'))
DATA = ROOT / COURSE / 'unican'
NAMESPACE = uuid.UUID('f7242704-6d9d-4cfa-b9bf-292bb61432cc')
SOURCES = {
 'plans': 'https://datos.unican.es/docencia/3266/planes-de-estudio-de-grado-2026-2027.json',
 'subjects': 'https://datos.unican.es/docencia/3269/asignaturas-de-grado-2026-2027.json',
}
MAX_BYTES = 20_000_000


def norm(v):
    s = ' '.join(str(v or '').replace('\xa0', ' ').split()).casefold()
    return ''.join(ch for ch in unicodedata.normalize('NFD', s) if unicodedata.category(ch) != 'Mn')


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True)+'\n', encoding='utf-8')
    p.chmod(0o600)


def read_json(p):
    return json.loads(p.read_text(encoding='utf-8'))


def sha(b):
    return hashlib.sha256(b).hexdigest()


def sql_str(v):
    """Escapa Unicode sin concatenar literales SQL que dependan de la codificación."""
    b = base64.b64encode(str(v).encode('utf-8')).decode('ascii')
    return f"convert_from(decode('{b}','base64'),'UTF8')"


def int_year(v):
    s = str(v or '').strip()
    if not s:
        return None
    if not s.isdigit() or not 1 <= int(s) <= 8:
        raise ValueError(f'Curso académico inválido: {v!r}')
    return int(s)


def ects(v, minimum='0', maximum='700'):
    try:
        d = Decimal(str(v).strip().replace(',', '.'))
    except (InvalidOperation, AttributeError):
        raise ValueError(f'Créditos inválidos: {v!r}')
    if not d.is_finite() or not Decimal(minimum) < d <= Decimal(maximum) or d.as_tuple().exponent < -2:
        raise ValueError(f'Créditos fuera de rango: {v!r}')
    return str(d)


def plan_key(row):
    url = str(row.get('homepage') or '')
    params = parse_qs(urlparse(url).query)
    p = params.get('p', [])
    return p[0] if len(p) == 1 and re.fullmatch(r'\d{1,8}', p[0]) else None


def fetch_json(url):
    p = urlparse(url)
    if (p.scheme, p.hostname, p.port) != ('https', 'datos.unican.es', None):
        raise ValueError('URL no permitida: descarga únicamente desde datos.unican.es por HTTPS')
    r = Request(url, headers={'Accept': 'application/json',
         'User-Agent': 'AAAhoraQue-Academic-Research-Catalog/1.0 (non-commercial)'})
    with urlopen(r, timeout=90) as f:
        redirect = urlparse(f.url)
        if redirect.scheme != 'https' or redirect.hostname != 'datos.unican.es':
            raise ValueError('Redirección fuera del dominio institucional')
        raw = f.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError('Conjunto de datos demasiado grande')
    doc = json.loads(raw.decode('utf-8-sig'))
    if not isinstance(doc, list) or not doc:
        raise ValueError('Respuesta inesperada: se requiere una lista JSON no vacía')
    return raw, doc


def type_of(v):
    n = norm(v)
    if n in ('basica', 'formacion basica'):
        return 'basic'
    if n == 'obligatoria':
        return 'mandatory'
    if n == 'optativa':
        return 'optional'
    if n in ('trabajo fin de grado', 'trabajo de fin de grado', 'tf g', 'tfg'):
        return 'final_project'
    if n in ('practicas externas', 'practicas', 'practicas curriculares'):
        return 'internship'
    # Cualquier categoría desconocida queda para revisión, no adivinamos.
    raise ValueError(f'Carácter académico no reconocido: {v!r}')


def offer_state(value):
    if value is True:
        return 'listed'  # No equivale a matrícula abierta.
    if value is False:
        return 'not_offered'
    return 'unknown'


def build_manifest(plans, subjects, source_hashes):
    """Agrupa cientos/miles de asignaturas, dejando sin vincular las dudosas."""
    keys = ('identifier','title','Center','courseCredits')
    if not all(isinstance(x,dict) and all(k in x for k in keys) for x in plans):
        raise ValueError('JSON de planes: estructura no reconocida')
    subkeys = ('identifier','title','Center','courseCredits','BacherlorsDegree','typology')
    if not all(isinstance(x,dict) and all(k in x for k in subkeys) for x in subjects):
        raise ValueError('JSON de asignaturas: estructura no reconocida')
    plans_by_pc = defaultdict(list)
    plans_by_dn = defaultdict(list)
    for p in plans:
        if norm(p.get('title')) and norm(p.get('Center')):
            plans_by_pc[plan_key(p)].append(p) if plan_key(p) else None
            plans_by_dn[(norm(p['title']),norm(p['Center']))].append(p)
    subs_by_identity = defaultdict(list)
    rejected = []
    rejected_by_plan_p = Counter()
    for row in subjects:
        hp = plan_key(row)
        degree = norm(row['BacherlorsDegree'])
        center = norm(row['Center'])
        candidates = [p for p in plans_by_pc.get(hp,[]) if norm(p['title'])==degree and norm(p['Center'])==center] if hp else []
        if not hp:
            candidates = plans_by_dn.get((degree, center), [])
        # No vinculamos por coincidencias parciales de nombres o centros.
        if len(candidates) != 1:
            if hp:
                rejected_by_plan_p[hp] += 1
            rejected.append({'subject_code':str(row['identifier']), 'degree':row['BacherlorsDegree'],
                             'center':row['Center'], 'plan_p':hp, 'candidate_count':len(candidates),
                             'reason':'plan_absent_or_ambiguous'})
            continue
        p = candidates[0]
        key = (str(p['identifier']), norm(p['title']), norm(p['Center']), plan_key(p) or '')
        subs_by_identity[key].append(row)
    items = []
    for p in plans:
        key = (str(p['identifier']),norm(p['title']),norm(p['Center']),plan_key(p) or '')
        data = subs_by_identity.get(key, [])
        # Repetir plan ID en varios centros requiere conservar ambos por separado.
        record = {'plan_identifier':str(p['identifier']), 'plan_key':plan_key(p),
          'degree_name':str(p['title']).strip(), 'center_name':str(p['Center']).strip(),
          'modality':str(p.get('TeachingModality') or '').strip(),
          'source_course':COURSE, 'total_ects':None, 'plan_homepage':str(p.get('homepage') or ''),
          'subjects':[], 'occurrences':len(data), 'problems':[]}
        try:
            record['total_ects'] = ects(p['courseCredits'], '60')
        except ValueError as e:
            record['problems'].append(str(e))
        by_code = defaultdict(list)
        for s in data:
            by_code[str(s['identifier'])].append(s)
        for code, rows in sorted(by_code.items()):
            try:
                names = {norm(r['title']) for r in rows}
                credit_values = {ects(r['courseCredits'],'0','60') for r in rows}
                if len(names)!=1 or len(credit_values)!=1 or not code or not names.pop():
                    raise ValueError(f'Conflicto de nombre/ECTS en código {code}')
                types = {type_of(r['typology']) for r in rows}
                years = {int_year(r.get('YearOfStudy')) for r in rows}
                if any(y is None for y in years):
                    raise ValueError(f'Curso sin especificar en código {code}')
                statuses = {offer_state(r.get('isCurrentlyOffered')) for r in rows}
                record['subjects'].append({'official_code':code, 'name':str(rows[0]['title']).strip(),
                   'ects':next(iter(credit_values)), 'academic_year':next(iter(years)) if len(years)==1 else None,
                   'semester':None, 'subject_type':next(iter(types)) if len(types)==1 else 'context_dependent',
                   'metadata':{'source_kind':'official_university_catalog','source_institution':PROVIDER,
                     'source_academic_course':COURSE,'occurrence_count':len(rows),
                     'source_plan_identifier':str(p['identifier']),
                     'source_plan_url':str(p.get('homepage') or ''),
                     'source_sha256':source_hashes, 'occurrences':rows,
                     'academic_year_ambiguous':len(years)>1,
                     'subject_type_ambiguous':len(types)>1,
                     'availability_statuses':sorted(statuses)}})
            except ValueError as e:
                record['problems'].append(str(e))
        if not data:
            record['problems'].append('sin_asignaturas_vinculadas')
        if key[3] and rejected_by_plan_p[key[3]]:
            record['problems'].append('asignaturas_del_plan_sin_correspondencia_exacta')
        if len(data) < len(record['subjects']):
            record['problems'].append('recuento_de_apariciones_incoherente')
        items.append(record)
    if not items or len(items)>5000:
        raise ValueError('Volumen de planes sospechoso')
    return {'schema_version':1,'provider':'unican','university':PROVIDER,
        'academic_course':COURSE,'sources':SOURCES, 'source_sha256':source_hashes,
        'created_at':now(), 'plans':items, 'unlinked_subjects_count':len(rejected),
        'unlinked_examples':rejected[:100],
        'totals':{'source_plans':len(plans),'source_subject_rows':len(subjects),
                  'plans_with_subjects':sum(bool(x['subjects']) for x in items),
                  'subject_records':sum(len(x['subjects']) for x in items)}}


def verify_snapshot():
    m = read_json(DATA / 'manifest.json')
    if m.get('schema_version')!=1 or m.get('provider')!='unican' or m.get('sources')!=SOURCES:
        raise ValueError('Manifiesto incompatible')
    raw_plans = (DATA/'planes.json').read_bytes()
    raw_subjects = (DATA/'asignaturas.json').read_bytes()
    hashes = {'plans':sha(raw_plans),'subjects':sha(raw_subjects)}
    if m['source_sha256']!=hashes:
        raise ValueError('SHA256 de los datos originales no coincide')
    rebuilt = build_manifest(json.loads(raw_plans.decode('utf-8-sig')),
            json.loads(raw_subjects.decode('utf-8-sig')), hashes)
    rebuilt['created_at'] = m['created_at']
    if rebuilt != m:
        raise ValueError('Manifiesto alterado o parser distinto: revisar')
    return m


def stage(_args):
    if DATA.joinpath('manifest.json').exists():
        m=verify_snapshot()
        print('FUENTES YA DESCARGADAS Y REVALIDADAS; NO SE HAN SOBRESCRITO')
    else:
        os.umask(0o077)
        DATA.mkdir(parents=True,exist_ok=True,mode=0o700)
        sources={}
        docs={}
        for kind,url in SOURCES.items():
            print('DESCARGANDO', kind, url, flush=True)
            raw,parsed=fetch_json(url)
            sources[kind]=raw
            docs[kind]=parsed
        hashes={k:sha(v) for k,v in sources.items()}
        m=build_manifest(docs['plans'],docs['subjects'],hashes)
        for kind,b in sources.items():
            p=DATA/('planes.json' if kind=='plans' else 'asignaturas.json')
            p.write_bytes(b)
            p.chmod(0o600)
        write_json(DATA/'manifest.json',m)
        verify_snapshot()
    print('PLANES EN FUENTE:',m['totals']['source_plans'])
    print('FILAS DE ASIGNATURAS EN FUENTE:',m['totals']['source_subject_rows'])
    print('PLANES CON ASIGNATURAS:',m['totals']['plans_with_subjects'])
    print('ASIGNATURAS AGRUPADAS:',m['totals']['subject_records'])
    print('FILAS SIN PLAN INEQUÍVOCO:',m['unlinked_subjects_count'])
    print('MANIFIESTO:',DATA/'manifest.json')
    print('SIN CAMBIOS EN POSTGRESQL')


def db_json(query):
    if not os.environ.get('DATABASE_URL'):
        raise RuntimeError('Falta DATABASE_URL: cargar .env.vm.local en la VM')
    p = subprocess.run(['psql',os.environ['DATABASE_URL'],'-X','-At','-v','ON_ERROR_STOP=1',
      '-c',f'SELECT COALESCE(json_agg(x), \'[]\'::json)::text FROM ({query}) x'],
      capture_output=True,text=True,check=True)
    return json.loads(p.stdout.strip())


def offerings():
    return db_json('''SELECT o.id::text AS offering_id, u.official_name AS university,
       d.name AS degree, d.academic_level AS level, c.official_name AS center,
       o.modality FROM degree_offerings o
       JOIN universities u ON u.id=o.university_id
       JOIN degrees d ON d.id=o.degree_id
       LEFT JOIN academic_centers c ON c.id=o.academic_center_id''')


def get_matches(manifest, available):
    uc=[o for o in available if norm(o['university'])==norm(PROVIDER)]
    report=[]
    for plan in manifest['plans']:
        problems=list(plan['problems'])
        if len(plan['subjects'])>500 or len(plan['subjects'])<3:
            problems.append('cantidad_asignaturas_fuera_de_rango')
        candidates=[o for o in uc if norm(o['degree'])==norm(plan['degree_name'])
              and norm(o['center'])==norm(plan['center_name']) and norm(o['level']) in ('grado','bachelor')]
        modality=norm(plan['modality'])
        if modality:
            candidates=[o for o in candidates if norm(o['modality'])==modality]
        # Si la fuente no informa modalidad, exige igualmente una única oferta.
        if not candidates:
            reasons=['sin_coincidencia_exacta_qedu']
        elif len(candidates)>1:
            reasons=['varias_ofertas_qedu_compatibles']
        else:
            reasons=[]
        reasons.extend(problems)
        report.append({'plan_identifier':plan['plan_identifier'],'plan_key':plan['plan_key'],
             'degree_name':plan['degree_name'],'center_name':plan['center_name'],
             'total_ects':plan['total_ects'], 'subject_count':len(plan['subjects']),
             'occurrence_count':plan['occurrences'],
             'offering_id':candidates[0]['offering_id'] if len(candidates)==1 else None,
             'qedu_identity':({k:candidates[0][k] for k in ('university','degree','center','modality')}
                 if len(candidates)==1 else None),
             'status':'ready' if not reasons else 'review', 'reasons':reasons})
    return report


def audit(_args):
    m=verify_snapshot()
    avail=offerings()
    matches=get_matches(m,avail)
    result={'schema_version':1,'provider':'unican','academic_course':COURSE,
       'source_sha256':m['source_sha256'], 'created_at':now(),
       'plans':matches,'totals':dict(Counter(p['status'] for p in matches)),
       'national_offerings':len(avail),
       'university_offerings':sum(norm(o['university'])==norm(PROVIDER) for o in avail)}
    write_json(DATA/'audit.json',result)
    print('OFERTAS QEDU NACIONALES:',len(avail))
    print('OFERTAS QEDU CANTABRIA:',result['university_offerings'])
    print('PLANES LISTOS PARA IMPORTACIÓN AUTOMÁTICA:',result['totals'].get('ready',0))
    print('PLANES PENDIENTES DE REVISIÓN:',result['totals'].get('review',0))
    print('REPORTE:',DATA/'audit.json')
    print('SIN CAMBIOS EN POSTGRESQL')


def build_sql(m, decisions):
    statements=["SET LOCAL lock_timeout='8s';","SET LOCAL statement_timeout='180s';"]
    applied=[]
    for d in decisions:
        if d['status']!='ready':
            continue
        matches=[p for p in m['plans'] if p['plan_identifier']==d['plan_identifier']
            and p['plan_key']==d['plan_key'] and p['degree_name']==d['degree_name']
            and p['center_name']==d['center_name']]
        if len(matches)!=1:
            raise ValueError('Identidad de plan no es única en el manifiesto: '+str(d['plan_identifier']))
        p=matches[0]
        statements.append(f"\\echo === Plan {len(applied)+1}/{len(decisions)} ===")
        offering=d['offering_id']
        uuid.UUID(offering)
        pid=str(uuid.uuid5(NAMESPACE, f'UNICAN|{offering}|{p["plan_identifier"]}|{COURSE}'))
        name=p['degree_name']+' - '+COURSE+' - '+p['plan_identifier']
        credits=p['total_ects']
        url=SOURCES['plans']
        q=d['qedu_identity']
        if not q or norm(q['university'])!=norm(PROVIDER) or norm(q['degree'])!=norm(p['degree_name']) or norm(q['center'])!=norm(p['center_name']):
            raise ValueError('Correspondencia QEDU inconsistente')
        modality_check = (f'AND o.modality={sql_str(q["modality"])}' if q['modality'] is not None
                          else 'AND o.modality IS NULL')
        statements.append(f'''DO $guard$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM degree_offerings o
            JOIN universities u ON u.id=o.university_id
            JOIN degrees d ON d.id=o.degree_id
            JOIN academic_centers c ON c.id=o.academic_center_id
            WHERE o.id='{offering}'::uuid
              AND u.official_name={sql_str(q['university'])}
              AND d.name={sql_str(q['degree'])}
              AND c.official_name={sql_str(q['center'])}
              {modality_check}
          ) THEN RAISE EXCEPTION 'Correspondencia QEDU no confirmada'; END IF;
          IF EXISTS (SELECT 1 FROM study_plans WHERE id='{pid}'::uuid AND
            (status<>'official' OR degree_offering_id IS DISTINCT FROM '{offering}'::uuid
             OR official_code IS DISTINCT FROM {sql_str(p['plan_identifier'])}
             OR total_ects<>{credits} OR source_url IS DISTINCT FROM {sql_str(url)}))
          THEN RAISE EXCEPTION 'Plan existente contradictorio'; END IF;
        END $guard$;''')
        statements.append(f'''INSERT INTO study_plans
         (id,degree_offering_id,official_code,name,implementation_year,total_ects,status,source_url)
         VALUES ('{pid}'::uuid,'{offering}'::uuid,{sql_str(p['plan_identifier'])},
          {sql_str(name)},NULL,{credits},'official',{sql_str(url)})
          ON CONFLICT(id) DO NOTHING;''')
        for s in p['subjects']:
            sid=str(uuid.uuid5(NAMESPACE, f'UNICAN|{pid}|SUBJECT|{s["official_code"]}'))
            meta_sql=sql_str(json.dumps(s['metadata'],ensure_ascii=False,sort_keys=True))+'::jsonb'
            year='NULL' if s['academic_year'] is None else str(int(s['academic_year']))
            stype=sql_str(s['subject_type'])
            scode=sql_str(s['official_code'])
            sname=sql_str(s['name'])
            ect=s['ects']
            surl=SOURCES['subjects']
            statements.append(f'''INSERT INTO subjects
              (id,study_plan_id,official_code,name,ects,academic_year,semester,subject_type,
               competencies,area_profile,professional_profile,learning_components,
               estimated_difficulty,estimated_workload,metadata,source_url)
              VALUES ('{sid}'::uuid,'{pid}'::uuid,{scode},{sname},{ect},{year},NULL,{stype},
                 '[]'::jsonb,'{{}}'::jsonb,'{{}}'::jsonb,'{{}}'::jsonb,NULL,NULL,
                 {meta_sql},{sql_str(surl)}) ON CONFLICT(id) DO NOTHING;''')
            statements.append(f'''DO $guard$ BEGIN IF NOT EXISTS (
              SELECT 1 FROM subjects WHERE id='{sid}'::uuid AND study_plan_id='{pid}'::uuid
                AND official_code={scode} AND name={sname} AND ects={ect}
                AND academic_year IS NOT DISTINCT FROM {year}
                AND semester IS NULL AND subject_type={stype} AND metadata={meta_sql}
              ) THEN RAISE EXCEPTION 'Asignatura existente contradictoria'; END IF;
              END $guard$;''')
        statements.append(f'''DO $guard$ BEGIN
           IF (SELECT count(*) FROM subjects WHERE study_plan_id='{pid}'::uuid)<>{len(p['subjects'])}
             OR (SELECT coalesce(sum((metadata->>'occurrence_count')::int),0)
                 FROM subjects WHERE study_plan_id='{pid}'::uuid)<>{p['occurrences']}
           THEN RAISE EXCEPTION 'Recuento final de asignaturas no coincide'; END IF;
         END $guard$;''')
        applied.append({'plan_id':pid,'plan_identifier':p['plan_identifier'],
          'offering_id':offering,'subjects':len(p['subjects'])})
    # El COMMIT lo hace psql --single-transaction, no el fichero SQL.
    return '\n'.join(statements), applied


def apply(args):
    if not args.confirm:
        raise ValueError('Sin --confirm nunca se escribe en PostgreSQL')
    m=verify_snapshot()
    audit_file=DATA/'audit.json'
    a=read_json(audit_file)
    if a.get('schema_version')!=1 or a.get('source_sha256')!=m['source_sha256']:
        raise ValueError('La auditoría no coincide con las fuentes originales')
    fresh=get_matches(m,offerings())
    if fresh!=a['plans']:
        raise ValueError('La auditoría QEDU no coincide con el catálogo actual; repetir audit')
    ready=[d for d in fresh if d['status']=='ready']
    if not ready:
        raise ValueError('Ningún plan con correspondencia exacta; revisar informe')
    if args.max_plans is not None:
        if args.max_plans<1:
            raise ValueError('max-plans debe ser positivo')
        ready=ready[:args.max_plans]
    if len(set((p['offering_id'],p['plan_identifier']) for p in ready)) != len(ready):
        raise ValueError('Colisión de identificador de plan en una misma oferta')
    # No sobrescribimos catálogos existentes: si han sido importados, revisión manual.
    sql, applied=build_sql(m,ready)
    if not applied:
        raise ValueError('Sin planes listos')
    if args.dry_run:
        print('DRY-RUN: planes seleccionados',len(applied),
              '| asignaturas',sum(p['subjects'] for p in applied))
        print('NO se ha creado backup ni se ha escrito en PostgreSQL.')
        return
    backup_dir=DATA/'backups'
    backup_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=backup_dir/f'before-national-uc-{stamp}.dump'
    os.umask(0o077)
    subprocess.run(['pg_dump',os.environ['DATABASE_URL'],'-Fc','--no-owner','--no-privileges',
        '-t','public.study_plans','-t','public.subjects','-f',str(backup)],check=True)
    backup.chmod(0o600)
    if backup.stat().st_size < 1024:
        raise RuntimeError('Copia de seguridad demasiado pequeña')
    print('BACKUP:',backup,flush=True)
    print('PLANES QUE SE INTENTARÁN IMPORTAR:',len(applied),flush=True)
    print('ASIGNATURAS:',sum(p['subjects'] for p in applied),flush=True)

    # No enviar varios megabytes por stdin: si psql procesa lentamente sus
    # consultas, el pipe se llena y Python se bloquea al escribir.
    # Guardar SQL con permiso 0600 y hacer que psql lo lea directamente.
    run_dir = DATA / 'executions'
    run_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, sql_path = tempfile.mkstemp(prefix=f'uc-{stamp}-', suffix='.sql', dir=run_dir)
    sql_file = Path(sql_path)
    sql_bytes = sql.encode('utf-8')
    try:
        with os.fdopen(fd, 'wb') as fp:
            fp.write(sql_bytes)
            fp.flush()
            os.fsync(fp.fileno())
        sql_file.chmod(0o600)
        print('SQL PREPARADO:', sql_file, f'({len(sql_bytes):,} bytes)', flush=True)
        print('EJECUCIÓN ÚNICA TRANSACCIÓN: leyendo archivo, no pipe', flush=True)
        # No se ejecutará ninguna orden COMMIT del SQL: psql --single-transaction
        # es responsable de BEGIN/COMMIT. Ante error: ON_ERROR_STOP y rollback.
        subprocess.run(['psql', os.environ['DATABASE_URL'], '-X',
                        '-v', 'ON_ERROR_STOP=1', '-q', '--single-transaction',
                        '-f', str(sql_file)], check=True)
        write_json(DATA / f'applied-{stamp}.json', {
            'executed_at': now(), 'plans': applied,
            'manifest_sha256': sha((DATA/'manifest.json').read_bytes()),
            'generated_sql_sha256': sha(sql_bytes),
            'backup': str(backup)
        })
        sql_file.unlink()
        print('APLICACIÓN TRANSACCIONAL COMPLETADA; datos synthetic_* intactos.', flush=True)
    except BaseException:
        print('EJECUCIÓN NO CERTIFICADA: comprobar PostgreSQL antes de reintentar.',
              file=sys.stderr, flush=True)
        print('SQL conservado para diagnóstico:', sql_file, file=sys.stderr, flush=True)
        raise


def coverage(_args):
    all_o=offerings()
    counts=db_json('''SELECT u.official_name AS university,
       count(*) FILTER (WHERE p.status='official')::int AS official_plans,
       count(*) FILTER (WHERE p.status='synthetic')::int AS synthetic_plans,
       count(distinct o.id)::int AS covered_offerings
       FROM universities u LEFT JOIN degree_offerings o ON o.university_id=u.id
       LEFT JOIN study_plans p ON p.degree_offering_id=o.id
       GROUP BY u.id, u.official_name''')
    by=defaultdict(lambda: {'offers':0,'official_plans':0,'synthetic_plans':0,'covered_offerings':0})
    for o in all_o:
        by[o['university']]['offers']+=1
    for c in counts:
        by[c['university']]['official_plans']=int(c['official_plans'])
        by[c['university']]['synthetic_plans']=int(c['synthetic_plans'])
    # Ofertas cubiertas oficialmente, sin inflar los conteos por planes distintos.
    covered=db_json('''SELECT u.official_name AS university, count(distinct o.id)::int AS covered
       FROM degree_offerings o JOIN universities u ON u.id=o.university_id
       JOIN study_plans p ON p.degree_offering_id=o.id AND p.status='official'
       GROUP BY u.id,u.official_name''')
    for c in covered:
        by[c['university']]['covered_offerings']=int(c['covered'])
    report={'generated_at':now(),'total_universities':len(by),
        'total_offerings':sum(x['offers'] for x in by.values()),
        'covered_offerings':sum(x['covered_offerings'] for x in by.values()),
        'universities':[{'name':n,**x,'missing_offerings':x['offers']-x['covered_offerings']}
          for n,x in sorted(by.items())]}
    write_json(ROOT/'coverage-national.json',report)
    print('UNIVERSIDADES:',report['total_universities'])
    print('OFERTAS QEDU:',report['total_offerings'])
    print('OFERTAS CON ALGÚN PLAN OFICIAL:',report['covered_offerings'])
    print('INFORME:',ROOT/'coverage-national.json')


def selftest(_args):
    pl=[{'identifier':'G-INFORMATICA','title':'Grado en Ingeniería Informática',
         'Center':'FACULTAD DE CIENCIAS','courseCredits':240,'TeachingModality':'Presencial',
         'homepage':'https://web.unican.es/estudios/detalle-estudio?p=98'}]
    s=[{'identifier':'G1','title':'Álgebra','Center':'FACULTAD DE CIENCIAS',
       'BacherlorsDegree':'Grado en Ingeniería Informática','courseCredits':6,
       'typology':'BÁSICA','YearOfStudy':'1','isCurrentlyOffered':True,
       'homepage':'https://web.unican.es/estudios/detalle-asignatura?c=G1&p=98'} for _ in range(2)]
    s+=[dict(s[0],identifier='G2',title='Programación',typology='OBLIGATORIA')]
    hashes={'plans':'p','subjects':'s'}
    m=build_manifest(pl,s,hashes)
    assert m['totals']['source_plans']==1
    assert m['totals']['subject_records']==2
    assert m['plans'][0]['subjects'][0]['metadata']['occurrence_count']==2
    o=[{'offering_id':str(uuid.uuid4()),'university':PROVIDER,
        'degree':'Grado en Ingeniería Informática','center':'Facultad de Ciencias',
        'modality':'Presencial','level':'GRADO'}]
    matches=get_matches(m,o)
    assert matches[0]['status']=='review' and 'cantidad_asignaturas_fuera_de_rango' in matches[0]['reasons']
    assert norm('Administración y Dirección')==norm('administracion y direccion')
    assert offer_state(False)=='not_offered'
    print('SELFTEST OK: normalización, agrupación, correspondencia, validaciones')


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    cmd=ap.add_subparsers(dest='command',required=True)
    for c in ('stage','audit','coverage','selftest'):
        cmd.add_parser(c)
    apply_cmd=cmd.add_parser('apply')
    apply_cmd.add_argument('--confirm',action='store_true')
    apply_cmd.add_argument('--dry-run',action='store_true')
    apply_cmd.add_argument('--max-plans',type=int)
    args=ap.parse_args()
    {'stage':stage,'audit':audit,'apply':apply,'coverage':coverage,'selftest':selftest}[args.command](args)

if __name__=='__main__':
    try:
        main()
    except (ValueError,RuntimeError,subprocess.CalledProcessError,OSError,json.JSONDecodeError) as e:
        print('ERROR:',e,file=sys.stderr)
        sys.exit(1)
