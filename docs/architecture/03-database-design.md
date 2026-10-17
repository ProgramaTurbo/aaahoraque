# AAAhorAQue — Diseño de base de datos

Estado: diseño relacional inicial, pendiente de implementación.
Responsabilidad: arquitectura común del equipo A³.

Documento relacionado:
02-shared-domain-model.md

## 1. Tecnología

- Motor: PostgreSQL 17.
- ORM propuesto: Drizzle ORM.
- Migraciones: Drizzle Kit.
- Definición del esquema: TypeScript.
- Acceso a datos: servidor de Next.js.
- Motor de decisión: FastAPI.

FastAPI recibirá datos preparados mediante contratos API.
Inicialmente no accederá directamente a PostgreSQL.

La base de datos será única y compartida por los tres módulos.

## 2. Convenciones generales

- Nombres de tablas y columnas en snake_case.
- Identificadores internos UUID.
- Relaciones mediante claves foráneas.
- Restricciones de unicidad donde correspondan.
- Fechas de creación y actualización en las entidades relevantes.
- Los identificadores externos no sustituyen los UUID internos.
- Las migraciones se versionarán en Git.
- No se realizarán cambios manuales no documentados al esquema.
- Los datos sintéticos se identificarán como tales.
- Los campos opcionales no deben inventarse cuando falten datos.

## 3. Identidad y perfil

### users

Identidad interna del usuario.

Campos principales:
- id: UUID, PK.
- email: identificador de acceso, nullable hasta definir autenticación.
- created_at.
- updated_at.

La integración concreta con el proveedor de autenticación
se decidirá antes de implementar esta tabla.

### student_profiles

Perfil general del estudiante.

Campos:
- id: UUID, PK.
- user_id: UUID, FK nullable a users.
- display_name: texto nullable.
- current_degree_offering_id: UUID nullable.
- current_study_plan_id: UUID nullable.
- general_preferences: JSONB.
- created_at.
- updated_at.

Las preferencias específicas de cada decisión no sustituirán
al perfil compartido.

### student_academic_records

Expediente del estudiante dentro de un plan.

Campos:
- id: UUID, PK.
- student_profile_id: UUID, FK.
- study_plan_id: UUID, FK.
- declared_earned_credits: numérico nullable.
- created_at.
- updated_at.

### student_subject_records

Estado de una asignatura en el expediente.

Campos:
- id: UUID, PK.
- academic_record_id: UUID, FK.
- subject_id: UUID, FK.
- status: pending / enrolled / completed / failed / recognized.
- grade: numérico nullable.
- completed_at: fecha nullable.

El significado concreto de cada estado deberá documentarse.

## 4. Catálogo académico común

### universities

Campos:
- id: UUID, PK.
- official_name.
- country_code.
- city: nullable.
- official_code: nullable.
- website_url: nullable.
- source_url: nullable.
- created_at.
- updated_at.

### academic_centers

Campos:
- id: UUID, PK.
- university_id: UUID, FK.
- official_name.
- official_code: nullable.

Una universidad puede tener varios centros.

### degrees

Representa la titulación como concepto académico.

Campos:
- id: UUID, PK.
- name.
- academic_level.
- knowledge_area: nullable.
- description: nullable.

No representa por sí sola su impartición en una universidad.

### degree_offerings

Relaciona una titulación con su institución.

Campos:
- id: UUID, PK.
- degree_id: UUID, FK.
- university_id: UUID, FK.
- academic_center_id: UUID, FK nullable.
- modality: nullable.
- official_reference: nullable.
- source_url: nullable.

### study_plans

Versión concreta de un plan académico.

Campos:
- id: UUID, PK.
- degree_offering_id: UUID, FK.
- official_code: nullable.
- name.
- implementation_year: nullable.
- total_ects.
- status.
- source_url: nullable.

Una oferta puede disponer de varios planes.

### subjects

Asignaturas de un plan.

Campos:
- id: UUID, PK.
- study_plan_id: UUID, FK.
- official_code: nullable.
- name.
- ects.
- academic_year: nullable.
- semester: nullable.
- subject_type: nullable.
- competencies: JSONB.
- area_profile: JSONB.
- professional_profile: JSONB.
- learning_components: JSONB.
- estimated_difficulty: nullable.
- estimated_workload: nullable.
- metadata: JSONB.
- source_url: nullable.

Las propiedades oficiales y las estimaciones deberán distinguirse
mediante metadatos de procedencia.

La afinidad del estudiante NO se guardará como propiedad fija
de una asignatura.

### specializations

Campos:
- id: UUID, PK.
- study_plan_id: UUID, FK.
- name.
- description: nullable.
- requirements: JSONB.

### specialization_subjects

Relación N:M entre especializaciones y asignaturas.

Campos:
- specialization_id: UUID, FK.
- subject_id: UUID, FK.
- requirement_type: nullable.

Clave compuesta:
- specialization_id + subject_id.

Deberá garantizarse que la asignatura pertenezca al plan
correspondiente a la especialización.

### subject_requirements

Campos:
- id: UUID, PK.
- subject_id: UUID, FK.
- requirement_type.
- required_subject_id: UUID, FK nullable.
- required_credits: numérico nullable.
- description: nullable.
- metadata: JSONB.

El tipo determina los campos requeridos.

Ejemplos:
- subject.
- credits.
- other.

No se utilizará el nombre de una asignatura como clave foránea.

## 5. Movilidad

### mobility_agreements

Representa un convenio de movilidad.

Campos:
- id: UUID, PK.
- origin_university_id: UUID, FK.
- destination_university_id: UUID, FK.
- academic_year.
- program_type.
- available_places: nullable.
- status.
- source_url: nullable.
- conditions: JSONB.

### mobility_agreement_eligibility

Restricciones académicas de un convenio.

Campos:
- id: UUID, PK.
- agreement_id: UUID, FK.
- eligible_degree_offering_id: UUID, FK nullable.
- eligible_academic_center_id: UUID, FK nullable.
- academic_level: nullable.
- conditions: JSONB.

La existencia de una universidad en el catálogo no implica
que exista un acuerdo Erasmus disponible.

El modelo específico podrá ampliarse con los requisitos
funcionales del módulo de Ángela.

## 6. Sesiones de decisión

### decision_sessions

Campos:
- id: UUID, PK.
- student_profile_id: UUID, FK nullable.
- decision_type: degree / erasmus / subjects.
- status.
- context: JSONB.
- created_at.
- updated_at.

Las sesiones podrán existir sin usuario autenticado durante
el desarrollo inicial, utilizando identificadores de sesión.

### decision_evaluations

Representa una ejecución concreta del motor.

Campos:
- id: UUID, PK.
- decision_session_id: UUID, FK.
- input_snapshot: JSONB.
- result_snapshot: JSONB.
- engine_version.
- evaluated_at.

Los snapshots permiten conservar las alternativas, prioridades
y resultados utilizados en una evaluación concreta.

La persistencia de evaluaciones será una decisión explícita;
no será obligatorio almacenar cada movimiento de un slider.

## 7. Procedencia de datos

Los indicadores deberán distinguir:

- official: dato oficial.
- declared: dato declarado por el usuario.
- estimated: estimación documentada.
- derived: resultado calculado.

Para datos relevantes se conservará, cuando corresponda:

- source_type.
- source_url.
- source_date.
- methodology.
- updated_at.

No se atribuirá carácter oficial a una estimación.

## 8. Relaciones principales

University 1:N AcademicCenter.

Degree 1:N DegreeOffering.

University 1:N DegreeOffering.

DegreeOffering 1:N StudyPlan.

StudyPlan 1:N Subject.

StudyPlan 1:N Specialization.

Specialization N:M Subject mediante specialization_subjects.

Subject 1:N SubjectRequirement.

StudentProfile 1:N StudentAcademicRecord.

StudentAcademicRecord 1:N StudentSubjectRecord.

StudentProfile 1:N DecisionSession.

DecisionSession 1:N DecisionEvaluation.

MobilityAgreement relaciona universidades y restricciones
de elegibilidad académica.

## 9. Separación de responsabilidades

La arquitectura común mantiene las entidades compartidas.

Alejandra desarrolla las particularidades de la decisión de carrera.

Ángela desarrolla las particularidades de la decisión Erasmus.

Alejandro desarrolla las particularidades de asignaturas
y especializaciones.

Los tres módulos reutilizan el catálogo y los identificadores.

Ningún módulo crea una segunda tabla de universidades,
titulaciones o perfiles académicos por su cuenta.

## 10. Implementación incremental

Primera migración:
- universities.
- academic_centers.
- degrees.
- degree_offerings.
- study_plans.
- subjects.

Segunda migración:
- specializations.
- specialization_subjects.
- subject_requirements.

Tercera migración:
- users.
- student_profiles.
- student_academic_records.
- student_subject_records.

Cuarta migración:
- mobility_agreements.
- mobility_agreement_eligibility.

Quinta migración:
- decision_sessions.
- decision_evaluations.

El orden podrá ajustarse según las dependencias reales,
pero cada migración deberá ser reproducible.

## 11. Decisiones todavía abiertas

Antes de implementar el esquema deberán confirmarse:

- Sistema de autenticación.
- Restricciones de unicidad de códigos oficiales por ámbito.
- Estrategia de importación y actualización del catálogo.
- Validación de perfiles JSONB.
- Alcance temporal de los acuerdos Erasmus.
- Política de persistencia y privacidad de las evaluaciones.
- Convenciones definitivas de los contratos API.

Este documento es el diseño inicial, no una declaración
de funcionalidades ya implementadas.
