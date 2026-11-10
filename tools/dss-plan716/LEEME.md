# AAAhoraQue · Kit de datos del DSS de optativas (UNIZAR plan 716)

Este kit no modifica el dashboard ni el motor. Conecta con el PostgreSQL de AAAhoraQue mediante el túnel SSH que ya se usa habitualmente.

**IMPORTANTE:** en esta sesión ChatGPT no tiene conexión directa a la máquina virtual. La carga real ocurre únicamente cuando ejecutas `apply --confirm` desde tu Mac contra la BD accesible por el túnel. No se ha aplicado nada en remoto desde aquí.

## ¿Qué contiene?

- `ESPECIFICACION_DSS_OPTATIVAS.md`: requisitos funcionales y las **45 ventanas/indicadores A–F** del dashboard, para conservar el diseño.
- `referencias_plan716.json`: fuentes oficiales, cinco menciones y su correspondencia con asignaturas, distribución curricular y **31 distribuciones reales agregadas de calificaciones de 2024-2025 (EINA)**.
- `00_dss_plan716_schema.sql`: cinco tablas **nuevas** en el esquema independiente `dss_demo_716`. Nada se inserta ni cambia en las tablas originales `public.*`.
- `preparar_demo716.py`: inspección, generación determinista y carga transaccional de resultados ficticios, sin dependencias Python externas.

## Instalación en tu Mac

1. Descomprime el ZIP en `tools/dss-plan716/` dentro del repositorio.
2. Asegura el túnel SSH **en otro terminal**:

    ssh -N -L 5543:127.0.0.1:5432 alumno@155.210.71.96

3. En el terminal de trabajo:

    cd ~/universidad-workspace/AyudaTomaDecisiones_workspace/aaahoraque
    set -a
    source .env.mv.local
    set +a
    python3 tools/dss-plan716/preparar_demo716.py inspect

   **`inspect` es solo lectura**, verifica que el plan 716 ya importado corresponde a la Escuela de Ingeniería y Arquitectura de UNIZAR y que las asignaturas de las menciones existen. Si aparece algún conflicto, se detiene.

4. Prepara los CSV (todavía SIN escribir en la BD):

    python3 tools/dss-plan716/preparar_demo716.py prepare --students 2500

   Por defecto genera una población ficticia de 2.500 estudiantes históricos más un estudiante demo, más de 50.000 resultados en total, y tablas de correspondencias y resultados agregados. El contenido puede reproducirse con la misma semilla.

5. Revisa el informe y los CSV en `~/Aaahoraque/imports/dss-plan716/stage/` (fuera del repositorio y de Git). Si te parecen correctos, carga en PostgreSQL (esta vez SÍ modifica la BD, solo creando el esquema `dss_demo_716`):

    python3 tools/dss-plan716/preparar_demo716.py apply --confirm

   La carga se realiza en **una sola transacción**, incluye restricciones de integridad y se aborta ante inconsistencias. La repetición no sobrescribe una carga existente.

## Validación tras cargar

    PGOPTIONS='-c default_transaction_read_only=on' psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c \
    "SELECT COUNT(*) AS resultados_sinteticos FROM dss_demo_716.results;"

    PGOPTIONS='-c default_transaction_read_only=on' psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c \
    "SELECT COUNT(*) AS asignaturas_con_agregados_oficiales FROM dss_demo_716.official_grade_aggregates;"

    PGOPTIONS='-c default_transaction_read_only=on' psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c \
    "SELECT s.academic_year, COUNT(*) FROM dss_demo_716.results r JOIN subjects s ON s.id=r.subject_id WHERE r.student_code='DEMO716-ESTUDIANTE' GROUP BY s.academic_year ORDER BY 1;"

## Lo que representa y NO representa

- Las filas de `dss_demo_716.official_grade_aggregates` son **estadísticas oficiales agregadas reales de la EINA, año 2024/25**. No hay registros individuales reales.
- Las filas de `dss_demo_716.students` y `dss_demo_716.results` son **100 % ficticias**. Las calificaciones usan patrones calibrados parcialmente con las frecuencias publicadas para 2024/25; la dificultad, la satisfacción, el interés y la dedicación son hipótesis simuladas.
- Las cohortes históricas se modelan **retroproyectando** el catálogo del plan 716 a fechas anteriores, con el propósito exclusivo de disponer de datos comparables en un demo. No constituyen el historial real del plan 716.
- Los 40 millones de resultados previos siguen intactos y **no se mezclan** con el demo del plan 716.
- Se conserva que el curso 2026/27 puede tener asignaturas «no ofertadas»; no se simulan elecciones de esas asignaturas.
- El estudiante principal tiene **1.º y 2.º aprobados**, con notas inventadas, y se sitúa al comienzo de 3.º para empezar a valorar optativas. El usuario todavía podrá explorar las optativas de 4.º y sus menciones.

## Recuperación

La carga no toca `public.*`. Si **después de verificar** que no se han creado dependencias externas y que deseas eliminar la demo por completo, los datos nuevos pertenecen únicamente al esquema `dss_demo_716`. No ejecutar eliminaciones sin revisar primero las dependencias y sin autorización expresa.
