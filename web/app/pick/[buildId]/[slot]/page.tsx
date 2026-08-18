'use client';

// app/pick/[buildId]/[slot]/page.tsx
//
// The part picker, shared by the scratch builder and the upgrade view.
// Replaces the old per-slot dropdown: a full page of cards is easier to
// compare across than a <select>, and it has room to show *why* a part
// doesn't fit rather than silently omitting it.
//
// Uses `explain=1`, so the API returns every candidate annotated with
// whether it fits and which rules block it.

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, Loader2, Ban, ChevronDown, Trash2, Wrench } from 'lucide-react';
import PartIcon from '../../../../components/PartIcon';
import { useDiscipline } from '../../../../components/DisciplineProvider';
import { api, UpgradePath, UpgradePathChange } from '../../../../lib/api-client';
import { BUILDER_SLOTS, CATEGORY_BY_SLUG, accentFor, formatSpecValue } from '../../../../lib/categories';
import { splitDisplayName } from '../../../../lib/display-name';
import { formatGbp, hasPrice } from '../../../../lib/money';

/**
 * Card price. A null basePricePence is a real, common state (manufacturer
 * spec sheets carry no RRP) — it renders muted, non-bold and smaller so a
 * card without a price doesn't shout as loudly as one with a figure.
 */
function CardPrice({ pence }: { pence: number | null | undefined }) {
  if (!hasPrice(pence)) {
    return <span className="text-xs text-ink-muted/70 whitespace-nowrap">{formatGbp(pence)}</span>;
  }
  return <span className="font-display font-bold text-ink whitespace-nowrap">{formatGbp(pence)}</span>;
}

/**
 * "one rear shock" / "2 rear shocks", but "one set of pedals" / "2 sets
 * of pedals" for the slot labels that are already plural (Pedals, Shoes,
 * Brake Calipers, Brake Levers).
 */
function countNoun(slotName: string, n: number): string {
  if (/s$/.test(slotName)) return n === 1 ? `set of ${slotName}` : `sets of ${slotName}`;
  return n === 1 ? slotName : `${slotName}s`;
}

/**
 * Feeds often lead the name with the SKU ("FC-FRC-1W-D2 Force 1 Wide
 * Crankset"). The model line leads; the code, if any, sits under it in
 * small mono. Presentation-only — see lib/display-name.ts.
 */
function PartTitle({ brand, name }: { brand?: string | null; name: string }) {
  const dn = splitDisplayName(brand, name);
  return (
    <>
      <div className="text-sm font-medium text-ink leading-snug">{dn.title}</div>
      {dn.sku && <div className="font-mono text-[10px] text-ink-muted/70 mt-0.5">{dn.sku}</div>}
    </>
  );
}

function PickerInner() {
  const { buildId, slot } = useParams<{ buildId: string; slot: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isMyBike = searchParams.get('from') === 'my-bike';
  const from = isMyBike ? `/my-bike/${buildId}` : `/builder?build=${buildId}`;
  const slotConfig = BUILDER_SLOTS.find((s) => s.slot === slot);
  const category = slotConfig ? CATEGORY_BY_SLUG[slotConfig.slug] : undefined;
  const { accent, soft } = accentFor(slotConfig?.slug ?? '');
  const { discipline } = useDiscipline();

  const [parts, setParts] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    if (!slotConfig) { setLoading(false); return; }
    Promise.all([
      api.getParts(slotConfig.slug, { compatibleWith: buildId, position: slotConfig.position, explain: '1' }),
      api.getBuild(buildId),
    ])
      .then(([list, build]) => {
        setParts(list);
        const match = (build.buildParts ?? []).find((bp: any) =>
          list.some((p: any) => p.partId === bp.partId) &&
          (slotConfig.position ? bp.slot === slotConfig.position : true));
        setCurrentId(match?.partId ?? null);
      })
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [buildId, slot, slotConfig, discipline]);

  async function choose(partId: string) {
    setSaving(partId);
    await api.setBuildPart(buildId, partId, { slot: slotConfig?.position });
    router.push(from);
  }

  async function clear() {
    if (!currentId) return;
    setSaving(currentId);
    await api.removeBuildPart(buildId, currentId);
    router.push(from);
  }

  if (!slotConfig || !category) {
    return <div className="max-w-[1400px] mx-auto px-6 py-10 text-sm text-ink-muted">Unknown slot: {slot}</div>;
  }

  const fits = parts.filter((p) => p.compatible !== false);
  const blocked = parts.filter((p) => p.compatible === false);
  const warnedCount = fits.filter((p) => (p.warnedBy?.length ?? 0) > 0).length;
  const preview = category.specs.slice(0, 3);
  const slotName = slotConfig.label.toLowerCase();

  return (
    // pb-4 (not py-8's bottom half): the global <main> already carries
    // pb-20, so a 1–2 card result page doesn't need a second band of
    // empty space under a mostly empty grid.
    <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-4" style={{ ['--accent' as string]: accent }}>
      <Link href={from} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
        <ArrowLeft size={14} /> {isMyBike ? 'Back to your bike' : 'Back to your build'}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: soft, color: accent }}>
          <PartIcon slug={slotConfig.slug} className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Choose {slotConfig.label.toLowerCase()}</h1>
          <p className="text-xs text-ink-muted">
            {loading
              ? 'Checking what fits…'
              : `${fits.length} fit${fits.length === 1 ? 's' : ''} your build${warnedCount ? ` · ${warnedCount} worth a check` : ''}${blocked.length ? ` · ${blocked.length} ${blocked.length === 1 ? "doesn't" : "don't"}` : ''}`}
          </p>
        </div>
        {currentId && (
          <button onClick={clear} className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brake px-3 py-2">
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-xl bg-white/60 border border-black/5 animate-pulse" />)}
        </div>
      ) : (
        <>
          {fits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-10 text-center mb-6">
              <Ban size={24} className="mx-auto text-ink-muted/40 mb-2" />
              <p className="text-sm text-ink-muted">Nothing in the catalogue fits here yet.</p>
            </div>
          ) : (
            <>
              {/* A short list is the filter doing its job against this
                  build's other parts, not a thin catalogue — say so, or
                  the mostly-empty grid reads as broken. */}
              {fits.length <= 2 && (
                <p className="text-sm text-ink-muted mb-4 max-w-2xl">
                  Only {fits.length === 1 ? 'one' : fits.length} {countNoun(slotName, fits.length)}
                  {fits.length === 1 ? ' fits' : ' fit'} the parts already on this build
                  {blocked.length > 0
                    ? ` — the other ${blocked.length} in the catalogue ${blocked.length === 1 ? 'is' : 'are'} listed below with the reason.`
                    : '.'}
                  {' '}That&apos;s the filter working, not a missing catalogue.
                </p>
              )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 items-start">
              {fits.map((p) => {
                const selected = p.partId === currentId;
                // Bolts on, but not a clean fit -- the same `warning`-
                // severity check the build page already tints amber once a
                // part is chosen (see BuilderMatrix's `flagged`/warnOpen),
                // computed here for every candidate up front so the amber
                // shows in the picker BEFORE you choose it, not after.
                // Still in `fits`: only a `critical` warning removes a
                // candidate from this grid.
                const warned = (p.warnedBy?.length ?? 0) > 0;
                return (
                  <button
                    key={p.partId}
                    onClick={() => choose(p.partId)}
                    disabled={saving !== null}
                    className="text-left accent-tile shadow-card flex flex-col disabled:opacity-60"
                    style={{
                      // Swaps which colour `.accent-tile`'s border-color
                      // mix reads, so a warned-but-unselected card gets the
                      // same subtle-tinted-border-that-goes-full-on-hover
                      // treatment every other card gets, just in amber
                      // instead of the category accent. Selection still
                      // wins visually if both are true -- a warned part
                      // you've already picked reads as "current", with the
                      // amber note below carrying the warning instead.
                      ['--accent' as string]: selected ? accent : warned ? '#eab308' : accent,
                      ...(selected ? { borderColor: accent, background: soft } : {}),
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: soft, color: accent }}>
                        <PartIcon slug={slotConfig.slug} className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        {selected && (
                          <span className="chip" style={{ background: accent, color: '#fff' }}>
                            <Check size={11} /> Current
                          </span>
                        )}
                        {saving === p.partId
                          ? <Loader2 size={15} className="animate-spin text-ink-muted" />
                          : <CardPrice pence={p.part.basePricePence} />}
                      </div>
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-muted">{p.part.brand}</div>
                    <div className="mb-3">
                      <PartTitle brand={p.part.brand} name={p.part.name} />
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {/* Unpublished spec values get one lighter, muted
                          look (with the field's unit) so a "—" doesn't
                          sit at the same weight as a real figure. */}
                      {preview.map((s) => (
                        p[s.key] == null
                          ? <span key={s.key} title={`${s.label}: not published`} className="chip bg-black/[0.02] text-ink-muted/60 font-normal">
                              —
                            </span>
                          : <span key={s.key} title={s.label} className="chip bg-black/[0.04] text-ink-muted">
                              {formatSpecValue(p[s.key], s.suffix)}
                            </span>
                      ))}
                      {p.part.weightGrams > 0 && <span className="chip bg-black/[0.04] text-ink-muted" title="Weight">{p.part.weightGrams}g</span>}
                    </div>

                    {/* Shown straight away, not behind a click -- this is
                        exactly the "why is it amber" question a picker
                        card has room to just answer, unlike a 30-row
                        builder list. */}
                    {warned && (
                      <div className="mt-2.5 -mb-1 rounded-lg bg-warn-soft border border-warn-ring px-2.5 py-2 text-xs text-warn-text space-y-1.5">
                        {p.warnedBy.map((w: { id: string; title: string; message: string; remedy?: string }) => (
                          <div key={w.id} className="flex gap-1.5">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>
                              {w.title}
                              {w.remedy && <span className="block text-[11px] opacity-80 mt-0.5">{w.remedy}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            </>
          )}

          {/* Incompatible options stay visible, with the reason. */}
          {blocked.length > 0 && (
            <div className="rounded-xl border border-black/5 bg-white shadow-card overflow-hidden">
              <button
                onClick={() => setShowBlocked(!showBlocked)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-muted hover:bg-black/[0.02] transition-colors"
              >
                <Ban size={14} />
                {blocked.length} option{blocked.length === 1 ? '' : 's'} that won&apos;t fit this build
                <ChevronDown size={15} className={`ml-auto transition-transform ${showBlocked ? 'rotate-180' : ''}`} />
              </button>

              {showBlocked && (
                <div className="divide-y divide-black/5 border-t border-black/5">
                  {blocked.map((p) => (
                    <BlockedRow
                      key={p.partId}
                      part={p}
                      slug={slotConfig.slug}
                      buildId={buildId}
                      position={slotConfig.position}
                      isMyBike={isMyBike}
                      onApplied={() => router.push(from)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A part that doesn't fit, with an on-demand "what would make it fit?".
 * Solving is a per-part request, so it only runs when asked for.
 */
function BlockedRow({ part, slug, buildId, position, isMyBike, onApplied }: {
  part: any; slug: string; buildId: string;
  position?: 'front' | 'rear'; isMyBike: boolean; onApplied: () => void;
}) {
  const [path, setPath] = useState<UpgradePath | null>(null);
  const [solving, setSolving] = useState(false);
  const [applying, setApplying] = useState(false);
  const blockedName = splitDisplayName(part.part.brand, part.part.name);

  async function solve() {
    setSolving(true);
    try {
      setPath(await api.getUpgradePath(slug, part.partId, {
        compatibleWith: buildId,
        position,
        // You can't swap the frame of a bike you already own.
        exclude: isMyBike ? 'frame' : undefined,
      }));
    } finally {
      setSolving(false);
    }
  }

  async function apply(changes: UpgradePathChange[]) {
    setApplying(true);
    for (const c of changes) {
      await api.setBuildPart(buildId, c.partId, { slot: c.slot.startsWith('front') ? 'front' : c.slot.startsWith('rear') ? 'rear' : undefined });
    }
    await api.setBuildPart(buildId, part.partId, { slot: position });
    onApplied();
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">
          <span className="text-ink-muted">{part.part.brand}</span> {blockedName.title}
          {blockedName.sku && <span className="font-mono text-[10px] text-ink-muted/70"> {blockedName.sku}</span>}
        </span>
        {!hasPrice(part.part.basePricePence)
          ? <span className="text-xs text-ink-muted/70 shrink-0">{formatGbp(null)}</span>
          : <span className="text-sm text-ink-muted line-through shrink-0">{formatGbp(part.part.basePricePence)}</span>}
      </div>

      {part.blockedBy?.map((b: any) => (
        <div key={b.id} className="mt-1.5 text-xs text-brake flex gap-1.5">
          <span className="font-mono opacity-60 shrink-0">{b.id}</span>
          <span>{b.message}</span>
        </div>
      ))}

      {!path && (
        <button
          onClick={solve}
          disabled={solving}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-chassis hover:underline"
        >
          {solving ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
          {solving ? 'Working out what would fit…' : 'What would make this fit?'}
        </button>
      )}

      {path && path.resolutions.length === 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Nothing in the catalogue resolves this — the parts needed don&apos;t exist here yet.
        </p>
      )}

      {path?.resolutions.map((r, i) => (
        <div key={i} className="mt-2 rounded-lg border border-chassis-ring bg-chassis-soft px-3 py-2.5">
          <div className="text-xs font-semibold text-chassis mb-1.5">
            Also change {r.changes.length} part{r.changes.length === 1 ? '' : 's'}:
          </div>
          {r.changes.map((c) => (
            <div key={c.slot} className="text-xs text-ink flex flex-wrap gap-x-1.5">
              <span className="text-ink-muted capitalize">{c.slot.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
              <span className="font-medium">{c.brand} {splitDisplayName(c.brand, c.name).title}</span>
              <span className="text-ink-muted">{formatGbp(c.pricePence)}</span>
              {c.replaces && <span className="text-ink-muted">(was {splitDisplayName(c.replaces.brand, c.replaces.name).title})</span>}
            </div>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <span className={`chip ${r.extraCostPence > 0 ? 'bg-drive-soft text-drive' : 'bg-wheel-soft text-wheel'}`}>
              {r.extraCostPence >= 0 ? '+' : '−'}{formatGbp(Math.abs(r.extraCostPence))} net
            </span>
            <button
              onClick={() => apply(r.changes)}
              disabled={applying}
              className="text-xs font-medium bg-ink text-white rounded-md px-2.5 py-1.5 hover:bg-ink-soft disabled:opacity-50"
            >
              {applying ? 'Applying…' : 'Apply all'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PickerPage() {
  return (
    <Suspense fallback={<div className="max-w-[1400px] mx-auto px-6 py-10 text-sm text-ink-muted">Loading…</div>}>
      <PickerInner />
    </Suspense>
  );
}
