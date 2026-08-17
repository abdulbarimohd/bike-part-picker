'use client';

// components/DisciplineSwitch.tsx
//
// The road/gravel/MTB filter, scoped to the builder page rather than the
// global header -- it lives in the white space next to the "Bike
// Builder" title. Optional, not a required step: "All" is selected by
// default (no discipline stored), every parts list shows everything, and
// clicking the active discipline again clears it back to that state --
// it only ever narrows what's shown, never gates the site behind a choice.
//
// "All" is a real segment rather than an implied empty state so the
// control always has exactly one visibly-selected option: with nothing
// highlighted, the three discipline pills read as identical, unlabelled
// buttons and there's no cue that this is a filter with a current value.
//
// The preference itself is still global (DisciplineProvider persists it
// to localStorage), so it keeps applying if the user goes on to browse
// /parts pages or the per-slot picker from here -- only the visible
// toggle is builder-only, not the effect.

import { useDiscipline } from './DisciplineProvider';
import { Discipline } from '../lib/api-client';

const OPTIONS: { value: Discipline | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ROAD', label: 'Road' },
  { value: 'GRAVEL', label: 'Gravel' },
  { value: 'MTB', label: 'MTB' },
];

export default function DisciplineSwitch() {
  const { discipline, setDiscipline } = useDiscipline();

  return (
    <div
      // Light-card pairing used everywhere else on this page
      // (bg-black/[0.04] track, ink/ink-muted text -- see BuilderMatrix's
      // own summary tiles for the same tokens). Segments are 24px tall on
      // a mouse (28px track, so it doesn't loom next to the h1), and grow
      // to a 40px-tall segment / 44px track under a coarse pointer so
      // each option is a comfortable touch target -- keyed on
      // pointer:coarse rather than viewport width because a tablet at
      // desktop widths is still a touch screen.
      className="inline-flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5 shrink-0"
      role="group"
      aria-label="Filter parts by discipline"
    >
      {OPTIONS.map((o) => {
        const active = discipline === o.value;
        return (
          <button
            key={o.label}
            type="button"
            // Clicking the active discipline again clears back to All;
            // clicking All while already on All is a no-op.
            onClick={() => setDiscipline(active ? null : o.value)}
            aria-pressed={active}
            title={
              o.value === null
                ? 'Show parts for every discipline'
                : active
                  ? `Showing ${o.label} parts only — click to clear`
                  : `Show only ${o.label} parts`
            }
            className={`px-2.5 py-1 rounded-md text-xs font-medium leading-4 transition-colors whitespace-nowrap [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:px-3 ${
              active
                ? 'bg-ink text-white font-semibold shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-black/[0.06]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
