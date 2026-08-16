// lib/compatibility-client.ts
//
// Fetch client for the new /compatibility/* backend routes (rule
// reference + per-part "what fits this" data). Kept separate from
// lib/api-client.ts rather than added to it -- this task's file
// ownership only covers new files plus one index.ts line and the part
// detail page, so the existing client is used read-only elsewhere and
// left untouched.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error ?? `Request failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface RuleFormDef {
  key: string;
  shape: string;
  example: string;
}

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

export interface RuleSection {
  number: number;
  title: string;
  rules: RuleEntry[];
}

export interface RuleCatalogue {
  totalRules: number;
  forms: RuleFormDef[];
  sections: RuleSection[];
}

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

export const compatibilityApi = {
  getRules: (section?: number) => get<RuleCatalogue>(`/compatibility/rules${section ? `?section=${section}` : ''}`),
  getRule: (id: string) => get<RuleEntry>(`/compatibility/rules/${encodeURIComponent(id)}`),
  getPartCompatibility: (slug: string, partId: string) =>
    get<PartCompatibility>(`/compatibility/parts/${encodeURIComponent(slug)}/${encodeURIComponent(partId)}`),
};
