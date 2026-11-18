# Evolución del test de Carreras

## Auditoría del flujo anterior

El formulario estaba en orientation-test.tsx y contenía siete pasos. Los tipos y datos de preguntas estaban en orientation-profile.ts. OrientationProvider conservaba borrador, perfil completado y paso en memoria. Al recargar se perdían.

Las respuestas llegaban desde DegreesWorkspace a POST /api/degrees/orientation. Next.js consultaba el catálogo y remitía perfil y ofertas a FastAPI, en /degrees/orient. El motor mezclaba intereses binarios con las elecciones A/B, clasificaba grados por palabras del nombre y calculaba la media ponderada de intereses, ubicación y modalidad.

Las visualizaciones relevantes son InterestMap, las barras de OfferingCard, OfferingRadar y SelectedOfferingsChart. Los datos desconocidos ya estaban separados de cero en chart-data.ts, pero el radar cerraba hacia el centro cuando faltaba un criterio.

Había pruebas de los datos de gráficos, del autocompletado y del motor. Las nuevas pruebas amplían esos puntos con el perfil versionado y la recuperación.

## Archivos de esta tarea

Las rutas siguientes pertenecen a C:/Users/traba/GitHub/aaahoraque.

| Archivo | Finalidad |
|---|---|
| apps/web/src/features/degrees/orientation-profile.ts | Preguntas configurables, respuestas versionadas, cálculo puro del perfil, adaptación al motor, migración y validación |
| apps/web/src/features/degrees/orientation-test.tsx | Evolución de los siete pasos, escalas, subintereses adaptativos, nuevas condiciones y edición desde la revisión |
| apps/web/src/features/degrees/orientation-profile-view.tsx | Revisión y visualizaciones accesibles de todas las dimensiones del perfil |
| apps/web/src/features/degrees/orientation-session.tsx | Recuperación en sessionStorage, conservación del paso y borrado al salir |
| apps/web/src/features/degrees/personalized-pages.tsx | Perfil desplegable en resultados y textos coherentes con la recuperación |
| apps/web/src/features/degrees/interest-map.tsx | Puntos y tooltips basados en el interés declarado utilizado por el ranking |
| apps/web/src/features/degrees/degrees-workspace.tsx | Conexión del mapa y explicación del perfil ampliado |
| apps/web/src/features/degrees/offering-radar.tsx | Exclusión de valores ausentes del trazado y del relleno |
| apps/web/src/app/api/degrees/orientation/route.ts | Migración, validación y adaptador del perfil antes de llamar a FastAPI |
| apps/web/src/app/degrees/page.tsx | Presentación actualizada de los siete pasos |
| services/decision-engine/app/modules/careers/orientation.py | Entrada numérica opcional para intereses declarados, compatible con clientes antiguos |
| apps/web/src/features/degrees/orientation-profile.test.mjs | Casos A–F, normalización, ausencia de datos, migración, cobertura y restricciones |
| apps/web/src/features/degrees/random-profile.test.mjs | Verificación del nuevo esquema en el autocompletado |
| services/decision-engine/tests/test_careers_orientation.py | Contrato numérico, cero, datos ausentes y conservación de restricciones |

Los cambios anteriores del repositorio se han conservado.

## Preguntas y respuestas

1. Tus intereses usa cinco niveles, de Nada a Muchísimo, y una respuesta independiente de desconocimiento. Las tres áreas positivas mejor valoradas despliegan sus subintereses. Los empates se resuelven con el orden fijo de las ocho áreas. Un cero o un desconocimiento no activa profundización.
2. Elegir A o B conserva las ocho parejas. Permite preferir A, preferir B, ambas, ninguna o desconocimiento. También permite borrar la respuesta.
3. Cómo te ves separa cinco capacidades percibidas, ocho preferencias de actividades y nueve motivaciones. Se conserva Salario junto a las ocho motivaciones solicitadas porque ya se recogía en el test.
4. Tu formación conserva datos y notas. Añade su estado confirmado por el estudiante, estimado o desconocido. Valida intervalos y coherencia entre nota de acceso y admisión.
5. Dónde estudiar conserva los campos usados por el motor. Añade provincias preferidas, aceptables e imposibles y la viabilidad de mudarse y desplazarse. Los campos adicionales se muestran como información para una futura evaluación.
6. Condiciones y prioridades conserva los pesos de 0 a 5. Añade requisitos obligatorios, preferencias importantes, flexibles y sin preferencia. La obligatoriedad de modalidad se adapta a modality_strict y la de presupuesto a budget_strict. Los campos aún pendientes de comprobar se explican en el resumen.
7. Revisar respuestas permite abrir grupos y volver a editar cada paso.

## Modelo y fórmulas

El esquema de respuestas tiene versión 2 y el cálculo se identifica como orientation-profile-v2.

Una valoración conserva un nivel original de 0 a 4 y su estado. El valor normalizado es nivel × 25. Una respuesta desconocida tiene estado unknown y carece de valor numérico. Una pregunta omitida carece de entrada y se deriva como unanswered.

Las preguntas se identifican mediante claves estables, por ejemplo interests.technology y subinterests.technology.programming. Las etiquetas y los subintereses están en datos configurables.

El perfil derivado conserva intereses generales, subintereses aplicables, preferencias relativas, evidencias por actividad, capacidades percibidas, motivaciones, restricciones, prioridades, cobertura y versión.

Las preferencias A y B aportan +1/-1 en una dimensión relativa. Ambas y Ninguna aportan +1/-1 en una dimensión absoluta independiente. El desconocimiento aporta un estado y ningún número. Cada evidencia conserva la pareja y la actividad a la que pertenece.

La preferencia comparativa es 50 + 50 × suma relativa / comparaciones relativas válidas. Si el denominador es cero se devuelve null. Ambas y Ninguna no entran en ese denominador.

La cobertura mostrada se refiere expresamente al perfil de intereses, comparaciones, actividades, capacidades y motivaciones. Cuenta valoraciones numéricas y comparaciones válidas sobre las preguntas aplicables de esas dimensiones. Excluye desconocimientos, omisiones y subintereses de áreas que ya no estén entre las exploradas. Formación y condiciones se revisan en sus propios grupos.

También se informa de respuestas disponibles por área. Se marca información limitada cuando hay menos de dos respuestas válidas sobre esa área. Este umbral es informativo y no altera las puntuaciones.

## Relación entre indicadores y funciones

| Indicador o visualización | Función que proporciona el dato |
|---|---|
| Escalas de intereses generales | normalizeLevel → scaleMeasure → deriveOrientationProfile.generalInterests |
| Colores, nombres y puntuaciones del mapa de intereses | deriveOrientationProfile.generalInterests y rankedAreas |
| Subintereses agrupados | selectExplorationAreas → deriveOrientationProfile.subinterests |
| Preferencias relativas A/B | deriveOrientationProfile.comparativePreferences |
| Evidencias positivas y negativas de cada actividad comparada | deriveOrientationProfile.activityEvidence |
| Preferencias de actividades valoradas directamente | deriveOrientationProfile.activityPreferences |
| Capacidades autopercibidas | deriveOrientationProfile.perceivedCapacities |
| Motivaciones | deriveOrientationProfile.motivations |
| Cobertura y cantidad de respuestas por área | deriveOrientationProfile.coverage y areaCoverage |
| Barras de afinidad y criterio en las ofertas | analyze, en orientation.py |
| Radar de una oferta | analyze → criterionChartValue |
| Comparación de ofertas seleccionadas | analyze → overallChartValue y criterionChartValue |
| Estado de cero, falta de datos y criterio inactivo en gráficos de ofertas | numericScore, overallChartValue y criterionChartValue |

Las visualizaciones del perfil reutilizan el cálculo central. El radar rellena el polígono cuando los tres criterios tienen valor. Con un perfil parcial conserva los puntos válidos y explica la ausencia de información.

## Compatibilidad con el recomendador

toOrientationEngineProfile toma solo el interés declarado de las ocho áreas y lo envía como area_interest_scores. Omite las áreas sin valoración. Envía vacíos los antiguos campos de interés binario y parejas para evitar que el motor mezcle fórmulas.

La ampliación de FastAPI acepta esas puntuaciones numéricas entre 0 y 100. La clasificación por nombre, la media de las áreas detectadas, el cálculo ponderado, las restricciones y la ordenación siguen usando su implementación existente. Se conserva la entrada antigua para clientes que no envíen el nuevo campo.

En el caso tecnología 100, ciencias 75 y preferencia por la actividad científica, tecnología mantiene 100 para el ranking. La comparación relativa queda en su indicador específico.

Actualmente quedan fuera del ranking los subintereses, las preferencias comparativas A/B, las evidencias sobre actividades, las valoraciones directas de actividades, las capacidades percibidas y las motivaciones. También quedan recogidos para futuras evaluaciones el expediente, las condiciones adicionales de mudanza, las listas de provincias nuevas, el presupuesto, la titularidad y la duración. La movilidad, modalidad y pesos originales conservan sus efectos.

## Recuperación y migración

sessionStorage conserva borrador, perfil completado, paso, versión y marca de perfil simulado en la pestaña. La hidratación ocurre antes de montar el formulario. Salir del test borra el estado y la copia recuperable.

Las respuestas binarias antiguas pasan a 0 o 100. Las capacidades antiguas de 0–4 se normalizan. Las elecciones A/B antiguas pasan a preferencias relativas y conservan su respuesta original. Los checkbox antiguos se conservan y se relacionan con las nuevas preguntas cuando existe equivalencia, pendientes de una nueva valoración de intensidad.

Las preguntas nuevas quedan sin contestar. Los datos originales se conservan en legacyAnswers. La carga tolera JSON corrupto, campos opcionales ausentes y respuestas inválidas.

## Validación

- 21 pruebas JavaScript de perfil, gráficos y autocompletado superadas.
- 16 pruebas Python de orientación superadas.
- TypeScript sin errores.
- ESLint de los archivos afectados sin errores.
- Navegador con catálogo y motor reales verificado. Se probaron subintereses adaptativos, comparaciones, edición desde la revisión, notas incoherentes, modalidad obligatoria, recarga, resultados, visualización de criterios y borrado al salir.
- Revisión visual en escritorio y móvil de 390 × 844.
- Compilación de producción completa superada en una copia aislada con Webpack, TypeScript y generación de las 13 páginas estáticas. La comprobación usa los mismos fuentes y dependencias. Se empleó una salida limpia, cleanDistDir desactivado y un único proceso de compilación para evitar los errores EPERM de este entorno. La copia de verificación adapta la resolución de módulos a las dependencias existentes. La configuración de la aplicación se conserva.

## Decisiones y cuestiones pendientes

La persistencia es por pestaña, coherente con el contexto de orientación existente. La selección de provincias adicionales queda preparada para una futura revisión del recomendador.

La precisión vocacional futura sigue dependiendo de disponer de perfiles académicos contrastados para cada grado. Las nuevas dimensiones se presentan de forma independiente mientras se prepara esa correspondencia.

La compilación normal con Turbopack encontró errores al arrancar sus procesos auxiliares. Los intentos de Webpack en la salida habitual encontraron EPERM en mkdir. La copia aislada permitió completar compilación, tipos y generación de páginas. La ejecución habitual de pnpm build en este entorno sigue condicionada por esos permisos.
