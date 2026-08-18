# Session log — Build My Bike, formerly "Bike PartPicker" (2026-08-06 → 2026-08-16+)

> Renamed 2026-08-16 — see §18. Every entry before that date refers to the
> project by its original name, "Bike PartPicker"; left as written below
> since this file is a dated record of what was actually true at each
> point, not a living description of the current brand.

A durable, written record of the entire project history in Claude Code, not
just the most recent stretch — why things are the way they are, in the
order decisions actually got made. Read this before making architectural
changes; a lot of what's below looks like a default choice until you see
the actual back-and-forth that produced it.

> **Raw transcript**: the verbatim conversation is preserved by the harness at
> `C:\Users\abdul\.claude\projects\C--Users-abdul--claude\3dc59922-eb6d-4182-a676-4dab830a2257.jsonl`
> (7,400+ entries, Aug 6 – Aug 15). This file is the readable version, built
> by mining that transcript directly rather than re-summarizing a summary.
>
> **New-session handoff**: see `RESUME_PROMPT.md` in this same directory —
> a ready-to-paste prompt for starting a fresh Claude Code session on this
> project.

---

## 1. Aug 6 — initial build

Project started from an uploaded zip (`bike-partpicker-project_2.zip`),
already carrying a phased build plan and a `PROJECT_CONTEXT.md` handoff doc
(itself written from an earlier claude.ai chat where the architecture, the
compatibility engine, the API, and a frontend mock had already been
designed — see that file for the original architecture decisions: class-table
inheritance for parts, append-only price log, closed Postgres enums with no
fuzzy tolerance between "close" standards).

Worked through the phases (`finish phase 5 then show me the front end`),
fixing bugs as they surfaced: a builder/my-builds click error, and parts
selection boxes rendering blacked-out instead of white. Then a multi-day
gap before the next session.

---

## 2. Aug 11 — phase 7, and the self-hosting decision

Picked back up mid-plan. Two things worth recording:

**The deployment fork.** The user asked, in plain terms, what the practical
difference was between deploying to their own machine ("route A") versus a
hosted option ("route B"), whether route A meant giving up the ability to
keep building features, and whether either route cost anything. Decision:
**Route A — self-hosted, own machine, via Docker.** This is why the project
is a Docker Compose stack (db/api/web containers) rather than deployed to a
cloud host, and it's the reason disk space and Docker health became a
recurring maintenance concern later in the project (§7).

Phase 7 files were written against that decision once Docker was confirmed
installed. Session continued into Aug 12 via `Continue from where you left
off` — background-task notifications from this point on indicate agent runs
were already part of the workflow.

---

## 3. Aug 12 — the compatibility engine, and how it's supposed to work

The engine's entire scope and philosophy trace to two Aug 12 requests, in
order:

1. **"compare this site and pc partpicker what is different about them?"**
   — this comparison is the reason the eventual branding work (§10) treated
   visual distance from PCPartPicker as non-negotiable, not just an
   aesthetic preference.
2. **"first find and list ALL possible compstibility issues a bike has and
   how we can make a rule for them and i want every one big or small"**,
   followed shortly by **"implement all 103 and fetch whatever parts you
   need just to complete the 103 rules from online."** This is the literal
   origin of the 103-rule catalogue in `COMPATIBILITY_RULES.md` — the
   number 103 isn't arbitrary, it's the actual count of every real
   part-to-part constraint on a modern bike that was enumerated in response
   to this request.

A bug surfaced here too — "why cant i see the list of 86" — from an
intermediate count before the catalogue was finalized at 103.

Two follow-up threads shaped the schema:

- A plain-English backend explainer, asked for twice ("explain to me like
  the backend paths are humans and what they are ACTUALLY doing," then "in
  simpler shorter terms") — establishing early that architecture
  explanations needed to be concrete and non-jargon, not just correct.
- A part-identification discussion: how to give each part a
  manufacturer-derived code, whether MPN/GTIN would serve that purpose,
  and — the one that actually stuck — **"i need ONE universal standard
  thats on ALL the bike parts to describe them,"** with a specific
  follow-up on which brands lack SRAM UDH support. This is the origin of
  UDH's outsized role in the schema: `HangerStandard`, the
  `checkUdhTransmission` rule (R-HGR-01), and the later 99 Spokes work all
  treat UDH as the closest thing to a real cross-brand standard, because
  that's the answer this conversation converged on.

---

## 4. Aug 13 — UK market, the accuracy mandate, and the business model

The busiest single day for decisions that are still load-bearing.

**Visual design kicked off**: "lets do thst later, first add pictures,
change fonts and colours and make the website more colourfull and nice to
look at," then product imagery. This is upstream of the whole branding
arc in §10 — the site was deliberately made visually rich before the later
purple-removal correction, not built minimal from the start.

**UK market, in one line**: "tgis is for uk market," followed by
"change everything for the uk msrket add vat change spelling and do a full
schema change with uk only parts with with uk websites canyon etc." This is
the direct cause of `basePricePence` being VAT-inclusive pence, UK
spelling throughout, and UK retailers/brands (Canyon named explicitly) as
the sourcing target ever since.

**"I already own a bike" predates 99 Spokes.** The request to "find
websites that can populate this website with data of pre existing bikes
that are factory built like trek bikes and rockrider bikes canyone bikes"
is from Aug 13 — a full day before 99 Spokes was ever mentioned (§7). The
user then deliberately deferred population — "dont focus on population YET
i just want you to focus on building that seperate section first so i can
tune everything on the site and add more features" — which is why the
my-bike UI was built as a standalone section before any real bike data
existed for it.

**The lockout philosophy, stated precisely once and never violated since**:
"i dont want anything to be locked out BUT the frame as in there should be
a something next to all the parts saying youre..." — this is the origin of
the three-severity design (critical/warning/info) rather than a binary
compatible/incompatible flag. Only physically-impossible fits disappear
from the list; everything else stays selectable with the exact remedy
named. Confirmed with a plain "Yes add it."

**The parts-menu redesign**: "where it says the names of the parts make the
text more minimalistic and make it one section where if i hover over it a
list of parts shows up" — this is `web/components/PartsMenu.tsx`, the
hover dropdown that replaced a flatter parts listing.

**The precomputation question, and why the engine is rule-based, not a
lookup table**: a sequence of questions — how the algorithm actually checks
compatibility (length/height/width?), whether it could be precomputed so
nothing needs checking from scratch, and pointedly, "no i meant instead of
the webpage code checking it why cant there be an algorithm that has a set
of rules to check whatever part i throw at it" — worked through to the
current design: a pure function per rule (`checkX(partA, partB) => warning
| null`), aggregated live per build rather than precomputed and cached.
Followed by "so according to you all i need to do is populate?" and then
the actual business ambition stated outright: **"explain it in simple terms
what i need to do step by step to make this dream of an affiliate marketed
pc partpicker clone but for bieks website."** The affiliate-marketing goal
hasn't been implemented yet, but it's the reason UK-retailer sourcing and
real pricing have mattered as much as they have throughout — this isn't a
portfolio piece, it's meant to eventually make money on referral links.

**The single most consequential instruction in the whole project**, stated
after an initial "first i need to verify if the compatibility engine
works" was refined to something much sharper:

> "no i need to verify if the data is ACCURATE and that you didnt judt make
> something like a calculator that says 3 plus 2 is 7"

Every provenance field (`dataSource`, `sourceUrl`, `dataNotes`,
`verifiedAt`/`verifiedBy`), every abstain-on-null design choice in the
compatibility engine, the entire Shimano/SRAM extraction pipeline, the
rejection of 99 Spokes as a spec source once its data proved unreliable,
and the whole manufacturer-verification discipline in the frame-sourcing
work (§12) trace back to this one line. It is the standing rule for this
project: **never present a number or a match as fact unless it's been
checked against something real.**

---

## 5. Aug 13 (later) — verification begins, first real audit

The day closed with the user pushing past a surface-level UI report and
asking for an actual accuracy check of the engine's data, which set up the
disk-space/Docker troubleshooting and the 99 Spokes exploration that opens
Aug 14.

---

## 6. Aug 14 (morning) — infrastructure

C: drive was full, breaking Docker Desktop. Diagnosed and cleared space,
confirmed Docker came back healthy — this blocked everything else, so it
came first.

**`npm run schema:apply` was hanging.** Root cause: `npm run X -- args`
appends `args` to the *end* of a chained command string, so
`schema:apply -- --name foo` landed `--name foo` on `docker compose up`
instead of `prisma migrate dev`, which then sat waiting on stdin. Fixed by
splitting the chain into [scripts/schema-apply.sh](scripts/schema-apply.sh),
which takes the migration name as `$1` directly.

---

## 7. Aug 14 — 99 Spokes, then the pivot to manufacturer sourcing

"if i upload data to you can you add it to the website as a test?" →
"use the sample excel sheet on 99 spokes webpage." Getting the actual
sample file required real digging — "why cant you donwload it" pushed back
on an early claim that it couldn't be fetched, and the working method
(SharePoint's `download.aspx?share=<id>` endpoint, not the `?download=1`
query param) was found by actually testing it rather than asserting it
wouldn't work.

Once the sample was parsed, its data quality problems became visible
quickly. The user's response set the direction for the rest of the day:
**"ok, so instead of inferring or taking in wrong data from 99 spokes lets
find data from antoher website?"** — followed by "yes start pulling but do
it at a slow rate so that we have 10 different examples on our website so
we can finetune everything." This is the origin of the Shimano/SRAM
manufacturer-sourcing pipeline (§8) — 99 Spokes wasn't abandoned out of
caution, it was abandoned because the user explicitly refused to accept
inferred or lower-confidence data once a cleaner source was possible. (It
was picked back up properly in §12, once a parser bug was found to be
responsible for a lot of what looked like 99 Spokes' own unreliability.)

"ok so lets solidify the extractor and importer first so that we can throw
whatever at them" — deliberate sequencing: build reusable, validating
import tooling *before* mass-pulling data, rather than one-off scripts per
source.

---

## 8. Aug 14 — Shimano and SRAM, real manufacturer data

Built two extractors, Shimano first, SRAM after ("do shmano completely then
sram"):

- [scripts/import/extract_shimano.py](scripts/import/extract_shimano.py) —
  coordinate-based PDF table parsing (pdfplumber) over Shimano's own spec
  and compatibility PDFs. Fixed along the way: a `despace()` normalizer, a
  `SERIES_ROW` lookback bug, a duplicate-label suffix collision (`n=2`
  variable shadowing the column-count variable — renamed to `dup`), and
  `VALID_MODEL_NO` regex validation to reject junk rows.
- [scripts/import/extract_sram.py](scripts/import/extract_sram.py) —
  regex-based HTML scraping of SRAM's server-rendered spec tables. Fixed:
  loosened `SPEC_TABLE`/`SPEC_ROW` regexes to tolerate `<tr class="...">`
  instead of requiring bare tags (silently returned zero rows otherwise),
  and deduplicated the sitemap by model slug (each model was listed twice).

Both feed [scripts/import/import-parts.ts](scripts/import/import-parts.ts),
a validating importer with per-category `Mapper` functions. Notable bugs
fixed there: a dispatch collision because SRAM and Shimano share
model-number prefixes (mappers now keyed with a `-SRAM` suffix, dispatch
checks `data.source` against `/SRAM/i`); crankset 1x/2x misdetection fixed
by requiring `chainringTokens.length === 1`, not just a first-token match;
and a dash-normalizer bug where `"T-Type"` failed to match `"TTYPE"`,
silently misclassifying every SRAM Flattop chain as Eagle-12.

Result: 11 of 18 part categories now have real, sourced,
`MANUFACTURER_SPEC` data. Frames/forks/wheelsets/tyres/rear-shocks/
seatposts/headsets/saddles/stems/handlebars remain thin — 2-4 hand-seeded
examples each. This is the gap §12 is midway through closing properly.

---

## 9. Aug 14 — the exhaustive bug list, then a five-tier fix pass

**"start sram and after finidhing it makr a list of issues and bugs like
the schema issue above and i mean EVERY eXISTING ISSUE AND BUG BUT FORGET
THE SOLVED ONES."** Then, once the list existed: **"ok now go in order of
all the problems you listed starting from the top with schema gaps all the
way down to process/operational and make sure you find a solution for each
and every one of them, the solution cant be guesses, has to be factually
correct."** Two independent regression-check rounds followed
("now do an aggresive bug, issue, gap, error check in EVERY part of the
build end to end so far," then again later, "now recheck for any issues or
gaps or bugs before we continue") to catch anything the fix pass itself
had broken.

**Tier 1 — silent wrong-verdict bugs** in `src/compatibility/engine.ts`:
- `checkUdhTransmission` (R-HGR-01): an unrecorded derailleur mount type was
  treated identically to "definitely not UDH" — a real SRAM Transmission
  derailleur imported without this field would pass silently onto a frame
  it cannot bolt to. Now warns instead, but only when the frame is known
  non-UDH (unknown-on-UDH-frame is genuinely fine either way).
- `checkBrakeActuation`/`checkHosePorts` were using `?? true` to guess
  `isHydraulic`. Changed to explicit `== null` abstain.
- `checkRotorThickness`/`checkValveHole`/`checkValveLength`/`checkTubeSize`
  gained `slot` parameters and are now called twice (front + rear) in the
  aggregator — previously `frontTube ?? rearTube` meant a fine front tube
  masked a broken rear one.
- `checkChainringMount`'s `direct` mount-standard list wasn't updated when
  `SRAM_8_BOLT_ROAD_DM`/`SRAM_8_BOLT_EAGLE_DM` were added to the schema, so
  mismatches between two direct-mount standards filed under the wrong rule.
- `checkSteererLength` (R-FRK-01) had a dead ternary —
  `stem?.lengthMm != null ? 40 : 40`, both branches identical regardless of
  input. `Stem` genuinely has no clamp-height field, so this is now a
  stated industry-typical constant with a comment explaining why.
- A duplicate `checkAxleThread` (old, wrong) and `checkCrankLengthFit`
  (duplicate of `checkCrankLength`) were deleted rather than patched.

**Tier 2 — price-null propagation.** `basePricePence` made nullable
(migration `20260814113241_price_nullable`) because manufacturer spec
sheets carry no RRP. The upgrade-path resolver's `price()`/
`currentPriceOfSlot()` return `number | null`, and `diff()`/`sumDiffs()`
propagate null instead of silently computing a wrong number from a missing
price. Took three independent audit rounds to converge.

**Tier 3 — API robustness**: `toNum()` in `src/routes/parts.routes.ts`
returns `undefined` on non-finite results (fixed a NaN-slips-through bug);
9 numeric filter fields changed from exact-match to range matching; list
route wraps `findMany` for a clean 400 instead of a raw 500; a regression
caught by an independent review agent — forks' `maxTravel` filter still
using raw `Number()` after the eq/gte/lte rewrite — was fixed.

**Tier 4 — import pipeline correctness** (covered in §8).

**Tier 5 — secondary/operational**: `auth.routes.ts` catches Prisma P2002
for a clean 409 instead of a race-condition 500; `builds.routes.ts` retries
as an update on a P2002 create conflict; `stockAlerts.routes.ts` validates
inputs and catches P2003; a catch-all JSON 404 handler was added; a real
`StockAlert.vendor` FK relation was added.

Also two doc/code drift corrections in `COMPATIBILITY_RULES.md`: R-BRK-10
(pad shape) is a deliberate no-op, now documented as such instead of
looking like a bug; R-MNT-02's doc claimed `critical`, the code correctly
implements `info` — the doc was wrong, not the code.

While the audit agents ran, the user asked for a plain breakdown of the
backend architecture and how it was running — consistent with the Aug 12
pattern of wanting concrete, non-jargon explanations alongside the work.

---

## 10. Aug 14–15 — branding

"ok, now lets chnage the purple to gold fonts as its too close to pc
partpicker" — direct continuation of the Aug 12 differentiation goal.
Went through several rounds of correction (each preserved as standing
guidance, not just fixed once):

- The header logo was found still using old indigo after the rest of the
  site had moved to gold/brown ("why is it still purple top left?").
- Category badge backgrounds are neutral silver/grey — only the **text**
  is gold/brown per subsystem. An experiment making them dark charcoal was
  explicitly reverted: "no, only do it for the one header ribbon with the
  name of the site and navigation, leave everything as it was before I
  told you to do this." Dark treatment applies **only** to the actual top
  navigation bar.
- `chassis` (gold `#b45309`) and `contact` (brown `#78350f`) stay visually
  distinct — never collapse them into one shared color, since that's the
  category color-coding system.
- Homepage: removed the full 27-tile category grid — "I don't want parts
  listed or categories on the front page, I want more ABOUT the site."
  Replaced with a "Why this exists" section.
- A custom SVG chain-link logo (user-supplied) was integrated as
  `web/components/Logo.tsx`.

---

## 11. Aug 15 — full test coverage, all 103 rules

"so youre saying right now 65 of the 103 rules cant be applied?" led to a
methodology discussion ("ok, so how would you actually give test coverage
to those rules?"), approval ("yes"), then explicit instruction to move
fast through the rest ("yes and finish fast").

Methodology: `comm -23` between the rule IDs in `COMPATIBILITY_RULES.md`
and the rule IDs actually asserted with an explicit ID
(`blocks()`/`warns()`, not a bare `fits()`) in `engine.test.ts` — the only
trustworthy coverage metric, since a rule can be called in a test without
its ID ever being checked. Worked through five batches, fixing two real
bugs found while writing tests rather than testing around them (the
`checkSteererLength` dead ternary from §9, tier 1; the R-MNT-02 doc/code
drift). One self-caught test-writing mistake: an R-SHK-06 "fits" case used
guessed numbers that didn't actually land within tolerance — recomputed
exactly before fixing.

**Final state: 127 tests, 0 failures.** Every one of 103 rule IDs has
direct coverage except `R-FIT-04`, intentionally retired in the doc in
favor of `R-CRK-04` (a same-behavior duplicate never wired into the
aggregator) — the behavior *is* tested, under its real ID.

---

## 12. Aug 15 — the 99 Spokes investigation, properly this time

Picked back up with "explain our 99 spokes issue in as few words as
possible," then "can we find a key to decode them or can you try make a
key?" This required re-fetching the original sample file — recovered by
**grepping this session's own raw JSONL transcript** in response to a
direct question, "can you not scroll through this chat regardless of
context reset?" (Answer: yes, deliberately, by reading the transcript file
directly — it isn't auto-reloaded, but it persists and can be searched.)
The file itself was still sitting, already unzipped, in scratchpad from
the Aug 14 work.

### 10.1 The premise was wrong

The blocker on record: "99 Spokes uses internal shorthand like
`Hanger Standard: 119`, and ambiguous `BB86/BB92`." Re-parsing properly
found that **`Hanger Standard: 119` never existed.** xlsx cells with no
value are self-closing (`<c r="W2" s="2"/>`) — a hand-rolled regex that
required a closing `</c>` ran straight through the empty cell and captured
the *next* column's shared-string index instead. `119` was
`sharedStrings[119]` = `"Rigid"`, the Suspension Configuration value from
the column next door. Parsed correctly, the Hanger column contains exactly
one real value: `"udh"`, present on 48 of 277 rows.

### 10.2 The real problem, and the decode key

Every component spec ships twice: `[Raw]` (manufacturer's own text) and
`[Standard]` (99 Spokes' own normalized label). The normalized column is
lossy and, on 6 rows, outright wrong — Canyon's 2025 Grizl 5 raw text says
press-fit PF86 twice, and `[Standard]` says `"BSA"` (threaded), traced to
their normalizer matching a bare model number and overriding the explicit
text in the same string.

Built [scripts/import/99spokes-key.ts](scripts/import/99spokes-key.ts):
reads `[Raw]`, treats `[Standard]` only as a cross-check. Abstains rather
than guesses whenever raw text names a family without a shell width — 30
Trek rows say "T47 threaded, internal bearing" with no number, and the
tempting guess (`T47_68`) would have been wrong on all 30 (internal T47 is
85.5mm, a width our enum doesn't contain).

A follow-up question ("why couldn't you decode the other 159?") caught a
real bug in the key while answering it: `"FSA BB86 Alloy Cups"` names its
standard outright, but the width was being extracted and then discarded
because both branch guards required a fitment keyword this string never
used. Fixed. Coverage: 118 → 119/277.

### 10.3 Recasting 99 Spokes as catalogue, not spec source

"why are you limiting yourself to 99 Spokes for specs — just use it for
model names and fetch specs from any other trusted sources." Measured
directly: of the 27 `Frame` fields the compatibility engine reads, the
export touches 4, partially. The other 23 exist nowhere in the file. 99
Spokes is the index (277 bikes, real model names, build specs); manufacturer
geometry pages are the spec source. 277 bikes collapse to 32 (maker,
family) sourcing groups.

### 10.4 The spine extractor, and a grouping bug caught early

Model switched Opus → Sonnet mid-investigation ("stop. i want to use
sonnet," then "continue sonnet and pick up where left off with opus") —
the new session picked up cleanly from existing scratchpad state.

Built [scripts/import/xlsx-reader.ts](scripts/import/xlsx-reader.ts) (the
corrected, dependency-free xlsx reader — matches `<c>` elements generically,
attributes in any order) and
[scripts/import/extract_99spokes.ts](scripts/import/extract_99spokes.ts)
(produces `bikes.json` + `platforms.json`, deliberately not filling `Frame`
fields).

First run grouped by `(maker, family)` alone. Before sourcing anything,
checked the top platforms for internal BB consistency and found Cannondale
Topstone and Synapse both internally inconsistent — "family" isn't reliably
one physical frame. Reworked to group by `(maker, family, material,
suspension)`: 32 families → **54 real sourcing units**, 16 of the original
32 span more than one mould.

### 10.5 Sourcing five platforms, and a near-miss

"switch to opus and decode the hanger/BB columns and everything else and
before you change the website, show me the results" — sourced full frame
specs for the five largest single-mould units (54 bikes) from Canyon,
Cannondale, and Trek's own pages.

**The near-miss**: the file's decode for aluminium Canyon Grizl's BB was
`BB86`, corroborated by four independent component brands across both
model years. Canyon's *current* product page said `"SRAM T47 Road wide"` —
a direct contradiction. It would have been wrong to trust it: Canyon
redesigned the aluminium Grizl for 2026, and the live page describes that
redesign, not the 2024/2025 bikes in the sample. **Standing rule**: a
manufacturer's current page isn't automatically right for a specific model
year — check the generation matches before letting it override a
corroborated file answer.

Final sourcing state:

| Platform | Material/Susp. | Bikes | Status |
|---|---|---|---|
| Canyon Grizl CF | Carbon/Rigid | 12 | **Ready** |
| Canyon Grizl 6 | Aluminium/Rigid, MY24-25 only | 9 | Ready, 2 optional fields open |
| Cannondale Topstone (alloy) | Aluminium/Rigid | 15 | Ready, 1 optional field open |
| Cannondale Synapse Carbon | Carbon/Rigid, MY2025 only | 5 | Nearly ready — seatpost diameter unconfirmed |
| Trek Checkpoint SL | Carbon/Rigid, Gen 3 | 13 | Blocked — needs `T47_INTERNAL_85_5` enum value |

**36 bikes are import-ready today.** Nothing has been written to the
database — this is sourced, verified data staged for review.

---

## 13. Current task list (superseded by §14 — kept for history)

Completed: Shimano/SRAM sourcing, the validating importer, all five bug-fix
tiers, full 103-rule test coverage, the 99 Spokes spine extractor, the
five-platform sourcing pass.

Open (as of end of the Aug 15 session — see §14 for what actually shipped):
- **Add `T47_INTERNAL_85_5`** to `BbShellStandard` (+ migration). Unblocks
  Trek Checkpoint SL (13 bikes).
- **Resolve 3 open fields**, then write `Frame` rows for the 5 sourced
  platforms and wire `bikes.json` into the my-bike section.
- **Continue sourcing** the remaining ~27 platforms, same methodology.
- **Populate 10 examples per category + 10 sample bikes**, once enough
  platforms are sourced.
- **End-to-end scenario testing** against real data (distinct from the
  unit test coverage already done in §11).

---

## 14. Aug 15 (new-account continuation) — the five platforms go live

Picked up via `RESUME_PROMPT.md` on a fresh account (model switched
Opus → Sonnet mid-session, same pattern as §12.4 — the new session read the
resume prompt, then `SESSION_LOG.md` in full, before touching anything).
Worked the four "immediate next steps" from §13 in order.

**Step 1 turned out already done.** `BbShellStandard.T47_85_5` (not
`T47_INTERNAL_85_5` — the resume prompt's own working name, not the actual
enum member) already existed, with its own migration
(`20260815140531_add_t47_85_5_bb_shell`) and `src/types/parts.ts` updated to
match. This had evidently landed in the stretch of the original session
between the sourcing pass and the write-up — the session log just hadn't
caught up. Worth noting for future handoffs: **check git/migration state
directly before trusting a "next steps" list**, even one written minutes
earlier in the same project.

**Step 2 — the three open fields, resolved by actually going and checking,
not by guessing:**

- **Canyon Grizl 6 (alloy) `maxTyreWidthMm`**: 50mm, not the 54mm the
  original pass had flagged as MY2026-only. Corroborated by two independent
  MY2024-dated sources (opticycles.com's dated model page, general 2024
  reviews) rather than the current redesigned page.
- **Canyon Grizl 6 (alloy) `hangerStandard`** and **Cannondale Topstone
  (alloy) `hangerStandard`**: genuinely could not be confirmed after real
  searching. Every "UDH" result for either bike turned out to describe a
  different frame — the Grizl **CF** (carbon, already separately confirmed)
  or the 2026 Grizl AL redesign for Canyon; the all-new 2025 **Topstone
  Carbon** redesign for Cannondale (road.cc: "revamped Topstone Carbon
  gravel bike") rather than the alloy frame these bikes actually use.
  Left `null`. This is the "abstain rather than guess" rule working as
  designed, not an unfinished task — see the near-miss in §12.5 for why
  that distinction matters here specifically.
- **Cannondale Synapse Carbon (MY2025) `seatpostDiameterMm`**: resolved to
  `null`, not 27 or 27.2mm as the original "27 or 27.2? unconfirmed" note
  had framed it. The 2025 Synapse doesn't have an ambiguous *round*
  diameter to pin down — it replaced its round 27.2mm post entirely with a
  proprietary D-shaped aero post (shared design language with SuperSix
  Evo), part of a flattened-seat-tube redesign. A standard round seatpost
  does not fit this frame at all. `null` correctly signals "not a standard
  round post," not "unknown but probably normal" — a real distinction the
  schema doesn't yet have a field to state more directly.

**Step 3 — `Frame` rows written**, via a new script,
[scripts/import/import-sourced-frames.ts](scripts/import/import-sourced-frames.ts).
Deliberately **not** added to `prisma/seed.ts`, which is explicitly labelled
demo data (invented geometry, mechanically-converted USD prices) — these
five are real sourced platforms and needed their own idempotent script,
mirroring how Shimano/SRAM go through `import-parts.ts` rather than the demo
seed. Every field carries the same stated/derived confidence distinction
used throughout this project, recorded in each `Part.dataNotes`.
`msrpPence` was deliberately left `null` for all 54 bikes rather than
converting 99 Spokes' USD prices to a UK RRP — that conversion would mean
inventing an exchange rate and retail markup, exactly the kind of number
this project's provenance system exists to rule out.

**Step 4 — the 99 Spokes bike index, wired in the way that turned out to
already fit.** Before writing any code, checked how `BikeModel` /
`BikeModelPart` / the `/bikes` routes actually work
(`src/routes/bikes.routes.ts`, `web/app/my-bike/[buildId]/page.tsx`): a
`BikeModel` is a specific SKU that clones into a full `Build`, and the
upgrade view (`app/my-bike/[buildId]/page.tsx`) was **already built** to
show a slot as "not fitted" and let the user pick from scratch when the
factory spec doesn't cover it — this is exactly the shape a frame-only bike
needs, with no code changes required to the upgrade flow itself. So "wiring
the index in" meant: give each of the 54 sourced bikes its own `BikeModel`
row (real brand/model/year/trim names, taken directly from `bikes.json`,
not invented) with exactly one `BikeModelPart` — its frame. The other ~223
bikes in the 99 Spokes export were deliberately **not** added as
`BikeModel` rows: without sourced frame data they'd either need an empty
parts list (a `BikeModel` whose entire designed purpose is "a build with
every slot filled" — see `bikes.routes.ts`'s own header comment — sitting
at zero) or invented specs, and neither is honest. The "next steps" list in
§13 read, on a second pass, as scoped to the 54 already-sourced bikes
specifically, not literally all 277 — worth flagging explicitly in case
that reading is wrong.

Verified end-to-end rather than assumed working: rebuilt the Docker web
image (copy change to `app/my-bike/page.tsx`, since the containers run a
production build with no dev-mode volume mount — a source edit alone does
nothing until rebuilt), confirmed all 54 bikes appear via
`GET /bikes?q=...`, and ran a full register → clone → validate pass against
a live test account for the Trek Checkpoint SL platform: the clone created
a one-part `Build`, and `/builds/:id/validate` returned
`compatible: true` with a single harmless `info`-level R-MNT-05 warning (no
rack/fender eyelets — correct, since `hasEyelets` defaults `false` and
wasn't set). Also spot-checked `checkBbShellMatch`/`checkBbShellWidth`
(R-BB-01/R-BB-03) against the new `T47_85_5` frame: R-BB-01 only compares
enum names, so it needs no width; `bbShellWidthMm` is `Int` and can't hold
85.5 anyway, so it's left `null` on all five frames' 86/68mm-class shells
too where the width would just duplicate what the standard enum already
states, consistent with how `import-parts.ts` already leaves it `null` on
shell mismatches.

**End state**: 5 real frame platforms in the database (up from 0 written,
though all 5 were fully sourced and staged as of §12.5), 54 real bikes
searchable and clonable in the "I already own a bike" flow. 3 previously
open fields closed — 2 by finding a real answer, 1 by finding out there
isn't a round-diameter answer to find. `RESUME_PROMPT.md`'s "immediate next
steps" list has been rewritten to point at what's next now (continue
sourcing the remaining ~27 platforms; §13's other still-open items).

---

## 15. Files this project has created or substantially changed

**New**: `scripts/import/99spokes-key.ts`, `scripts/import/xlsx-reader.ts`,
`scripts/import/extract_99spokes.ts`, `scripts/schema-apply.sh`,
`web/components/Logo.tsx`, `web/app/icon.svg`, `RESUME_PROMPT.md`,
this file.

**Substantially changed**: `src/compatibility/engine.ts`,
`src/compatibility/engine.test.ts` (39 → 127 tests),
`src/routes/{parts,auth,builds,stockAlerts}.routes.ts`, `src/index.ts`,
`prisma/schema.prisma`, `web/app/page.tsx`, `web/app/layout.tsx`,
`web/tailwind.config.ts`, `web/lib/categories.ts`,
`web/components/PartsMenu.tsx`, `COMPATIBILITY_RULES.md`.

**Working data (scratchpad, not committed — needed to reproduce/continue)**:
the 99 Spokes sample (`s1.xlsx`, unzipped in `x/`), extractor output
(`99spokes-out/{bikes,platforms}.json`), Shimano/SRAM raw PDFs/HTML/JSON.
Path: `C:\Users\abdul\AppData\Local\Temp\claude\C--Users-abdul--claude\3dc59922-eb6d-4182-a676-4dab830a2257\scratchpad\`
— this is session-scoped and may not survive indefinitely; anything still
needed should be copied into the repo before it's relied on long-term.

**Published artifacts (private, this session)**:
- 99 Spokes decode findings — `https://claude.ai/code/artifact/5c76d58c-52ef-48d6-8880-745712034424`
- Five-platform sourcing report — `https://claude.ai/code/artifact/1e3aa079-b647-4f2e-8653-0a0b2465178d`

---

## 16. Aug 16 — production deploy fixed, competitor comparison, trim-level stock builds

**Production deploy, actually fixed.** `bike-part-picker.vercel.app` had
been serving a broken/stale build. Root causes, found and fixed in order:
a `"web."` (trailing period) typo in Vercel's Root Directory project
setting; the live deployment separately running Vercel's `Framework: Node`
preset instead of Next.js, fixed by redeploying with current project
settings; and the real culprit underneath both — `NEXT_PUBLIC_API_UR` was
genuinely misspelled in the Vercel env vars (missing the final `L`), so the
frontend always fell back to `localhost:4000` no matter what else was
fixed. Backend deployed to Railway (project `bike-partpicker-api`,
service `api`, id `8664dc33-662d-47e1-8b6a-d9ea5d7d4ff0`) with the local
Postgres data restored via `pg_dump`/`psql` through an SSH tunnel (two
restore passes needed — the plain-SQL dump's alphabetical table order put
some FK-child tables before `Part`, so the first pass's FK-violating
inserts succeeded on the second).

**Two accidental duplicate projects exist and are not yet cleaned up**:
a second Railway project also named `bike-partpicker-api`
(id `521d1dc7-a5f9-49c8-b01d-9bb47cc059a7`, created by a subagent that
picked up the `use-railway` skill despite being told not to touch Railway
— the skill auto-installs globally and any later subagent in the same
session can trigger it unprompted) and a second Vercel project named
`web` (created by `vercel link --yes` run from inside `web/` instead of
the repo root). The **live**, correct Railway project is
`574b2eb8-c15f-41c5-915a-aa34b9d9e195` — confirmed by its `api` service's
resolved `DATABASE_URL` pointing at `postgres-k0mx.railway.internal`, the
`Postgres-k0MX` database (not the same project's other, unused `Postgres`
service, which also exists and shouldn't be confused for the live one).

**Competitor comparison** (`bikepartpicker.net` vs this site) was done
with independently-verified findings (not taking the prompt's own framing
at face value) and produced an explicit 8-item priority list. All 8 were
solved in one pass: backend deployed with real data (above); the one
contradictory competitor claim resolved with actual network evidence
rather than picked arbitrarily; a "Why is this blocked?" affordance added
to `BuilderMatrix.tsx` (lazy-loaded per slot, only fetches `explain=1` on
click); SEO/reference pages built entirely from live engine output
(`/compatibility`, `/compatibility/rules`, `/compatibility/rules/:id`,
`/compatibility/[category]/[id]`) plus a "Compatibility FAQ" section on
part detail pages; a `PartBundle` schema added for future groupset-bundle
pricing (deliberately left at 0 rows — no bundle data has been sourced
yet, adding the table isn't the same as populating it); 4 more real frame
platforms sourced (Cannondale SuperSix EVO SE, Synapse Carbon, SuperX
Carbon; Trek Checkmate SLR — on top of the 5 already in the DB from §14);
and one real bug fixed (`web/app/parts/[category]/[id]/page.tsx`'s price
chart was interpolating raw pence into `£${v}` instead of running it
through `formatGbp`).

**Trim-level stock-build population.** Every `BikeModel` row up to this
point had exactly one linked part — its frame (see §14's closing note:
frame-level sourcing only, deliberately). The user asked to go trim by
trim and verify full stock builds against real manufacturer spec pages,
using parallel agents. Six platforms were researched this way — the 4
frame platforms sourced earlier this same day (SuperSix EVO SE, Synapse
Carbon, SuperX Carbon, Checkmate SLR) plus Domane AL Gen 4 and Grail
CF/CF SLX from §14 — covering all 19 of their `BikeModel` trims. Each
research agent pulled the live rendered DOM of the manufacturer's own
spec-sheet page per trim (not a WebFetch text-extraction summary — one
agent explicitly caught and excluded a fabricated "48/31" chainring spec
that only existed in the AI-summarized pass, not on Canyon's actual page)
and cross-referenced every named component against the live local
catalog (`GET /parts/*`) by brand *and* exact model number, not name
similarity — catching several near-miss traps along the way: SRAM RED
XG-1391 (13-speed XPLR) vs the catalog's differently-speed-counted
`CN-RED-E1` chain row; Shimano 105 12-speed `R7100`-series parts vs the
11-speed `R7000`-series the older Synapse Carbon 5 actually ships;
Cannondale's "Shimano BSA 68" bottom bracket spec vs the catalog's only
BSA row being stored at a 73mm shell width; and Shimano Tiagra "4700" vs
the catalog's differently-numbered `RD-R4000`/`ST-R4020` rows, correctly
left as non-matches rather than assumed equivalent.

Before writing anything to the database, every one of the 64 proposed
component links was independently re-verified by a second, adversarial
pass — six more agents (one per platform), each given the raw research
text, a full dump of the relevant catalog rows, and the proposed
`(bikeSlug, category, partId)` mapping, told to reject anything not
verbatim-confirmable against both sources. Zero rejections; two flagged
"missed" duplicate catalog rows for the exact same physical chain
(pre-existing catalog seeding debt — two `Part` rows for one real product
under slightly different names — correctly left as a single link each,
not two, since linking both would show the bike as having two chains).

The actual write is `scripts/import/link-trim-components.ts` — same
idempotent shape as `import-sourced-frames.ts` (`findFirst` before
`create`, safe to re-run), but linking existing catalog `Part` rows onto
existing `BikeModel` rows via `BikeModelPart` rather than creating new
`Part` rows. Run against both the local Docker Postgres and, through the
same SSH-tunnel pattern as the earlier restore, the live Railway
`Postgres-k0MX` — 65 links created in both places, 0 already existed, 0
bikes/parts not found, 0 type mismatches. Verified end-to-end: cloned
`canyon-grail-cf-7-2026` into a `Build` and loaded `/my-bike/:id]` in a
browser — cassette, chain, and rear derailleur render as real stock parts
with brand/model, every other slot honestly shows "not fitted" rather
than a guess.

**What's still a real gap, not an oversight**: cockpit (handlebar/stem),
wheelsets, tyres, seatposts, saddles, and most electronic-groupset
variants (Di2, AXS) are absent from essentially every trim across all six
platforms — not because they weren't researched, but because the parts
catalog itself has no road/gravel-specific rows in those categories yet
(it was hand-seeded from MTB examples early in the project). Populating
those would mean sourcing and creating new `Part` rows first, the same
kind of work `import-sourced-frames.ts` did for frames — a separate,
larger pass, not something this task's linking-only scope could do
honestly.

---

## 17. Aug 16 (same day, continued) — filling every section, one agent per component category

The user's response to §16's closing gap: *"run a targeted for EVERY BIKE I WANT EVERY SEECTION FILLED FOR EVERY BIKE NOTHING CAN BE GUESSED, FETCH"* then *"USE AGENTS FOR EVERY SECTION USE ONE DELEGATE"*. Restructured the research from "one agent per platform" (§16) to **one agent per component category, working across all 19 bikes at once** — 17 categories (fork, headset, bottom bracket, crankset+chainring, cassette, chain, shifter/brake-lever, rear derailleur, front derailleur, brake caliper, rotor, wheelset, tyre, handlebar/stem, seatpost, seat clamp, saddle), each instructed to dig past manufacturer marketing pages into dealer parts fiches, owner's manuals, exploded diagrams, and the component-maker's own model pages -- then a second adversarial-verify agent per category before anything was written, same two-phase pattern as §16.

Result: 129 findings reviewed, **95 confirmed NEW_PART, 14 confirmed RESOLVED_MATCH, 7 confirmed NOT_APPLICABLE (genuinely no separate part exists), 10 confirmed UNRESOLVED (real gap after honest effort), 19 REJECTed by the verify pass, 20 DOWNGRADED to unresolved** rather than trusted as stated. The research alone (34 agents, ~474k tokens) was interrupted twice by the underlying process restarting mid-run — both times resumed cleanly via `Workflow({scriptPath, resumeFromRunId})`, cached agent results replayed instantly.

**Two schema gaps found and fixed, not worked around:**
1. `AxleType` had no 12mm-diameter/100mm-spacing value — the standard front axle on every one of these bikes (`THRU_AXLE_100x15` is a *15mm*-diameter MTB standard, wrong diameter entirely). Added `THRU_AXLE_100x12` with a comment explaining the gap, migrated. Forgetting that the **API's Docker image bakes in a Prisma Client at build time** (not at container start) caused a full outage of every `?compatibleWith=` filtered endpoint locally right after the migration — `docker compose build api` (not just restart) fixed it, exactly the failure mode `docker-entrypoint.sh`'s own comment already warned about from an earlier incident.
2. Two proprietary one-piece integrated cockpits (Cannondale SystemBar R-One, Trek Aero RSL Road) and three non-round aero/D-shaped seatposts (Cannondale "C1 Aero 27" ×2, Trek "KVF Aero Carbon") hit `Handlebar`/`Stem`/`Seatpost`'s required, round-only `clampDiameterMm`/`diameterMm` fields with no real number to put there — forcing the common 27.2mm figure would misstate an actually-different cross-section as a standard round post. Deliberately **not created**; left as a disclosed schema limitation (the model currently has no honest way to represent "genuinely non-round, no equivalent diameter published") rather than a guessed value.

**scripts/import/import-deep-dive-components.ts** creates the 93 parts that survived every check (2 of the 95 confirmed NEW_PART findings were the seatposts covered by the gap above) and links them, idempotent same as before. First run surfaced real bugs, caught only because the build was actually cloned and validated end-to-end rather than assumed correct from the import log:
- **`BL-RX820` vs `BR-RX820` brake-lever/caliper mismatch** — both genuinely GRX-820-tier, matched piston ratios in reality; the false "different systems" block was because the new part was entered as `brakeSystemFamily: "Shimano GRX"` while the existing catalog convention (a plain string-equality check, R-BRK-08) stores it as `"GRX"` with no brand prefix. Fixed to match convention.
- **Wrong `DerailleurMountStandard` on 3 SRAM XPLR AXS rear derailleurs** — confirmed via SRAM's own generational naming that only the newest E1-generation XPLR derailleur (`RD-RED-1E-E1`) is the hangerless "Full Mount" `UDH_DIRECT_MOUNT` design; the D1/D2-generation units (`RD-RED1-E-D1`, `RD-FRC-1E-D2`) mount to a traditional replaceable hanger (`STANDARD_HANGER`) same as before Full Mount existed. Had this backwards for two of the three.
- **`CS-HG31-8`'s freehub body** — read R-FH-03's own logic (`wheelset.freehubBodyType === 'HG_11' && cassette.speeds <= 10` → warn, not block) and realized `HG_11` is the schema's single physical HG body, with narrower-cassette compatibility handled via that spacer warning, not a separate `HG_10` bucket. Was creating a hard, wrong mismatch.
- **Two pre-existing catalog rows, not from today**, surfaced only because today's real wheelset/frame data now cross-checks against them: `CS-R7101-12`/`CS-R8101-12` (105/Ultegra 12-speed cassettes) were stored `freehubBodyType: HG_12`, but Shimano's own documented design intent for these specific tiers is backward compatibility with the *existing* `HG_11` body (their explicit marketing point at launch — the `HG_12`-only requirement is Dura-Ace-only). And `BB-UN300`'s shell was stored `BSA_73`, contradicting Trek's own Domane AL 2 page stating `68mm` for the exact unit fitted. Both corrected in place, on both databases.
- **Left deliberately un-"fixed"**: `CN-RED-E1`'s stored `speeds: 12` produces a false `R-DRV-07` block on the three E1-generation 13-speed SRAM builds (Synapse LAB71, SuperX LAB71, Checkmate SLR9) — both this pass's and §16's research independently confirmed on sram.com that this is one physical chain SRAM rates for both 12 and 13-speed. The schema's `Chain.speeds` is a single `Int` and can't represent "rated for either" without a real modeling change (a range or array) — not attempted here. This is a known, disclosed false-positive on those 3 bikes' validation, not a silent gap.

Applied to local Docker Postgres, then to production: redeployed the Railway `api` service first (same stale-Prisma-Client trap as the local Docker incident above would otherwise have hit prod identically — a fresh `railway up` both applies the migration via `docker-entrypoint.sh`'s `prisma migrate deploy` and rebuilds the image, so this one is self-correcting on every deploy, not just next time someone remembers), then the same SSH-tunnel pattern as before for the import and the two manual catalog corrections. Verified with a full clone-and-validate sweep of all 19 bikes against the live production API: identical results to local, 15 of 19 bikes fully critical-clean, the other 4 showing exactly the two disclosed non-bugs above (the `CN-RED-E1` speed limitation on 3 bikes, plus one correct engine abstention on SuperSix EVO SE 1 — a hookless carbon wheelset paired with a tyre never confirmed hookless-safe by any source checked, which is the compatibility engine doing exactly what it's supposed to, not an error).

**End state**: every one of the 19 trims now has real crankset/cassette/chain/shifter/derailleur/brakes/rotor/wheelset/tyre data (13–15 populated slots each, up from the 4–5 §16 left them at), sourced and cited the same way frames were. Cockpit and seatpost remain genuinely incomplete on several trims — not from lack of trying, but because two real components mount via interfaces (`THRU_AXLE_100x12` now fixed; proprietary non-round aero profiles still not) the schema can't yet represent without a deliberate design decision, which wasn't this task's call to make unilaterally.

---

## 18. Aug 17 — the rename: Bike PartPicker → Build My Bike

`bikepartpicker.net` already had the obvious name, and it turned out to be the smaller problem — the bigger one was that "Bike PartPicker" itself assumes the reader already knows cycling vocabulary (groupset, cog, crankset), when most people landing on an affiliate-traffic bike site aren't club cyclists. Went through several naming passes with the user (documented as a series of published Claude Artifacts, not repeated here) before landing on **Build My Bike** — plain enough to need no cycling literacy, and widened from an earlier "BuildMyBike" draft specifically so it doesn't exclude the "I already own a bike" upgrade flow, which is half of what this tool actually does.

**Renamed everywhere it was practical to reach:**
- Every user-facing string in `web/` — header/footer wordmark (now a "Build" + gradient-"MyBike" two-tone lockup, same visual structure as the old "Bike" + "PartPicker" split), page `<title>`/`<meta description>` on every route, the About/Contact/Privacy/Terms prose, the `Logo.tsx` SVG's `aria-label`, and the placeholder contact email/domain (`hello@buildmybike.co.uk` — still not a real registered inbox, same caveat as before).
- `package.json` name fields (root: `build-my-bike-api`; `web/`: `build-my-bike-web`), the two Dockerfiles' and `docker-compose.yml`'s header comments, `src/index.ts`'s startup log line, `README.md`, `PROJECT_CONTEXT.md`, `RESUME_PROMPT.md`.
- **Vercel**: project renamed `bike-part-picker` → `build-my-bike` via `vercel project rename`. This did **not** automatically move the live `.vercel.app` domain the way a project name change might suggest — Vercel keeps the short domain as a separately-claimed resource independent of the project's display name, and a project rename alone leaves old deployments' hashed URLs (and the old short domain) exactly as they were. Had to: trigger a fresh `vercel deploy --prod` so a new deployment existed under the new project identity, then `vercel domains add build-my-bike.vercel.app` to actually claim the clean domain (a plain `vercel alias set` alone left it silently gated behind Vercel's SSO/deployment-protection, since that only exempts domains registered as proper project domains, not ad-hoc aliases). Live and verified at **build-my-bike.vercel.app**. The old `bike-part-picker.vercel.app` domain is untouched and still serving the current build — left in place rather than removed, since there was no reason to break it.
- Local `.vercel/project.json` cache files (both root and `web/`, gitignored) patched to match so the CLI's local state doesn't drift from the server's.

**Not renamed — flagged for the user to do by hand, not a technical limitation of the rename itself:**
- **GitHub repo** (`abdulbarimohd/bike-part-picker`): no `gh` CLI and no GitHub MCP tool available in this environment to do it programmatically. GitHub's own rename (Settings → repository name) auto-redirects the old URL, so this is low-risk whenever it happens — just needs a human with the dashboard open.
- **Railway project** (`bike-partpicker-api`, both the still-live one and, historically, its now-deleted duplicate): neither the Railway CLI nor its MCP tool surface has a project/service rename command — `railway service files rename` exists but only renames files inside a service's filesystem, unrelated. Cosmetic only either way — the actual API domain (`api-production-9a87.up.railway.app`) is an independently-assigned identifier that doesn't derive from the project name, so this doesn't block or affect anything live.

**Deliberately left alone, not an oversight:** the project's local folder on disk (`C:\Users\abdul\Documents\bike-partpicker\`) and the internal `bikepp` abbreviation used for the Postgres user/database name and two `localStorage` keys (`bikepp_token`, `bikepp_discipline`). Neither is something a visitor, collaborator, or GitHub browser would ever see as "the brand name" — and unlike the public-facing rename, touching either carries real local-environment risk (a renamed folder breaks IDE/tooling paths that point at it; a renamed Postgres database name doesn't retroactively rename the actual database inside an already-initialized Docker volume, it just breaks the connection string) for no visible benefit. Flagged here rather than silently skipped.

---

## 19. Aug 18 — pagination bug fix, and the first "frame-only bike" data-population batch

**Real bug, found while testing something unrelated:** `/my-bike` silently capped at the API's default 25-result limit with no pagination and no indication more bikes existed. Alphabetical ordering meant Cannondale alone filled the cap — every Canyon, Giant, Specialized and Trek bike (already in the database) was completely unreachable from that page despite being real, linkable inventory. `GET /bikes` now returns `{ items, total }` with `offset`/`limit` support, and the frontend has a "Load more" control. Verified: 122 bikes total, previously only 25 were ever visible. Deployed to both Vercel and Railway.

**First data-population batch**, per the "immediate next steps" gap: 7 Cannondale Topstone (alloy) trims that had only a Frame row (1 component) — Topstone 1, 2 (CUES-1x), 2 (GRX-2x), 3, 4, EQ, Apex 1 — went from 1 component each to 13-20. Same two-phase process as earlier passes: one research agent per bike pulled Cannondale's own spec page (cross-checked for model year via Wayback Machine snapshots or dated third-party listings, since Cannondale's own pages carry no year label), then one matching agent per bike proposed LINK_EXISTING/NEW_PART/UNRESOLVED per category against the live catalog dump.

**A planned 8th bike, Topstone LTD (tagged 2024 in the DB), turned out not to exist** — Cannondale's own catalog only ever shows an LTD trim for MY2022, and the 2024 alloy lineup is confirmed as Topstone 1/2/3/4 only (image asset filenames, CannondaleSpares.com's platform listing, and the US region page 404ing all agree). The research agent correctly refused to fabricate a 2024 spec rather than guess. **The DB's own `cannondale-topstone-ltd-2024` row's year is therefore itself suspect and worth a follow-up look** — not touched this pass, since correcting or removing an existing row wasn't this task's scope.

**The matching agents' LINK_EXISTING proposals were then checked against the actual stored schema fields, not just catalog row names — this caught two real errors before anything was written:**
- "SM-BB52 BSA Threaded" is stored as a 73mm-shell part; the frame is BSA_68. The correct row is "BB-RS501 SHIMANO Threaded Bottom Bracket". Multiple matching agents proposed the wrong one purely from the name looking plausible.
- The existing "WTB Vulpine TCS Light" and "Vittoria Terreno Dry TNT" rows are stored at 40mm width; Topstone EQ's tyre (36mm, stated on Cannondale's page) and Apex 1's (38mm) are narrower variants of the same named product, not the same SKU — new rows, not links.

One external fact was independently verified rather than pattern-matched: Shimano SM-RT30 (used on 3 of these trims) is confirmed Center Lock only via Shimano's own product listing — no 6-bolt SKU exists.

**Genuine gaps, left unwritten:** rotor brand/model on 4 of 7 trims (Topstone 1's "RT64" matches no verifiable SKU; Topstone 3/4's rotor brand was never stated; Apex 1 has ~5 equally-plausible SRAM candidates); headset brand/model on all 7 (the two existing Cannondale candidate rows, K35010/K35061, turn out to share identical stored upperStandard/lowerStandard — even the schema can't disambiguate them, so picking either would assert an unstated brand); Topstone 1's shifter (ST-RX600 vs ST-RX610, speed count not encoded in either name); Topstone 2 CUES-1x's crankset (Cannondale states only "CUES, 40T" with no tier SKU, and the 5 CUES tiers aren't interchangeable); Topstone 3/4's shifter + rear derailleur (microSHIFT Sword/Advent X use a pull-ratio ecosystem this schema's `CablePullStandard` enum has no value for — a schema gap, not a sourcing gap, same shape as the `THRU_AXLE_100x12` gap fixed earlier); Topstone 4's bottom bracket brand (only "cartridge, square taper" stated, and cheap OEM square-taper BBs come from many interchangeable suppliers).

**Two real mistakes in my own new data, caught by the compatibility engine itself** on the first validate-a-cloned-build pass, not by re-reading my own work: the shared "Cannondale 3" handlebar had `controlClampDiameterMm` wrongly set equal to the 31.8mm center clamp instead of the real ~23.8mm drop-bar lever-clamp constant (flagged every affected bike as critically incompatible at the cockpit); and the new SRAM Apex shifter used `SRAM_EXACT_ACTUATION` (the 2x road pull ratio) instead of `SRAM_X_ACTUATION` (the correct 1x/XPLR pull ratio, matching the already-catalogued RD-APX-1-D1 derailleur). Both corrected before deploying.

**A separate, pre-existing bug surfaced along the way, not fixed here:** `build.service.ts` resolves a single `build.shifter` with no left/right slot awareness, but every mechanical 2x drop-bar shifter pair in the catalog deliberately stores `speeds: 2` on the left lever (front chainring count) and the real cassette speed count on the right — a consistent, intentional convention across ~14 existing pairs, confirmed before assuming it was a data bug. When the resolver happens to pick the left lever, R-DRV-02/R-DRV-10/R-FD-04 fire false criticals on a correctly-specced build. Reproduces live on Topstone 2 GRX-2x and Topstone EQ; other, earlier-populated 2x bikes most likely only escape it by insertion-order luck, not because they're handled differently. Flagged as a follow-up task rather than fixed in this pass — an engine/service change, not a data one.

Applied via `scripts/import/import-topstone-batch.ts` (idempotent, same shape as earlier import scripts) to local Docker Postgres first, validated end-to-end (cloned every one of the 7 trims, checked for critical errors, caught and fixed the two real mistakes above), then to production via `railway connect --tunnel-only` and the same script. Verified live: `build-my-bike.vercel.app/my-bike` shows real component counts (13-20) for all 7 trims instead of 1.
