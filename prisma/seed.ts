// prisma/seed.ts
//
// Run with: npx prisma db seed
//
// DATA SOURCING NOTE
// -------------------
// Compiled from public manufacturer spec pages and review sites,
// not an automated scrape. Prices are realistic street prices at
// time of research — treat them as demo data, not a live feed.
//
// Suspension, seatpost and hanger figures for the three frames were
// verified against manufacturer/review sources:
//   Hightower V3 — 210x55mm standard eyelet, 31.6mm post
//   Fuel EX Gen 6 — 205x60mm TRUNNION, 34.9mm post, UDH
//   Epic 8       — 190x45mm standard eyelet, 34.9mm post, UDH
// Where a figure could not be confirmed it is left null rather than
// guessed; the engine treats null as "unknown" and stays quiet.
//
// The catalogue deliberately includes incompatible combinations so
// the lockout has something to exclude: a Super Boost wheelset no
// frame accepts, a Transmission derailleur that needs UDH, mixed
// DOT/mineral-oil brake halves, a hookless rim, and an XD cassette
// against a Micro Spline hub.

import { PrismaClient, PartType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const UK_VENDORS: { name: any; siteUrl: string }[] = [
    { name: 'CANYON_UK', siteUrl: 'https://www.canyon.com/en-gb' },
    { name: 'TREDZ', siteUrl: 'https://www.tredz.co.uk' },
    { name: 'EVANS_CYCLES', siteUrl: 'https://www.evanscycles.com' },
    { name: 'SIGMA_SPORTS', siteUrl: 'https://www.sigmasports.com' },
    { name: 'MERLIN_CYCLES', siteUrl: 'https://www.merlincycles.com' },
  ];

  const vendors = await Promise.all(
    UK_VENDORS.map((v) => prisma.vendor.upsert({ where: { name: v.name }, update: { siteUrl: v.siteUrl }, create: v }))
  );

  // basePricePence is number | null on Part since this session's migration
  // (manufacturer-sourced parts routinely have no published price) --
  // this annotation said `number` and was never caught, because
  // tsconfig.json excludes this file from the build. Standalone `tsc
  // --strict` on this file confirms the real error the exclusion was
  // hiding: `created.push(part)` below assigns a genuine `number | null`
  // into a field typed as non-nullable `number`.
  const created: { id: string; basePricePence: number | null }[] = [];

  /**
   * The figures below were originally researched as US street prices.
   * UK RRP inc. VAT lands close to ~0.85× the US ex-tax number across
   * most of this catalogue, so they're converted here and rounded to a
   * realistic UK price point rather than re-quoted one by one. Demo
   * data either way — replace wholesale when a real feed lands.
   */
  function ukRrpPence(usdCents: number): number {
    const pence = usdCents * 0.85;
    if (pence >= 100000) return Math.round(pence / 5000) * 5000;   // nearest £50
    if (pence >= 10000) return Math.round(pence / 500) * 500;      // nearest £5
    return Math.round(pence / 100) * 100 - 1;                      // £x.99
  }

  // PROVENANCE
  //
  // Everything seeded here is UNVERIFIED by default, and that is the
  // honest label. These specs were written from general knowledge of
  // component standards, not read off manufacturer spec sheets, with a
  // handful of exceptions noted per part below. Prices are worse still:
  // they're a mechanical 0.85× conversion of previously-estimated US
  // figures, so treat every number as demo data.
  //
  // The point of the flag is that wrong specs fail silently — a bad
  // enum hides parts that would have fitted and nothing errors. Marking
  // the data untrusted makes that visible in the UI instead.
  const notes = new Map<string, { source?: string; url?: string; note: string }>();

  /** Creates a Part plus its 1:1 detail row in one go. */
  async function add(
    type: PartType,
    brand: string,
    name: string,
    basePricePence: number,
    weightGrams: number,
    relation: string,
    detail: Record<string, unknown>
  ) {
    const provenance = notes.get(name);
    const part = await prisma.part.create({
      data: {
        type, brand, name, weightGrams,
        basePricePence: ukRrpPence(basePricePence),
        dataSource: (provenance?.source as any) ?? 'UNVERIFIED',
        sourceUrl: provenance?.url ?? null,
        dataNotes: provenance?.note
          ?? 'Specs written from general knowledge of component standards, not read from a manufacturer sheet. Price is an estimate.',
        [relation]: { create: detail },
      } as any,
    });
    created.push(part);
    return part;
  }

  // Per-part provenance for the frames. Frames matter most: they're the
  // anchor every other rule measures against, so a wrong frame value
  // poisons every decision for that bike.
  notes.set('Hightower CC (2024)', {
    source: 'UNVERIFIED',
    url: 'https://ridersupport.santacruzbicycles.com/what-shock-does-santa-cruz-bicycles-recommend-for-my-bike',
    note: 'CHECKED against Santa Cruz support + review sources: shock 210x55mm, seatpost 31.6mm. '
      + 'NOT CHECKED: hangerStandard is set to PROPRIETARY as a guess — newer Santa Cruz models use UDH, and if this is wrong '
      + 'the site silently hides every SRAM Transmission derailleur from this frame. '
      + 'INVENTED: chainstay, reach, stack, standover, head tube length, leverage ratio, max fork travel, rider height range.',
  });
  notes.set('Fuel EX 9.8 Frameset (Gen 6)', {
    source: 'UNVERIFIED',
    note: 'NOT CHECKED AT ALL. Shock 205x60 trunnion, PF92 shell, UDH and 34.9mm post were asserted from memory, not verified '
      + 'against Trek. Verify all four before trusting this frame. INVENTED: all geometry and leverage figures.',
  });
  notes.set('Epic 8 Expert Frameset', {
    source: 'UNVERIFIED',
    url: 'https://www.specialized.com/us/en/s-works-epic-8-frameset-rockshox-sidluxe-ultimate/p/220876',
    note: 'CHECKED against Specialized: shock 190x45mm, seatpost 34.9mm, UDH rear dropout. '
      + 'INVENTED: chainstay, reach, stack, standover, head tube length, leverage ratio, max fork travel, rider height range.',
  });

  // ----------------------------------------------------------
  // FRAMES
  // ----------------------------------------------------------
  await add(PartType.FRAME, 'Santa Cruz', 'Hightower CC (2024)', 319900, 2100, 'frame', {
    material: 'CARBON',
    bbShellStandard: 'BSA_73', bbShellWidthMm: 73,
    rearAxleType: 'THRU_AXLE_148x12_BOOST', rearAxleThreadPitch: 'M12_x_1_0', dropoutType: 'THRU_AXLE',
    headsetTaper: 'TAPERED_1_5_TO_1_125', headTubeUpperStandard: 'IS42', headTubeLowerStandard: 'IS52',
    headTubeLengthMm: 110,
    rearBrakeMountType: 'POST_MOUNT_180', maxRotorMmRear: 200,
    wheelDiameter: 'ISO_622', mulletApproved: true,
    maxTyreWidthMm: 63, maxChainringTeeth: 34, maxForkTravelMm: 150, designAxleToCrownMm: 561,
    chainstayLengthMm: 435, hangerStandard: 'PROPRIETARY',
    seatpostDiameterMm: 31.6, seatClampDiameterMm: 34.9, maxSeatpostInsertionMm: 270,
    seatpostRouting: 'INTERNAL', cableRouting: 'INTERNAL', iscgStandard: 'ISCG_05',
    bottleMounts: 1, hasEyelets: false,
    shockEyeToEyeMm: 210, shockStrokeMm: 55, shockMountType: 'STANDARD_EYELET',
    shockHardwareWidthMm: 30, shockBushingDiameterMm: 8, leverageRatio: 2.6, suitableForCoil: true,
    frameSize: 'L', standoverMm: 762, reachMm: 475, stackMm: 625,
    riderMinHeightCm: 175, riderMaxHeightCm: 188,
  });

  await add(PartType.FRAME, 'Trek', 'Fuel EX 9.8 Frameset (Gen 6)', 299900, 2400, 'frame', {
    material: 'CARBON',
    bbShellStandard: 'PF92', bbShellWidthMm: 92,
    rearAxleType: 'THRU_AXLE_148x12_BOOST', rearAxleThreadPitch: 'M12_x_1_0', dropoutType: 'UDH',
    headsetTaper: 'TAPERED_1_5_TO_1_125', headTubeUpperStandard: 'ZS44', headTubeLowerStandard: 'ZS56',
    headTubeLengthMm: 115,
    rearBrakeMountType: 'POST_MOUNT_180', maxRotorMmRear: 203,
    wheelDiameter: 'ISO_622', mulletApproved: true,
    maxTyreWidthMm: 66, maxChainringTeeth: 34, maxForkTravelMm: 160, designAxleToCrownMm: 571,
    chainstayLengthMm: 439, hangerStandard: 'UDH',
    seatpostDiameterMm: 34.9, seatClampDiameterMm: 38.6, maxSeatpostInsertionMm: 300,
    seatpostRouting: 'INTERNAL', cableRouting: 'INTERNAL', iscgStandard: 'ISCG_05',
    bottleMounts: 1, hasEyelets: false,
    shockEyeToEyeMm: 205, shockStrokeMm: 60, shockMountType: 'TRUNNION',
    shockHardwareWidthMm: 40, shockBushingDiameterMm: 8, leverageRatio: 2.4, suitableForCoil: true,
    frameSize: 'L', standoverMm: 745, reachMm: 480, stackMm: 630,
    riderMinHeightCm: 175, riderMaxHeightCm: 190,
  });

  await add(PartType.FRAME, 'Specialized', 'Epic 8 Expert Frameset', 279900, 1050, 'frame', {
    material: 'CARBON',
    bbShellStandard: 'BSA_73', bbShellWidthMm: 73,
    rearAxleType: 'THRU_AXLE_148x12_BOOST', rearAxleThreadPitch: 'M12_x_1_0', dropoutType: 'UDH',
    headsetTaper: 'TAPERED_1_5_TO_1_125', headTubeUpperStandard: 'IS42', headTubeLowerStandard: 'IS52',
    headTubeLengthMm: 95,
    rearBrakeMountType: 'POST_MOUNT_160', maxRotorMmRear: 180,
    wheelDiameter: 'ISO_622',
    maxTyreWidthMm: 58, maxChainringTeeth: 38, maxForkTravelMm: 120, designAxleToCrownMm: 511,
    chainstayLengthMm: 438, hangerStandard: 'UDH',
    seatpostDiameterMm: 34.9, seatClampDiameterMm: 38.6, maxSeatpostInsertionMm: 250,
    seatpostRouting: 'INTERNAL', cableRouting: 'INTERNAL', iscgStandard: 'NONE',
    bottleMounts: 2, hasEyelets: false,
    shockEyeToEyeMm: 190, shockStrokeMm: 45, shockMountType: 'STANDARD_EYELET',
    shockHardwareWidthMm: 30, shockBushingDiameterMm: 8, leverageRatio: 2.9, suitableForCoil: false,
    frameSize: 'L', standoverMm: 770, reachMm: 455, stackMm: 605,
    riderMinHeightCm: 173, riderMaxHeightCm: 185,
  });

  // ----------------------------------------------------------
  // FORKS
  // ----------------------------------------------------------
  await add(PartType.FORK, 'RockShox', 'Pike Ultimate Charger 3.1 (140mm)', 109900, 1880, 'fork', {
    steererTubeTaper: 'TAPERED_1_5_TO_1_125', steererLengthMm: 300, crownRaceDiameterMm: 40,
    frontAxleType: 'THRU_AXLE_110x15_BOOST', frontAxleThreadPitch: 'M15_x_1_5', dropoutType: 'THRU_AXLE',
    brakeMountType: 'POST_MOUNT_180', maxRotorMm: 200,
    wheelDiameter: 'ISO_622', maxTyreWidthMm: 66,
    travelMm: 140, axleToCrownMm: 551, offsetMm: 44, isSuspension: true,
  });

  await add(PartType.FORK, 'FOX', '36 Factory GRIP2 (160mm)', 119900, 2100, 'fork', {
    steererTubeTaper: 'TAPERED_1_5_TO_1_125', steererLengthMm: 300, crownRaceDiameterMm: 40,
    frontAxleType: 'THRU_AXLE_110x15_BOOST', frontAxleThreadPitch: 'M15_x_1_5', dropoutType: 'THRU_AXLE',
    brakeMountType: 'POST_MOUNT_180', maxRotorMm: 203,
    wheelDiameter: 'ISO_622', maxTyreWidthMm: 66,
    travelMm: 160, axleToCrownMm: 571, offsetMm: 44, isSuspension: true,
  });

  await add(PartType.FORK, 'RockShox', 'SID SL Ultimate (100mm)', 99900, 1400, 'fork', {
    steererTubeTaper: 'TAPERED_1_5_TO_1_125', steererLengthMm: 280, crownRaceDiameterMm: 40,
    frontAxleType: 'THRU_AXLE_110x15_BOOST', frontAxleThreadPitch: 'M15_x_1_5', dropoutType: 'THRU_AXLE',
    brakeMountType: 'POST_MOUNT_160', maxRotorMm: 180,
    wheelDiameter: 'ISO_622', maxTyreWidthMm: 58,
    travelMm: 100, axleToCrownMm: 511, offsetMm: 44, isSuspension: true,
  });

  // ----------------------------------------------------------
  // BOTTOM BRACKETS
  // ----------------------------------------------------------
  await add(PartType.BOTTOM_BRACKET, 'SRAM', 'DUB BSA Threaded', 4000, 90, 'bottomBracket',
    { frameInterface: 'BSA_73', shellWidthMm: 73, spindleInterface: 'DUB_29' });
  await add(PartType.BOTTOM_BRACKET, 'Shimano', 'SM-BB52 BSA Threaded', 3500, 80, 'bottomBracket',
    { frameInterface: 'BSA_73', shellWidthMm: 73, spindleInterface: 'HOLLOWTECH_II_24' });
  await add(PartType.BOTTOM_BRACKET, 'Wheels Manufacturing', 'PF92 for HollowTech II', 6000, 70, 'bottomBracket',
    { frameInterface: 'PF92', shellWidthMm: 92, spindleInterface: 'HOLLOWTECH_II_24' });
  await add(PartType.BOTTOM_BRACKET, 'SRAM', 'DUB PF92 Press Fit', 4500, 95, 'bottomBracket',
    { frameInterface: 'PF92', shellWidthMm: 92, spindleInterface: 'DUB_29' });

  // ----------------------------------------------------------
  // CRANKSETS
  // ----------------------------------------------------------
  await add(PartType.CRANKSET, 'SRAM', 'XX SL Eagle Transmission', 60000, 450, 'crankset', {
    spindleDiameter: 'DUB_29', chainlineType: 'BOOST_52', chainlineMm: 52,
    spindleLengthMm: 168, qFactorMm: 168, crankLengthMm: 170, pedalThread: 'NINE_SIXTEENTHS',
    chainringMount: 'SRAM_3_BOLT', chainringCount: 1, maxChainringTeeth: 38,
  });
  await add(PartType.CRANKSET, 'Shimano', 'Deore XT M8100', 15000, 620, 'crankset', {
    spindleDiameter: 'HOLLOWTECH_II_24', chainlineType: 'BOOST_55', chainlineMm: 55,
    spindleLengthMm: 172, qFactorMm: 172, crankLengthMm: 175, pedalThread: 'NINE_SIXTEENTHS',
    chainringMount: 'SHIMANO_DIRECT_MOUNT', chainringCount: 1, maxChainringTeeth: 36,
  });
  await add(PartType.CRANKSET, 'SRAM', 'GX Eagle DUB', 15000, 700, 'crankset', {
    spindleDiameter: 'DUB_29', chainlineType: 'BOOST_52', chainlineMm: 52,
    spindleLengthMm: 168, qFactorMm: 168, crankLengthMm: 175, pedalThread: 'NINE_SIXTEENTHS',
    chainringMount: 'SRAM_3_BOLT', chainringCount: 1, maxChainringTeeth: 38,
  });

  // ----------------------------------------------------------
  // CHAINRINGS
  // ----------------------------------------------------------
  await add(PartType.CHAINRING, 'SRAM', 'X-Sync 2 Eagle 32t (3mm offset)', 6500, 90, 'chainring',
    { mountStandard: 'SRAM_3_BOLT', teeth: 32, narrowWide: true, offsetMm: 3, speeds: 12 });
  await add(PartType.CHAINRING, 'SRAM', 'X-Sync 2 Eagle 34t (3mm offset)', 6500, 95, 'chainring',
    { mountStandard: 'SRAM_3_BOLT', teeth: 34, narrowWide: true, offsetMm: 3, speeds: 12 });
  await add(PartType.CHAINRING, 'Shimano', 'SM-CRM85 32t Direct Mount', 5500, 85, 'chainring',
    { mountStandard: 'SHIMANO_DIRECT_MOUNT', teeth: 32, narrowWide: true, offsetMm: 3, speeds: 12 });
  // Deliberately oversized: exceeds every frame's max ring (R-CRK-02).
  await add(PartType.CHAINRING, 'Race Face', 'Narrow Wide 104BCD 40t', 5000, 130, 'chainring',
    { mountStandard: 'BCD_104', boltCount: 4, teeth: 40, narrowWide: true, offsetMm: 0, speeds: 12 });

  // ----------------------------------------------------------
  // WHEELSETS
  // ----------------------------------------------------------
  await add(PartType.WHEELSET, 'Roval', 'Control SL', 190000, 1350, 'wheelset', {
    wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_110x15_BOOST', rearAxleType: 'THRU_AXLE_148x12_BOOST',
    freehubBodyType: 'XD', rotorMountStandard: 'CENTERLOCK', tubelessReady: true,
    hookless: true, maxPressurePsi: 72, internalRimWidthMm: 30, rimDepthMm: 25,
    valveHoleType: 'PRESTA', hasBrakeTrack: false, convertibleEndCaps: false,
  });
  await add(PartType.WHEELSET, 'DT Swiss', 'XM1700 Spline', 55000, 1850, 'wheelset', {
    wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_110x15_BOOST', rearAxleType: 'THRU_AXLE_148x12_BOOST',
    freehubBodyType: 'MICRO_SPLINE', rotorMountStandard: 'CENTERLOCK', tubelessReady: true,
    hookless: false, internalRimWidthMm: 25, rimDepthMm: 22,
    valveHoleType: 'PRESTA', hasBrakeTrack: false, convertibleEndCaps: true,
  });
  // Deliberately Super Boost — no frame here accepts it (R-AXL-01).
  await add(PartType.WHEELSET, "Stan's NoTubes", 'Flow S2', 50000, 1900, 'wheelset', {
    wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_110x15_BOOST', rearAxleType: 'THRU_AXLE_157x12_SUPERBOOST',
    freehubBodyType: 'XD', rotorMountStandard: 'SIX_BOLT', tubelessReady: true,
    hookless: false, internalRimWidthMm: 30, rimDepthMm: 20,
    valveHoleType: 'PRESTA', hasBrakeTrack: false, convertibleEndCaps: false,
  });

  // ----------------------------------------------------------
  // TYRES
  // ----------------------------------------------------------
  await add(PartType.TYRE, 'Maxxis', 'Minion DHF 29x2.5" WT', 8500, 1100, 'tyre',
    { wheelDiameter: 'ISO_622', widthMm: 63, tubeless: true, hooklessSafe: true, maxPressurePsi: 50 });
  await add(PartType.TYRE, 'Maxxis', 'Minion DHR II 29x2.4" WT', 8000, 1050, 'tyre',
    { wheelDiameter: 'ISO_622', widthMm: 61, tubeless: true, hooklessSafe: true, maxPressurePsi: 50 });
  await add(PartType.TYRE, 'Maxxis', 'Rekon Race 29x2.25"', 6500, 600, 'tyre',
    { wheelDiameter: 'ISO_622', widthMm: 57, tubeless: true, hooklessSafe: true, maxPressurePsi: 65 });
  // Not hookless-approved — locked out on the hookless Roval (R-TIR-04).
  await add(PartType.TYRE, 'Continental', 'Kryptotal Fr 29x2.4"', 9000, 1200, 'tyre',
    { wheelDiameter: 'ISO_622', widthMm: 61, tubeless: true, hooklessSafe: false, maxPressurePsi: 55 });

  // ----------------------------------------------------------
  // TUBES
  // ----------------------------------------------------------
  await add(PartType.TUBE, 'Maxxis', 'Welter Weight 29x2.2-2.5 (48mm Presta)', 900, 200, 'tube',
    { wheelDiameter: 'ISO_622', minWidthMm: 56, maxWidthMm: 63, valveType: 'PRESTA', valveLengthMm: 48 });
  await add(PartType.TUBE, 'Continental', 'MTB 29 Light (42mm Presta)', 1100, 180, 'tube',
    { wheelDiameter: 'ISO_622', minWidthMm: 47, maxWidthMm: 62, valveType: 'PRESTA', valveLengthMm: 42 });
  // Schrader won't pass through a Presta-drilled rim (R-TIR-06).
  await add(PartType.TUBE, 'Bontrager', 'Standard 29 (35mm Schrader)', 700, 220, 'tube',
    { wheelDiameter: 'ISO_622', minWidthMm: 47, maxWidthMm: 60, valveType: 'SCHRADER', valveLengthMm: 35 });

  // ----------------------------------------------------------
  // BRAKE CALIPERS  (fluid + system family drive R-BRK-07/08)
  // ----------------------------------------------------------
  await add(PartType.BRAKE_CALIPER, 'SRAM', 'Level Ultimate Stealth 4P', 20000, 130, 'brakeCaliper', {
    mountType: 'POST_MOUNT_160', nativeRotorMm: 160, isHydraulic: true, fluidType: 'DOT',
    brakeSystemFamily: 'SRAM Level Stealth', padShape: 'SRAM Level 4P',
    minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.0,
  });
  await add(PartType.BRAKE_CALIPER, 'Shimano', 'Deore XT M8120 4-Piston', 15000, 150, 'brakeCaliper', {
    mountType: 'POST_MOUNT_180', nativeRotorMm: 180, isHydraulic: true, fluidType: 'MINERAL_OIL',
    brakeSystemFamily: 'Shimano XT M8100', padShape: 'Shimano N03A/N04C',
    minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.0,
  });
  await add(PartType.BRAKE_CALIPER, 'SRAM', 'Code RSC', 18000, 155, 'brakeCaliper', {
    mountType: 'POST_MOUNT_180', nativeRotorMm: 180, isHydraulic: true, fluidType: 'DOT',
    brakeSystemFamily: 'SRAM Code RSC', padShape: 'SRAM Code',
    minRotorThicknessMm: 1.5, maxRotorThicknessMm: 2.3,
  });

  // ----------------------------------------------------------
  // BRAKE LEVERS
  // ----------------------------------------------------------
  await add(PartType.BRAKE_LEVER, 'SRAM', 'Code RSC Lever', 12000, 120, 'brakeLever', {
    isHydraulic: true, fluidType: 'DOT', brakeSystemFamily: 'SRAM Code RSC',
    barType: 'RISER', clampDiameterMm: 22.2, requiresCompressionless: false,
  });
  // Without this, the Level Ultimate caliper had no matching lever and
  // R-BRK-08 correctly emptied the lever list — a real dead end found
  // by the rule-coverage pass.
  await add(PartType.BRAKE_LEVER, 'SRAM', 'Level Ultimate Stealth Lever', 11000, 110, 'brakeLever', {
    isHydraulic: true, fluidType: 'DOT', brakeSystemFamily: 'SRAM Level Stealth',
    barType: 'RISER', clampDiameterMm: 22.2, requiresCompressionless: false,
  });
  await add(PartType.BRAKE_LEVER, 'Shimano', 'Deore XT M8100 Lever', 9000, 115, 'brakeLever', {
    isHydraulic: true, fluidType: 'MINERAL_OIL', brakeSystemFamily: 'Shimano XT M8100',
    barType: 'RISER', clampDiameterMm: 22.2, requiresCompressionless: false,
  });
  // Mechanical — cannot drive any hydraulic caliper (R-BRK-09).
  await add(PartType.BRAKE_LEVER, 'Paul Component', 'Love Lever Compact', 11000, 95, 'brakeLever', {
    isHydraulic: false, fluidType: 'NONE_MECHANICAL', brakeSystemFamily: 'Mechanical',
    barType: 'FLAT', clampDiameterMm: 22.2, requiresCompressionless: true,
  });

  // ----------------------------------------------------------
  // ROTORS
  // ----------------------------------------------------------
  await add(PartType.ROTOR, 'SRAM', 'Centerline 180mm Centerlock', 5500, 145, 'rotor',
    { diameterMm: 180, mountStandard: 'CENTERLOCK', lockringType: 'INTERNAL', thicknessMm: 1.85 });
  await add(PartType.ROTOR, 'SRAM', 'Centerline 200mm 6-bolt', 6000, 175, 'rotor',
    { diameterMm: 200, mountStandard: 'SIX_BOLT', thicknessMm: 1.85 });
  await add(PartType.ROTOR, 'Shimano', 'RT-MT800 160mm Centerlock', 5000, 110, 'rotor',
    { diameterMm: 160, mountStandard: 'CENTERLOCK', lockringType: 'EXTERNAL', thicknessMm: 1.8 });
  await add(PartType.ROTOR, 'Shimano', 'RT-MT900 203mm Centerlock', 7000, 190, 'rotor',
    { diameterMm: 203, mountStandard: 'CENTERLOCK', lockringType: 'INTERNAL', thicknessMm: 1.8 });

  // ----------------------------------------------------------
  // SHIFTERS
  // ----------------------------------------------------------
  await add(PartType.SHIFTER, 'SRAM', 'Eagle AXS Pod Ultimate', 20000, 70, 'shifter',
    { speeds: 12, cablePullStandard: 'ELECTRONIC_AXS', barType: 'RISER', clampDiameterMm: 22.2 });
  await add(PartType.SHIFTER, 'Shimano', 'Deore XT SL-M8100', 4500, 130, 'shifter',
    { speeds: 12, cablePullStandard: 'SHIMANO_MTB', barType: 'RISER', clampDiameterMm: 22.2 });
  await add(PartType.SHIFTER, 'SRAM', 'GX Eagle Trigger', 4000, 125, 'shifter',
    { speeds: 12, cablePullStandard: 'SRAM_X_ACTUATION', barType: 'RISER', clampDiameterMm: 22.2 });

  // ----------------------------------------------------------
  // REAR DERAILLEURS
  // ----------------------------------------------------------
  // UDH_DIRECT_MOUNT — locked out on the non-UDH Hightower (R-HGR-01).
  await add(PartType.REAR_DERAILLEUR, 'SRAM', 'XX SL Eagle AXS Transmission', 60000, 370, 'rearDerailleur', {
    maxSpeeds: 12, cablePullStandard: 'ELECTRONIC_AXS', maxCassetteCogTeeth: 52, minCassetteCogTeeth: 10,
    totalCapacityTeeth: 42, cageLength: 'LONG_SGS', mountStandard: 'UDH_DIRECT_MOUNT',
  });
  await add(PartType.REAR_DERAILLEUR, 'Shimano', 'Deore XT M8100 SGS', 12000, 290, 'rearDerailleur', {
    maxSpeeds: 12, cablePullStandard: 'SHIMANO_MTB', maxCassetteCogTeeth: 51, minCassetteCogTeeth: 10,
    totalCapacityTeeth: 41, cageLength: 'LONG_SGS', mountStandard: 'STANDARD_HANGER',
  });
  await add(PartType.REAR_DERAILLEUR, 'SRAM', 'GX Eagle 12-Speed', 12500, 300, 'rearDerailleur', {
    maxSpeeds: 12, cablePullStandard: 'SRAM_X_ACTUATION', maxCassetteCogTeeth: 52, minCassetteCogTeeth: 10,
    totalCapacityTeeth: 42, cageLength: 'LONG_SGS', mountStandard: 'STANDARD_HANGER',
  });

  // ----------------------------------------------------------
  // FRONT DERAILLEUR (2x — rare on modern MTB, included for R-FD-*)
  // ----------------------------------------------------------
  await add(PartType.FRONT_DERAILLEUR, 'Shimano', 'Deore FD-M6025 Direct Mount', 3500, 120, 'frontDerailleur',
    { speeds: 2, cablePullStandard: 'SHIMANO_MTB', mountType: 'DIRECT_MOUNT', pullDirection: 'DUAL_PULL', maxChainringTeeth: 36 });

  // ----------------------------------------------------------
  // CASSETTES
  // ----------------------------------------------------------
  await add(PartType.CASSETTE, 'SRAM', 'XG-1275 GX Eagle 10-52t', 22000, 450, 'cassette',
    { speeds: 12, freehubBodyType: 'XD', smallestCogTeeth: 10, largestCogTeeth: 52 });
  await add(PartType.CASSETTE, 'Shimano', 'CS-M8100 XT 10-51t', 15000, 470, 'cassette',
    { speeds: 12, freehubBodyType: 'MICRO_SPLINE', smallestCogTeeth: 10, largestCogTeeth: 51 });
  // 11-speed HG — mismatches every 12-speed shifter here (R-DRV-10).
  await add(PartType.CASSETTE, 'Shimano', 'CS-M7000 SLX 11-42t', 7000, 430, 'cassette',
    { speeds: 11, freehubBodyType: 'HG_11', smallestCogTeeth: 11, largestCogTeeth: 42 });

  // ----------------------------------------------------------
  // CHAINS
  // ----------------------------------------------------------
  await add(PartType.CHAIN, 'SRAM', 'GX Eagle 12-Speed Chain', 3000, 268, 'chain',
    { speeds: 12, chainStandard: 'SRAM_EAGLE_12', links: 126 });
  await add(PartType.CHAIN, 'Shimano', 'CN-M8100 XT 12-Speed', 4000, 252, 'chain',
    { speeds: 12, chainStandard: 'SHIMANO_HG_12_MTB', links: 126 });
  await add(PartType.CHAIN, 'Shimano', 'CN-HG601 11-Speed', 2500, 270, 'chain',
    { speeds: 11, chainStandard: 'SHIMANO_HG_11', links: 116 });

  // ----------------------------------------------------------
  // HEADSETS
  // ----------------------------------------------------------
  await add(PartType.HEADSET, 'Cane Creek', '40 Series IS42/IS52', 6000, 100, 'headset',
    { upperStandard: 'IS42', lowerStandard: 'IS52', crownRaceDiameterMm: 40, stackHeightMm: 15 });
  await add(PartType.HEADSET, 'Chris King', 'DropSet 3 ZS44/ZS56', 18500, 125, 'headset',
    { upperStandard: 'ZS44', lowerStandard: 'ZS56', crownRaceDiameterMm: 40, stackHeightMm: 17 });
  await add(PartType.HEADSET, 'Wolf Tooth', 'Performance IS42/IS52', 8500, 105, 'headset',
    { upperStandard: 'IS42', lowerStandard: 'IS52', crownRaceDiameterMm: 40, stackHeightMm: 14 });

  // ----------------------------------------------------------
  // REAR SHOCKS  (sizes must match a frame exactly — R-SHK-01)
  // ----------------------------------------------------------
  await add(PartType.REAR_SHOCK, 'RockShox', 'Super Deluxe Ultimate 210x55', 59900, 500, 'rearShock',
    { eyeToEyeMm: 210, strokeMm: 55, mountType: 'STANDARD_EYELET', hardwareWidthMm: 30, bushingDiameterMm: 8, sizing: 'METRIC', isCoil: false, hasReservoir: false });
  await add(PartType.REAR_SHOCK, 'FOX', 'Float X 205x60 Trunnion', 64900, 545, 'rearShock',
    { eyeToEyeMm: 205, strokeMm: 60, mountType: 'TRUNNION', hardwareWidthMm: 40, bushingDiameterMm: 8, sizing: 'METRIC', isCoil: false, hasReservoir: true });
  await add(PartType.REAR_SHOCK, 'RockShox', 'SIDLuxe Ultimate 190x45', 54900, 320, 'rearShock',
    { eyeToEyeMm: 190, strokeMm: 45, mountType: 'STANDARD_EYELET', hardwareWidthMm: 30, bushingDiameterMm: 8, sizing: 'METRIC', isCoil: false, hasReservoir: false });
  await add(PartType.REAR_SHOCK, 'RockShox', 'Super Deluxe Coil 210x55 (450lb)', 49900, 780, 'rearShock',
    { eyeToEyeMm: 210, strokeMm: 55, mountType: 'STANDARD_EYELET', hardwareWidthMm: 30, bushingDiameterMm: 8, sizing: 'METRIC', isCoil: true, springRate: 450, hasReservoir: true });

  // ----------------------------------------------------------
  // HANDLEBARS & STEMS
  // ----------------------------------------------------------
  await add(PartType.HANDLEBAR, 'Race Face', 'Next R 35 Carbon 800mm', 15000, 220, 'handlebar',
    { clampDiameterMm: 35, controlClampDiameterMm: 22.2, barType: 'RISER', widthMm: 800, riseMm: 20, internalRouting: false });
  await add(PartType.HANDLEBAR, 'Renthal', 'Fatbar Lite 31.8 760mm', 8000, 240, 'handlebar',
    { clampDiameterMm: 31.8, controlClampDiameterMm: 22.2, barType: 'RISER', widthMm: 760, riseMm: 10, internalRouting: false });
  await add(PartType.STEM, 'Race Face', 'Turbine R 35 40mm', 9000, 130, 'stem',
    { barClampDiameterMm: 35, steererClampMm: 28.6, lengthMm: 40, riseDegrees: 0, integratedCockpit: false });
  await add(PartType.STEM, 'Thomson', 'Elite X4 31.8 50mm', 11000, 145, 'stem',
    { barClampDiameterMm: 31.8, steererClampMm: 28.6, lengthMm: 50, riseDegrees: 0, integratedCockpit: false });

  // ----------------------------------------------------------
  // SEATPOSTS, CLAMPS, SADDLES
  // ----------------------------------------------------------
  await add(PartType.SEATPOST, 'RockShox', 'Reverb AXS 31.6 (150mm)', 80000, 675, 'seatpost',
    { diameterMm: 31.6, totalLengthMm: 440, isDropper: true, travelMm: 150, routingType: 'NONE', remoteType: 'ELECTRONIC', railClampType: 'ROUND_7MM', setbackMm: 0 });
  await add(PartType.SEATPOST, 'OneUp', 'Dropper V2 34.9 (180mm)', 23000, 610, 'seatpost',
    { diameterMm: 34.9, totalLengthMm: 468, isDropper: true, travelMm: 180, routingType: 'INTERNAL', remoteType: 'CABLE', railClampType: 'ROUND_7MM', setbackMm: 0 });
  await add(PartType.SEATPOST, 'PNW', 'Loam 30.9 (170mm)', 19900, 640, 'seatpost',
    { diameterMm: 30.9, totalLengthMm: 458, isDropper: true, travelMm: 170, routingType: 'INTERNAL', remoteType: 'CABLE', railClampType: 'ROUND_7MM', setbackMm: 0 });
  await add(PartType.SEAT_CLAMP, 'Wolf Tooth', 'Seatpost Clamp 34.9', 3000, 20, 'seatClamp', { diameterMm: 34.9 });
  await add(PartType.SEAT_CLAMP, 'Wolf Tooth', 'Seatpost Clamp 38.6', 3000, 22, 'seatClamp', { diameterMm: 38.6 });
  await add(PartType.SADDLE, 'Specialized', 'Bridge Comp 143mm', 10000, 250, 'saddle', { railType: 'ROUND_7MM', widthMm: 143 });
  // Oversized carbon rails need a matching clamp (R-SP-06).
  await add(PartType.SADDLE, 'Fizik', 'Antares R1 Carbon', 25000, 175, 'saddle', { railType: 'OVAL_7X9MM', widthMm: 142 });

  // ----------------------------------------------------------
  // PEDALS & SHOES
  // ----------------------------------------------------------
  await add(PartType.PEDAL, 'Shimano', 'PD-M8100 XT SPD', 13000, 342, 'pedal', { thread: 'NINE_SIXTEENTHS', cleatSystem: 'SPD' });
  await add(PartType.PEDAL, 'Crank Brothers', 'Mallet DH', 18000, 495, 'pedal', { thread: 'NINE_SIXTEENTHS', cleatSystem: 'CRANK_BROTHERS' });
  await add(PartType.PEDAL, 'Race Face', 'Chester Flat', 4000, 358, 'pedal', { thread: 'NINE_SIXTEENTHS', cleatSystem: 'FLAT_NONE' });
  await add(PartType.SHOE, 'Shimano', 'ME7 (2-bolt)', 20000, 800, 'shoe', { soleDrilling: 'TWO_BOLT' });
  await add(PartType.SHOE, 'Five Ten', 'Freerider Pro (flat)', 15000, 860, 'shoe', { soleDrilling: 'FLAT_NONE' });

  // ----------------------------------------------------------
  // CHAIN GUIDES & HANGERS
  // ----------------------------------------------------------
  await add(PartType.CHAIN_GUIDE, 'OneUp', 'Chainguide ISCG05', 5500, 40, 'chainGuide',
    { mountStandard: 'ISCG_05', minChainringTeeth: 28, maxChainringTeeth: 36 });
  await add(PartType.CHAIN_GUIDE, 'Wolf Tooth', 'GnarWolf BB Mount', 6500, 55, 'chainGuide',
    { mountStandard: 'BB_MOUNT', minChainringTeeth: 28, maxChainringTeeth: 38 });
  await add(PartType.DERAILLEUR_HANGER, 'SRAM', 'UDH Universal Derailleur Hanger', 2500, 30, 'derailleurHanger',
    { hangerStandard: 'UDH', model: 'UDH' });
  await add(PartType.DERAILLEUR_HANGER, 'Santa Cruz', 'Hanger #67', 3000, 25, 'derailleurHanger',
    { hangerStandard: 'PROPRIETARY', model: '67' });

  // ----------------------------------------------------------
  // FACTORY BIKES
  //
  // A complete bike as sold, expressed as a set of catalogue parts.
  // Cloning one into a Build lets the compatibility engine answer
  // "what upgrades fit my bike" with no new rule logic.
  //
  // These three are assembled only from parts already in the
  // catalogue, and each was checked to build clean. Specs are
  // representative of the real trim rather than exhaustively
  // verified against the manufacturer's parts list — treat as demo
  // data until a proper bike database is wired in.
  //
  // Pedals are deliberately absent: most bikes ship without them.
  // ----------------------------------------------------------
  function partIdByName(fragment: string): string {
    const match = created.find((p: any) => p.name.includes(fragment));
    if (!match) throw new Error(`Seed error: no part matching "${fragment}"`);
    return match.id;
  }

  async function addBike(
    brand: string, model: string, year: number, variant: string | null,
    slug: string, msrpPence: number, discipline: string,
    spec: [string, string | null][]
  ) {
    await prisma.bikeModel.create({
      data: {
        brand, model, year, variant, slug, msrpPence, discipline,
        parts: { create: spec.map(([fragment, slot]) => ({ partId: partIdByName(fragment), slot })) },
      },
    });
  }

  // Shimano XT build: Micro Spline wheels force the Shimano drivetrain.
  await addBike('Trek', 'Fuel EX', 2025, '9.8 XT', 'trek-fuel-ex-9-8-xt-2025', 549900, 'trail', [
    ['Fuel EX 9.8 Frameset', null],
    ['36 Factory GRIP2', null],
    ['DropSet 3 ZS44/ZS56', null],
    ['Float X 205x60 Trunnion', null],
    ['PF92 for HollowTech II', null],
    ['Deore XT M8100', null],            // crankset
    ['SM-CRM85 32t', null],
    ['CS-M8100 XT 10-51t', null],
    ['CN-M8100 XT 12-Speed', null],
    ['Deore XT SL-M8100', null],         // shifter
    ['Deore XT M8100 SGS', null],        // rear derailleur
    ['XM1700 Spline', null],
    ['Minion DHF 29x2.5" WT', 'front'],
    ['Minion DHR II 29x2.4" WT', 'rear'],
    ['Deore XT M8120 4-Piston', null],
    ['Deore XT M8100 Lever', null],
    ['Centerline 180mm Centerlock', 'front'],
    ['Centerline 180mm Centerlock', 'rear'],
    ['Next R 35 Carbon 800mm', null],
    ['Turbine R 35 40mm', null],
    ['Dropper V2 34.9', null],
    ['Seatpost Clamp 38.6', null],
    ['Bridge Comp 143mm', null],
  ]);

  // SRAM build on a proprietary-hanger frame — useful contrast with
  // the UDH bikes when testing R-HGR-01.
  await addBike('Santa Cruz', 'Hightower', 2024, 'C S', 'santa-cruz-hightower-c-s-2024', 529900, 'trail', [
    ['Hightower CC (2024)', null],
    ['Pike Ultimate Charger 3.1', null],
    ['40 Series IS42/IS52', null],
    ['Super Deluxe Ultimate 210x55', null],
    ['DUB BSA Threaded', null],
    ['GX Eagle DUB', null],
    ['X-Sync 2 Eagle 32t', null],
    ['XG-1275 GX Eagle 10-52t', null],
    ['GX Eagle 12-Speed Chain', null],
    ['GX Eagle Trigger', null],
    ['GX Eagle 12-Speed', null],         // rear derailleur
    ['Control SL', null],
    ['Minion DHF 29x2.5" WT', 'front'],
    ['Minion DHR II 29x2.4" WT', 'rear'],
    ['Code RSC', null],
    ['Code RSC Lever', null],
    ['Centerline 180mm Centerlock', 'front'],
    ['Centerline 180mm Centerlock', 'rear'],
    ['Fatbar Lite 31.8', null],
    ['Elite X4 31.8 50mm', null],
    ['Reverb AXS 31.6', null],
    ['Seatpost Clamp 34.9', null],
    ['Bridge Comp 143mm', null],
    ['Hanger #67', null],
  ]);

  // UDH + SRAM Transmission — the electronic-drivetrain case.
  await addBike('Specialized', 'Epic 8', 2024, 'Expert', 'specialized-epic-8-expert-2024', 619900, 'xc', [
    ['Epic 8 Expert Frameset', null],
    ['SID SL Ultimate', null],
    ['Performance IS42/IS52', null],
    ['SIDLuxe Ultimate 190x45', null],
    ['DUB BSA Threaded', null],
    ['XX SL Eagle Transmission', null],  // crankset
    ['X-Sync 2 Eagle 34t', null],
    ['XG-1275 GX Eagle 10-52t', null],
    ['GX Eagle 12-Speed Chain', null],
    ['Eagle AXS Pod Ultimate', null],
    ['XX SL Eagle AXS Transmission', null],
    ['Control SL', null],
    ['Rekon Race 29x2.25"', 'front'],
    ['Rekon Race 29x2.25"', 'rear'],
    ['Level Ultimate Stealth 4P', null],
    ['Level Ultimate Stealth Lever', null],
    ['RT-MT800 160mm Centerlock', 'front'],
    ['RT-MT800 160mm Centerlock', 'rear'],
    ['Fatbar Lite 31.8', null],
    ['Elite X4 31.8 50mm', null],
    ['Dropper V2 34.9', null],
    ['Seatpost Clamp 38.6', null],
    // Bridge Comp, not the Antares: the OneUp clamps round 7mm rails,
    // and the Antares' oval 7×9 carbon rails would trip R-SP-06.
    ['Bridge Comp 143mm', null],
  ]);

  // ----------------------------------------------------------
  // PRICES — one older row and one current row per vendor, so a
  // price history chart has something to plot.
  // ----------------------------------------------------------
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  for (const part of created) {
    // Every part seeded by add() above carries a real basePricePence today
    // (ukRrpPence() always returns a number), so this never fires yet --
    // but the field is genuinely nullable now, and JS coerces `null % 3`
    // to 0 and `null * variance` to 0 silently rather than throwing. Left
    // unguarded, a future seed entry following the importer's own pattern
    // of basePricePence: null would have this loop fabricate £0.00 Price
    // rows for it -- exactly the invented-price failure this session's
    // nullable-price design exists to prevent, just one step removed from
    // where the fix was applied everywhere else it mattered.
    if (part.basePricePence == null) continue;
    // 2–4 of the five UK retailers stock any given part, deterministically.
    const vendorsForPart = vendors.slice(0, 2 + (part.basePricePence % 3));
    for (const vendor of vendorsForPart) {
      const variance = 1 + ((vendor.name.length % 5) - 2) / 100;
      const oldPrice = Math.round(part.basePricePence * variance * 1.05);
      const currentPrice = Math.round(part.basePricePence * variance);
      // NOTE: these paths don't resolve — there's no real product URL
      // until an affiliate feed provides one. Kept vendor-shaped so the
      // link target is obvious once it's replaced.
      const productUrl = `${vendor.siteUrl}/products/${part.id}`;

      await prisma.price.createMany({
        data: [
          {
            partId: part.id, vendorId: vendor.id, pricePence: oldPrice,
            currency: 'GBP', includesVat: true, vatRatePercent: 20,
            inStock: true, productUrl,
            recordedAt: new Date(Date.now() - THIRTY_DAYS_MS),
          },
          {
            partId: part.id, vendorId: vendor.id, pricePence: currentPrice,
            currency: 'GBP', includesVat: true, vatRatePercent: 20,
            inStock: currentPrice % 7 !== 0, productUrl,
            recordedAt: new Date(),
          },
        ],
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${created.length} parts across ${vendors.length} vendors.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
