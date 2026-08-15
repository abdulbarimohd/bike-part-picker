'use client';

// components/FilterSidebar.tsx
//
// Generic filter sidebar driven by a config array rather than a
// hardcoded form per category — the category page passes in which
// filters apply, and this renders them and wires them to URL query
// params, which the page forwards straight to the API's filters.

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

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
}

interface FilterSidebarProps {
  filters: FilterConfig[];
  accent?: string;
}

const FIELD =
  'w-full text-sm border border-black/10 rounded-lg px-2.5 py-2 bg-white text-ink ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow';

// Matches `chassis` in tailwind.config.ts, the default accent.
export default function FilterSidebar({ filters, accent = '#b45309' }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCount = filters.filter((f) => searchParams.get(f.key)).length;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <aside className="w-56 shrink-0" style={{ ['--accent' as string]: accent }}>
      <div className="sticky top-20 rounded-xl bg-white border border-black/5 p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
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

        <div className="space-y-3.5">
          {filters.map((filter) => {
            const active = !!searchParams.get(filter.key);
            return (
              <div key={filter.key}>
                <label className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
                  {filter.label}
                </label>

                {filter.type === 'boolean' ? (
                  <select className={FIELD} value={searchParams.get(filter.key) ?? ''} onChange={(e) => updateParam(filter.key, e.target.value)}>
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : filter.type === 'range' ? (
                  <input
                    type="number"
                    placeholder={filter.rangeDirection === 'max' ? 'Maximum' : 'Minimum'}
                    className={FIELD}
                    defaultValue={searchParams.get(filter.key) ?? ''}
                    onBlur={(e) => updateParam(filter.key, e.target.value)}
                  />
                ) : (
                  <select className={FIELD} value={searchParams.get(filter.key) ?? ''} onChange={(e) => updateParam(filter.key, e.target.value)}>
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
      </div>
    </aside>
  );
}
