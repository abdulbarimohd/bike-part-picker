// app/builder/layout.tsx
//
// The builder page is a client component ('use client' -- it holds the
// build in state and talks to the API from the browser), and client
// components cannot export metadata. This server layout exists purely to
// carry the route's metadata; it renders nothing of its own.
//
// Canonical is the bare /builder: the page reopens a saved build via
// ?build=<id>, and every one of those query variants is the same tool
// with different state, so they collapse onto the one canonical rather
// than each becoming an indexable page.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bike Builder — pick parts that fit',
  description:
    'Build a bike part by part. Each frame, fork, drivetrain, wheel and brake choice is checked ' +
    'against 103 compatibility rules as you go, so it all bolts together.',
  alternates: { canonical: '/builder' },
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
