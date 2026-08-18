// app/my-bike/[buildId]/layout.tsx
//
// /my-bike/<buildId> is one user's upgrade view of one cloned build --
// per-user, transactional, and only reachable via the id. Not for
// indexing, so this overrides the `robots` the parent /my-bike layout
// inherits from the root (index: true) with noindex/nofollow. No
// canonical: there is no public page these ids should collapse onto.
// The page itself is a client component, hence the metadata living here.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your bike',
  robots: { index: false, follow: false },
};

export default function MyBikeBuildLayout({ children }: { children: React.ReactNode }) {
  return children;
}
