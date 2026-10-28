# Orientación inicial de carreras (v1)

/degrees presenta tarjeta de entrada sin cargar catálogo, test de seis pasos y
resultados personalizados. Todas las preguntas son opcionales. Las respuestas viven
en memoria del navegador, no se persisten ni se incluyen en URLs. Se pueden revisar.

## Integración

POST /api/degrees/orientation consulta solo metadatos de ofertas, envía perfil y
alternativas a POST /degrees/orient en FastAPI y devuelve 12 ofertas paginadas.
Planes bajo demanda. El motor no accede a SQL. DECISION_ENGINE_URL es opcional;
por defecto http://127.0.0.1:8000. No cambian los endpoints previos del catálogo.

Para iniciar el motor en PowerShell desde la raíz:

```powershell
cd services/decision-engine
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Mantener motor, web y túnel abiertos. Si el motor falla, se muestra error y reintento.

## Metodología provisional

- Intereses: palabras del nombre de titulación (AREAS en orientation.py).
  Heurística editorial explícita, no análisis del plan. Para áreas detectadas y
  respondidas: interés=100, rechazo=0; se promedian esas áreas. No respondida no
  implica rechazo. Sin coincidencia respondida el criterio queda desconocido.
- Ubicación: coincidencia de provincia del centro con provincia/comunidad elegida
  =100, fuera=0. Restricción estricta excluye discrepancias conocidas. Provincia
  desconocida queda pendiente; no se inventan tiempos ni distancias. Seleccionar
  comunidad no selecciona automáticamente una provincia de origen.
- Modalidad: coincidencia=100, discrepancia=0. Si es estricta descarta diferencias
  conocidas. Normaliza etiquetas inequívocas. Semi/No Presencial es ambigua:
  queda pendiente, no se considera incompatible.
- Pesos 0..5 normalizados entre criterios activos. Peso cero desactiva criterio,
  no restricción. Sin respuestas o con todos los pesos cero no hay agregado.
- Solo se agrega si todos los criterios activos pueden calcularse en la oferta.
  No se renormaliza por oferta. Incompletas van después sin puntuación; no se
  afirma que sean peores. El agregado no es una probabilidad de éxito.
- Aptitudes son autoevaluaciones, no un test psicométrico. Autoevaluaciones,
  actividades, objetivos, notas, presupuesto, titularidad, duración y distancia
  se recogen pero no puntúan hasta tener modelos/datos fundamentados. Coste
  desconocido no equivale a presupuesto cumplido. Todas las alternativas tienen
  verificaciones pendientes; no se garantiza admisión.
- Siguiente mejora: perfiles curriculares documentados y validación de preguntas.

## Validación

Pruebas en tests/test_careers_orientation.py: desconocidos, intereses, restricciones,
preferencias, costes ausentes, criterios incompletos, modalidades ambiguas, pesos
cero y validación HTTP. Integración comprobada con catálogo de desarrollo y test
en navegador. Sin migraciones ni cambios al esquema.
