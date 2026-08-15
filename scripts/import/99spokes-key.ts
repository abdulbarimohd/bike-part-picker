// scripts/import/99spokes-key.ts
//
// Decode key for 99 Spokes bike-export columns -> our schema enums.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS NOT
// ---------------------------------------------------------------------------
// It is not a lookup table for "internal 99 Spokes ID codes". No such codes
// exist in the export. The belief that they did came from a parser bug on our
// side: an xlsx cell that is empty is written self-closing (`<c r="W2" s="2"/>`),
// and a regex that required a closing `</c>` ran straight past it and captured
// the NEXT cell's shared-string index. That is where "Hanger Standard: 119"
// came from -- 119 was the shared-string index of "Rigid", the value of the
// adjacent Suspension column. Column W only ever contains the string "udh".
//
// ---------------------------------------------------------------------------
// WHAT THE REAL PROBLEM IS
// ---------------------------------------------------------------------------
// 99 Spokes ships each spec twice:
//   <Thing> [Raw]       - the manufacturer's own spec string (evidence)
//   <Thing> [Standard]  - 99 Spokes' normalised label (their inference)
//
// The normalised column is lossy and occasionally wrong:
//   * lossy   - "BSA" drops the shell width; 68/73/83/100 all normalise to
//               "BSA". "T47" likewise. "BB86/BB92" is two different shells
//               (86.5mm road / 92mm MTB) collapsed into one label.
//   * wrong   - 6 rows label a press-fit BB as "BSA" (threaded). Traced to a
//               model-number lookup (`BB-RS500` is threaded) overriding the
//               explicit "Pressfit"/"PF 86" tokens in the very same string.
//               Shimano sells BOTH a threaded BB-RS500 and a press-fit
//               BB-RS500-PB; the frame spec means the latter.
//
// So the key reads [Raw] and treats [Standard] only as a cross-check. Where
// [Raw] does not state a width, we return null. We never fall back to the
// normalised label, and never infer a width from bike category.
//
// Verified against manufacturer sources -- see 99SPOKES-DECODE.md.

import type { BbShellStandard, HangerStandard } from '../../src/types/parts';

export type Decoded<T> =
  | { ok: true; value: T; evidence: string; confidence: 'stated' | 'derived' }
  | { ok: false; reason: string };

const no = (reason: string): Decoded<never> => ({ ok: false, reason });
const yes = <T>(value: T, evidence: string, confidence: 'stated' | 'derived' = 'stated'): Decoded<T> =>
  ({ ok: true, value, evidence, confidence });

/**
 * Pull every shell width the string states, in any of the forms seen in the
 * real export: "68", "68mm", "86mm", "PF 86,5" (EU decimal comma), "86.5mm".
 *
 * Note the `\s*mm` form must be matched WITHOUT a trailing \b -- "92mm" has
 * no word boundary between "2" and "m", so /\b92\b/ silently misses it.
 */
function statedWidths(s: string): Set<number> {
  const out = new Set<number>();
  for (const m of s.matchAll(/(\d{2,3})(?:[.,]\d)?\s*mm/gi)) out.add(Number(m[1]));
  for (const m of s.matchAll(/\b(?:PF|BB|T47|BSA)[\s-]*(\d{2,3})(?:[.,]\d)?\b/gi)) out.add(Number(m[1]));
  for (const m of s.matchAll(/\b(68|73|83|86|90|92|100|107)\b/g)) out.add(Number(m[1]));
  return out;
}

/**
 * Bottom Bracket [Raw] -> BbShellStandard.
 *
 * Order matters: the e-bike check runs first because a drive unit occupies
 * the shell and there is no bottom bracket standard to record at all.
 */
export function decodeBottomBracket(
  raw: string | null | undefined,
  /**
   * The export's dedicated `E-Bike` boolean column. Pass it: the BB raw string
   * only names the drive unit on some rows ("Bosch, press-fit"), while others
   * just say "cartridge" and look like an ordinary unresolved bike. Gating on
   * this column instead of on the raw text moves 40 rows out of "unknown" and
   * into "no BB standard applies", which is a different and correct answer.
   */
  isEbike?: boolean,
): Decoded<BbShellStandard> {
  if (isEbike === true)
    return no('e-bike: the drive unit occupies the shell — no BB standard applies');
  if (!raw || !String(raw).trim()) return no('no raw spec string');
  const s = String(raw);
  const S = s.toLowerCase();
  const w = statedWidths(s);

  if (/\bbosch\b|\bsteps\b|\bshimano ep\d|\bbrose\b|\byamaha\b|e\+ system/.test(S))
    return no('e-bike drive unit occupies the shell — no BB standard applies');

  const pressfit = /press[\s-]?fit|\bpf\b|\bpf\d/.test(S);
  const threaded = /threaded|\bbsa\b|\bt47\b|english/.test(S);

  // Some standards name themselves and imply their own fitment, so they must
  // be matched BEFORE the press-fit/threaded branches below -- those branches
  // are guarded on a fitment word ("pressfit"/"threaded"), and a string like
  // "FSA BB86 Alloy Cups" states the standard without ever using one. The
  // width was being extracted correctly and then dropped on the floor.
  const named = S.match(/\b(?:bb|pf)[\s-]?(86|90|92|107)\b/);
  if (named) {
    const n = named[1];
    if (n === '86') return yes<BbShellStandard>('BB86', 'raw names the BB86 shell outright');
    if (n === '90') return yes<BbShellStandard>('BB90', 'raw names the BB90 shell outright');
    if (n === '92') return yes<BbShellStandard>('PF92', 'raw names the BB92/PF92 shell outright');
    if (n === '107') return yes<BbShellStandard>('PF107', 'raw names the PF107 shell outright');
  }

  // --- T47 -----------------------------------------------------------
  // "internal bearing" / "external bearing" pins the width without a number:
  // external T47 = 68/73mm shells (bearings outboard), internal T47 =
  // 85.5mm (bearings inboard) on current-generation frames. Verified: Trek
  // Domane/Checkpoint Gen 3/4 use T47 internal at 85.5mm -- BbShellStandard
  // didn't carry that width when this decode was first written; it does
  // now (T47_85_5, added once this gap was confirmed against real data).
  if (/\bt47\b/.test(S)) {
    if (w.has(68)) return yes<BbShellStandard>('T47_68', 'T47 + 68mm stated');
    if (w.has(73)) return yes<BbShellStandard>('T47_73', 'T47 + 73mm stated');
    if (w.has(85)) return yes<BbShellStandard>('T47_85_5', 'T47 + 85(.5)mm stated');
    // 86mm/92mm T47-internal shells exist on some frames but haven't been
    // verified against a real spec here -- T47_85_5 is only confirmed for
    // 85.5mm, so don't fold a different explicit width into it.
    if (w.has(86) || w.has(92))
      return no(`T47 internal at ${w.has(86) ? 86 : 92}mm stated — a real width, but not the verified 85.5mm this enum value covers`);
    if (/internal bearing|internal[\s-]?bb/.test(S))
      return yes<BbShellStandard>('T47_85_5', 'T47 + internal bearing implies 85.5mm on current frames', 'derived');
    if (/external bearing/.test(S))
      return yes<BbShellStandard>('T47_68', 'T47 + external bearing implies a 68mm shell', 'derived');
    return no('T47 with no stated width (T47_68 vs T47_73 vs T47_85_5 unresolved)');
  }

  // --- BB30 / PF30 family --------------------------------------------
  if (/pf\s*30a|bb\s*30a/.test(S))
    return no('PF30A/BB30A (Cannondale asymmetric 83mm) — not representable in BbShellStandard');
  if (/\bpf\s*30\b|pressfit\s*30|press[\s-]?fit\s*30/.test(S))
    return yes<BbShellStandard>('PF30', 'PF30 stated');
  if (/\bbb\s*30\b/.test(S) && !pressfit) return yes<BbShellStandard>('BB30', 'BB30 stated');

  // --- press-fit ------------------------------------------------------
  if (pressfit) {
    if (w.has(92)) return yes<BbShellStandard>('PF92', 'press-fit + 92mm stated');
    if (w.has(86)) return yes<BbShellStandard>('BB86', 'press-fit + 86(.5)mm stated');
    if (w.has(90)) return yes<BbShellStandard>('BB90', 'press-fit + 90mm stated');
    if (w.has(107)) return yes<BbShellStandard>('PF107', 'press-fit + 107mm stated');
    // Shimano's "-PB" suffix means press-fit road, which is the 41x86.5 BB86
    // shell. Confirmed against Shimano's own product data for BB-RS500-PB.
    if (/-?\s?pb\b|\bpb,/.test(S))
      return yes<BbShellStandard>('BB86', 'Shimano -PB press-fit road BB implies an 86.5mm shell', 'derived');
    return no('press-fit with no stated width (BB86 vs PF92 unresolved)');
  }

  // --- threaded -------------------------------------------------------
  if (threaded) {
    if (/italian/.test(S)) return yes<BbShellStandard>('ITALIAN_70', 'Italian thread stated');
    if (w.has(68)) return yes<BbShellStandard>('BSA_68', 'BSA/threaded + 68mm stated');
    if (w.has(73)) return yes<BbShellStandard>('BSA_73', 'BSA/threaded + 73mm stated');
    if (w.has(83)) return yes<BbShellStandard>('BSA_83', 'BSA/threaded + 83mm stated');
    if (w.has(100)) return yes<BbShellStandard>('BSA_100', 'BSA/threaded + 100mm stated');
    return no('BSA/threaded with no stated width (68 vs 73 unresolved)');
  }

  return no('raw names a product, not a shell standard');
}

/**
 * Frame [Hanger Standard] -> HangerStandard.
 *
 * The column holds "udh" or nothing at all. Blank is NOT "not UDH": the 2025
 * Canyon Grizl CF ships UDH dropouts and is blank here, as is every Canyon
 * 2025/2026 row in the sample. Reading blank as PROPRIETARY would tell a rider
 * a SRAM Transmission derailleur cannot fit a frame that in fact takes it --
 * precisely the false negative R-HGR-01 exists to avoid. So blank -> null.
 */
export function decodeHangerStandard(raw: string | null | undefined): Decoded<HangerStandard> {
  if (raw == null || String(raw).trim() === '')
    return no('column blank — means "unrecorded", not "not UDH"');
  const S = String(raw).trim().toLowerCase();
  if (S === 'udh') return yes<HangerStandard>('UDH', 'hanger column states udh');
  return no(`unrecognised hanger token ${JSON.stringify(raw)}`);
}

/**
 * Cross-check 99 Spokes' own normalised label against the raw string. A
 * disagreement means their derived column is unsafe for that row, and is
 * worth surfacing rather than silently preferring one side.
 */
export function normalisedLabelConflict(label: string | null, raw: string | null): string | null {
  if (!label || !raw) return null;
  const S = String(raw).toLowerCase();
  const pressfit = /press[\s-]?fit|\bpf\b|\bpf\d/.test(S);
  const threadedWord = /threaded|\bbsa\b|english/.test(S);
  if (label === 'BSA' && pressfit && !threadedWord)
    return 'label "BSA" (threaded) contradicts raw text stating press-fit';
  if (label === 'BB86/BB92' && threadedWord && !pressfit)
    return 'label "BB86/BB92" (press-fit) contradicts raw text stating threaded';
  if (label === 'T47' && pressfit && !/t47/.test(S))
    return 'label "T47" (threaded) contradicts raw text stating press-fit';
  return null;
}
