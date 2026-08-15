'use client';

// app/my-bike/page.tsx
//
// Entry point for people who already own a factory bike and want
// upgrades rather than a scratch build. Picking a bike clones its
// stock spec into a Build, after which every existing compatibility
// endpoint works on it unchanged.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowRight, Bike } from 'lucide-react';
import { api, isLoggedIn, clearToken, BikeModel } from '../../lib/api-client';
import { formatGbpWhole } from '../../lib/money';

export default function MyBikePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bikes, setBikes] = useState<BikeModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.searchBikes(query || undefined)
        .then(setBikes)
        .catch(() => setBikes([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  async function choose(bike: BikeModel) {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
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
    <div className="max-w-3xl mx-auto px-6 py-10">
      <span className="chip bg-contact-soft text-contact ring-1 ring-contact-ring mb-4">
        For riders who already own a bike
      </span>
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink mb-3">
        Find upgrades that fit <span className="text-contact">your</span> bike
      </h1>
      <p className="text-ink-muted mb-8 max-w-2xl leading-relaxed">
        Pick the bike you own and we&apos;ll load its factory spec. Every replacement and
        upgrade shown after that is filtered against what&apos;s actually on your bike — the
        right freehub, the right shock size, the right seatpost diameter.
      </p>

      <div className="relative mb-6">
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
        <p className="text-sm text-brake bg-brake-soft border border-brake-ring rounded-lg px-4 py-3 mb-4">{error}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/60 border border-black/5 animate-pulse" />
          ))}
        </div>
      ) : bikes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-10 text-center">
          <Bike size={26} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted">
            {query ? `No bikes matching “${query}”.` : 'No bikes in the catalogue yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bikes.map((bike) => (
            <button
              key={bike.slug}
              onClick={() => choose(bike)}
              disabled={cloning !== null}
              className="w-full text-left accent-tile shadow-card flex items-center gap-4 disabled:opacity-60"
              // Matches the `contact` colour in tailwind.config.ts.
              style={{ ['--accent' as string]: '#78350f' }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-contact-soft text-contact">
                <Bike size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-ink">
                  {bike.brand} {bike.model}
                  {bike.variant && <span className="text-ink-muted font-normal"> {bike.variant}</span>}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {bike.year}
                  {bike.discipline && <> · {bike.discipline}</>}
                  {bike._count && <> · {bike._count.parts} components</>}
                  {bike.msrpPence && <> · {formatGbpWhole(bike.msrpPence)} new</>}
                </div>
              </div>
              {cloning === bike.slug
                ? <Loader2 size={17} className="animate-spin text-contact shrink-0" />
                : <ArrowRight size={17} className="text-ink-muted shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-muted mt-8">
        Can&apos;t find your bike? The catalogue is still growing. Most gravel bikes here
        (Canyon Grizl, Cannondale Topstone/Synapse, Trek Checkpoint) have a verified factory
        frame but not yet a full stock build — pick one to start from the right frame, then
        fill in the rest yourself. A handful of mountain bikes have complete demo builds.
      </p>
    </div>
  );
}
