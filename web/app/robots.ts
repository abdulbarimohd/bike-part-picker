// app/robots.ts
//
// Served at /robots.txt by the Next file convention. Everything is
// crawlable except the per-user / per-build surfaces:
//
// - /pick/       the picker lives at /pick/<buildId>/<slot>: transactional,
//                keyed on a build id, meaningless out of context.
// - /my-bike/    /my-bike/<buildId> is one user's upgrade view of one build.
//                The trailing slash is deliberate -- it matches the child
//                routes only, NOT the /my-bike landing page, which is a
//                real content page (find your bike, see what fits) and
//                stays crawlable. Same reason /builder is not listed: the
//                ?build= query on it is collapsed by its canonical instead.
// - /builds      the signed-in user's saved builds.
// - /login       account page.
//
// The matching layouts also carry robots noindex, so a crawler that
// reaches one of these via a link still gets the same answer.

import type { MetadataRoute } from 'next';
import { SITE_URL, absUrl } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/pick/', '/my-bike/', '/builds', '/login'] }],
    sitemap: absUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
