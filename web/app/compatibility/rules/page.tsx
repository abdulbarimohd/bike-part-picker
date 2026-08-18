// app/compatibility/rules/page.tsx
//
// The rule-by-rule reference: every rule in COMPATIBILITY_RULES.md,
// grouped by section, with its severity and (where the doc names one)
// which engine.ts function enforces it. Parsed live from that file by
// the API -- see src/compatibility/rulesCatalogue.ts -- so this can't
// drift into a hand-written second copy of the rules.
//
// Server component (was 'use client' + useEffect): the catalogue is
// awaited here through lib/server-api.ts, this file renders the static
// top of the page (back link, header, forms legend) and hands the whole
// payload to <RulesBrowser>, the client component that owns the filter
// bar and section tables. The browser gets the full table in the
// initial HTML either way -- see the header comment in
// components/RulesBrowser.tsx for why the split still indexes.
//
// The reference only changes on deploy, so it revalidates daily; a
// failed fetch renders the same "unavailable" line the client version
// showed rather than failing a build-time prerender.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import RulesBrowser from '../../../components/RulesBrowser';
import { getRuleCatalogue } from '../../../lib/server-api';
import type { RuleCatalogue } from '../../../lib/server-api';

export const revalidate = 86400;

/** null on 404 *or* any other API failure -- the page must degrade, not throw. */
async function loadCatalogue(): Promise<RuleCatalogue | null> {
  try {
    return await getRuleCatalogue();
  } catch {
    return null;
  }
}

// Fixed copy, measured at 157 chars so it fits a snippet unclamped.
const DESCRIPTION =
  'Every bike part compatibility rule Build My Bike enforces, grouped by subsystem, with severity, ' +
  'the fields it checks and the engine function that applies it.';

// The count in the <title> comes from the same fetch the page makes;
// Next dedupes identical fetches inside one request, so this is free.
export async function generateMetadata(): Promise<Metadata> {
  const data = await loadCatalogue();
  const total = data?.totalRules;
  return {
    title: total ? `${total} bike compatibility rules — the full reference` : 'Bike compatibility rules — the full reference',
    description: DESCRIPTION,
    alternates: { canonical: '/compatibility/rules' },
  };
}

export default async function RulesIndexPage() {
  const data = await loadCatalogue();

  if (!data || data.totalRules === 0) {
    return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-ink-muted">The rule reference is unavailable right now.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/compatibility" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> Compatibility
      </Link>

      {/* 02.6: items-start so the icon anchors to the heading's first
          line when the H1 wraps at narrow widths, rather than floating
          in the vertical middle of a two-line title. */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-chassis-soft text-chassis shrink-0">
          <BookOpen size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink leading-tight">Compatibility Rule Reference</h1>
          <p className="text-xs text-ink-muted mt-1">
            All {data.totalRules} rules implemented in the compatibility engine, across {data.sections.length} sections.
          </p>
        </div>
      </div>

      {/* Rule forms legend */}
      <div className="rounded-xl bg-white border border-black/5 shadow-card p-4 mb-6">
        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
          Every rule reduces to one of six shapes
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {data.forms.map((f) => (
            <div key={f.key} className="flex gap-2.5">
              <span className="font-display font-bold text-chassis shrink-0">{f.key}</span>
              <span className="text-ink-muted">
                <span className="text-ink">{f.shape}</span> — e.g. {f.example}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky filter bar, empty state and the per-section tables: the
          interactive part, hydrated on the client with the same data. */}
      <RulesBrowser catalogue={data} />
    </div>
  );
}
