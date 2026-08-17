'use client';

// app/compatibility/[category]/[id]/page.tsx
//
// "What fits a <part>?" -- the per-part SEO content page. Every count,
// example and blocking reason here comes straight from
// GET /compatibility/parts/:slug/:partId, which runs the real
// filterCompatible*/getCompatibilityWarnings engine functions against
// every real row currently in the catalogue for each related
// category. Nothing on this page is written by hand per part.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle, ChevronDown } from 'lucide-react';
import { compatibilityApi, PartCompatibility } from '../../../../lib/compatibility-client';
import { CATEGORY_BY_SLUG, accentFor } from '../../../../lib/categories';

// 03.1: the "N of M compatible" chip used to be green only at 100% and
// one flat orange for everything else, so "88 of 93" and "1 of 4" read
// identically. Three tiers now, by share of the catalogue that fits:
//   >= 90%  green (wheel)  -- near-universal, the odd outlier is blocked
//   33-90%  amber (drive)  -- genuinely mixed, worth reading the reasons
//   <  33%  red   (brake)  -- mostly blocked; the part is picky here
// plus a small proportional bar inside the chip so two chips in the same
// tier still differ visibly. Class strings are spelt out in full (not
// built from the token name) so Tailwind's JIT sees them.
const RATIO_TIERS = {
  high: { chip: 'bg-wheel-soft text-wheel-text ring-1 ring-wheel-ring', track: 'bg-wheel-ring', fill: 'bg-wheel' },
  mid: { chip: 'bg-drive-soft text-drive-text ring-1 ring-drive-ring', track: 'bg-drive-ring', fill: 'bg-drive' },
  low: { chip: 'bg-brake-soft text-brake-text ring-1 ring-brake-ring', track: 'bg-brake-ring', fill: 'bg-brake' },
} as const;

function ratioTier(compatible: number, total: number): keyof typeof RATIO_TIERS {
  const share = total > 0 ? compatible / total : 0;
  if (share >= 0.9) return 'high';
  if (share >= 1 / 3) return 'mid';
  return 'low';
}

/** Pulls the key number out of a generated FAQ answer so the collapsed
 *  summary can carry it. The API's buildFaqs() writes exactly three shapes
 *  ("All 28 ...", "None of the 4 ...", "5 of 8 ..."); anything else gets
 *  null and the summary is just the question. Nothing is computed here
 *  that isn't already in the answer text. */
function faqKeyNumber(answer: string): string | null {
  const partial = answer.match(/^(\d+) of (\d+)\b/);
  if (partial) return `${partial[1]} of ${partial[2]}`;
  const all = answer.match(/^All (\d+)\b/);
  if (all) return `all ${all[1]}`;
  const none = answer.match(/^None of the (\d+)\b/);
  if (none) return `0 of ${none[1]}`;
  return null;
}

export default function WhatFitsPage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const [data, setData] = useState<PartCompatibility | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const config = CATEGORY_BY_SLUG[category];
  const { accent, soft } = accentFor(category);

  useEffect(() => {
    setLoading(true);
    compatibilityApi.getPartCompatibility(category, id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [category, id]);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-ink-muted">Working out what fits…</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-ink-muted">No compatibility data for this part.</div>;

  const title = `${data.part.brand} ${data.part.name}`;
  const partHref = `/parts/${data.part.categorySlug}/${data.part.partId}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <Link href={partHref} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> {title}
      </Link>

      <span className="chip mb-2" style={{ background: soft, color: accent }}>{data.part.categoryLabel}</span>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight mb-2">
        What fits a {title}?
      </h1>
      <p className="text-sm text-ink-muted mb-8 max-w-2xl">
        Computed live from the compatibility engine's real rules against every part currently in
        the Build My Bike catalogue — see the <Link href="/compatibility/rules" className="text-chassis hover:underline">rule reference</Link>.
        Not a marketing claim: where the catalogue doesn't have enough of a category yet, or the
        engine needs a third part it doesn't have in this context, that's shown honestly rather
        than guessed.
      </p>

      {data.relations.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-8 text-center">
          <HelpCircle size={22} className="mx-auto text-ink-muted/40 mb-2" />
          <p className="text-sm text-ink-muted">
            Nothing else in the catalogue is checked against this category yet — {config ? config.label.toLowerCase() : data.part.categoryLabel.toLowerCase()} sit
            at the edge of what the compatibility engine currently cross-checks.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {data.relations.map((rel) => {
          const full = rel.compatibleCount === rel.totalCandidates;
          const none = rel.compatibleCount === 0;
          const tier = RATIO_TIERS[ratioTier(rel.compatibleCount, rel.totalCandidates)];
          const pct = rel.totalCandidates > 0 ? Math.round((rel.compatibleCount / rel.totalCandidates) * 100) : 0;
          return (
            <div key={`${rel.categorySlug}:${rel.position ?? ''}`} className="rounded-xl bg-white border border-black/5 shadow-card p-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-display text-base font-bold text-ink">
                  {rel.categoryLabel}{rel.position && <span className="text-ink-muted font-normal text-sm"> (as {rel.position})</span>}
                </h2>
                <span className={`chip ${tier.chip}`} title={`${pct}% of the ${rel.categoryLabel.toLowerCase()} in the catalogue`}>
                  {full ? <CheckCircle2 size={11} /> : none ? <XCircle size={11} /> : null}
                  {rel.compatibleCount} of {rel.totalCandidates} compatible
                  {/* Proportional bar: same number, read at a glance. */}
                  <span className={`inline-block w-8 h-1.5 rounded-full overflow-hidden ${tier.track}`} aria-hidden="true">
                    <span className={`block h-full rounded-full ${tier.fill}`} style={{ width: `${pct}%` }} />
                  </span>
                </span>
              </div>

              {rel.examplesCompatible.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1.5">
                    {full ? 'Includes' : 'For example'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rel.examplesCompatible.map((p) => (
                      <Link
                        key={p.partId}
                        href={`/parts/${rel.categorySlug}/${p.partId}`}
                        className="chip bg-black/[0.04] text-ink hover:bg-black/[0.08] transition-colors"
                      >
                        {p.brand} {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {rel.blockingRules.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1.5">
                    {none ? 'Blocked by' : `The other ${rel.totalCandidates - rel.compatibleCount} are blocked by`}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rel.blockingRules.map((r) => (
                      <Link
                        key={r.id}
                        href={`/compatibility/rules/${r.id}`}
                        className="chip bg-brake-soft text-brake hover:opacity-80 transition-opacity"
                        title={`${r.count} of ${rel.totalCandidates - rel.compatibleCount} blocked candidates cite this rule`}
                      >
                        {r.title} <span className="font-mono opacity-70">{r.id}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 06.2: the FAQ block is the same data as the cards above, phrased
          as the questions people actually type. Kept (it's the API's
          deliberately generated Q&A form, and the collapsed list is a
          compact index of the page) but collapsed by default -- native
          <details>, one per question, summary line carrying the key
          number so nothing has to be opened to get the headline. */}
      {data.faqs.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mt-10 mb-3">Frequently asked</h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 overflow-hidden">
            {data.faqs.map((f) => {
              const key = faqKeyNumber(f.answer);
              return (
                <details key={f.question} className="group">
                  <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-black/[0.02] transition-colors">
                    <span className="flex-1 min-w-0 text-sm font-medium text-ink">{f.question}</span>
                    {key && <span className="chip bg-black/[0.04] text-ink-muted shrink-0 font-mono">{key}</span>}
                    <ChevronDown size={14} className="text-ink-muted shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-ink-muted leading-relaxed">{f.answer}</div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
