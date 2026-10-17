# AAAhorAQue — Modelo de dominio compartido

Estado: contrato conceptual inicial.
Responsabilidad: arquitectura común del equipo A³.

Este documento establece las entidades y conceptos reutilizables
por los tres módulos de decisión.

No representa todavía el esquema SQL definitivo.

## 1. Principios

1. Una entidad compartida tiene una única definición.
2. Los módulos utilizan identificadores comunes.
3. El catálogo académico se separa del perfil del estudiante.
4. La información persistente se separa de los resultados calculados.
5. Los datos oficiales, declarados y estimados deben distinguirse.
6. Una restricción no debe confundirse con un criterio de evaluación.
7. Los módulos pueden ampliar el dominio sin duplicar entidades comunes.

## 2. Identificadores

Todas las entidades persistentes tendrán un identificador interno
único y estable.

Los códigos oficiales, nombres y etiquetas no sustituirán al ID interno.

Ejemplos:

- Una universidad puede tener un identificador interno y un código oficial.
- Una asignatura puede compartir nombre con otra asignatura de otro plan.
- Una titulación puede ofrecerse en diferentes instituciones.
- Un plan puede disponer de diferentes versiones.

Los identificadores definitivos y sus tipos se concretarán en el
diseño de la base de datos.

Los IDs de los actuales JSON sintéticos son identificadores de
desarrollo y no deben considerarse claves definitivas del catálogo.

## 3. Entidades comunes

### User

Representa la cuenta de acceso a la aplicación.

Información conceptual:

- Identificador interno.
- Identidad de acceso.
- Fecha de creación.

No contiene directamente todos los intereses ni las decisiones.

### StudentProfile

Representa el perfil general del estudiante.

Información conceptual:

- Identificador.
- Usuario asociado, cuando exista.
- Contexto académico.
- Intereses generales.
- Preferencias declaradas.

Los módulos podrán ampliar este perfil con información específica
de su decisión.

No se almacenará una recomendación universal dentro del perfil.

### University

Representa una institución universitaria.

Información conceptual:

- Identificador interno.
- Nombre oficial.
- País.
- Localización general.
- Códigos externos disponibles.
- Fuente de información.

Una universidad puede ofrecer distintas titulaciones y participar
en diferentes acuerdos de movilidad.

### AcademicCenter

Representa una facultad, escuela o centro académico.

Puede pertenecer a una universidad y ofrecer varias titulaciones.

Su utilización dependerá de la información disponible en las fuentes.

### Degree

Representa el concepto de titulación universitaria.

Información conceptual:

- Identificador interno.
- Denominación.
- Nivel académico.
- Área o rama de conocimiento.
- Descripción.

No debe confundirse con la oferta de una titulación concreta
por parte de una universidad.

### DegreeOffering

Relaciona una titulación con la universidad que la imparte y,
cuando corresponda, con un centro académico.

Permite representar una misma titulación ofrecida por varias
instituciones.

Información conceptual:

- Titulación.
- Universidad.
- Centro, cuando corresponda.
- Modalidad y condiciones de impartición, si están disponibles.
- Fuente.

### StudyPlan

Representa una versión concreta del plan de estudios de una oferta.

Información conceptual:

- Identificador.
- Oferta académica asociada.
- Código o referencia del plan.
- Año o periodo de implantación.
- Estado o vigencia.
- Créditos totales.

Una oferta puede tener varios planes a lo largo del tiempo.

### Subject

Representa una asignatura perteneciente a un plan de estudios.

Información conceptual:

- Identificador interno.
- Plan de estudios.
- Código oficial, cuando exista.
- Nombre.
- ECTS.
- Curso y periodo académico.
- Carácter de la asignatura.
- Competencias y características académicas disponibles.

Dos asignaturas con el mismo nombre no son necesariamente la misma
entidad académica.

### Specialization

Representa una mención, itinerario, rama o especialización de un
plan de estudios.

Se relaciona con las asignaturas que la integran y las condiciones
necesarias para completarla.

No todas las titulaciones tienen especializaciones.

### SubjectRequirement

Representa un requisito académico asociado a una asignatura.

Ejemplos:

- Haber superado otra asignatura.
- Disponer de un mínimo de créditos.
- Cumplir una condición académica adicional.

El incumplimiento de una restricción obligatoria determina la
inviabilidad de la alternativa en el contexto correspondiente.

### StudentAcademicRecord

Representa la situación académica de un estudiante dentro de un plan.

Información conceptual:

- Estudiante.
- Plan de estudios.
- Asignaturas y estados académicos.
- Créditos superados.

El historial académico no modifica el catálogo oficial.

## 4. Entidades relacionadas con movilidad

### MobilityAgreement

Representa un convenio o acuerdo de movilidad entre instituciones.

Puede disponer de restricciones de titulación, centro, nivel,
periodo académico, plazas o condiciones particulares.

No debe suponerse que todas las universidades del catálogo
son destinos Erasmus disponibles para cualquier estudiante.

### MobilityDestination

Representa una alternativa concreta de destino dentro de un
contexto de movilidad.

Reutiliza la entidad University, pero añade las condiciones
específicas necesarias para analizar esa alternativa.

Su modelo detallado corresponde al módulo Erasmus.

## 5. Entidades de decisión

### DecisionSession

Representa una decisión iniciada por un estudiante.

Información conceptual:

- Identificador.
- Tipo de decisión.
- Estudiante o perfil asociado.
- Alternativas consideradas.
- Contexto de la evaluación.
- Estado de la sesión.

Tipos iniciales:

- degree
- erasmus
- subjects

### DecisionPriorities

Representa la importancia relativa que el decisor asigna a los
criterios dentro de una sesión.

Cada módulo puede tener criterios específicos.

### DecisionResult

Representa el resultado de una evaluación concreta:

- Indicadores calculados.
- Comparación de alternativas.
- Restricciones aplicadas.
- Explicaciones.
- Escenario y prioridades utilizados.

Un resultado depende del contexto de evaluación.

No debe guardarse como una propiedad fija de una titulación,
universidad o asignatura.

## 6. Indicadores y procedencia de los datos

Se distinguen cuatro categorías:

OFFICIAL:
Información procedente de fuentes académicas u oficiales.

DECLARED:
Información introducida por el estudiante.

ESTIMATED:
Información estimada mediante una metodología identificable.

DERIVED:
Indicadores calculados a partir de otros datos.

Ejemplo:

- ECTS: dato académico oficial.
- Interés por programación: dato declarado.
- Carga de trabajo prevista: posible estimación.
- Afinidad con una asignatura: indicador derivado.

Los módulos deberán poder explicar la procedencia de los
indicadores relevantes.

## 7. Relaciones conceptuales

University 1:N AcademicCenter

Degree 1:N DegreeOffering

University 1:N DegreeOffering

AcademicCenter 1:N DegreeOffering, cuando aplique

DegreeOffering 1:N StudyPlan

StudyPlan 1:N Subject

StudyPlan 1:N Specialization

Specialization N:M Subject

Subject 1:N SubjectRequirement

StudentProfile 1:N StudentAcademicRecord

StudentProfile 1:N DecisionSession

DecisionSession 1:N DecisionResult

MobilityAgreement relaciona instituciones y condiciones de movilidad.

Las cardinalidades y tablas intermedias definitivas se concretarán
en el diseño relacional.

## 8. Responsabilidades por módulo

### Común

- Identidad y perfil general.
- Universidades y centros.
- Titulaciones y ofertas.
- Planes de estudios.
- Identificadores compartidos.
- Persistencia y contratos de integración.

### Degree Decision — Alejandra

- Criterios y restricciones para elegir titulación.
- Evaluación de alternativas académicas.
- Datos específicos de orientación vocacional.
- Explicabilidad y escenarios de esta decisión.

Reutiliza University, Degree y DegreeOffering.

### Erasmus Decision — Ángela

- Condiciones y alternativas de movilidad.
- Criterios específicos de destinos.
- Compatibilidad académica y restricciones Erasmus.
- Evaluación y explicación de alternativas.

Reutiliza University, StudentProfile y las entidades académicas
compartidas.

### Subjects Decision — Alejandro

- Comparación de asignaturas y especializaciones.
- Análisis multicriterio.
- Viabilidad académica.
- Sensibilidad y escenarios.
- Elección posterior de combinaciones de asignaturas.

Reutiliza StudyPlan, Subject, Specialization y
StudentAcademicRecord.

## 9. Reglas de evolución

1. No crear copias locales incompatibles de entidades comunes.
2. No modificar los contratos compartidos sin coordinación.
3. Los cambios de esquema deberán realizarse mediante migraciones.
4. Los algoritmos específicos permanecerán separados por módulo.
5. El motor de decisión no dependerá directamente de la estructura
   física de las tablas PostgreSQL.
6. Los datos sintéticos deberán identificarse como tales.
7. Las fuentes oficiales deberán quedar documentadas.
8. Ningún resultado multicriterio debe presentarse automáticamente
   como una decisión obligatoria.

## 10. Aspectos pendientes

Este contrato se concretará posteriormente mediante:

- Diagrama entidad-relación.
- Tipos de identificadores.
- Claves primarias y foráneas.
- Restricciones de integridad.
- Modelo de indicadores extensibles.
- Migraciones iniciales.
- Contratos API compartidos.
- Estrategia de importación del catálogo académico.
