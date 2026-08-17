'use client';

// app/compatibility/page.tsx
//
// Hub for the compatibility content surface: the rule-by-rule
// reference, and entry points into per-part "what fits X" pages
// (app/compatibility/[category]/[id]/page.tsx). Every part linked
// below is a real catalogue row fetched from the API, not a mocked
// example -- this page is itself generated content, same as the
// pages it links to.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Wrench, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api-client';
import { CATEGORIES, CATEGORY_BY_SLUG, accentFor, formatSpecValue } from '../../lib/categories';

// 04.9: the showcase tiles used to be icon-on-top with two short text
// lines under it, which at 375px left most of the tile empty. Same
// data, tighter layout: icon beside the text, plus the frame's first
// few real catalogue specs (the same fields the /parts/frames listing
// previews) so the tile earns its height with something checkable
// rather than padding. Nothing here is invented -- every chip is a
// field off the fetched row, formatted the same way the catalogue does.
const FRAME_SPEC_PREVIEW = CATEGORY_BY_SLUG.frames.specs.slice(0, 3);

export default function CompatibilityHubPage() {
  const [frames, setFrames] = useState<any[]>([]);

  useEffect(() => {
    api.getParts('frames').then((rows) => setFrames(rows.slice(0, 6))).catch(() => setFrames([]));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight mb-2">Compatibility</h1>
      <p className="text-sm text-ink-muted max-w-2xl mb-8">
        Bike PartPicker's compatibility engine implements 103 rules covering every part-to-part
        constraint on a modern bike. This section makes that reasoning browsable on its own —
        a rule-by-rule reference, and a "what fits this?" breakdown for any part in the catalogue,
        both computed live from the same engine that gates the builder.
      </p>

      <Link
        href="/compatibility/rules"
        className="flex items-center gap-4 rounded-2xl bg-white border border-black/5 shadow-card p-5 mb-8 hover:shadow-lift transition-shadow"
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-chassis-soft text-chassis shrink-0">
          <BookOpen size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-ink">Rule-by-rule reference</div>
          <div className="text-sm text-ink-muted">All 103 rules, grouped by subsystem, with severity and which engine function enforces each one.</div>
        </div>
        <ArrowRight size={18} className="text-ink-muted shrink-0" />
      </Link>

      {frames.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">
            What fits these frames?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {frames.map((p) => {
              const { accent, soft } = accentFor('frames');
              const specs = FRAME_SPEC_PREVIEW.filter((s) => p[s.key] != null);
              return (
                <Link
                  key={p.part.id}
                  href={`/compatibility/frames/${p.part.id}`}
                  className="accent-tile shadow-card flex flex-col"
                  style={{ ['--accent' as string]: accent }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: soft, color: accent }}>
                      <Wrench size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{p.part.brand}</div>
                      <div className="text-sm font-medium text-ink leading-snug">{p.part.name}</div>
                    </div>
                    <ArrowRight size={14} className="text-ink-muted/60 shrink-0 mt-1" />
                  </div>
                  {specs.length > 0 && (
                    // mt-auto: in a grid row the tiles stretch to the tallest,
                    // so the chip row sits on the tile's baseline rather than
                    // leaving a blank band under it when the name is shorter.
                    <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                      {specs.map((s) => (
                        <span key={s.key} className="chip bg-black/[0.04] text-ink-muted" title={s.label}>
                          {formatSpecValue(p[s.key], s.suffix)}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">
        Or browse a category and pick a part
      </h2>
      <p className="text-xs text-ink-muted mb-3">
        Every part detail page links to its own compatibility breakdown — browse the catalogue below to find one.
      </p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/parts/${c.slug}`} className="chip bg-black/[0.04] text-ink hover:bg-black/[0.08] transition-colors">
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
