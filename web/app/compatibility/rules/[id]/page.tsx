'use client';

// app/compatibility/rules/[id]/page.tsx
//
// A single compatibility rule's full entry -- one URL per rule ID, so
// e.g. "R-BB-01" or "bottom bracket shell mismatch" style searches
// have somewhere specific to land, rather than only the index table.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Wrench, ArrowRight } from 'lucide-react';
import { compatibilityApi, RuleEntry, RuleFormDef, RuleSection } from '../../../../lib/compatibility-client';

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-brake-soft text-brake',
  warning: 'bg-drive-soft text-drive',
  info: 'bg-cockpit-soft text-cockpit',
  advisory: 'bg-misc-soft text-misc',
};

const SEVERITY_EXPLAINER: Record<string, string> = {
  critical: 'Physically will not assemble, or is unsafe. This hides the part from the lockout/picker view.',
  warning: 'Assembles, but degraded, needs an extra part, or is unverified. Shown, never hidden.',
  info: "Worth knowing, doesn't affect whether the part can be picked.",
  advisory: 'Shown on the part page as reference; not gated because nothing else in the schema carries a comparable field to check it against.',
};

export default function RuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rule, setRule] = useState<RuleEntry | null | undefined>(undefined);
  const [forms, setForms] = useState<RuleFormDef[]>([]);
  // 07.7: the full catalogue is already fetched for the form legend; keep
  // its sections too so the page can list this rule's siblings (the same
  // section == the same R-XX- prefix / subsystem) as "Related rules".
  const [sections, setSections] = useState<RuleSection[]>([]);

  useEffect(() => {
    setRule(undefined);
    compatibilityApi.getRule(id).then(setRule).catch(() => setRule(null));
    compatibilityApi.getRules()
      .then((d) => { setForms(d.forms); setSections(d.sections); })
      .catch(() => { setForms([]); setSections([]); });
  }, [id]);

  if (rule === undefined) return <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-ink-muted">Loading…</div>;
  if (rule === null) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-ink-muted mb-4">No such rule: {id}</p>
        <Link href="/compatibility/rules" className="text-sm text-chassis hover:underline">Back to the rule reference</Link>
      </div>
    );
  }

  const formKey = rule.form.match(/^([A-F])/)?.[1];
  const formDef = forms.find((f) => f.key === formKey);
  const sevStyle = SEVERITY_STYLE[rule.severity] ?? SEVERITY_STYLE.info;
  const section = sections.find((s) => s.number === rule.sectionNumber) ?? sections.find((s) => s.rules.some((r) => r.id === rule.id));
  const siblings = section ? section.rules.filter((r) => r.id !== rule.id) : [];

  // pb-2 rather than py-8's 32px: <main> already adds pb-20 under every
  // page, and this one is short, so the two stacked into a blank band
  // above the footer (07.7).
  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-2">
      <Link href="/compatibility/rules" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> Rule reference
      </Link>

      <p className="text-xs text-ink-muted mb-1">{rule.sectionTitle}</p>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h1 className="font-display text-xl font-bold text-ink font-mono">{rule.id}</h1>
        <span className={`chip ${sevStyle}`}><ShieldAlert size={11} /> {rule.severity}</span>
      </div>

      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 mb-6">
        <p className="text-ink leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: mdInline(rule.rule) }} />

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Fields checked</div>
            <div className="text-ink" dangerouslySetInnerHTML={{ __html: rule.fields ? mdInline(rule.fields) : '<span class="text-ink-muted/60">not field-based</span>' }} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">Enforced by</div>
            <div className="text-ink font-mono text-xs">
              {rule.implementedBy ? rule.implementedBy.split(' / ').map((fn) => (
                <div key={fn} className="flex items-center gap-1.5"><Wrench size={11} className="text-ink-muted shrink-0" /> {fn}()</div>
              )) : <span className="text-ink-muted/60 font-sans">not resolved</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-black/5 shadow-card p-4 mb-6">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1.5">Severity: {rule.severity}</div>
        <p className="text-sm text-ink-muted leading-relaxed">{SEVERITY_EXPLAINER[rule.severity] ?? SEVERITY_EXPLAINER.info}</p>
        {rule.severityDetail !== rule.severity && (
          <p className="text-sm text-ink-muted leading-relaxed mt-2 pt-2 border-t border-black/5"
             dangerouslySetInnerHTML={{ __html: mdInline(rule.severityDetail.replace(/^\w+\s*—\s*/, '')) }} />
        )}
      </div>

      {formDef && (
        <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1.5">
            Form {formDef.key} — one of six shapes every rule reduces to
          </div>
          <p className="text-sm text-ink" dangerouslySetInnerHTML={{ __html: mdInline(formDef.shape) }} />
          <p className="text-xs text-ink-muted mt-1">e.g. {formDef.example}</p>
        </div>
      )}

      {/* 07.7: sibling rules from the same section / id prefix, so the
          page ends in something to do next rather than a blank band. */}
      {section && siblings.length > 0 && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
              Related rules
              <span className="ml-2 font-sans normal-case tracking-normal font-normal text-ink-muted">{section.title.replace(/^\d+\.\s*/, '')}</span>
            </h2>
            <Link href={`/compatibility/rules#section-${section.number}`} className="text-xs text-chassis hover:underline whitespace-nowrap">
              All {section.rules.length} in this section
            </Link>
          </div>
          <ul className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 overflow-hidden">
            {siblings.map((r) => (
              <li key={r.id}>
                <Link href={`/compatibility/rules/${r.id}`} className="flex items-start sm:items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] transition-colors group">
                  <span className="font-mono text-xs text-chassis shrink-0 sm:w-[4.5rem] pt-0.5 sm:pt-0">{r.id}</span>
                  <span className="flex-1 min-w-0 text-sm text-ink line-clamp-2 sm:line-clamp-1">{r.rule.replace(/[*_`]/g, '')}</span>
                  <span className={`chip shrink-0 ${SEVERITY_STYLE[r.severity] ?? SEVERITY_STYLE.info}`}>{r.severity}</span>
                  <ArrowRight size={13} className="hidden sm:block text-ink-muted/50 group-hover:text-ink-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Minimal inline markdown -- just the subset COMPATIBILITY_RULES.md actually uses (`code`, **bold**, *italic*). */
function mdInline(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
