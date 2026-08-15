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

export async function loadBuildFromDb(buildId: string): Promise<BikeBuild> {
  const [buildRow, buildParts] = await Promise.all([
    prisma.build.findUnique({ where: { id: buildId } }),
    prisma.buildPart.findMany({
      where: { buildId },
      include: { part: { include: INCLUDE_ALL_DETAILS } },
      orderBy: { addedAt: 'asc' },
    }),
  ]);

  const build: BikeBuild = {};
  const pairedSeen: Partial<Record<string, number>> = {};

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

    const single = SINGLE[part.type as PartType];
    if (single) (build as any)[single] = shaped;
  }

  if (buildRow) {
    build.rider = {
      heightCm: buildRow.riderHeightCm,
      inseamCm: buildRow.riderInseamCm,
      weightKg: buildRow.riderWeightKg,
    };
  }

  return build;
}
