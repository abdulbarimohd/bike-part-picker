'use client';

// app/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api-client';

const FIELD =
  'w-full text-sm border border-black/10 rounded-lg px-3 py-2.5 bg-white text-ink ' +
  'focus:outline-none focus:ring-2 focus:ring-chassis/25 focus:border-chassis transition-shadow';

export default function LoginPage() {
  const router = useRouter();
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
      router.push('/builder');
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
          Builds are saved against your account, so you&apos;ll need one before starting.
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
