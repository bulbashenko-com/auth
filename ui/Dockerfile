# Next.js standalone server for auth.bulbashenko.com. Also carries the admin scripts (scripts/*.mjs), which run
# with `docker compose run` or as the one-shot `hydra-clients` service.
FROM node:24.21.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.21.0-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24.21.0-alpine AS runtime
LABEL org.opencontainers.image.title="auth.bulbashenko.com UI" \
      org.opencontainers.image.source="https://github.com/bulbashenko-com/auth" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "server.js"]
