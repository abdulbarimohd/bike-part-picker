'use client';

// app/compatibility/rules/page.tsx
//
// The rule-by-rule reference: every rule in COMPATIBILITY_RULES.md,
// grouped by section, with its severity and (where the doc names one)
// which engine.ts function enforces it. Parsed live from that file by
// the API -- see src/compatibility/rulesCatalogue.ts -- so this can't
// drift into a hand-written second copy of the rules.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { compatibilityApi, RuleCatalogue } from '../../../lib/compatibility-client';

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-brake-soft text-brake',
  warning: 'bg-drive-soft text-drive',
  info: 'bg-cockpit-soft text-cockpit',
  advisory: 'bg-misc-soft text-misc',
};

export default function RulesIndexPage() {
  const [data, setData] = useState<RuleCatalogue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    compatibilityApi.getRules().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-ink-muted">Loading…</div>;
  if (!data || data.totalRules === 0) {
    return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-ink-muted">The rule reference is unavailable right now.</div>;
  }

  const bySeverity = data.sections.flatMap((s) => s.rules).reduce<Record<string, number>>((acc, r) => {
    acc[r.severity] = (acc[r.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/compatibility" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> Compatibility
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-chassis-soft text-chassis">
          <BookOpen size={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Compatibility Rule Reference</h1>
          <p className="text-xs text-ink-muted">
            All {data.totalRules} rules implemented in the compatibility engine, across {data.sections.length} sections.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(bySeverity).map(([sev, count]) => (
          <span key={sev} className={`chip ${SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.info}`}>
            {count} {sev}
          </span>
        ))}
      </div>

      {/* Rule forms legend */}
      <div className="rounded-xl bg-white border border-black/5 shadow-card p-4 mb-8">
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

      {data.sections.map((section) => (
        <div key={section.number} className="mb-8">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">{section.title}</h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-black/5">
                  {section.rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-3 align-top">
                        <Link href={`/compatibility/rules/${rule.id}`} className="font-mono text-xs text-chassis hover:underline whitespace-nowrap">
                          {rule.id}
                        </Link>
                      </td>
                      <td className="px-2 py-3 align-top text-ink">
                        <Link href={`/compatibility/rules/${rule.id}`} className="hover:underline">
                          {rule.rule.replace(/[*_`]/g, '')}
                        </Link>
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-ink-muted whitespace-nowrap">Form {rule.form}</td>
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <span className={`chip ${SEVERITY_STYLE[rule.severity] ?? SEVERITY_STYLE.info}`}>{rule.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
