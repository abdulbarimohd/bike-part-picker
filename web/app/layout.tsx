import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import PartsMenu from '../components/PartsMenu';
import MobileNav from '../components/MobileNav';
import Logo from '../components/Logo';
import { DisciplineProvider } from '../components/DisciplineProvider';

// next/font downloads and self-hosts at build time — no runtime CDN
// request, so nothing breaks if the container has no outbound network.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Bike PartPicker',
  description: 'A compatibility-checked build tool for mountain bikes.',
};

// One footer column: small-caps heading over a stacked list of links.
// Each link is a full-width block so the whole row is the tap target
// rather than a bare inline text run: py-2 on the 20px line box gives
// 36px rows on a mouse, growing to py-3 / 44px rows under a coarse
// pointer (the same comfortable-touch threshold the header controls
// use). Keyed on pointer:coarse rather than viewport width, like
// DisciplineSwitch, because a tablet at desktop widths is still a touch
// screen -- see the note on the <footer> below.
function FooterLinkGroup({ heading, links }: { heading: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink mb-1.5">{heading}</h2>
      <ul className="-ml-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block px-2 py-2 [@media(pointer:coarse)]:py-3 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-black/[0.04] transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans min-h-screen">
        <DisciplineProvider>
        {/* Dark gunmetal header -- scoped deliberately to just the nav bar,
            not the gold/brown category badge system used on the rest of
            the site (tailwind.config.ts's `chassis`/`contact`, which sits
            on light backgrounds everywhere else). */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-normal text-white shrink-0">
              <Logo className="h-6 w-6 shrink-0" />
              {/* "Bike" and the "PartPicker" span must share ONE flex child
                  (this inner span) -- as direct siblings of the outer
                  `flex gap-1.5` Link, that gap utility inserted space
                  between every flex child, including between the two
                  words, which is not what "gap" was meant to control here. */}
              <span>
                Bike<span className="bg-gradient-to-br from-slate-100 to-slate-400 bg-clip-text text-transparent">PartPicker</span>
              </span>
            </Link>

            {/* Collapses into MobileNav's hamburger below md -- see that
                component for why (this row has no room to wrap). */}
            <nav className="hidden md:flex items-center gap-1 text-sm ml-auto">
              <PartsMenu />
              <Link href="/my-bike" className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                My Bike
              </Link>
              <Link href="/builds" className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                My Builds
              </Link>
            </nav>

            {/* gap-2 (was gap-1 below sm) keeps a clear seam between the
                CTA and the hamburger now that both carry 44px hit areas. */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
              <Link
                href="/builder"
                // Light button against the dark header -- the classic
                // dark-nav/light-CTA pairing gives the primary action
                // real pop instead of blending into the dark bar.
                // Shorter label below sm: so it doesn't crowd the
                // hamburger trigger at a 375px viewport.
                // The ::before extends the tap target to 44px tall
                // (32px visual pill + 6px each side) without growing
                // the pill itself; inset-x-0 so it never overlaps the
                // hamburger's own hit area next door.
                className="relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] text-sm font-medium bg-white text-ink rounded-lg px-3 sm:px-3.5 py-1.5 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">Build</span>
                <span className="hidden sm:inline">Start a build</span>
              </Link>
              <MobileNav />
            </div>
          </div>
        </header>

        <main className="pb-20">{children}</main>

        {/* Light footer -- the dark chrome is scoped to the header only
            (see the note above the <header>), so this stays on the same
            light surface as the page body. Brand + three small link
            groups: at lg the brand takes a wider first column with the
            groups beside it; below that the brand spans a full row and
            the groups sit in a 4-up (sm) or 2-up (mobile) grid under
            it, so a 375px footer stays a compact two columns rather
            than a long single stack. Every link is a block with vertical
            padding (36px rows on a mouse, 44px under a coarse pointer --
            see FooterLinkGroup) so the tap targets read like the site's pill
            buttons rather than bare inline text. */}
        <footer className="border-t border-black/5 bg-white/40">
          <div className="max-w-[1400px] mx-auto px-6 pt-8 sm:pt-10 pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-x-6 sm:gap-x-8 gap-y-6 sm:gap-y-8">
              {/* Brand: same mark + wordmark structure as the header --
                  the "PartPicker" gradient just steps from slate-100/400
                  (for the dark bar) to slate-500/800 so it still reads
                  as a two-tone wordmark on this light surface. */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                {/* py-2.5 -my-2.5: 44px tall tap target (like the nav links
                    below it) without shifting the visual baseline. */}
                <Link href="/" className="inline-flex items-center gap-2 py-2.5 -my-2.5 font-display text-base font-extrabold uppercase tracking-normal text-ink">
                  <Logo className="h-6 w-6 shrink-0" />
                  <span>
                    Bike<span className="bg-gradient-to-br from-slate-500 to-slate-800 bg-clip-text text-transparent">PartPicker</span>
                  </span>
                </Link>
                <p className="mt-3 text-sm text-ink-muted leading-relaxed max-w-xs">
                  A compatibility-checked build tool for bikes, built in the UK.
                </p>
              </div>

              <FooterLinkGroup
                heading="Product"
                links={[
                  { href: '/builder', label: 'Start a build' },
                  { href: '/my-bike', label: 'I already own a bike' },
                ]}
              />
              <FooterLinkGroup
                heading="Company"
                links={[
                  { href: '/about', label: 'About' },
                  { href: '/contact', label: 'Contact' },
                ]}
              />
              <FooterLinkGroup
                heading="Legal"
                links={[
                  { href: '/privacy', label: 'Privacy Policy' },
                  { href: '/terms', label: 'Terms of Service' },
                ]}
              />
            </div>

            <div className="mt-8 pt-5 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-ink-muted">
              <p>&copy; 2026 Bike PartPicker</p>
              <p>Compatibility data is curated seed data, not a live price feed.</p>
            </div>
          </div>
        </footer>
      </DisciplineProvider>
      </body>
    </html>
  );
}
