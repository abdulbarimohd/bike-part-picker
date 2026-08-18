// lib/site.ts
//
// One place for the site's public identity: the canonical origin every
// absolute URL (canonical tags, Open Graph, sitemap, JSON-LD) is built
// from, and the name/strapline the <title> template and social cards
// use. Server-safe and client-safe: no browser APIs, no fetch.
//
// SITE_URL comes from NEXT_PUBLIC_SITE_URL when set (a custom domain
// later, or a preview host) and falls back to the live Vercel domain.
// It is NOT derived from VERCEL_URL on purpose: that var is the
// per-deployment *.vercel.app hostname, so canonicals and the sitemap
// would point at a throwaway deployment URL instead of the real site.

export const SITE_NAME = 'Build My Bike';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://build-my-bike.vercel.app').replace(/\/+$/, '');

/** Default <title> when a page sets none, and the home page's title. */
export const SITE_TITLE = 'Build My Bike — check bike parts fit before you buy';

/**
 * The <title> template every page's short title is dropped into.
 *
 * Declared once here because it has to be RE-DECLARED by any intermediate
 * layout that sets its own title: Next resolves a segment's title against
 * the nearest ancestor's `title.template`, and a layout that sets a plain
 * string title has no template of its own, which silently strips the site
 * suffix from every page beneath it (a part page under the category
 * layout came out as just "Specialized Epic 8 Expert Frameset"). Such
 * layouts must use `title: { default: ..., template: TITLE_TEMPLATE }`.
 */
export const TITLE_TEMPLATE = '%s — Build My Bike';

/** Site-wide description; individual pages override with something specific. Kept under ~160 chars. */
export const SITE_DESCRIPTION =
  'Build a bike or upgrade the one you own with parts that actually fit. ' +
  '27 categories, 103 compatibility rules, UK prices — every clash flagged before you buy.';

/** Absolute URL for a site-relative path. `absUrl('/parts/frames')`. */
export function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Trims free text to a length that fits a meta description without
 * cutting a word in half; appends an ellipsis only when something was
 * dropped. Google shows roughly 155-160 characters.
 */
export function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length).replace(/[,;:\-–—]$/, '')}…`;
}
