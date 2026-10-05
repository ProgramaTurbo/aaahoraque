# AAAhorAQue

Sistema de Ayuda a la Toma de Decisiones para orientación académica universitaria.

Proyecto desarrollado por **Equipo A³**:

- Alejandro
- Alejandra
- Ángela

## Objetivo

AAAhorAQue pretende ayudar a estudiantes a analizar distintas alternativas
universitarias teniendo en cuenta múltiples dimensiones:

- intereses;
- aptitudes;
- expediente académico;
- preferencias;
- restricciones personales;
- objetivos profesionales;
- características de los grados universitarios.

El sistema no pretende sustituir la decisión humana, sino proporcionar información,
comparaciones, escenarios y herramientas de análisis que ayuden al estudiante a
comprender mejor su decisión.

## Arquitectura

```text
Browser
   |
   v
Next.js + TypeScript
   |
   +------> PostgreSQL
   |
   v
FastAPI + Python
Decision Engine
