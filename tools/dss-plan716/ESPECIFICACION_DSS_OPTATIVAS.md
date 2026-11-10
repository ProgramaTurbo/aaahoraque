# AAAhoraQue · Contrato funcional del Dashboard DSS de optativas

**Versión:** 2026-11-09 — especificación funcional acordada antes de diseñar la pantalla.

## Propósito

Estudiante de 3.º/4.º que está escogiendo optativas y menciones. El sistema **NO decide**, **NO ordena asignaturas por nota ponderada**, **NO calcula ganadores**. Reúne datos académicos, históricos, de encuestas y del catálogo; permite observar alternativas y explorar relaciones. La decisión la toma el usuario. Visualmente debe ser un **dashboard profesional de ventanas y gráficos compactos**, no un cuestionario largo ni un laboratorio textual de escenarios.

## Estructura de interfaz comprometida

- Encabezado: grado / centro / plan / curso / aviso de datos simulados y filtros pequeños (año histórico, asignaturas mostradas).
- Encima de los gráficos: **seis filtros/pestañas A–F**, que cambian las ventanas visibles según categoría.
- Cada categoría mostrará **todos los indicadores disponibles de esa área**, con gráficos distintos según el dato. No es necesario activar todos en la misma vista inicial.
- Interactividad mínima y con propósito: incluir/quitar optativas, filtrar curso/mención, cambiar año histórico, comparar dos o tres materias, ampliar información o mostrar/ocultar una serie; evitar formularios extensos.
- Mostrar siempre contexto: fuente, fecha, número de observaciones, unidad, si la estadística es real agregada o simulada, y las limitaciones.
- Primera vista: KPIs de conjunto, notas y aprobados por optativa, distribución de calificaciones, dedicación, satisfacción, oferta por mención y mapa de contenidos.
- El expediente del estudiante DEMO, ficticio, tiene primero y segundo completos y aprobados con notas simuladas; comienza tercero, puede ver las optativas del tercero y preparar las decisiones de cuarto/menciones. Su perfil **no** equivale a un expediente real y **no** debe confundirse con la población de antiguos estudiantes de muestra.

## Indicadores: catálogo íntegro de 45 ventanas posibles

### A · Resultados académicos históricos
1. Nota media por asignatura (barras).
2. Distribución de calificaciones (histogramas/boxplots).
3. Porcentaje de aprobados por asignatura.
4. Mediana de calificaciones.
5. Porcentaje de sobresalientes.
6. Porcentaje de no presentados.
7. Evolución de las notas por curso académico.
8. Dispersión de calificaciones.
9. Número de observaciones / tamaño de muestra.

### B · Dificultad, dedicación y evaluación
10. Horas de dedicación semanal declaradas.
11. Dificultad percibida por estudiantes.
12. ECTS por asignatura (oficiales).
13. Distribución de evaluación (porcentajes examen, proyectos, prácticas, trabajos).
14. Peso de evaluación continua.
15. Modalidades de aprendizaje.
16. Frecuencia de entregas.
17. Trabajo individual frente a trabajo en grupo.

### C · Interés académico, contenidos y futuro profesional
18. Áreas de conocimiento de cada optativa.
19. Competencias trabajadas.
20. Solapamiento de contenidos.
21. Herramientas y tecnologías estudiadas.
22. Orientación profesional (relaciones documentadas, NO evaluación automática del encaje).
23. Continuidad con asignaturas previas.
24. Relación temática con proyectos y TFG.
25. Cobertura de áreas de la combinación seleccionada.

### D · Experiencias y elecciones de antiguos estudiantes
26. Satisfacción general con la asignatura.
27. Porcentaje que volvería a elegirla.
28. Popularidad de matriculación entre estudiantes.
29. Evolución de popularidad.
30. Principales motivos de elección.
31. Expectativa frente a experiencia.
32. Coelección de optativas (combinaciones más habituales).
33. Satisfacción según intereses declarados.

### E · Compatibilidad, organización y matrícula
34. Disponibilidad por semestre.
35. Distribución semanal de horarios.
36. Conflictos horarios entre asignaturas.
37. Concentración de exámenes y entregas.
38. ECTS seleccionados y carga conjunta.
39. Oferta vigente y plazas.
40. Requisitos académicos / prerrequisitos.

### F · Análisis cruzados y relaciones
41. Nota media frente a dificultad percibida.
42. Dedicación frente a satisfacción.
43. Rendimiento agrupado según antecedentes académicos (sin inferencias causales).
44. Resultados académicos y satisfacción simultáneamente, incluyendo tamaño de muestra.
45. Efecto de combinar optativas (créditos y dedicación conjunta).

## Plan base y estructura curricular

- Universidad de Zaragoza, Escuela de Ingeniería y Arquitectura, grado en Ingeniería Informática, plan **716**, referencia **2026-2027**.
- **240 ECTS:** formación básica 60; obligatorias 102; especialidad/mención 48; optatividad adicional 18; TFG 12. La cifra de 66 ECTS «optativos» incluye la especialidad, NO significa 66 ECTS de libre elección irrestricta.
- 5 menciones: Computación, Ingeniería de Computadores, Ingeniería del Software, Sistemas de Información, Tecnologías de la Información.
- Algunas optativas figuran como no ofertadas. Mostrar claramente `not_offered`, no inferir disponibilidad por estar en el plan.
- La oferta oficial visible de Ingeniería de Computadores en la página de mención de 2026-2027 contiene solo 3 asignaturas. Debe verificarse el régimen transitorio antes de concluir que esas 3 bastan para superar su especialidad. No simular esa equivalencia.

## Tres capas de procedencia obligatorias

**Oficial verificable:** plan, códigos, ECTS, menciones, semestres, estado de oferta; resultados académicos **agregados** que UNIZAR publica por centro y curso. No individualizar recuentos oficiales como si fueran expedientes.

**Sintético derivado/calibrado:** historiales, notas ficticias individuales, horas, dificultad percibida, satisfacción, motivaciones y decisiones de elección. El modelo puede calibrar las proporciones de notas con agregados oficiales 2024-2025, pero NUNCA afirmar que fueron los estudiantes que las obtuvieron. Cohortes y encuestas totalmente ficticias.

**Pendiente de fuente:** porcentajes reales de evaluación y tareas, competencias, horarios, plazos y requisitos de matrícula. No inventar la información como «oficial». Se puede habilitar una capa adicional de datos hipotéticos expresamente etiquetados, si se desea mostrarlos en la demo.

## Fuentes contrastadas

- Plan 716: https://estudios.unizar.es/estudio/asignaturas?anyo_academico=2026&centro_id=110&estudio_id=20260148&plan_id_nk=716
- Estructura 240 / 66 ECTS: https://titulaciones.unizar.es/estudio/ver?anyo_academico=2026&id=148
- Páginas oficiales de menciones: en `referencias_plan716.json`.
- Distribución de notas real agregada EINA 2024-2025: https://estudios.unizar.es/informe/ver?anyo=2024&estudio_id=20240148&sort=-objetivo

## Estado de proyecto

**Fase 1:** verificar plan 716 ya importado en PostgreSQL y cargar relaciones oficiales de menciones, históricos agregados e históricos individuales sintéticos aislados.

**Fase 2:** contrastar guías docentes actuales, horarios y matrícula; completar datos adicionales sin atribuirles certeza inexistente.

**Fase 3:** implementar el dashboard compacto A–F ya acordado, conectándolo a consultas agregadas eficientes. NO crear más UIs de ranking o de evaluación multicriterio automática.
