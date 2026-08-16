'use client';

// app/parts/[category]/page.tsx
//
// Generic across all 27 categories — filters, labels and the subsystem
// accent colour all come from lib/categories.

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Info } from 'lucide-react';
import FilterSidebar from '../../../components/FilterSidebar';
import PartIcon from '../../../components/PartIcon';
import PartImage from '../../../components/PartImage';
import { useDiscipline } from '../../../components/DisciplineProvider';
import { api } from '../../../lib/api-client';
import { formatGbpWhole } from '../../../lib/money';
import { CATEGORY_BY_SLUG, GROUPS, accentFor, formatSpecValue } from '../../../lib/categories';

// Categories with no `lockout` entry in src/routes/parts.routes.ts's
// CATEGORIES table -- currently just `frames`, since nothing in the
// catalogue is checked "compatible with" a frame in reverse (the frame is
// what everything else gets checked against). The API doesn't expose
// which categories support compatibility filtering, so this list is kept
// by hand; re-check it against that file if a category's lockout support
// changes.
const NO_LOCKOUT_CATEGORIES = new Set(['frames']);

function CategoryPageInner() {
  const { category } = useParams<{ category: string }>();
  const searchParams = useSearchParams();
  const { discipline } = useDiscipline();
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Opt-in, off by default each visit -- mirrors the same anonymous/claimed
  // build id already used by /builder?build=. There's no in-app link that
  // sends a user here with `?build=` attached yet (that would mean editing
  // the global nav, out of scope for this page) -- reachable today by
  // arriving with `?build=` already in the URL, e.g. pasted or bookmarked
  // from the builder.
  const [onlyCompatible, setOnlyCompatible] = useState(false);

  const config = CATEGORY_BY_SLUG[category];
  const { accent, soft, group } = accentFor(category);
  const buildId = searchParams.get('build');
  const supportsCompat = Boolean(config) && !NO_LOCKOUT_CATEGORIES.has(category);
  const showCompatToggle = Boolean(buildId) && supportsCompat;

  // Switching category (e.g. via the nav while this page is mounted)
  // shouldn't carry the previous category's toggle state along.
  useEffect(() => { setOnlyCompatible(false); }, [category]);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    const params: Record<string, string> = Object.fromEntries(searchParams.entries());
    // The API only acts on this when `config.lockout` exists for the
    // category (parts.routes.ts:363) -- otherwise the param is inert, same
    // as any other filter it doesn't recognise.
    if (onlyCompatible && buildId && supportsCompat) {
      params.compatibleWith = buildId;
    }
    // `discipline` itself isn't read from `params` — getParts() already
    // pulls the header switch's value straight from localStorage. It's
    // only a dependency here so switching it while this page is open
    // triggers a refetch instead of leaving a stale list on screen.
    api.getParts(category, params)
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [category, searchParams, config, discipline, onlyCompatible, buildId, supportsCompat]);

  if (!config) {
    return <div className="max-w-[1400px] mx-auto px-6 py-10 text-sm text-ink-muted">Unknown category: {category}</div>;
  }

  // First two spec fields make a useful at-a-glance summary on the card.
  const preview = config.specs.slice(0, 2);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
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

        {showCompatToggle && (
          <label className="ml-auto flex items-center gap-2 text-xs font-medium text-ink-muted bg-white border border-black/10 rounded-full pl-3 pr-3.5 py-2 shadow-card cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCompatible}
              onChange={(e) => setOnlyCompatible(e.target.checked)}
              className="w-3.5 h-3.5"
              style={{ accentColor: accent }}
            />
            Show only parts that fit my build
          </label>
        )}
      </div>

      {onlyCompatible && showCompatToggle && (
        <div className="flex items-center gap-2 rounded-lg border border-chassis-ring bg-chassis-soft px-3.5 py-2.5 mb-5 text-xs text-chassis">
          <Info size={13} className="shrink-0" />
          Showing only {config.label.toLowerCase()} compatible with your current build.
          <Link href={`/builder?build=${buildId}`} className="ml-auto font-medium underline shrink-0">
            Back to build
          </Link>
        </div>
      )}

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
              <p className="text-sm text-ink-muted">
                {onlyCompatible
                  ? `None of the ${config.label.toLowerCase()} in the catalogue fit your current build.`
                  : 'No parts match these filters.'}
              </p>
              {onlyCompatible && (
                <button
                  onClick={() => setOnlyCompatible(false)}
                  className="mt-2 text-xs font-medium text-ink-muted underline hover:text-ink"
                >
                  Show all {config.label.toLowerCase()} instead
                </button>
              )}
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
