# AAAhoraQue — Fuentes de datos académicos

Este directorio documenta las fuentes utilizadas para construir
el catálogo académico común de AAAhoraQue.

Los datos procedentes de fuentes externas deben distinguirse
de los datos sintéticos utilizados en las demostraciones.

## 1. Clasificación de universidades ISTAC

Organismo: Instituto Canario de Estadística (ISTAC).

Recurso:
CL_RUCT_UNIVERSIDADES

Versión utilizada:
01.000

Esta clasificación proporciona códigos y nombres de universidades,
además de categorías jerárquicas.

No contiene por sí sola todas las titulaciones, asignaturas
o convenios de movilidad.

### Descarga

Desde la raíz del repositorio:

```bash
mkdir -p data/raw/universities

curl -fL --retry 3 \
  'https://datos.canarias.es/api/estadisticas/structural-resources/v1.0/codelists/ISTAC/CL_RUCT_UNIVERSIDADES/01.000/codes.csv?fields=+description' \
  -o data/raw/universities/ruct_istac.csv
```

### Validación y generación de SQL

```bash
python3 data/importers/import_universities_istac.py
```

El importador valida el fichero y prepara:

/tmp/aaahoraque-universities-import.sql

El script Python no modifica directamente PostgreSQL.

La versión del importador actual espera 91 universidades candidatas.
Si la fuente cambia, debe revisarse y actualizarse conscientemente.

### Importación

Requiere PostgreSQL inicializado y las migraciones académicas aplicadas.

```bash
docker compose exec -T postgres \
  psql -X -v ON_ERROR_STOP=1 -U aaahoraque -d aaahoraque \
  < /tmp/aaahoraque-universities-import.sql
```

El proceso conserva los registros existentes y evita insertar
de nuevo universidades con el mismo identificador ISTAC.

### Verificación

```sql
SELECT COUNT(*)
FROM universities
WHERE official_code LIKE 'ISTAC:CL_RUCT_UNIVERSIDADES:%';
```

Resultado esperado para esta versión: 91.

## 2. Acceso desde la aplicación

GET /api/catalog/universities

Esta primera API devuelve las universidades importadas desde ISTAC.

No debe confundirse con el futuro catálogo académico unificado,
que combinará distintas fuentes y resolverá sus correspondencias.

## 3. Próximas fuentes

- RUCT: titulaciones oficiales.
- QEDU: oferta académica e indicadores agregados.
- SIIU: estadísticas del sistema universitario.
- Universidades: planes de estudios, asignaturas y guías docentes.

Antes de importar cada fuente deberán verificarse su cobertura,
estructura, fecha de actualización y condiciones de reutilización.
