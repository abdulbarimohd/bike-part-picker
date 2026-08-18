// src/services/build.service.test.ts
//
// Run: npm test
//
// shapeBuildParts is pure and DB-free (see build.service.ts), so this
// tests it directly with synthetic BuildPart fixtures -- no Prisma, no
// database, same style as engine.test.ts.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shapeBuildParts, type RawBuildPart } from './build.service';
import { PartType } from '@prisma/client';

function shifterPart(slot: string | null, speeds: number, name: string): RawBuildPart {
  return {
    slot,
    part: {
      type: PartType.SHIFTER,
      brand: 'Shimano',
      name,
      shifter: { speeds, cablePullStandard: 'SHIMANO_ROAD' },
    },
  };
}

describe('shapeBuildParts — shifter left/right resolution', () => {
  // The catalog-wide convention this whole fix depends on: a mechanical
  // drop-bar 2x shifter pair's left lever stores `speeds: 2` (front
  // chainring count), the right lever stores the real cassette speed
  // count. Every drivetrain rule (R-DRV-02/10, R-FD-04) needs the right
  // lever's value from the single `build.shifter` slot.

  test('right lever wins when added after left', () => {
    const build = shapeBuildParts([
      shifterPart('left', 2, 'ST-RX400-L GRX'),
      shifterPart('right', 10, 'ST-RX400-R GRX'),
    ]);
    assert.equal(build.shifter?.speeds, 10);
    assert.equal(build.shifter?.name, 'ST-RX400-R GRX');
  });

  test('right lever wins when added BEFORE left (insertion order must not matter)', () => {
    // This is the exact failure mode that shipped: whichever side
    // happened to be added last silently won, so a build assembled in
    // "right, then left" order used to end up with speeds: 2 in
    // build.shifter and produced false R-DRV-02/R-DRV-10 criticals.
    const build = shapeBuildParts([
      shifterPart('right', 10, 'ST-RX400-R GRX'),
      shifterPart('left', 2, 'ST-RX400-L GRX'),
    ]);
    assert.equal(build.shifter?.speeds, 10);
    assert.equal(build.shifter?.name, 'ST-RX400-R GRX');
  });

  test('a single 1x/MTB trigger shifter with no slot still resolves', () => {
    const build = shapeBuildParts([shifterPart(null, 12, 'RD-M8100 trigger')]);
    assert.equal(build.shifter?.speeds, 12);
  });

  test('electronic (Di2/AXS) pairs, where both sides carry the real speed count, still resolve to one shifter', () => {
    const build = shapeBuildParts([
      shifterPart('left', 12, 'ST-RX825-L GRX Di2'),
      shifterPart('right', 12, 'ST-RX825-R GRX Di2'),
    ]);
    assert.equal(build.shifter?.speeds, 12);
  });

  test('a lone left lever (no right present) still resolves rather than leaving the slot empty', () => {
    const build = shapeBuildParts([shifterPart('left', 2, 'ST-RX400-L GRX')]);
    assert.equal(build.shifter?.speeds, 2);
  });

  test('"rear" wins the same way "right" does (some existing catalog rows use front/rear for shifters, not left/right)', () => {
    const build = shapeBuildParts([
      shifterPart('front', 2, 'ST-RX820-L GRX'),
      shifterPart('rear', 12, 'ST-RX820-R GRX'),
    ]);
    assert.equal(build.shifter?.speeds, 12);
  });

  test('"rear" wins regardless of insertion order too', () => {
    const build = shapeBuildParts([
      shifterPart('rear', 12, 'ST-RX820-R GRX'),
      shifterPart('front', 2, 'ST-RX820-L GRX'),
    ]);
    assert.equal(build.shifter?.speeds, 12);
  });
});

describe('shapeBuildParts — paired and single slots still work after the refactor', () => {
  test('front/rear rotors resolve by explicit slot', () => {
    const build = shapeBuildParts([
      { slot: 'front', part: { type: PartType.ROTOR, brand: 'Shimano', name: 'SM-RT30 180mm', rotor: { diameterMm: 180, mountStandard: 'CENTERLOCK' } } },
      { slot: 'rear', part: { type: PartType.ROTOR, brand: 'Shimano', name: 'SM-RT30 160mm', rotor: { diameterMm: 160, mountStandard: 'CENTERLOCK' } } },
    ]);
    assert.equal(build.frontRotor?.diameterMm, 180);
    assert.equal(build.rearRotor?.diameterMm, 160);
  });

  test('a single un-slotted tyre covers both front and rear', () => {
    const build = shapeBuildParts([
      { slot: null, part: { type: PartType.TYRE, brand: 'WTB', name: 'Riddler TCS Light', tyre: { widthMm: 37 } } },
    ]);
    assert.equal(build.frontTyre?.widthMm, 37);
    assert.equal(build.rearTyre?.widthMm, 37);
  });

  test('single-slot categories (e.g. crankset) resolve normally', () => {
    const build = shapeBuildParts([
      { slot: null, part: { type: PartType.CRANKSET, brand: 'Shimano', name: 'FC-RX600 GRX', crankset: { chainlineMm: 47 } } },
    ]);
    assert.equal(build.crankset?.chainlineMm, 47);
  });
});
