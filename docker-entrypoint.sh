#!/bin/sh
set -e

# Production migration workflow: apply any migrations committed in
# prisma/migrations, then hand off to the server. `migrate deploy`
# only ever applies existing migration files — it never generates
# or resets anything, which is what makes it safe to run on every
# container start (including multiple replicas: Prisma takes an
# advisory lock, so concurrent starts don't double-apply).
#
# Creating migrations is a developer action, done from the host
# with `npm run migrate -- --name <what_changed>`, never in here.
#
# IMPORTANT: `migrate deploy` applies migration FILES to the database; it
# does NOT regenerate the Prisma Client baked into this image (that only
# happens at `docker build`, via `npx prisma generate`). A schema change
# applied only by restarting containers leaves the API running a stale,
# incompatible client — this bit us once (basePricePence going nullable
# returned 500s until the api image was rebuilt, not just restarted). Use
# `npm run schema:apply` for any schema change: it runs the host migration
# and rebuilds the api/web images in one step, so this can't be forgotten.

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] starting: $@"
exec "$@"
