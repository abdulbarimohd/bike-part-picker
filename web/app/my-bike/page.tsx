'use client';

// app/my-bike/page.tsx
//
// Entry point for people who already own a factory bike and want
// upgrades rather than a scratch build. Picking a bike clones its
// stock spec into a Build, after which every existing compatibility
// endpoint works on it unchanged.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ArrowRight, Bike } from 'lucide-react';
import { api, clearToken, BikeModel } from '../../lib/api-client';
import { formatGbpWhole } from '../../lib/money';

// Some imported rows carry the model year inside the name itself
// ("Topstone 1 2024" with year 2024) while the year is already printed
// in the subtitle line below — rendering both reads as a stutter.
// Display-only strip: the stored model/variant is untouched, and the
// year is only removed when it exactly matches the year shown in the
// subtitle, so a genuine name like "Process 134" never loses digits.
function stripRedundantYear(text: string | null | undefined, year: number): string {
  const t = (text ?? '').trim();
  if (!t) return '';
  if (t === String(year)) return '';
  return t.replace(new RegExp(`\\s+${year}$`), '');
}

const PAGE_SIZE = 30;

export default function MyBikePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bikes, setBikes] = useState<BikeModel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing doesn't fire a request per keystroke. A search
  // always restarts from the top -- the catalogue used to hard-cap at
  // the first 25 results (alphabetically) with no way to reach anything
  // past Cannondale, so this now paginates instead of truncating.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.searchBikes(query || undefined, 0, PAGE_SIZE)
        .then(({ items, total }) => {
          setBikes(items);
          setTotal(total);
        })
        .catch(() => {
          setBikes([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function loadMore() {
    setLoadingMore(true);
    api.searchBikes(query || undefined, bikes.length, PAGE_SIZE)
      .then(({ items, total }) => {
        setBikes((prev) => [...prev, ...items]);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  async function choose(bike: BikeModel) {
    // Login is optional, not a gate: /bikes/:slug/clone works logged
    // out too and hands back an anonymous build, same as the scratch
    // builder. A "log in to save this" prompt lives on the build page.
    setCloning(bike.slug);
    setError(null);
    try {
      const build = await api.cloneBike(bike.slug);
      router.push(`/my-bike/${build.id}`);
    } catch (err: any) {
      if (err.status === 401) {
        // Token outlived its user (a database reset, say) — drop it so
        // the login page doesn't bounce straight back here.
        clearToken();
        router.push('/login');
      } else {
        setError(err.message ?? 'Could not load that bike');
      }
      setCloning(null);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      <span className="chip bg-contact-soft text-contact ring-1 ring-contact-ring mb-4">
        For riders who already own a bike
      </span>
      <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-ink mb-3 max-w-3xl">
        Find upgrades that fit <span className="text-contact">your</span> bike
      </h1>
      <p className="text-ink-muted mb-8 max-w-2xl leading-relaxed">
        Pick the bike you own and we&apos;ll load its factory spec. Every replacement and
        upgrade shown after that is filtered against what&apos;s actually on your bike — the
        right freehub, the right shock size, the right seatpost diameter.
      </p>

      {/* Search stays a focused width even though the page no longer
          does -- a search box stretched to 1400px reads as broken, not
          spacious. Results below use the full page width instead. */}
      <div className="relative mb-6 max-w-2xl">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          autoFocus
          placeholder="Search by brand or model — e.g. Fuel EX, Hightower, Epic"
          className="w-full text-sm border border-black/10 rounded-xl pl-10 pr-4 py-3.5 bg-white text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-contact/25 focus:border-contact transition-shadow"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-brake bg-brake-soft border border-brake-ring rounded-lg px-4 py-3 mb-4 max-w-2xl">{error}</p>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/60 border border-black/5 animate-pulse" />
          ))}
        </div>
      ) : bikes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-10 text-center max-w-2xl">
          <Bike size={26} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted">
            {query ? `No bikes matching “${query}”.` : 'No bikes in the catalogue yet.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bikes.map((bike) => {
            const model = stripRedundantYear(bike.model, bike.year);
            const variant = stripRedundantYear(bike.variant, bike.year);
            return (
            <button
              key={bike.slug}
              onClick={() => choose(bike)}
              disabled={cloning !== null}
              className="text-left accent-tile shadow-card flex items-center gap-4 disabled:opacity-60"
              // Matches the `contact` colour in tailwind.config.ts.
              style={{ ['--accent' as string]: '#A18800' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-contact-soft text-contact">
                <Bike size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-ink">
                  {bike.brand} {model || bike.model}
                  {variant && <span className="text-ink-muted font-normal"> {variant}</span>}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {bike.year}
                  {bike.discipline && <> · {bike.discipline}</>}
                  {bike._count && <> · {bike._count.parts} component{bike._count.parts === 1 ? '' : 's'}</>}
                  {bike.msrpPence && <> · {formatGbpWhole(bike.msrpPence)} new</>}
                </div>
              </div>
              {cloning === bike.slug
                ? <Loader2 size={17} className="animate-spin text-contact shrink-0" />
                : <ArrowRight size={17} className="text-ink-muted shrink-0" />}
            </button>
            );
          })}
        </div>
      )}

      {!loading && bikes.length < total && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm font-medium text-contact border border-contact/30 rounded-lg px-5 py-2.5 hover:bg-contact-soft transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            {loadingMore && <Loader2 size={15} className="animate-spin" />}
            Load more ({bikes.length} of {total})
          </button>
        </div>
      )}

      <p className="text-xs text-ink-muted mt-8 max-w-2xl">
        Can&apos;t find your bike? The catalogue currently covers a handful of mountain bikes
        with a complete, verified stock build — more are being added. If yours isn&apos;t
        listed yet,{' '}
        <Link href="/builder" className="text-chassis hover:underline">
          start from scratch in the Builder
        </Link>{' '}
        instead and pick your parts one by one.
      </p>
    </div>
  );
}
