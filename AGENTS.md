# AAAhoraQue — Instrucciones generales para agentes IA

Este documento establece las reglas comunes para cualquier agente IA
que participe en el desarrollo del proyecto.

Debe leerse antes de modificar código, modelos o infraestructura.

## 1. Contexto del proyecto

AAAhoraQue es un Sistema de Ayuda a la Toma de Decisiones Académicas.

Incluye tres módulos:

- Degree Decision: qué titulación estudiar (Alejandra).
- Erasmus Decision: dónde realizar una movilidad (Ángela).
- Subjects Decision: qué asignaturas o especialización escoger (Alejandro).

El sistema orienta mediante alternativas, criterios, restricciones,
comparaciones, explicaciones y escenarios.

No debe imponer automáticamente una decisión al estudiante.

## 2. Documentación obligatoria

Antes de desarrollar, consultar:

- docs/architecture/00-project-overview.md
- docs/architecture/02-shared-domain-model.md
- docs/architecture/03-database-design.md
- docs/architecture/04-api-contracts.md
- docs/architecture/06-development-rules.md

La documentación conceptual no implica que todas las entidades
o funcionalidades descritas estén ya implementadas.

Comprobar siempre el estado real del repositorio.

## 3. Arquitectura tecnológica

Monorepo: pnpm + Turborepo.

Frontend y capa de aplicación:
- Next.js 16.
- React.
- TypeScript.
- Tailwind CSS.

Persistencia:
- PostgreSQL 17.
- Drizzle ORM y Drizzle Kit.
- Acceso exclusivamente desde código de servidor.

Motor de decisión:
- Python.
- FastAPI.
- Pydantic.

El motor de decisión recibe información mediante contratos API.
No debe conectarse directamente a PostgreSQL sin una decisión
arquitectónica acordada.

## 4. Instrucciones específicas de Next.js

Para trabajar en apps/web:

Leer también apps/web/AGENTS.md.

Respetar las instrucciones específicas de Next.js 16 y consultar
su documentación local instalada antes de utilizar APIs o
convenciones que pudieran haber cambiado.

No sobrescribir ni eliminar las reglas generadas por Next.js.

## 5. Infraestructura compartida

Esquema:
apps/web/src/lib/db/schema/

Conexión:
apps/web/src/lib/db/index.ts

Consultas del catálogo:
apps/web/src/lib/catalog/

Endpoints del catálogo:
apps/web/src/app/api/catalog/

Migraciones:
apps/web/drizzle/

Motor de decisión:
services/decision-engine/app/modules/

El esquema compartido, las migraciones y los contratos globales
son responsabilidad de la arquitectura común.

Los módulos no deben crear sistemas paralelos para sustituirlos.

## 6. Reutilización de entidades

Reutilizar las entidades compartidas:

- University.
- AcademicCenter.
- Degree.
- DegreeOffering.
- StudyPlan.
- Subject.

El resto de las entidades descritas en el modelo conceptual
se incorporarán incrementalmente.

No asumir que una tabla existe solo porque esté documentada.

No identificar entidades únicamente por su nombre.

Utilizar los UUID internos del catálogo cuando corresponda.

## 7. Separación por módulos

Cada módulo puede implementar su propia lógica de decisión,
criterios, restricciones y explicaciones.

El código específico debe mantenerse separado por módulo.

Las modificaciones de componentes, tablas o contratos compartidos
deben proponerse y coordinarse antes de implementarse.

No modificar unilateralmente el trabajo de otro integrante.

## 8. Criterios para los sistemas de decisión

Distinguir siempre:

- Datos oficiales.
- Datos declarados.
- Datos estimados.
- Indicadores calculados.

Separar:

- Viabilidad y restricciones.
- Evaluación multicriterio.
- Preferencias y pesos.
- Explicabilidad.
- Escenarios y sensibilidad cuando correspondan.

No presentar un ranking como una decisión obligatoria.

No presentar datos sintéticos como información oficial.

## 9. Git y colaboración

Rama estable compartida: main.

Rama de infraestructura común: feature/shared-foundation.

Cada funcionalidad debe desarrollarse en su propia rama.

Antes de modificar:
- Confirmar la rama activa.
- Comprobar git status.
- Revisar el código existente.

No ejecutar comandos destructivos de Git sin autorización.
No utilizar force push sobre ramas compartidas.
No modificar main directamente.

Las integraciones se realizarán mediante Pull Requests revisadas.

## 10. Base de datos y seguridad

No añadir credenciales al repositorio.

No versionar archivos .env.local.

No modificar manualmente la estructura de PostgreSQL fuera
del procedimiento acordado de migraciones.

No ejecutar drizzle-kit push sobre una base compartida.

Las migraciones deben generarse y revisarse antes de aplicarse.

No eliminar volúmenes de Docker ni reinicializar bases de datos
sin autorización expresa.

## 11. Datos y APIs actuales

El catálogo inicial contiene datos sintéticos de desarrollo:

data/catalog/demo.sql

Endpoints implementados:

GET /api/health/db
GET /api/catalog/offerings
GET /api/catalog/offerings/structured

Consultar docs/architecture/04-api-contracts.md para sus contratos.

No inventar endpoints ni asumir que las entidades previstas
ya tienen operaciones CRUD implementadas.

## 12. Forma de trabajo esperada

Antes de implementar una tarea:

1. Inspeccionar los archivos relacionados.
2. Identificar qué componentes existentes pueden reutilizarse.
3. Respetar los contratos comunes.
4. Mantener los cambios dentro del módulo asignado.
5. Explicar cualquier necesidad de ampliar la arquitectura común.
6. Validar el funcionamiento real antes de afirmar que está terminado.

Priorizar una solución académica clara, funcional, explicable
y mantenible frente a complejidad tecnológica innecesaria.
