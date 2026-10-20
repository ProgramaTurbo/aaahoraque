
FROM node:24-bookworm-slim

WORKDIR /workspace

RUN npm install -g pnpm@11.21.0

COPY . .

RUN pnpm install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1

# URL ficticia exclusiva para evaluar las rutas durante next build.
# La contraseña real nunca entra en la imagen.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm --filter web build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", "3000"]

