# Dockerfile — Bike PartPicker API (Express + Prisma)
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
RUN npm ci
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
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged user the node image already provides.
USER node

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
