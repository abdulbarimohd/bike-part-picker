// app/not-found.tsx
//
// Site-wide 404. Rendered whenever a server component calls notFound()
// (a part id that isn't in its category table, an unknown rule id, an
// unknown category slug) and for any path with no route at all -- Next
// serves it with a real 404 status, which is what makes the missing-record
// pages honest to crawlers rather than a 200 with "not found" text.
//
// Same container / type scale as app/page.tsx so it reads as part of the
// site, and four ways back in rather than one: home, the two product
// entry points, and the catalogue's biggest category.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/builder', label: 'Start a build' },
  { href: '/parts/frames', label: 'Browse frames' },
  { href: '/compatibility', label: 'Compatibility checker' },
];

export default function NotFound() {
  return (
    <div className="max-w-[1400px] mx-auto px-6">
      <section className="pt-14 pb-12">
        <p className="text-xs text-ink-muted uppercase tracking-wide font-semibold mb-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-ink max-w-3xl leading-[1.05]">
          That page isn&rsquo;t here
        </h1>
        <p className="text-lg text-ink-muted mt-5 max-w-2xl leading-relaxed">
          The link may be out of date, or the part or rule it pointed at is no longer in the catalogue.
        </p>
        <ul className="flex flex-wrap gap-3 mt-8">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-5 py-3 border border-black/10 hover:border-black/25 transition-colors"
              >
                {l.label} <ArrowRight size={16} className="text-contact" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
