# Modelo de variables — Asignaturas y especialización

## 1. Objetivo

Definir qué información utiliza el módulo de elección de asignaturas y
especializaciones, diferenciando claramente entre:

- datos del estudiante;
- datos de las alternativas;
- variables derivadas;
- restricciones.

El sistema no debe almacenar directamente una "compatibilidad" entre estudiante
y asignatura. Esa compatibilidad debe calcularse a partir de variables observables
o declaradas.

---

# 2. Variables del estudiante

## 2.1. Contexto académico

### degree_id

Grado que cursa actualmente el estudiante.

- Fuente: estudiante / sistema.
- Naturaleza: objetiva.
- Alcance: global.
- Uso: determina qué especializaciones y asignaturas pueden analizarse.

### university_id

Universidad en la que cursa el grado.

- Fuente: estudiante / sistema.
- Naturaleza: objetiva.
- Alcance: global.
- Uso: determina plan de estudios, asignaturas, ramas y restricciones concretas.

### current_year

Curso académico aproximado del estudiante.

- Fuente: estudiante.
- Naturaleza: objetiva.
- Alcance: global.
- Uso: contextualización y filtrado.

### completed_subjects

Asignaturas ya superadas.

- Fuente: estudiante / expediente.
- Naturaleza: objetiva.
- Alcance: específico académico.
- Uso:
  - comprobar prerrequisitos;
  - evitar recomendar asignaturas ya superadas;
  - analizar experiencia previa.

### subject_grades

Calificaciones obtenidas en asignaturas anteriores.

- Fuente: estudiante / expediente.
- Naturaleza: objetiva.
- Alcance: específico académico.
- Uso: calcular adecuación académica respecto a áreas relacionadas.

---

## 2.2. Intereses académicos

El estudiante puede mostrar interés por distintas áreas.

Ejemplos iniciales:

- inteligencia artificial;
- ciencia de datos;
- desarrollo software;
- ciberseguridad;
- sistemas;
- redes;
- hardware;
- interacción persona-ordenador;
- gestión;
- investigación.

Cada interés se representa inicialmente en escala 0-10.

Ejemplo:

```json
{
  "artificial_intelligence": 9,
  "cybersecurity": 7,
  "software_engineering": 6,
  "hardware": 2
}
