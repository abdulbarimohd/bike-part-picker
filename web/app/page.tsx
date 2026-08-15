import Link from 'next/link';
import { ArrowRight, ShieldCheck, Wrench, SlidersHorizontal, AlertTriangle, FileCheck2, EyeOff } from 'lucide-react';

const PITCH = [
  { Icon: ShieldCheck, title: 'True lockout', body: "Parts that can't physically fit are removed from the list, not flagged after the fact." },
  { Icon: Wrench, title: 'Adapters, not dead ends', body: 'Anything an adapter or spacer solves stays selectable, with the exact part named.' },
  { Icon: SlidersHorizontal, title: '103 rules', body: 'From bottom bracket shells to hookless rim pressure limits, across 27 categories.' },
];

const WHY = [
  {
    Icon: AlertTriangle,
    title: 'Standards that aren’t',
    body: 'A "148mm rear axle" varies by brand. A "92mm bottom bracket" is actually four separate, incompatible shells. None of this fails loudly — a part just doesn’t fit, and you find out after it’s unwrapped and half the seatpost is in the frame.',
  },
  {
    Icon: FileCheck2,
    title: 'Three outcomes, not a maybe',
    body: 'Critical rules remove a part outright — it never even appears as an option. Warnings keep it selectable and name exactly what it needs, because "needs a £12 spacer" and "cannot work" are not the same problem. Info notes are just worth knowing, never blocking.',
  },
  {
    Icon: EyeOff,
    title: 'Nothing silently guessed',
    body: 'Every part carries a label: read from a manufacturer’s own spec sheet, estimated from a documented standard, or not yet verified. An unconfirmed spec says so — and the engine treats "unknown" as a reason to stay quiet, never as a reason to assume.',
  },
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <section className="pt-14 pb-12">
        <span className="chip bg-chassis-soft text-chassis ring-1 ring-chassis-ring mb-4">
          27 categories · 103 compatibility rules
        </span>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-ink max-w-3xl leading-[1.05]">
          Build a bike that
          <span className="text-chassis"> actually bolts together</span>.
        </h1>
        <p className="text-lg text-ink-muted mt-5 max-w-2xl leading-relaxed">
          Pick a frame and every other list narrows to what genuinely fits it — shell standards,
          axle spacing, freehub bodies, shock eye-to-eye, the lot.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-xl px-5 py-3 hover:bg-ink-soft transition-colors shadow-card"
          >
            Start a build <ArrowRight size={16} />
          </Link>
          <Link
            href="/my-bike"
            className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-5 py-3 border border-black/10 hover:border-black/25 transition-colors"
          >
            I already own a bike <ArrowRight size={16} className="text-contact" />
          </Link>
        </div>
      </section>

      {/* Pitch */}
      <section className="grid md:grid-cols-3 gap-4 mb-14">
        {PITCH.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-xl bg-white border border-black/5 p-5 shadow-card">
            <Icon size={20} className="text-chassis mb-3" />
            <h3 className="font-display font-semibold text-ink mb-1">{title}</h3>
            <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* About -- same card language as the pitch tiles above, just one
          large card instead of three small ones, so this section doesn't
          read as bare text floating on the page background. */}
      <section className="mb-16 rounded-2xl bg-white border border-black/5 shadow-card p-8 md:p-10">
        <h2 className="font-display text-2xl font-bold text-ink mb-8">Why this exists</h2>
        <div className="space-y-8 max-w-3xl">
          {WHY.map(({ Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="w-9 h-9 rounded-lg bg-chassis-soft text-chassis flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-ink mb-1">{title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
