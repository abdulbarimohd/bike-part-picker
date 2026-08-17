'use client';

// components/MobileNav.tsx
//
// Below md, the header row (logo + Parts dropdown + My Bike + My Builds
// + Start a build) doesn't fit — the dropdown/inline nav pattern in
// PartsMenu.tsx assumes room for a full row, and just letting it wrap
// pushed the primary "Start a build" CTA off-screen with an unexpected
// horizontal scroll. This collapses Parts/My Bike/My Builds into a
// hamburger drawer instead, so only the logo, this trigger, and the CTA
// stay in the header row itself.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { CATEGORY_BY_SLUG, GROUPS, GroupKey } from '../lib/categories';
import PartIcon from './PartIcon';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  // The panel is portaled to <body> (below) rather than rendered inline --
  // it's `position: fixed`, and the header it would otherwise nest inside
  // has `backdrop-blur`, which per spec makes the header a containing
  // block for fixed descendants. Nested inline, `top-14 bottom-0` resolves
  // against the header's own ~56px box instead of the viewport, collapsing
  // the panel to zero height. `mounted` guards the portal's `document`
  // access, which doesn't exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const groups = Object.entries(GROUPS) as [GroupKey, typeof GROUPS[GroupKey]][];

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        // p-3 around the 20px icon makes the hit area 44x44 (comfortable
        // touch target) without visual bulk -- the button is transparent
        // until hover. -mr-2 grew alongside the padding so the icon stays
        // optically in the same spot relative to the container edge.
        className="p-3 -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && mounted && createPortal(
        <div id="mobile-nav-panel" className="fixed inset-x-0 top-14 bottom-0 z-50 bg-white overflow-y-auto">
          <nav className="p-4 space-y-0.5">
            <Link href="/my-bike" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-black/[0.04] transition-colors">
              My Bike
            </Link>
            <Link href="/builds" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-black/[0.04] transition-colors">
              My Builds
            </Link>

            <div className="pt-4 mt-3 border-t border-black/5">
              {groups.map(([key, group]) => (
                <div key={key} className="mb-4">
                  <div className="flex items-center gap-1.5 px-3 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.accent }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{group.label}</span>
                  </div>
                  {group.slugs.map((slug) => {
                    const cat = CATEGORY_BY_SLUG[slug];
                    if (!cat) return null;
                    return (
                      <Link
                        key={slug}
                        href={`/parts/${slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-ink hover:bg-black/[0.04] transition-colors"
                      >
                        <PartIcon slug={slug} className="w-4 h-4 shrink-0" />
                        {cat.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>
        </div>,
        document.body
      )}
    </div>
  );
}
