// scripts/import/import-sourced-frames.ts
//
// Run with: npx tsx scripts/import/import-sourced-frames.ts
//
// Writes the five frame platforms sourced directly from Canyon,
// Cannondale and Trek's own pages (see the Aug 15 sourcing pass —
// scratchpad/99spokes-sourcing.html, and SESSION_LOG.md §12.5). Each
// platform is one physical mould shared across several 99 Spokes
// model-year/trim rows, grouped by (maker, family, material,
// suspension) per that methodology, not by a single model name.
//
// PROVENANCE
// ----------
// Every field below is either:
//   - "stated": read directly off a manufacturer page or corroborated
//     by 3+ independent component-brand spec sheets in the 99 Spokes
//     raw text.
//   - "derived": a reasonable reading of stated text that isn't a
//     verbatim number (e.g. "tapered 1-1/8in steerer" -> our tapered
//     enum), noted per field.
// Anything not confirmed is left null rather than guessed — the
// compatibility engine already treats null as "unknown" and stays
// quiet (see engine.ts's header comment). This run additionally
// resolved three fields the original pass left open:
//   - Canyon Grizl 6 (alloy) maxTyreWidthMm: 50mm, corroborated by two
//     independent MY2024-dated sources (opticycles.com's dated model
//     page + general 2024 reviews) rather than the MY2026-redesign
//     page the original pass flagged as unsafe to use here.
//   - Canyon Grizl 6 (alloy) hangerStandard, and Cannondale Topstone
//     (alloy) hangerStandard: genuinely could not be confirmed for the
//     ALLOY frame specifically — every source found talks about the
//     2025 TOPSTONE CARBON redesign or the 2026 GRIZL AL redesign, not
//     this platform. Left null. This is the correct outcome of the
//     "abstain rather than guess" rule, not an unfinished task.
//   - Cannondale Synapse Carbon MY2025 seatpostDiameterMm: resolved to
//     null, not 27.2mm. The 2025 Synapse replaced its round 27.2mm
//     post with a proprietary D-shaped aero post (shared with SuperSix
//     Evo) as part of a flattened seat-tube redesign — there is no
//     round diameter to record. See dataNotes on that frame.
//
// msrpPence is left null for every bike here. 99 Spokes carries a
// USD price for some rows, but converting that to a UK RRP would mean
// inventing an exchange rate and retail markup — exactly the kind of
// fabricated number this project's provenance system exists to rule
// out. Contrast with prisma/seed.ts's demo bikes, which use a labelled
// mechanical USD->GBP conversion and are explicitly marked as such.

import { PrismaClient, PartType } from '@prisma/client';

const prisma = new PrismaClient();

type FrameDetail = Record<string, unknown>;

type Platform = {
  brand: string;
  frameName: string;
  sourceUrl: string;
  dataSource: 'MANUFACTURER_SPEC' | 'RETAILER_LISTING';
  dataNotes: string;
  detail: FrameDetail;
  discipline: string;
  bikes: { model: string; year: number; variant?: string }[];
};

const PLATFORMS: Platform[] = [
  {
    brand: 'Canyon',
    frameName: 'Grizl CF (2024-2025)',
    sourceUrl: 'https://www.canyon.com/en-gb/gravel-bikes/adventure/grizl/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: bbShellStandard (BB86, "PF 86,5" -- file and canyon.com agree), rearAxleType, ' +
      'wheelDiameter, maxTyreWidthMm (54mm stated), hangerStandard (UDH, manufacturer-confirmed -- ' +
      'the 99 Spokes hanger column itself is blank for this row), seatpostDiameterMm (27.2mm). ' +
      'DERIVED (not verbatim): headsetTaper from "tapered, 1-1/8in upper" in two reviews (lower ' +
      'diameter not stated, only the tapered value exists in our enum); rearBrakeMountType from ' +
      'flat mount being universal on this class, not an explicit spec line. ' +
      'NOT SET: geometry (reach/stack/standover), chainstay length, fork travel, shock figures -- ' +
      'not part of this sourcing pass. bbShellWidthMm left null: BB86 corresponds to an 86.5mm ' +
      'shell in the raw spec text, but our enum member is named for the nominal 86mm class and no ' +
      'other BB86 frame in this catalogue sets a width either -- see R-BB-03, which no-ops when null.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 54,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Grizl CF SL 8 AXS', year: 2025 },
      { model: 'Grizl CF SLX 8 Di2 GRC', year: 2025 },
      { model: 'Grizl CF SLX 8 Di2', year: 2024 },
      { model: 'Grizl CF SL 8 1by', year: 2024 },
      { model: 'Grizl CF SL 6 AXS', year: 2024 },
      { model: 'Grizl CF SL 8 Eagle', year: 2025 },
      { model: 'Grizl CF SL 8 Eagle', year: 2024, variant: '2024' },
      { model: 'Grizl CF SLX 8 Di2 GRC', year: 2024, variant: '2024' },
      { model: 'Grizl CF SL 8 1by EKAR', year: 2024 },
      { model: 'Grizl CF SL 7 eTap', year: 2024 },
      { model: 'Grizl CF SL 7', year: 2024 },
      { model: 'Grizl CF SLX 8 EKAR', year: 2024 },
    ],
  },
  {
    brand: 'Canyon',
    frameName: 'Grizl 6 (Aluminium, 2024-2025)',
    sourceUrl: 'https://www.canyon.com/en-gb/gravel-bikes/adventure/grizl/',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: bbShellStandard (BB86, corroborated across 4 independent component brands -- ' +
      'Token, FSA, SRAM, Shimano -- all stating "PF 86,5" for this mould). This is MY2024-2025 ' +
      'only: Canyon redesigned the aluminium Grizl for 2026 to T47 threaded, and its current ' +
      'product page describes that redesign, not these bikes -- do not carry BB86 forward to a ' +
      '2026+ row. maxTyreWidthMm (50mm) corroborated by two independent MY2024-dated sources ' +
      '(opticycles.com\'s dated model page, general 2024 reviews) -- NOT the 54mm figure that ' +
      'only appears on the current MY2026 page, which is a different frame. seatpostDiameterMm ' +
      '(27.2mm) and rearAxleType stated. DERIVED: headsetTaper from "standard 1-1/8in steerer" ' +
      '(no "tapered" wording, unlike the CF -- read as straight); rearBrakeMountType as flat mount, ' +
      'not an explicit line. UNRESOLVED, left null rather than guessed: hangerStandard -- every ' +
      'source found for "Grizl UDH" describes either the carbon CF (already recorded separately ' +
      'above) or the 2026 aluminium redesign; nothing manufacturer-sourced confirms UDH on this ' +
      'specific MY2024-2025 alloy mould, and the 99 Spokes hanger column is blank for every row here.',
    discipline: 'gravel',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: 'STRAIGHT_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 50,
      hangerStandard: null,
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Grizl 5', year: 2025 },
      { model: 'Grizl 6 RAW', year: 2024 },
      { model: 'Grizl 7 RAW', year: 2024 },
      { model: 'Grizl 7', year: 2024 },
      { model: 'Grizl 6 1BY', year: 2024 },
      { model: 'Grizl 6', year: 2024 },
      { model: 'Grizl 8 1by', year: 2024 },
      { model: 'Grizl 7 1by', year: 2024 },
      { model: 'Grizl 5', year: 2024, variant: '2024' },
    ],
  },
  {
    brand: 'Cannondale',
    frameName: 'Topstone (Aluminium, 2024-2025)',
    sourceUrl: 'https://www.cannondale.com/en-gb/bikes/gravel-adventure/topstone/topstone-1',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: bbShellStandard (BSA_68, "Shimano BSA 68" / "SRAM DUB BSA Wide" stated directly on ' +
      'most rows), rearAxleType, wheelDiameter, maxTyreWidthMm (45mm), rearBrakeMountType (flat ' +
      'mount, stated), seatpostDiameterMm (27.2mm). DERIVED: headsetTaper from "tapered headtube" ' +
      'wording -- exact taper spec (e.g. 1.5 to 1-1/8in vs a different split) not numbered anywhere ' +
      'found, so this assumes the industry-standard tapered pairing our enum offers. UNRESOLVED, ' +
      'left null rather than guessed: hangerStandard -- every "Topstone UDH" source found describes ' +
      'the 2025 TOPSTONE CARBON, a separate, newly-redesigned frame launched the same year (road.cc: ' +
      '"revamped Topstone Carbon"); nothing found confirms UDH specifically for this alloy mould, ' +
      'and derailleurhanger.com only has a hanger listed for 2019-2021 Topstone AL (hanger 488, pre- ' +
      'dating UDH entirely) with no 2022-2025 entry either way.',
    discipline: 'gravel',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 45,
      hangerStandard: null,
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Topstone EQ', year: 2025 },
      { model: 'Topstone 1', year: 2025 },
      { model: 'Topstone 2 GRX - 2x', year: 2025 },
      { model: 'Topstone 2 CUES - 1x', year: 2025 },
      { model: 'Topstone 3', year: 2025 },
      { model: 'Topstone 2', year: 2024 },
      { model: 'Topstone 4', year: 2024 },
      { model: 'Topstone 1', year: 2024, variant: '2024' },
      { model: 'Topstone 0', year: 2024 },
      { model: "Topstone Women's 2", year: 2024 },
      { model: 'Topstone Apex 1', year: 2024 },
      { model: 'Topstone LTD', year: 2024 },
      { model: 'Topstone 3', year: 2024, variant: '2024' },
      { model: 'Topstone 2 CUES - 1x', year: 2024, variant: '2024' },
      { model: 'Topstone 2 GRX - 2x', year: 2024, variant: '2024' },
    ],
  },
  {
    brand: 'Cannondale',
    frameName: 'Synapse Carbon (2025)',
    sourceUrl: 'https://www.cannondale.com/en/bikes/road/endurance/synapse-carbon/synapse-carbon-4/2025',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'Scoped to MY2025 only -- the 2024 rows in this mould still mix BSA and BB30a shells (one ' +
      'confirmed Ai-offset outlier), so "family" alone would not be one physical frame there; not ' +
      'safe to cover with this spec. CHECKED: bbShellStandard (BSA_68), rearAxleType, headsetTaper ' +
      '("Integrated, 1-1/8in-1-1/2in" stated), rearBrakeMountType, wheelDiameter, hangerStandard ' +
      '(UDH, stated). DERIVED: maxTyreWidthMm (42mm) from a single general-search source, not a ' +
      'direct product-page fetch -- treat as the weakest field on this platform. ' +
      'RESOLVED, not left as originally recorded: seatpostDiameterMm is null, not 27.2mm. The 2025 ' +
      'Synapse replaced its round 27.2mm post with a proprietary D-shaped aero post (shared design ' +
      'language with SuperSix Evo) as part of a flattened seat-tube redesign -- "last year\'s round ' +
      '27.2mm-diameter post has also given way to a D-shaped profile" (nminus1bikes.substack.com ' +
      'overview). There is no round diameter to record for this frame; a standard round seatpost ' +
      'will not fit it at all, which is itself worth surfacing once this schema can express ' +
      'proprietary post profiles -- for now, null correctly signals "not a standard round post" ' +
      'rather than implying compatibility with anything.',
    discipline: 'endurance',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 42,
      hangerStandard: 'UDH',
      dropoutType: 'UDH',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Synapse Carbon 4', year: 2025 },
      { model: 'Synapse Carbon 2', year: 2025 },
      { model: 'Synapse Carbon 1', year: 2025 },
      { model: 'Synapse Carbon 5', year: 2025 },
      { model: 'Synapse LAB71 SmartSense', year: 2025 },
    ],
  },
  {
    brand: 'Trek',
    frameName: 'Checkpoint SL/SLR (Gen 2-3, 2024-2025)',
    sourceUrl: 'https://www.trekbikes.com/gb/en_GB/bikes/gravel-bikes/checkpoint/checkpoint-sl/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'Was blocked on the missing T47_85_5 enum value (BbShellStandard) -- now unblocked, that ' +
      'migration having landed separately. All 13 bikes in this platformKey (Trek::Checkpoint:: ' +
      'Carbon::Rigid, spanning SL and SLR trims and Gen 2/Gen 3 labels) state identical raw bottom- ' +
      'bracket text -- "T47 threaded, internal bearing" -- across every single row, corroborating ' +
      'one shared shell platform regardless of trim or the Gen 2/Gen 3 label. CHECKED: ' +
      'bbShellStandard (T47_85_5), headsetTaper, rearBrakeMountType, wheelDiameter, maxTyreWidthMm ' +
      '(50mm), hangerStandard (UDH), seatpostDiameterMm (27.2mm), all stated. DERIVED: rearAxleType ' +
      '-- consistent across every listing checked but not confirmed as Gen-3-specific; if a Gen 2 ' +
      'variant differs, this is the field most likely to be wrong. bbShellWidthMm intentionally left ' +
      'null: the shell is 85.5mm, which the Int field cannot represent -- the enum member name ' +
      '(T47_85_5) already carries the width, and R-BB-03 (the separate width-match rule) no-ops ' +
      'when null on either side, so nothing is lost by leaving it unset.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'T47_85_5',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 50,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Checkpoint SL 5 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 7 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 6 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 6 AXS', year: 2024 },
      { model: 'Checkpoint SL 7 AXS', year: 2024 },
      { model: 'Checkpoint SL 7 AXS Gen 2', year: 2024 },
      { model: 'Checkpoint SL 6 AXS Gen 2', year: 2024 },
      { model: 'Checkpoint SLR 7', year: 2024 },
      { model: 'Checkpoint SL 5', year: 2024 },
      { model: 'Checkpoint SL 5 Gen 2', year: 2024 },
      { model: 'Checkpoint SLR 6 AXS', year: 2024 },
      { model: 'Checkpoint SLR 9 AXS', year: 2024 },
      { model: 'Checkpoint SLR 7 AXS', year: 2024 },
    ],
  },
];

function slugify(...parts: (string | number)[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  let framesCreated = 0;
  let framesSkipped = 0;
  let bikesCreated = 0;
  let bikesSkipped = 0;

  for (const platform of PLATFORMS) {
    let frameId: string;
    const existingFrame = await prisma.part.findFirst({
      where: { type: PartType.FRAME, brand: platform.brand, name: platform.frameName },
    });

    if (existingFrame) {
      frameId = existingFrame.id;
      framesSkipped++;
      console.log(`= frame exists, skipping: ${platform.brand} ${platform.frameName}`);
    } else {
      const part = await prisma.part.create({
        data: {
          type: PartType.FRAME,
          brand: platform.brand,
          name: platform.frameName,
          weightGrams: 0,
          basePricePence: null,
          dataSource: platform.dataSource,
          sourceUrl: platform.sourceUrl,
          dataNotes: platform.dataNotes,
          frame: { create: platform.detail as any },
        },
      });
      frameId = part.id;
      framesCreated++;
      console.log(`+ frame created: ${platform.brand} ${platform.frameName}`);
    }

    for (const bike of platform.bikes) {
      const variant = bike.variant ?? null;
      const slug = slugify(platform.brand, bike.model, variant ?? '', bike.year);

      const existingBike = await prisma.bikeModel.findFirst({
        where: { brand: platform.brand, model: bike.model, year: bike.year, variant },
      });
      if (existingBike) {
        bikesSkipped++;
        continue;
      }

      await prisma.bikeModel.create({
        data: {
          brand: platform.brand,
          model: bike.model,
          year: bike.year,
          variant,
          slug,
          msrpPence: null,
          discipline: platform.discipline,
          parts: { create: [{ partId: frameId, slot: null }] },
        },
      });
      bikesCreated++;
    }
  }

  console.log(
    `\nDone. Frames: ${framesCreated} created, ${framesSkipped} already existed. ` +
    `Bikes: ${bikesCreated} created, ${bikesSkipped} already existed.`
  );
  console.log(
    '\nEvery BikeModel row here has exactly one part (its frame). This is deliberate, not ' +
    'partial data left by mistake: only frame geometry was sourced and verified for these ' +
    'platforms so far. Populating full stock builds (groupset, wheels, cockpit per individual ' +
    'trim) is separate work, tracked as "population" in SESSION_LOG.md, and would need its own ' +
    'per-trim sourcing pass rather than being inferred from the frame.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
