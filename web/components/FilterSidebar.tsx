'use client';

// components/FilterSidebar.tsx
//
// Generic filter sidebar driven by a config array rather than a
// hardcoded form per category — the category page passes in which
// filters apply, and this renders them and wires them to URL query
// params, which the page forwards straight to the API's filters.

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'boolean' | 'range';
  options?: { value: string; label: string }[];
  /** Almost every `range` filter is a floor ("at least this"), hence the
   *  default -- but a couple (fork travel, cassette max cog) are wired
   *  server-side to `lte`, a ceiling. The placeholder used to hardcode
   *  "Minimum" regardless, so typing a number into those two told a user
   *  to expect everything ABOVE it when the API actually returned
   *  everything below. */
  rangeDirection?: 'min' | 'max';
  /** Unit shown as a suffix inside a `range` input ("mm", "t") -- a bare
   *  number box gave no hint what it was measuring. */
  unit?: string;
  /** Optional section label. Consecutive filters sharing a `group` render
   *  under one light divider + label; filters without one are ungrouped. */
  group?: string;
}

interface FilterSidebarProps {
  filters: FilterConfig[];
  accent?: string;
}

const FIELD =
  'w-full text-sm border rounded-lg px-2.5 py-2 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow';
// A filter that's actually narrowing the list picks up the category
// accent on its border and text, so "which of these five boxes did I
// touch?" is answerable at a glance rather than by reading each value.
const FIELD_IDLE = 'border-black/10 text-ink';
const FIELD_ACTIVE = 'border-[var(--accent)] text-[var(--accent)] font-medium';
// Native number spinners would sit under the unit suffix; hide them.
const NUMBER_FIELD = 'pr-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** Splits the filter list into runs of the same `group` (undefined counts
 *  as its own run) so the sidebar can put a light divider between runs and
 *  a section label over the named ones. Order is preserved. */
function sectionise(filters: FilterConfig[]): { group?: string; items: FilterConfig[] }[] {
  const out: { group?: string; items: FilterConfig[] }[] = [];
  for (const f of filters) {
    const last = out[out.length - 1];
    if (last && last.group === f.group) last.items.push(f);
    else out.push({ group: f.group, items: [f] });
  }
  return out;
}

// Matches `chassis` in tailwind.config.ts, the default accent.
export default function FilterSidebar({ filters, accent = '#b45309' }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Collapsed by default on mobile -- on a narrow screen a permanently-
  // open, fixed-width sidebar left the product grid squeezed into a
  // sliver next to it. md: and up ignore this entirely (always open,
  // in the sidebar column) via the `md:block` override below.
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = filters.filter((f) => searchParams.get(f.key)).length;
  const sections = sectionise(filters);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    // `self-start` + sticky live on the aside itself: as a stretched flex
    // child the column used to run the full height of the product grid, so
    // a two-filter category left a tall empty strip under a short panel.
    // Sizing to content and sticking to the top keeps the panel in view
    // while scrolling without that empty column.
    <aside className="w-full md:w-56 md:shrink-0 md:self-start md:sticky md:top-20" style={{ ['--accent' as string]: accent }}>
      <div className="rounded-xl bg-white border border-black/5 shadow-card">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="filter-sidebar-fields"
          className="w-full flex items-center justify-between gap-2 p-4 md:hidden"
        >
          <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-ink">
            <SlidersHorizontal size={15} />
            Filters{activeCount > 0 && ` (${activeCount})`}
          </span>
          <ChevronDown size={16} className={`text-ink-muted transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>

        <div id="filter-sidebar-fields" className={`${mobileOpen ? 'block' : 'hidden'} md:block p-4 md:pt-4 pt-0`}>
          <div className="hidden md:flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-ink">Filters</h3>
            {activeCount > 0 && (
              <button
                onClick={() => router.push('?')}
                className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
              >
                <X size={12} /> Clear {activeCount}
              </button>
            )}
          </div>

          {sections.map((section, si) => (
            <div
              key={section.group ?? `_${si}`}
              className={`space-y-3.5 ${si > 0 ? 'mt-4 pt-3.5 border-t border-black/[0.06]' : ''}`}
            >
              {section.group && (
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/70 -mb-1">
                  {section.group}
                </div>
              )}
              {section.items.map((filter) => {
                const active = !!searchParams.get(filter.key);
                const fieldId = `filter-${filter.key}`;
                const fieldClass = `${FIELD} ${active ? FIELD_ACTIVE : FIELD_IDLE}`;
                return (
                  <div key={filter.key}>
                    <label htmlFor={fieldId} className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
                      {filter.label}
                      {/* The visible unit sits inside the input (aria-hidden);
                          keep it in the accessible name too. */}
                      {filter.unit && <span className="sr-only"> ({filter.unit})</span>}
                    </label>

                    {filter.type === 'boolean' ? (
                      <select id={fieldId} className={fieldClass} value={searchParams.get(filter.key) ?? ''} onChange={(e) => updateParam(filter.key, e.target.value)}>
                        <option value="">Any</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : filter.type === 'range' ? (
                      <div className="relative">
                        <input
                          id={fieldId}
                          type="number"
                          inputMode="decimal"
                          placeholder={filter.rangeDirection === 'max' ? 'Maximum' : 'Minimum'}
                          className={`${fieldClass} ${filter.unit ? NUMBER_FIELD : ''}`}
                          defaultValue={searchParams.get(filter.key) ?? ''}
                          onBlur={(e) => updateParam(filter.key, e.target.value)}
                        />
                        {filter.unit && (
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs ${active ? 'text-[var(--accent)]' : 'text-ink-muted'}`}
                          >
                            {filter.unit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <select id={fieldId} className={fieldClass} value={searchParams.get(filter.key) ?? ''} onChange={(e) => updateParam(filter.key, e.target.value)}>
                        <option value="">Any</option>
                        {filter.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Mobile-only: closes the drawer back down once filters are set,
              instead of leaving it open and pushing the grid further down. */}
          {activeCount > 0 && (
            <button
              onClick={() => router.push('?')}
              className="md:hidden mt-3.5 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              <X size={12} /> Clear {activeCount}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
