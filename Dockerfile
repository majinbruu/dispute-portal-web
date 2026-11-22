# Build stage: install exactly what the lock file pins and produce the static bundle.
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The development config.js must not ship: nginx generates /config.js from environment variables.
RUN npm run build && rm -f dist/config.js

# Runtime stage: unprivileged nginx (runs as UID 101, listens on 8080).
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

# The image's entrypoint runs envsubst over /etc/nginx/templates/*.template at start-up, writing
# the results to /etc/nginx/conf.d. Required: OIDC_AUTHORITY, OIDC_ORIGIN, OIDC_CLIENT_ID and
# API_UPSTREAM. nginx refuses to start if one is missing.
COPY nginx/default.conf.template nginx/security-headers.inc.template /etc/nginx/templates/
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
