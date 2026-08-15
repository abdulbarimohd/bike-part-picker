// scripts/import/extract_99spokes.ts
//
// 99 Spokes is used as a CATALOGUE, not a spec source. It is very good at
// one question ("what bikes exist, and what parts ship on them") and poor
// at another ("what are this frame's interface dimensions") — of the 27
// frame fields our compatibility engine reads, this export only touches 4,
// and partially at that (43% BB coverage, 17% hanger coverage). The other
// 23 fields (axle type, dropout type, headset standards, seatpost diameter,
// chainstay length, reach/stack, ...) are not in this file in any form.
//
// So this script does NOT try to fill the Frame model. It produces two
// things:
//
//   1. bikes.json    — per-bike identity + as-shipped build spec, tagged
//                       DATA_FEED with a sourceUrl back to the 99 Spokes
//                       page. This is real, usable data for "I already own
//                       a bike" — it just isn't frame geometry.
//   2. platforms.json — bikes grouped by (maker, family), the unit that
//                       actually determines frame interfaces (a shell
//                       standard is a property of the mould, not the
//                       build). This is the sourcing list for pulling real
//                       Frame data from manufacturer geometry pages.
//
// Usage:
//   unzip sample.xlsx -d sample_x
//   tsx scripts/import/extract_99spokes.ts sample_x/xl out/
//
// See 99spokes-key.ts for the bottom-bracket/hanger decode logic this
// script also runs, and 99SPOKES-DECODE.md for how it was verified.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readSheet, namedRows } from './xlsx-reader';
import { decodeBottomBracket, decodeHangerStandard, normalisedLabelConflict } from './99spokes-key';

interface BikeRow {
  ID: string | number | null;
  URL: string | null;
  Maker: string | null;
  Year: number | null;
  Model: string | null;
  Family: string | null;
  Category: string | null;
  Subcategory: string | null;
  'E-Bike': boolean | null;
  'Price [USD]': number | null;
  'Frame [Raw]': string | null;
  'Frame [Material]': string | null;
  'Frame [Tire Clearance]': string | null;
  'Frame [Hanger Standard]': string | null;
  'Suspension [Configuration]': string | null;
  'Bottom Bracket [Raw]': string | null;
  'Bottom Bracket [Maker]': string | null;
  'Bottom Bracket [Standard]': string | null;
  'Shifters [Raw]': string | null;
  'RD [Raw]': string | null;
  'FD [Raw]': string | null;
  'Crank [Raw]': string | null;
  'Cassette [Raw]': string | null;
  'Chain [Raw]': string | null;
  'Brakes [Raw]': string | null;
  'Wheelset [Raw]': string | null;
  'Tires [Raw]': string | null;
  'Handlebar [Raw]': string | null;
  'Stem [Raw]': string | null;
  'Seatpost [Raw]': string | null;
  'Saddle [Raw]': string | null;
  [key: string]: string | number | boolean | null;
}

interface BikeSpine {
  sourceId: string;
  sourceUrl: string | null;
  maker: string;
  family: string | null;
  model: string;
  year: number | null;
  category: string | null;
  subcategory: string | null;
  isEbike: boolean;
  material: string | null;
  suspension: string | null;
  priceUsd: number | null;
  platformKey: string;
  familyPlatformKey: string;
  buildSpec: {
    shifters: string | null;
    rearDerailleur: string | null;
    frontDerailleur: string | null;
    crank: string | null;
    cassette: string | null;
    chain: string | null;
    brakes: string | null;
    wheelset: string | null;
    tyres: string | null;
    handlebar: string | null;
    stem: string | null;
    seatpost: string | null;
    saddle: string | null;
  };
  bottomBracket: {
    raw: string | null;
    theirLabel: string | null;
    decoded: string | null;
    decodedConfidence: 'stated' | 'derived' | null;
    decodeFailReason: string | null;
    labelConflict: string | null;
  };
  hanger: {
    raw: string | null;
    decoded: string | null;
  };
  dataSource: 'DATA_FEED';
}

interface Platform {
  platformKey: string;
  familyPlatformKey: string;
  maker: string;
  family: string;
  material: string | null;
  suspension: string | null;
  bikeCount: number;
  years: number[];
  models: string[];
  ebikeCount: number;
  /** How many of this platform's bikes already have a decoded BB from the file. */
  bbDecodedCount: number;
  /** Distinct raw BB strings seen for this platform — useful context for sourcing. */
  sampleBbRaw: string[];
  sourceUrls: string[];
}

/**
 * A "family" text label (99 Spokes' Family column) is NOT reliably one
 * physical frame. Cannondale ships "Topstone" and "Topstone Carbon" under the
 * same family, on different moulds with different BB shells (confirmed: the
 * alloy line stayed BSA-threaded while carbon generations moved through
 * BB30/PF30 before settling on BSA_68) -- writing one Frame spec per family
 * would silently misdescribe part of it. Material + suspension configuration
 * (rigid/hardtail/full) are the two properties that actually track a mould
 * change, so the sourcing unit is (maker, family, material, suspension), not
 * (maker, family) alone. `familyPlatformKey` keeps the coarser grouping
 * around so a rollup across variants of one family is still possible.
 */
function platformKey(maker: string, family: string, material: string | null, suspension: string | null): string {
  return `${maker}::${family}::${material ?? '?'}::${suspension ?? '?'}`;
}
function familyPlatformKey(maker: string, family: string): string {
  return `${maker}::${family}`;
}

function main() {
  const [xlDir, outDir] = process.argv.slice(2);
  if (!xlDir || !outDir) {
    console.error('usage: tsx extract_99spokes.ts <unzipped-xlsx>/xl <outdir>');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const rows = readSheet(xlDir) as unknown as { rowNum: number; cells: Record<string, unknown> }[];
  const bikeRows = namedRows(rows as never) as unknown as BikeRow[];

  const bikes: BikeSpine[] = [];
  const platforms = new Map<string, Platform>();

  for (const r of bikeRows) {
    const maker = String(r.Maker ?? '').trim();
    const model = String(r.Model ?? '').trim();
    if (!maker || !model) continue; // no identity, nothing to record

    const family = r.Family != null ? String(r.Family).trim() : null;
    const material = r['Frame [Material]'] != null ? String(r['Frame [Material]']) : null;
    const suspension = r['Suspension [Configuration]'] != null ? String(r['Suspension [Configuration]']) : null;
    const pKey = platformKey(maker, family || model, material, suspension);
    const fpKey = familyPlatformKey(maker, family || model);
    const isEbike = r['E-Bike'] === true;

    const bbRaw = r['Bottom Bracket [Raw]'] != null ? String(r['Bottom Bracket [Raw]']) : null;
    const bbLabel = r['Bottom Bracket [Standard]'] != null ? String(r['Bottom Bracket [Standard]']) : null;
    const bbDecoded = decodeBottomBracket(bbRaw, isEbike);
    const conflict = normalisedLabelConflict(bbLabel, bbRaw);

    const hangerRaw = r['Frame [Hanger Standard]'] != null ? String(r['Frame [Hanger Standard]']) : null;
    const hangerDecoded = decodeHangerStandard(hangerRaw);

    const spine: BikeSpine = {
      sourceId: String(r.ID ?? ''),
      sourceUrl: r.URL != null ? String(r.URL) : null,
      maker,
      family,
      model,
      year: typeof r.Year === 'number' ? r.Year : null,
      category: r.Category != null ? String(r.Category) : null,
      subcategory: r.Subcategory != null ? String(r.Subcategory) : null,
      isEbike,
      material,
      suspension,
      priceUsd: typeof r['Price [USD]'] === 'number' ? r['Price [USD]'] : null,
      platformKey: pKey,
      familyPlatformKey: fpKey,
      buildSpec: {
        shifters: r['Shifters [Raw]'] != null ? String(r['Shifters [Raw]']) : null,
        rearDerailleur: r['RD [Raw]'] != null ? String(r['RD [Raw]']) : null,
        frontDerailleur: r['FD [Raw]'] != null ? String(r['FD [Raw]']) : null,
        crank: r['Crank [Raw]'] != null ? String(r['Crank [Raw]']) : null,
        cassette: r['Cassette [Raw]'] != null ? String(r['Cassette [Raw]']) : null,
        chain: r['Chain [Raw]'] != null ? String(r['Chain [Raw]']) : null,
        brakes: r['Brakes [Raw]'] != null ? String(r['Brakes [Raw]']) : null,
        wheelset: r['Wheelset [Raw]'] != null ? String(r['Wheelset [Raw]']) : null,
        tyres: r['Tires [Raw]'] != null ? String(r['Tires [Raw]']) : null,
        handlebar: r['Handlebar [Raw]'] != null ? String(r['Handlebar [Raw]']) : null,
        stem: r['Stem [Raw]'] != null ? String(r['Stem [Raw]']) : null,
        seatpost: r['Seatpost [Raw]'] != null ? String(r['Seatpost [Raw]']) : null,
        saddle: r['Saddle [Raw]'] != null ? String(r['Saddle [Raw]']) : null,
      },
      bottomBracket: {
        raw: bbRaw,
        theirLabel: bbLabel,
        decoded: bbDecoded.ok ? bbDecoded.value : null,
        decodedConfidence: bbDecoded.ok ? bbDecoded.confidence : null,
        decodeFailReason: bbDecoded.ok ? null : bbDecoded.reason,
        labelConflict: conflict,
      },
      hanger: {
        raw: hangerRaw,
        decoded: hangerDecoded.ok ? hangerDecoded.value : null,
      },
      dataSource: 'DATA_FEED',
    };
    bikes.push(spine);

    let p = platforms.get(pKey);
    if (!p) {
      p = {
        platformKey: pKey, familyPlatformKey: fpKey, maker, family: family || model,
        material, suspension, bikeCount: 0,
        years: [], models: [], ebikeCount: 0, bbDecodedCount: 0, sampleBbRaw: [], sourceUrls: [],
      };
      platforms.set(pKey, p);
    }
    p.bikeCount++;
    if (spine.year != null && !p.years.includes(spine.year)) p.years.push(spine.year);
    if (!p.models.includes(model)) p.models.push(model);
    if (isEbike) p.ebikeCount++;
    if (spine.bottomBracket.decoded) p.bbDecodedCount++;
    if (bbRaw && !p.sampleBbRaw.includes(bbRaw) && p.sampleBbRaw.length < 5) p.sampleBbRaw.push(bbRaw);
    if (spine.sourceUrl && !p.sourceUrls.includes(spine.sourceUrl) && p.sourceUrls.length < 3) p.sourceUrls.push(spine.sourceUrl);
  }

  const platformList = [...platforms.values()].sort((a, b) => b.bikeCount - a.bikeCount);

  writeFileSync(join(outDir, 'bikes.json'), JSON.stringify(bikes, null, 2));
  writeFileSync(join(outDir, 'platforms.json'), JSON.stringify(platformList, null, 2));

  const familyGroups = new Map<string, Platform[]>();
  for (const p of platformList) {
    const g = familyGroups.get(p.familyPlatformKey) ?? [];
    g.push(p);
    familyGroups.set(p.familyPlatformKey, g);
  }
  const splitFamilies = [...familyGroups.entries()].filter(([, ps]) => ps.length > 1);

  console.log(`${bikes.length} bikes -> ${platformList.length} sourcing units (mould-level: maker+family+material+suspension)`);
  console.log(`${familyGroups.size} distinct (maker, family) labels, of which ${splitFamilies.length} span more than one mould`);
  console.log(`written: ${join(outDir, 'bikes.json')}, ${join(outDir, 'platforms.json')}`);

  console.log('\ntop sourcing units by bike count:');
  for (const p of platformList.slice(0, 12)) {
    console.log(`  ${String(p.bikeCount).padStart(3)}  ${p.maker} ${p.family}  [${p.material ?? '?'}/${p.suspension ?? '?'}]  [${p.years.sort().join('/')}]  bb decoded ${p.bbDecodedCount}/${p.bikeCount}`);
  }

  console.log('\nfamilies that split into multiple moulds (do NOT write one Frame spec for these):');
  for (const [fk, ps] of splitFamilies.sort((a, b) => b[1].reduce((s, p) => s + p.bikeCount, 0) - a[1].reduce((s, p) => s + p.bikeCount, 0))) {
    const total = ps.reduce((s, p) => s + p.bikeCount, 0);
    console.log(`  ${fk}  (${total} bikes, ${ps.length} moulds)`);
    for (const p of ps.sort((a, b) => b.bikeCount - a.bikeCount)) {
      console.log(`      ${String(p.bikeCount).padStart(3)}  [${p.material ?? '?'}/${p.suspension ?? '?'}]  bb decoded ${p.bbDecodedCount}/${p.bikeCount}`);
    }
  }
}

main();
