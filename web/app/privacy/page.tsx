// app/privacy/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Bike PartPicker',
  description: 'What data Bike PartPicker collects, why, and how to control it.',
};

const SECTION = 'mb-8';
const H2 = 'font-display text-lg font-bold text-ink mb-2.5';
const P = 'text-sm text-ink-muted leading-relaxed mb-3';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-2">Privacy Policy</h1>
      <p className="text-xs text-ink-muted mb-10">Last updated 16 August 2026</p>

      <section className={SECTION}>
        <p className={P}>
          This policy covers Bike PartPicker (bikepartpicker.co.uk and its subdomains). We keep
          this short and specific to what the site actually does — no boilerplate about data
          practices we don't follow.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>What we collect</h2>
        <p className={P}>
          If you create an account: your email address, an optional display name, and a password.
          Your password is hashed before it's stored (bcrypt) — we never store it, or have access
          to it, in plain text.
        </p>
        <p className={P}>
          If you build a bike: the parts you select, saved against your account (or, if you're not
          logged in, saved anonymously against a build ID held only in your browser until you
          choose to log in and claim it). If you use the optional rider-measurement fields (height,
          inseam, weight), those are stored only to run advisory fit checks and are never required.
        </p>
        <p className={P}>
          We don't collect anything beyond this. No payment details are collected or stored by
          us — Bike PartPicker doesn't process payments; any purchase happens on the retailer's own
          site.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Cookies and local storage</h2>
        <p className={P}>
          We don't use cookies. Your login session (a JSON Web Token) and your Road/Gravel/MTB
          filter preference are stored in your browser's local storage — this data stays on your
          device and in our own database; it isn't sent to any third party, and no cross-site
          tracking identifier is set.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Analytics and third parties</h2>
        <p className={P}>
          We don't currently run any analytics, advertising, or tracking scripts on this site. If
          that changes, this policy will be updated first, and any UK-required consent mechanism
          will be added at the same time — not after.
        </p>
        <p className={P}>
          Some links to retailers may be affiliate links, meaning we may earn a commission if you
          make a purchase after clicking one. This never affects the price you pay, and following
          such a link means you're then subject to that retailer's own privacy policy, not ours.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>How we use your data</h2>
        <p className={P}>
          To run your account, save your builds, and show you compatible parts. That's it — we
          don't sell, rent, or share your personal data with third parties, and we don't use it for
          advertising.
        </p>
        <p className={P}>
          If you mark a build "public," its contents (the parts list and build name) become
          viewable by anyone with the link. Your account email is never shown on a public build.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>How long we keep it</h2>
        <p className={P}>
          For as long as your account exists. We don't currently have a self-service "delete my
          account" button — email us (see below) and we'll delete your account and associated data
          directly, normally within a few days.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Your rights</h2>
        <p className={P}>
          Under UK GDPR, you can ask us at any time to see what data we hold on you, correct it, or
          delete it. Email us and we'll action it directly — see the{' '}
          <Link href="/contact" className="text-chassis hover:underline">Contact</Link> page.
        </p>
      </section>

      <section className={SECTION}>
        <h2 className={H2}>Changes to this policy</h2>
        <p className={P}>
          If this policy changes in a way that meaningfully affects what we collect or how we use
          it, we'll update the date at the top of this page.
        </p>
      </section>

      <section>
        <h2 className={H2}>Contact</h2>
        <p className={P}>
          Questions about this policy or your data: see the <Link href="/contact" className="text-chassis hover:underline">Contact</Link> page.
        </p>
      </section>
    </div>
  );
}
