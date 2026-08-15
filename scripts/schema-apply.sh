#!/bin/sh
set -e
# Runs a schema migration and rebuilds the containers that need the
# regenerated Prisma Client, in one step. See docker-entrypoint.sh for why
# a rebuild -- not just a restart -- is required after any schema change.
#
# A single package.json script chaining `prisma migrate dev && docker
# compose up ...` looks equivalent but isn't: `npm run X -- --name Y`
# appends "--name Y" to the END of the whole chained command, so it lands on
# `docker compose up` instead of `prisma migrate dev`, which then hangs
# waiting on stdin for a migration name that never arrives. Splitting into
# a real script with its own positional argument avoids that.
NAME="${1:?usage: npm run schema:apply -- <migration_name>}"
npx prisma migrate dev --name "$NAME"
docker compose up -d --build api web
