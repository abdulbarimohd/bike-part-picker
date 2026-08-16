'use client';

// components/DisciplineProvider.tsx
//
// Holds the header switch's current discipline so every page that lists
// parts can react to it changing without a full reload — api-client's
// getParts() already reads the persisted value directly from
// localStorage for the actual request, so this context exists purely to
// (a) drive the switch's own highlighted state and (b) give pages
// something to put in a useEffect dependency array so an open parts list
// refetches the moment the switch changes underneath it.

import { createContext, useContext, useEffect, useState } from 'react';
import { Discipline, getDiscipline, setDiscipline as persistDiscipline } from '../lib/api-client';

interface DisciplineContextValue {
  discipline: Discipline | null;
  setDiscipline: (d: Discipline | null) => void;
}

const DisciplineContext = createContext<DisciplineContextValue>({
  discipline: null,
  setDiscipline: () => {},
});

export function DisciplineProvider({ children }: { children: React.ReactNode }) {
  // Starts null through SSR and the first client render (no
  // localStorage on the server) and syncs right after mount, rather
  // than reading storage during render, which would mismatch the
  // server-rendered markup and trigger a hydration warning.
  const [discipline, setDisciplineState] = useState<Discipline | null>(null);
  useEffect(() => {
    setDisciplineState(getDiscipline());
  }, []);

  function setDiscipline(d: Discipline | null) {
    persistDiscipline(d);
    setDisciplineState(d);
  }

  return (
    <DisciplineContext.Provider value={{ discipline, setDiscipline }}>
      {children}
    </DisciplineContext.Provider>
  );
}

export function useDiscipline() {
  return useContext(DisciplineContext);
}
