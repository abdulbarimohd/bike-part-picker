// app/buy/page.tsx
//
// This site doesn't sell bikes -- it's a compatibility tool, not a
// retailer, and has no checkout of its own. This page is honest about
// that: it explains what the site actually does, names the one real
// affiliate relationship that exists (Ribble Cycles, via Impact.com --
// see the site-verification tag in app/layout.tsx), and sends the
// visitor there for an actual purchase, clearly labelled as an
// affiliate link (same disclosure already promised on /contact and
// /privacy).
//
// RIBBLE_BIKES_URL is a placeholder: the plain, non-tracked category
// page, not the real Impact.com tracked deep-link (that needs the
// campaign/advertiser IDs from the Impact dashboard, which this session
// doesn't have). Swap it for the real tracked link before relying on
// this for commission -- everything else on the page holds either way.
import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, Wrench, User, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Buy a complete bike',
  description: 'We don’t sell bikes directly — here’s where to buy a complete, ready-to-ride bike instead.',
  alternates: { canonical: '/buy' },
};

const RIBBLE_BIKES_URL = 'https://www.ribblecycles.co.uk/bikes';

const ALTERNATIVES = [
  {
    Icon: Wrench,
    href: '/builder',
    title: 'Build one part by part',
    body: 'Pick a frame and every other category narrows to what genuinely fits it — for when off-the-shelf isn’t quite what you want.',
  },
  {
    Icon: User,
    href: '/my-bike',
    title: 'Check a bike you already own',
    body: 'Load a factory spec and find upgrades that are guaranteed to fit, before you buy them.',
  },
];

export default function BuyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-4">Buy a complete bike</h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        Build My Bike is a compatibility tool, not a bike shop — there’s no checkout here, and we
        don’t stock or sell bikes ourselves. For a complete, ready-to-ride bike, our affiliate
        partner is Ribble Cycles, a UK manufacturer selling road, gravel, electric and hybrid bikes
        direct.
      </p>

      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 md:p-8">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs text-ink-muted uppercase tracking-wide font-semibold">Affiliate partner</div>
            <div className="text-ink font-medium">Ribble Cycles</div>
          </div>
        </div>
        <div className="mt-5">
          <a
            href={RIBBLE_BIKES_URL}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-xl px-5 py-3 hover:bg-ink-soft transition-colors shadow-card"
          >
            Shop Ribble bikes <ExternalLink size={16} />
          </a>
          <p className="text-sm text-ink-muted leading-relaxed mt-3">
            This is an affiliate link — we may earn a commission if you buy after clicking it, at
            no extra cost to you.
          </p>
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold text-ink mt-12 mb-5">Or, if you want to choose every part yourself</h2>
      <div className="space-y-4">
        {ALTERNATIVES.map(({ Icon, href, title, body }) => (
          <Link
            key={href}
            href={href}
            className="flex gap-3.5 rounded-xl bg-white border border-black/5 shadow-card p-4 hover:border-black/15 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
              <Icon size={17} />
            </div>
            <div>
              <div className="font-display font-semibold text-ink text-sm">{title}</div>
              <p className="text-sm text-ink-muted leading-relaxed mt-0.5">{body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
