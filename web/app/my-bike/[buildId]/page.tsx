'use client';

// app/my-bike/[buildId]/page.tsx
//
// The upgrade view. Differs from the scratch builder in emphasis: every
// slot starts filled with what the bike shipped with, and the job is
// swapping rather than choosing. So each row shows the stock part, the
// compatible alternatives, and the price/weight delta against stock.
//
// The compatibility logic is identical — same `?compatibleWith=` query.
// A factory bike is just a build with every slot occupied.

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Info, Loader2, LogIn, RotateCcw, Wrench,
} from 'lucide-react';
import { api, CompatibilityWarning } from '../../../lib/api-client';
import { BUILDER_SLOTS, GROUPS, GroupKey, GROUP_OF } from '../../../lib/categories';
import { splitDisplayName } from '../../../lib/display-name';
import { formatGbp } from '../../../lib/money';
import PartIcon from '../../../components/PartIcon';

const TYPE_TO_SLOTS: Record<string, string[]> = {
  FRAME: ['frame'], FORK: ['fork'], HEADSET: ['headset'], REAR_SHOCK: ['rearShock'],
  BOTTOM_BRACKET: ['bottomBracket'], CRANKSET: ['crankset'], CHAINRING: ['chainring'],
  CASSETTE: ['cassette'], CHAIN: ['chain'], SHIFTER: ['shifter'],
  REAR_DERAILLEUR: ['rearDerailleur'], FRONT_DERAILLEUR: ['frontDerailleur'],
  WHEELSET: ['wheelset'], TYRE: ['frontTyre', 'rearTyre'], TUBE: ['frontTube', 'rearTube'],
  BRAKE_CALIPER: ['brakeCaliper'], BRAKE_LEVER: ['brakeLever'], ROTOR: ['frontRotor', 'rearRotor'],
  HANDLEBAR: ['handlebar'], STEM: ['stem'], SEATPOST: ['seatpost'], SEAT_CLAMP: ['seatClamp'],
  SADDLE: ['saddle'], PEDAL: ['pedal'], SHOE: ['shoe'], CHAIN_GUIDE: ['chainGuide'],
  DERAILLEUR_HANGER: ['derailleurHanger'],
};

function bySlot(buildParts: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  const used: Record<string, number> = {};
  for (const bp of buildParts ?? []) {
    const slots = TYPE_TO_SLOTS[bp.part.type];
    if (!slots) continue;
    if (bp.slot === 'front' && slots[0]) out[slots[0]] = bp;
    else if (bp.slot === 'rear' && slots[1]) out[slots[1]] = bp;
    else {
      const i = used[bp.part.type] ?? 0;
      out[slots[Math.min(i, slots.length - 1)]] = bp;
      used[bp.part.type] = i + 1;
    }
  }
  return out;
}

// text-{colour}-text (not text-{colour}) and full opacity (not /80) --
// the plain accent colour reads 2.68-4.28:1 against its own soft
// background, short of WCAG AA's 4.5:1 floor for normal text; -text is
// a darkened same-hue variant that clears it. See tailwind.config.ts.
const SEVERITY = {
  critical: { box: 'border-brake-ring bg-brake-soft', head: 'text-brake-text', body: 'text-brake-text', Icon: AlertTriangle },
  // `warn` (yellow status token), same as BuilderMatrix -- see the note there.
  warning: { box: 'border-warn-ring bg-warn-soft', head: 'text-warn-text', body: 'text-warn-text', Icon: AlertTriangle },
  info: { box: 'border-cockpit-ring bg-cockpit-soft', head: 'text-cockpit-text', body: 'text-cockpit-text', Icon: Info },
} as const;

const GROUPED = (Object.keys(GROUPS) as GroupKey[])
  .map((key) => ({ key, group: GROUPS[key], slots: BUILDER_SLOTS.filter((s) => GROUP_OF[s.slug] === key) }))
  .filter((g) => g.slots.length > 0);

// One treatment per row state, and a legend built from the same table
// so the key above the rows can't drift from what the rows actually do.
// The row's chip carries the state; only `issue` also tints the row
// background (it's the one that blocks the build). Everything else stays
// white so the accent colours below mean "subsystem", not "state".
type RowState = 'stock' | 'swapped' | 'issue' | 'check' | 'empty';
const ROW_STATE: Record<RowState, { chipText: string; legend: string; chip: string; row: string; box: string }> = {
  stock: {
    chipText: 'stock', legend: 'what the bike shipped with',
    chip: 'bg-black/[0.05] text-ink-muted', row: '', box: 'border-black/10',
  },
  swapped: {
    chipText: 'swapped', legend: 'a part you’ve chosen (or added)',
    chip: 'bg-contact-soft text-contact ring-1 ring-contact-ring', row: '', box: 'border-contact-ring',
  },
  issue: {
    chipText: 'issue', legend: 'blocks the build — see issues below',
    chip: 'bg-brake-soft text-brake-text ring-1 ring-brake-ring', row: 'bg-brake-soft/40', box: 'border-brake-ring',
  },
  check: {
    chipText: 'check', legend: 'fits, but read the note below',
    chip: 'bg-drive-soft text-drive-text ring-1 ring-drive-ring', row: '', box: 'border-drive-ring',
  },
  empty: {
    chipText: 'empty', legend: 'nothing chosen for this slot yet',
    chip: 'bg-transparent text-ink-muted/70 border border-dashed border-black/20', row: '', box: 'border-dashed border-black/15',
  },
};

/**
 * A paired slot (tyres, tubes, rotors) can trip the same rule once for
 * front and once for rear, producing two back-to-back boxes with an
 * identical title and message. Merged at render by (id, severity, title,
 * message) — a rule whose title already says "front" vs "rear" is two
 * distinct notes and stays two boxes; the badge says "front & rear" only when the merged
 * warnings' own `components` actually name both positions — otherwise
 * it's just a count, since nothing else in the data says which is which.
 */
interface MergedWarning extends CompatibilityWarning {
  count: number;
  mergedComponents: string[];
}

function dedupeWarnings(warnings: CompatibilityWarning[]): MergedWarning[] {
  const out: MergedWarning[] = [];
  for (const w of warnings) {
    const prev = out.find((x) => x.id === w.id && x.severity === w.severity && x.title === w.title && x.message === w.message);
    if (prev) {
      prev.count += 1;
      prev.mergedComponents.push(...(w.components ?? []));
    } else {
      out.push({ ...w, count: 1, mergedComponents: [...(w.components ?? [])] });
    }
  }
  return out;
}

function mergedBadge(w: MergedWarning): string | null {
  if (w.count < 2) return null;
  const hasFront = w.mergedComponents.some((c) => c.startsWith('front'));
  const hasRear = w.mergedComponents.some((c) => c.startsWith('rear'));
  if (w.count === 2 && hasFront && hasRear) return 'front & rear';
  return `×${w.count}`;
}

/**
 * Part names come from manufacturer feeds that often lead with the SKU
 * ("FC-FRC-1W-D2 Force 1 Wide Crankset"). splitDisplayName puts the
 * human-readable model line first and the code in small mono after it.
 */
function PartName({ brand, name }: { brand?: string | null; name: string }) {
  const dn = splitDisplayName(brand, name);
  return (
    <>
      {brand && <span className="text-ink-muted">{brand}</span>} {dn.title}
      {dn.sku && <span className="font-mono text-[10px] text-ink-muted/60"> {dn.sku}</span>}
    </>
  );
}

export default function UpgradePage() {
  const { buildId } = useParams<{ buildId: string }>();
  const [build, setBuild] = useState<any>(null);
  const [stock, setStock] = useState<Record<string, any>>({});
  const [current, setCurrent] = useState<Record<string, any>>({});
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([]);
  const [compatible, setCompatible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const b = await api.getBuild(buildId);
    setBuild(b);
    setCurrent(bySlot(b.buildParts));
    // Stock comes from the factory spec attached to the build, not from
    // whatever was on screen first — otherwise leaving for the picker
    // and coming back would silently redefine "stock" as your last swap.
    setStock(bySlot(b.basedOnModel?.parts ?? []));

    const [lists, validation] = await Promise.all([
      Promise.all(BUILDER_SLOTS.map((s) =>
        api.getParts(s.slug, { compatibleWith: buildId, position: s.position }).catch(() => [] as any[]))),
      api.validateBuild(buildId),
    ]);
    setOptions(Object.fromEntries(BUILDER_SLOTS.map((s, i) => [s.slot, lists[i]])));
    setWarnings(validation.warnings);
    setCompatible(validation.compatible);
    setLoading(false);
  }, [buildId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function swap(slot: string, partId: string, position?: 'front' | 'rear') {
    setBusy(true);
    if (!partId) {
      const c = current[slot];
      if (c) await api.removeBuildPart(buildId, c.part.id);
    } else {
      await api.setBuildPart(buildId, partId, { slot: position });
    }
    await refresh();
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-16 text-center">
        <Loader2 className="animate-spin text-ink-muted mx-auto" />
      </div>
    );
  }

  const changed = BUILDER_SLOTS.filter((s) => current[s.slot]?.part?.id !== stock[s.slot]?.part?.id);
  // `?? 0` here used to mean a manufacturer-sourced part with no published
  // price was silently counted as free in the upgrade-cost total, on both
  // the stock and current side — with real imported data now filling most
  // slots, that understated the total with no indication anything was
  // excluded. Slots involving an unpriced part are tracked separately and
  // the total carries an explicit caveat instead.
  const priceUnknownSlots = Object.values(stock).filter((bp: any) => bp?.part && bp.part.basePricePence == null).length
    + Object.values(current).filter((bp: any) => bp?.part && bp.part.basePricePence == null).length;
  const stockTotal = Object.values(stock).reduce((n: number, bp: any) => n + (bp?.part?.basePricePence ?? 0), 0);
  const currentTotal = Object.values(current).reduce((n: number, bp: any) => n + (bp?.part?.basePricePence ?? 0), 0);
  const stockWeight = Object.values(stock).reduce((n: number, bp: any) => n + (bp?.part?.weightGrams ?? 0), 0);
  const currentWeight = Object.values(current).reduce((n: number, bp: any) => n + (bp?.part?.weightGrams ?? 0), 0);
  const priceDelta = currentTotal - stockTotal;
  const weightDelta = currentWeight - stockWeight;

  const criticalSlots = new Set(warnings.filter((w) => w.severity === 'critical').flatMap((w) => w.components));
  const warnSlots = new Set(warnings.filter((w) => w.severity === 'warning').flatMap((w) => w.components));
  // Rendered list and the "N blocking issues" count both use the merged
  // view, so the count always matches the number of boxes it jumps to.
  const dedupedWarnings = dedupeWarnings(warnings);
  const blockingCount = dedupedWarnings.filter((w) => w.severity === 'critical').length;

  // A rigid frame has no rear-shock interface at all — not "not fitted",
  // genuinely not a real slot on this bike. Same signal the compatibility
  // engine already uses to abstain from every R-SHK-* rule (a null
  // shockEyeToEyeMm means no shock mount exists, not "unsourced" — see
  // engine.ts). Anchored on the frame's own data, not the header
  // discipline switch: that's a rider browsing preference, not a fact
  // about this specific bike, and every current gravel/road frame in the
  // catalogue already lacks this field the same way a hardtail would.
  // Guarded on `frame` being loaded so a slow first fetch doesn't flash
  // the row away before there's data to judge it by.
  const frame = stock['frame']?.part?.frame;
  const rearShockNotApplicable = Boolean(frame) && frame.shockEyeToEyeMm == null;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <Link href="/my-bike" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
        <ArrowLeft size={14} /> Choose a different bike
      </Link>

      <h1 className="font-display text-3xl font-bold text-ink mb-1">{build?.name}</h1>
      <p className="text-sm text-ink-muted mb-6">
        Everything below is filtered to fit this bike. Swap a part and the rest re-filter around it.
      </p>

      {/* Optional, not a gate: cloning a bike already works signed out.
          Logging in just means this survives past this browser. */}
      {build?.isAnonymous && (
        <Link
          href={`/login?build=${buildId}&from=my-bike`}
          className="flex items-center gap-2.5 rounded-xl border border-chassis-ring bg-chassis-soft px-4 py-3 mb-6 text-sm text-chassis hover:bg-chassis-soft/70 transition-colors"
        >
          <LogIn size={16} className="shrink-0" />
          This build isn&apos;t saved to an account yet — log in to keep it, or ignore this and keep going.
          <ChevronRight size={15} className="ml-auto shrink-0" />
        </Link>
      )}

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {compatible ? (
          <div className="sm:col-span-2 flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-card border-wheel-ring bg-wheel-soft text-wheel-text">
            <CheckCircle2 size={18} className="shrink-0" />
            {changed.length === 0 ? 'Stock spec — nothing changed yet' : `${changed.length} upgrade${changed.length === 1 ? '' : 's'} selected, all compatible`}
          </div>
        ) : (
          /* A real jump link to the issues list further down (which is
             otherwise easy to miss below 30 rows), with the same chevron
             the login banner above uses — so what's clickable reads
             consistently. */
          <a
            href="#issues"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="sm:col-span-2 flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-card border-brake-ring bg-brake-soft text-brake-text hover:bg-brake-soft/70 transition-colors"
          >
            <AlertTriangle size={18} className="shrink-0" />
            {blockingCount} blocking issue{blockingCount === 1 ? '' : 's'}
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal shrink-0">
              See details <ChevronDown size={15} />
            </span>
          </a>
        )}
        {/* Same radius / border weight / padding as the status card
            beside it, so the two read as one row of summary tiles. A zero
            delta is "no change" rather than missing data, but it gets the
            same lighter, muted, unit-carrying treatment as every other
            no-value placeholder on this page. */}
        <div className="rounded-xl bg-white border border-black/10 px-4 py-3.5 shadow-card flex flex-col justify-center gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-ink-muted">Upgrade cost</span>
            <span className={`font-display font-bold ${priceDelta > 0 ? 'text-drive' : priceDelta < 0 ? 'text-wheel' : ''}`}>
              {priceDelta === 0
                ? <span className="font-sans font-normal text-sm text-ink-muted/60">£0.00</span>
                : `${priceDelta > 0 ? '+' : '−'}${formatGbp(Math.abs(priceDelta))}`}
              {priceUnknownSlots > 0 && (
                <span className="font-sans text-xs font-normal text-ink-muted"> (+{priceUnknownSlots} unpriced)</span>
              )}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-ink-muted">Weight</span>
            <span className={`text-sm font-medium ${weightDelta < 0 ? 'text-wheel' : weightDelta > 0 ? 'text-drive' : ''}`}>
              {weightDelta === 0
                ? <span className="font-normal text-ink-muted/60">0 g</span>
                : `${weightDelta > 0 ? '+' : '−'}${Math.abs(weightDelta)} g`}
            </span>
          </div>
        </div>
      </div>

      {/* Row-state key. Every row below is in exactly one of these
          states (issue > check > swapped/added > stock > empty), each
          with a single treatment — the chip on the row plus, for issue
          rows only, a tinted background. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-[11px] text-ink-muted">
        <span className="uppercase tracking-wider font-semibold text-ink-muted/70">Key</span>
        {(Object.keys(ROW_STATE) as RowState[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`chip ${ROW_STATE[k].chip}`}>{ROW_STATE[k].chipText}</span>
            {ROW_STATE[k].legend}
          </span>
        ))}
      </div>

      {/* Slots */}
      <div className={`space-y-5 mb-8 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
        {GROUPED.map(({ key, group, slots }) => (
          <div key={key}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: group.accent }} />
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">{group.label}</h2>
              <div className="flex-1 h-px bg-black/5" />
            </div>

            <div className="rounded-xl border border-black/5 bg-white shadow-card overflow-hidden">
              {slots
                .filter(({ slot }) => !(slot === 'rearShock' && rearShockNotApplicable))
                .map(({ slot, label, slug, position }, i) => {
                const stockPart = stock[slot];
                const currentPart = current[slot];
                const isChanged = currentPart?.part?.id !== stockPart?.part?.id;
                const blocked = criticalSlots.has(slot);
                const flagged = warnSlots.has(slot);
                const list = options[slot] ?? [];
                // null (not 0) when either side's price is unpublished --
                // a stock or current part with no price would otherwise
                // read as a real, precise saving/cost on that specific chip.
                const stockPrice = stockPart?.part?.basePricePence;
                const currentPrice = currentPart?.part?.basePricePence;
                const delta = stockPrice != null && currentPrice != null ? currentPrice - stockPrice : null;

                // A slot the bike never had (e.g. pedals) is an addition,
                // not an upgrade — worth showing differently.
                const notFitted = !stockPart;
                // You own this bike: the frame is the fixed anchor every
                // other rule is measured against. Swapping it would mean
                // it's a different bike, so it's shown but not editable.
                const isAnchor = slot === 'frame';

                // Exactly one state per row, most important first — a
                // swapped part that also trips a rule reads as "issue";
                // the "Stock: …" line beneath still shows it was swapped.
                // An empty slot is always "empty", even if a rule mentions
                // it (a rule can flag a slot on the strength of a
                // *neighbouring* part, e.g. a caliper's rotor-size
                // constraint) -- otherwise a row that says "not fitted"
                // wears an issue chip, contradicting the legend.
                const state: RowState = !currentPart ? 'empty'
                  : blocked ? 'issue'
                  : flagged ? 'check'
                  : isChanged ? 'swapped'
                  : 'stock';
                const st = ROW_STATE[state];
                const chipText = state === 'swapped' && notFitted ? 'added' : st.chipText;

                // Name (brand + model line, SKU small) shared by the
                // fixed frame box and the picker links.
                const nameNode = currentPart
                  ? <PartName brand={currentPart.part.brand} name={currentPart.part.name} />
                  : <span className="text-ink-muted/60">
                      {list.length === 0 ? 'Nothing compatible' : `Choose from ${list.length}`}
                    </span>;

                return (
                  <div
                    key={slot}
                    className={`px-3.5 py-2.5 ${i !== 0 ? 'border-t border-black/5' : ''} ${st.row}`}
                  >
                    {/* Below sm the label stacks above the part box so the
                        name keeps the full row width instead of the ~10px
                        that a fixed 128px label column left it at 375px. */}
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: group.soft, color: group.accent }}>
                        <PartIcon slug={slug} className="w-[18px] h-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className={`text-sm sm:w-32 shrink-0 ${blocked ? 'text-brake-text font-medium' : 'text-ink-muted'}`}>
                          {label}
                          {notFitted && <span className="block text-[10px] text-ink-muted/60">not fitted</span>}
                        </span>

                        {/* The frame is the fixed anchor — everything else
                            links through to the picker. */}
                        {isAnchor ? (
                          <div
                            title="The frame is the bike itself, so it can't be swapped here"
                            className={`flex-1 min-w-0 flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg border ${st.box}`}
                          >
                            <span className="min-w-0 flex-1 break-words sm:truncate text-ink">
                              {currentPart ? nameNode : <span className="text-ink-muted/60">not fitted</span>}
                            </span>
                            <span className={`chip shrink-0 ${st.chip}`}>{chipText}</span>
                          </div>
                        ) : (
                          <Link
                            href={`/pick/${buildId}/${slot}?from=my-bike`}
                            className={`flex-1 min-w-0 flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg border transition-colors hover:bg-black/[0.02] ${st.box}`}
                          >
                            {/* Below sm the name wraps rather than
                                truncates — a 253px box minus chip and
                                chevron leaves ~145px, and an ellipsis at
                                that width hides most of a long name. */}
                            <span className="min-w-0 flex-1 break-words sm:truncate text-ink">{nameNode}</span>
                            {/* Chip is the row's state; it never steals
                                width from the name because the name is
                                the flex-1 min-w-0 child. Rendered for every
                                state (including empty) so the key above
                                matches what the rows actually show. */}
                            <span className={`chip shrink-0 ${st.chip}`}>{chipText}</span>
                            <ChevronRight size={15} className="text-ink-muted/50 shrink-0" />
                          </Link>
                        )}
                      </div>

                      {isChanged && stockPart && (
                        <button
                          onClick={() => swap(slot, stockPart.part.id, position)}
                          title="Back to stock"
                          className="text-ink-muted hover:text-ink shrink-0 p-1.5 mt-auto sm:mt-0"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>

                    {isChanged && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 ml-11 text-xs">
                        <span className="text-ink-muted">
                          Stock: {stockPart
                            ? <PartName brand={stockPart.part.brand} name={stockPart.part.name} />
                            : <span className="text-ink-muted/60">not fitted</span>}
                        </span>
                        {delta != null && delta !== 0 && (
                          <span className={`chip ${delta > 0 ? 'bg-drive-soft text-drive' : 'bg-wheel-soft text-wheel'}`}>
                            {delta > 0 ? '+' : '−'}{formatGbp(Math.abs(delta))}
                          </span>
                        )}
                        {delta == null && (stockPart || currentPart) && (
                          <span className="chip bg-black/5 text-ink-muted">price unknown</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {dedupedWarnings.length > 0 && (
        /* Jump target for the "N blocking issues" card up top. scroll-mt
           keeps the heading clear of the sticky header on arrival. */
        <section id="issues" className="scroll-mt-24">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-brake" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
              Issues ({dedupedWarnings.length})
            </h2>
            <div className="flex-1 h-px bg-black/5" />
          </div>
          {dedupedWarnings.map((w, i) => {
            const s = SEVERITY[w.severity];
            const badge = mergedBadge(w);
            return (
              <div key={`${w.id}-${i}`} className={`rounded-xl border px-4 py-3.5 mb-2.5 ${s.box}`}>
                <div className={`text-sm font-semibold flex items-center gap-2 ${s.head}`}>
                  <s.Icon size={15} className="shrink-0" /> {w.title}
                  {badge && (
                    <span className="chip bg-white/70 text-[10px] font-medium py-0.5 px-2 opacity-80">{badge}</span>
                  )}
                  <span className="ml-auto text-[10px] font-mono opacity-50">{w.id}</span>
                </div>
                <div className={`text-sm mt-1 leading-relaxed ${s.body}`}>{w.message}</div>
                {w.remedy && (
                  <div className={`text-sm mt-2 flex items-center gap-1.5 font-medium ${s.head}`}>
                    <Wrench size={13} /> {w.remedy}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
