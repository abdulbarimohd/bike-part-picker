// src/routes/parts.routes.ts
//
// One config table drives every category's list route, detail
// route, parametric filters and compatibility lockout. With 27
// categories, hand-writing a route pair each was pure repetition
// — adding a category is now a single entry below.

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import * as engine from '../compatibility/engine';
import { getCompatibilityWarnings } from '../compatibility/engine';
import { loadBuildFromDb } from '../services/build.service';
import type { BikeBuild } from '../types/parts';

const router = Router();

/**
 * Query-param helpers. `undefined` means "filter not supplied" -- both
 * "no value given" and "value given but unusable" collapse to the same
 * thing, so a bad filter gets silently ignored (broader results) rather
 * than crashing the request or silently corrupting it.
 *
 * `Number(v)` on a non-numeric string, an empty string, or `null`/`[]`
 * produces `NaN`/`0` rather than throwing -- `NaN !== undefined`, so it
 * used to survive `where()`'s undefined-stripping and reach Prisma as a
 * literal `{ field: NaN }`, which Postgres/Prisma silently treats as an
 * equality match against NULL. Concretely: `?crankLength=notanumber` used
 * to return every crankset with no recorded crank length, instead of
 * erroring or being ignored -- a typo'd filter looked like "this is all
 * the data we have" rather than "that filter didn't parse."
 */
function toNum(v: unknown): number | undefined {
  if (Array.isArray(v)) v = v[0];
  if (typeof v !== 'string' || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
const eq = (v: unknown) => {
  if (v === undefined) return undefined;
  // A repeated query key (?material=A&material=B) arrives as an array,
  // and Prisma expects a scalar for an equality filter on an enum column
  // -- passing the array through crashed with a raw 500. Same for a
  // non-string (shouldn't happen from a URL, but Express doesn't
  // guarantee it) or a value long/odd enough that it can't be a real
  // enum member -- every real enum value in this schema is well under 40
  // characters, so anything past 60 or containing a null byte is
  // rejected rather than handed to Prisma to fail on.
  if (Array.isArray(v) || typeof v !== 'string' || v.length > 60 || v.includes('\0')) return undefined;
  return v;
};
const gte = (v: unknown) => { const n = toNum(v); return n === undefined ? undefined : { gte: n }; };
const lte = (v: unknown) => { const n = toNum(v); return n === undefined ? undefined : { lte: n }; };
const num = (v: unknown) => toNum(v);
const bool = (v: unknown) => (v === undefined ? undefined : v === 'true');

/** Strips keys whose value is undefined so Prisma ignores them. */
function where(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const DISCIPLINES = new Set(['ROAD', 'GRAVEL', 'MTB']);

/**
 * Merges the header's discipline switch into a category's `where` clause.
 * Applied once here rather than duplicated into all ~27 `filters()`
 * functions above -- the discipline lives on `Part`, shared by every
 * category, so one insertion point at the route handler covers all of
 * them the same way `config.filters()` does for category-specific fields.
 *
 * A part with no `disciplines` recorded stays visible under every filter
 * (`isEmpty`) -- most of the catalogue isn't classified yet, and treating
 * "unknown" as "hide it" would make the switch quietly empty most
 * categories instead of just doing nothing for parts it has no opinion
 * on, the same abstain-don't-guess default used throughout this schema.
 */
function withDiscipline(baseWhere: Record<string, unknown>, q: Record<string, string | undefined>): Record<string, unknown> {
  if (!q.discipline || !DISCIPLINES.has(q.discipline)) return baseWhere;
  const existingPart = (baseWhere.part as Record<string, unknown> | undefined) ?? {};
  return {
    ...baseWhere,
    part: {
      ...existingPart,
      OR: [{ disciplines: { isEmpty: true } }, { disciplines: { has: q.discipline } }],
    },
  };
}

interface CategoryConfig {
  /** Prisma delegate name on the client. */
  model: string;
  /** Maps req.query → a Prisma `where` clause. */
  filters: (q: Record<string, string | undefined>) => Record<string, unknown>;
  /** Narrows a candidate list against the current build. */
  lockout?: (build: BikeBuild, rows: any[], q: Record<string, string | undefined>) => any[];
  /** Cheapest-first where a price ordering makes sense. */
  orderByPrice?: boolean;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  frames: {
    model: 'frame',
    orderByPrice: true,
    filters: (q) => where({
      material: eq(q.material),
      rearBrakeMountType: eq(q.brakeMount),
      bbShellStandard: eq(q.bbShell),
      rearAxleType: eq(q.axleType),
      wheelDiameter: eq(q.diameter),
      hangerStandard: eq(q.hanger),
      maxTyreWidthMm: gte(q.minTyreClearance),
      ...(q.brand && { part: { brand: { equals: q.brand, mode: 'insensitive' } } }),
    }),
  },
  forks: {
    model: 'fork',
    filters: (q) => where({
      brakeMountType: eq(q.brakeMount),
      steererTubeTaper: eq(q.taper),
      frontAxleType: eq(q.axleType),
      wheelDiameter: eq(q.diameter),
      // Regression from the eq/gte/lte/num/toNum rewrite: this one field
      // was left as a raw `Number()` call and missed the NaN-safety fix
      // applied everywhere else -- caught by an independent review of the
      // fix pass. `?maxTravel=notanumber` produced `{ lte: NaN }` here,
      // inconsistent with every other numeric filter in this file (which
      // silently ignore an unparseable value rather than pass NaN to
      // Prisma).
      travelMm: lte(q.maxTravel),
    }),
    lockout: (b, rows) => engine.filterCompatibleForks(b, rows),
  },
  'bottom-brackets': {
    model: 'bottomBracket',
    filters: (q) => where({ frameInterface: eq(q.shell), spindleInterface: eq(q.spindle) }),
    lockout: (b, rows) => engine.filterCompatibleBottomBrackets(b, rows),
  },
  cranksets: {
    model: 'crankset',
    filters: (q) => where({ spindleDiameter: eq(q.spindle), crankLengthMm: gte(q.crankLength) }),
    lockout: (b, rows) => engine.filterCompatibleCranksets(b, rows),
  },
  chainrings: {
    model: 'chainring',
    filters: (q) => where({ mountStandard: eq(q.mount), teeth: gte(q.teeth), narrowWide: bool(q.narrowWide) }),
    lockout: (b, rows) => engine.filterCompatibleChainrings(b, rows),
  },
  wheelsets: {
    model: 'wheelset',
    filters: (q) => where({
      wheelDiameter: eq(q.diameter),
      rearAxleType: eq(q.hubSpacing),
      freehubBodyType: eq(q.freehub),
      rotorMountStandard: eq(q.rotorMount),
      tubelessReady: bool(q.tubelessReady),
      hookless: bool(q.hookless),
    }),
    lockout: (b, rows) => engine.filterCompatibleWheelsets(b, rows),
  },
  tyres: {
    model: 'tyre',
    filters: (q) => where({
      wheelDiameter: eq(q.diameter),
      widthMm: gte(q.minWidth),
      tubeless: bool(q.tubeless),
      hooklessSafe: bool(q.hooklessSafe),
    }),
    lockout: (b, rows, q) => (q.position === 'front'
      ? engine.filterCompatibleFrontTyres(b, rows)
      : engine.filterCompatibleRearTyres(b, rows)),
  },
  tubes: {
    model: 'tube',
    filters: (q) => where({ wheelDiameter: eq(q.diameter), valveType: eq(q.valve) }),
    lockout: (b, rows) => engine.filterCompatibleTubes(b, rows),
  },
  'brake-calipers': {
    model: 'brakeCaliper',
    filters: (q) => where({ mountType: eq(q.mountType), isHydraulic: bool(q.hydraulic), fluidType: eq(q.fluid) }),
    lockout: (b, rows) => engine.filterCompatibleBrakeCalipers(b, rows),
  },
  'brake-levers': {
    model: 'brakeLever',
    filters: (q) => where({ isHydraulic: bool(q.hydraulic), fluidType: eq(q.fluid), barType: eq(q.barType) }),
    lockout: (b, rows) => engine.filterCompatibleBrakeLevers(b, rows),
  },
  rotors: {
    model: 'rotor',
    filters: (q) => where({ diameterMm: gte(q.diameter), mountStandard: eq(q.mount) }),
    lockout: (b, rows, q) => engine.filterCompatibleRotors(b, rows, q.position === 'rear' ? 'rear' : 'front'),
  },
  shifters: {
    model: 'shifter',
    filters: (q) => where({ speeds: num(q.speeds), cablePullStandard: eq(q.cablePull), barType: eq(q.barType) }),
    lockout: (b, rows) => engine.filterCompatibleShifters(b, rows),
  },
  'rear-derailleurs': {
    model: 'rearDerailleur',
    filters: (q) => where({
      maxSpeeds: num(q.maxSpeeds),
      cablePullStandard: eq(q.cablePull),
      cageLength: eq(q.cage),
      mountStandard: eq(q.mount),
      maxCassetteCogTeeth: gte(q.minCogCapacity),
    }),
    lockout: (b, rows) => engine.filterCompatibleRearDerailleurs(b, rows),
  },
  'front-derailleurs': {
    model: 'frontDerailleur',
    filters: (q) => where({ speeds: num(q.speeds), mountType: eq(q.mount), pullDirection: eq(q.pull) }),
    lockout: (b, rows) => engine.filterCompatibleFrontDerailleurs(b, rows),
  },
  cassettes: {
    model: 'cassette',
    filters: (q) => where({
      speeds: num(q.speeds),
      freehubBodyType: eq(q.freehub),
      largestCogTeeth: lte(q.maxCog),
    }),
    lockout: (b, rows) => engine.filterCompatibleCassettes(b, rows),
  },
  chains: {
    model: 'chain',
    filters: (q) => where({ speeds: num(q.speeds), chainStandard: eq(q.standard) }),
    lockout: (b, rows) => engine.filterCompatibleChains(b, rows),
  },
  headsets: {
    model: 'headset',
    filters: (q) => where({ upperStandard: eq(q.upper), lowerStandard: eq(q.lower) }),
    lockout: (b, rows) => engine.filterCompatibleHeadsets(b, rows),
  },
  'rear-shocks': {
    model: 'rearShock',
    filters: (q) => where({
      eyeToEyeMm: gte(q.eyeToEye),
      strokeMm: gte(q.stroke),
      mountType: eq(q.mount),
      isCoil: bool(q.coil),
    }),
    lockout: (b, rows) => engine.filterCompatibleRearShocks(b, rows),
  },
  handlebars: {
    model: 'handlebar',
    filters: (q) => where({ clampDiameterMm: gte(q.clamp), barType: eq(q.barType), widthMm: gte(q.minWidth) }),
    lockout: (b, rows) => engine.filterCompatibleHandlebars(b, rows),
  },
  stems: {
    model: 'stem',
    filters: (q) => where({ barClampDiameterMm: gte(q.clamp), lengthMm: gte(q.length) }),
    lockout: (b, rows) => engine.filterCompatibleStems(b, rows),
  },
  seatposts: {
    model: 'seatpost',
    filters: (q) => where({
      diameterMm: gte(q.diameter),
      isDropper: bool(q.dropper),
      travelMm: gte(q.minTravel),
      routingType: eq(q.routing),
    }),
    lockout: (b, rows) => engine.filterCompatibleSeatposts(b, rows),
  },
  'seat-clamps': {
    model: 'seatClamp',
    filters: (q) => where({ diameterMm: gte(q.diameter) }),
    lockout: (b, rows) => engine.filterCompatibleSeatClamps(b, rows),
  },
  saddles: {
    model: 'saddle',
    filters: (q) => where({ railType: eq(q.rail), widthMm: gte(q.width) }),
    lockout: (b, rows) => engine.filterCompatibleSaddles(b, rows),
  },
  pedals: {
    model: 'pedal',
    filters: (q) => where({ thread: eq(q.thread), cleatSystem: eq(q.cleat) }),
    lockout: (b, rows) => engine.filterCompatiblePedals(b, rows),
  },
  shoes: {
    model: 'shoe',
    filters: (q) => where({ soleDrilling: eq(q.drilling) }),
    lockout: (b, rows) => engine.filterCompatibleShoes(b, rows),
  },
  'chain-guides': {
    model: 'chainGuide',
    filters: (q) => where({ mountStandard: eq(q.mount) }),
    lockout: (b, rows) => engine.filterCompatibleChainGuides(b, rows),
  },
  'derailleur-hangers': {
    model: 'derailleurHanger',
    filters: (q) => where({ hangerStandard: eq(q.standard) }),
    lockout: (b, rows) => engine.filterCompatibleDerailleurHangers(b, rows),
  },
};

/**
 * Which BikeBuild slot a category's parts occupy. Paired categories
 * list front then rear. Used by `explain` mode to try a candidate in
 * place and see what it would break.
 */
const SLUG_TO_SLOTS: Record<string, string[]> = {
  frames: ['frame'], forks: ['fork'], headsets: ['headset'], 'rear-shocks': ['rearShock'],
  'bottom-brackets': ['bottomBracket'], cranksets: ['crankset'], chainrings: ['chainring'],
  cassettes: ['cassette'], chains: ['chain'], shifters: ['shifter'],
  'rear-derailleurs': ['rearDerailleur'], 'front-derailleurs': ['frontDerailleur'],
  wheelsets: ['wheelset'], tyres: ['frontTyre', 'rearTyre'], tubes: ['frontTube', 'rearTube'],
  'brake-calipers': ['brakeCaliper'], 'brake-levers': ['brakeLever'], rotors: ['frontRotor', 'rearRotor'],
  handlebars: ['handlebar'], stems: ['stem'], seatposts: ['seatpost'], 'seat-clamps': ['seatClamp'],
  saddles: ['saddle'], pedals: ['pedal'], shoes: ['shoe'], 'chain-guides': ['chainGuide'],
  'derailleur-hangers': ['derailleurHanger'],
};

/** Reverse of SLUG_TO_SLOTS, so a blocking slot maps back to a category. */
const SLOT_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_SLOTS).flatMap(([slug, slots]) => slots.map((s) => [s, slug]))
);

const PRICE_INCLUDE = {
  part: { include: { prices: { include: { vendor: true }, orderBy: { recordedAt: 'desc' as const } } } },
};

/** Exposed so the frontend can render a category index without hardcoding it. */
router.get('/categories', (_req, res) => {
  res.json(Object.keys(CATEGORIES).map((slug) => ({
    slug,
    filters: Object.keys(CATEGORIES[slug].filters({})),
  })));
});

/**
 * GET /parts/sitemap -- every { slug, partId, lastModified } the frontend
 * should list in its sitemap.xml.
 *
 * Enumerated through the category delegates (one findMany per CATEGORIES
 * entry) rather than `prisma.part.findMany()` on purpose: a Part row only
 * has a public URL if a category-table row points at it, and the detail
 * routes below look up by category delegate. Walking the same delegates
 * guarantees every slug/partId pair emitted here resolves on both
 * /parts/:slug/:partId and /compatibility/parts/:slug/:partId, so the
 * sitemap never advertises a URL that 404s.
 *
 * `lastModified` is the newest of createdAt, verifiedAt and the latest
 * price recordedAt because Part has no updatedAt column -- those three
 * are the only timestamps that move when a part's public page changes
 * (it appears, a human re-checks its specs, or its price is refreshed).
 *
 * Registered before the per-category loop, next to /categories: Express
 * matches in registration order, so literal paths stay ahead of the
 * generated and parametric (`/:slug/...`) ones and no future route can
 * shadow this one. (No category is named "sitemap", so today it is
 * hygiene rather than a live conflict.)
 */
router.get('/sitemap', async (_req, res) => {
  const newest = (...dates: (Date | null | undefined)[]): Date =>
    dates.filter((d): d is Date => d instanceof Date).reduce((a, b) => (b > a ? b : a));

  const perCategory = await Promise.all(
    Object.entries(CATEGORIES).map(async ([slug, config]) => {
      const rows: { partId: string; part: { createdAt: Date; verifiedAt: Date | null; prices: { recordedAt: Date }[] } }[] =
        await (prisma as any)[config.model].findMany({
          select: {
            partId: true,
            part: {
              select: {
                createdAt: true,
                verifiedAt: true,
                prices: { select: { recordedAt: true }, orderBy: { recordedAt: 'desc' }, take: 1 },
              },
            },
          },
        });
      return rows.map((r) => ({
        slug,
        partId: r.partId,
        // createdAt is non-null in the schema, so the reduce always has
        // at least one date and never sees an empty list.
        lastModified: newest(r.part.createdAt, r.part.verifiedAt, r.part.prices[0]?.recordedAt).toISOString(),
      }));
    })
  );

  // The catalogue only changes on import/verify passes, so an hour of
  // freshness with a day of stale-while-revalidate is plenty and spares
  // the DB a 27-table scan on every sitemap regeneration.
  res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.json(perCategory.flat());
});

for (const [slug, config] of Object.entries(CATEGORIES)) {
  const delegate = () => (prisma as any)[config.model];

  // LIST — parametric filters, then optional compatibility lockout.
  router.get(`/${slug}`, async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    let rows: any[];
    try {
      rows = await delegate().findMany({
        where: withDiscipline(config.filters(q), q),
        include: { part: true },
        // Explicit `nulls: 'last'` rather than relying on Postgres's default
        // (which happens to also be NULLS LAST for ASC, but that's an
        // implicit DB behaviour nothing in this codebase declares) --
        // priced parts sort by price as expected, and the growing share of
        // manufacturer-sourced parts with no published price fall to the
        // end rather than being placed by an undocumented assumption.
        ...(config.orderByPrice && { orderBy: { part: { basePricePence: { sort: 'asc', nulls: 'last' } } } }),
      });
    } catch (err) {
      // eq()/num() reject the malformed shapes they can detect without
      // knowing each field's legal values (arrays, oversized strings, non-
      // finite numbers) -- but a short, plausible-looking value that just
      // isn't a real enum member for this field (e.g. ?material=WOOD) can't
      // be caught without a per-field enum whitelist. Prisma itself throws
      // PrismaClientValidationError for exactly that case; catching it here
      // and returning it as a normal 400 keeps every filter-value crash on
      // any of the ~27 categories from surfacing as an opaque 500.
      if (err instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({ error: 'One or more filter values are not valid for this category.' });
        return;
      }
      throw err;
    }

    if (q.compatibleWith && config.lockout) {
      const build = await loadBuildFromDb(q.compatibleWith);
      // The engine reads brand/name off each candidate for its
      // message text, so they're merged down before filtering.
      const shaped = rows.map((r: any) => ({ ...r, brand: r.part.brand, name: r.part.name }));

      if (q.explain) {
        // Explain mode returns EVERY candidate annotated with whether it
        // fits and, when it doesn't, exactly which rules it breaks. Silent
        // lockout is fine in a dropdown; on a picker page it's better to
        // show the part greyed out with the reason than to pretend it
        // doesn't exist.
        const slots = SLUG_TO_SLOTS[slug] ?? [];
        const slot = (q.position === 'rear' ? slots[1] : slots[0]) ?? slots[0];
        rows = shaped.map((candidate: any) => {
          const hypothetical = { ...build, [slot]: candidate };
          const hypotheticalWarnings = getCompatibilityWarnings(hypothetical).filter((w) => w.components.includes(slot as any));
          const blockers = hypotheticalWarnings.filter((w) => w.severity === 'critical');
          // Same computation the row-level "warn" tint in BuilderMatrix
          // reads once a part is already chosen (e.g. a shifter that
          // bolts on fine but doesn't match the derailleur's speed count)
          // -- surfaced here too so the picker can flag it BEFORE it's
          // chosen, not just after. Still fully selectable: a warning
          // never removes a candidate from `fits`, only `critical` does.
          const warners = hypotheticalWarnings.filter((w) => w.severity === 'warning');
          return {
            ...candidate,
            compatible: blockers.length === 0,
            blockedBy: blockers.map((w) => ({ id: w.id, title: w.title, message: w.message })),
            warnedBy: warners.map((w) => ({ id: w.id, title: w.title, message: w.message, remedy: w.remedy })),
          };
        });
      } else {
        const kept = new Set(config.lockout(build, shaped, q).map((r: any) => r.partId));
        rows = rows.filter((r: any) => kept.has(r.partId));
      }
    }

    res.json(rows);
  });

  // DETAIL — includes full vendor price history.
  router.get(`/${slug}/:partId`, async (req, res) => {
    const row = await delegate().findUnique({
      where: { partId: req.params.partId },
      include: PRICE_INCLUDE,
    });
    if (!row) return res.status(404).json({ error: `Not found in ${slug}` });
    res.json(row);
  });
}

// ------------------------------------------------------------
// GET /parts/:slug/:partId/upgrade-path?compatibleWith=<buildId>
//
// "This part doesn't fit — what else would I have to change?"
//
// A blocking warning already names the other slots at fault in its
// `components`, so the conflicting slots are known. From there this
// searches that catalogue for a combination that clears every blocker,
// preferring the cheapest single-part fix before considering pairs.
// ------------------------------------------------------------

/** Loads a category's rows, shaped the way the engine expects. */
async function loadCandidates(slug: string): Promise<any[]> {
  const config = CATEGORIES[slug];
  if (!config) return [];
  const rows = await (prisma as any)[config.model].findMany({ include: { part: true } });
  return rows.map((r: any) => ({ ...r, brand: r.part.brand, name: r.part.name }));
}

/** Criticals that involve the slot we're trying to fill. */
function blockersFor(build: BikeBuild, slot: string): ReturnType<typeof getCompatibilityWarnings> {
  return getCompatibilityWarnings(build)
    .filter((w) => w.severity === 'critical' && w.components.includes(slot as any));
}

router.get('/:slug/:partId/upgrade-path', async (req, res) => {
  const { slug, partId } = req.params;
  const q = req.query as Record<string, string | undefined>;
  if (!q.compatibleWith) return res.status(400).json({ error: 'compatibleWith is required' });
  if (!CATEGORIES[slug]) return res.status(404).json({ error: `Unknown category ${slug}` });

  const build = await loadBuildFromDb(q.compatibleWith);
  const slots = SLUG_TO_SLOTS[slug] ?? [];
  const slot = (q.position === 'rear' ? slots[1] : slots[0]) ?? slots[0];

  const candidate = (await loadCandidates(slug)).find((c) => c.partId === partId);
  if (!candidate) return res.status(404).json({ error: 'Part not found' });

  const withCandidate: BikeBuild = { ...build, [slot]: candidate } as BikeBuild;
  const blockers = blockersFor(withCandidate, slot);

  if (blockers.length === 0) {
    return res.json({ fits: true, blockedBy: [], resolutions: [] });
  }

  // Every other slot named by a blocker is a candidate for changing —
  // except any the caller has pinned. The upgrade view pins the frame:
  // "just buy a different frame" is not advice about the bike you own.
  const pinned = new Set((q.exclude ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const conflictSlots = [...new Set(
    blockers.flatMap((w) => w.components as string[]).filter((s) => s !== slot)
  )].filter((s) => SLOT_TO_SLUG[s] && !pinned.has(s));

  const byConflictSlot = await Promise.all(
    conflictSlots.map(async (s) => ({ slot: s, slug: SLOT_TO_SLUG[s], options: await loadCandidates(SLOT_TO_SLUG[s]) }))
  );

  // The engine's build slots hold spec fields only — no pricing — so
  // the parts being replaced are priced up separately. Without this the
  // "extra cost" reads as the full price of the new part rather than
  // the difference.
  const currentPartIds = conflictSlots
    .map((s) => (build as any)[s]?.partId)
    .filter(Boolean) as string[];
  const currentParts = currentPartIds.length
    ? await prisma.part.findMany({ where: { id: { in: currentPartIds } } })
    : [];
  const currentPriceById = new Map(currentParts.map((p) => [p.id, p.basePricePence]));
  // Both stay `number | null`, not `?? 0` -- an unpublished price (the
  // normal state for a manufacturer-sourced part, which now covers most
  // of the catalogue) is a different fact from "this part is free", and
  // treating it as £0 fed a real bug: subtracting a real price from a
  // null-as-0 price produced a NEGATIVE extraCostPence, i.e. this endpoint
  // reported a cost *saving* for a replacement whose price is simply
  // unknown -- the literal opposite of the truth.
  const currentPriceOfSlot = (s: string): number | null => currentPriceById.get((build as any)[s]?.partId) ?? null;

  const price = (o: any): number | null => o?.part?.basePricePence ?? null;
  /** Difference, or null the moment either side's price is unknown -- never a guessed number. */
  const diff = (a: number | null, b: number | null): number | null => (a == null || b == null ? null : a - b);
  const sumDiffs = (parts: (number | null)[]): number | null =>
    parts.some((p) => p == null) ? null : (parts as number[]).reduce((s, p) => s + p, 0);
  const summarise = (s: string, o: any) => ({
    slot: s, categorySlug: SLOT_TO_SLUG[s], partId: o.partId,
    brand: o.part.brand, name: o.part.name, pricePence: o.part.basePricePence,
    replaces: (build as any)[s]
      ? { brand: (build as any)[s].brand, name: (build as any)[s].name }
      : null,
  });

  const resolutions: any[] = [];

  // 1. Single-part fixes — change one other thing and it works.
  for (const { slot: s, options } of byConflictSlot) {
    for (const option of options) {
      if ((build as any)[s]?.partId === option.partId) continue;
      const trial: BikeBuild = { ...withCandidate, [s]: option } as BikeBuild;
      if (blockersFor(trial, slot).length === 0) {
        resolutions.push({ changes: [summarise(s, option)], extraCostPence: diff(price(option), currentPriceOfSlot(s)) });
      }
    }
  }

  // 2. Only if nothing single-part works, look for a pair. Bounded
  //    deliberately: this is a helper, not a solver, and the search
  //    space grows fast with catalogue size.
  if (resolutions.length === 0 && byConflictSlot.length > 1) {
    const MAX_COMBOS = 400;
    let tried = 0;
    outer:
    for (let i = 0; i < byConflictSlot.length; i++) {
      for (let j = i + 1; j < byConflictSlot.length; j++) {
        for (const a of byConflictSlot[i].options) {
          for (const b of byConflictSlot[j].options) {
            if (++tried > MAX_COMBOS) break outer;
            const trial: BikeBuild = {
              ...withCandidate,
              [byConflictSlot[i].slot]: a,
              [byConflictSlot[j].slot]: b,
            } as BikeBuild;
            if (blockersFor(trial, slot).length === 0) {
              resolutions.push({
                changes: [summarise(byConflictSlot[i].slot, a), summarise(byConflictSlot[j].slot, b)],
                extraCostPence: sumDiffs([
                  diff(price(a), currentPriceOfSlot(byConflictSlot[i].slot)),
                  diff(price(b), currentPriceOfSlot(byConflictSlot[j].slot)),
                ]),
              });
              break outer;
            }
          }
        }
      }
    }
  }

  // 3. Still nothing, and more than two slots are implicated (an
  //    11-speed cassette on a 12-speed SRAM bike needs the chain,
  //    shifter AND wheel). Chip away greedily: fix the first blocker,
  //    re-check, repeat. Uses "fewer blockers than before" as the
  //    progress test, so it terminates rather than thrashing.
  if (resolutions.length === 0) {
    const optionsBySlot = new Map(byConflictSlot.map((c) => [c.slot, c.options]));
    let trial: BikeBuild = withCandidate;
    const changes: any[] = [];

    for (let step = 0; step < 6; step++) {
      const remaining = blockersFor(trial, slot);
      if (remaining.length === 0) break;

      let progressed = false;
      for (const conflicting of remaining[0].components as string[]) {
        if (conflicting === slot || !optionsBySlot.has(conflicting)) continue;
        for (const option of optionsBySlot.get(conflicting)!) {
          if ((trial as any)[conflicting]?.partId === option.partId) continue;
          const next: BikeBuild = { ...trial, [conflicting]: option } as BikeBuild;
          if (blockersFor(next, slot).length < remaining.length) {
            trial = next;
            changes.push(summarise(conflicting, option));
            progressed = true;
            break;
          }
        }
        if (progressed) break;
      }
      if (!progressed) break;
    }

    if (changes.length > 0 && blockersFor(trial, slot).length === 0) {
      resolutions.push({
        changes,
        extraCostPence: sumDiffs(changes.map((c) => diff(c.pricePence, currentPriceOfSlot(c.slot)))),
      });
    }
  }

  // Cheapest first — the useful ordering when the answer is "buy
  // something". A null extraCostPence (one of the parts involved has no
  // published price) sorts last rather than first: putting an
  // unknown-cost resolution at the top of "cheapest first" would read as
  // "this is free", which is worse than not sorting it at all.
  resolutions.sort((a, b) => {
    if (a.extraCostPence == null && b.extraCostPence == null) return 0;
    if (a.extraCostPence == null) return 1;
    if (b.extraCostPence == null) return -1;
    return a.extraCostPence - b.extraCostPence;
  });

  res.json({
    fits: false,
    blockedBy: blockers.map((w) => ({ id: w.id, title: w.title, message: w.message })),
    conflictSlots,
    resolutions: resolutions.slice(0, 5),
  });
});

export default router;
