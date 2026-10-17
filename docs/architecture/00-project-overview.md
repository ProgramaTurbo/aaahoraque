# AAAhorAQue — Visión general del proyecto

## 1. Propósito

AAAhorAQue es un Sistema de Ayuda a la Toma de Decisiones Académicas
desarrollado como proyecto universitario.

Su objetivo es ayudar al estudiante a explorar alternativas, identificar
criterios relevantes, reconocer restricciones y comprender las consecuencias
de sus decisiones.

El sistema orienta la decisión, pero no sustituye al estudiante como decisor.

## 2. Equipo y responsabilidades

Equipo A³:

- Alejandro: elección de asignaturas y especializaciones.
- Alejandra: elección de titulación universitaria.
- Ángela: elección de destino Erasmus.

Alejandro coordina inicialmente la arquitectura e infraestructura común.

Cada integrante es responsable de la lógica y el desarrollo específico
de su módulo.

## 3. Decisiones que abordará el sistema

### Qué estudiar

Permite explorar y comparar titulaciones atendiendo a intereses,
aptitudes, objetivos, preferencias y restricciones del estudiante.

### Dónde hacer Erasmus

Permite comparar destinos de movilidad considerando su compatibilidad
académica, características y condiciones de acceso.

### Qué asignaturas o especialización escoger

Permite comparar asignaturas y especializaciones, estudiar su
compatibilidad con el perfil del estudiante y comprobar restricciones
académicas.

## 4. Principios comunes

1. El sistema orienta, no impone una solución.
2. Se separan criterios de evaluación y restricciones.
3. Se diferencia información oficial, declarada, estimada y calculada.
4. Las alternativas deben poder compararse y sus resultados explicarse.
5. El estudiante puede modificar sus prioridades y explorar escenarios.
6. Las entidades académicas compartidas tienen una única definición.
7. Cada módulo reutiliza la infraestructura común.
8. Los cambios en contratos compartidos requieren coordinación.

## 5. Arquitectura tecnológica

El proyecto utiliza un monorepo con pnpm y Turborepo.

- Frontend: Next.js 16, React, TypeScript y Tailwind CSS.
- Motor de decisión: Python, FastAPI y Pydantic.
- Persistencia: PostgreSQL 17 mediante Docker.
- Control de versiones: Git y GitHub.

Next.js gestiona la aplicación y su acceso a datos.

FastAPI se encarga de los cálculos y algoritmos de decisión.

Los módulos comparten entidades académicas, pero pueden desarrollar
algoritmos específicos cuando el problema lo requiera.

## 6. Estado actual

El módulo de asignaturas dispone de una primera versión funcional
de su motor de decisión.

Se han implementado análisis multicriterio, ponderación, explicabilidad,
comparación, sensibilidad, escenarios y restricciones académicas básicas.

Se utilizan datos sintéticos de tres asignaturas para validar
el funcionamiento inicial.

La arquitectura común, el catálogo académico, la persistencia
de la aplicación y la experiencia visual completa siguen en desarrollo.

## 7. Criterio de integración

Las tres decisiones deben formar parte de una única aplicación.

Compartirán las entidades académicas, el perfil general del estudiante,
la infraestructura y las convenciones de desarrollo.

Cada módulo tendrá su propia lógica de decisión y sus preferencias
específicas cuando corresponda.

Ningún módulo debe crear representaciones paralelas incompatibles
de entidades que ya existen en la arquitectura común.
