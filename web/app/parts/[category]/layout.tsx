// app/parts/[category]/layout.tsx
//
// The category list page is a client component (filter sidebar, browser
// fetches), so its metadata is generated here from lib/categories.ts --
// the same table the page renders from, so title and description can only
// ever describe a category that really exists. An unknown slug is a real
// 404 via notFound() rather than a "Frames"-shaped page full of nothing.
//
// This layout also wraps the part detail route [id]. Next merges metadata
// per key down the tree, and the detail page (app/parts/[category]/[id])
// sets its own title / description / canonical, so those override what is
// set here; only keys it leaves alone (none it cares about) fall through.
// The one thing that does NOT fall through automatically is the title
// template: a page's title is resolved against the NEAREST layout's
// `title.template`, so this layout must carry TITLE_TEMPLATE itself or
// every part page beneath it loses the " — Build My Bike" suffix (that is
// exactly what happened before this was a { default, template } object).

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORY_BY_SLUG } from '../../../lib/categories';
import { clampDescription, TITLE_TEMPLATE } from '../../../lib/site';

// The root template appends " — Build My Bike" (16 chars); titles should
// land at or under ~60 including it. Short labels ("Frames") take the full
// tail; longer ones ("Derailleur Hangers") drop "specs" so the UK-prices
// hook -- the part of the tail that differentiates the page -- survives.
const TEMPLATE_SUFFIX_LENGTH = ' — Build My Bike'.length;
function categoryTitle(label: string): string {
  const full = `${label} — specs, UK prices & what fits`;
  return full.length + TEMPLATE_SUFFIX_LENGTH <= 60 ? full : `${label} — UK prices & what fits`;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const config = CATEGORY_BY_SLUG[params.category];
  if (!config) notFound();

  const label = config.label;
  return {
    title: { default: categoryTitle(label), template: TITLE_TEMPLATE },
    // "all <plural label>", not "every": labels are plural ("Frames"), and
    // "every frames" is the kind of slip that reads as machine-written.
    // "the rest of your build" rather than "your frame" so the sentence
    // still makes sense on the Frames page itself.
    description: clampDescription(
      `${config.description} Compare all ${label.toLowerCase()} in the catalogue by spec and UK price, ` +
      'and see which fit the rest of your build before you buy.'
    ),
    alternates: { canonical: `/parts/${config.slug}` },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
