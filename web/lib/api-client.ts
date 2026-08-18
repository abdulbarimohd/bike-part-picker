// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bikepp_token');
}

export function setToken(token: string) {
  localStorage.setItem('bikepp_token', token);
}

export function clearToken() {
  localStorage.removeItem('bikepp_token');
}

// Cheap client-side check so pages that require login can redirect
// before firing a request that would 401 — doesn't validate the
// token, the API still does that on every request.
export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export type Discipline = 'ROAD' | 'GRAVEL' | 'MTB';
const DISCIPLINE_KEY = 'bikepp_discipline';

// The header switch's global preference, applied to every parts list
// automatically (see getParts below) rather than each call site having
// to remember to pass it — same reasoning as the auth token above.
export function getDiscipline(): Discipline | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DISCIPLINE_KEY) as Discipline | null;
}
export function setDiscipline(d: Discipline | null) {
  if (d) localStorage.setItem(DISCIPLINE_KEY, d);
  else localStorage.removeItem(DISCIPLINE_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error ?? `Request failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CategoryQuery extends Record<string, string | undefined> {
  /** Narrows results server-side using the compatibility engine. */
  compatibleWith?: string;
  /** For paired slots (tyres, rotors) — picks which clearance rule applies. */
  position?: 'front' | 'rear';
  /** '1' returns every candidate annotated with why it doesn't fit,
   *  instead of silently dropping the incompatible ones. */
  explain?: string;
}

export const api = {
  // Auth
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Parts — one generic pair for all 27 categories. The route table
  // on the server is the single source of truth for what exists.
  getCategories: () => request<{ slug: string; filters: string[] }[]>('/parts/categories'),
  // The header's discipline switch is merged in here rather than at each
  // call site — every one of the ~15 places that list parts (builder,
  // picker, category browse pages) gets it automatically. An explicit
  // `discipline` in `query` (none currently pass one) would still win,
  // since it's spread after the default.
  getParts: (slug: string, query?: CategoryQuery) =>
    request<any[]>(`/parts/${slug}${toQuery({ discipline: getDiscipline() ?? undefined, ...query })}`),
  getPart: (slug: string, partId: string) => request<any>(`/parts/${slug}/${partId}`),
  /** "This doesn't fit — what else would I have to change?" */
  getUpgradePath: (slug: string, partId: string, q: { compatibleWith: string; position?: string; exclude?: string }) =>
    request<UpgradePath>(`/parts/${slug}/${partId}/upgrade-path${toQuery(q)}`),

  // Factory bikes. Cloning one produces an ordinary Build, so every
  // existing build/lockout endpoint works on it unchanged.
  searchBikes: (q?: string, offset?: number, limit?: number) =>
    request<{ items: BikeModel[]; total: number }>(
      `/bikes${toQuery({ q, offset: offset ? String(offset) : undefined, limit: limit ? String(limit) : undefined })}`
    ),
  getBike: (slug: string) => request<BikeModel>(`/bikes/${slug}`),
  cloneBike: (slug: string, name?: string) =>
    request<any>(`/bikes/${slug}/clone`, { method: 'POST', body: JSON.stringify({ name }) }),

  // Builds
  createBuild: (name?: string) =>
    request<any>('/builds', { method: 'POST', body: JSON.stringify({ name }) }),
  getMyBuilds: () => request<any[]>('/builds/mine'),
  getBuild: (id: string) => request<any>(`/builds/${id}`),
  updateBuild: (id: string, data: { name?: string; isPublic?: boolean; riderHeightCm?: number | null; riderInseamCm?: number | null; riderWeightKg?: number | null }) =>
    request<any>(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBuild: (id: string) => request<void>(`/builds/${id}`, { method: 'DELETE' }),
  /** Attaches an anonymous (guest) build to the now-logged-in caller. */
  claimBuild: (id: string) => request<any>(`/builds/${id}/claim`, { method: 'POST' }),
  setBuildPart: (buildId: string, partId: string, opts: { quantity?: number; slot?: string } = {}) =>
    request<any>(`/builds/${buildId}/parts/${partId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: opts.quantity ?? 1, slot: opts.slot }),
    }),
  removeBuildPart: (buildId: string, partId: string) =>
    request<void>(`/builds/${buildId}/parts/${partId}`, { method: 'DELETE' }),
  validateBuild: (buildId: string) =>
    request<{ compatible: boolean; warnings: CompatibilityWarning[] }>(`/builds/${buildId}/validate`),

  // Stock alerts
  createStockAlert: (data: { partId: string; vendorId?: string; targetPricePence?: number; notifyOnRestock?: boolean }) =>
    request<any>('/stock-alerts', { method: 'POST', body: JSON.stringify(data) }),
  getMyStockAlerts: () => request<any[]>('/stock-alerts/mine'),
  deleteStockAlert: (id: string) => request<void>(`/stock-alerts/${id}`, { method: 'DELETE' }),
};

export interface BikeModel {
  id: string;
  brand: string;
  model: string;
  year: number;
  variant?: string | null;
  slug: string;
  msrpPence?: number | null;
  discipline?: string | null;
  _count?: { parts: number };
  parts?: { partId: string; slot: string | null; part: any }[];
}

export interface UpgradePathChange {
  slot: string;
  categorySlug: string;
  partId: string;
  brand: string;
  name: string;
  pricePence: number;
  replaces: { brand: string; name: string } | null;
}

export interface UpgradePath {
  fits: boolean;
  blockedBy: { id: string; title: string; message: string }[];
  conflictSlots?: string[];
  resolutions: { changes: UpgradePathChange[]; extraCostPence: number }[];
}

export interface CompatibilityWarning {
  /** Rule ID from COMPATIBILITY_RULES.md, e.g. "R-BRK-03". */
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  components: string[];
  /** Present when the issue is resolvable by buying a small part. */
  remedy?: string;
}

function toQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries).toString()}`;
}
