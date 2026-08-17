# Dockerfile — Build My Bike API (Express + Prisma)
#
# Debian slim rather than Alpine on purpose: `bcrypt` is a native
# module with prebuilt binaries for glibc but not musl, and Prisma
# needs OpenSSL present. Alpine works but only after installing a
# full build toolchain, which costs more image size than the Debian
# base saves.

FROM node:20-bookworm-slim AS base
# Prisma's query engine links against OpenSSL; the slim image omits it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ------------------------------------------------------------
# Build stage — full deps, generate Prisma client, compile TS
# ------------------------------------------------------------
FROM base AS build
COPY package.json package-lock.json ./
# --ignore-scripts: package.json's postinstall runs `prisma generate`,
# which needs the schema this layer doesn't have yet -- prisma/ is
# copied separately below on purpose, so this expensive install layer
# stays cached across schema-only changes. The explicit `prisma
# generate` two lines down covers what postinstall would have done.
RUN npm ci --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ------------------------------------------------------------
# Runtime stage — production deps only, compiled output
# ------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# `prisma` is a runtime dependency (not dev) so the entrypoint can
# run `prisma migrate deploy` before the server boots.
# --ignore-scripts: same reasoning as the build stage above -- the
# postinstall's `prisma generate` would run before prisma/ is copied.
RUN npm ci --omit=dev --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
# Read at runtime by src/compatibility/rulesCatalogue.ts (compiled into
# dist/compatibility/) to drive the compatibility rule-reference API --
# that module isn't copied in above, only its compiled output, so the
# source markdown it parses has to be added explicitly.
COPY COMPATIBILITY_RULES.md ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged user the node image already provides.
USER node

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
