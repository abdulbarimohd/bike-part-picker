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
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { compatibilityApi, PartCompatibility } from '../../../../lib/compatibility-client';
import { CATEGORY_BY_SLUG, accentFor } from '../../../../lib/categories';

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
        the Bike PartPicker catalogue — see the <Link href="/compatibility/rules" className="text-chassis hover:underline">rule reference</Link>.
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
          return (
            <div key={`${rel.categorySlug}:${rel.position ?? ''}`} className="rounded-xl bg-white border border-black/5 shadow-card p-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-display text-base font-bold text-ink">
                  {rel.categoryLabel}{rel.position && <span className="text-ink-muted font-normal text-sm"> (as {rel.position})</span>}
                </h2>
                <span className={`chip ${full ? 'bg-wheel-soft text-wheel' : none ? 'bg-brake-soft text-brake' : 'bg-drive-soft text-drive'}`}>
                  {full ? <CheckCircle2 size={11} /> : none ? <XCircle size={11} /> : null}
                  {rel.compatibleCount} of {rel.totalCandidates} compatible
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

      {data.faqs.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mt-10 mb-3">Frequently asked</h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 overflow-hidden">
            {data.faqs.map((f) => (
              <div key={f.question} className="px-5 py-4">
                <div className="text-sm font-semibold text-ink mb-1">{f.question}</div>
                <div className="text-sm text-ink-muted leading-relaxed">{f.answer}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
