// app/about/page.tsx
import Link from 'next/link';
import { ShieldCheck, Wrench, EyeOff } from 'lucide-react';

export const metadata = {
  title: 'About — Bike PartPicker',
  description: 'Why Bike PartPicker exists and how the compatibility engine works.',
};

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

      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 md:p-8 mb-8">
        <h2 className="font-display text-lg font-bold text-ink mb-4">How it works</h2>
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

      <h2 className="font-display text-lg font-bold text-ink mb-3">Where things stand</h2>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">
        Bike PartPicker is an early, actively-developed project, built and maintained by a small UK
        team. The compatibility engine and the core build tool are solid and fully tested. The
        parts catalogue is still growing — real manufacturer data exists for a growing share of
        categories, and we'd rather show an honest gap than an invented spec or price. If something
        looks unfinished, it probably is, and we're working on it.
      </p>
      <p className="text-sm text-ink-muted leading-relaxed">
        Questions, feedback, or spotted something wrong? <Link href="/contact" className="text-chassis hover:underline">Get in touch</Link>.
      </p>
    </div>
  );
}
