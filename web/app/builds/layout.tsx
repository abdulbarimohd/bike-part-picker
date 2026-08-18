// app/builds/layout.tsx
//
// The saved-builds page is a client component (reads the auth token,
// lists the signed-in user's builds), so its metadata lives here. It is
// an account page: noindex/nofollow, and /builds is also disallowed in
// robots.ts.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Builds',
  robots: { index: false, follow: false },
};

export default function BuildsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
