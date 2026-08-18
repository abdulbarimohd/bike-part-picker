'use client';

// components/RulesBrowser.tsx
//
// The stateful half of the rule reference (app/compatibility/rules/
// page.tsx): the sticky filter bar (text filter, severity toggles,
// section-jump row, "Showing N of M"), the empty state, and the
// per-section tables/cards. Moved here verbatim from the old
// 'use client' page so the page itself could become a server component
// that fetches the catalogue and owns the <title>/description.
//
// Why this split still gets the whole table indexed: a client component
// is server-rendered too, with its initial state -- here an empty query
// and no severity selected -- so the initial HTML carries every section
// and every rule row. Hydration only wires up the inputs; nothing is
// fetched in the browser. Crawlers read 103 rules; visitors get the
// same page plus a working filter.
//
// Types come from lib/server-api.ts as a *type-only* import. That
// module starts with `import 'server-only'` and would fail if a client
// bundle pulled it in, but `import type` is erased at compile time, so
// this file never actually imports it -- and we don't have to keep a
// second copy of the RuleCatalogue shape in a browser-safe file.
//
// 05.2: 103 rules is too many for one flat scroll, so the page carries a
// sticky bar under the site header with a section-jump row (the API's
// own section grouping -- one prefix per subsystem, R-HS-*, R-BB-*, ...),
// a client-side text filter and severity toggles. All of it filters the
// already-fetched catalogue in memory; nothing is refetched.
//
// 04.3 / 05.3: each section is a proper <table> with a <thead> from md
// up, and reflows into stacked cards below md (rule id + severity on one
// line, description below, form/enforcement meta on a third with inline
// labels) instead of a horizontally-overflowing table.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X, Wrench } from 'lucide-react';
import type { RuleCatalogue, RuleEntry } from '../lib/server-api';

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-brake-soft text-brake',
  warning: 'bg-drive-soft text-drive',
  info: 'bg-cockpit-soft text-cockpit',
  advisory: 'bg-misc-soft text-misc',
};

/** Fixed display order for the severity toggles, so they don't reshuffle
 *  by whichever severity happens to be counted first. Anything the API
 *  returns that isn't listed here is appended after these. */
const SEVERITY_ORDER = ['critical', 'warning', 'info', 'advisory'];

const stripMd = (s: string) => s.replace(/[*_`]/g, '');

/** "1. Frame ↔ Fork" -> "Frame ↔ Fork" for the jump chips; the number is
 *  shown separately in a small mono span. */
const sectionShortTitle = (title: string) => title.replace(/^\d+\.\s*/, '');

function ruleMatches(rule: RuleEntry, needle: string): boolean {
  if (!needle) return true;
  const hay = [rule.id, rule.rule, rule.fields ?? '', rule.implementedBy ?? '', rule.form, rule.severity]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export default function RulesBrowser({ catalogue: data }: { catalogue: RuleCatalogue }) {
  const [query, setQuery] = useState('');
  const [severities, setSeverities] = useState<Set<string>>(new Set());

  const needle = query.trim().toLowerCase();

  // Sections with only the rules that pass the current filter; sections
  // that end up empty stay in the list (so the jump chips keep their
  // positions and can be dimmed) but render nothing.
  const filtered = useMemo(() => {
    return data.sections.map((section) => ({
      ...section,
      rules: section.rules.filter((r) => (severities.size === 0 || severities.has(r.severity)) && ruleMatches(r, needle)),
    }));
  }, [data, needle, severities]);

  const bySeverity = data.sections.flatMap((s) => s.rules).reduce<Record<string, number>>((acc, r) => {
    acc[r.severity] = (acc[r.severity] ?? 0) + 1;
    return acc;
  }, {});
  const severityKeys = [
    ...SEVERITY_ORDER.filter((s) => bySeverity[s]),
    ...Object.keys(bySeverity).filter((s) => !SEVERITY_ORDER.includes(s)),
  ];

  const shown = filtered.reduce((n, s) => n + s.rules.length, 0);
  const filtering = needle.length > 0 || severities.size > 0;

  const toggleSeverity = (sev: string) =>
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });

  return (
    <>
      {/* 05.2: sticky filter + section-jump bar. Sits under the site
          header (sticky top-0, h-14) so top-14; z below the header's
          z-40 and above the section cards. Sections carry a scroll-mt
          large enough to clear both, see the section wrapper below. */}
      <div className="sticky top-14 z-30 -mx-6 px-6 py-2.5 mb-6 bg-white/85 backdrop-blur-md border-b border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter rules — id, text, field or function"
              aria-label="Filter rules"
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-white border border-black/10 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-chassis-ring focus:border-chassis/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by severity">
            {severityKeys.map((sev) => {
              const on = severities.has(sev);
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => toggleSeverity(sev)}
                  aria-pressed={on}
                  className={`chip transition-all ${SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.info} ${on ? 'ring-2 ring-current' : severities.size > 0 ? 'opacity-50 hover:opacity-90' : 'hover:opacity-90'}`}
                >
                  {bySeverity[sev]} {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* One horizontally-scrolling line at every width: 16 full section
            titles wrap to four rows at the page's max width, which made
            the sticky bar taller than the content it was meant to help
            navigate. The right-edge fade hints that the row continues. */}
        <nav aria-label="Jump to section" className="relative mt-2 -mx-6 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-white/90 after:to-transparent">
          <div className="flex gap-1.5 overflow-x-auto px-6 pb-0.5 pr-10">
          {filtered.map((section) => {
            const empty = section.rules.length === 0;
            return (
              <a
                key={section.number}
                href={`#section-${section.number}`}
                aria-disabled={empty || undefined}
                className={`chip whitespace-nowrap bg-white border border-black/10 text-ink hover:border-chassis/40 transition-colors ${empty ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <span className="font-mono text-[10px] text-ink-muted">{section.number}</span>
                {sectionShortTitle(section.title)}
              </a>
            );
          })}
          </div>
        </nav>

        {filtering && (
          <div className="mt-2 text-xs text-ink-muted flex items-center gap-2">
            <span>Showing {shown} of {data.totalRules} rules</span>
            <button
              type="button"
              onClick={() => { setQuery(''); setSeverities(new Set()); }}
              className="text-chassis hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {shown === 0 && (
        <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-8 text-center text-sm text-ink-muted">
          No rules match{needle ? <> “{query.trim()}”</> : ''}{severities.size > 0 ? ` at ${[...severities].join('/')} severity` : ''}.
        </div>
      )}

      {filtered.map((section) => section.rules.length > 0 && (
        // scroll-mt clears the site header (56px) plus the sticky bar
        // (~100px desktop, taller on mobile where the input and severity
        // chips stack) when a jump chip is followed.
        <section key={section.number} id={`section-${section.number}`} className="mb-8 scroll-mt-52 md:scroll-mt-48">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">
            {section.title}
            {filtering && <span className="ml-2 font-sans normal-case tracking-normal font-normal text-ink-muted">{section.rules.length} shown</span>}
          </h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card overflow-hidden">
            {/* >= md: table with a header row */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink-muted bg-black/[0.02] border-b border-black/5">
                    <th scope="col" className="px-4 py-2 text-left font-medium">Rule</th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">Checks that</th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">Form</th>
                    <th scope="col" className="px-2 py-2 text-left font-medium">Enforced by</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Severity</th>
                  </tr>
                </thead>
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
                          {stripMd(rule.rule)}
                        </Link>
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-ink-muted whitespace-nowrap">{rule.form}</td>
                      {/* Same enforcing-function meta the mobile cards and
                          the rule detail page show -- kept on desktop too so
                          the two layouts don't disagree about what a rule
                          record contains. */}
                      <td className="px-2 py-3 align-top text-xs text-ink-muted font-mono break-all">
                        {rule.implementedBy ? rule.implementedBy.split(' / ').map((fn) => `${fn}()`).join(' / ') : '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <span className={`chip ${SEVERITY_STYLE[rule.severity] ?? SEVERITY_STYLE.info}`}>{rule.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* < md: stacked cards, meta labelled inline */}
            <ul className="md:hidden divide-y divide-black/5">
              {section.rules.map((rule) => (
                <li key={rule.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <Link href={`/compatibility/rules/${rule.id}`} className="font-mono text-xs text-chassis hover:underline">
                      {rule.id}
                    </Link>
                    <span className={`chip ${SEVERITY_STYLE[rule.severity] ?? SEVERITY_STYLE.info}`}>{rule.severity}</span>
                  </div>
                  <Link href={`/compatibility/rules/${rule.id}`} className="block text-sm text-ink hover:underline">
                    {stripMd(rule.rule)}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span>Form <span className="text-ink">{rule.form}</span></span>
                    {rule.implementedBy && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <Wrench size={11} className="shrink-0" />
                        {/* break-all, not truncate: a function name that
                            ellipsises is unreadable, and there's no title
                            attribute to fall back on for touch. */}
                        <span className="font-mono break-all">{rule.implementedBy.split(' / ').map((fn) => `${fn}()`).join(' / ')}</span>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
