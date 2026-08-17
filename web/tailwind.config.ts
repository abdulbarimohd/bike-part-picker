import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        // Set on <html> by next/font in layout.tsx.
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#12141a',
          soft: '#1c1f27',
          muted: '#5b6472',
        },
        // Each subsystem gets a hue, so 27 categories stay navigable.
        //
        // `chassis` is also, separately, the site's default/primary accent
        // -- the logo wordmark, links, hero text and focus rings all use
        // it regardless of category. It used to be indigo (#4f46e5), which
        // reads close enough to violet to be mistaken for PC PartPicker's
        // own brand colour. `contact` (pedals/shoes, and the "I already
        // own a bike" section) had the same problem with its own violet.
        // Fixed both into a gold/brown pair -- distinct from each other
        // (so Frame & Suspension and Contact Points don't collapse into
        // one indistinguishable hue in the category colour-coding) and
        // both nowhere near purple. drive/wheel/brake/cockpit/misc were
        // never purple and are untouched.
        // chassis/contact's `soft`/`ring` are deliberately neutral slate-gray
        // rather than a gold/brown-tinted pale wash -- the badge/chip
        // "ribbon" behind the gold/brown text and icons reads silver, not
        // colour-matched cream. DEFAULT (the actual gold/brown) is what
        // still tells the two subsystems apart. (A dark-charcoal version of
        // this was tried and reverted -- scoped to the header nav bar only,
        // see layout.tsx, not the category badge system.)
        // DEFAULT retuned from amber-700 (#b45309, hue 26° -- read as
        // rust/terracotta) toward true yellow-gold, hue 51°, zero blue.
        // An AA-small-text-safe first pass (#786600) read as dark
        // olive/"poo" rather than gold -- yellow only reads as yellow at
        // real brightness, so #A18800 trades some contrast margin for
        // that (3.48:1 on white: comfortably clears the 3.0 large-text AA
        // floor -- the hero H1 and badge/chip usages -- but sits under
        // 4.5 for the smallest body-size links, e.g. the legal-page TOC).
        // Deliberate tradeoff, not an oversight. Kept clear of `warn`'s
        // yellow (below): warn-text sits at hue 32°, chassis stays past it.
        chassis: { DEFAULT: '#A18800', soft: '#f1f5f9', ring: '#e2e8f0' }, // gold text, silver ribbon
        // `text` variants below are darkened versions of DEFAULT, used only
        // where the colour carries real reading text (the compatibility
        // warning boxes) rather than a badge/icon accent -- DEFAULT reads
        // 2.68-4.28:1 against its own `soft` background, short of the
        // 4.5:1 WCAG AA floor for normal text; `text` clears 4.6:1+
        // against both `soft` and white, same hue, just darker.
        drive: { DEFAULT: '#ea580c', soft: '#fff7ed', ring: '#fed7aa', text: '#c3490a' },
        wheel: { DEFAULT: '#059669', soft: '#ecfdf5', ring: '#a7f3d0', text: '#04815b' },
        brake: { DEFAULT: '#e11d48', soft: '#fff1f2', ring: '#fecdd3', text: '#d71c45' },
        cockpit: { DEFAULT: '#0284c7', soft: '#f0f9ff', ring: '#bae6fd', text: '#0276b3' },
        // `warn` is a STATUS colour, not a subsystem: the "stays
        // selectable, needs an adapter" severity tier. It exists because
        // borrowing drive-orange for warnings made the warning state read
        // as both "Drivetrain" and "essentially the H1's gold" at once.
        // Deliberately true YELLOW (yellow-50/200/500/800), not amber:
        // amber-800 was still visibly the same brown-gold family as the
        // `chassis` brand accent. `text` measures 6.6:1 on `soft`, 6.9:1
        // on white and 5.9:1 on `ring` — clear of the 4.5:1 AA floor.
        // Used by every warning-severity card (homepage demo, Builder,
        // My Bike) so the "what you see here is what you get there"
        // promise on the homepage holds.
        warn: { DEFAULT: '#eab308', soft: '#fefce8', ring: '#fef08a', text: '#854d0e' },
        // Unified with `chassis` on request -- a separate distinct hue
        // for contact (rust brown, then copper-red) read as one accent
        // colour too many across the site. Same value as chassis now;
        // kept as its own token rather than merged/removed since call
        // sites still reference `contact` by name.
        contact: { DEFAULT: '#A18800', soft: '#f1f5f9', ring: '#e2e8f0' }, // gold text, silver ribbon
        misc: { DEFAULT: '#475569', soft: '#f8fafc', ring: '#cbd5e1' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,20,26,0.04), 0 8px 24px -12px rgba(18,20,26,0.18)',
        lift: '0 2px 4px rgba(18,20,26,0.06), 0 16px 40px -16px rgba(18,20,26,0.28)',
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(18,20,26,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,20,26,0.045) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
