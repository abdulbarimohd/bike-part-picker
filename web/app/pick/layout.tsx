// app/pick/layout.tsx
//
// The picker route is /pick/[buildId]/[slot] and its page is a client
// component (it reads the build, filters candidates and writes the choice
// back). A layout here, at the segment root, covers every buildId/slot
// pair with one metadata export. Per-build transactional page:
// noindex/nofollow, and /pick/ is also disallowed in robots.ts.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose a part',
  robots: { index: false, follow: false },
};

export default function PickLayout({ children }: { children: React.ReactNode }) {
  return children;
}
