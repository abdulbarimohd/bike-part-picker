// src/services/build.service.ts
import { prisma } from '../prisma/client';
import type { BikeBuild } from '../types/parts';
import { PartType } from '@prisma/client';

/**
 * Loads every BuildPart row for a build and reshapes them into
 * the flat BikeBuild slot object the compatibility engine
 * consumes. This is the one place that translates "a list of
 * generic Part rows" into "the specific slots the engine cares
 * about" — every route that needs a build for compatibility
 * checking calls this instead of re-deriving it.
 *
 * Paired parts (tyres, tubes, rotors) use BuildPart.slot to say
 * which end they're on. Insertion order is only a fallback for
 * rows written before slots existed: first in = front.
 */

const PAIRED: Partial<Record<PartType, [keyof BikeBuild, keyof BikeBuild]>> = {
  [PartType.TYRE]: ['frontTyre', 'rearTyre'],
  [PartType.TUBE]: ['frontTube', 'rearTube'],
  [PartType.ROTOR]: ['frontRotor', 'rearRotor'],
};

/** Single-slot categories: PartType → the BikeBuild key it fills. */
const SINGLE: Partial<Record<PartType, keyof BikeBuild>> = {
  [PartType.FRAME]: 'frame',
  [PartType.FORK]: 'fork',
  [PartType.BOTTOM_BRACKET]: 'bottomBracket',
  [PartType.CRANKSET]: 'crankset',
  [PartType.CHAINRING]: 'chainring',
  [PartType.WHEELSET]: 'wheelset',
  [PartType.BRAKE_CALIPER]: 'brakeCaliper',
  [PartType.BRAKE_LEVER]: 'brakeLever',
  [PartType.SHIFTER]: 'shifter',
  [PartType.REAR_DERAILLEUR]: 'rearDerailleur',
  [PartType.FRONT_DERAILLEUR]: 'frontDerailleur',
  [PartType.CASSETTE]: 'cassette',
  [PartType.CHAIN]: 'chain',
  [PartType.HEADSET]: 'headset',
  [PartType.REAR_SHOCK]: 'rearShock',
  [PartType.HANDLEBAR]: 'handlebar',
  [PartType.STEM]: 'stem',
  [PartType.SEATPOST]: 'seatpost',
  [PartType.SEAT_CLAMP]: 'seatClamp',
  [PartType.SADDLE]: 'saddle',
  [PartType.PEDAL]: 'pedal',
  [PartType.SHOE]: 'shoe',
  [PartType.CHAIN_GUIDE]: 'chainGuide',
  [PartType.DERAILLEUR_HANGER]: 'derailleurHanger',
};

/** PartType → the 1:1 detail relation holding its spec fields. */
const DETAIL_RELATION: Partial<Record<PartType, string>> = {
  [PartType.FRAME]: 'frame',
  [PartType.FORK]: 'fork',
  [PartType.BOTTOM_BRACKET]: 'bottomBracket',
  [PartType.CRANKSET]: 'crankset',
  [PartType.CHAINRING]: 'chainring',
  [PartType.WHEELSET]: 'wheelset',
  [PartType.TYRE]: 'tyre',
  [PartType.TUBE]: 'tube',
  [PartType.BRAKE_CALIPER]: 'brakeCaliper',
  [PartType.BRAKE_LEVER]: 'brakeLever',
  [PartType.ROTOR]: 'rotor',
  [PartType.SHIFTER]: 'shifter',
  [PartType.REAR_DERAILLEUR]: 'rearDerailleur',
  [PartType.FRONT_DERAILLEUR]: 'frontDerailleur',
  [PartType.CASSETTE]: 'cassette',
  [PartType.CHAIN]: 'chain',
  [PartType.HEADSET]: 'headset',
  [PartType.REAR_SHOCK]: 'rearShock',
  [PartType.HANDLEBAR]: 'handlebar',
  [PartType.STEM]: 'stem',
  [PartType.SEATPOST]: 'seatpost',
  [PartType.SEAT_CLAMP]: 'seatClamp',
  [PartType.SADDLE]: 'saddle',
  [PartType.PEDAL]: 'pedal',
  [PartType.SHOE]: 'shoe',
  [PartType.CHAIN_GUIDE]: 'chainGuide',
  [PartType.DERAILLEUR_HANGER]: 'derailleurHanger',
};

const INCLUDE_ALL_DETAILS = Object.fromEntries(
  Object.values(DETAIL_RELATION).map((relation) => [relation, true])
) as Record<string, true>;

/** Minimal shape `shapeBuildParts` needs from each row -- deliberately
 *  narrower than Prisma's generated type so it can be called with plain
 *  test fixtures, no database involved. */
export interface RawBuildPart {
  slot: string | null;
  part: { type: PartType; brand: string; name: string } & Record<string, any>;
}

/**
 * Reshapes a list of BuildPart rows (with their Part + detail relation
 * already loaded) into the flat BikeBuild slot object the compatibility
 * engine consumes. Pure and DB-free, so it's unit-testable on its own --
 * see build.service.test.ts, in particular for the shifter left/right
 * resolution below.
 *
 * Paired parts (tyres, tubes, rotors) use BuildPart.slot to say which end
 * they're on. Insertion order is only a fallback for rows written before
 * slots existed: first in = front.
 */
export function shapeBuildParts(buildParts: RawBuildPart[]): BikeBuild {
  const build: BikeBuild = {};
  const pairedSeen: Partial<Record<string, number>> = {};

  // Mechanical drop-bar 2x shifter pairs store a different meaning of
  // `speeds` per side -- the left lever's is the front chainring count
  // (a fixed "2", by catalog-wide convention), the right/rear lever's is
  // the real cassette speed count every drivetrain rule (R-DRV-02/10,
  // R-FD-04) actually needs. `shifter` is a single BikeBuild slot, so
  // when both sides are present the right lever must win regardless of
  // insertion order -- otherwise whichever side was added to the build
  // last silently decides whether those rules see a real speed count or
  // "2", producing false criticals on a correctly-specced build.
  // Existing catalog rows use both 'right' and 'rear' for this side
  // (inconsistent across import passes -- checked directly against the
  // data rather than assumed), so both are treated as the winning slot.
  const RIGHT_SHIFTER_SLOTS = new Set(['right', 'rear']);
  let shifterSlot: string | null = null;

  for (const bp of buildParts) {
    const part = bp.part as any;
    const relation = DETAIL_RELATION[part.type as PartType];
    if (!relation) continue;
    const detail = part[relation];
    if (!detail) continue;

    // Every engine rule reads brand/name for its message text, so
    // they're merged down from the base Part row.
    const shaped = { ...detail, brand: part.brand, name: part.name };

    const pair = PAIRED[part.type as PartType];
    if (pair) {
      const index = pairedSeen[part.type] ?? 0;
      const slot = bp.slot === 'front' ? pair[0] : bp.slot === 'rear' ? pair[1] : pair[Math.min(index, 1)];
      (build as any)[slot] = shaped;
      // A single tyre/tube/rotor added without a slot covers both ends.
      if (index === 0 && !bp.slot) (build as any)[pair[1]] = shaped;
      pairedSeen[part.type] = index + 1;
      continue;
    }

    if (part.type === PartType.SHIFTER) {
      if (shifterSlot && RIGHT_SHIFTER_SLOTS.has(shifterSlot)) continue; // already locked onto the right lever
      shifterSlot = bp.slot ?? null;
      build.shifter = shaped;
      continue;
    }

    const single = SINGLE[part.type as PartType];
    if (single) (build as any)[single] = shaped;
  }

  return build;
}

export async function loadBuildFromDb(buildId: string): Promise<BikeBuild> {
  const [buildRow, buildParts] = await Promise.all([
    prisma.build.findUnique({ where: { id: buildId } }),
    prisma.buildPart.findMany({
      where: { buildId },
      include: { part: { include: INCLUDE_ALL_DETAILS } },
      orderBy: { addedAt: 'asc' },
    }),
  ]);

  const build = shapeBuildParts(buildParts as RawBuildPart[]);

  if (buildRow) {
    build.rider = {
      heightCm: buildRow.riderHeightCm,
      inseamCm: buildRow.riderInseamCm,
      weightKg: buildRow.riderWeightKg,
    };
  }

  return build;
}
