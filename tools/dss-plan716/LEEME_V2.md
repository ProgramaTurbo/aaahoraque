# AAAhoraQue — Datos DSS del plan 716, versión 2

## Objetivo

Preparar una segunda población de **20.000 estudiantes sintéticos + el estudiante demo** sin sustituir el esquema `dss_demo_716` ya cargado. La segunda versión utiliza una distribución desigual por mención y por año de entrada simulado, asigna las asignaturas en concordancia con la mención y comprueba que cada expediente registra 48 ECTS de asignaturas de mención + 18 ECTS de optatividad adicional. **No implica que estén aprobados.**

Es una **simulación retroproyectada**: el plan 716 de 2026-2027 se aplica ficticiamente a cohortes con fechas 2011–2022. No deben interpretarse como personas, tasas de matrícula o tendencias reales de esos años.

## Fuentes y reservas importantes

- Plan y catálogo real UNIZAR 716 de EINA, curso 2026-2027, recuperados de la BD del proyecto (se exige el UUID previamente auditado).
- Presentación del coordinador del Grado, **17 de marzo de 2026**, https://webdiis.unizar.es/~silarri/coordinadorGrado/DOCS/ConsejosParaElegirUnaEspecialidad_2026.pdf, que enumera ocho asignaturas para Ingeniería de Computadores y aporta un dato agregado real de alumnado por mención de **2024-2025**.
- El código `30291`, **Real-time operating systems**, corresponde por denominación al contenido «Sistemas Operativos Tiempo Real» en la presentación. La equivalencia administrativa de códigos debe verificarse antes de implementar reglas reales de matrícula. `30286` está ausente del plan cargado y **no se crea** ni se utiliza para generar notas. `30260`, Bioinformática, consta como no ofertada y se excluye de resultados ficticios.
- Los recuentos históricos por especialidad utilizados para calibración (38, 26, 19, 17 y 16) solo describen el curso **2024-2025**. Los restantes años de la serie son construidos mediante hipótesis, **no observados**.
- Los 31 conjuntos de agregados reales de calificaciones 2024-2025 proceden de una referencia oficial distinta y se almacenan en una tabla separada; las notas, horas, percepciones y encuestas individuales de V2 son exclusivamente ficticias.

## Archivos de esta entrega

- `preparar_demo716_v2.py`: inspecciona, prepara, valida y, con confirmación explícita, carga una versión independiente.
- `referencias_plan716_v2.json`: cinco menciones, ampliando el grupo de Ingeniería de Computadores a ocho asignaturas relacionadas mediante fuentes oficiales, con advertencia sobre el código bilingüe.
- `plan716_menciones_serie_simulada.csv`: 60 celdas (12 años de entrada × 5 menciones) y cuotas sintéticas que suman 20.000.
- `plan716_menciones_metodologia.json`: procedimiento y fuentes de calibración de la serie anterior.
- `00_dss_plan716_v2_schema.sql`: tablas del nuevo esquema `dss_demo_716_v2` (no modifica tablas de `public` ni `dss_demo_716`).
- `auditoria_postcarga_v2.sql`: inspección de solo lectura para ejecutar **después** de cargar, si se autoriza.

**Dependencia**: el archivo original `tools/dss-plan716/preparar_demo716.py` debe permanecer donde estaba. La versión V2 reutiliza su lógica de simulación de notas y encuestas mediante importación; no la modifica.

## Procedimiento en macOS

Desde la raíz del repositorio:

```bash
unzip -n ~/Downloads/AAAhoraQue_DSS716_v2.zip -d tools/dss-plan716/
set -a
source .env.mv.local
set +a
python3 tools/dss-plan716/preparar_demo716_v2.py inspect
python3 tools/dss-plan716/preparar_demo716_v2.py prepare
python3 tools/dss-plan716/preparar_demo716_v2.py validate
```

Requiere túnel SSH del proyecto abierto como hasta ahora. `prepare` escribe **solo ficheros** en `~/Aaahoraque/imports/dss-plan716/stage-v2`, sin acceder a tablas para escritura. Si ese directorio ya contiene archivos, aborta por seguridad. La validación completa lee todos los resultados generados y verifica las 60 cuotas, las notas, códigos, créditos optativos y expediente demo.

**No ejecutar la carga antes de revisar la validación.** Una vez autorizada, la orden para crear el esquema independiente es:

```bash
python3 tools/dss-plan716/preparar_demo716_v2.py apply --confirm
```

No hace `DROP`, `UPDATE`, `DELETE` ni cambia el dashboard. La operación está encerrada en una transacción. Si `dss_demo_716_v2` ya existe, aborta.

## Diseño del dashboard (pendiente)

Se conserva el acuerdo previo: filtros A–F, 45 indicadores iniciales y el **indicador 46** sobre la evolución de estudiantes por mención y año. La ventana 46 mostrará **siempre «simulación calibrada»** para la serie de 12 años y separará el único dato oficial de 2024-2025. No se calcularán recomendaciones automáticas ni rankings.
