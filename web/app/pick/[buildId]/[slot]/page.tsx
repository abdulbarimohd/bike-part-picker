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
import { ArrowLeft, Check, Loader2, Ban, ChevronDown, Trash2, Wrench } from 'lucide-react';
import PartIcon from '../../../../components/PartIcon';
import { useDiscipline } from '../../../../components/DisciplineProvider';
import { api, UpgradePath, UpgradePathChange } from '../../../../lib/api-client';
import { BUILDER_SLOTS, CATEGORY_BY_SLUG, accentFor, formatSpecValue } from '../../../../lib/categories';
import { formatGbp } from '../../../../lib/money';

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
  const preview = category.specs.slice(0, 3);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <Link href={from} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5">
        <ArrowLeft size={14} /> Back to your build
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: soft, color: accent }}>
          <PartIcon slug={slotConfig.slug} className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Choose {slotConfig.label.toLowerCase()}</h1>
          <p className="text-xs text-ink-muted">
            {loading ? 'Checking what fits…' : `${fits.length} fit your build${blocked.length ? ` · ${blocked.length} don't` : ''}`}
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {fits.map((p) => {
                const selected = p.partId === currentId;
                return (
                  <button
                    key={p.partId}
                    onClick={() => choose(p.partId)}
                    disabled={saving !== null}
                    className="text-left accent-tile shadow-card flex flex-col disabled:opacity-60"
                    style={{
                      ['--accent' as string]: accent,
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
                          : <span className="font-display font-bold text-ink">{formatGbp(p.part.basePricePence)}</span>}
                      </div>
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-muted">{p.part.brand}</div>
                    <div className="text-sm font-medium text-ink leading-snug mb-3">{p.part.name}</div>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {preview.map((s) => (
                        <span key={s.key} className="chip bg-black/[0.04] text-ink-muted">
                          {formatSpecValue(p[s.key], s.suffix)}
                        </span>
                      ))}
                      {p.part.weightGrams > 0 && <span className="chip bg-black/[0.04] text-ink-muted">{p.part.weightGrams}g</span>}
                    </div>
                  </button>
                );
              })}
            </div>
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
          <span className="text-ink-muted">{part.part.brand}</span> {part.part.name}
        </span>
        <span className="text-sm text-ink-muted line-through shrink-0">
          {formatGbp(part.part.basePricePence)}
        </span>
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
              <span className="font-medium">{c.brand} {c.name}</span>
              <span className="text-ink-muted">{formatGbp(c.pricePence)}</span>
              {c.replaces && <span className="text-ink-muted">(was {c.replaces.name})</span>}
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
