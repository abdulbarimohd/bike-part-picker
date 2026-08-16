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

// Matches `chassis`/`wheel`/`drive` in tailwind.config.ts.
const CHART_COLORS = ['#b45309', '#059669', '#ea580c'];

export default function PartDetailPage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            <h1 className="font-display text-2xl font-bold text-ink leading-tight">{part.part.name}</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {config.specs.map((spec) => {
          const value = formatSpecValue(part[spec.key], spec.suffix);
          const unknown = value === '—';
          return (
            <div key={spec.key} className="rounded-xl bg-white border border-black/5 px-3.5 py-3 shadow-card">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-0.5">{spec.label}</div>
              <div className={`font-medium text-sm ${unknown ? 'text-ink-muted/50' : 'text-ink'}`}>{value}</div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
