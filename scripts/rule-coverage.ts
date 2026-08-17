// scripts/rule-coverage.ts
//
// Investigative tool, not part of the app. Loads the whole catalogue,
// runs the engine over every plausible slot combination, and reports
// which rule IDs actually fire against real data.
//
// "Implemented and compiles" is not the same as "observed working".
// This measures the difference.
//
// Run: docker run --rm --network bike-partpicker_default \
//        -e DATABASE_URL=... build-my-bike-seed npx tsx scripts/rule-coverage.ts
// (the --network name is derived from this project's folder name on disk,
// still `bike-partpicker`, not the app's brand name -- see README.md)

import { PrismaClient } from '@prisma/client';
import { getCompatibilityWarnings } from '../src/compatibility/engine';
import type { BikeBuild } from '../src/types/parts';

const prisma = new PrismaClient();

/** Slot → the Prisma delegate holding its detail rows. */
const SLOT_SOURCE: Record<string, string> = {
  frame: 'frame', fork: 'fork', headset: 'headset', rearShock: 'rearShock',
  bottomBracket: 'bottomBracket', crankset: 'crankset', chainring: 'chainring',
  cassette: 'cassette', chain: 'chain', shifter: 'shifter',
  rearDerailleur: 'rearDerailleur', frontDerailleur: 'frontDerailleur',
  wheelset: 'wheelset', frontTyre: 'tyre', rearTyre: 'tyre',
  frontTube: 'tube', rearTube: 'tube', brakeCaliper: 'brakeCaliper',
  brakeLever: 'brakeLever', frontRotor: 'rotor', rearRotor: 'rotor',
  handlebar: 'handlebar', stem: 'stem', seatpost: 'seatpost',
  seatClamp: 'seatClamp', saddle: 'saddle', pedal: 'pedal', shoe: 'shoe',
  chainGuide: 'chainGuide', derailleurHanger: 'derailleurHanger',
};

/** Slot groups exercised together, chosen to reach every rule's inputs. */
const COMBINATIONS: string[][] = [
  ['frame'], ['brakeLever'], ['seatpost'], ['brakeCaliper'],
  ['frame', 'fork'], ['frame', 'fork', 'headset'], ['fork', 'headset'],
  ['frame', 'headset'], ['frame', 'fork', 'headset', 'stem'],
  ['frame', 'bottomBracket'], ['bottomBracket', 'crankset'], ['frame', 'crankset'],
  ['crankset', 'chainring'], ['frame', 'chainring', 'crankset'],
  ['crankset', 'wheelset'], ['chainring', 'wheelset'],
  ['shifter', 'rearDerailleur'], ['shifter', 'cassette'],
  ['rearDerailleur', 'cassette'], ['chain', 'cassette'], ['chain', 'rearDerailleur'],
  ['rearDerailleur', 'cassette', 'crankset', 'chainring'],
  ['chain', 'cassette', 'chainring', 'frame'],
  ['wheelset', 'cassette'], ['frame', 'wheelset'], ['fork', 'wheelset'],
  ['frame', 'rearDerailleur'], ['frame', 'derailleurHanger'],
  ['frame', 'brakeCaliper'], ['fork', 'brakeCaliper'], ['brakeLever', 'brakeCaliper'],
  ['fork', 'frontRotor'], ['frame', 'rearRotor'], ['wheelset', 'frontRotor'],
  ['brakeCaliper', 'frontRotor'], ['brakeCaliper', 'wheelset'],
  ['frame', 'wheelset', 'rearTyre'], ['fork', 'wheelset', 'frontTyre'],
  ['wheelset', 'rearTyre'], ['wheelset', 'frontTube'], ['frontTube', 'frontTyre'],
  ['frame', 'rearShock'], ['frame', 'seatpost'], ['frame', 'seatClamp'],
  ['seatpost', 'saddle'], ['stem', 'handlebar'], ['fork', 'stem'],
  ['handlebar', 'shifter'], ['handlebar', 'brakeLever'],
  ['crankset', 'pedal'], ['pedal', 'shoe'],
  ['frame', 'chainGuide'], ['frame', 'frontDerailleur'],
  ['shifter', 'frontDerailleur'], ['frontDerailleur', 'chainring'],
  ['handlebar', 'frame'],
];

/** Rider profiles, including deliberate extremes, for the fit rules. */
const RIDERS = [
  undefined,
  { heightCm: 155, inseamCm: 70, weightKg: 60 },
  { heightCm: 180, inseamCm: 84, weightKg: 78 },
  { heightCm: 200, inseamCm: 95, weightKg: 110 },
];

async function main() {
  // Load every category once, shaped the way the engine expects.
  const bySlot: Record<string, any[]> = {};
  for (const [slot, source] of Object.entries(SLOT_SOURCE)) {
    const rows = await (prisma as any)[source].findMany({ include: { part: true } });
    bySlot[slot] = rows.map((r: any) => ({ ...r, brand: r.part.brand, name: r.part.name }));
  }

  const fired = new Map<string, number>();
  const examples = new Map<string, string>();
  let combosTested = 0;

  function record(build: BikeBuild) {
    combosTested++;
    for (const w of getCompatibilityWarnings(build)) {
      fired.set(w.id, (fired.get(w.id) ?? 0) + 1);
      if (!examples.has(w.id)) examples.set(w.id, `${w.severity}: ${w.title}`);
    }
  }

  for (const slots of COMBINATIONS) {
    // Cartesian product across the slots in this group.
    let builds: BikeBuild[] = [{}];
    for (const slot of slots) {
      const next: BikeBuild[] = [];
      for (const base of builds) {
        for (const part of bySlot[slot] ?? []) {
          next.push({ ...base, [slot]: part });
        }
      }
      builds = next;
    }
    for (const b of builds) {
      for (const rider of RIDERS) record(rider ? { ...b, rider } : b);
    }
  }

  const sorted = [...fired.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(JSON.stringify({
    combosTested,
    distinctRulesFired: sorted.length,
    fired: Object.fromEntries(sorted.map(([id, n]) => [id, { count: n, example: examples.get(id) }])),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
