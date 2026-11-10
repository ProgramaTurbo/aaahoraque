#!/usr/bin/env python3
"""AAAhoraQue plan 716 / V2: cohorte y mención no uniformes, expedientes completos.

NO altera el esquema V1 ni public. Para usarlo colocar este archivo junto al
preparar_demo716.py original, ya corregido, en tools/dss-plan716/.

    python3 tools/dss-plan716/preparar_demo716_v2.py inspect
    python3 tools/dss-plan716/preparar_demo716_v2.py prepare
    python3 tools/dss-plan716/preparar_demo716_v2.py validate
    python3 tools/dss-plan716/preparar_demo716_v2.py apply --confirm

`prepare` y `validate` NO escriben en PostgreSQL.
`apply --confirm` crea SOLO dss_demo_716_v2 y falla si ya existe.
Toda la población individual es SINTÉTICA. Los conteos oficiales se almacenan
separados, solo agregados y limitados a la referencia indicada.
"""
from __future__ import annotations

import argparse
import collections
import csv
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
from urllib.parse import urlsplit, unquote, parse_qsl

import preparar_demo716 as base

HERE = Path(__file__).resolve().parent
REF = HERE / 'referencias_plan716_v2.json'
SCHEMA = HERE / '00_dss_plan716_v2_schema.sql'
SERIES = HERE / 'plan716_menciones_serie_simulada.csv'
OUT = Path(os.environ.get('DSS716_V2_STAGE_DIR', str(Path.home() / 'Aaahoraque' / 'imports' / 'dss-plan716' / 'stage-v2'))).expanduser()
SCHEMA_NAME = 'dss_demo_716_v2'
SEED = 71620261109
EXPECTED_STUDENTS = 20_000
STUDENT_FIELDS = (
    'student_code', 'plan_id', 'is_featured_demo', 'entry_academic_year',
    'last_observed_course', 'mention_code', 'mention_choice_academic_course',
    'latent_interest', 'profile_kind', 'provenance'
)
RESULT_FIELDS = base.FIELDS


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        while True:
            chunk = handle.read(4 * 1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def psql(query_or_file: str, *, file: bool = False, write: bool = False) -> str:
    """libpq por entorno; no mostrar credenciales ni poner DB_URL en argv."""
    url = os.environ.get('DB_URL') or os.environ.get('DATABASE_URL')
    if not url or not url.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('Falta DB_URL/DATABASE_URL. Carga .env.mv.local sin imprimirla.')
    parsed = urlsplit(url)
    if not parsed.hostname or not parsed.path.lstrip('/'):
        raise RuntimeError('DB_URL no incluye host o nombre de BD válidos')
    if not shutil.which('psql'):
        raise RuntimeError('psql no disponible')
    env = dict(os.environ)
    env.update({
        'PGHOST': parsed.hostname,
        'PGPORT': str(parsed.port or 5432),
        'PGDATABASE': unquote(parsed.path.lstrip('/')),
        'PGCONNECT_TIMEOUT': '10',
        'PGOPTIONS': '-c default_transaction_read_only=off' if write
                     else '-c default_transaction_read_only=on',
    })
    if parsed.username is not None:
        env['PGUSER'] = unquote(parsed.username)
    if parsed.password is not None:
        env['PGPASSWORD'] = unquote(parsed.password)
    extras = dict(parse_qsl(parsed.query))
    if 'sslmode' in extras:
        env['PGSSLMODE'] = extras['sslmode']
    cmd = ['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-P', 'pager=off']
    if write:
        cmd.append('--single-transaction')
    if file:
        cmd += ['-f', query_or_file]
    else:
        cmd += ['-At', '-c', query_or_file]
    proc = subprocess.run(cmd, env=env, text=True, capture_output=True, timeout=300)
    if proc.returncode:
        raise RuntimeError('PostgreSQL rechazó la operación:\n' + proc.stderr[-2400:])
    return proc.stdout.strip()


def plan_and_reference():
    if not REF.is_file() or not SCHEMA.is_file() or not SERIES.is_file():
        raise RuntimeError('Faltan archivos V2 junto al script; revisa la extracción del ZIP.')
    base.REF = REF
    base.execute_psql = lambda query, **kwargs: psql(query, file=kwargs.get('use_file', False), write=kwargs.get('transaction', False))
    plan, ref = base.get_plan_subjects()
    if str(plan['id']) != 'fed26b74-ed7e-58e6-bf1a-9da2d1413862':
        raise RuntimeError('Plan ID inesperado; NO se admite otro catálogo o entorno')
    allcodes = {s['code']: s for s in plan['subjects']}
    if len(allcodes) != 72 or len([s for s in allcodes.values() if s['type'] == 'optional']) != 40:
        raise RuntimeError('El catálogo oficial cambió respecto a la auditoría (72 / 40). Revisar antes de simular.')
    if '30286' in allcodes:
        raise RuntimeError('Ha aparecido 30286 en el catálogo: verificar nueva oferta y reglas antes de regenerar')
    if base.availability(allcodes['30260']) != 'not_offered':
        raise RuntimeError('No se puede confirmar que 30260 está no ofertada')
    for code, m in ref['mention_codes'].items():
        available = [allcodes[c] for c in m['codes'] if base.availability(allcodes[c]) != 'not_offered']
        if len(available) < 8:
            raise RuntimeError(f'{code} solo tiene {len(available)} materias utilizables; se requieren 8 sin inventarlas')
        if any(s['type'] != 'optional' or float(s['ects']) != 6 or s['year'] not in (3, 4)
               for s in available):
            raise RuntimeError(f'{code}: asignaturas de mención con datos incompatibles')
    return plan, ref


def fingerprint(plan: dict) -> str:
    data = [[s['id'], s['code'], s['ects'], s['year'], s['type'], base.availability(s)]
            for s in sorted(plan['subjects'], key=lambda s: s['code'])]
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def quotas():
    result = collections.Counter()
    with SERIES.open(encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (int(row['anio_entrada_simulado']), row['codigo_mencion'])
            if key in result:
                raise RuntimeError('Fila duplicada en el CSV de cuotas: ' + repr(key))
            result[key] = int(row['estudiantes_sinteticos'])
    if len(result) != 60 or sum(result.values()) != EXPECTED_STUDENTS:
        raise RuntimeError('El CSV de distribución no corresponde a 12 años x 5 menciones / 20.000 personas')
    return result


def inspect():
    plan, ref = plan_and_reference()
    q = quotas()
    print('PLAN OFICIAL:', plan['plan_code'], plan['plan_name'])
    print('IDENTIFICADOR:', plan['id'], '·', len(plan['subjects']), 'asignaturas')
    print('MENCIONES V2 Y RECUENTOS SINTÉTICOS PROPUESTOS:')
    for code, m in ref['mention_codes'].items():
        print(f' {code} · {m["name"]}: {len(m["codes"])} códigos relacionados · '
              f'{sum(n for (year, c), n in q.items() if c == code)} estudiantes ficticios')
    print('COHORTES: entrada simulada 2011–2022, selección de mención +2 años (supuesto)')
    print('DESTINO AISLADO:', SCHEMA_NAME)
    print('No se han realizado escrituras.')


def create_csv(path, fields):
    fp = path.open('w', encoding='utf-8', newline='')
    writer = csv.DictWriter(fp, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    return fp, writer


def prepare():
    plan, ref = plan_and_reference()
    q = quotas()
    if OUT.exists() and any(OUT.iterdir()):
        raise RuntimeError(f'La carpeta de preparación V2 NO está vacía: {OUT}. No se sobrescribirá.')
    OUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)
    bycode = {s['code']: s for s in plan['subjects']}
    y1y2 = sorted((s for s in plan['subjects'] if s['year'] in (1, 2)), key=lambda s: (s['year'], s['code']))
    required = sorted((s for s in plan['subjects'] if s['year'] in (3, 4) and s['type'] == 'mandatory'),
                      key=lambda s: (s['year'], s['code']))
    optional = [s for s in plan['subjects'] if s['type'] == 'optional' and s['year'] in (3, 4)
                and base.availability(s) != 'not_offered']
    if len(y1y2) != 20 or len(required) == 0:
        raise RuntimeError('Incompatibilidad de materias troncales 1–4; abortado')
    # Construir slots año x mención con cupos exactos; barajar para evitar asignación por código.
    slots = [(entry, mention) for (entry, mention), n in sorted(q.items()) for _ in range(n)]
    rng.shuffle(slots)

    sf, sw = create_csv(OUT / 'students.csv', STUDENT_FIELDS)
    rf, rw = create_csv(OUT / 'results.csv', RESULT_FIELDS)
    mf, mw = create_csv(OUT / 'mentions.csv', ('code','name','plan_id','source_url','source_course','provenance'))
    msf, msw = create_csv(OUT / 'mention_subjects.csv', ('mention_code','subject_id'))
    of, ow = create_csv(OUT / 'official_grade_aggregates.csv',
                        ('subject_id','academic_course','source_url','not_presented','failed','pass','merit','distinction','honours','provenance'))
    total = 0
    try:
        for code, m in ref['mention_codes'].items():
            mw.writerow({'code': code, 'name': m['name'], 'plan_id': plan['id'],
                         'source_url': m['source'], 'source_course': '2026-2027',
                         'provenance': 'official_unizar'})
            for subject_code in m['codes']:
                msw.writerow({'mention_code': code, 'subject_id': bycode[subject_code]['id']})
        for code, counts in ref['official_grade_counts_2024_2025_eina'].items():
            if code not in bycode or len(counts) != 6 or any(v < 0 for v in counts):
                raise RuntimeError(f'Agregado histórico inesperado: {code}')
            ow.writerow({'subject_id': bycode[code]['id'], 'academic_course': '2024-2025',
                         'source_url': ref['official_academic_results_source'],
                         **dict(zip(base.CATEGORIES, counts)), 'provenance': 'official_aggregated'})
        for index, (entry, mention) in enumerate(slots, start=1):
            student = f'SIM716-{index:06d}'
            m = ref['mention_codes'][mention]
            affinity = {'ESM6021': 'computacion', 'ESM6020': 'software',
                        'ESM6023': 'datos', 'ESM6022': 'infraestructura',
                        'ESM6024': 'infraestructura'}[mention]
            interests = ('computacion', 'software', 'datos', 'infraestructura', 'general')
            interest = affinity if rng.random() < 0.65 else rng.choice(interests)
            ability = max(-2, min(2, rng.gauss(0, 0.75)))
            motivation = max(-2, min(2, rng.gauss(0, 0.7)))
            sw.writerow({
                'student_code': student, 'plan_id': plan['id'], 'is_featured_demo': 'false',
                'entry_academic_year': entry, 'last_observed_course': 4,
                'mention_code': mention, 'mention_choice_academic_course': f'{entry+2}-{entry+3}',
                'latent_interest': interest, 'profile_kind': 'historical_simulation',
                'provenance': 'synthetic_demo'
            })
            mention_pool = [bycode[c] for c in m['codes'] if base.availability(bycode[c]) != 'not_offered']
            rng.shuffle(mention_pool)
            picked = mention_pool[:8]
            picked_codes = {s['code'] for s in mention_pool}
            outside = [s for s in optional if s['code'] not in picked_codes]
            if len(outside) < 3:
                raise RuntimeError(f'Sin suficientes optativas externas para {mention}')
            rng.shuffle(outside)
            outside = outside[:3]
            if sum(float(s['ects']) for s in picked) != 48 or sum(float(s['ects']) for s in outside) != 18:
                raise RuntimeError('La selección no cumple 48 ECTS mención + 18 ECTS adicionales')
            selection = {s['code']: s for s in y1y2 + required + picked + outside}
            if len(selection) != len(y1y2) + len(required) + 11:
                raise RuntimeError('Hay una asignatura repetida en el expediente')
            for s in selection.values():
                row = base.result_row(rng, student, s, ref, entry+s['year']-1, ability, motivation, interest)
                rw.writerow(row)
                total += 1
        # El estudiante demo no tiene mención elegida y conserva 20/20 aprobadas.
        demo = 'DEMO716-ESTUDIANTE'
        sw.writerow({'student_code': demo, 'plan_id': plan['id'], 'is_featured_demo': 'true',
                     'entry_academic_year': 2024, 'last_observed_course': 2,
                     'mention_code': '', 'mention_choice_academic_course': '',
                     'latent_interest': 'general', 'profile_kind': 'featured_demo',
                     'provenance': 'synthetic_demo'})
        for s in y1y2:
            row = base.result_row(rng, demo, s, ref, 2024+s['year']-1, 1.0, 0.7, 'general')
            if row['state'] != 'passed':
                row['state'] = 'passed'
                row['grade'] = round(rng.uniform(5.2, 9.5), 2)
            rw.writerow(row)
            total += 1
    finally:
        for f in (sf, rf, mf, msf, of):
            f.close()

    if total < 700_000:
        raise RuntimeError(f'Demasiado pocos resultados para 20.000 estudiantes: {total}')
    shutil.copy2(SCHEMA, OUT / SCHEMA.name)
    manifest = {
        'dataset': 'AAAhoraQue plan716 V2 — simulated cohorts and mention selection',
        'generator_seed': SEED, 'plan_id': plan['id'], 'plan_fingerprint': fingerprint(plan),
        'students_expected': EXPECTED_STUDENTS + 1,
        'results_expected': total, 'official_aggregate_subjects': len(ref['official_grade_counts_2024_2025_eina']),
        'mentions_expected': len(ref['mention_codes']),
        'relations_expected': sum(len(m['codes']) for m in ref['mention_codes'].values()),
        'schema': SCHEMA_NAME, 'generated_at': datetime.now(timezone.utc).isoformat(),
        'input_distribution_sha256': sha256_file(SERIES),
        'input_reference_sha256': sha256_file(REF),
        'notes': [
            'TODOS los resultados individuales son sintéticos; los agregados oficiales están separados.',
            'Los 20.000 estudiantes no son 20.000 alumnos reales de UNIZAR.',
            'Se retroproyecta el plan 716 actual sobre cohortes hipotéticas 2011–2022.',
            'Los 5 repartos por mención se calibran con solo un curso de referencia 2024–2025.',
            'Las evoluciones anuales de mención son inventadas; no son datos históricos.',
            'La relación asignatura-mención se usa en el demo y requiere validación administrativa.',
            'Los 66 ECTS son optativas con resultado, no créditos necesariamente aprobados.',
            '30260 no ofertada y 30286 ausente no generan resultados.',
            'No se han alterado ni public ni dss_demo_716 (V1).'
        ],
    }
    manifest['files_sha256'] = {name: sha256_file(OUT/name) for name in
        ('students.csv','results.csv','mentions.csv','mention_subjects.csv','official_grade_aggregates.csv',SCHEMA.name)}
    (OUT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    write_loader(manifest)
    print('PREPARADO V2:', EXPECTED_STUDENTS+1, 'estudiantes,', total, 'resultados individuales ficticios')
    print('ARCHIVOS:', OUT)
    print('No se han realizado escrituras en PostgreSQL.')


def write_loader(manifest):
    def lit(name):
        return "'" + str((OUT/name).resolve()).replace("'", "''") + "'"
    body = ["SET LOCAL lock_timeout = '5s';", 'SET LOCAL statement_timeout = 0;',
            f'\\i {lit(SCHEMA.name)}']
    for file_name, table in (('mentions.csv','mentions'),('mention_subjects.csv','mention_subjects'),
                             ('official_grade_aggregates.csv','official_grade_aggregates'),
                             ('students.csv','students'),('results.csv','results')):
        body.append(f'\\copy {SCHEMA_NAME}.{table} FROM {lit(file_name)} CSV HEADER')
    # SQL asserts evitan una carga parcial válida a nivel sintáctico pero incompleta.
    body.append(f'''DO $$ BEGIN
      IF (SELECT count(*) FROM {SCHEMA_NAME}.students) <> {manifest['students_expected']}
         OR (SELECT count(*) FROM {SCHEMA_NAME}.results) <> {manifest['results_expected']}
         OR (SELECT count(*) FROM {SCHEMA_NAME}.mentions) <> {manifest['mentions_expected']}
         OR (SELECT count(*) FROM {SCHEMA_NAME}.mention_subjects) <> {manifest['relations_expected']}
         OR (SELECT count(*) FROM {SCHEMA_NAME}.official_grade_aggregates) <> {manifest['official_aggregate_subjects']} THEN
          RAISE EXCEPTION 'CARGA V2: recuentos inesperados; rollback';
      END IF;
      IF EXISTS (
        SELECT 1 FROM {SCHEMA_NAME}.results r JOIN public.subjects s ON s.id=r.subject_id
        WHERE s.official_code='30260' OR s.study_plan_id <> '{manifest['plan_id']}'::uuid
      ) THEN RAISE EXCEPTION 'CARGA V2: asignatura no ofertada o fuera del plan; rollback'; END IF;
      IF (SELECT count(*) FROM {SCHEMA_NAME}.students WHERE is_featured_demo) <> 1
         OR (SELECT count(*) FROM {SCHEMA_NAME}.results WHERE student_code='DEMO716-ESTUDIANTE' AND state='passed') <> 20
      THEN RAISE EXCEPTION 'CARGA V2: el estudiante demo no es válido; rollback'; END IF;
    END $$;
    SELECT 'V2_CARGADA_Y_VALIDADA' AS resultado,
      (SELECT count(*) FROM {SCHEMA_NAME}.students) AS estudiantes,
      (SELECT count(*) FROM {SCHEMA_NAME}.results) AS resultados;
    ''')
    (OUT/'load-v2.psql').write_text('\n'.join(body), encoding='utf8')


def validate():
    plan, ref = plan_and_reference()
    q = quotas()
    manifest_path = OUT/'manifest.json'
    if not manifest_path.is_file():
        raise RuntimeError('No existe manifest.json en stage-v2. Ejecuta prepare antes.')
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    if manifest['schema'] != SCHEMA_NAME or manifest['plan_id'] != plan['id'] or manifest['plan_fingerprint'] != fingerprint(plan):
        raise RuntimeError('El catálogo o la identidad del plan cambiaron desde prepare')
    if sha256_file(SERIES) != manifest['input_distribution_sha256'] or sha256_file(REF) != manifest['input_reference_sha256']:
        raise RuntimeError('La distribución o las referencias cambiaron desde prepare')
    for name, expected in manifest['files_sha256'].items():
        if not (OUT/name).is_file() or sha256_file(OUT/name) != expected:
            raise RuntimeError('Archivo alterado o incompleto: '+name)
    byid = {s['id']:s for s in plan['subjects']}
    mention_codes = {m: set(meta['codes']) for m, meta in ref['mention_codes'].items()}
    students = {}
    actual_quota = collections.Counter()
    demo_count = 0
    with (OUT/'students.csv').open(encoding='utf8', newline='') as file:
        for row in csv.DictReader(file):
            code = row['student_code']
            if code in students or row['provenance'] != 'synthetic_demo' or row['plan_id'] != plan['id']:
                raise RuntimeError('Estudiante duplicado o con procedencia/plan erróneo: '+code)
            students[code] = row
            if row['is_featured_demo'] == 'true':
                demo_count += 1
                if code != 'DEMO716-ESTUDIANTE' or row['mention_code'] or row['profile_kind'] != 'featured_demo':
                    raise RuntimeError('Metadatos del demo incorrectos')
            else:
                year=int(row['entry_academic_year'])
                mention=row['mention_code']
                if mention not in mention_codes or row['profile_kind'] != 'historical_simulation' or row['mention_choice_academic_course'] != f'{year+2}-{year+3}':
                    raise RuntimeError('Año o mención incoherentes: '+code)
                actual_quota[(year, mention)] += 1
    if len(students) != manifest['students_expected'] or demo_count != 1 or actual_quota != q:
        raise RuntimeError('Recuentos de estudiantes o distribución año/mención diferentes de la previsión')

    total = 0
    seen = set()
    per_stu = collections.Counter()
    opt_m = collections.Counter()
    opt_out = collections.Counter()
    opt_m_ects = collections.Counter()
    opt_out_ects = collections.Counter()
    demo_pass = collections.Counter()
    with (OUT/'results.csv').open(encoding='utf8', newline='') as file:
        for row in csv.DictReader(file):
            total += 1
            code, sid = row['student_code'], row['subject_id']
            if code not in students or sid not in byid or (code, sid) in seen:
                raise RuntimeError(f'Fila {total}: estudiante, asignatura o duplicado incorrecto')
            seen.add((code, sid))
            s, st = byid[sid], students[code]
            if row['provenance'] != 'synthetic_demo' or s['code'] in ('30260','30286') or base.availability(s) == 'not_offered':
                raise RuntimeError(f'Fila {total}: procedencia o disponibilidad incorrecta')
            year = s['year']
            if str(year) != row['course_taken'] or row['academic_course'] != f'{int(st["entry_academic_year"])+year-1}-{int(st["entry_academic_year"])+year}':
                raise RuntimeError(f'Fila {total}: curso de asignatura incoherente')
            grade = row['grade']
            state = row['state']
            valid_grade = (state == 'not_presented' and grade == '') or (state == 'passed' and grade and 5 <= float(grade) <= 10) or (state == 'failed' and grade and 0 <= float(grade) < 5)
            if not valid_grade:
                raise RuntimeError(f'Fila {total}: nota y estado incoherentes')
            per_stu[code] += 1
            if st['is_featured_demo'] == 'true':
                if state != 'passed' or year not in (1, 2):
                    raise RuntimeError('Expediente demo incorrecto')
                demo_pass[year] += 1
            elif s['type'] == 'optional':
                if s['code'] in mention_codes[st['mention_code']]:
                    opt_m[code] += 1
                    opt_m_ects[code] += float(s['ects'])
                else:
                    opt_out[code] += 1
                    opt_out_ects[code] += float(s['ects'])
    if total != manifest['results_expected'] or demo_pass != {1:10,2:10}:
        raise RuntimeError('Resultados totales o 20 aprobados demo incorrectos')
    for code, st in students.items():
        if st['is_featured_demo'] == 'true':
            if per_stu[code] != 20:
                raise RuntimeError('Demo con número incorrecto de asignaturas')
        elif (opt_m[code],opt_out[code],opt_m_ects[code],opt_out_ects[code]) != (8,3,48,18):
            raise RuntimeError(f'Selección incoherente: {code}: {opt_m[code]}+{opt_out[code]} asignaturas')
    print('VALIDACIÓN V2 SUPERADA (solo lectura):')
    print(' ·', len(students), 'estudiantes sintéticos y', total, 'resultados individuales')
    print(' ·', len(actual_quota), 'combinaciones año-mención; todas coinciden con el CSV planificado')
    print(' · Cada estudiante histórico: 48 ECTS en 8 asignaturas de mención + 18 ECTS adicionales')
    print(' · Demo: primero y segundo aprobados (10+10), sin mención seleccionada')
    print(' · Notas, cursos, procedencia, asignaturas y ficheros: correctos')
    print(' · Esquema', SCHEMA_NAME, 'todavía no escrito')
    return manifest


def apply(confirm: bool):
    if not confirm:
        raise RuntimeError('La escritura requiere --confirm explícito')
    manifest = validate()
    exists = psql("SELECT coalesce(to_regnamespace('dss_demo_716_v2')::text,'');")
    if exists:
        raise RuntimeError('dss_demo_716_v2 ya existe; no se sobrescribe una versión anterior')
    print('CARGANDO SOLO dss_demo_716_v2. No se modifican public.* ni dss_demo_716.',flush=True)
    print(psql(str(OUT/'load-v2.psql'), file=True, write=True))
    print('Nueva V2 creada. NO se ha cambiado todavía ninguna ruta del dashboard.')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('command', choices=('inspect','prepare','validate','apply'))
    ap.add_argument('--confirm', action='store_true', help='solo para apply; autoriza crear dss_demo_716_v2')
    args=ap.parse_args()
    if args.command=='inspect':
        inspect()
    elif args.command=='prepare':
        prepare()
    elif args.command=='validate':
        validate()
    else:
        apply(args.confirm)


if __name__=='__main__':
    try:
        main()
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
