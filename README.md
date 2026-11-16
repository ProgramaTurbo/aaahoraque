# AAAhoraQue

Sistema de Ayuda a la Toma de Decisiones para orientación académica universitaria.

Proyecto desarrollado por **Equipo A³**:

- Alejandro
- Alejandra
- Ángela

## Objetivo

AAAhoraQue pretende ayudar a estudiantes a analizar distintas alternativas
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
```

## Cuenta y perfil

Para activar el registro por correo, configura `BETTER_AUTH_URL`,
`BETTER_AUTH_SECRET`, `AUTH_SMTP_URL` y `AUTH_EMAIL_FROM` en el entorno de
Next.js. Genera un secreto con `openssl rand -base64 32`. En local, usa el
origen del navegador (por ejemplo, `http://localhost:3000`) y un buzón de
pruebas como Mailpit. En la MV, configura el origen público HTTPS y el SMTP
en `.env.vm.local` antes de levantar el servicio web. El catálogo y las demos
funcionan aunque las variables de cuenta estén vacías.

Aplica las migraciones de Drizzle con la conexión de administración adecuada
antes de activar las cuentas. En la MV, si `.env.vm.local` apunta a la BD
correcta y su rol tiene permisos de migración, el comando desde la raíz es:

```bash
DRIZZLE_ENV_FILE=../../.env.vm.local pnpm --filter web exec drizzle-kit migrate
```

La ruta de `DRIZZLE_ENV_FILE` se interpreta desde `apps/web`. Verifica
primero la migración en una base local. Los datos del expediente en
Asignaturas son declarados por el usuario. La importación desde el navegador
se ofrece en planes oficiales sin progreso guardado en la cuenta.
