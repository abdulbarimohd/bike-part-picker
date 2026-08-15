'use client';

// components/PartsMenu.tsx
//
// One nav item instead of seven. Seven subsystem links across the top
// was a lot of chrome for something you use occasionally, and it only
// ever reached the first category in each group — the other 20 were
// unreachable from the nav at all.
//
// Opens on hover for pointers, on focus for keyboard, and on click for
// touch (where hover doesn't exist). The panel sits flush under the
// trigger with its padding inside, so there's no dead gap to cross with
// the mouse and lose the menu.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_BY_SLUG, GROUPS, GroupKey } from '../lib/categories';
import PartIcon from './PartIcon';

export default function PartsMenu() {
  const [pinned, setPinned] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Click-outside and Escape only matter for the click-pinned case.
  useEffect(() => {
    if (!pinned) return;
    function onDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setPinned(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPinned(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned]);

  const groups = Object.entries(GROUPS) as [GroupKey, typeof GROUPS[GroupKey]][];

  return (
    <div ref={wrapper} className="relative group" onMouseLeave={() => setPinned(false)}>
      <button
        onClick={() => setPinned((p) => !p)}
        aria-expanded={pinned}
        // Matches the dark header bar this trigger always renders inside
        // (see app/layout.tsx) -- the dropdown panel below stays light,
        // only the trigger itself needs to read against the dark bar.
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        Parts
        <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
      </button>

      {/* Anchored to the viewport, not the trigger. Anchoring to the
          button pushed a panel this wide off one edge or the other
          depending on window width; centring under the header always
          fits, and the width clamp handles narrow screens. `top-14`
          matches the header height. */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 top-14 pt-2 z-50 ${
          pinned ? 'block' : 'hidden group-hover:block group-focus-within:block'
        }`}
      >
        <div className="w-[min(640px,calc(100vw-2rem))] rounded-xl border border-black/5 bg-white shadow-lift p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
          {groups.map(([key, group]) => (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.accent }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {group.label}
                </span>
              </div>
              <ul>
                {group.slugs.map((slug) => {
                  const cat = CATEGORY_BY_SLUG[slug];
                  if (!cat) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/parts/${slug}`}
                        onClick={() => setPinned(false)}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-ink hover:bg-black/[0.04] transition-colors"
                      >
                        <PartIcon slug={slug} className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
