# Build My Bike

A PCPartPicker-style build tool for mountain bikes: pick a frame, fork,
drivetrain and wheels, and incompatible parts are filtered out of the
lists entirely rather than flagged after the fact.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for architecture and the
reasoning behind the schema and compatibility engine.

| Service  | Port | What it is                          |
| -------- | ---- | ----------------------------------- |
| `web`    | 3000 | Next.js frontend (App Router)       |
| `api`    | 4000 | Express + Prisma API                |
| `db`     | 5432 | PostgreSQL 17                       |

## Prerequisites

- **Docker Desktop** (needs WSL2 on Windows: `wsl --install`, then reboot)
- **Node 20+** — only needed for running the app outside containers

## First-time setup

```bash
cp .env.example .env     # then edit: set POSTGRES_PASSWORD and JWT_SECRET
docker compose up -d db  # start Postgres alone and wait for it to be healthy
```

Create the initial migration. This is a one-time developer action —
containers only ever *apply* migrations, never create them. `--user root`
is required because Docker Desktop presents Windows bind mounts as
`root:root`, so the image's unprivileged `node` user can't write the
generated migration back out to the host:

```bash
docker compose run --rm --user root --entrypoint sh -v "$(pwd)/prisma:/app/prisma" api -c "npx prisma migrate dev --name init"
```

Then load the 26 seeded parts. The seed runs from the image's `build`
stage, not the runtime image — `tsx` is a devDependency, so it's
deliberately absent from the lean production image:

```bash
docker build --target build -t build-my-bike-seed .
```

```bash
docker run --rm --network bike-partpicker_default --env-file .env -e DATABASE_URL="postgresql://bikepp:$POSTGRES_PASSWORD@db:5432/bikepp" build-my-bike-seed npx tsx prisma/seed.ts
```

<!-- The `--network bike-partpicker_default` above is intentionally left
     as-is: Docker Compose derives it from this project's folder name on
     disk (still `bike-partpicker`), not from the app's brand name. If
     you ever rename the folder too, update this to match. -->

## Running everything

```bash
docker compose up --build
```

Open http://localhost:3000. The API applies any pending migrations on
startup (see `docker-entrypoint.sh`) before serving traffic.

## Day-to-day development

Containers are for deployment; for feature work, run Postgres in Docker
and the two apps natively so you keep hot reload:

```bash
docker compose up -d db
```

```bash
npm install && npm run dev
```

```bash
cd web && npm run dev
```

## Schema changes

Edit `prisma/schema.prisma`, then create a migration from the host:

```bash
npm run migrate -- --name describe_your_change
```

Commit the generated folder in `prisma/migrations/`. Deployments pick it
up automatically via `prisma migrate deploy` on the next container start.

## Things that will bite you

- **`NEXT_PUBLIC_API_URL` is baked in at build time**, not read at
  runtime — it's inlined into the browser bundle by `next build`. It must
  be a URL the *browser* can reach (`http://localhost:4000`), never the
  compose-internal hostname (`http://api:4000`), because the browser
  resolves it, not the container. Changing it requires a rebuild, not a
  restart.
- **`prisma` is a runtime dependency, not a dev one.** That's deliberate:
  the entrypoint needs its CLI to run `migrate deploy` in production.
- **The API refuses to boot without `JWT_SECRET`.** That's also
  deliberate — see `src/middleware/auth.middleware.ts`. It fails loudly
  rather than silently signing forgeable tokens.
- **`dev-server/` is not part of this stack.** It's a throwaway in-memory
  mock API built to preview the frontend before Postgres was available.
  Once the real stack runs, it should be deleted.
