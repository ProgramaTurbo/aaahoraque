#!/usr/bin/env python3
"""AAAhoraQue - inventario y recopilación verificable de guías de UNIZAR 2026/27.

Solo lectura en PostgreSQL y en la web. NO escribe en la base de datos.
Solo crea ficheros en ~/Aaahoraque/imports/dss-plan716/guias-2026-2027.
Sin dependencias de terceros: Python 3.10+ y psql.

Comandos:
  python3 recolectar_guias_oficiales_716.py inspect
  python3 recolectar_guias_oficiales_716.py collect --limit 3
  python3 recolectar_guias_oficiales_716.py collect --all
  python3 recolectar_guias_oficiales_716.py report

El texto es una COPIA de la fuente para revisión, no datos estructurados
verificados. Los pesos de evaluación y horas NO se extraen automáticamente.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

PLAN_ID = 'fed26b74-ed7e-58e6-bf1a-9da2d1413862'
COURSE = '2026-2027'
EXPECTED_OPTIONALS = 40
ROOT = Path.home() / 'Aaahoraque' / 'imports' / 'dss-plan716' / 'guias-2026-2027'
GUIDE_ENDPOINT = 'https://sia.unizar.es/doa/consultaPublica/look%5Bconpub%5DMostrarPubGuiaDocAs'
BLOCKS = {'div', 'p', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'td', 'th', 'dt', 'dd', 'section', 'article', 'ul', 'ol'}
MAX_BYTES = 3_000_000


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


class GuideTextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.hidden += 1
        elif not self.hidden and tag in BLOCKS:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'):
            self.hidden = max(0, self.hidden - 1)
        elif not self.hidden and tag in BLOCKS:
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

    def text(self):
        raw = ''.join(self.parts).replace('\xa0', ' ')
        lines = [re.sub(r'\s+', ' ', line).strip() for line in raw.splitlines()]
        return '\n'.join(line for line in lines if line).strip()


def db_env():
    url = os.environ.get('DB_URL') or os.environ.get('DATABASE_URL')
    if not url or not url.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('Falta DB_URL/DATABASE_URL: ejecuta source .env.mv.local con set -a.')
    u = urlsplit(url)
    if not u.hostname or not u.path.lstrip('/'):
        raise RuntimeError('La URL de PostgreSQL no tiene host o base de datos.')
    if shutil.which('psql') is None:
        raise RuntimeError('No se encuentra psql.')
    env = dict(os.environ)
    env.update({
        'PGHOST': u.hostname,
        'PGPORT': str(u.port or 5432),
        'PGDATABASE': unquote(u.path.lstrip('/')),
        'PGCONNECT_TIMEOUT': '10',
        'PGOPTIONS': '-c default_transaction_read_only=on',
    })
    if u.username is not None:
        env['PGUSER'] = unquote(u.username)
    if u.password is not None:
        env['PGPASSWORD'] = unquote(u.password)
    query = dict(parse_qsl(u.query))
    if 'sslmode' in query:
        env['PGSSLMODE'] = query['sslmode']
    return env


def official_optionals():
    query = f'''COPY (
      SELECT s.official_code AS code, s.name, s.academic_year AS study_year,
             s.semester, s.ects, s.source_url
      FROM public.subjects s
      JOIN public.study_plans p ON p.id = s.study_plan_id
      WHERE p.id = '{PLAN_ID}'::uuid AND p.official_code = '716'
        AND p.status = 'official' AND s.subject_type = 'optional'
      ORDER BY s.official_code
    ) TO STDOUT WITH (FORMAT CSV, HEADER true)'''
    proc = subprocess.run(['psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', query],
                          env=db_env(), text=True, capture_output=True, timeout=60)
    if proc.returncode:
        raise RuntimeError('Fallo al consultar PostgreSQL (sin mostrar credenciales):\n' + proc.stderr[-1600:])
    rows = list(csv.DictReader(io.StringIO(proc.stdout)))
    codes = [r['code'] for r in rows]
    if len(rows) != EXPECTED_OPTIONALS or len(set(codes)) != EXPECTED_OPTIONALS:
        raise RuntimeError(f'El catálogo cambió: {len(rows)} optativas / {len(set(codes))} códigos únicos, se esperaban 40. Abortado.')
    if any(not re.fullmatch(r'\d{5}', code) for code in codes):
        raise RuntimeError('Código no reconocido. Abortado.')
    return rows


def guide_url(code):
    return GUIDE_ENDPOINT + '?' + urlencode({
        '_anoAcademico': '2026',
        '_codAsignatura': code,
        'entradaPublica': 'true',
        'idiomaPais': 'es.ES',
    })


def load_manifest():
    path = ROOT / 'manifest.json'
    if not path.exists():
        return {'plan_id': PLAN_ID, 'course': COURSE, 'source': 'sia.unizar.es', 'items': {}}
    m = json.loads(path.read_text(encoding='utf-8'))
    if m.get('plan_id') != PLAN_ID or m.get('course') != COURSE or not isinstance(m.get('items'), dict):
        raise RuntimeError('El manifiesto existente corresponde a otro plan, curso o formato. No se sobrescribe.')
    return m


def save_manifest(m):
    ROOT.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / 'manifest.json.tmp'
    m['updated_at'] = now_iso()
    tmp.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(ROOT / 'manifest.json')


def retrieve(code):
    url = guide_url(code)
    req = Request(url, headers={
        'User-Agent': 'AAAhoraQueAcademicResearch/1.0 (consultas de guias publicas; 1 solicitud por segundo)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
    })
    with urlopen(req, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError(f'HTTP {response.status}')
        content_type = response.headers.get('Content-Type', '')
        if 'html' not in content_type.lower():
            raise RuntimeError(f'Respuesta no HTML: {content_type}')
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise RuntimeError('La respuesta excede el límite de 3 MB')
        encoding = response.headers.get_content_charset() or 'utf-8'
        html = data.decode(encoding, errors='replace')
    parser = GuideTextParser()
    parser.feed(html)
    full_text = parser.text()
    spanish_pos = full_text.find('Información del Plan Docente')
    text_es = full_text[spanish_pos:] if spanish_pos >= 0 else full_text
    # La web puede incluir titulaciones y centros múltiples. La validación es
    # documental; no garantiza que TODAS las reglas de evaluación sean EINA.
    signals = {
        'course_2026_27': '2026/27' in text_es or '2026-2027' in text_es,
        'subject_code': bool(re.search(rf'\b{re.escape(code)}\b', text_es)),
        'center_110': bool(re.search(r'\b110\s*-\s*Escuela de Ingeniería y Arquitectura\b', text_es)),
        'plan_716': bool(re.search(r'\b716\s*-\s*Graduado en Ingeniería Informática\b', text_es)),
        'spanish_guide': spanish_pos >= 0,
        'assessment_section': 'Sistema de evaluación' in text_es,
        'activities_section': 'Actividades académicas' in text_es,
    }
    # No declarar verificado algo que necesite lectura humana.
    status = 'recopilada_pendiente_revision' if all(signals.values()) else 'revision_manual_prioritaria'
    return {'html_bytes': data, 'text': text_es, 'url': url,
            'sha256': hashlib.sha256(data).hexdigest(), 'signals': signals, 'status': status}


def collect(limit: int | None):
    rows = official_optionals()
    manifest = load_manifest()
    chosen = rows[:limit] if limit is not None else rows
    (ROOT / 'html').mkdir(parents=True, exist_ok=True)
    (ROOT / 'texto_es').mkdir(parents=True, exist_ok=True)
    attempted = 0
    for r in chosen:
        code = r['code']
        if code in manifest['items'] and manifest['items'][code].get('sha256'):
            print(f'[{code}] ya recopilada; no se sobrescribe')
            continue
        if (ROOT / 'html' / f'{code}.html').exists():
            raise RuntimeError(f'Existe HTML de {code} sin manifiesto válido. Revisar carpeta antes de continuar.')
        attempted += 1
        try:
            fetched = retrieve(code)
            (ROOT / 'html' / f'{code}.html').write_bytes(fetched.pop('html_bytes'))
            (ROOT / 'texto_es' / f'{code}.txt').write_text(fetched.pop('text') + '\n', encoding='utf-8')
            manifest['items'][code] = {
                **{k: v for k, v in r.items()},
                **fetched,
                'retrieved_at': now_iso(),
                'provenance': 'official_unizar_guide_source_unreviewed',
                'html_file': f'html/{code}.html',
                'spanish_text_file': f'texto_es/{code}.txt',
            }
            print(f'[{code}] {manifest["items"][code]["status"]} · SHA256 {fetched["sha256"][:12]}')
        except (HTTPError, URLError, TimeoutError, UnicodeError, RuntimeError, ValueError) as exc:
            manifest['items'][code] = {'name': r['name'], 'url': guide_url(code),
                                       'status': 'no_recopilada', 'reason': str(exc)[:240],
                                       'retrieved_at': now_iso()}
            print(f'[{code}] no recopilada: {exc}', file=sys.stderr)
            if isinstance(exc, HTTPError) and exc.code in (429, 503):
                save_manifest(manifest)
                print('La web ha limitado las peticiones; se detiene la recopilación.', file=sys.stderr)
                break
        save_manifest(manifest)
        time.sleep(1.2)
    print(f'\nIntentadas ahora: {attempted}; registros en manifiesto: {len(manifest["items"])} / {len(rows)}')
    print('Directorio:', ROOT)
    print('SIN escrituras en PostgreSQL. Revisión académica pendiente.')


def report():
    m = load_manifest()
    statuses = {}
    for code, item in sorted(m['items'].items()):
        key = item.get('status', 'sin_estado')
        statuses[key] = statuses.get(key, 0) + 1
        print(f'{code} | {key} | {item.get("name", "")}')
    print('\nRESUMEN:')
    for key, value in sorted(statuses.items()):
        print(' ', key, '=', value)
    print(' Total:', len(m['items']), '/ 40 optativas')
    print(' IMPORTANTE: ningun dato cuantitativo de guias se considera validado automaticamente.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='action', required=True)
    sub.add_parser('inspect', help='Comprobar 40 optativas en BD (solo lectura)')
    coll = sub.add_parser('collect', help='Guardar guias y evidencias en disco (solo GET HTTP y SELECT)')
    group = coll.add_mutually_exclusive_group(required=True)
    group.add_argument('--limit', type=int, help='Descargar las primeras N guias para probar')
    group.add_argument('--all', action='store_true', help='Descargar las 40 guias (reanuda sin sobrescribir)')
    sub.add_parser('report', help='Mostrar cobertura de la recopilacion; no requiere BD')
    args = ap.parse_args()
    if args.action == 'inspect':
        rows = official_optionals()
        print(f'OK: {len(rows)} optativas oficiales del plan 716, curso {COURSE}.')
        print('Primera:', rows[0]['code'], rows[0]['name'])
        print('Ultima:', rows[-1]['code'], rows[-1]['name'])
        print('NO se ha escrito en PostgreSQL.')
    elif args.action == 'collect':
        if args.limit is not None and not (1 <= args.limit <= EXPECTED_OPTIONALS):
            ap.error('--limit debe estar entre 1 y 40')
        collect(None if args.all else args.limit)
    else:
        report()


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
