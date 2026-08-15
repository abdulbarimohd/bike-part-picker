'use client';

// components/ProvenanceBadge.tsx
//
// Shows where a part's specs came from. This exists because a wrong
// spec is invisible: it hides parts that would have fitted, and nothing
// errors. Making the source visible is the difference between "the tool
// says no" and "the tool says no, based on data nobody has checked".

import { ShieldCheck, ShieldAlert, ShieldQuestion, Database, Users, Store } from 'lucide-react';

export type DataSource =
  | 'MANUFACTURER_SPEC' | 'RETAILER_LISTING' | 'DATA_FEED'
  | 'COMMUNITY' | 'ESTIMATED' | 'UNVERIFIED';

const STYLE: Record<DataSource, { label: string; cls: string; Icon: any; trusted: boolean }> = {
  MANUFACTURER_SPEC: { label: 'Manufacturer spec', cls: 'bg-wheel-soft text-wheel', Icon: ShieldCheck, trusted: true },
  RETAILER_LISTING: { label: 'Retailer listing', cls: 'bg-cockpit-soft text-cockpit', Icon: Store, trusted: true },
  DATA_FEED: { label: 'Data feed', cls: 'bg-cockpit-soft text-cockpit', Icon: Database, trusted: true },
  COMMUNITY: { label: 'Community submitted', cls: 'bg-contact-soft text-contact', Icon: Users, trusted: false },
  ESTIMATED: { label: 'Estimated', cls: 'bg-drive-soft text-drive', Icon: ShieldQuestion, trusted: false },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-brake-soft text-brake', Icon: ShieldAlert, trusted: false },
};

export function ProvenanceChip({ source }: { source?: DataSource | null }) {
  const s = STYLE[source ?? 'UNVERIFIED'] ?? STYLE.UNVERIFIED;
  return (
    <span className={`chip ${s.cls}`}>
      <s.Icon size={11} /> {s.label}
    </span>
  );
}

/** Full panel for the detail page, including the caveats and source link. */
export default function ProvenanceBadge({
  source, sourceUrl, dataNotes, verifiedAt,
}: {
  source?: DataSource | null;
  sourceUrl?: string | null;
  dataNotes?: string | null;
  verifiedAt?: string | null;
}) {
  const key = source ?? 'UNVERIFIED';
  const s = STYLE[key] ?? STYLE.UNVERIFIED;

  return (
    <div className={`rounded-xl border px-4 py-3 ${s.trusted ? 'border-black/5 bg-white' : 'border-drive-ring bg-drive-soft/40'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <ProvenanceChip source={key} />
        {verifiedAt && (
          <span className="text-xs text-ink-muted">
            checked {new Date(verifiedAt).toLocaleDateString('en-GB')}
          </span>
        )}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-chassis hover:underline ml-auto">
            View source
          </a>
        )}
      </div>

      {!s.trusted && (
        <p className="text-xs text-ink-muted mt-2 leading-relaxed">
          {key === 'UNVERIFIED'
            ? 'These specifications have not been checked against the manufacturer. Compatibility results for this part may be wrong — verify before buying.'
            : 'Some figures here are derived rather than published. Treat them as a guide.'}
        </p>
      )}

      {dataNotes && (
        <p className="text-xs text-ink-muted/90 mt-2 leading-relaxed border-t border-black/5 pt-2">
          {dataNotes}
        </p>
      )}
    </div>
  );
}
