# AAAhoraQue — Contratos API compartidos

Estado: versión inicial.
Responsabilidad: arquitectura común del equipo A³.

## 1. Principios de integración

- Los tres módulos reutilizan el catálogo académico común.
- Next.js gestiona las rutas API y el acceso a PostgreSQL.
- Drizzle ORM centraliza las operaciones de persistencia.
- FastAPI ejecuta los algoritmos de ayuda a la decisión.
- El navegador nunca se conecta directamente a PostgreSQL.
- Los módulos no deben duplicar entidades académicas compartidas.
- Los endpoints documentados como pendientes no deben suponerse disponibles.

Los identificadores internos del catálogo son UUID.

Los códigos académicos oficiales y los nombres no sustituyen
a los identificadores internos.

## 2. Convención general de respuestas

Los endpoints actuales del catálogo utilizan esta envoltura:

{
  "status": "ok",
  "count": 0,
  "data": []
}

status: indica el resultado de la operación.

count: representa el número de elementos del array data.
Su significado concreto depende del endpoint.

data: contiene los resultados solicitados.

No debe interpretarse count como el número total de registros
de la base de datos ni como un contador de paginación.

## 3. Catálogo relacional plano

GET /api/catalog/offerings

Estado: IMPLEMENTADO.

Devuelve una fila por cada combinación de oferta,
plan y asignatura obtenida mediante la consulta relacional.

Campos:

- offeringId
- modality
- universityId
- universityName
- centerId
- centerName
- degreeId
- degreeName
- academicLevel
- planId
- planName
- planCode
- totalEcts
- subjectId
- subjectName
- subjectCode
- subjectEcts

Las propiedades procedentes de relaciones opcionales pueden
contener null.

Los valores numeric de PostgreSQL llegan como cadenas decimales
en esta respuesta.

Actualmente count representa el número de filas relacionales,
NO el número de titulaciones diferentes.

Este endpoint se conserva para desarrollo y compatibilidad.

Implementación:
apps/web/src/app/api/catalog/offerings/route.ts

Consulta reutilizable:
apps/web/src/lib/catalog/queries.ts

## 4. Catálogo jerárquico

GET /api/catalog/offerings/structured

Estado: IMPLEMENTADO Y VALIDADO.

Organiza las filas relacionales en ofertas académicas,
evitando repetir universidades, titulaciones y planes.

Ejemplo abreviado de respuesta:

{
  "status": "ok",
  "count": 1,
  "data": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "modality": "on_site",
      "university": {
        "id": "10000000-0000-4000-8000-000000000001",
        "name": "Universidad Demo AAAhoraQue"
      },
      "center": {
        "id": "20000000-0000-4000-8000-000000000001",
        "name": "Escuela Demo de Ingeniería"
      },
      "degree": {
        "id": "30000000-0000-4000-8000-000000000001",
        "name": "Grado Demo en Ingeniería Informática",
        "academicLevel": "bachelor"
      },
      "plans": [
        {
          "id": "50000000-0000-4000-8000-000000000001",
          "code": "DEMO-2026",
          "name": "Plan de estudios de demostración 2026",
          "totalEcts": 240,
          "subjects": [
            {
              "id": "60000000-0000-4000-8000-000000000001",
              "code": "DEMO-IA",
              "name": "Inteligencia Artificial",
              "ects": 6
            }
          ]
        }
      ]
    }
  ]
}

Este ejemplo está abreviado. La base DEMO contiene tres asignaturas.

Los ECTS se convierten a number en esta representación.

center puede ser null.

Una oferta puede tener un array plans vacío.

Un plan puede tener un array subjects vacío.

count representa el número de ofertas académicas distintas
incluidas en data.

Implementación:
apps/web/src/app/api/catalog/offerings/structured/route.ts

Servicio reutilizable:
apps/web/src/lib/catalog/structured.ts

Tipo TypeScript exportado:
CatalogOffering

## 5. Diagnóstico de base de datos

GET /api/health/db

Estado: IMPLEMENTADO.

Es una ruta de diagnóstico del entorno de desarrollo.
No forma parte de las funcionalidades académicas del estudiante.

## 6. Motor de decisión de asignaturas

El motor FastAPI tiene actualmente estas rutas:

GET /health

POST /subjects/analyze

POST /subjects/scenario

Sus modelos de entrada y salida se definen en:

services/decision-engine/app/modules/subjects/

La API del catálogo y el motor de asignaturas todavía no están
integrados de extremo a extremo: no debe suponerse que pasar
un UUID del catálogo basta para ejecutar automáticamente el análisis.

Los contratos compartidos para traducir entidades persistentes
a entradas del motor se definirán separadamente.

## 7. Endpoints previstos, todavía no implementados

Pendiente:

- Consulta individual de una universidad por UUID.
- Consulta individual de una oferta por UUID.
- Consulta de planes de una oferta.
- Consulta de asignaturas de un plan.
- Operaciones persistentes sobre perfiles de estudiantes.
- Sesiones y resultados de decisión.
- Integración del catálogo con FastAPI.

No utilizar estas rutas en código funcional hasta acordar
e implementar sus contratos.

## 8. Normas para los módulos

Alejandra:
reutilizar degrees, universities y degree_offerings.

Ángela:
reutilizar universities e identificadores académicos comunes.

Alejandro:
reutilizar study_plans, subjects y sus identificadores.

Los módulos pueden necesitar consultas específicas, pero deben
ampliar la capa común de catálogo en lugar de crear otra conexión
independiente o copiar sus entidades.

Los cambios en API compartidas deberán coordinarse para evitar
romper a los demás módulos.

## 9. Datos de demostración

El catálogo inicial procede de:

data/catalog/demo.sql

Contiene datos sintéticos, no información académica oficial.

Sus UUID son identificadores de desarrollo reproducibles.

No deben tratarse como códigos oficiales ni asumirse presentes
en entornos donde no se haya ejecutado el script DEMO.
