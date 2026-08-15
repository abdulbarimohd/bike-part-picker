# Bike PartPicker — Project Context

Handoff summary for continuing this project in Claude Code. Written from a
claude.ai chat conversation where the architecture, engine, API, and a
frontend mock were built. Read this alongside the actual files — the code
itself has inline comments explaining most of these same decisions.

## What this project is

A self-hosted, PCPartPicker-style build tool for mountain bikes: pick a
frame, fork, bottom bracket, crankset, wheelset, tyres, and brakes, and get
live compatibility checking + lockout (incompatible parts don't just get
flagged — they don't appear in the list at all).

## Stack

- Frontend: Next.js (App Router), Tailwind CSS, Lucide icons
- Backend: Node.js + Express, TypeScript
- Database: PostgreSQL via Prisma ORM

## Architecture decisions

**Schema uses class-table inheritance.** One base `Part` table (brand, name,
price, weight, a `type` discriminator) with 1:1 child tables per category
(`Frame`, `Fork`, `BottomBracket`, `Crankset`, `Wheelset`, `Tyre`,
`BrakeCaliper`, `Shifter`, `RearDerailleur`), joined on a shared `partId`.
Every compatibility-relevant field is a closed Postgres enum — exact string
matching only, never fuzzy tolerance between "close" standards (e.g. Boost
148x12 and Super Boost 157x12 are NOT compatible despite both being
"Boost-era").

**`Price` is an append-only log**, not a single current-price column — one
row per (part, vendor, timestamp), so price history and "current price"
(= most recent row) are both free.

## The 103 compatibility rules

`COMPATIBILITY_RULES.md` is the catalogue — every part-to-part constraint
on a modern bike, grouped into 16 subsystems, each with its rule form,
required schema fields and severity. All 103 are implemented in
`src/compatibility/engine.ts`, with each function named for its rule ID.

Three things worth understanding before touching the engine:

1. **Severity decides lockout.** Only `critical` hides a part. `warning`
   and `info` leave it selectable. This is what stops adapter-resolvable
   pairings from silently vanishing — a warning can carry a `remedy`
   naming the exact adapter, spacer or end-cap kit needed.
2. **Missing data never guesses.** Fields a spec sheet may not publish are
   nullable, and the rule returns null. The one exception is tyre
   clearance, where an absent figure is important enough to warn about.
3. **Rider fit is advisory.** R-FIT-* only run when optional height /
   inseam / weight are set on the build, and never block. They compare a
   part against *you*, not against another part — the only rules that do,
   and the reason PCPartPicker has no equivalent.

### The original five rules (still the core)

1. **BB shell / spindle** — two separate links, not one: frame↔bottom
   bracket on shell standard (BSA_73, PF92, etc.), bottom bracket↔crankset
   on spindle interface (DUB_29, HOLLOWTECH_II_24, etc.)
2. **Brake mount** — checked independently for front (fork) and rear
   (frame), since they're frequently different mount standards
3. **Axle type** — front and rear checked independently against the
   wheelset's two hub specs
4. **Headset taper** — direct frame↔fork check
5. **Tyre clearance** — the most involved rule. First verifies the tyre's
   wheel diameter matches the wheelset (a 650b tyre can't seat on a 700c
   rim), THEN picks the correct clearance figure for that diameter (a
   frame's `maxTyreWidthMm` for 700c and `maxTyreWidthMm650b` for 650b are
   physically different numbers), and downgrades to a `warning` (not a
   block) when no clearance figure exists for that diameter at all.

Every rule function returns `null` (compatible) or a typed warning object
with `severity`, `title`, `message`, and `components` (which build slots are
at fault). The same rule functions power two layers:
- **Warnings** (`getCompatibilityWarnings`) — full list of problems in a build
- **Lockout/filter** (`filterCompatible*` functions, or the generic
  `isOptionCompatible` helper in the frontend mock) — narrows a candidate
  list down to only what would pass, used to keep incompatible parts out of
  dropdowns entirely rather than showing and flagging them

## Known simplifications

Three of the original four have since been resolved:

- ~~Brake caliper adapters~~ — **fixed.** R-BRK-03 is now a lookup:
  mount type + rotor size yields either "direct", "needs a +Nmm adapter"
  (warning, with the adapter named), or "impossible" when the rotor is
  smaller than the mount's native size. Post-mount calipers no longer
  need to match the frame's native size exactly.
- ~~Nominal tyre width~~ — **partly fixed.** R-TIR-03 gates width against
  the rim's ETRTO range, and R-TIR-09 estimates how much wider a tyre
  measures on a wide rim before comparing to frame clearance. Both use the
  standard ~1.4×–2.4× internal-width approximation rather than the full
  ETRTO table.
- ~~Tyre slots by insertion order~~ — **fixed.** `BuildPart.slot` names
  'front' / 'rear' explicitly, for tyres, tubes and rotors alike.
- **Anonymous build creation still isn't supported** — the schema requires
  a `userId` on every `Build`, so a user must register/log in before
  starting a build. Accepted as-is, not yet revisited.

Remaining approximations, all deliberate: chain length (R-DRV-09) and coil
spring rate (R-SHK-06) use standard shop formulas rather than
manufacturer-specific charts, and 2x total capacity (R-DRV-05) assumes a
14t ring difference when exact ring sizes aren't known.

## What's built vs. not (phase status)

- ✅ **Phase 1** — Prisma schema + standalone compatibility engine,
  verified with strict TypeScript compilation and smoke tests against
  deliberately broken builds
- ✅ **Phase 2** — Express API: parts routes (with parametric filters +
  `?compatibleWith=<buildId>` server-side lockout), builds CRUD, a
  `/builds/:id/validate` endpoint
- ✅ **Phase 3** — Seed data: 26 real components (Santa Cruz Hightower,
  Trek Fuel EX, Specialized Epic 8 frames; RockShox Pike/Fox 36/RockShox
  SID SL forks; real SRAM/Shimano groupsets), sourced via web search
  (manufacturer spec pages + review sites for weights/prices), NOT an
  automated scrape — the sandbox this was built in had network access
  locked to package registries only, no general web scraping capability
- ✅ **Phase 4** — Next.js Builder Matrix component (dropdown-per-slot,
  live price/weight totals)
- ✅ **Phase 5** — Filters + part detail pages, now applied to all nine
  categories (was Frames-only). Each category has query-param filters on
  its list route, a `/parts/:category/:partId` detail route returning
  prices+vendor, and a matching api-client method. The detail page is
  generic — `CATEGORY_FETCHERS` + `CATEGORY_SPECS` maps drive it rather
  than one page per category. Verified working in a browser against a
  live API.
- ✅ **Phase 6** — JWT auth (register/login, bcrypt), saved builds with
  public/private toggle, stock alerts (create/list/delete + a background
  checker function meant to run on a schedule, not per-request)
- ✅ **Phase 7 — Deployment** — built and running. `docker compose up`
  brings up Postgres 17 + API + Next.js; the API applies migrations via
  `docker-entrypoint.sh` before serving. Verified end to end: schema
  migrated, 26 parts seeded, JWT register/login, build creation, and
  server-side compatibility lockout all working against real Postgres,
  with the containerised frontend rendering live data.

## Verification status

Everything below has now actually been executed, not just reviewed.
Building the Docker images was what finally exercised the code paths the
original sandbox couldn't, and it surfaced three real bugs:

- **`src/middleware/auth.middleware.ts` did not compile.** `tsc` had
  never run against real `jsonwebtoken` types. `const JWT_SECRET =
  process.env.JWT_SECRET` is `string | undefined`, which no `jwt.sign`
  overload accepts; and `jwt.verify` returns `string | JwtPayload`, which
  can't be cast straight to `AuthPayload`. Fixed with a `requireEnv()`
  helper (keeps the fail-loud behavior, but types as `string`) and a
  `verifyToken()` helper that pulls claims out explicitly.
- **`/builder` broke `next build`.** `useSearchParams()` forces
  client-side rendering, which the production build rejects outside a
  Suspense boundary. Dev mode never complains, so this was invisible
  until the first real build. Fixed by wrapping the page.
- **The `/mock` preview route broke the web image.** It imported
  `BikeBuilderMock.jsx` from the repo root, which is outside the web
  image's `./web` build context. The route was removed — the mock is
  throwaway demo code that shouldn't ship in a deployable image.

The frontend now passes a real production build (8 routes, standalone
output) and the backend compiles against a genuinely generated Prisma
client.

## Local dev environment status

The project now has real scaffolding, which the original handoff lacked:
root `package.json`/`tsconfig.json` for the API, and `web/package.json`
plus Tailwind/PostCSS/Next config for the frontend. Dependencies install
cleanly with 0 audit vulnerabilities (bcrypt was moved to 6.x, whose
removal of `@mapbox/node-pre-gyp` drops a critical `tar` advisory; Next
is pinned to a patched 14.2.x).

Two caveats on this machine specifically:

- **npm blocks package install scripts** (`allow-scripts` policy), so
  Prisma's engine binaries were never downloaded to the host. Host-side
  `prisma generate` / `migrate` / `studio` therefore don't work until
  those scripts are approved (`npm approve-scripts prisma @prisma/client
  @prisma/engines`). The README's setup steps route around this by
  running migrations inside a container instead, where npm has no such
  policy.
- **Bind mounts must use Windows-style paths.** Running
  `docker ... -v "$(pwd)/prisma:/app/prisma"` from Git Bash silently
  fails to mount: the container gets its own baked-in copy instead, so
  `prisma migrate dev` appears to succeed while writing the migration
  into a throwaway container. Run those commands from PowerShell with
  `"${PWD}\prisma:/app/prisma"`, and check for `drwxrwxrwx` on the
  mounted directory to confirm the mount actually took.
- **Because `prisma generate` never ran on the host, `tsc` still cannot
  fully typecheck `src/`** — the `@prisma/client` imports remain
  unresolved, exactly as the original handoff described. The Docker build
  runs `prisma generate` itself, so the first `docker compose build` is
  what will actually prove the backend compiles.

## A standalone mock also exists

`BikeBuilderMock.jsx` — a single-file, no-imports, no-backend version of
the builder UI with the same engine logic and catalog data hardcoded
in-file, built specifically so it could preview live in the claude.ai chat
interface (which can't run multi-file projects or hit a real API). It
includes:
- True lockout: frame must be picked first, every other dropdown only
  lists options that pass the compatibility engine
- Click-through category browse pages instead of inline `<select>` dropdowns
- Simple original SVG line-art icons per category instead of real product
  photos (hotlinking to retailer image CDNs is unreliable and their
  photography isn't something to reproduce without a license — if real
  photos matter for the final product, look at manufacturer press kits,
  your own photography, or a licensed product-image API)

This mock is a demo, not a component meant to be dropped into the real
Next.js project — the real `BuilderMatrix.tsx` (which fetches from the
actual API) is the one to build on.

## Suggested next step

Pick up at Phase 7 (deployment) once the above is understood, or revisit
Phase 5 to extend detail pages to the remaining categories. Either is a
reasonable place to continue.
