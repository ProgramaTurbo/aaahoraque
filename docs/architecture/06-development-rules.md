# AAAhoraQue — Normas de desarrollo y colaboración

Estado: contrato inicial del equipo A³.

## 1. Objetivo

Permitir el desarrollo paralelo de los tres módulos de decisión,
garantizando que sus resultados puedan integrarse en una única
aplicación sin duplicar infraestructura ni generar incompatibilidades.

## 2. Organización del repositorio

apps/web/
Aplicación Next.js, interfaces, rutas API y persistencia.

services/decision-engine/
Motor de decisión FastAPI y algoritmos específicos.

data/
Conjuntos de datos de desarrollo e importaciones documentadas.

docs/architecture/
Arquitectura y contratos compartidos.

docs/decisions/
Documentación específica de decisiones.

examples/
Ejemplos reproducibles de entradas y resultados.

## 3. Responsabilidades

### Arquitectura común — Alejandro

- Modelado de entidades compartidas.
- Infraestructura de base de datos.
- Migraciones.
- Contratos globales.
- Capa de consultas reutilizable.
- Estructura compartida del frontend.
- Coordinación de integraciones.

### Degree Decision — Alejandra

- Diseño funcional de la decisión sobre qué estudiar.
- Criterios y restricciones específicos.
- Modelos de entrada y salida de su motor.
- Algoritmos de orientación académica.
- Explicaciones, comparación y escenarios.
- Interfaz específica del módulo.

### Erasmus Decision — Ángela

- Diseño funcional de la decisión sobre movilidad.
- Criterios y restricciones específicos.
- Compatibilidad académica de destinos.
- Modelos y algoritmos de su motor.
- Explicaciones, comparación y escenarios.
- Interfaz específica del módulo.

### Subjects Decision — Alejandro

- Motor de asignaturas y especializaciones.
- Criterios multicriterio específicos.
- Elegibilidad académica.
- Comparación, sensibilidad y escenarios.
- Integración con el catálogo compartido.
- Interfaz específica del módulo.

## 4. Propiedad de los componentes comunes

Requieren coordinación previa:

- Esquema compartido de Drizzle.
- Migraciones PostgreSQL.
- Identificadores y entidades globales.
- Contratos API comunes.
- Perfil general del estudiante.
- Componentes visuales compartidos.
- Configuración raíz del monorepo.
- Dependencias globales e infraestructura Docker.

Los integrantes pueden proponer cambios mediante una explicación
del problema y de las entidades o módulos afectados.

No deben realizar modificaciones incompatibles unilateralmente.

## 5. Desarrollo modular

Cada módulo debe mantener separadas sus particularidades.

Backend:

services/decision-engine/app/modules/subjects/
services/decision-engine/app/modules/degrees/
services/decision-engine/app/modules/erasmus/

Las dos últimas ubicaciones son destinos previstos.
Su documentación no implica que ya estén implementadas.

Frontend específico:

apps/web/src/features/subjects/
apps/web/src/features/degrees/
apps/web/src/features/erasmus/

No se debe copiar el esquema común ni crear una conexión
PostgreSQL distinta para cada módulo.

## 6. Git

main:
Rama estable e integrada.

feature/shared-foundation:
Desarrollo de infraestructura común.

Cada integrante utiliza una rama para sus funcionalidades.

Ejemplos de nombres:

feature/degrees-decision
feature/erasmus-decision
feature/subjects-interface

No trabajar directamente sobre main.

No utilizar git push --force sobre ramas compartidas.

No realizar merges sin revisar el estado de las ramas.

Antes de comenzar:

git branch --show-current
git status -sb

Antes de publicar:

- Revisar los archivos modificados.
- Verificar que no se incluyen secretos.
- Ejecutar las comprobaciones adecuadas.
- Crear un commit descriptivo.
- Publicar la rama.
- Integrar mediante Pull Request.

## 7. Dependencias

Existe un único workspace pnpm en la raíz del repositorio.

Instalar dependencias del frontend desde la raíz:

pnpm --filter web add nombre-paquete

No crear nuevos lockfiles ni workspaces dentro de apps/web.

No cambiar de ORM, framework o gestor de paquetes sin acuerdo.

## 8. Migraciones

El esquema PostgreSQL compartido está gestionado con Drizzle.

Toda modificación estructural deberá reflejarse en una
migración versionada.

Las migraciones deben revisarse antes de aplicarlas.

No utilizar drizzle-kit push como sustituto de las migraciones
versionadas de un entorno compartido.

No borrar datos ni recrear bases existentes sin autorización.

## 9. Calidad funcional

Los resultados de decisión deben poder explicarse.

Los datos sintéticos y estimados deben identificarse.

Los criterios de evaluación deben diferenciarse de las
restricciones obligatorias.

Los resultados multicriterio dependen del perfil, contexto,
alternativas y prioridades utilizados.

No almacenar una compatibilidad individual como propiedad
universal de una asignatura, universidad o titulación.

Cada integrante comprobará manualmente sus funcionalidades
con entradas y resultados verificables.

## 10. Estado del proyecto

La documentación arquitectónica puede describir entidades
o capacidades todavía pendientes.

Antes de desarrollar, comprobar la implementación real.

No afirmar que una API, tabla, pantalla o funcionalidad existe
si únicamente aparece en un documento de diseño.

## 11. Integración

Cada módulo debe proporcionar:

- Descripción de su funcionalidad.
- Entradas necesarias.
- Criterios y restricciones utilizados.
- Formato de resultados.
- Dependencias comunes que reutiliza.
- Instrucciones para ejecutar y verificar su módulo.
- Necesidades de integración pendientes.

Los cambios en interfaces compartidas requieren informar
al resto de integrantes antes de realizar la integración.

## 12. Prioridades del proyecto

Primero:
- Correctitud del sistema de decisión.
- Reutilización.
- Explicabilidad.
- Integración.
- Demostración funcional.

Después:
- Ampliación del catálogo.
- Mejoras de experiencia de usuario.
- Automatización y funcionalidades adicionales.

Evitar complejidad innecesaria para el alcance académico.
