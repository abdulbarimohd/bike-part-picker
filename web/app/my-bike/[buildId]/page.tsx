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
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Info, Loader2, RotateCcw, Wrench,
} from 'lucide-react';
import { api, CompatibilityWarning } from '../../../lib/api-client';
import { BUILDER_SLOTS, GROUPS, GroupKey, GROUP_OF } from '../../../lib/categories';
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

const SEVERITY = {
  critical: { box: 'border-brake-ring bg-brake-soft', head: 'text-brake', body: 'text-brake/80', Icon: AlertTriangle },
  warning: { box: 'border-drive-ring bg-drive-soft', head: 'text-drive', body: 'text-drive/80', Icon: AlertTriangle },
  info: { box: 'border-cockpit-ring bg-cockpit-soft', head: 'text-cockpit', body: 'text-cockpit/80', Icon: Info },
} as const;

const GROUPED = (Object.keys(GROUPS) as GroupKey[])
  .map((key) => ({ key, group: GROUPS[key], slots: BUILDER_SLOTS.filter((s) => GROUP_OF[s.slug] === key) }))
  .filter((g) => g.slots.length > 0);

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
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/my-bike" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
        <ArrowLeft size={14} /> Choose a different bike
      </Link>

      <h1 className="font-display text-3xl font-bold text-ink mb-1">{build?.name}</h1>
      <p className="text-sm text-ink-muted mb-6">
        Everything below is filtered to fit this bike. Swap a part and the rest re-filter around it.
      </p>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div
          className={`sm:col-span-2 flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-card ${
            compatible ? 'border-wheel-ring bg-wheel-soft text-wheel' : 'border-brake-ring bg-brake-soft text-brake'
          }`}
        >
          {compatible ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {compatible
            ? changed.length === 0 ? 'Stock spec — nothing changed yet' : `${changed.length} upgrade${changed.length === 1 ? '' : 's'} selected, all compatible`
            : `${warnings.filter((w) => w.severity === 'critical').length} blocking issue(s)`}
        </div>
        <div className="rounded-xl bg-white border border-black/5 px-4 py-3 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-muted">Upgrade cost</span>
            <span className={`font-display font-bold ${priceDelta > 0 ? 'text-drive' : priceDelta < 0 ? 'text-wheel' : 'text-ink'}`}>
              {priceDelta === 0 ? '—' : `${priceDelta > 0 ? '+' : '−'}${formatGbp(Math.abs(priceDelta))}`}
              {priceUnknownSlots > 0 && (
                <span className="text-xs font-normal text-ink-muted"> (+{priceUnknownSlots} unpriced)</span>
              )}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-muted">Weight</span>
            <span className={`text-sm font-medium ${weightDelta < 0 ? 'text-wheel' : weightDelta > 0 ? 'text-drive' : 'text-ink'}`}>
              {weightDelta === 0 ? '—' : `${weightDelta > 0 ? '+' : '−'}${Math.abs(weightDelta)} g`}
            </span>
          </div>
        </div>
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
              {slots.map(({ slot, label, slug, position }, i) => {
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

                return (
                  <div
                    key={slot}
                    className={`px-3.5 py-2.5 ${i !== 0 ? 'border-t border-black/5' : ''} ${
                      blocked ? 'bg-brake-soft' : flagged ? 'bg-drive-soft' : isChanged ? 'bg-contact-soft/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: group.soft, color: group.accent }}>
                        <PartIcon slug={slug} className="w-[18px] h-[18px]" />
                      </span>
                      <span className={`text-sm w-32 shrink-0 ${blocked ? 'text-brake font-medium' : 'text-ink-muted'}`}>
                        {label}
                        {notFitted && <span className="block text-[10px] text-ink-muted/60">not fitted</span>}
                      </span>

                      {/* The frame is the fixed anchor — everything else
                          links through to the picker. */}
                      {isAnchor ? (
                        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg bg-black/[0.03] border border-black/5">
                          <span className="truncate text-ink">
                            {currentPart ? `${currentPart.part.brand} ${currentPart.part.name}` : '—'}
                          </span>
                          <span className="chip bg-white text-ink-muted ml-auto shrink-0">your frame</span>
                        </div>
                      ) : (
                        <Link
                          href={`/pick/${buildId}/${slot}?from=my-bike`}
                          className={`flex-1 min-w-0 flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg border transition-colors hover:bg-black/[0.02] ${
                            blocked ? 'border-brake-ring' : isChanged ? 'border-contact-ring' : 'border-black/10'
                          }`}
                        >
                          <span className="truncate text-ink">
                            {currentPart
                              ? <><span className="text-ink-muted">{currentPart.part.brand}</span> {currentPart.part.name}</>
                              : <span className="text-ink-muted/60">
                                  {list.length === 0 ? 'Nothing compatible' : `Choose from ${list.length}`}
                                </span>}
                          </span>

                          {/* "your ___" marks what's on the bike today;
                              once swapped it becomes the new choice. */}
                          {currentPart && (
                            <span className={`chip ml-auto shrink-0 ${isChanged ? 'bg-contact-soft text-contact' : 'bg-black/[0.04] text-ink-muted'}`}>
                              {isChanged ? 'upgrade' : `your ${label.toLowerCase()}`}
                            </span>
                          )}
                          <ChevronRight size={15} className="text-ink-muted/50 shrink-0" />
                        </Link>
                      )}

                      {isChanged && stockPart && (
                        <button
                          onClick={() => swap(slot, stockPart.part.id, position)}
                          title="Back to stock"
                          className="text-ink-muted hover:text-ink shrink-0 p-1.5"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>

                    {isChanged && (
                      <div className="flex items-center gap-2 mt-1.5 ml-11 text-xs">
                        <span className="text-ink-muted">
                          Stock: {stockPart ? `${stockPart.part.brand} ${stockPart.part.name}` : '—'}
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

      {warnings.map((w, i) => {
        const s = SEVERITY[w.severity];
        return (
          <div key={`${w.id}-${i}`} className={`rounded-xl border px-4 py-3.5 mb-2.5 ${s.box}`}>
            <div className={`text-sm font-semibold flex items-center gap-2 ${s.head}`}>
              <s.Icon size={15} /> {w.title}
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
    </div>
  );
}
