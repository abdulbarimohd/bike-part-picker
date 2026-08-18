// app/contact/page.tsx
//
// CONTACT_EMAIL below is a placeholder — swap it for a real, monitored
// inbox before launch. It's referenced here and in privacy/page.tsx.
//
// Deliberately no contact form (07.4): there's no backend endpoint to
// receive one, and a form that posts nowhere would be dishonest. The
// page is a proper landing instead: primary mailto button, an honest
// expectation line (no numeric SLA), a "what to include" list that
// mirrors the provenance system, and a short FAQ answered strictly from
// the About / Privacy / Terms pages.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, FileSearch, ShieldCheck, Tag, Link2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Build My Bike team.',
  alternates: { canonical: '/contact' },
};

const CONTACT_EMAIL = 'hello@buildmybike.co.uk';

// Mirrors the provenance system (components/ProvenanceBadge.tsx): a
// spec is one field on one part, backed by a manufacturer source URL.
const REPORT_CHECKLIST = [
  { label: 'The part', detail: 'Brand and full model name — a link to its page here is ideal.' },
  { label: 'Which field is wrong', detail: 'e.g. "BB shell says PF92, it should be BB86", and what the correct value is.' },
  { label: 'The proof', detail: 'The manufacturer’s own product page or spec PDF that shows the correct value — the same kind of source a part’s provenance label links to.' },
];

const FAQ = [
  {
    Icon: FileSearch,
    q: 'Where do the specs come from?',
    a: 'Every part carries a label showing where its specification came from — a manufacturer’s own spec sheet, a retailer listing, or not yet independently verified. Where a spec genuinely isn’t known, the tool says so rather than guessing.',
  },
  {
    Icon: ShieldCheck,
    q: 'How do I report a wrong spec?',
    a: 'Email us with the three things listed above. A wrong spec is invisible — it quietly hides parts that would have fitted — so these are the reports we most want.',
  },
  {
    Icon: Tag,
    q: 'Do you sell data or run analytics?',
    a: 'No. We don’t use cookies or run any analytics, advertising, or tracking scripts, and we don’t sell, rent, or share your personal data with third parties. The Privacy Policy has the detail.',
  },
  {
    Icon: Link2,
    q: 'Are there affiliate links?',
    a: 'Some links to retailers may be affiliate links — we may earn a commission if you buy after clicking one, at no extra cost to you. It doesn’t influence which parts are shown as compatible; that’s decided by the compatibility engine, not by commission rates.',
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-4">Contact</h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        Spotted a wrong spec, a broken link, or have a question about a build? We'd rather hear
        about it than have you find out the hard way mid-order.
      </p>

      {/* Primary contact card */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 md:p-8">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-ink-muted uppercase tracking-wide font-semibold">Email</div>
            <div className="text-ink font-medium break-all">{CONTACT_EMAIL}</div>
          </div>
        </div>
        <div className="mt-5">
          {/* Standard contact pill (06.4) -- About and Terms use the
              same shape in its outline form; here it's the page's
              primary action so it takes the hero's solid-ink style. */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-xl px-5 py-3 hover:bg-ink-soft transition-colors shadow-card"
          >
            <Mail size={16} /> Email us
          </a>
          <p className="text-sm text-ink-muted leading-relaxed mt-3">
            It's a small project — we read everything and reply as soon as we can.
          </p>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed mt-5 pt-5 border-t border-black/5">
          This includes data requests — to see, correct, or delete the personal data associated
          with your account, email us at the address above and we'll handle it directly. See our{' '}
          <Link href="/privacy" className="text-chassis hover:underline">Privacy Policy</Link> for details.
        </p>
      </div>

      {/* What to include -- mirrors the provenance system */}
      <h2 className="font-display text-2xl font-bold text-ink mt-12 mb-2">Reporting a wrong spec</h2>
      <p className="text-sm text-ink-muted leading-relaxed mb-5">
        Three things let us fix it in one pass rather than a back-and-forth:
      </p>
      <ol className="space-y-3">
        {REPORT_CHECKLIST.map(({ label, detail }, i) => (
          <li key={label} className="flex gap-3.5 rounded-xl bg-white border border-black/5 shadow-card p-4">
            <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
              {i + 1}
            </span>
            <div>
              <div className="font-display font-semibold text-ink text-sm">{label}</div>
              <p className="text-sm text-ink-muted leading-relaxed mt-0.5">{detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* FAQ -- answered from About / Privacy / Terms only */}
      <h2 className="font-display text-2xl font-bold text-ink mt-12 mb-5">Common questions</h2>
      <div className="space-y-6">
        {FAQ.map(({ Icon, q, a }) => (
          <div key={q} className="flex gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
              <Icon size={16} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink mb-1">{q}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{a}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed mt-8">
        The full detail is on the{' '}
        <Link href="/about" className="text-chassis hover:underline">About</Link>,{' '}
        <Link href="/privacy" className="text-chassis hover:underline">Privacy</Link> and{' '}
        <Link href="/terms" className="text-chassis hover:underline">Terms</Link> pages.
      </p>
    </div>
  );
}
