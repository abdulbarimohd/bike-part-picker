'use client';

// app/login/page.tsx
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setToken } from '../../lib/api-client';

const FIELD =
  'w-full text-sm border border-black/10 rounded-lg px-3 py-2.5 bg-white text-ink ' +
  'focus:outline-none focus:ring-2 focus:ring-chassis/25 focus:border-chassis transition-shadow';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Present when arriving from the builder or upgrade view's "log in
  // to save this" prompt on an anonymous build — see BuilderMatrix.tsx
  // and app/my-bike/[buildId]/page.tsx. Login itself never requires
  // this; it's only here to reattach an in-progress build afterward.
  const pendingBuildId = searchParams.get('build');
  const from = searchParams.get('from');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = mode === 'login' ? await api.login(email, password) : await api.register(email, password, name);
      setToken(result.token);

      if (pendingBuildId) {
        // Best-effort: claiming failing (build already claimed by
        // someone else, deleted, whatever) shouldn't strand the rider
        // on the login screen after a successful login.
        await api.claimBuild(pendingBuildId).catch(() => {});
        router.push(from === 'my-bike' ? `/my-bike/${pendingBuildId}` : `/builder?build=${pendingBuildId}`);
      } else {
        router.push('/builder');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 pt-16">
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          {pendingBuildId
            ? "Logging in saves this build permanently — it works fine without an account too, this just means it survives past this browser."
            : 'Log in to save your builds and pick up where you left off on any device.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input type="text" placeholder="Name" className={FIELD} value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input type="email" placeholder="Email" required className={FIELD} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            className={FIELD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-brake bg-brake-soft border border-brake-ring rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-white text-sm font-medium rounded-lg py-2.5 hover:bg-ink-soft disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          className="text-sm text-ink-muted hover:text-ink mt-4 w-full text-center"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

// useSearchParams() opts the subtree into client-side rendering, which
// `next build` rejects unless it sits under a Suspense boundary --
// same reason app/builder/page.tsx has this wrapper.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-6 pt-16 text-sm text-ink-muted">Loading…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
