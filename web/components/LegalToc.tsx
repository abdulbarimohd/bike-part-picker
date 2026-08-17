// components/LegalToc.tsx
//
// Anchor-linked "On this page" table of contents, shared by the Privacy
// and Terms pages (05.7). Server component — plain fragment links, no
// client JS, not sticky. Each target <section> must carry the matching
// `id` plus a scroll-mt (the header is sticky, h-14) so a jumped-to
// heading isn't hidden underneath it.

import { List } from 'lucide-react';

export interface LegalTocItem {
  id: string;
  label: string;
}

export default function LegalToc({ items }: { items: LegalTocItem[] }) {
  return (
    <nav
      aria-label="On this page"
      className="rounded-xl bg-white border border-black/5 shadow-card px-5 py-4 mb-10"
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold text-ink-muted mb-2.5">
        <List size={13} /> On this page
      </div>
      {/* Each link is a padded block (not bare inline text) so rows of
          them are comfortable tap targets on a phone; the negative margin
          keeps the visual text alignment flush with the card's edge. */}
      <ol className="flex flex-wrap gap-x-1 gap-y-0.5 -mx-2">
        {items.map(({ id, label }) => (
          <li key={id}>
            <a href={`#${id}`} className="inline-block px-2 py-1.5 rounded-lg text-sm text-chassis hover:underline hover:bg-black/[0.03]">
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
