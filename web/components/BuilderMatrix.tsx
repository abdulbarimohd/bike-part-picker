'use client';

// components/BuilderMatrix.tsx
//
// One row per build slot, grouped by subsystem. Rows link through to
// the picker page rather than holding a dropdown — with 30 slots and
// specs that matter (freehub type, shock size), a page of cards is far
// easier to compare across than a <select>, and it has room to explain
// why an option doesn't fit instead of silently omitting it.
//
// The counts shown here still come from the filtered list, so a slot
// reads "Choose from 2" when the rest of the build has narrowed it.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronRight, Info, Loader2, Wrench, User } from 'lucide-react';
import { api, CompatibilityWarning } from '../lib/api-client';
import { formatGbp } from '../lib/money';
import { BUILDER_SLOTS, GROUPS, GroupKey, GROUP_OF } from '../lib/categories';
import PartIcon from './PartIcon';
import { useDiscipline } from './DisciplineProvider';
import DisciplineSwitch from './DisciplineSwitch';

interface BuilderMatrixProps {
  buildId: string;
}

/** part.type → the slot(s) it can occupy, for reading a saved build back. */
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

function deriveSelectedFromBuild(build: any): Record<string, any> {
  const result: Record<string, any> = {};
  const usedByType: Record<string, number> = {};
  for (const bp of build.buildParts ?? []) {
    const slots = TYPE_TO_SLOTS[bp.part.type];
    if (!slots) continue;
    if (bp.slot === 'front' && slots[0]) result[slots[0]] = bp;
    else if (bp.slot === 'rear' && slots[1]) result[slots[1]] = bp;
    else {
      const i = usedByType[bp.part.type] ?? 0;
      result[slots[Math.min(i, slots.length - 1)]] = bp;
      usedByType[bp.part.type] = i + 1;
    }
  }
  return result;
}

// text-{colour}-text (not text-{colour}) and full opacity (not /80) --
// the plain accent colour reads 2.68-4.28:1 against its own soft
// background, short of WCAG AA's 4.5:1 floor for normal text; -text is
// a darkened same-hue variant that clears it. See tailwind.config.ts.
// Warning uses the `warn` status token (yellow), not `drive` (orange):
// drive is the Drivetrain subsystem colour, so an orange warning card
// read as "drivetrain" and as the brand gold at the same time.
const SEVERITY = {
  critical: { box: 'border-brake-ring bg-brake-soft', head: 'text-brake-text', body: 'text-brake-text', Icon: AlertTriangle },
  warning: { box: 'border-warn-ring bg-warn-soft', head: 'text-warn-text', body: 'text-warn-text', Icon: AlertTriangle },
  info: { box: 'border-cockpit-ring bg-cockpit-soft', head: 'text-cockpit-text', body: 'text-cockpit-text', Icon: Info },
} as const;

/** Builder rows, bucketed into their subsystem group, order preserved. */
const GROUPED_SLOTS = (Object.keys(GROUPS) as GroupKey[])
  .map((key) => ({ key, group: GROUPS[key], slots: BUILDER_SLOTS.filter((s) => GROUP_OF[s.slug] === key) }))
  .filter((g) => g.slots.length > 0);

/** Build slot key → subsystem group, so a warning's `components` (slot
 *  keys like 'frame', 'frontTyre') can be colour-coded back to the same
 *  subsystem hue the builder rows already use. No new taxonomy — this is
 *  the existing GROUPS mapping read through BUILDER_SLOTS. */
const SLOT_TO_GROUP: Record<string, GroupKey> = Object.fromEntries(
  BUILDER_SLOTS.map((s) => [s.slot, GROUP_OF[s.slug] ?? 'misc'])
);

/** Aggregated "why" result for one empty/low-count slot -- one blocking
 *  rule per row, most-common first, computed client-side from an
 *  explain=1 fetch (see toggleWhy below). */
interface WhyResult {
  loading: boolean;
  total: number;
  reasons: { id: string; title: string; count: number }[];
}

export default function BuilderMatrix({ buildId }: BuilderMatrixProps) {
  const { discipline } = useDiscipline();
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([]);
  const [compatible, setCompatible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState({ heightCm: '', inseamCm: '', weightKg: '' });
  // Login is optional -- this just tells the rider whether the build
  // they're looking at will survive them closing the tab (claimed) or
  // not (anonymous, held only by this build's id).
  const [isAnonymous, setIsAnonymous] = useState(false);
  // Per-slot "why isn't anything (or much) showing here" -- deliberately
  // NOT fetched for all 30 slots up front (that's the explain=1 N+1 the
  // non-explain lockout path on the list fetch above exists to avoid).
  // Only populated on demand when a row's "Why?" is clicked.
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [why, setWhy] = useState<Record<string, WhyResult>>({});
  // Raw (un-lockout-filtered) catalogue size per slot. This is what decides
  // whether a slot's option count has actually been NARROWED by the rest of
  // the build (compat count < raw count) versus the category just being
  // that small — the old `count <= 3` heuristic showed "Why?" on a
  // 3-option category nothing had narrowed, and hid it on a cassette
  // narrowed from 40 to 14. Depends only on the discipline switch, not the
  // build, so it's fetched once per discipline rather than on every pick.
  const [rawCounts, setRawCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    // One request per category, not per slot — paired slots (front/rear
    // tyre etc.) share the same raw list.
    // A failed fetch records -1 ("unknown"), not 0 -- 0 would make the
    // row claim "Nothing in this category yet", which we couldn't verify.
    const slugs = [...new Set(BUILDER_SLOTS.map((s) => s.slug))];
    Promise.all(slugs.map((slug) => api.getParts(slug).then((r) => r.length).catch(() => -1)))
      .then((lens) => {
        if (cancelled) return;
        const bySlug = Object.fromEntries(slugs.map((slug, i) => [slug, lens[i]]));
        setRawCounts(Object.fromEntries(BUILDER_SLOTS.map((s) => [s.slot, bySlug[s.slug] ?? -1])));
      });
    return () => { cancelled = true; };
    // `discipline` matters for the same reason as in refresh() below:
    // getParts reads the switch from localStorage, and toggling it changes
    // what the raw catalogue for each category contains.
  }, [discipline]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const lists = await Promise.all(
      BUILDER_SLOTS.map((s) => api.getParts(s.slug, { compatibleWith: buildId, position: s.position }).catch(() => [] as any[]))
    );
    const [validation, build] = await Promise.all([api.validateBuild(buildId), api.getBuild(buildId)]);

    setOptions(Object.fromEntries(BUILDER_SLOTS.map((s, i) => [s.slot, lists[i]])));
    setSelected(deriveSelectedFromBuild(build));
    setWarnings(validation.warnings);
    setCompatible(validation.compatible);
    setRider({
      heightCm: build.riderHeightCm?.toString() ?? '',
      inseamCm: build.riderInseamCm?.toString() ?? '',
      weightKg: build.riderWeightKg?.toString() ?? '',
    });
    setIsAnonymous(Boolean(build.isAnonymous));
    setLoading(false);
    // The rest of the build may have just changed (a new part picked,
    // rider measurements saved), which can change WHY a slot is empty --
    // any cached "why" explanation is stale the moment that happens.
    setWhyOpen({});
    setWhy({});
    // `discipline` isn't used directly above — getParts() reads the
    // header switch straight from localStorage — but it's a dependency
    // so toggling the switch while the builder is open refetches every
    // slot's options instead of leaving them stale.
  }, [buildId, discipline]);

  useEffect(() => { refresh(); }, [refresh]);

  /**
   * "Nothing compatible yet" / "Choose from 2" on their own don't say why
   * -- the non-explain lockout fetch above only returns a pass/fail set,
   * no per-candidate blocker reasons (see parts.routes.ts's non-explain
   * branch). Re-fetching that one slot with explain=1 gets the same
   * candidate list back annotated with `blockedBy`, which this tallies
   * into "which rule blocks the most options" rather than dumping every
   * candidate's full message inline (that's what the picker page is for).
   */
  async function toggleWhy(slot: string, slug: string, position?: 'front' | 'rear') {
    setWhyOpen((w) => ({ ...w, [slot]: !w[slot] }));
    if (why[slot]) return; // already fetched (or in flight) this refresh cycle
    setWhy((w) => ({ ...w, [slot]: { loading: true, total: 0, reasons: [] } }));
    try {
      const candidates = await api.getParts(slug, { compatibleWith: buildId, position, explain: '1' });
      const counts = new Map<string, { id: string; title: string; count: number }>();
      for (const c of candidates as any[]) {
        for (const b of c.blockedBy ?? []) {
          const entry = counts.get(b.id) ?? { id: b.id, title: b.title, count: 0 };
          entry.count += 1;
          counts.set(b.id, entry);
        }
      }
      const reasons = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 2);
      setWhy((w) => ({ ...w, [slot]: { loading: false, total: candidates.length, reasons } }));
    } catch {
      setWhy((w) => ({ ...w, [slot]: { loading: false, total: 0, reasons: [] } }));
    }
  }

  async function saveRider() {
    await api.updateBuild(buildId, {
      riderHeightCm: rider.heightCm ? Number(rider.heightCm) : null,
      riderInseamCm: rider.inseamCm ? Number(rider.inseamCm) : null,
      riderWeightKg: rider.weightKg ? Number(rider.weightKg) : null,
    });
    await refresh();
  }

  const picked = Object.values(selected).filter(Boolean);
  // Manufacturer-sourced parts routinely have no published price, so `?? 0`
  // here used to silently count every one of them as free — a build that's
  // mostly unpriced parts showed a confident, understated total with no
  // indication anything was excluded. The unpriced count is tracked
  // separately and surfaced next to the total instead.
  const unpricedCount = picked.filter((i) => i?.part?.basePricePence == null).length;
  const totalPricePence = picked.reduce((s, i) => s + (i?.part?.basePricePence ?? 0), 0);
  const totalWeightGrams = picked.reduce((s, i) => s + (i?.part?.weightGrams ?? 0), 0);
  const criticalSlots = new Set(warnings.filter((w) => w.severity === 'critical').flatMap((w) => w.components));
  const warnSlots = new Set(warnings.filter((w) => w.severity === 'warning').flatMap((w) => w.components));
  const criticalCount = warnings.filter((w) => w.severity === 'critical').length;
  // First load only: `options` is empty until the first refresh() lands.
  // Later refreshes (a part picked, rider saved) keep the previous state
  // on screen, so the sticky bar below doesn't blink out and back on
  // every round-trip -- but before anything has loaded it would just
  // show a fake "Compatible · 0/30 · £0.00".
  const neverLoaded = loading && Object.keys(options).length === 0;
  // Row text for a slot whose raw catalogue is empty. The raw list is
  // discipline-filtered too, so under "Road" this must not claim the
  // whole category is empty when it's only empty for road.
  const disciplineLabel = discipline ? { ROAD: 'Road', GRAVEL: 'Gravel', MTB: 'MTB' }[discipline] : null;
  const emptyCategoryText = disciplineLabel
    ? `Nothing in this category for ${disciplineLabel} yet`
    : 'Nothing in this category yet';

  return (
    // The mobile summary bar at the bottom of this file is `sticky`, not
    // `fixed`: it pins to the viewport edge while the builder is on screen
    // and then scrolls away with it, so it never sits on top of the footer
    // -- and being in-flow it takes its own height, so no bottom padding
    // reservation is needed either.
    <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-display text-3xl font-bold text-ink">Bike Builder</h1>
        {/* Sits in the white space next to the title -- builder-only,
            not global chrome. The preference it sets still persists
            into the picker and /parts pages, just without a visible
            toggle there. */}
        <DisciplineSwitch />
      </div>
      <p className="text-sm text-ink-muted mb-6 max-w-2xl">
        Parts that can&apos;t physically work are filtered out. Ones that need an adapter or spacer
        stay listed, with the remedy noted below.
      </p>

      {/* Optional, not a gate: this build already works fully signed
          out. Logging in just means it survives past this browser --
          claimed on login via ?build=, see app/login/page.tsx.
          Warm drive-soft tint (not chassis-soft, which is near-identical
          to the page background) so "this can be lost" doesn't read as a
          tip -- drive-text on drive-soft is the AA-checked pairing from
          tailwind.config.ts. */}
      {isAnonymous && (
        <Link
          href={`/login?build=${buildId}`}
          className="flex items-center gap-2.5 rounded-xl border border-drive-ring bg-drive-soft px-4 py-3 mb-6 text-sm font-medium text-drive-text shadow-card hover:bg-drive-soft/70 transition-colors"
        >
          <AlertTriangle size={16} className="shrink-0" />
          This build isn&apos;t saved to an account yet — log in to keep it, or ignore this and keep building.
          <ChevronRight size={15} className="ml-auto shrink-0" />
        </Link>
      )}

      {/* Status + totals. When there are notes/issues the pill doubles as
          a jump link to the #build-notes section at the bottom of a long
          page -- "2 notes" was otherwise a claim with nothing to click. */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {(() => {
          const statusClass = `sm:col-span-2 flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-card ${
            compatible ? 'border-wheel-ring bg-wheel-soft text-wheel-text' : 'border-brake-ring bg-brake-soft text-brake-text'
          }`;
          const statusInner = (
            <>
              {compatible ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
              {compatible
                ? `Compatible${warnings.length ? ` — ${warnings.length} note${warnings.length === 1 ? '' : 's'}` : ''}`
                : `${criticalCount} blocking issue${criticalCount === 1 ? '' : 's'}`}
            </>
          );
          return warnings.length > 0 ? (
            <a href="#build-notes" className={`${statusClass} hover:brightness-[0.98] transition-[filter]`}>
              {statusInner}
              {/* Rotated chevron = "the notes are below you". */}
              <ChevronRight size={15} className="ml-auto shrink-0 rotate-90 opacity-60" />
            </a>
          ) : (
            <div className={statusClass}>{statusInner}</div>
          );
        })()}
        <div className="rounded-xl bg-white border border-black/5 px-4 py-3 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-muted">Total</span>
            <span className="font-display font-bold text-lg text-ink">
              {formatGbp(totalPricePence)}
              {unpricedCount > 0 && (
                <span className="text-xs font-normal text-ink-muted"> +{unpricedCount} unpriced</span>
              )}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-muted">Weight</span>
            <span className="text-sm font-medium text-ink">{(totalWeightGrams / 1000).toFixed(2)} kg</span>
          </div>
        </div>
      </div>

      {/* Optional rider measurements — only the fit rules read these. */}
      <details className="mb-6 rounded-xl border border-black/5 bg-white shadow-card overflow-hidden">
        <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-ink cursor-pointer hover:bg-black/[0.02]">
          <User size={15} className="text-contact" />
          Rider measurements <span className="text-ink-muted font-normal">— optional, enables fit checks</span>
        </summary>
        <div className="flex flex-wrap items-end gap-3 px-4 pb-4 pt-1 border-t border-black/5">
          {([['heightCm', 'Height (cm)'], ['inseamCm', 'Inseam (cm)'], ['weightKg', 'Weight (kg)']] as const).map(([key, label]) => (
            <label key={key} className="text-xs text-ink-muted">
              <span className="block mb-1">{label}</span>
              <input
                type="number"
                className="w-28 text-sm border border-black/10 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-contact/25"
                value={rider[key]}
                onChange={(e) => setRider({ ...rider, [key]: e.target.value })}
              />
            </label>
          ))}
          <button onClick={saveRider} className="text-sm font-medium bg-ink text-white rounded-lg px-3.5 py-2 hover:bg-ink-soft transition-colors">
            Save
          </button>
        </div>
      </details>

      {/* Slots, grouped by subsystem */}
      <div className="space-y-5 mb-8">
        {GROUPED_SLOTS.map(({ key, group, slots }) => (
          <div key={key}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: group.accent }} />
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">{group.label}</h2>
              <div className="flex-1 h-px bg-black/5" />
            </div>

            <div className="rounded-xl border border-black/5 bg-white shadow-card overflow-hidden">
              {slots.map(({ slot, label, slug, position }, i) => {
                const blocked = criticalSlots.has(slot);
                const flagged = warnSlots.has(slot);
                const chosen = selected[slot];
                const count = (options[slot] ?? []).length;
                const rawCount = rawCounts[slot] as number | undefined;
                // "Why?" shows on every unfilled slot whose option count the
                // rest of the build has actually narrowed (compat-filtered
                // count < raw catalogue count) -- the explain=1 data behind
                // it exists for every category, so narrowing is the only
                // real criterion. The old `count <= 3` cutoff was why a
                // cassette narrowed 40→14 had no "Why?" while an un-narrowed
                // 3-option category did. Slots whose category is empty
                // outright get honest row text instead (below), since there
                // is no blocking rule to explain.
                const showWhy = !loading && !chosen && rawCount != null && count < rawCount;
                const whyResult = why[slot];
                return (
                  <div key={slot} className={i !== 0 ? 'border-t border-black/5' : ''}>
                    <div
                      className={`relative flex items-center gap-3 px-3.5 py-3 ${
                        blocked ? 'bg-brake-soft' : flagged ? 'bg-drive-soft' : ''
                      }`}
                    >
                      {/* Full-row click target for navigating to the picker --
                          an absolutely-positioned sibling rather than wrapping
                          the row (which would nest the "Why?" button inside an
                          <a>, invalid HTML and unreliable to click). */}
                      <Link
                        href={`/pick/${buildId}/${slot}`}
                        aria-label={`Choose ${label}`}
                        className="absolute inset-0 hover:bg-black/[0.02] transition-colors"
                      />
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: group.soft, color: group.accent }}
                      >
                        <PartIcon slug={slug} className="w-[18px] h-[18px]" />
                      </span>
                      {/* Label + value. From sm up they sit side by side
                          (fixed-width label column, single truncating value
                          line). Below sm the label becomes a caption ABOVE
                          the value, so the value gets the full row width --
                          side by side at 375px left the name ~25px, which
                          rendered a chosen part as a bare "S…" and wrapped
                          "Choose from / 3" against the icons. */}
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                        <span className={`text-xs sm:text-sm sm:w-32 sm:shrink-0 ${blocked ? 'text-brake font-medium' : flagged ? 'text-drive' : 'text-ink-muted'}`}>
                          {label}
                        </span>

                        {loading ? (
                          <Loader2 size={15} className="animate-spin text-ink-muted/50" />
                        ) : chosen ? (
                          // Two renderings of the same name rather than one
                          // span switching between line-clamp and truncate --
                          // both set `overflow`, so which wins at sm would
                          // depend on generated-CSS order. Three lines, not
                          // two: at 375px the name column is ~140px once
                          // icon, gaps and the price/chevron column are
                          // taken, and a 38-char name ("Cannondale SuperSix
                          // EVO CX Carbon Fork") genuinely needs the third
                          // line to stay readable. Almost every name still
                          // fits in two, so the row only grows when it must.
                          <span className="min-w-0 text-sm text-ink">
                            <span className="line-clamp-3 sm:hidden">
                              <span className="text-ink-muted">{chosen.part.brand}</span> {chosen.part.name}
                            </span>
                            <span className="hidden sm:block truncate">
                              <span className="text-ink-muted">{chosen.part.brand}</span> {chosen.part.name}
                            </span>
                          </span>
                        ) : (
                          <span className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-muted/60">
                            {count === 0 ? (
                              <span>{rawCount === 0 ? emptyCategoryText : 'Nothing compatible yet'}</span>
                            ) : (
                              // The count never wraps away from its phrase; if
                              // anything has to give it's the "Why?" moving to
                              // the next line, never "Choose from / 3".
                              <span className="whitespace-nowrap">Choose from {count}</span>
                            )}
                            {showWhy && (
                              <button
                                type="button"
                                onClick={() => toggleWhy(slot, slug, position)}
                                className="relative z-10 inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-ink-muted/90 underline decoration-dotted underline-offset-2 hover:text-ink"
                              >
                                <Info size={11} /> Why?
                              </button>
                            )}
                          </span>
                        )}
                      </span>

                      <span className="flex items-center gap-2 shrink-0">
                        {chosen && (
                          // No-price is an intentional state, styled quiet
                          // (same as the listing cards). It's also much
                          // narrower than the bold treatment, which at 375px
                          // was squeezing the name column to ~118px.
                          chosen.part.basePricePence == null ? (
                            <span className="text-[11px] text-ink-muted/80 whitespace-nowrap">
                              {formatGbp(chosen.part.basePricePence)}
                            </span>
                          ) : (
                            <span className="font-display font-semibold text-sm text-ink">
                              {formatGbp(chosen.part.basePricePence)}
                            </span>
                          )
                        )}
                        <ChevronRight size={16} className="text-ink-muted/50" />
                      </span>
                    </div>

                    {whyOpen[slot] && (
                      <div className="relative z-10 border-t border-black/5 bg-black/[0.015] px-3.5 py-2.5 pl-[3.25rem] text-xs text-ink-muted">
                        {!whyResult || whyResult.loading ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin" /> Checking why…
                          </span>
                        ) : whyResult.total === 0 ? (
                          <span>There&apos;s nothing in this category in the catalogue yet.</span>
                        ) : whyResult.reasons.length === 0 ? (
                          <span>Couldn&apos;t pin down a specific blocking rule.</span>
                        ) : (
                          <ul className="space-y-1">
                            {whyResult.reasons.map((r) => (
                              <li key={r.id} className="flex gap-1.5">
                                <span className="font-mono opacity-60 shrink-0">{r.id}</span>
                                <span>
                                  {r.title} — blocks {r.count} of {whyResult.total} option{whyResult.total === 1 ? '' : 's'}
                                </span>
                              </li>
                            ))}
                          </ul>
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

      {/* Same card language as the summary tiles up top, instead of bare
          grey text floating in the margin -- the thin bar makes "how far
          through the 30 slots am I" readable at a glance. */}
      <div className="rounded-xl bg-white border border-black/5 shadow-card px-4 py-3 mb-6 sm:max-w-sm">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-xs text-ink-muted">Slots filled</span>
          <span className="text-sm font-medium text-ink tabular-nums">
            {picked.length} of {BUILDER_SLOTS.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-chassis transition-all duration-300"
            style={{ width: `${(picked.length / BUILDER_SLOTS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Jump target for the status pill's "— N notes" anchor. Each note
          keeps its severity colouring (the AA-checked SEVERITY pairs) and
          gains a lighter secondary accent -- a left bar plus a small chip
          in the subsystem group's existing hue, derived from the rule's
          own `components` slots. No new taxonomy is invented: it's the
          same group colour-coding the builder rows above already use. */}
      {warnings.length > 0 && (
        <div id="build-notes" className="scroll-mt-24">
          <div className="flex items-center gap-2.5 mb-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">Notes</h2>
            <div className="flex-1 h-px bg-black/5" />
          </div>
          {warnings.map((w, i) => {
            const s = SEVERITY[w.severity];
            const groupKey = w.components.map((c) => SLOT_TO_GROUP[c]).find(Boolean);
            const group = groupKey ? GROUPS[groupKey] : undefined;
            return (
              <div
                key={`${w.id}-${i}`}
                className={`rounded-xl border px-4 py-3.5 mb-2.5 ${s.box} ${group ? 'border-l-4' : ''}`}
                style={group ? { borderLeftColor: group.accent } : undefined}
              >
                <div className={`text-sm font-semibold flex items-center gap-2 ${s.head}`}>
                  <s.Icon size={15} className="shrink-0" /> {w.title}
                  {group && (
                    <span className="chip bg-white/70 text-[10px] text-ink-muted whitespace-nowrap px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: group.accent }} />
                      {group.label}
                    </span>
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
        </div>
      )}

      {/* Slim sticky summary, mobile only (md:hidden -- on desktop the
          top summary is visible or one flick away, and a bar would just
          cover content). Bottom edge is the thumb-friendly spot. `sticky`
          rather than `fixed`: pinned to the viewport bottom while the
          builder is on screen, then scrolls off with it, so it never covers
          the site footer. -mx-6 lets it bleed to the viewport edges past
          the wrapper's px-6. Tapping the status side jumps to the notes
          when there are any. */}
      {!neverLoaded && (
        <div className="sticky bottom-0 -mx-6 mt-6 z-40 md:hidden border-t border-black/10 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-[1400px] mx-auto flex items-center gap-3 px-4 py-2.5 text-sm">
            {(() => {
              const stickyStatus = (
                <>
                  {compatible ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertTriangle size={15} className="shrink-0" />}
                  <span className="whitespace-nowrap">
                    {compatible
                      ? `Compatible${warnings.length ? ` · ${warnings.length} note${warnings.length === 1 ? '' : 's'}` : ''}`
                      : `${criticalCount} issue${criticalCount === 1 ? '' : 's'}`}
                  </span>
                </>
              );
              const cls = `inline-flex items-center gap-1.5 font-medium ${compatible ? 'text-wheel-text' : 'text-brake-text'}`;
              return warnings.length > 0 ? (
                <a href="#build-notes" className={cls}>{stickyStatus}</a>
              ) : (
                <span className={cls}>{stickyStatus}</span>
              );
            })()}
            <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap">
              {picked.length}/{BUILDER_SLOTS.length} slots
            </span>
            <span className="ml-auto text-right leading-tight">
              <span className="block font-display font-semibold text-ink tabular-nums">{formatGbp(totalPricePence)}</span>
              {unpricedCount > 0 && (
                <span className="block text-[10px] text-ink-muted">+{unpricedCount} unpriced</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
