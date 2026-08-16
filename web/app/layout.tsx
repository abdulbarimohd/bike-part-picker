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

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto md:ml-0">
              <Link
                href="/builder"
                // Light button against the dark header -- the classic
                // dark-nav/light-CTA pairing gives the primary action
                // real pop instead of blending into the dark bar.
                // Shorter label below sm: so it doesn't crowd the
                // hamburger trigger at a 375px viewport.
                className="text-sm font-medium bg-white text-ink rounded-lg px-3 sm:px-3.5 py-1.5 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">Build</span>
                <span className="hidden sm:inline">Start a build</span>
              </Link>
              <MobileNav />
            </div>
          </div>
        </header>

        <main className="pb-20">{children}</main>

        <footer className="border-t border-black/5 py-8 text-center text-xs text-ink-muted">
          <nav className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mb-3">
            <Link href="/about" className="hover:text-ink transition-colors">About</Link>
            <Link href="/contact" className="hover:text-ink transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          </nav>
          Compatibility data is curated seed data, not a live price feed.
        </footer>
      </DisciplineProvider>
      </body>
    </html>
  );
}
