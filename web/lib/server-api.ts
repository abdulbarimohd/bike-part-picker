// lib/server-api.ts
//
// Server-side reads from the API for React Server Components,
// generateMetadata, sitemap.ts and route handlers. Deliberately separate
// from lib/api-client.ts: that client is shaped for the browser (it
// injects the localStorage auth token and discipline filter, and passes
// no cache options), whereas everything here is a public GET that should
// be cached by Next's data cache for a fixed window.
//
// Base URL: API_URL is a server-only override for environments where the
// server process cannot reach the API at the browser-facing address --
// inside docker-compose the browser uses http://localhost:4000 but the
// web container has to use http://api:4000. Anywhere API_URL is unset
// (Vercel, local next dev) the public URL is used, same as the browser.
//
// Failure model: a 404 resolves to null so pages can call notFound().
// Anything else (network error, 5xx) throws -- callers that must degrade
// gracefully (the sitemap, a showcase section) catch it themselves.

import 'server-only';

const API_BASE = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

/** Cache windows, in seconds. One place so the numbers stay consistent. */
export const REVALIDATE = {
  /** Part detail, category lists, part compatibility: catalogue edits should show within the hour. */
  catalogue: 3600,
  /** The rule reference only changes on deploy. */
  rules: 86400,
  /** Sitemap enumeration. */
  sitemap: 3600,
} as const;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * GET `${API_BASE}${path}`; JSON body on success, null on 404, throws
 * ApiError on any other non-2xx status.
 */
export async function apiGet<T>(path: string, revalidate: number = REVALIDATE.catalogue): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new ApiError(res.status, body?.error ?? `API request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

// ---- Typed convenience wrappers ------------------------------------------
// The shapes mirror what the Express routes return; only the fields the
// server pages/metadata actually read are typed, the rest stays open.

export interface PartCore {
  id: string;
  type: string;
  brand: string;
  name: string;
  imageUrl: string | null;
  basePricePence: number | null;
  weightGrams: number;
  releaseDate: string | null;
  createdAt: string;
  disciplines: string[];
  dataSource: string;
  sourceUrl: string | null;
  dataNotes: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  prices?: PriceRecord[];
}

export interface PriceRecord {
  id: string;
  partId: string;
  vendorId: string;
  pricePence: number;
  currency: string;
  includesVat: boolean;
  vatRatePercent: number | null;
  inStock: boolean;
  productUrl: string | null;
  recordedAt: string;
  vendor: { id: string; name: string; siteUrl: string | null };
}

/** A category-table row: `partId`, the nested `part`, plus that category's spec columns. */
export type PartDetail = { partId: string; part: PartCore } & Record<string, unknown>;

export const getPartDetail = (slug: string, partId: string) =>
  apiGet<PartDetail>(`/parts/${encodeURIComponent(slug)}/${encodeURIComponent(partId)}`);

/** Category list rows (same shape as PartDetail, prices not included). */
export const getPartsList = (slug: string) => apiGet<PartDetail[]>(`/parts/${encodeURIComponent(slug)}`);

export interface SitemapPart {
  slug: string;
  partId: string;
  /** ISO timestamp: max(part.createdAt, part.verifiedAt, newest price.recordedAt). */
  lastModified: string;
}

/** Every (category slug, partId) pair that resolves on /parts/:slug/:partId. */
export const getSitemapParts = () => apiGet<SitemapPart[]>('/parts/sitemap', REVALIDATE.sitemap);

// Compatibility -- same shapes as lib/compatibility-client.ts, re-declared
// here rather than imported so this module has no dependency on the
// browser client file.
export interface RuleFormDef { key: string; shape: string; example: string }
export interface RuleEntry {
  id: string;
  sectionNumber: number;
  sectionTitle: string;
  rule: string;
  form: string;
  fields: string | null;
  severity: string;
  severityDetail: string;
  implementedBy: string | null;
}
export interface RuleSection { number: number; title: string; rules: RuleEntry[] }
export interface RuleCatalogue { totalRules: number; forms: RuleFormDef[]; sections: RuleSection[] }

export const getRuleCatalogue = () => apiGet<RuleCatalogue>('/compatibility/rules', REVALIDATE.rules);
export const getRule = (id: string) => apiGet<RuleEntry>(`/compatibility/rules/${encodeURIComponent(id)}`, REVALIDATE.rules);

export interface CompatRelation {
  direction: 'downstream' | 'upstream';
  categorySlug: string;
  categoryLabel: string;
  position?: 'front' | 'rear';
  totalCandidates: number;
  compatibleCount: number;
  examplesCompatible: { partId: string; brand: string; name: string }[];
  examplesBlocked: { partId: string; brand: string; name: string; reasons: { id: string; title: string }[] }[];
  blockingRules: { id: string; title: string; count: number }[];
}
export interface PartCompatibility {
  part: { partId: string; brand: string; name: string; categorySlug: string; categoryLabel: string };
  relations: CompatRelation[];
  faqs: { question: string; answer: string }[];
}

export const getPartCompatibility = (slug: string, partId: string) =>
  apiGet<PartCompatibility>(`/compatibility/parts/${encodeURIComponent(slug)}/${encodeURIComponent(partId)}`);
