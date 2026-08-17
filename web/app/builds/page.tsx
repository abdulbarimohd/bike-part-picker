'use client';

// app/builds/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Bike, LogIn, Link2, RefreshCw, ListChecks } from 'lucide-react';
import { api, isLoggedIn } from '../../lib/api-client';
import { GROUPS, GroupKey, CATEGORY_BY_SLUG } from '../../lib/categories';

// The signed-out view's mockup rows are built from the real subsystem
// groups and category labels (lib/categories.ts) rather than invented
// build names or part counts -- the point is to show the *shape* of a
// saved-build list, honestly, not to pretend anyone has saved anything.
const PREVIEW_ROWS: { group: GroupKey; slugs: string[] }[] = [
  { group: 'chassis', slugs: ['frames', 'forks', 'headsets'] },
  { group: 'drive', slugs: ['cranksets', 'cassettes', 'rear-derailleurs'] },
  { group: 'wheel', slugs: ['wheelsets', 'tyres'] },
];

export default function SavedBuildsPage() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Signed out isn't an error state here: the page explains what saving
    // does on this site and offers the login instead of bouncing to a bare
    // /login with no context (see the signed-out branch below).
    if (!isLoggedIn()) {
      setSignedOut(true);
      setLoading(false);
      return;
    }
    api.getMyBuilds()
      .then((result) => { setBuilds(result); setLoading(false); })
      .catch((err: any) => {
        if (err.status === 401) { setSignedOut(true); setLoading(false); }
        else { setError(err.message ?? 'Could not load your builds'); setLoading(false); }
      });
  }, []);

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
      ) : signedOut ? (
        <SignedOut />
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

/**
 * Signed-out /builds. Everything stated here is how the site actually
 * behaves (see src/routes/builds.routes.ts and the claim flow in
 * app/login/page.tsx): a build never needs an account to start, it lives
 * at its own link until it's claimed, and logging in attaches it to you
 * so it shows up here.
 */
function SignedOut() {
  return (
    <div className="grid lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-3 space-y-6">
        <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6">
          <h2 className="font-display text-lg font-bold text-ink mb-1">What saving a build does here</h2>
          <p className="text-sm text-ink-muted mb-5 leading-relaxed">
            You don&apos;t need an account to use the builder or the upgrade finder — this page is
            just where claimed builds are listed once you do log in.
          </p>
          <ul className="space-y-4">
            <Point icon={Link2} title="Signed out, a new build is anonymous">
              Every build lives at its own link (<span className="font-mono text-xs">/builder?build=…</span>).
              Until it&apos;s claimed, that link is the only way back to it — nothing is stored in
              this browser, so lose the link and it&apos;s out of reach.
            </Point>
            <Point icon={LogIn} title="Logging in claims the build you're working on">
              The &ldquo;log in to keep it&rdquo; banner on the builder and upgrade pages attaches your
              current build to your account. From then on it&apos;s listed here and you can pick it
              back up on any device.
            </Point>
            <Point icon={ListChecks} title="From this list you can reopen or delete a build">
              Each saved build opens straight into the builder with its parts and compatibility
              checks intact.
            </Point>
          </ul>
        </div>

        {/* Muted structural preview: real subsystem groups and category
            labels, no build names, no counts. */}
        <div aria-hidden className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted/70 mb-3">
            Example layout — a saved-build list
          </div>
          <div className="grid sm:grid-cols-2 gap-3 opacity-70">
            {PREVIEW_ROWS.map(({ group, slugs }) => (
              <div key={group} className="rounded-xl bg-white border border-black/5 p-3.5">
                <div className="h-2.5 w-2/5 rounded bg-black/10 mb-1.5" />
                <div className="h-2 w-1/4 rounded bg-black/[0.06] mb-3" />
                <div className="flex flex-wrap gap-1.5">
                  {slugs.map((slug) => (
                    <span
                      key={slug}
                      className="chip text-[10px]"
                      style={{ background: GROUPS[group].soft, color: GROUPS[group].accent }}
                    >
                      {CATEGORY_BY_SLUG[slug]?.label ?? slug}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 lg:sticky lg:top-24">
        <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6">
          <h2 className="font-display text-xl font-bold text-ink mb-1">Log in to see your builds</h2>
          <p className="text-sm text-ink-muted mb-5">
            Or register — it&apos;s an email and a password (a name is optional), and it&apos;s only
            needed for keeping builds between visits.
          </p>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium rounded-lg py-2.5 hover:bg-ink-soft transition-colors"
          >
            <LogIn size={15} /> Log in or register
          </Link>
          <div className="mt-4 pt-4 border-t border-black/5 text-sm text-ink-muted flex items-start gap-2">
            <RefreshCw size={14} className="shrink-0 mt-0.5 text-ink-muted/60" />
            <span>
              Mid-build already? Go back to it and use the &ldquo;log in to keep it&rdquo; banner
              there — that logs you in <em>and</em> claims the build in one go, so nothing is lost.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Point({ icon: Icon, title, children }: { icon: typeof LogIn; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-8 h-8 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{title}</div>
        <p className="text-sm text-ink-muted leading-relaxed mt-0.5">{children}</p>
      </div>
    </li>
  );
}
