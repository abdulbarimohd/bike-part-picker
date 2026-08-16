'use client';

// components/DisciplineSwitch.tsx
//
// The road/gravel/MTB filter, scoped to the builder page rather than the
// global header -- it lives in the white space next to the "Bike
// Builder" title. Optional, not a required step: nothing is selected by
// default, every parts list shows everything, and clicking the active
// segment again clears it back to that state -- it only ever narrows
// what's shown, never gates the site behind a choice.
//
// The preference itself is still global (DisciplineProvider persists it
// to localStorage), so it keeps applying if the user goes on to browse
// /parts pages or the per-slot picker from here -- only the visible
// toggle is builder-only, not the effect.

import { useDiscipline } from './DisciplineProvider';
import { Discipline } from '../lib/api-client';

const OPTIONS: { value: Discipline; label: string }[] = [
  { value: 'ROAD', label: 'Road' },
  { value: 'GRAVEL', label: 'Gravel' },
  { value: 'MTB', label: 'MTB' },
];

export default function DisciplineSwitch() {
  const { discipline, setDiscipline } = useDiscipline();

  return (
    <div
      // Same size and shape as the original header version -- only the
      // colours changed, from a dark-chrome pairing to the light-card
      // pairing used everywhere else on this page (bg-black/[0.04]
      // pills, ink/ink-muted text -- see BuilderMatrix's own summary
      // tiles for the same tokens).
      className="flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5"
      role="group"
      aria-label="Filter parts by discipline"
    >
      {OPTIONS.map((o) => {
        const active = discipline === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setDiscipline(active ? null : o.value)}
            aria-pressed={active}
            title={active ? `Showing ${o.label} parts only — click to clear` : `Show only ${o.label} parts`}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              active ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-black/[0.06]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
