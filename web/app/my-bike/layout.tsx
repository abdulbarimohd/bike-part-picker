// app/my-bike/layout.tsx
//
// The My Bike landing page is a client component (search box, debounced
// API calls), so its metadata lives in this server layout instead. It
// also wraps /my-bike/[buildId], whose own layout overrides `robots` to
// noindex -- that child is one user's build, this landing is the public
// entry point and stays indexable.

import type { Metadata } from 'next';
import { TITLE_TEMPLATE } from '../../lib/site';

export const metadata: Metadata = {
  // { default, template } rather than a bare string so the child layout's
  // "Your bike" title still gets the site suffix -- see TITLE_TEMPLATE.
  title: { default: 'Upgrade the bike you already own', template: TITLE_TEMPLATE },
  description:
    'Find your bike model, see the parts it shipped with, and check which upgrades actually fit ' +
    'before you buy — every swap runs through 103 compatibility rules.',
  alternates: { canonical: '/my-bike' },
};

export default function MyBikeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
