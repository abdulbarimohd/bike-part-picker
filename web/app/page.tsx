import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Wrench, SlidersHorizontal, AlertTriangle, FileCheck2, EyeOff,
  Check, Info, ListPlus, Eye, ShoppingCart, PoundSterling,
} from 'lucide-react';
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site';

// `absolute` opts out of the root layout's "%s — Build My Bike" template:
// SITE_TITLE already leads with the site name, so the template would
// double it up.
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

// `tone` gives each concept its own subsystem-tinted icon tile (01.3):
// full literal class strings so Tailwind's scanner sees them. The hues
// aren't decoration — each maps to the idea it sits next to: wheel-green
// for "safe/checked", drive-orange for "adapter fixes it" (the hue
// BuilderMatrix uses for exactly those warnings), cockpit-blue for the
// rules engine's advisory voice, brake-red for hard failure.
const PITCH = [
  { Icon: ShieldCheck, tone: 'bg-wheel-soft text-wheel-text ring-wheel-ring', title: 'True lockout', body: "Parts that can't physically fit are removed from the list, not flagged after the fact." },
  { Icon: Wrench, tone: 'bg-drive-soft text-drive-text ring-drive-ring', title: 'Adapters, not dead ends', body: 'Anything an adapter or spacer solves stays selectable, with the exact part named.' },
  { Icon: SlidersHorizontal, tone: 'bg-cockpit-soft text-cockpit-text ring-cockpit-ring', title: '103 rules', body: 'From bottom bracket shells to hookless rim pressure limits, across 27 categories.' },
];

const HERO_CHECKS = [
  'Checks BB86, T47, UDH and proprietary shell/hanger standards',
  'Checks tyre clearance, chainline, axle spacing and freehub bodies',
  'Locks out only what’s physically impossible — everything else stays selectable',
];

// Real rule IDs, real message-writing style, straight out of
// src/compatibility/engine.ts (R-FH-01, R-BRK-03, R-MNT-05) -- not a
// mockup dressed up to look real. This is what the actual build page
// shows, styled with the exact same classes as BuilderMatrix's
// warning cards, so what you see here is what you get there.
const EXAMPLE_WARNINGS = [
  {
    severity: 'critical' as const,
    id: 'R-FH-01',
    title: 'Freehub body mismatch',
    message: "SRAM XG-1275 Cassette needs an XD freehub, but DT Swiss 350 Hub has Shimano HG. The cassette won't engage the splines.",
  },
  {
    severity: 'warning' as const,
    id: 'R-BRK-03',
    title: 'Adapter needed for the rear rotor',
    message: 'A 180mm rotor on a native 160mm mount needs a +20mm adapter. This is a normal, cheap part — the combination is legal.',
    remedy: '+20mm post-mount adapter.',
  },
  {
    severity: 'info' as const,
    id: 'R-MNT-05',
    title: 'No rack or fender eyelets',
    message: 'This frame has no eyelets, so racks and full fenders need clamp-on mounts.',
  },
];

const SEVERITY_STYLE = {
  critical: { box: 'border-brake-ring bg-brake-soft', head: 'text-brake-text', body: 'text-brake-text', Icon: AlertTriangle, label: 'Blocked' },
  // `warn-*`, not `drive-*`: in drive-orange, the warning tier read as the
  // same hue as the H1's gold, collapsing the red/amber/blue status coding.
  // (BuilderMatrix still uses drive-* for its warning cards — adopting
  // `warn` there is a separate change.)
  warning: { box: 'border-warn-ring bg-warn-soft', head: 'text-warn-text', body: 'text-warn-text', Icon: AlertTriangle, label: 'Stays selectable' },
  info: { box: 'border-cockpit-ring bg-cockpit-soft', head: 'text-cockpit-text', body: 'text-cockpit-text', Icon: Info, label: 'Advisory only' },
} as const;

const STEPS = [
  { Icon: ListPlus, title: 'Pick a frame first', body: 'Every other category narrows immediately to what genuinely fits it — no need to already know the standards.' },
  { Icon: Eye, title: 'See the real verdict', body: 'Critical issues never appear as options. Warnings stay selectable with the exact fix named. Nothing is a guess.' },
  { Icon: ShoppingCart, title: 'Build with confidence', body: 'A finished build is one that’s already been checked — not one you find out about after it arrives.' },
];

const WHY = [
  {
    Icon: AlertTriangle,
    tone: 'bg-brake-soft text-brake-text ring-brake-ring',
    title: 'Standards that aren’t',
    body: 'A "148mm rear axle" varies by brand. A "92mm bottom bracket" is actually four separate, incompatible shells. None of this fails loudly — a part just doesn’t fit, and you find out after it’s unwrapped and half the seatpost is in the frame.',
  },
  {
    Icon: FileCheck2,
    tone: 'bg-wheel-soft text-wheel-text ring-wheel-ring',
    title: 'Three outcomes, not a maybe',
    body: 'Critical rules remove a part outright — it never even appears as an option. Warnings keep it selectable and name exactly what it needs, because "needs a £12 spacer" and "cannot work" are not the same problem. Info notes are just worth knowing, never blocking.',
  },
  {
    Icon: EyeOff,
    tone: 'bg-cockpit-soft text-cockpit-text ring-cockpit-ring',
    title: 'Nothing silently guessed',
    body: 'Every part carries a label: read from a manufacturer’s own spec sheet, estimated from a documented standard, or not yet verified. An unconfirmed spec says so — and the engine treats "unknown" as a reason to stay quiet, never as a reason to assume.',
  },
];

export default function HomePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-6">
      {/* Hero */}
      <section className="pt-14 pb-12">
        {/* bg-ink (not the light chassis-soft the rest of the chips use)
            to match the header exactly — this is the one homepage element
            that's actually a doorway into the site (the 103-rule
            reference), so it reads as a distinct, clickable control rather
            than a decorative stat. text-white for AA contrast on ink
            (chassis-gold text only manages 3.67:1 there). */}
        <Link
          href="/compatibility/rules"
          className="chip bg-ink text-white ring-1 ring-white/15 hover:bg-ink-soft transition-colors mb-4"
        >
          27 categories · 103 compatibility rules
          <ArrowRight size={12} className="text-white/50" />
        </Link>
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-ink max-w-5xl leading-[1.05]">
          Build a bike that
          <span className="text-chassis"> actually bolts together</span>.
        </h1>
        <p className="text-lg text-ink-muted mt-5 max-w-2xl leading-relaxed">
          Pick a frame and every other list narrows to what genuinely fits it — shell standards,
          axle spacing, freehub bodies, shock eye-to-eye, the lot.
        </p>

        <ul className="mt-6 space-y-2 max-w-xl">
          {HERO_CHECKS.map((text) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-ink">
              <span className="w-5 h-5 rounded-full bg-wheel-soft text-wheel flex items-center justify-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </span>
              {text}
            </li>
          ))}
        </ul>

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
          {/* Not another internal tool -- /buy is honest about sending
              you to an affiliate partner (Ribble) rather than pretending
              this site sells bikes. Same secondary-button weight as
              "I already own a bike" since it's an equal third path off
              the hero, not a lesser afterthought. */}
          <Link
            href="/buy"
            className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-5 py-3 border border-black/10 hover:border-black/25 transition-colors"
          >
            Buy a complete bike <ArrowRight size={16} className="text-wheel" />
          </Link>
        </div>
      </section>

      {/* See it in action -- real rule IDs and message copy, styled
          identically to BuilderMatrix's actual warning cards. Proof,
          not a claim: this is what the build page really shows. */}
      <section className="mb-16">
        <h2 className="font-display text-2xl font-bold text-ink mb-1">See it in action</h2>
        <p className="text-sm text-ink-muted mb-6 max-w-2xl">
          Three real rules from the engine, exactly as they appear on a real build — not a mockup.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {EXAMPLE_WARNINGS.map((w) => {
            const s = SEVERITY_STYLE[w.severity];
            return (
              <div key={w.id} className={`rounded-xl border px-4 py-3.5 shadow-card ${s.box}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`chip bg-white/60 ${s.head}`}>{s.label}</span>
                  <span className="ml-auto text-[10px] font-mono opacity-50">{w.id}</span>
                </div>
                <div className={`text-sm font-semibold flex items-center gap-2 ${s.head}`}>
                  <s.Icon size={15} className="shrink-0" /> {w.title}
                </div>
                <div className={`text-sm mt-1.5 leading-relaxed ${s.body}`}>{w.message}</div>
                {'remedy' in w && w.remedy && (
                  <div className={`text-sm mt-2 flex items-center gap-1.5 font-medium ${s.head}`}>
                    <Wrench size={13} /> {w.remedy}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="font-display text-2xl font-bold text-ink mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(({ Icon, title, body }, i) => (
            <div key={title}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center font-display font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <Icon size={18} className="text-chassis" />
              </div>
              <h3 className="font-display font-semibold text-ink mb-1">{title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pitch -- per-concept tinted icon tiles (see PITCH's `tone` note)
          instead of a bare 20px chassis-gold glyph, so the row carries
          the same visual weight as the hero above it. */}
      <section className="grid md:grid-cols-3 gap-4 mb-14">
        {PITCH.map(({ Icon, tone, title, body }) => (
          <div key={title} className="rounded-xl bg-white border border-black/5 p-5 shadow-card">
            <div className={`w-11 h-11 rounded-xl ring-1 flex items-center justify-center mb-3 ${tone}`}>
              <Icon size={22} />
            </div>
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
          {WHY.map(({ Icon, tone, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className={`w-11 h-11 rounded-xl ring-1 flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-ink mb-1">{title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA -- dark, matching the header, so the page ends on
          the same visual weight it opened with rather than trailing
          off after a text-heavy section. */}
      <section className="mb-16 rounded-2xl bg-ink px-8 py-10 md:py-12 text-center">
        <PoundSterling size={22} className="text-chassis mx-auto mb-3" />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 text-balance">
          A wrong bottom bracket is a return you didn&apos;t need to make.
        </h2>
        <p className="text-slate-300 mb-7 max-w-lg mx-auto">
          Checking a build here costs nothing and takes minutes. Ordering the wrong part costs
          the part, the postage, and the wait for a replacement.
        </p>
        {/* Both entry paths, matching the hero pair (08.5) -- the
            secondary is a quiet outline so the card still reads as one
            primary action. */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 bg-white text-ink text-sm font-medium rounded-xl px-5 py-3 hover:bg-slate-100 transition-colors"
          >
            Start a build <ArrowRight size={16} />
          </Link>
          <Link
            href="/my-bike"
            className="inline-flex items-center gap-2 text-white/90 text-sm font-medium rounded-xl px-5 py-3 border border-white/25 hover:border-white/50 hover:text-white transition-colors"
          >
            I already own a bike <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
