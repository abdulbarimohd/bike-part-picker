// app/sitemap.ts
//
// Served at /sitemap.xml by the Next file convention. Four tiers:
//
//   1. Static pages (home, builder, my-bike landing, compatibility hub,
//      rules index, company/legal pages).
//   2. One list page per catalogue category, from lib/categories.ts --
//      the same table the nav and category pages read, so a new category
//      is in the sitemap the moment it exists.
//   3. Every part, twice: its detail page and its "what fits" page. Both
//      come from a single /parts/sitemap call, which the API enumerates
//      through the category delegates so every emitted pair resolves.
//   4. Every rule detail page, from the rule catalogue.
//
// The two API reads are each wrapped in try/catch: if the API is
// unreachable (a docker build with no API up, a Railway blip during ISR)
// the sitemap degrades to tiers 1-2 rather than the whole route 500ing
// and search engines dropping it. Errors are logged so the gap is visible.
//
// changeFrequency / priority are deliberately omitted -- Google ignores
// both, and inventing values would be decoration, not information.
// lastModified is only set where the API gives us a real timestamp.
//
// The per-part compatibility endpoint is NOT called here: it runs the
// engine across every related category per part and would turn one
// sitemap regeneration into thousands of expensive requests.

import type { MetadataRoute } from 'next';
import { absUrl } from '../lib/site';
import { CATEGORIES } from '../lib/categories';
import { getSitemapParts, getRuleCatalogue } from '../lib/server-api';

// A literal rather than REVALIDATE.sitemap: Next statically analyses
// route segment config and rejects an imported expression. Keep it equal
// to REVALIDATE.sitemap in lib/server-api.ts (the fetch-level cache the
// wrappers below already use) so the route and its data expire together.
export const revalidate = 3600;

const STATIC_PATHS = [
  '/',
  '/builder',
  '/my-bike',
  '/compatibility',
  '/compatibility/rules',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) entries.push({ url: absUrl(path) });

  for (const c of CATEGORIES) entries.push({ url: absUrl(`/parts/${c.slug}`) });

  try {
    const parts = (await getSitemapParts()) ?? [];
    for (const p of parts) {
      const lastModified = new Date(p.lastModified);
      const slug = encodeURIComponent(p.slug);
      const partId = encodeURIComponent(p.partId);
      entries.push({ url: absUrl(`/parts/${slug}/${partId}`), lastModified });
      entries.push({ url: absUrl(`/compatibility/${slug}/${partId}`), lastModified });
    }
  } catch (err) {
    console.error('[sitemap] part enumeration failed; emitting static + category entries only', err);
  }

  try {
    const catalogue = await getRuleCatalogue();
    for (const section of catalogue?.sections ?? []) {
      for (const rule of section.rules) {
        entries.push({ url: absUrl(`/compatibility/rules/${encodeURIComponent(rule.id)}`) });
      }
    }
  } catch (err) {
    console.error('[sitemap] rule catalogue fetch failed; rule pages omitted', err);
  }

  return entries;
}
