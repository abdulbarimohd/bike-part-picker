'use client';

// app/parts/[category]/page.tsx
//
// Generic across all 27 categories — filters, labels and the subsystem
// accent colour all come from lib/categories.

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FilterSidebar from '../../../components/FilterSidebar';
import PartIcon from '../../../components/PartIcon';
import PartImage from '../../../components/PartImage';
import { useDiscipline } from '../../../components/DisciplineProvider';
import { api } from '../../../lib/api-client';
import { formatGbpWhole } from '../../../lib/money';
import { CATEGORY_BY_SLUG, GROUPS, accentFor, formatSpecValue } from '../../../lib/categories';

function CategoryPageInner() {
  const { category } = useParams<{ category: string }>();
  const searchParams = useSearchParams();
  const { discipline } = useDiscipline();
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const config = CATEGORY_BY_SLUG[category];
  const { accent, soft, group } = accentFor(category);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    const params = Object.fromEntries(searchParams.entries());
    // `discipline` itself isn't read from `params` — getParts() already
    // pulls the header switch's value straight from localStorage. It's
    // only a dependency here so switching it while this page is open
    // triggers a refetch instead of leaving a stale list on screen.
    api.getParts(category, params)
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [category, searchParams, config, discipline]);

  if (!config) {
    return <div className="max-w-[1400px] mx-auto px-6 py-10 text-sm text-ink-muted">Unknown category: {category}</div>;
  }

  // First two spec fields make a useful at-a-glance summary on the card.
  const preview = config.specs.slice(0, 2);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: soft, color: accent }}>
          <PartIcon slug={category} className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{config.label}</h1>
          <p className="text-xs text-ink-muted">
            <span style={{ color: accent }}>{GROUPS[group].label}</span>
            {!loading && <> · {parts.length} product{parts.length === 1 ? '' : 's'}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 md:gap-8">
        {config.filters.length > 0 && <FilterSidebar filters={config.filters} accent={accent} />}

        <div className="flex-1">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-white/60 border border-black/5 animate-pulse" />
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-10 text-center">
              <p className="text-sm text-ink-muted">No parts match these filters.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {parts.map((p) => (
                <Link
                  key={p.part.id}
                  href={`/parts/${category}/${p.part.id}`}
                  className="accent-tile shadow-card flex flex-col"
                  style={{ ['--accent' as string]: accent }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <PartImage
                      slug={category}
                      imageUrl={p.part.imageUrl}
                      alt={`${p.part.brand} ${p.part.name}`}
                      className="w-9 h-9"
                      iconClassName="w-5 h-5"
                      accent={accent}
                      soft={soft}
                    />
                    <span className="font-display font-bold text-ink">
                      {formatGbpWhole(p.part.basePricePence)}
                    </span>
                  </div>

                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">{p.part.brand}</div>
                  <div className="text-sm font-medium text-ink leading-snug mb-3">{p.part.name}</div>

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {preview.map((s) => (
                      <span key={s.key} className="chip bg-black/[0.04] text-ink-muted">
                        {formatSpecValue(p[s.key], s.suffix)}
                      </span>
                    ))}
                    {p.part.weightGrams > 0 && (
                      <span className="chip bg-black/[0.04] text-ink-muted">{p.part.weightGrams}g</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="max-w-[1400px] mx-auto px-6 py-10 text-sm text-ink-muted">Loading…</div>}>
      <CategoryPageInner />
    </Suspense>
  );
}
