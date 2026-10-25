# Modelo de variables — Titulación universitaria y universidad

## 1. Objetivo

Definir la información que utiliza el módulo de elección de titulación
universitaria y universidad, diferenciando entre:

- datos del estudiante;
- datos de las alternativas;
- preferencias declaradas;
- variables derivadas o calculadas;
- restricciones de acceso;
- incertidumbres y datos pendientes de verificar.

El sistema no debe almacenar directamente una puntuación opaca de compatibilidad
entre estudiante y titulación. La comparación deberá calcularse a partir de
datos identificables, criterios explícitos y preferencias del estudiante.

Se reutilizarán las entidades compartidas del proyecto. Este módulo no debe
crear un catálogo paralelo de universidades, centros, titulaciones u ofertas.

---

# 2. Variables del estudiante

## 2.1. Vía de acceso

### access_route

Vía mediante la que el estudiante pretende acceder a la universidad.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: global para el proceso de decisión.
- Ejemplos iniciales: Bachillerato, ciclo formativo de grado superior de FP.
- Uso:
  - determinar qué información académica es relevante;
  - identificar los requisitos de acceso que deben comprobarse;
  - contextualizar el cálculo de las notas cuando corresponda.

La vía de acceso debe representarse mediante valores controlados y extensibles,
no mediante texto libre sin validación.

### baccalaureate_modality

Modalidad de Bachillerato cursada por el estudiante, cuando corresponda.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: formación previa.
- Uso:
  - contextualizar las materias cursadas;
  - analizar la relación entre la formación previa y los estudios deseados;
  - identificar información relevante para los procedimientos de admisión.

No se aplicará a estudiantes cuya vía de acceso no sea Bachillerato.

### vocational_family

Familia profesional del ciclo formativo cursado, cuando corresponda.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: formación previa.
- Uso:
  - contextualizar el ciclo formativo;
  - analizar la relación entre la formación previa y las titulaciones universitarias;
  - identificar los requisitos de acceso que deban verificarse.

No se aplicará a estudiantes cuya vía de acceso no sea FP.

### previous_qualification

Identificación de la titulación o estudios previos que permiten al estudiante
solicitar el acceso.

- Fuente: estudiante y, cuando exista, documentación académica.
- Naturaleza: declarada o verificada.
- Alcance: formación previa.
- Uso: contextualizar el expediente y comprobar los requisitos aplicables.

El sistema deberá distinguir entre información declarada por el estudiante
e información documentalmente verificada.

## 2.2. Expediente académico

### academic_record

Conjunto de datos académicos relevantes para el proceso de decisión.

- Fuente: estudiante y, cuando exista, documentación académica.
- Naturaleza: declarada o verificada.
- Alcance: formación previa.
- Uso:
  - contextualizar el rendimiento académico;
  - obtener las calificaciones necesarias para los cálculos de acceso;
  - relacionar materias previas con contenidos de las titulaciones;
  - identificar datos ausentes o pendientes de verificar.

No se asumirá que todos los estudiantes disponen del mismo tipo de expediente.

### subject_grades

Calificaciones obtenidas en las materias o módulos cursados.

Cada registro deberá identificar, cuando la información esté disponible:

- materia o módulo;
- calificación;
- escala de calificación;
- etapa educativa;
- curso académico;
- estado de la calificación;
- origen del dato.

- Fuente: expediente académico o estudiante.
- Naturaleza: objetiva, declarada o verificada según su procedencia.
- Alcance: materia o módulo concreto.
- Uso:
  - contextualizar el rendimiento en áreas relacionadas con una titulación;
  - utilizar las calificaciones que correspondan en los cálculos de acceso;
  - evitar comparar directamente calificaciones de escalas incompatibles.

No se asignará una calificación a una materia si el estudiante no la ha
proporcionado o no existe una fuente que la respalde.

### overall_grade

Calificación global o media del expediente, cuando corresponda.

- Fuente: expediente académico o cálculo definido por el procedimiento aplicable.
- Naturaleza: verificada, declarada o calculada.
- Alcance: expediente.
- Uso: aportar contexto académico y servir de entrada a los cálculos de acceso
  cuando proceda.

Debe registrarse su origen y método de cálculo. No se calculará una media
genérica si se desconocen las reglas necesarias para obtenerla.

### access_grade

Nota de acceso a la universidad, cuando corresponda a la vía del estudiante.

- Fuente: documentación académica o cálculo conforme al procedimiento aplicable.
- Naturaleza: verificada o calculada.
- Alcance: proceso de acceso.
- Uso: comprobar condiciones de acceso cuando el dato y el procedimiento
  correspondiente estén disponibles.

No debe confundirse con la nota de admisión ni con la nota de corte.

### admission_grade

Nota de admisión calculada conforme al procedimiento aplicable a la vía
de acceso y a la titulación considerada, cuando corresponda.

- Fuente: datos académicos y reglas oficiales de admisión aplicables.
- Naturaleza: calculada o verificada.
- Alcance: estudiante y proceso de admisión.
- Uso: comparar la nota del estudiante con los requisitos o referencias
  de admisión pertinentes.

El cálculo deberá documentar las materias, ponderaciones, reglas y curso
académico utilizados. No se calculará si faltan datos esenciales.

---

## 2.3. Intereses y preferencias

### academic_interests

Áreas de conocimiento que interesan al estudiante.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: preferencias personales.
- Uso: comparar los intereses del estudiante con los contenidos y áreas
  académicas de las titulaciones.

Ejemplos iniciales:

- informática y desarrollo de software;
- inteligencia artificial y ciencia de datos;
- salud;
- ciencias experimentales;
- ingeniería;
- economía y empresa;
- ciencias sociales;
- humanidades;
- arte y diseño.

Las áreas y sus identificadores deberán definirse mediante un vocabulario
controlado y ampliable.

### professional_interests

Áreas profesionales en las que el estudiante estaría interesado en trabajar.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: preferencias personales.
- Uso: comparar los objetivos profesionales con las competencias y salidas
  profesionales asociadas a las titulaciones.

### preference_weights

Importancia relativa que el estudiante asigna a los criterios de comparación.

- Fuente: estudiante.
- Naturaleza: declarada.
- Alcance: proceso de decisión.
- Uso: configurar la comparación de alternativas.

Los pesos deberán validarse y normalizarse según el método de decisión que
se implemente. Un criterio sin preferencia declarada no deberá recibir
automáticamente una interpretación que el estudiante no haya confirmado.

---

# 3. Variables de las alternativas

## 3.1. Identificación de la oferta

### university_id

Identificador de la universidad que imparte la titulación.

- Fuente: catálogo compartido del proyecto.
- Naturaleza: objetiva.
- Alcance: universidad.
- Uso: identificar la institución y relacionarla con sus características.

### degree_id

Identificador de la titulación universitaria.

- Fuente: catálogo compartido del proyecto.
- Naturaleza: objetiva.
- Alcance: titulación.
- Uso: identificar el grado y relacionarlo con sus contenidos y competencias.

### offering_id

Identificador de la oferta concreta de una titulación en una institución,
centro o campus.

- Fuente: catálogo compartido del proyecto.
- Naturaleza: objetiva.
- Alcance: oferta académica.
- Uso:
  - distinguir ofertas de una misma titulación;
  - relacionar la alternativa con sus condiciones de admisión;
  - recuperar los datos académicos asociados.

Se reutilizará la entidad compartida DegreeOffering, sin crear una alternativa
duplicada dentro de este módulo.

### academic_year

Curso académico al que corresponden los datos de la oferta y sus condiciones.

- Fuente: catálogo o fuente oficial.
- Naturaleza: objetiva.
- Alcance: oferta académica.
- Uso: evitar comparar condiciones de cursos académicos diferentes como si
  fueran necesariamente equivalentes.

## 3.2. Condiciones de admisión

### admission_requirements

Requisitos aplicables al acceso o admisión en una oferta.

- Fuente: documentación oficial de la universidad o del procedimiento de acceso.
- Naturaleza: objetiva, con estado de verificación.
- Alcance: oferta y curso académico.
- Uso: comprobar qué condiciones debe cumplir el estudiante.

Cada requisito deberá identificar su fuente, vigencia y estado de verificación
cuando estos datos estén disponibles.

### previous_cutoff_grade

Nota de corte publicada para un curso académico anterior, cuando exista.

- Fuente: fuente oficial o fuente identificada.
- Naturaleza: dato histórico.
- Alcance: oferta y curso académico.
- Uso: aportar una referencia orientativa para analizar la competitividad
  de acceso.

No representa una garantía de admisión ni debe utilizarse automáticamente
como un requisito obligatorio para cursos futuros.

### available_places

Número de plazas ofertadas, cuando exista información fiable.

- Fuente: fuente oficial.
- Naturaleza: objetiva.
- Alcance: oferta y curso académico.
- Uso: contextualizar las condiciones de acceso.

La ausencia de este dato no debe interpretarse como ausencia de plazas.

## 3.3. Características para la comparación

### study_plan

Plan de estudios asociado a la titulación u oferta, utilizando las entidades
compartidas que correspondan.

- Fuente: catálogo académico.
- Naturaleza: objetiva, sujeta a vigencia.
- Alcance: titulación y plan de estudios.
- Uso: identificar materias, contenidos y competencias relevantes para el
  estudiante.

### location

Ubicación de la universidad, centro o campus donde se imparte la oferta.

- Fuente: catálogo compartido.
- Naturaleza: objetiva.
- Alcance: centro o campus.
- Uso: analizar la distancia y la adecuación geográfica a las preferencias
  del estudiante.

### tuition_cost

Coste de matrícula asociado a la oferta y al curso académico, cuando esté
disponible.

- Fuente: fuente oficial o fuente identificada.
- Naturaleza: objetiva o estimada según su procedencia.
- Alcance: oferta y curso académico.
- Uso: comparar alternativas según el presupuesto del estudiante.

Se distinguirá el coste oficial publicado de las estimaciones de gastos
adicionales, como alojamiento, transporte o manutención.

### teaching_language

Idioma o idiomas de impartición de la oferta, cuando estén documentados.

- Fuente: catálogo académico o fuente oficial.
- Naturaleza: objetiva.
- Alcance: oferta.
- Uso: comprobar requisitos lingüísticos y preferencias del estudiante.

---

# 4. Restricciones y viabilidad

## 4.1. hard_constraints

Condiciones obligatorias que una alternativa debe cumplir para considerarse
viable según la información disponible.

Ejemplos:

- requisitos oficiales de acceso;
- requisitos específicos de admisión;
- requisitos lingüísticos obligatorios;
- restricciones personales que el estudiante haya marcado expresamente
  como innegociables.

Las restricciones deberán evaluarse antes de interpretar la puntuación
multicriterio como una comparación entre alternativas viables.

## 4.2. soft_constraints

Preferencias que pueden influir en la comparación, pero que el estudiante
está dispuesto a flexibilizar.

Ejemplos:

- distancia preferida respecto al domicilio;
- presupuesto deseado cuando no sea un límite obligatorio;
- preferencia por una ciudad;
- preferencia por un idioma o modalidad;
- preferencia por determinadas características del entorno universitario.

Una preferencia no debe convertirse automáticamente en una condición
obligatoria.

## 4.3. feasibility_status

Estado de viabilidad de una alternativa para un estudiante.

Estados conceptuales iniciales:

- viable: los requisitos comprobados se cumplen;
- no_viable: existe al menos una restricción obligatoria incumplida
  y suficientemente verificada;
- pending_verification: faltan datos o verificaciones necesarias;
- insufficient_data: no existe información suficiente para evaluar
  la alternativa.

Estos estados describen el comportamiento esperado del módulo. La
representación definitiva en código deberá seguir las convenciones del
proyecto.

No se declarará una alternativa no viable únicamente porque falte un dato.
Tampoco se declarará viable si quedan requisitos obligatorios sin comprobar.

---

# 5. Variables derivadas y resultados

## 5.1. academic_affinity

Indicador calculado de la relación entre el historial académico del estudiante
y las áreas de conocimiento relevantes para una titulación.

- Fuente: calificaciones disponibles y relación documentada entre materias
  y áreas académicas.
- Naturaleza: calculada.
- Alcance: estudiante y titulación.
- Uso: aportar contexto a la comparación.

El cálculo deberá documentarse y no deberá interpretarse como una medida
definitiva de la capacidad futura del estudiante.

## 5.2. interest_alignment

Indicador calculado de la correspondencia entre los intereses declarados
por el estudiante y los contenidos de una titulación.

- Fuente: intereses declarados y datos documentados de la titulación.
- Naturaleza: calculada.
- Alcance: estudiante y titulación.
- Uso: explicar la afinidad entre preferencias personales y alternativa.

Si faltan intereses o información curricular relevante, deberá indicarse
la limitación del resultado.

## 5.3. admission_comparison

Resultado de comparar la información académica del estudiante con las
condiciones o referencias de admisión aplicables.

- Fuente: expediente, reglas oficiales y datos de admisión disponibles.
- Naturaleza: calculada.
- Alcance: estudiante, oferta y curso académico.
- Uso: informar sobre la situación de acceso conocida.

La comparación con una nota de corte histórica deberá presentarse como
orientativa, no como predicción garantizada de admisión.

## 5.4. criterion_scores

Resultados individuales de una alternativa para cada criterio de comparación.

- Fuente: datos de la alternativa, datos del estudiante y reglas de evaluación.
- Naturaleza: calculada.
- Alcance: estudiante, alternativa y criterio.
- Uso: explicar fortalezas, debilidades y compromisos entre alternativas.

Cada resultado deberá permitir identificar los datos utilizados y las
limitaciones relevantes.

## 5.5. overall_comparison

Resultado agregado de la comparación multicriterio, si el método implementado
requiere agregar las puntuaciones individuales.

- Fuente: criterion_scores y preference_weights.
- Naturaleza: calculada.
- Alcance: proceso de decisión.
- Uso: facilitar la comparación de alternativas según las prioridades
  declaradas por el estudiante.

No sustituirá el estado de viabilidad ni ocultará los resultados individuales.
El método de agregación deberá quedar documentado y ser consistente con
las reglas del proyecto.

---

# 6. Calidad, procedencia e incertidumbre de los datos

Los datos relevantes deberán distinguir, según corresponda, entre:

- declarados por el estudiante;
- verificados mediante documentación;
- obtenidos de una fuente oficial;
- obtenidos de otra fuente identificada;
- estimados;
- calculados por el sistema.

Cuando sea pertinente, se registrarán la fuente, la fecha de consulta, el
curso académico y el estado de verificación.

La ausencia de información deberá representarse explícitamente. No se
sustituirán automáticamente datos desconocidos por cero ni se interpretarán
como incumplimiento de una restricción.

Los datos históricos, las estimaciones y los resultados calculados deberán
distinguirse de los requisitos oficiales vigentes.

---

# 7. Principios de implementación

- Reutilizar las entidades y los contratos compartidos del proyecto.
- No conectar el motor de decisión directamente con la base de datos.
- Obtener los datos mediante los contratos API establecidos.
- Separar la evaluación de restricciones de la comparación multicriterio.
- Mantener trazabilidad sobre los datos y las reglas que producen cada resultado.
- Evitar presentar una puntuación agregada como única explicación de una decisión.
- Permitir que los resultados reflejen la incertidumbre y los datos ausentes.
