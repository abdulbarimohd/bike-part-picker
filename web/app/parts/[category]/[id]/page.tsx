'use client';

// app/parts/[category]/[id]/page.tsx
//
// Generic across all 27 categories: spec tiles come from lib/categories,
// and every detail route returns the same shape, so vendor pricing and
// the history chart below are category-agnostic.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PartImage from '../../../../components/PartImage';
import ProvenanceBadge from '../../../../components/ProvenanceBadge';
import { api } from '../../../../lib/api-client';
import { formatGbp, exVatPence } from '../../../../lib/money';
import { CATEGORY_BY_SLUG, GROUPS, accentFor, formatSpecValue } from '../../../../lib/categories';
import type { SpecField } from '../../../../lib/categories';
import { splitDisplayName } from '../../../../lib/display-name';
import { compatibilityApi, PartCompatibility } from '../../../../lib/compatibility-client';

// Matches `chassis`/`wheel`/`drive` in tailwind.config.ts.
const CHART_COLORS = ['#A18800', '#059669', '#ea580c'];

// ------------------------------------------------------------
// Frame spec grouping (audit 05.1). Frames show ~28 spec tiles; flat,
// that's an undifferentiated wall. The grouping lives HERE rather than
// in lib/categories.ts because it's a detail-page presentation concern
// only -- the builder and list pages still read the flat spec list.
// Keys reference the frame entry in lib/categories.ts; a key listed
// there but missing from this map falls into "Other" (nothing is ever
// dropped), and a key here that's absent from the config is skipped.
// ------------------------------------------------------------
const FRAME_SPEC_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Geometry & sizing',
    keys: ['frameSize', 'reachMm', 'stackMm', 'standoverMm', 'chainstayLengthMm', 'riderMinHeightCm', 'riderMaxHeightCm'],
  },
  {
    title: 'Standards & interfaces',
    keys: ['bbShellStandard', 'headsetTaper', 'rearAxleType', 'dropoutType', 'hangerStandard', 'seatpostDiameterMm', 'fdMountType', 'fdPullDirection'],
  },
  {
    title: 'Suspension',
    keys: ['maxForkTravelMm', 'shockEyeToEyeMm', 'shockStrokeMm', 'shockMountType', 'leverageRatio', 'suitableForCoil'],
  },
  {
    title: 'Mounts & clearance',
    keys: ['maxTyreWidthMm', 'mulletApproved', 'maxRotorMmRear', 'maxChainringTeeth', 'iscgStandard', 'bottleMounts', 'hasEyelets'],
  },
];

// The specs buyers actually search a frame page for -- these get
// slightly larger value text than the long tail (audit 05.1).
const FRAME_PROMINENT_KEYS = new Set(['reachMm', 'stackMm', 'maxTyreWidthMm', 'rearAxleType', 'bbShellStandard', 'hangerStandard']);

/** Split `config.specs` into the labelled groups above, appending an
 *  "Other" group for any key the map doesn't know about. */
function groupFrameSpecs(specs: SpecField[]): { title: string; specs: SpecField[] }[] {
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const used = new Set<string>();
  const groups = FRAME_SPEC_GROUPS.map((g) => ({
    title: g.title,
    specs: g.keys.flatMap((k) => {
      const spec = byKey.get(k);
      if (!spec) return [];
      used.add(k);
      return [spec];
    }),
  }));
  const other = specs.filter((s) => !used.has(s.key));
  if (other.length) groups.push({ title: 'Other', specs: other });
  return groups.filter((g) => g.specs.length > 0);
}

// Rule ids look like R-FRK-02 (see src/compatibility/rulesCatalogue.ts).
// The API embeds them parenthetically in FAQ answer sentences; audit 06.1
// wants them out of the prose and shown as chips instead.
const RULE_CODE_RE = /\s*\((R-[A-Z]+-\d+)\)/g;

/** Strip parenthetical rule codes out of an FAQ answer sentence and
 *  return them separately (deduped, in order of appearance). */
function extractRuleCodes(answer: string): { text: string; codes: string[] } {
  const codes: string[] = [];
  const text = answer.replace(RULE_CODE_RE, (_m, code: string) => {
    if (!codes.includes(code)) codes.push(code);
    return '';
  });
  return { text, codes };
}

/** One spec tile. `prominent` bumps the value text a step for the
 *  handful of most-searched frame specs (audit 05.1). */
function SpecTile({ spec, value, prominent = false }: { spec: SpecField; value: unknown; prominent?: boolean }) {
  const formatted = formatSpecValue(value, spec.suffix);
  const unknown = formatted === '—';
  return (
    <div className="rounded-xl bg-white border border-black/5 px-3.5 py-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-0.5">{spec.label}</div>
      <div className={`font-medium ${prominent ? 'text-base' : 'text-sm'} ${unknown ? 'text-ink-muted/50' : 'text-ink'}`}>{formatted}</div>
    </div>
  );
}

export default function PartDetailPage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Fetched separately from the main part payload, on its own loading
  // state -- the FAQ block is a nice-to-have addition to the page, not
  // something the rest of the page (price, specs, vendors) should wait on.
  const [compat, setCompat] = useState<PartCompatibility | null>(null);

  const config = CATEGORY_BY_SLUG[category];
  const { accent, soft, group } = accentFor(category);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    api.getPart(category, id)
      .then(setPart)
      .catch(() => setPart(null))
      .finally(() => setLoading(false));
  }, [category, id, config]);

  useEffect(() => {
    if (!config) return;
    setCompat(null);
    compatibilityApi.getPartCompatibility(category, id).then(setCompat).catch(() => setCompat(null));
  }, [category, id, config]);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-ink-muted">Loading…</div>;
  if (!config) return <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-ink-muted">Unknown category: {category}</div>;
  if (!part) return <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-ink-muted">Part not found.</div>;

  const prices = part.part.prices ?? [];

  const byVendor: Record<string, { date: string; price: number }[]> = {};
  for (const price of [...prices].reverse()) {
    (byVendor[price.vendor.name] ??= []).push({
      date: new Date(price.recordedAt).toLocaleDateString(),
      price: price.pricePence / 100,
    });
  }

  // Latest row per vendor only.
  const currentPrices = prices.filter((p: any, _i: number, arr: any[]) => {
    const latest = arr
      .filter((x) => x.vendorId === p.vendorId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return latest.id === p.id;
  });
  // Math.min() on an empty array returns Infinity, not undefined -- guarding
  // on currentPrices.length (before the inStock filter) missed the real
  // case: every listing present but out of stock, which formatGbp would
  // then render as a nonsensical "£∞.00". The guard has to be on the
  // filtered, in-stock subset's length, not the unfiltered one.
  const inStockPrices = currentPrices.filter((p: any) => p.inStock).map((p: any) => p.pricePence);
  const best = inStockPrices.length ? Math.min(...inStockPrices) : null;

  // Manufacturer feeds lead with the SKU ("FC-FRC-1W-D2 Force 1 Wide
  // Crankset"); lead the H1 with the model line and demote the code to a
  // small line underneath (audit 02.1). Presentation only -- the stored
  // name is untouched.
  const display = splitDisplayName(part.part.brand, part.part.name);

  // Frames get labelled spec subsections (audit 05.1); every other
  // category keeps the flat grid.
  const specGroups = category === 'frames' ? groupFrameSpecs(config.specs) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <Link href={`/parts/${category}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> {config.label}
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 mb-6">
        <div className="flex items-start gap-5">
          <PartImage
            slug={category}
            imageUrl={part.part.imageUrl}
            alt={`${part.part.brand} ${part.part.name}`}
            className="w-24 h-24 rounded-2xl"
            iconClassName="w-12 h-12"
            accent={accent}
            soft={soft}
          />
          <div className="min-w-0 flex-1">
            <span className="chip mb-2" style={{ background: soft, color: accent }}>
              {GROUPS[group].label}
            </span>
            <div className="text-sm text-ink-muted">{part.part.brand}</div>
            <h1 className="font-display text-2xl font-bold text-ink leading-tight">{display.title}</h1>
            {display.sku && (
              <div className="font-mono text-xs text-ink-muted mt-0.5">SKU {display.sku}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
              {part.part.weightGrams > 0 && <span>{part.part.weightGrams} g</span>}
              {best != null && (
                <>
                  <span className="font-display font-bold text-lg text-ink">{formatGbp(best)}</span>
                  <span className="text-xs">
                    inc. VAT · {formatGbp(exVatPence(best))} ex. VAT
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Where these specs came from — shown above the specs, because
          it changes how much weight to put on them. */}
      <div className="mb-6">
        <ProvenanceBadge
          source={part.part.dataSource}
          sourceUrl={part.part.sourceUrl}
          dataNotes={part.part.dataNotes}
          verifiedAt={part.part.verifiedAt}
        />
      </div>

      {/* Specs */}
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Specifications</h2>
      {specGroups ? (
        <div className="mb-8 space-y-5">
          {specGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">{g.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {g.specs.map((spec) => (
                  <SpecTile key={spec.key} spec={spec} value={part[spec.key]} prominent={FRAME_PROMINENT_KEYS.has(spec.key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {config.specs.map((spec) => (
            <SpecTile key={spec.key} spec={spec} value={part[spec.key]} />
          ))}
        </div>
      )}

      {/* Vendors */}
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Vendor Prices</h2>
      <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 mb-8 overflow-hidden">
        {currentPrices.length === 0 && <div className="px-4 py-4 text-sm text-ink-muted">No vendor prices recorded.</div>}
        {currentPrices.map((p: any) => (
          <a
            key={p.id}
            href={p.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5 text-sm hover:bg-black/[0.02] transition-colors group"
          >
            <span className="flex items-center gap-2 text-ink">
              {p.vendor.name.replace(/_/g, ' ')}
              <ExternalLink size={13} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="flex items-center gap-3">
              {!p.inStock && <span className="chip bg-brake-soft text-brake">Out of stock</span>}
              {p.inStock && p.pricePence === best && <span className="chip bg-wheel-soft text-wheel">Best price</span>}
              <span className="font-display font-bold text-ink">{formatGbp(p.pricePence)}</span>
            </span>
          </a>
        ))}
      </div>

      {/* History */}
      {Object.keys(byVendor).length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Price History</h2>
          <div className="h-64 rounded-xl bg-white border border-black/5 shadow-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid stroke="rgba(18,20,26,0.06)" vertical={false} />
                <XAxis dataKey="date" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => formatGbp(v * 100)} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid rgba(18,20,26,0.08)', fontSize: 12, boxShadow: '0 8px 24px -12px rgba(18,20,26,0.3)' }}
                  formatter={(v: any) => [formatGbp(v * 100), '']}
                />
                {Object.entries(byVendor).map(([vendor, points], i) => (
                  <Line
                    key={vendor}
                    data={points}
                    dataKey="price"
                    name={vendor.replace(/_/g, ' ')}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Compatibility FAQ — generated from the real compatibility engine's
          rule output for this exact part against the real catalogue (see
          GET /compatibility/parts/:slug/:partId). A part with too little
          real data to generate anything meaningful just shows nothing here
          rather than padding the page with invented specifics. */}
      {compat && compat.faqs.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Compatibility FAQ</h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 overflow-hidden mb-3">
            {compat.faqs.slice(0, 6).map((f) => {
              // Rule codes out of the prose, into chips (audit 06.1). The
              // rule *titles* stay in the sentence; only the parenthetical
              // ids move.
              const { text, codes } = extractRuleCodes(f.answer);
              return (
                <div key={f.question} className="px-4 py-3.5">
                  <div className="text-sm font-semibold text-ink mb-1">{f.question}</div>
                  <div className="text-sm text-ink-muted leading-relaxed">{text}</div>
                  {codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {codes.map((code) => (
                        <span key={code} className="font-mono text-[10px] leading-none px-1.5 py-1 rounded bg-black/[0.04] border border-black/5 text-ink-muted">
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={`/compatibility/${category}/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-chassis hover:underline mb-8"
          >
            See the full compatibility breakdown
          </Link>
        </>
      )}
    </div>
  );
}
