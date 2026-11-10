#!/usr/bin/env python3
"""AAAhoraQue: auditoría, preparación y carga reversible/aislada de datos de demostración del plan UNIZAR 716.

Sin dependencias Python externas; requiere psql para inspección/aplicación PostgreSQL.
  python3 preparar_demo716.py inspect
  python3 preparar_demo716.py prepare --students 2500
  python3 preparar_demo716.py apply --confirm

IMPORTANTE: la población de estudiantes y sus respuestas son FICTICIAS; la tabla
'official_grade_aggregates' contiene solamente recuentos oficiales AGREGADOS 2024-2025.
No se escribe en public ni se reutiliza el conjunto de 40 millones de resultados sintéticos.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REF = HERE / 'referencias_plan716.json'
SCHEMA = HERE / '00_dss_plan716_schema.sql'
OUT = Path(os.environ.get('DSS716_STAGE_DIR', str(Path.home() / 'Aaahoraque' / 'imports' / 'dss-plan716' / 'stage'))).expanduser()
SEED = 71620261109
CATEGORIES = ('not_presented','failed','pass','merit','distinction','honours')
FIELDS = ('student_code','subject_id','academic_course','course_taken','state','grade','weekly_hours',
          'perceived_difficulty','satisfaction','choose_again','election_reason','provenance')
STUDENT_FIELDS = ('student_code','plan_id','is_featured_demo','entry_academic_year','current_course',
                  'mention_code','latent_interest','provenance')


def require_env():
    url = os.environ.get('DB_URL') or os.environ.get('DATABASE_URL')
    if not url or not url.startswith(('postgres://','postgresql://')):
        raise RuntimeError('Falta DB_URL o DATABASE_URL. Carga previamente .env.mv.local sin imprimirlo.')
    if not shutil.which('psql'):
        raise RuntimeError('psql no encontrado; instala el cliente PostgreSQL en el equipo de ejecución')
    return url


def execute_psql(query: str, *, use_file=False, transaction=False) -> str:
    url = require_env()
    env = dict(os.environ)
    # Separar la URL en variables libpq para evitar exponer
    # contraseñas como argumentos del proceso.
    from urllib.parse import urlsplit, unquote, parse_qsl

    parsed = urlsplit(url)

    if not parsed.hostname or not parsed.path.strip("/"):
        raise RuntimeError("DB_URL no contiene host o base de datos válidos.")

    env["PGHOST"] = parsed.hostname
    env["PGPORT"] = str(parsed.port or 5432)
    env["PGDATABASE"] = unquote(parsed.path.lstrip("/"))

    if parsed.username is not None:
        env["PGUSER"] = unquote(parsed.username)

    if parsed.password is not None:
        env["PGPASSWORD"] = unquote(parsed.password)

    options = dict(parse_qsl(parsed.query))
    if "sslmode" in options:
        env["PGSSLMODE"] = options["sslmode"]

    env["PGCONNECT_TIMEOUT"] = "10" 
    cmd = ['psql','-X','-v','ON_ERROR_STOP=1','-P','pager=off']
    if transaction:
        cmd += ['--single-transaction']
    if use_file:
        cmd += ['-f', query]
    else:
        cmd += ['-At','-c',query]
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=180)
    if proc.returncode:
        raise RuntimeError('PostgreSQL rechazó la operación:\n'+proc.stderr[-2400:])
    return proc.stdout.strip()


def get_plan_subjects():
    # Inspección estrictamente READ ONLY. El plan debe ser exactamente el 716 de la EINA.
    query = r"""
    BEGIN TRANSACTION READ ONLY;
    SELECT json_build_object(
       'id',p.id,'plan_code',p.official_code,'plan_name',p.name,'total_ects',p.total_ects,
       'university',u.official_name,'center',c.official_name,'source_url',p.source_url,
       'subjects',COALESCE((SELECT json_agg(json_build_object(
         'id',s.id,'code',s.official_code,'name',s.name,'year',s.academic_year,
         'semester',s.semester,'ects',s.ects,'type',s.subject_type,'metadata',s.metadata
       ) ORDER BY s.official_code)
       FROM subjects s WHERE s.study_plan_id=p.id),'[]'::json)
    )
    FROM study_plans p
    JOIN degree_offerings o ON o.id=p.degree_offering_id
    JOIN universities u ON u.id=o.university_id
    JOIN academic_centers c ON c.id=o.academic_center_id
    JOIN degrees d ON d.id=o.degree_id
    WHERE p.status='official' AND p.official_code='716'
      AND p.source_url LIKE '%plan_id_nk=716%'
      AND p.source_url LIKE '%centro_id=110%'
      AND u.official_name ILIKE '%Zaragoza%'
      AND d.name ILIKE '%Inform%'
      AND c.official_name ILIKE '%Ingenier%Arquitect%';
    ROLLBACK;
    """
    # -At produces BEGIN/result/ROLLBACK; extract the sole JSON line.
    output = execute_psql(query)
    docs = []
    for line in output.splitlines():
        if line.startswith('{'):
            docs.append(json.loads(line))
    if len(docs)!=1:
        raise RuntimeError(f'Se esperaba un solo plan 716 oficial de EINA, hallados {len(docs)}. Abortado.')
    plan=docs[0]
    ref=json.loads(REF.read_text(encoding='utf-8'))
    if str(plan['total_ects']) not in ('240.00','240.0','240'):
        raise RuntimeError(f"Plan 716 con ECTS inesperados: {plan['total_ects']}")
    if len(plan['subjects'])<55:
        raise RuntimeError(f"Solo {len(plan['subjects'])} asignaturas; revisar integridad de la importación.")
    codes=[s['code'] for s in plan['subjects']]
    if len(codes)!=len(set(codes)) or any(not c for c in codes):
        raise RuntimeError('Códigos oficiales ausentes o duplicados; abortado.')
    for m in ref['mention_codes'].values():
        unknown=set(m['codes'])-set(codes)
        if unknown:
            raise RuntimeError(f"Faltan en BD códigos de mención {m['name']}: {sorted(unknown)}")
    years={str(y):sum(s['year']==y for s in plan['subjects']) for y in (1,2,3,4)}
    if years['1'] != 10 or years['2'] != 10:
        raise RuntimeError(f'Esperadas 10 asignaturas por año en 1.º y 2.º, halladas {years}.')
    return plan,ref


def availability(s):
    metadata=s.get('metadata') or {}
    if 'offer_status' in metadata:
        value=metadata['offer_status']
        if value in ('not_offered','not_implemented'):
            return 'not_offered'
    occurrences=metadata.get('occurrences') or []
    if occurrences and all(isinstance(r,dict) and r.get('offer_status') in ('not_offered','not_implemented') for r in occurrences):
        return 'not_offered'
    # Detección de situación publicada en las células de la fuente:
    if occurrences and all('no ofertad' in ' '.join(str(x) for x in r.get('source_cells',[])).lower() for r in occurrences if isinstance(r,dict)):
        return 'not_offered'
    return 'listed_or_unverified'


def summarize(plan,ref):
    codes={s['code']:s for s in plan['subjects']}
    years={y:sum(1 for s in codes.values() if s['year']==y) for y in (1,2,3,4)}
    optional=[s for s in codes.values() if s['type']=='optional']
    print('PLAN:',plan['plan_code'],plan['plan_name'])
    print('CENTRO:',plan['center'])
    print('ID BD:',plan['id'])
    print('ASIGNATURAS OFICIALES:',len(codes),'por curso:',years)
    print('OPTATIVAS ÚNICAS:',len(optional),'de ellas no ofertadas identificadas:',
          [s['code'] for s in optional if availability(s)=='not_offered'])
    print('REFERENCIAS REALES 2024/25:',len(ref['official_grade_counts_2024_2025_eina']))
    print('MENCIONES (códigos oficiales; una asignatura puede repetirse en varias):')
    for key,m in ref['mention_codes'].items():
        offered=[c for c in m['codes'] if availability(codes[c])!='not_offered']
        print(' ',key,m['name'],len(m['codes']),'listadas,',len(offered),'no marcadas como no ofertadas')
    print('SIN ESCRITURAS EN POSTGRESQL.')


def create_csv(path:Path, fields):
    f=path.open('w',newline='',encoding='utf-8')
    writer=csv.DictWriter(f,fieldnames=fields,lineterminator='\n')
    writer.writeheader()
    return f,writer


def random_weighted_category(rng, counts, ability):
    # El patrón de un curso base procede de agregados oficiales o de una distribución de referencia ficticia.
    # El parámetro de capacidad es individual y crea correlación entre notas de un MISMO estudiante.
    modifiers=[math.exp(-0.15*ability),math.exp(-0.44*ability),
               math.exp(-0.10*ability),math.exp(0.15*ability),math.exp(0.35*ability),math.exp(0.25*ability)]
    weights=[max(0.005,float(c))*m for c,m in zip(counts,modifiers)]
    return rng.choices(CATEGORIES,weights=weights,k=1)[0]


def grade_for_category(rng,category):
    bounds={'failed':(0.2,4.95),'pass':(5.0,6.95),'merit':(7.0,8.95),
            'distinction':(9.0,9.95),'honours':(9.5,10.0)}
    if category=='not_presented':return ''
    low,high=bounds[category]
    return round(rng.uniform(low,high),2)


def mean_difficulty(s, ref):
    source=ref['official_grade_counts_2024_2025_eina'].get(s['code'])
    if source:
        active=max(1,sum(source[1:]))
        # La tasa de suspensos es un indicador parcial; NO una dificultad objetiva.
        failure=source[1]/active
        out=2.5 + 3.0*failure
    else:
        out=2.9
    name=s['name'].lower()
    if any(word in name for word in ['algoritm','procesador','sistemas distribuidos','aprendizaje automático']):
        out+=0.35 # Hipótesis de la simulación, no medición oficial
    if any(word in name for word in ['prácticas externas','proyecto software','laboratorio']):
        out+=0.15
    return max(1.25,min(4.5,out))


def theme(s):
    n=s['name'].lower()
    groups={
      'computacion':['algoritm','inteligencia','aprendizaje','gráfica','visión','robótica','videojuego','procesadores de lenguajes','bioinform'],
      'software':['software','ingeniería web','metodolog','requisitos','programación','legados','verificación','validación'],
      'datos':['datos','información','minería','comercio electrónico','almacenes'],
      'infraestructura':['sistemas','redes','computador','centros de datos','virtualización','multiprocesadores','hardware','tiempo real'],
    }
    found=[key for key,tokens in groups.items() if any(k in n for k in tokens)]
    return found[0] if found else 'general'


def result_row(rng, student, s, ref, course, ability, motivation, interest):
    source=ref['official_grade_counts_2024_2025_eina'].get(s['code'])
    if source:
        weights=source
    else:
        # Distribución BASE explícitamente simulada; no procede de datos oficiales.
        weights=[7,8,35,37,11,2] if s['type']!='final_project' else [15,1,15,49,17,3]
    difficulty=mean_difficulty(s,ref)
    # Una capacidad latente compartida por estudiante crea correlación longitudinal.
    category=random_weighted_category(rng,weights,ability*0.78+motivation*0.24)
    g=grade_for_category(rng,category)
    state='not_presented' if category=='not_presented' else ('failed' if category=='failed' else 'passed')
    ects=float(s['ects'])
    # ECTS y dificultad explican parte del tiempo, pero hay variabilidad individual.
    hours=max(1.5,min(32.0, (ects/6)*(4.1+2.4*difficulty) + rng.gauss(0,1.7)-motivation*0.4))
    survey=s['type']=='optional' and rng.random()<0.78
    interest_fit=1 if theme(s)==interest else 0
    satisfaction=max(1,min(5,round(2.7+0.75*interest_fit-0.18*(hours-11)/3+rng.gauss(0,0.8)))) if survey else ''
    perceived=max(1,min(5,round(difficulty +rng.gauss(0,0.65)))) if survey else ''
    rep=rng.random()< min(.9,max(.1,.18 + .17*int(satisfaction or 2) +.09*interest_fit)) if survey else ''
    reason= rng.choices(('interes','orientacion_profesional','horario','continuidad_formativa'),(46,28,12,14),k=1)[0] if survey else ''
    return {
      'student_code':student, 'subject_id':s['id'],'academic_course':f'{course}-{course+1}',
      'course_taken':s['year'],'state':state,'grade':g,'weekly_hours':round(hours,2),
      'perceived_difficulty':perceived,'satisfaction':satisfaction,
      'choose_again': ('true' if rep else 'false') if survey else '',
      'election_reason':reason,'provenance':'synthetic_demo'
    }


def simulate(plan,ref, n:int):
    if not 100<=n<=20000:
        raise RuntimeError('Estudiantes sintéticos fuera del rango 100..20000')
    rng=random.Random(SEED)
    bycode={s['code']:s for s in plan['subjects']}
    y1y2=sorted([s for s in bycode.values() if s['year'] in (1,2)],key=lambda s:(s['year'],s['code']))
    required3_4=sorted([s for s in bycode.values() if s['year'] in (3,4) and s['type']=='mandatory'],key=lambda s:(s['year'],s['code']))
    optional=[s for s in bycode.values() if s['year'] in (3,4) and s['type']=='optional' and availability(s)!='not_offered']
    mentions=list(ref['mention_codes'].items())
    OUT.mkdir(parents=True,exist_ok=True)
    if any(OUT.iterdir()):
        raise RuntimeError(f'Carpeta {OUT} no vacía. Para evitar sobrescribir una preparación anterior, retírala manualmente.')
    students_file,sw=create_csv(OUT/'students.csv',STUDENT_FIELDS)
    results_file,rw=create_csv(OUT/'results.csv',FIELDS)
    mentions_file,mw=create_csv(OUT/'mentions.csv',('code','name','plan_id','source_url','source_course','provenance'))
    memberships_file,mmw=create_csv(OUT/'mention_subjects.csv',('mention_code','subject_id'))
    official_file,ow=create_csv(OUT/'official_grade_aggregates.csv',('subject_id','academic_course','source_url','not_presented','failed','pass','merit','distinction','honours','provenance'))
    for code,m in mentions:
        mw.writerow({'code':code,'name':m['name'],'plan_id':plan['id'],'source_url':m['source'],
                     'source_course':'2026-2027','provenance':'official_unizar'})
        for subject_code in m['codes']:
            mmw.writerow({'mention_code':code,'subject_id':bycode[subject_code]['id']})
    for code,counts in ref['official_grade_counts_2024_2025_eina'].items():
        if code not in bycode:
            raise RuntimeError(f'El código real del informe {code} no está en el plan 716 de la BD')
        if len(counts)!=6 or min(counts)<0:
            raise RuntimeError(f'Conteos del informe inválidos: {code}')
        ow.writerow({'subject_id':bycode[code]['id'],'academic_course':'2024-2025',
                     'source_url':ref['official_academic_results_source'],
                     **dict(zip(CATEGORIES,counts)),'provenance':'official_aggregated'})
    total=0
    by_year={}
    for index in range(1,n+1):
        code=f'SIM716-{index:06d}'
        # 12 cohortes históricas simuladas: 2011...2022. Fechas hipotéticas, jamás cohortes reales.
        entry=2011+(index-1)%12
        mention,mention_meta=mentions[(index-1)%len(mentions)]
        interest=rng.choice(('computacion','software','datos','infraestructura','general'))
        ability=max(-2.0,min(2.0,rng.gauss(0,0.75)))
        motivation=max(-2.0,min(2.0,rng.gauss(0,0.7)))
        sw.writerow({'student_code':code,'plan_id':plan['id'],'is_featured_demo':'false',
                     'entry_academic_year':entry,'current_course':4,
                     'mention_code':mention,'latent_interest':interest,'provenance':'synthetic_demo'})
        mention_pool=[bycode[sc] for sc in mention_meta['codes'] if bycode[sc]['type']=='optional' and availability(bycode[sc])!='not_offered']
        rng.shuffle(mention_pool)
        # SOLO se seleccionan optativas realmente listadas en el plan; las 48 ECTS de mención
        # NO se declaran cumplidas automáticamente cuando una mención no tiene suficiente oferta.
        picked_mention=mention_pool[:min(8,len(mention_pool))]
        outside=[s for s in optional if s['code'] not in {p['code'] for p in mention_pool}]
        rng.shuffle(outside)
        outside=outside[:3]
        selection = {s['code']:s for s in y1y2+required3_4+picked_mention+outside}
        for s in selection.values():
            course=entry+s['year']-1
            # Como es una cohorte ficticia, la secuencia temporal es coherente año a año.
            row=result_row(rng,code,s,ref,course,ability,motivation,interest)
            rw.writerow(row)
            total+=1
            by_year[s['year']]=by_year.get(s['year'],0)+1
    demo='DEMO716-ESTUDIANTE'
    sw.writerow({'student_code':demo,'plan_id':plan['id'],'is_featured_demo':'true',
                 'entry_academic_year':2024,'current_course':3,'mention_code':'',
                 'latent_interest':'general','provenance':'synthetic_demo'})
    for s in y1y2:
        row=result_row(rng,demo,s,ref,2024+s['year']-1,1.0,0.7,'general')
        if row['state']!='passed':
            row['grade']=round(rng.uniform(5.2,9.5),2)
            row['state']='passed'
        rw.writerow(row)
        total+=1
    for file in (students_file,results_file,mentions_file,memberships_file,official_file):file.close()
    if total<50000:
        raise RuntimeError(f'Generación insuficiente: {total} observaciones; no se considera válida')
    # Verificación CSV en disco tras generación, antes de permitir la carga.
    for name in ('students.csv','results.csv','mentions.csv','mention_subjects.csv','official_grade_aggregates.csv'):
        if (OUT/name).stat().st_size<200:
            raise RuntimeError('CSV demasiado pequeño o vacío: '+name)
    manifest={'dataset':'AAAhoraQue plan716 DSS demo','plan_id':plan['id'],'plan_code':'716',
      'generator_seed':SEED,'synthetic_students':n+1,'synthetic_result_rows':total,
      'result_counts_by_course':by_year,'official_aggregate_subjects':len(ref['official_grade_counts_2024_2025_eina']),
      'source_reference':ref['official_academic_results_source'],
      'catalog_source':ref['catalog_source'],'generated_at':datetime.now(timezone.utc).isoformat(),
      'warnings':['TODOS los registros de results son simulados y NO representan alumnos reales',
         'Los agregados oficiales únicamente corresponden a EINA 2024-2025',
         'Las cohortes de 2011-2022 son simulaciones hipotéticas retroproyectadas al plan actual',
         'La dificultad percibida, la satisfacción y las horas son simuladas: NO proceden de encuestas reales',
         'La lista de 2026-27 puede incluir asignaturas no ofertadas, excluidas de la simulación',
         'No se infiere que un itinerario con oferta parcial complete los 48 ECTS oficiales']}
    manifest['files_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.csv')}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    write_loader(OUT)
    print('PREPARADOS:',total,'resultados INDIVIDUALES SINTÉTICOS,',n+1,'estudiantes sintéticos.')
    print('ESTUDIANTE DEMO:',demo,'20 asignaturas de 1.º+2.º aprobadas (notas sintéticas).')
    print('AGREGADOS REALES:',len(ref['official_grade_counts_2024_2025_eina']),'asignaturas, EINA 2024-2025.')
    print('FICHEROS:',OUT)
    print('NO SE HA ESCRITO EN POSTGRESQL. Para cargar: python3 preparar_demo716.py apply --confirm')


def write_loader(out):
    def escaped_filename(name):
        return str((out/name).resolve()).replace("'","''")
    commands=[]
    for name,table in (
        ('mentions.csv','mentions'),('mention_subjects.csv','mention_subjects'),
        ('official_grade_aggregates.csv','official_grade_aggregates'),
        ('students.csv','students'),('results.csv','results')):
        commands.append(f"\\copy dss_demo_716.{table} FROM '{escaped_filename(name)}' CSV HEADER")
    # En modo --single-transaction, CREATE schema/tablas, COPY y validación son ATÓMICOS.
    scripts=['SET LOCAL statement_timeout = 0;',
       "SET LOCAL lock_timeout = '5s';",
       f"\\i {escaped_filename('00_dss_plan716_schema.sql')}"]
    scripts += commands
    scripts += ["""
       DO $$ BEGIN
         IF (SELECT count(*) FROM dss_demo_716.results) < 50000 THEN
           RAISE EXCEPTION 'Menos de 50.000 resultados; rollback completo';
         END IF;
         IF (SELECT count(*) FROM dss_demo_716.students WHERE is_featured_demo) <> 1 THEN
           RAISE EXCEPTION 'Estudiante de demo ausente o duplicado';
         END IF;
         IF (SELECT count(*) FROM dss_demo_716.results r
             JOIN dss_demo_716.students d ON d.student_code = r.student_code
             JOIN subjects s ON s.id = r.subject_id
             WHERE d.is_featured_demo AND (s.academic_year IN (1,2)) AND r.state='passed') <> 20 THEN
            RAISE EXCEPTION 'El demo no tiene 1.º y 2.º aprobados';
         END IF;
         IF EXISTS (SELECT 1 FROM dss_demo_716.results r
             JOIN subjects s ON s.id = r.subject_id WHERE s.study_plan_id <> (SELECT plan_id FROM dss_demo_716.students WHERE is_featured_demo)) THEN
             RAISE EXCEPTION 'Resultados asociados a otro plan';
         END IF;
       END $$;
       SELECT 'DATOS DEMO 716 CARGADOS Y VALIDADOS' AS estado,
          (SELECT count(*) FROM dss_demo_716.students) AS estudiantes,
          (SELECT count(*) FROM dss_demo_716.results) AS resultados,
          (SELECT count(*) FROM dss_demo_716.official_grade_aggregates) AS agregados_oficiales;
    """]
    # \i no acepta parámetros quoted con apóstrofe escapado; copia local de esquema a stage.
    shutil.copy2(SCHEMA,out/'00_dss_plan716_schema.sql')
    (out/'load.psql').write_text('\n'.join(scripts),encoding='utf8')


def apply():
    manifest_path=OUT/'manifest.json'
    if not manifest_path.exists():
        raise RuntimeError('Falta stage/manifest.json: ejecuta antes prepare.')
    manifest=json.loads(manifest_path.read_text(encoding='utf8'))
    plan,_=get_plan_subjects()
    if manifest['plan_id'] != plan['id']:
        raise RuntimeError('La base de datos ha cambiado de plan; abortado.')
    for name,expected in manifest['files_sha256'].items():
        if hashlib.sha256((OUT/name).read_bytes()).hexdigest()!=expected:
            raise RuntimeError('CSV alterado desde prepare: '+name)
    # Nunca sobrescribir un schema poblado, ni generar duplicados accidentales.
    exists=execute_psql("SELECT coalesce(to_regclass('dss_demo_716.students')::text,'');")
    if exists:
        raise RuntimeError('dss_demo_716.students ya existe. No se sobrescriben datos. Revisar antes de repetir.')
    if not (OUT/'load.psql').exists():
        raise RuntimeError('No se ha generado script de carga')
    print('CARGA SOLO EN ESQUEMA dss_demo_716; los public.* permanecen sin tocar.',flush=True)
    print(execute_psql(str(OUT/'load.psql'),use_file=True,transaction=True))
    print('CARGA CONFIRMADA: datos oficiales agregados y registros sintéticos SEPARADOS.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=('inspect','prepare','apply'))
    parser.add_argument('--students',type=int,default=2500)
    parser.add_argument('--confirm',action='store_true')
    args=parser.parse_args()
    if args.command=='apply' and not args.confirm:
        parser.error('Para cargar en PostgreSQL debes usar: apply --confirm')
    plan,ref=get_plan_subjects()
    if args.command=='inspect': summarize(plan,ref)
    elif args.command=='prepare': summarize(plan,ref); simulate(plan,ref,args.students)
    else: apply()

if __name__=='__main__':
    try: main()
    except (RuntimeError,OSError,ValueError,subprocess.TimeoutExpired) as exc:
        print('ERROR:',exc,file=sys.stderr)
        sys.exit(1)
