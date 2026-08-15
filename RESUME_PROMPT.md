# Paste this as your first message on the new account

I'm continuing work on **Bike PartPicker** — a self-hosted, UK-market,
PCPartPicker-style build tool for bikes, eventually affiliate-marketed. Full
history is in `SESSION_LOG.md` in the project root
(`C:\Users\abdul\Documents\bike-partpicker\`) — **read that file first**,
it covers everything from the original build through today in detail.

Quick orientation before you read it:

**Stack**: Next.js (App Router) + Tailwind frontend, Express/TypeScript +
Prisma/PostgreSQL backend, Docker Compose. UK market: VAT-inclusive pricing
in pence (`basePricePence`, nullable — no fabricated RRPs), UK spelling, UK
retailers only.

**The one rule that governs everything**: never guess or fabricate part
data. This came from an explicit instruction early on — "verify if the data
is ACCURATE and that you didn't just make something like a calculator that
says 3 plus 2 is 7." Every `Part` has a `dataSource` provenance field
(`MANUFACTURER_SPEC` > `RETAILER_LISTING` > `DATA_FEED` > `COMMUNITY` >
`ESTIMATED` > `UNVERIFIED`) and a `sourceUrl`. The compatibility engine
abstains (returns `null`) on missing data rather than assuming — this is
load-bearing, not a nice-to-have, and it's been checked and re-checked
across this entire project.

**Compatibility engine**: 103 rules across 16 subsystems
(`COMPATIBILITY_RULES.md` is the catalogue), each a named function in
`src/compatibility/engine.ts` (e.g. `checkBbShellMatch` = R-BB-01). Three
severities: `critical` (part is removed from the list entirely — true
lockout, not just a flag), `warning` (stays selectable, names the exact
remedy), `info` (advisory, never blocks). Full test coverage — 127 tests in
`src/compatibility/engine.test.ts`, one test per rule ID minimum.

**Branding**: gold/brown accent system, deliberately *not* purple (too
close to PCPartPicker). Dark header nav bar only — category badges stay
light/neutral. Don't relitigate this; it went through several rounds of
correction already.

**Current state**: core site and engine are solid. Real manufacturer data
exists for 11/18 part categories (Shimano + SRAM, via
`scripts/import/extract_shimano.py` / `extract_sram.py` /
`import-parts.ts`). 5 frame platforms are sourced, written to the database,
and live in the "I already own a bike" flow — 54 real bikes (Canyon Grizl
CF/6, Cannondale Topstone alloy/Synapse Carbon MY2025, Trek Checkpoint
SL/SLR), each with a verified `Frame` row but no other parts yet (the
upgrade view already handles that gracefully — every other slot just shows
"not fitted" and lets the rider pick from scratch). See
`scripts/import/import-sourced-frames.ts` and `SESSION_LOG.md` §14.
Everything else — the other ~27 platforms in the 99 Spokes index, and every
non-frame part on these 54 bikes — is still unsourced, deliberately, rather
than approximated.

**Immediate next steps** (see `SESSION_LOG.md` §14 for what just landed,
§6-7/§12 for the original sourcing methodology):
1. Continue sourcing the remaining ~27 frame platforms the same way:
   corroborate from the 99 Spokes raw component text
   (`scratchpad/99spokes-out/bikes.json` if the scratchpad survived —
   otherwise re-extract via `scripts/import/extract_99spokes.ts`), verify
   against the manufacturer's own page, and **check the manufacturer page
   describes the same model year as the data being verified** — a live
   product page silently describing a newer redesign nearly produced a
   wrong answer once already (§12.5), and a second, different near-miss
   (Cannondale Topstone/Grizl 6 alloy hangers) was correctly abstained on
   rather than guessed in §14 — read both before sourcing the next batch.
2. Once more platforms land, start populating real stock builds (groupset,
   wheels, cockpit) for at least a few of the highest-value trims per
   platform — every bike currently in `BikeModel` has only its frame, not a
   full spec, which limits how useful "I already own a bike" actually is
   day to day.
3. `Populate 10 examples per category + 10 sample bikes` and `end-to-end
   scenario testing against real data` from §13 are both still open.

Everything else — why UK-only, why the engine is rule-based rather than
precomputed, why lockout only applies where a part is physically
impossible, the whole 99 Spokes decode investigation, the five-tier bug fix
pass, the branding back-and-forth — is in `SESSION_LOG.md`. Read it before
making architectural changes; a lot of these decisions were arrived at
after real back-and-forth, not arbitrarily.
