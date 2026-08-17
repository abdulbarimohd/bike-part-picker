// app/about/page.tsx
import Link from 'next/link';
import { ShieldCheck, Wrench, EyeOff, Mail } from 'lucide-react';
import PartIcon from '../../components/PartIcon';
import { ProvenanceChip } from '../../components/ProvenanceBadge';

export const metadata = {
  title: 'About — Bike PartPicker',
  description: 'Why Bike PartPicker exists and how the compatibility engine works.',
};

// The page's one visual (01.4): a "spec sheet" card assembled from the
// catalogue's own line-art PartIcons plus real standards as chips, and
// the real provenance chips beneath. Every value below is a genuine enum
// label from lib/categories.ts and is checked by a named engine rule
// (R-BB-01/02 shells & spindles, R-FH-01 freehubs, R-HGR-01 hangers,
// R-BRK-* mounts, the R-AXL-* axle rules) -- not illustrative filler.
// Colours are the subsystem accents the rest of the site uses for these
// categories (chassis / drive / wheel / brake).
const SPEC_ROWS = [
  { slug: 'frames', label: 'Frames', tone: 'text-chassis', chips: ['BB86', 'T47 68', 'Boost 148×12', 'UDH'] },
  { slug: 'bottom-brackets', label: 'Bottom brackets', tone: 'text-drive', chips: ['PF92', 'BSA 73', 'DUB 29', 'Hollowtech II 24'] },
  { slug: 'wheelsets', label: 'Wheelsets', tone: 'text-wheel', chips: ['SRAM XD', 'Shimano Micro Spline', 'Shimano HG 11', 'Centerlock'] },
  { slug: 'brake-calipers', label: 'Brake calipers', tone: 'text-brake', chips: ['Flat Mount', 'Post Mount 160', 'Post Mount 180'] },
];

// Page-level H2 vs in-card sub-heading (02.5): the page H2 is 24px bold
// with generous top margin, matching the homepage; anything inside a
// card is a small uppercase eyebrow so the two can't be confused.
const H2 = 'font-display text-2xl font-bold text-ink mt-12 mb-4';
const EYEBROW = 'text-xs text-ink-muted uppercase tracking-wide font-semibold';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-ink mb-4">About Bike PartPicker</h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        Bike PartPicker is a compatibility-checked build tool for bikes, built in the UK. Pick a
        frame and every other part list narrows to what genuinely fits it — no guessing whether a
        148mm rear axle, a 92mm bottom bracket, or a UDH derailleur hanger actually works with the
        rest of your build.
      </p>

      {/* Spec-sheet visual (01.4) */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-5 md:p-6">
        <div className={`${EYEBROW} mb-4`}>A few of the standards it tells apart</div>
        <ul className="space-y-3">
          {SPEC_ROWS.map(({ slug, label, tone, chips }) => (
            <li key={slug} className="flex items-start gap-3">
              <span className={`w-9 h-9 rounded-lg bg-white border border-black/10 flex items-center justify-center shrink-0 ${tone}`}>
                <PartIcon slug={slug} className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink leading-9">{label}</div>
                <div className="flex flex-wrap gap-1.5 -mt-1.5">
                  {chips.map((c) => (
                    <span key={c} className="chip bg-misc-soft text-ink ring-1 ring-misc-ring font-mono text-[11px]">{c}</span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-4 border-t border-black/5">
          <div className={`${EYEBROW} mb-2`}>Every part carries one of these</div>
          <div className="flex flex-wrap gap-1.5">
            <ProvenanceChip source="MANUFACTURER_SPEC" />
            <ProvenanceChip source="RETAILER_LISTING" />
            <ProvenanceChip source="ESTIMATED" />
            <ProvenanceChip source="UNVERIFIED" />
          </div>
        </div>
      </div>

      <h2 className={H2}>How it works</h2>
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 md:p-8">
        <div className="space-y-5">
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              <strong className="text-ink font-medium">103 compatibility rules</strong> check every
              part against every other part in your build — bottom bracket shells, axle standards,
              freehub bodies, tyre clearance, brake mounts, and more. Parts that physically cannot
              fit are removed from the list entirely, not just flagged.
            </p>
          </div>
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
              <Wrench size={16} />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Where a part needs an adapter or spacer rather than being a genuine mismatch, it stays
              selectable and the exact fix is named. A locked-out part and a part that just needs a
              £12 spacer are not treated as the same problem.
            </p>
          </div>
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
              <EyeOff size={16} />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Every part carries a label showing where its specification came from — a
              manufacturer's own spec sheet, a retailer listing, or not yet independently verified.
              Where a spec genuinely isn't known, the tool says so rather than guessing. This
              project treats fabricated data as a worse failure than an honest gap.
            </p>
          </div>
        </div>
      </div>

      <h2 className={H2}>Where things stand</h2>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">
        Bike PartPicker is an early, actively-developed project, built and maintained by a small UK
        team. The compatibility engine and the core build tool are solid and fully tested. The
        parts catalogue is still growing — real manufacturer data exists for a growing share of
        categories, and we'd rather show an honest gap than an invented spec or price. If something
        looks unfinished, it probably is, and we're working on it.
      </p>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">
        Questions, feedback, or spotted something wrong?
      </p>
      {/* Standard contact pill (06.4) -- same treatment on the Contact
          and Terms pages; still routes via /contact, which holds the
          mailto. */}
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-4 py-2 border border-black/10 hover:border-black/25 transition-colors"
      >
        <Mail size={15} className="text-chassis" /> Email us
      </Link>
    </div>
  );
}
