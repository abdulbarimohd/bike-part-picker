'use client';

// app/builder/page.tsx
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BuilderMatrix from '../../components/BuilderMatrix';
import { api } from '../../lib/api-client';

function BuilderPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const existingBuildId = searchParams.get('build');
  const [buildId, setBuildId] = useState<string | null>(existingBuildId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (buildId) return;
    // Login is optional, not a gate: POST /builds works logged out and
    // hands back an anonymous build (see builds.routes.ts). BuilderMatrix
    // shows a non-blocking "log in to save this" prompt for it instead.
    api.createBuild()
      .then((build) => {
        setBuildId(build.id);
        router.replace(`/builder?build=${build.id}`);
      })
      .catch((err: any) => {
        setError(err.message ?? 'Could not start a new build');
      });
  }, [buildId, router]);

  if (error) {
    return <div className="p-6 text-red-600 text-sm">{error}</div>;
  }

  if (!buildId) {
    return <div className="p-6 text-neutral-500 text-sm">Setting up your build…</div>;
  }

  return <BuilderMatrix buildId={buildId} />;
}

// useSearchParams() opts the subtree into client-side rendering, which
// `next build` rejects unless it sits under a Suspense boundary — without
// this the production build fails on prerendering /builder (dev mode is
// more forgiving, so this only shows up at build time).
export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-neutral-500 text-sm">Loading…</div>}>
      <BuilderPageInner />
    </Suspense>
  );
}
