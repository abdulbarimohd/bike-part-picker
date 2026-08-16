'use client';

// app/builds/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Plus, Bike } from 'lucide-react';
import { api, isLoggedIn } from '../../lib/api-client';

export default function SavedBuildsPage() {
  const router = useRouter();
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    api.getMyBuilds()
      .then((result) => { setBuilds(result); setLoading(false); })
      .catch((err: any) => {
        if (err.status === 401) router.replace('/login');
        else { setError(err.message ?? 'Could not load your builds'); setLoading(false); }
      });
  }, [router]);

  async function handleDelete(id: string) {
    await api.deleteBuild(id);
    setBuilds((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Your Builds</h1>
        <Link
          href="/builder"
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-ink text-white rounded-lg px-3.5 py-2 hover:bg-ink-soft transition-colors"
        >
          <Plus size={15} /> New build
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-brake bg-brake-soft border border-brake-ring rounded-lg px-4 py-3 max-w-2xl">{error}</p>
      ) : builds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-12 text-center max-w-2xl">
          <Bike size={28} className="mx-auto text-ink-muted/40 mb-3" />
          <p className="text-sm text-ink-muted mb-4">No saved builds yet.</p>
          <Link href="/builder" className="text-sm font-medium text-chassis hover:underline">
            Start your first build →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {builds.map((build) => (
            <div key={build.id} className="rounded-xl bg-white border border-black/5 shadow-card p-4 flex items-center justify-between hover:border-black/15 transition-colors">
              <Link href={`/builder?build=${build.id}`} className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink truncate">{build.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {build.buildParts.length} part{build.buildParts.length === 1 ? '' : 's'}
                  {build.isPublic && <span className="ml-2 chip bg-wheel-soft text-wheel">Public</span>}
                </div>
              </Link>
              <button
                onClick={() => handleDelete(build.id)}
                className="text-ink-muted/50 hover:text-brake p-2 transition-colors shrink-0"
                aria-label={`Delete ${build.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
