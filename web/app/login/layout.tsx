// app/login/layout.tsx
//
// The login page is a client component (form state, token handling), so
// its metadata lives here. Account page: noindex/nofollow, and /login is
// also disallowed in robots.ts.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
