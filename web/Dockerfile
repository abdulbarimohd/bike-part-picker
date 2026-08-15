# web/Dockerfile — Bike PartPicker frontend (Next.js App Router)

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ------------------------------------------------------------
# Build stage
# ------------------------------------------------------------
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD
# time, not read at runtime — so this has to be baked in here, and
# it must be the URL the *browser* can reach (localhost:4000), not
# the compose-internal hostname (api:4000). The browser resolves
# this, not the container.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ------------------------------------------------------------
# Runtime stage — standalone output only
# ------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node

EXPOSE 3000
CMD ["node", "server.js"]
