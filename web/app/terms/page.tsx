// app/terms/page.tsx
import Link from 'next/link';
import { Mail } from 'lucide-react';
import LegalToc from '../../components/LegalToc';

export const metadata = {
  title: 'Terms of Service — Build My Bike',
  description: 'The terms for using Build My Bike.',
};

// Same treatment as privacy/page.tsx (02.2): 20px display H2 over 14px
// body, full mb-10 between sections; scroll-mt clears the sticky header
// for TOC anchor jumps.
const SECTION = 'mb-10 scroll-mt-20';
const H2 = 'font-display text-xl font-bold text-ink mb-3';
const P = 'text-sm text-ink-muted leading-relaxed mb-3';

const TOC = [
  { id: 'what', label: 'What this is' },
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'content', label: 'Your builds and content' },
  { id: 'affiliate', label: 'Affiliate links' },
  { id: 'availability', label: 'Availability' },
  { id: 'liability', label: 'Liability' },
  { id: 'changes', label: 'Changes' },
  { id: 'law', label: 'Governing law' },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-2">Terms of Service</h1>
      <p className="text-xs text-ink-muted mb-10">Last updated 16 August 2026</p>

      <section className="mb-8">
        <p className={P}>
          By using Build My Bike, you agree to these terms. If you don't agree, please don't use
          the site. We've tried to keep this readable rather than exhaustive — if something's
          unclear, ask us.
        </p>
        {/* Same pill as About's "Get in touch" and the Contact page (06.4);
            still points at /contact, which holds the mailto. */}
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-4 py-2 border border-black/10 hover:border-black/25 transition-colors"
        >
          <Mail size={15} className="text-chassis" /> Email us
        </Link>
      </section>

      <LegalToc items={TOC} />

      <section id="what" className={SECTION}>
        <h2 className={H2}>What this is</h2>
        <p className={P}>
          Build My Bike is a compatibility-checking tool for bike parts. It is not a retailer:
          we don't sell parts, process payments, or hold stock. Where the site links to a retailer,
          any purchase is a transaction between you and that retailer, governed by their own terms —
          not ours.
        </p>
      </section>

      <section id="accuracy" className={SECTION}>
        <h2 className={H2}>Accuracy — please read this one</h2>
        <p className={P}>
          We take data accuracy seriously: every part on this site carries a label showing where
          its specification came from (a manufacturer's own spec sheet, a retailer listing, or not
          yet independently verified), and the compatibility engine is built to stay silent rather
          than guess when a spec isn't known.
        </p>
        <p className={P}>
          Even so, this is a tool to narrow down what's likely to fit — not a substitute for
          checking with the manufacturer or retailer before you buy, especially for anything marked
          "Estimated" or "Unverified." We do not guarantee that any part shown as compatible will
          fit your specific bike, and we're not liable for a purchase that turns out not to fit.
        </p>
      </section>

      <section id="accounts" className={SECTION}>
        <h2 className={H2}>Accounts</h2>
        <p className={P}>
          You need an account to save a build permanently, though you can use the builder and browse
          the site without one. You're responsible for keeping your password secure and for
          activity on your account. Give us accurate information when you register. You must be at
          least 16 years old to create an account.
        </p>
      </section>

      <section id="content" className={SECTION}>
        <h2 className={H2}>Your builds and content</h2>
        <p className={P}>
          Builds you create are yours. If you mark a build "public," you're giving anyone with the
          link permission to view it — you can make it private again at any time. Don't use the
          site to upload or submit anything unlawful, abusive, or that infringes someone else's
          rights.
        </p>
      </section>

      <section id="affiliate" className={SECTION}>
        <h2 className={H2}>Affiliate links</h2>
        <p className={P}>
          Some links to retailers may be affiliate links — we may earn a commission if you buy
          something after clicking one, at no extra cost to you. This doesn't influence which parts
          are shown as compatible; that's decided entirely by the compatibility engine, not by
          commission rates.
        </p>
      </section>

      <section id="availability" className={SECTION}>
        <h2 className={H2}>Availability</h2>
        <p className={P}>
          We aim to keep the site running reliably but don't guarantee uninterrupted availability.
          We may change, suspend, or discontinue features, and may suspend or terminate an account
          that misuses the service.
        </p>
      </section>

      <section id="liability" className={SECTION}>
        <h2 className={H2}>Liability</h2>
        <p className={P}>
          The site is provided "as is." To the extent permitted by law, we're not liable for
          indirect or consequential losses arising from your use of the site, including a part
          that doesn't fit as expected or an issue with a third-party retailer. Nothing in these
          terms limits liability where it would be unlawful to do so (for example, for fraud or for
          death or personal injury caused by negligence).
        </p>
      </section>

      <section id="changes" className={SECTION}>
        <h2 className={H2}>Changes</h2>
        <p className={P}>
          We may update these terms from time to time; the date at the top of this page will change
          when we do. Continuing to use the site after a change means you accept the update.
        </p>
      </section>

      <section id="law" className="scroll-mt-20">
        <h2 className={H2}>Governing law</h2>
        <p className={P}>
          These terms are governed by the laws of England and Wales.
        </p>
      </section>
    </div>
  );
}
