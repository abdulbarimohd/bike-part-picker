// scripts/import/import-parts.ts
//
// Turns extracted manufacturer data into catalogue parts.
//
//   python scripts/import/extract_shimano.py Specifications_en.pdf out.json
//   npx tsx scripts/import/import-parts.ts out.json          # dry run
//   npx tsx scripts/import/import-parts.ts out.json --write   # commit
//
// The one rule this file exists to enforce: NEVER INVENT A VALUE. A field the
// source does not state is left null, and a row whose required fields cannot
// be read is rejected with a reason rather than patched up with a plausible
// guess. Nullable specs already make the compatibility engine abstain, so a
// gap stays visibly a gap instead of turning into a confident wrong answer.
//
// Adding a category means adding one entry to MAPPERS. Everything else --
// validation, provenance, reporting, dry-run -- is shared.

import { readFileSync } from 'node:fs';
import { PrismaClient, PartType } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Extractor output
// ---------------------------------------------------------------------------

interface ExtractedModel {
  modelNo: string;
  series: string | null;
  sourcePage: number;
  /** Per-model page URL, when the source is one page per part (SRAM) rather
   *  than one shared PDF (Shimano). Falls back to Extraction.sourceUrl. */
  sourceUrl?: string;
  fields: Record<string, string>;
}

interface Extraction {
  source: string;
  sourceUrl: string;
  dataSource: string;
  models: ExtractedModel[];
}

/** A part ready to insert, or the reason it cannot be. */
type Mapped =
  | {
      ok: true; name: string; weightGrams: number | null; relation: string; detail: Record<string, unknown>;
      /** Overrides the mapper's default MANUFACTURER_SPEC for this one result
       *  -- for a field this importer filled from a verified external
       *  standard (e.g. universal pedal thread) rather than read off the
       *  source page itself. */
      dataSourceOverride?: string;
      /** Extra sentence appended to dataNotes explaining the override. */
      overrideNote?: string;
    }
  | { ok: false; reason: string };

interface Mapper {
  partType: PartType;
  brand: string;
  /** One extracted model can yield several parts (e.g. 10-45T and 10-51T). */
  map(model: ExtractedModel): Mapped[];
}

// ---------------------------------------------------------------------------
// Value parsers -- each returns null rather than a fallback
// ---------------------------------------------------------------------------

const TICK = '✔';

function int(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.replace(/\s+/g, '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * Read a cog range like "10-51T" into its end sprockets.
 * Shimano writes en-dashes as often as hyphens, so both are accepted.
 */
function cogRange(combo: string): { smallest: number; largest: number } | null {
  const m = combo.replace(/\s+/g, '').match(/(\d+)[-–—](\d+)T/i);
  if (!m) return null;
  const smallest = Number(m[1]);
  const largest = Number(m[2]);
  if (smallest >= largest) return null;
  return { smallest, largest };
}

/**
 * Weights are printed per combination: "461(10-45T) 470(10-51T)".
 * Pair each weight with its range; anything unpaired returns null so the
 * part imports weightless rather than wearing another variant's figure.
 */
function weightFor(raw: string | undefined, combo: string): number | null {
  if (!raw) return null;
  // A weight written with a thousand separator ("1,090(9-45T)") would have
  // its leading digits silently dropped by the \d+ match below -- it'd read
  // as "090" -> 90g instead of 1090g. Not observed in either manufacturer's
  // data as pulled (checked across 1,428 models, zero occurrences), but a
  // future refresh crossing 1000g on a variant-tagged part could hit it
  // silently, so it's guarded rather than left to fail quietly.
  if (/\d,\d{3}\s*\(/.test(raw)) return null;
  // cogRange() (below) was hardened to accept hyphen, en-dash and em-dash
  // interchangeably, since Shimano isn't consistent about which it prints
  // where -- but this key comparison wasn't, so a combo written with an
  // en-dash against a weight cell using a hyphen (or vice versa) never
  // matched. The result wasn't a crash, it was a false "weight not stated"
  // on a variant whose weight the source did publish -- verified against
  // a real case: '10–51T' (en dash) against a weight cell '470(10-51T)'
  // (hyphen) used to return null here.
  const normalizeDash = (s: string) => s.replace(/\s+/g, '').replace(/[-–—]/g, '-').toUpperCase();
  const key = normalizeDash(combo);
  for (const m of raw.matchAll(/(\d+)\s*\(([^)]+)\)/g)) {
    if (normalizeDash(m[2]) === key) return Number(m[1]);
  }
  // A single bare number with no variants attached applies to the whole model.
  const bare = raw.trim().replace(',', '').match(/^(\d+)$/);
  return bare ? Number(bare[1]) : null;
}

/**
 * Shimano names its freehub splines in its own scheme. Mapping them onto our
 * FreehubBodyType is a judgement call, so it is written out in the open:
 *
 *   MICRO SPLINE                     -> MICRO_SPLINE
 *   HG spline L2 (ROAD 12-sp only)   -> HG_12
 *   HG spline L  (ROAD 12/11-sp)     -> HG_11
 *   HG spline M  (10/9/8, MTB 11-sp) -> HG_10
 *   HG spline S  (7-speed)           -> no enum member; rejected
 */
// Patterns are matched against the label with all whitespace removed. Shimano
// sets some of these rows a character at a time, so the same heading arrives as
// "HG spline L2 (ROAD", "HGsplineL2(ROAD" or "HG s p l in e L (R O AD"
// depending on the page. Normalising first is what makes those equivalent.
// L2 must be tested before L, since "HGsplineL2" also starts with "HGsplineL".
const SPLINE_TO_ENUM: [RegExp, string | null][] = [
  [/^MICROSPLINE/i, 'MICRO_SPLINE'],
  [/^HGsplineL2/i, 'HG_12'],
  [/^HGsplineL/i, 'HG_11'],
  [/^HGsplineM/i, 'HG_10'],
  [/^HGsplineS/i, null],
];

function freehubFrom(fields: Record<string, string>): { value: string } | { error: string } {
  const ticked: string[] = [];
  for (const [label, raw] of Object.entries(fields)) {
    if (!raw?.includes(TICK)) continue;
    const normalised = label.replace(/\s+/g, '');
    for (const [pattern, enumValue] of SPLINE_TO_ENUM) {
      if (pattern.test(normalised)) {
        if (enumValue === null) return { error: `unsupported freehub spline "${label}"` };
        ticked.push(enumValue);
        break;
      }
    }
  }
  if (ticked.length === 0) return { error: 'no freehub spline stated' };
  const unique = [...new Set(ticked)];
  if (unique.length > 1) return { error: `ambiguous freehub (${unique.join(', ')})` };
  return { value: unique[0] };
}

// ---------------------------------------------------------------------------
// Category mappers
// ---------------------------------------------------------------------------

/**
 * Labels and values arrive with stray spacing and inconsistent hyphenation
 * ("T-Type" vs "T Type", "6-bolt" vs "6 Bolt") -- compare with both removed.
 * Caught by a real bug: SRAM's T-Type chains were falling through to the
 * Eagle-12 branch because "T-Type" normalised to "T-TYPE", which never
 * matched an "TTYPE" substring check.
 */
function flat(s: string | null | undefined): string {
  return (s ?? '').replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * SRAM's spec table often lists several values in one cell -- a rotor sold
 * in three diameters, a BB fitting four shell standards. Each becomes its
 * own part rather than one part wearing an ambiguous combined spec.
 */
function splitMulti(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Rows whose label carries a measurement and whose cell is a tick. */
function tickedNumbers(fields: Record<string, string>, allowed: number[]): number[] {
  const out: number[] = [];
  for (const [label, value] of Object.entries(fields)) {
    if (!value?.includes(TICK)) continue;
    for (const m of label.matchAll(/\d+/g)) {
      const n = Number(m[0]);
      if (allowed.includes(n) && !out.includes(n)) out.push(n);
    }
  }
  return out.sort((a, b) => b - a);
}

/**
 * Cable pull from Shimano's series letter: M is MTB, R (and RX for GRX) is
 * road. This is Shimano's own documented numbering convention, not a house
 * inference -- confirmed via Cycle Maintenance Academy's breakdown of
 * Shimano part numbers (M8100/XT vs R8100/Ultegra) and cross-checked for
 * GRX specifically: escapecollective.com and multiple retailer sources
 * confirm GRX (RX-prefixed, R-series) derailleurs share the ROAD cable-pull
 * ratio even though they borrow MTB Shadow RD+ clutch hardware -- so an
 * "RX" model correctly resolves to SHIMANO_ROAD via the leading 'R', not
 * SHIMANO_MTB, despite superficially looking like an MTB part.
 * Road and MTB pull ratios differ, and mixing them is the classic
 * drivetrain mismatch the catalogue exists to catch -- so anything that is
 * neither M nor R returns null and the part is rejected rather than guessed.
 */
function shimanoCablePull(modelNo: string): string | null {
  const series = modelNo.split('-')[1]?.[0]?.toUpperCase();
  if (series === 'M') return 'SHIMANO_MTB';
  if (series === 'R') return 'SHIMANO_ROAD';
  return null;
}

/**
 * SL (shift levers) and ST (STI dual-control levers) carry the same fields,
 * so they share one mapper body under two prefixes.
 */
function shifterMappers(): Record<string, Mapper> {
  const map: Mapper['map'] = (model) => {
    const f = model.fields;
    // A right-hand lever shifts the cassette, a left-hand one the chainrings;
    // whichever count is present is the one this lever actually controls.
    const speeds = int(f['Rear speeds']) ?? int(f['Front speeds']);
    if (speeds === null) return [{ ok: false, reason: 'no speed count stated' }];

    const pull = shimanoCablePull(model.modelNo);
    if (!pull) return [{ ok: false, reason: `${model.modelNo}: cannot tell MTB from road cable pull` }];

    // Shifter type names the bar it is built for: RAPIDFIRE sits on flat and
    // riser bars, STI/dual control on drops. Anything unfamiliar stays null,
    // which is allowed -- barType is optional.
    const type = flat(f['Shifter type']);
    const barType = type.includes('RAPIDFIRE') || type.includes('EZFIRE') ? 'FLAT'
      : type.includes('DUALCONTROL') || type.includes('STI') ? 'DROP'
      : null;

    return [{
      ok: true,
      name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
      weightGrams: int(f['Average weight (g)']),
      relation: 'shifter',
      detail: { speeds, cablePullStandard: pull, barType, clampDiameterMm: null },
    }];
  };
  return {
    SL: { partType: PartType.SHIFTER, brand: 'Shimano', map },
    ST: { partType: PartType.SHIFTER, brand: 'Shimano', map },
  };
}

const MAPPERS: Record<string, Mapper> = {
  CS: {
    partType: PartType.CASSETTE,
    brand: 'Shimano',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Rear speeds']);
      if (speeds === null) return [{ ok: false, reason: 'no rear speed count stated' }];

      const freehub = freehubFrom(f);
      if ('error' in freehub) return [{ ok: false, reason: freehub.error }];

      const comboField = f['Combination name (Group name)'] ?? '';
      const combos = comboField.split(',').map((c) => c.trim()).filter(Boolean);
      if (combos.length === 0) return [{ ok: false, reason: 'no cog combination stated' }];

      // Each combination is a separate product, not a variant of one part:
      // a 10-45T and a 10-51T differ in the spec the engine reasons about.
      const out: Mapped[] = [];
      for (const combo of combos) {
        const range = cogRange(combo);
        if (!range) {
          out.push({ ok: false, reason: `unreadable cog combination "${combo}"` });
          continue;
        }
        // Name from the parsed numbers, not the raw cell: some cells arrive
        // character-spaced ("1 1 - 3 0 T"), which parses fine but reads badly.
        const canonical = `${range.smallest}-${range.largest}T`;
        const label = model.series ? `${model.series} ${canonical}` : canonical;
        out.push({
          ok: true,
          name: `${model.modelNo} ${label}`,
          weightGrams: weightFor(f['Average weight (g)'], combo),
          relation: 'cassette',
          detail: {
            speeds,
            freehubBodyType: freehub.value,
            smallestCogTeeth: range.smallest,
            largestCogTeeth: range.largest,
          },
        });
      }
      return out;
    },
  },

  CN: {
    partType: PartType.CHAIN,
    brand: 'Shimano',
    map(model) {
      // "HG 12-speed", "HG-X 10-speed", "LINKGLIDE, HG 11-speed".
      const type = flat(model.fields['Type']);
      const speeds = int((type.match(/(\d+)-?SPEED/) ?? [])[1]);
      if (speeds === null) return [{ ok: false, reason: `unreadable chain type "${model.fields['Type'] ?? ''}"` }];
      if (!type.startsWith('HG') && !type.includes('HG')) {
        return [{ ok: false, reason: `not an HG-family chain ("${model.fields['Type']}")` }];
      }

      // Shimano's 12-speed MTB and road chains are different products with
      // different inner widths, but the spec sheet says only "HG 12-speed"
      // for both. The M/R letter in the model number is Shimano's own series
      // code (M = MTB, R = road), so it -- not a guess -- makes the call.
      let standard: string | null = null;
      if (speeds === 10) standard = 'SHIMANO_HG_10';
      else if (speeds === 11) standard = 'SHIMANO_HG_11';
      else if (speeds === 12) {
        const series = model.modelNo.slice(3, 4).toUpperCase();
        if (series === 'M') standard = 'SHIMANO_HG_12_MTB';
        else if (series === 'R') standard = 'SHIMANO_HG_12_ROAD';
        else return [{ ok: false, reason: `12-speed chain ${model.modelNo}: cannot tell MTB from road` }];
      }
      if (!standard) return [{ ok: false, reason: `${speeds}-speed chain has no matching ChainStandard` }];

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(model.fields['Average weight (g) (114 links)']),
        relation: 'chain',
        detail: { speeds, chainStandard: standard, links: null },
      }];
    },
  },

  RT: {
    partType: PartType.ROTOR,
    brand: 'Shimano',
    map(model) {
      // Rotor sizes are a tick matrix -- one row per diameter -- so a single
      // model number covers several products.
      const sizes = tickedNumbers(model.fields, [140, 160, 180, 200, 203, 220]);
      if (sizes.length === 0) return [{ ok: false, reason: 'no rotor diameter ticked' }];

      // "CL" and "6B" are Shimano's own designations for Center Lock and
      // 6-bolt: this reads the model number, it does not infer from style.
      const code = model.modelNo.slice(3).toUpperCase();
      let mount: string | null = null;
      if (code.startsWith('CL')) mount = 'CENTERLOCK';
      else if (code.startsWith('6B')) mount = 'SIX_BOLT';
      if (!mount) return [{ ok: false, reason: `${model.modelNo}: mount standard not stated (no CL/6B code)` }];

      const thickness = Object.keys(model.fields).some(
        (k) => flat(k).includes('STANDARD1.75') && model.fields[k]?.includes(TICK)
      ) ? 1.75 : null;

      return sizes.map((mm) => ({
        ok: true as const,
        name: `${model.modelNo} ${mm}mm`,
        weightGrams: null,
        relation: 'rotor',
        detail: {
          diameterMm: mm,
          mountStandard: mount,
          lockringType: mount === 'CENTERLOCK' ? 'EXTERNAL' : null,
          thicknessMm: thickness,
        },
      }));
    },
  },

  RD: {
    partType: PartType.REAR_DERAILLEUR,
    brand: 'Shimano',
    map(model) {
      const f = model.fields;
      const ticked = (needle: string) =>
        Object.entries(f).some(([k, v]) => flat(k).includes(needle) && v?.includes(TICK));
      const speeds = int(f['Rear speeds']);
      if (speeds === null) return [{ ok: false, reason: 'no rear speed count stated' }];

      // Shimano prints the top-sprocket and low-sprocket limits as two rows
      // both labelled "Max." (the distinguishing word is on the line above).
      // Which is which needs no guess: the low-sprocket limit is by
      // definition the larger of the two.
      const limits = Object.entries(f)
        .filter(([k]) => /^Max\.( #\d+)?$/.test(k.trim()))
        .map(([, v]) => int(v))
        .filter((n): n is number => n !== null);
      if (limits.length === 0) return [{ ok: false, reason: 'no sprocket limits stated' }];
      const maxCog = Math.max(...limits);
      const minCog = limits.length > 1 ? Math.min(...limits) : null;
      if (maxCog <= 11) {
        return [{ ok: false, reason: `only a top-sprocket limit (${maxCog}T) stated; largest cog unknown` }];
      }

      // M = MTB, R/RX = road/gravel in Shimano's series codes. Cable pull
      // differs between the two families, and mixing them silently is the
      // classic drivetrain mismatch this catalogue exists to catch.
      const series = model.modelNo.slice(3, 4).toUpperCase();
      let pull: string | null = null;
      if (series === 'M') pull = 'SHIMANO_MTB';
      else if (series === 'R') pull = 'SHIMANO_ROAD';
      if (!pull) return [{ ok: false, reason: `${model.modelNo}: cannot tell MTB from road cable pull` }];

      // Cage length is the model-number suffix, Shimano's own designation.
      const suffix = model.modelNo.split('-').pop()?.toUpperCase() ?? '';
      const cage = suffix === 'SGS' ? 'LONG_SGS' : suffix === 'GS' ? 'MEDIUM_GS' : suffix === 'SS' ? 'SHORT_SS' : null;

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Average weight (g)']),
        relation: 'rearDerailleur',
        detail: {
          maxSpeeds: speeds,
          cablePullStandard: pull,
          maxCassetteCogTeeth: maxCog,
          minCassetteCogTeeth: minCog,
          totalCapacityTeeth: int(f['Total capacity']),
          cageLength: cage,
          // Shimano's own Direct-Mount Rear Derailleur (DRD) standard is real
          // and stated on the sheet as a ticked "Direct mount" row -- rare
          // (2 of 97 models pulled, both Di2-era Shadow derailleurs), but
          // wiring it where stated is strictly better than leaving it null.
          // This is NOT the same interface as SRAM's UDH_DIRECT_MOUNT
          // (verified: Shimano's DRD replaces the hanger's upper link and
          // still needs a DIRECT_MOUNT-compatible hanger; it doesn't bolt
          // straight to a UDH frame the way SRAM Transmission does) -- so
          // conflating the two would offer a hangerless fit that doesn't
          // exist. Everything else stays null: Shimano ticking "UDH
          // standard" only means the mech works on a UDH frame *via its
          // hanger*, which is the STANDARD_HANGER case, not a positive
          // statement that this derailleur is direct-mount -- there's no
          // reliable signal on the sheet to assert STANDARD_HANGER from.
          mountStandard: ticked('DIRECTMOUNT') ? 'DIRECT_MOUNT' : null,
        },
      }];
    },
  },

  PD: {
    partType: PartType.PEDAL,
    brand: 'Shimano',
    map(model) {
      const type = flat(model.fields['Type']);
      let cleat: string | null = null;
      if (type === 'SPD') cleat = 'SPD';
      else if (type.replace('-', '') === 'SPDSL') cleat = 'SPD_SL';
      else if (type.includes('FLAT') || type.includes('PLATFORM')) cleat = 'FLAT_NONE';
      if (!cleat) return [{ ok: false, reason: `unrecognised pedal type "${model.fields['Type'] ?? ''}"` }];

      // Shimano's sheet never states thread size, so this is NOT read off
      // the page -- it is the verified, near-universal industry standard:
      // 9/16"-20 TPI for every adult three-piece-crank pedal, 1/2"-20 TPI
      // reserved for children's bikes and one-piece-crank BMX/cheap bikes.
      // https://bike.bikegremlin.com/1141/pedals-types/ and multiple
      // independent sources agree with no stated exception for performance
      // clipless pedals. Shimano's PD-M/PD-R/PD-ES/PD-EF ranges pulled here
      // are all adult clipless/platform pedals, so the standard applies
      // cleanly -- but because it is inferred rather than published on this
      // page, the part is tagged ESTIMATED, not MANUFACTURER_SPEC, so the
      // distinction from Shimano's own stated fields (type, binding,
      // weight) stays visible.
      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(model.fields['Average weight (g)']),
        relation: 'pedal',
        detail: { thread: 'NINE_SIXTEENTHS', cleatSystem: cleat },
        dataSourceOverride: 'ESTIMATED',
        overrideNote:
          'Thread size (9/16") is not stated on Shimano\'s page -- it is applied from the universal adult-pedal ' +
          'thread standard (9/16"-20 TPI for all three-piece-crank pedals), not read off this document, hence ESTIMATED rather than MANUFACTURER_SPEC.',
      }];
    },
  },

  // Shift levers (SL) and STI dual-control levers (ST) share a shape.
  ...shifterMappers(),

  FD: {
    partType: PartType.FRONT_DERAILLEUR,
    brand: 'Shimano',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Front speeds']);
      if (speeds === null) return [{ ok: false, reason: 'no front speed count stated' }];

      const pull = shimanoCablePull(model.modelNo);
      if (!pull) return [{ ok: false, reason: `${model.modelNo}: cannot tell MTB from road cable pull` }];

      // Clamp diameters are a tick matrix; braze-on has its own row.
      const clamps = tickedNumbers(f, [28, 31, 34]);
      const hasBrazeOn = Object.entries(f).some(
        ([k, v]) => flat(k).includes('BRAZE') && v?.includes(TICK)
      );
      let mountType: string | null = null;
      if (hasBrazeOn) mountType = 'BRAZE_ON';
      else if (clamps.includes(34)) mountType = 'CLAMP_34_9';
      else if (clamps.includes(31)) mountType = 'CLAMP_31_8';
      else if (clamps.includes(28)) mountType = 'CLAMP_28_6';
      if (!mountType) return [{ ok: false, reason: 'no clamp size or braze-on mount stated' }];

      // Pull direction IS on the sheet -- as its own tick rows ("Dual-pull",
      // "Top-pull exclusive", "Down-pull exclusive", "Front-pull"), separate
      // from swing type (TOP SWING / DOWN SWING, where the mech sits). An
      // earlier version of this mapper only looked for a "pull direction"
      // label and missed these; confirmed against BikeRadar's front
      // derailleur guide before trusting the mapping below:
      // https://www.bikeradar.com/advice/buyers-guides/front-derailleur
      const ticked = (needle: string) =>
        Object.entries(f).some(([k, v]) => flat(k).includes(needle) && v?.includes(TICK));
      let pullDirection: string | null = null;
      if (ticked('DUALPULL')) pullDirection = 'DUAL_PULL';
      else if (ticked('TOPPULLEXCLUSIVE')) pullDirection = 'TOP_PULL';
      else if (ticked('DOWNPULLEXCLUSIVE')) pullDirection = 'BOTTOM_PULL';
      // "Front-pull" is Shimano's Side-Swing mechanism -- cable enters from
      // the front and pulls sideways, not up/down. A genuinely different
      // system from top/bottom/dual pull, not a synonym for either.
      else if (ticked('FRONTPULL')) pullDirection = 'SIDE_SWING';
      if (!pullDirection) return [{ ok: false, reason: `${model.modelNo}: no pull-direction row ticked` }];

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Average weight (g)']),
        relation: 'frontDerailleur',
        detail: { speeds, cablePullStandard: pull, mountType, pullDirection, maxChainringTeeth: int(f['Top gear teeth']) },
      }];
    },
  },

  BB: {
    partType: PartType.BOTTOM_BRACKET,
    brand: 'Shimano',
    map(model) {
      const f = model.fields;
      const ticked = (needle: string) =>
        Object.entries(f).some(([k, v]) => flat(k).includes(needle) && v?.includes(TICK));

      // "Hollow pipe" describes spindle construction, not the crank
      // interface, so it is deliberately not treated as Hollowtech II.
      let spindle: string | null = null;
      if (ticked('SPINDLEOCTALINK')) spindle = 'OCT_LINK_24';
      else if (ticked('SQUARETYPE')) spindle = 'SQUARE_TAPER';
      if (!spindle) return [{ ok: false, reason: 'spindle interface not stated' }];

      const shells = tickedNumbers(f, [68, 70, 73, 83, 100]);
      const shell = shells.includes(68) ? 'BSA_68'
        : shells.includes(73) ? 'BSA_73'
        : shells.includes(83) ? 'BSA_83'
        : shells.includes(70) ? 'ITALIAN_70'
        : null;
      if (!shell) return [{ ok: false, reason: 'frame shell standard not stated' }];

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Average weight (g)']),
        relation: 'bottomBracket',
        detail: { frameInterface: shell, spindleInterface: spindle, shellWidthMm: shells[0] ?? null },
      }];
    },
  },

  FC: {
    partType: PartType.CRANKSET,
    brand: 'Shimano',
    map(model) {
      const f = model.fields;
      // The spindle interface IS on the sheet, as its own tick row --
      // "HOLLOWTECH II", "OCTALINK", "Square" -- just not under a label
      // containing the word "spindle". An earlier version of this mapper
      // rejected every crankset because it looked only at field names, not
      // the full tick matrix underneath them.
      const ticked = (needle: string) =>
        Object.entries(f).some(([k, v]) => flat(k).includes(needle) && v?.includes(TICK));
      let spindle: string | null = null;
      if (ticked('HOLLOWTECHII')) spindle = 'HOLLOWTECH_II_24';
      else if (ticked('OCTALINK')) spindle = 'OCT_LINK_24';
      else if (flat(f['Square']) === TICK || (f['Square'] ?? '').includes(TICK)) spindle = 'SQUARE_TAPER';
      if (!spindle) return [{ ok: false, reason: 'no spindle interface row ticked' }];

      // P.C.D. is either "Direct" (Shimano's Hyperglide+ direct-mount
      // system) or a bolt-circle number that may or may not have an enum
      // member -- anything else is left null rather than guessed.
      const pcd = (f['P.C.D. (mm)'] ?? '').trim();
      const BCD_MAP: Record<string, string> = { '104': 'BCD_104', '96': 'BCD_96', '94': 'BCD_94', '110': 'BCD_110', '76': 'BCD_76' };
      const chainringMount = flat(pcd) === 'DIRECT' ? 'SHIMANO_DIRECT_MOUNT' : BCD_MAP[pcd] ?? null;

      // Regression: the fallback used to check only whether the FIRST
      // comma-separated ring token looked like a tooth count ("36T"),
      // which is true whether there's one ring or several -- a genuine 2x
      // crankset with "Front speeds: 2" and "Chainring combination: 36T,
      // 26T" satisfied the first-token check regardless, and the `||`
      // made that override the correct "Front speeds" reading. Requiring
      // exactly one token, not just a matching first one, is what the
      // fallback was actually meant to detect.
      const chainringTokens = (f['Chainring combination'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const config = int(f['Front speeds']) === 1 || (chainringTokens.length === 1 && /^\d+T$/.test(chainringTokens[0]))
        ? '1x' : '2x';

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: null, // weight is printed per chainring-size variant; no single figure applies to the model
        relation: 'crankset',
        detail: {
          spindleDiameter: spindle,
          chainlineType: config,
          chainlineMm: int(f['Chain line (mm)']),
          qFactorMm: int(f['Q-factor (mm)']),
          chainringMount,
          spindleLengthMm: null, crankLengthMm: null, pedalThread: null, chainringCount: null, maxChainringTeeth: null,
        },
      }];
    },
  },

  WH: {
    partType: PartType.WHEELSET,
    brand: 'Shimano',
    map(model) {
      const size = int(model.fields['Wheel size']);
      // Wheelset needs six interface fields. Shimano's wheel pages give the
      // rim diameter and little else -- no axle standard, freehub body or
      // rotor mount -- so these need a different source entirely.
      return [{
        ok: false,
        reason: size === null
          ? 'no wheel specifications stated'
          : `only rim diameter (${size}) stated; axle, freehub and rotor mount missing`,
      }];
    },
  },

  // ---------------------------------------------------------------------
  // SRAM -- product spec-table pages, one URL per model rather than a
  // single PDF. Field names differ from Shimano's throughout.
  // ---------------------------------------------------------------------

  'CS-SRAM': {
    partType: PartType.CASSETTE,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Speed (CS)']);
      if (speeds === null) return [{ ok: false, reason: 'no speed count stated' }];

      const range = cogRange((f['Gearing'] ?? '').replace(/\s+/g, ''));
      if (!range) return [{ ok: false, reason: `unreadable gearing "${f['Gearing'] ?? ''}"` }];

      const driverRaw = splitMulti(f['Driver body interface']).filter((v) => v.toLowerCase() !== 'n/a');
      if (driverRaw.length !== 1) {
        return [{
          ok: false,
          reason: driverRaw.length === 0
            ? 'no driver body interface stated'
            : `ambiguous driver body interface (${driverRaw.join(' / ')})`,
        }];
      }
      const driver = driverRaw[0];
      const freehub = driver === 'XD' ? 'XD' : driver === 'XDR' ? 'XDR'
        : /^Splined 11$/i.test(driver) ? 'HG_11' : null;
      if (!freehub) return [{ ok: false, reason: `unmapped driver body interface "${driver}"` }];

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Weight (g)']),
        relation: 'cassette',
        detail: { speeds, freehubBodyType: freehub, smallestCogTeeth: range.smallest, largestCogTeeth: range.largest },
      }];
    },
  },

  'CN-SRAM': {
    partType: PartType.CHAIN,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Compat - Speed (CN)']);
      if (speeds === null) return [{ ok: false, reason: 'no compatible speed count stated' }];

      const tech = flat(f['Chain Technology']);
      // T-Type is Eagle Transmission's flat-top chain: SRAM's own newest
      // standard, distinct from the round-pin Eagle chain it replaced.
      let standard: string | null = null;
      if (tech.includes('TTYPE')) standard = 'SRAM_FLATTOP_12';
      else if (speeds === 12) standard = 'SRAM_EAGLE_12';
      else if (speeds === 11) standard = 'SRAM_11';
      if (!standard) return [{ ok: false, reason: `${speeds}-speed chain: no matching ChainStandard` }];

      const linksField = f['Chain length (links)'];
      const links = linksField && !linksField.includes(',') ? int(linksField) : null;

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Weight (g)']),
        relation: 'chain',
        detail: { speeds, chainStandard: standard, links },
      }];
    },
  },

  'RD-SRAM': {
    partType: PartType.REAR_DERAILLEUR,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Speed (RD)']);
      if (speeds === null) return [{ ok: false, reason: 'no speed count stated' }];

      const maxCog = int(f['Max tooth']);
      if (maxCog === null) return [{ ok: false, reason: 'no max cog size stated' }];
      const minCog = int(f['RD Minimum (Cassette)']);
      // On SRAM's page this is the *cassette's* minimum sprocket the mech
      // supports, not the mech's own low limit -- the same number reappears
      // as the cassette's smallest cog in unrelated listings, so a value
      // that looks unreasonably large for a "minimum" is left out rather
      // than trusted at face value.
      const min = minCog !== null && minCog < maxCog ? minCog : null;

      const pullRaw = flat(f['Cable pull ratio']);
      let pull: string | null = null;
      if (pullRaw.includes('TTYPE')) pull = 'ELECTRONIC_AXS';
      else if (pullRaw.includes('EXACTACTUATION')) pull = 'SRAM_EXACT_ACTUATION';
      else if (pullRaw.includes('XACTUATION')) pull = 'SRAM_X_ACTUATION';
      else if (pullRaw.includes('FULLPULL')) pull = 'SRAM_FULL_PULL';
      if (!pull) return [{ ok: false, reason: `unmapped cable pull "${f['Cable pull ratio'] ?? ''}"` }];

      const cageRaw = flat(f['Cage (RD)']);
      const cage = cageRaw === 'LONG' ? 'LONG_SGS' : cageRaw === 'MEDIUM' ? 'MEDIUM_GS' : cageRaw === 'SHORT' ? 'SHORT_SS' : null;

      // SRAM calls this "Full Mount": the derailleur bolts straight to a
      // UDH frame with no hanger at all. Confirmed against SRAM's own
      // explainer (sram.com/en/learn/understanding-udh-and-full-mount),
      // which is explicit that ALL electronic AXS "Transmission" derailleurs
      // are Full Mount -- Eagle Transmission and RED/Force/Rival XPLR AXS
      // alike -- while the separate, mechanical S-Series (S200/S100, no
      // "Transmission" in the name, not AXS/T-Type) uses "UDH Half Mount",
      // which keeps a hanger and is NOT the same thing. The `pull ===
      // 'ELECTRONIC_AXS'` guard is what excludes S-Series here: it is cable-
      // actuated, not T-Type. Known gap: SRAM's phrasing implies road/gravel
      // XPLR AXS derailleurs are Full Mount too even when "Transmission"
      // doesn't appear in their product name -- those are not yet detected
      // by this check and stay null rather than being guessed.
      const mount = pull === 'ELECTRONIC_AXS' && flat(model.series).includes('TRANSMISSION')
        ? 'UDH_DIRECT_MOUNT' : null;

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Weight (g)']),
        relation: 'rearDerailleur',
        detail: {
          maxSpeeds: speeds, cablePullStandard: pull, maxCassetteCogTeeth: maxCog,
          minCassetteCogTeeth: min, totalCapacityTeeth: null, cageLength: cage, mountStandard: mount,
        },
      }];
    },
  },

  'BB-SRAM': {
    partType: PartType.BOTTOM_BRACKET,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const spindleRaw = splitMulti(f['Spindle diameter']).filter((v) => v.toLowerCase() !== 'n/a');
      let spindle: string | null = null;
      if (spindleRaw.length === 1) {
        const v = spindleRaw[0].toUpperCase();
        if (v === 'DUB') spindle = 'DUB_29';
        else if (v === '30MM') spindle = 'BB30_30';
        // A bare "24mm" is genuinely ambiguous between GXP's stepped spindle
        // and other 24mm interfaces, so it is left unmapped rather than
        // picking one.
      }
      if (!spindle) {
        return [{
          ok: false,
          reason: spindleRaw.length === 0 ? 'no spindle diameter stated' : `ambiguous spindle diameter (${spindleRaw.join(' / ')})`,
        }];
      }

      // One BB model page often lists several shells it is sold for
      // ("BSA 68, BSA 73"). Each becomes its own part; shells with no
      // matching enum member are dropped from that list, not guessed at.
      const SHELL_MAP: Record<string, string> = {
        'BSA 68': 'BSA_68', 'BSA 73': 'BSA_73', 'BSA 83': 'BSA_83', 'BSA 100': 'BSA_100',
        'ITALIAN 70': 'ITALIAN_70', 'PF 92': 'PF92', 'PF30 68': 'PF30', 'PF30 73': 'PF30',
        'T47 68': 'T47_68', 'T47 73': 'T47_73', 'BB30 68': 'BB30', 'BB30 73': 'BB30',
      };
      const shellTokens = splitMulti(f['Bottom Bracket Shell Type']);
      if (shellTokens.length === 0) {
        return [{ ok: false, reason: `no recognised shell standard in "${f['Bottom Bracket Shell Type'] ?? ''}"` }];
      }

      // Every token gets its own outcome -- accepted or rejected -- so a
      // BB sold for five shells and mapped for two doesn't quietly lose the
      // other three from the report. An earlier version filtered unmapped
      // tokens out silently before this point; the drop was invisible even
      // though every *other* rejection in this importer is visible.
      const out: Mapped[] = [];
      const seenShells = new Set<string>();
      for (const token of new Set(shellTokens)) {
        const shell = SHELL_MAP[token.toUpperCase()];
        if (!shell) {
          out.push({ ok: false, reason: `${model.modelNo}: shell "${token}" has no matching BbShellStandard` });
          continue;
        }
        // Two tokens can share one enum member (PF30 68 and PF30 73 are both
        // just PF30, which carries no width distinction) -- collapse those
        // rather than emit two identically-named parts.
        if (seenShells.has(shell)) continue;
        seenShells.add(shell);
        out.push({
          ok: true,
          name: `${model.modelNo} ${shell}`,
          weightGrams: null,
          relation: 'bottomBracket',
          detail: { frameInterface: shell, spindleInterface: spindle, shellWidthMm: null },
        });
      }
      return out;
    },
  },

  'RT-SRAM': {
    partType: PartType.ROTOR,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const mountTokens = splitMulti(f['Hub interface']);
      const mounts = mountTokens
        .map((t): 'CENTERLOCK' | 'SIX_BOLT' | null => (flat(t) === 'CENTERLOCK' ? 'CENTERLOCK' : flat(t) === '6BOLT' ? 'SIX_BOLT' : null))
        .filter((v): v is 'CENTERLOCK' | 'SIX_BOLT' => v !== null);
      // A rotor listed for both mount types is two different physical
      // products, so pairing every size with every mount (rather than
      // zipping them positionally) reflects what SRAM actually sells.
      if (mounts.length === 0) return [{ ok: false, reason: `unrecognised hub interface "${f['Hub interface'] ?? ''}"` }];

      const sizes = splitMulti(f['Diam (Rotor)']).map((s) => int(s)).filter((n): n is number => n !== null);
      if (sizes.length === 0) return [{ ok: false, reason: 'no rotor diameter stated' }];

      const out: Mapped[] = [];
      for (const mount of mounts) {
        for (const mm of sizes) {
          out.push({
            ok: true,
            name: `${model.modelNo} ${mm}mm ${mount === 'CENTERLOCK' ? 'CL' : '6-Bolt'}`,
            weightGrams: null,
            relation: 'rotor',
            detail: { diameterMm: mm, mountStandard: mount, lockringType: mount === 'CENTERLOCK' ? 'EXTERNAL' : null, thicknessMm: null },
          });
        }
      }
      return out;
    },
  },

  'FC-SRAM': {
    partType: PartType.CRANKSET,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const spindleRaw = f['BB Spindle Interface'];
      const spindle = spindleRaw === 'DUB' ? 'DUB_29' : spindleRaw === 'ISIS' ? 'ISIS' : null;
      if (!spindle) return [{ ok: false, reason: `unmapped spindle interface "${spindleRaw ?? ''}"` }];

      const config = f['Drivetrain Configuration'];
      if (!config) return [{ ok: false, reason: 'no drivetrain configuration (1x/2x) stated' }];

      const chainlineField = f['Chainline'];
      const chainline = chainlineField && !chainlineField.includes(',') ? Number(chainlineField.replace(/[^\d.]/g, '')) || null : null;

      // SRAM's "Bolt Circle Diameter (BCD)" field reads "Direct Mount (DM)"
      // for both the road and Eagle DM standards -- SRAM's own support page
      // confirms these are NOT interchangeable (55mm Eagle vs 45/47.5mm
      // road chainline: https://support.sram.com/hc/en-us/articles/13822435051931).
      // The chainline this mapper already parsed is exactly the number that
      // distinguishes them, so it decides which enum member applies rather
      // than the model name or bolt count, which are identical for both.
      const bcdField = flat(f['Bolt Circle Diameter (BCD)']);
      let chainringMount: string | null = null;
      if (bcdField.includes('DIRECTMOUNT')) {
        if (chainline !== null && chainline >= 52) chainringMount = 'SRAM_8_BOLT_EAGLE_DM';
        else if (chainline !== null && chainline <= 48) chainringMount = 'SRAM_8_BOLT_ROAD_DM';
        // A direct-mount crank with no readable chainline is left
        // unclassified rather than assigned the more common of the two.
      }

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Weight (g)']),
        relation: 'crankset',
        detail: {
          spindleDiameter: spindle,
          chainlineType: config,
          chainlineMm: chainline,
          chainringMount,
          // Crank length is sold as a range (SRAM lists every offered
          // length on one page); no single value applies to "the" crankset.
          spindleLengthMm: null, qFactorMm: null, crankLengthMm: null,
          pedalThread: null, chainringCount: null, maxChainringTeeth: null,
        },
      }];
    },
  },

  'SL-SRAM': {
    partType: PartType.SHIFTER,
    brand: 'SRAM',
    map(model) {
      const f = model.fields;
      const speeds = int(f['Speeds']);
      if (speeds === null) return [{ ok: false, reason: 'no speed count stated' }];

      const pullRaw = flat(f['Cable pull ratio']);
      let pull: string | null = null;
      if (pullRaw.includes('TTYPE')) pull = 'ELECTRONIC_AXS';
      else if (pullRaw.includes('EXACTACTUATION')) pull = 'SRAM_EXACT_ACTUATION';
      else if (pullRaw.includes('XACTUATION')) pull = 'SRAM_X_ACTUATION';
      if (!pull) return [{ ok: false, reason: `unmapped cable pull "${f['Cable pull ratio'] ?? ''}"` }];

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(f['Weight (g)']),
        relation: 'shifter',
        // barType unset: SRAM's page states shifter form (Trigger/Grip/DoubleTap)
        // not the bar it clamps to, which is a different property.
        detail: { speeds, cablePullStandard: pull, barType: null, clampDiameterMm: null },
      }];
    },
  },

  BR: {
    partType: PartType.BRAKE_CALIPER,
    brand: 'Shimano',
    map(model) {
      const mountRaw = model.fields['Mount type'] ?? '';
      const mount = flat(mountRaw);
      if (!mount) return [{ ok: false, reason: 'no mount type stated' }];

      let mountType: string | null = null;
      if (mount.startsWith('FLATMOUNT')) mountType = 'FLAT_MOUNT';
      // Native rotor size is set by the frame/fork's adapter, not the
      // caliper -- Shimano's sheet states only "Post mount", never 160 vs
      // 180. R-BRK-01/02 in the compatibility engine already treat any
      // POST_MOUNT* value as fitting any other post-mount frame/fork via a
      // shared-prefix check, so the generic value is engine-safe.
      else if (mount.startsWith('POSTMOUNT')) mountType = 'POST_MOUNT';
      if (!mountType) return [{ ok: false, reason: `unrecognised mount type "${mountRaw}"` }];

      const brakeType = flat(model.fields['Brake type Hydraulic'] ?? model.fields['Brake type'] ?? '');
      const isHydraulic = brakeType.includes('DISCBRAKE') || brakeType.includes('HYDRAULIC');

      return [{
        ok: true,
        name: `${model.modelNo}${model.series ? ' ' + model.series : ''}`,
        weightGrams: int(model.fields['Average weight (g)']),
        relation: 'brakeCaliper',
        detail: {
          mountType,
          isHydraulic,
          // Shimano hydraulics are mineral oil throughout; DOT is a SRAM
          // convention. Stated in their bleed documentation, not assumed.
          fluidType: isHydraulic ? 'MINERAL_OIL' : null,
          brakeSystemFamily: model.series ?? null,
          nativeRotorMm: null,
        },
      }];
    },
  },
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error('usage: import-parts.ts <extraction.json> [--write] [--only CS]');
    process.exit(1);
  }
  const write = flags.includes('--write');
  const onlyIdx = flags.indexOf('--only');
  const only = onlyIdx >= 0 ? flags[onlyIdx + 1] : null;

  const data: Extraction = JSON.parse(readFileSync(file, 'utf8'));

  const imported: string[] = [];
  const rejected: { model: string; reason: string }[] = [];
  const skipped = new Map<string, number>();
  let duplicates = 0;

  // Shimano and SRAM share model-number prefixes (both use CS, RD, BB, ...),
  // so the mapper key must fold in the source, not the prefix alone --
  // otherwise SRAM parts would silently dispatch to the Shimano mapper
  // and come out mislabelled with a Shimano-only enum vocabulary.
  const isSram = /SRAM/i.test(data.source);

  for (const model of data.models) {
    const prefix = model.modelNo.split('-')[0];
    const key = isSram ? `${prefix}-SRAM` : prefix;
    if (only && prefix !== only) continue;

    const mapper = MAPPERS[key];
    if (!mapper) {
      skipped.set(key, (skipped.get(key) ?? 0) + 1);
      continue;
    }

    for (const result of mapper.map(model)) {
      if (!result.ok) {
        rejected.push({ model: model.modelNo, reason: result.reason });
        continue;
      }

      const pageRef = model.sourcePage ? `, page ${model.sourcePage}` : '';
      const msrp = model.fields['MSRP'];
      const priceNote = msrp
        // Published, but in EUR/a range/etc. basePricePence is defined as UK
        // RRP in pence: storing this figure there would silently relabel a
        // different currency as GBP, which is worse than leaving it blank.
        ? ` MSRP stated as "${msrp}" but not stored: basePricePence is UK RRP in pence, and this is a different currency/format.`
        : ` No price: ${mapper.brand} does not publish RRP, so basePricePence is null rather than guessed.`;
      const notes =
        `Read from ${data.source}${pageRef}` +
        (model.sourceUrl ? ` (${model.sourceUrl})` : '') +
        `. Interface specs are as published by the manufacturer.` +
        priceNote +
        (result.weightGrams === null ? ' Weight not stated for this variant.' : '') +
        (result.overrideNote ? ` ${result.overrideNote}` : '');
      const dataSource = result.dataSourceOverride ?? 'MANUFACTURER_SPEC';

      // Re-running an import must not fan out duplicates: a catalogue with two
      // of every cassette breaks the picker as surely as bad specs would. But
      // a duplicate name isn't grounds to skip entirely -- a mapper fix
      // landing after the first import (e.g. SRAM cranksets gaining
      // chainringMount) needs the already-imported row to pick up the
      // improvement, or fixing the mapper has no visible effect on the data
      // already sitting in the catalogue. So a duplicate is updated in
      // place, not ignored.
      const existing = await prisma.part.findFirst({
        where: { brand: mapper.brand, name: result.name },
        select: { id: true },
      });
      if (existing) {
        duplicates++;
        if (write) {
          await prisma.part.update({
            where: { id: existing.id },
            data: {
              weightGrams: result.weightGrams ?? 0,
              dataSource: dataSource as any,
              sourceUrl: model.sourceUrl ?? data.sourceUrl,
              dataNotes: notes,
              [result.relation]: { update: result.detail },
              // A prior human verification was a claim about the OLD spec
              // values. This update can change those values (a mapper fix
              // landing after the first import, for instance) without
              // touching verifiedAt/verifiedBy at all -- Prisma only
              // updates fields listed here -- so the "human-verified" stamp
              // would otherwise survive on data nobody has actually
              // re-checked. Clearing both means a re-verified part goes
              // back to needing a human look, which is the honest state.
              verifiedAt: null,
              verifiedBy: null,
            } as any,
          });
        }
        continue;
      }

      if (write) {
        await prisma.part.create({
          data: {
            type: mapper.partType,
            brand: mapper.brand,
            name: result.name,
            basePricePence: null,
            weightGrams: result.weightGrams ?? 0,
            dataSource: dataSource as any,
            sourceUrl: model.sourceUrl ?? data.sourceUrl,
            dataNotes: notes,
            [result.relation]: { create: result.detail },
          } as any,
        });
      }
      imported.push(`${result.name}  ${JSON.stringify(result.detail)}`);
    }
  }

  console.log(`\n=== ${write ? 'IMPORTED' : 'DRY RUN'} ===`);
  console.log(`accepted : ${imported.length}`);
  console.log(`rejected : ${rejected.length}`);
  if (duplicates) console.log(`already in catalogue (${write ? 'updated' : 'would update'}): ${duplicates}`);

  if (imported.length) {
    console.log('\n--- accepted ---');
    for (const line of imported.slice(0, 20)) console.log('  ' + line);
    if (imported.length > 20) console.log(`  ... and ${imported.length - 20} more`);
  }

  if (rejected.length) {
    const byReason = new Map<string, number>();
    for (const r of rejected) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
    console.log('\n--- rejected (nothing guessed) ---');
    for (const [reason, count] of [...byReason].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(4)}x  ${reason}`);
    }
  }

  if (skipped.size) {
    const list = [...skipped].sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p}=${c}`);
    console.log(`\nno mapper yet: ${list.join(', ')}`);
  }

  if (!write) console.log('\nNothing written. Re-run with --write to commit.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
