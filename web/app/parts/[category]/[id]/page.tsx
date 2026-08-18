// app/parts/[category]/[id]/page.tsx
//
// Generic across all 27 categories: spec tiles come from lib/categories,
// and every detail route returns the same shape, so vendor pricing and
// the history chart below are category-agnostic.
//
// Server component. The page used to be 'use client' and fetch in the
// browser, which meant crawlers got an empty shell with a generic
// <title>; now the part is read server-side (lib/server-api.ts, cached
// by Next's data cache), the specs/prices/FAQ are in the initial HTML,
// and generateMetadata + JSON-LD describe the part to search engines.
// The only browser-only piece -- the Recharts price chart -- lives in
// components/PriceHistoryChart.tsx as a client leaf.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import JsonLd from '../../../../components/JsonLd';
import PartImage from '../../../../components/PartImage';
import ProvenanceBadge from '../../../../components/ProvenanceBadge';
import type { DataSource } from '../../../../components/ProvenanceBadge';
import PriceHistoryChart from '../../../../components/PriceHistoryChart';
import { getPartDetail, getPartCompatibility } from '../../../../lib/server-api';
import type { PartDetail, PriceRecord } from '../../../../lib/server-api';
import { formatGbp, exVatPence } from '../../../../lib/money';
import { CATEGORY_BY_SLUG, GROUPS, accentFor, formatSpecValue } from '../../../../lib/categories';
import type { SpecField } from '../../../../lib/categories';
import { splitDisplayName } from '../../../../lib/display-name';
import { absUrl, clampDescription } from '../../../../lib/site';

// ISR window. Mirrors REVALIDATE.catalogue in lib/server-api.ts -- Next
// needs a literal here (it reads the export statically), so the number
// is repeated rather than imported.
export const revalidate = 3600;

interface Params { category: string; id: string }

// ------------------------------------------------------------
// Frame spec grouping (audit 05.1). Frames show ~28 spec tiles; flat,
// that's an undifferentiated wall. The grouping lives HERE rather than
// in lib/categories.ts because it's a detail-page presentation concern
// only -- the builder and list pages still read the flat spec list.
// Keys reference the frame entry in lib/categories.ts; a key listed
// there but missing from this map falls into "Other" (nothing is ever
// dropped), and a key here that's absent from the config is skipped.
// ------------------------------------------------------------
const FRAME_SPEC_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Geometry & sizing',
    keys: ['frameSize', 'reachMm', 'stackMm', 'standoverMm', 'chainstayLengthMm', 'riderMinHeightCm', 'riderMaxHeightCm'],
  },
  {
    title: 'Standards & interfaces',
    keys: ['bbShellStandard', 'headsetTaper', 'rearAxleType', 'dropoutType', 'hangerStandard', 'seatpostDiameterMm', 'fdMountType', 'fdPullDirection'],
  },
  {
    title: 'Suspension',
    keys: ['maxForkTravelMm', 'shockEyeToEyeMm', 'shockStrokeMm', 'shockMountType', 'leverageRatio', 'suitableForCoil'],
  },
  {
    title: 'Mounts & clearance',
    keys: ['maxTyreWidthMm', 'mulletApproved', 'maxRotorMmRear', 'maxChainringTeeth', 'iscgStandard', 'bottleMounts', 'hasEyelets'],
  },
];

// The specs buyers actually search a frame page for -- these get
// slightly larger value text than the long tail (audit 05.1).
const FRAME_PROMINENT_KEYS = new Set(['reachMm', 'stackMm', 'maxTyreWidthMm', 'rearAxleType', 'bbShellStandard', 'hangerStandard']);

/** Split `config.specs` into the labelled groups above, appending an
 *  "Other" group for any key the map doesn't know about. */
function groupFrameSpecs(specs: SpecField[]): { title: string; specs: SpecField[] }[] {
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const used = new Set<string>();
  const groups = FRAME_SPEC_GROUPS.map((g) => ({
    title: g.title,
    specs: g.keys.flatMap((k) => {
      const spec = byKey.get(k);
      if (!spec) return [];
      used.add(k);
      return [spec];
    }),
  }));
  const other = specs.filter((s) => !used.has(s.key));
  if (other.length) groups.push({ title: 'Other', specs: other });
  return groups.filter((g) => g.specs.length > 0);
}

// Rule ids look like R-FRK-02 (see src/compatibility/rulesCatalogue.ts).
// The API embeds them parenthetically in FAQ answer sentences; audit 06.1
// wants them out of the prose and shown as chips instead.
const RULE_CODE_RE = /\s*\((R-[A-Z]+-\d+)\)/g;

/** Strip parenthetical rule codes out of an FAQ answer sentence and
 *  return them separately (deduped, in order of appearance). */
function extractRuleCodes(answer: string): { text: string; codes: string[] } {
  const codes: string[] = [];
  const text = answer.replace(RULE_CODE_RE, (_m, code: string) => {
    if (!codes.includes(code)) codes.push(code);
    return '';
  });
  return { text, codes };
}

// ------------------------------------------------------------
// Pricing helpers. Pure, shared by the page body and generateMetadata
// so the "£ from" figure in the meta description, the JSON-LD offer and
// the hero price can never disagree.
// ------------------------------------------------------------

/** Latest row per vendor only -- the rows the "Vendor Prices" list
 *  shows. Keeps the API's row order (newest first). */
function latestPerVendor(prices: PriceRecord[]): PriceRecord[] {
  const latestByVendor = new Map<string, PriceRecord>();
  for (const p of prices) {
    const seen = latestByVendor.get(p.vendorId);
    if (!seen || new Date(p.recordedAt).getTime() > new Date(seen.recordedAt).getTime()) latestByVendor.set(p.vendorId, p);
  }
  return prices.filter((p) => latestByVendor.get(p.vendorId)?.id === p.id);
}

/** The cheapest current listing that is actually in stock, or null.
 *  Math.min() on an empty array returns Infinity, not undefined --
 *  guarding on currentPrices.length (before the inStock filter) missed
 *  the real case: every listing present but out of stock, which
 *  formatGbp would then render as a nonsensical "£∞.00". The guard has
 *  to be on the filtered, in-stock subset, not the unfiltered one. */
function bestInStock(current: PriceRecord[]): PriceRecord | null {
  let best: PriceRecord | null = null;
  for (const p of current) {
    if (p.inStock && (best == null || p.pricePence < best.pricePence)) best = p;
  }
  return best;
}

/** "<Brand> <text>" without doubling the brand when the text already
 *  leads with it. splitDisplayName() strips a leading brand repeat only
 *  when something is left afterwards, so a name that IS just the brand
 *  comes back as the brand -- and raw names ("SRAM RED AXS ..." under
 *  brand SRAM) may lead with it too. Same rule the H1 follows visually:
 *  brand line above, model line below, brand said once. */
function withBrand(brand: string, text: string): string {
  const b = brand.trim();
  if (!b) return text;
  const lower = text.toLowerCase();
  const bl = b.toLowerCase();
  if (lower === bl || lower.startsWith(`${bl} `)) return text;
  return `${b} ${text}`;
}

/** One spec tile. `prominent` bumps the value text a step for the
 *  handful of most-searched frame specs (audit 05.1). */
function SpecTile({ spec, value, prominent = false }: { spec: SpecField; value: unknown; prominent?: boolean }) {
  const formatted = formatSpecValue(value, spec.suffix);
  const unknown = formatted === '—';
  return (
    <div className="rounded-xl bg-white border border-black/5 px-3.5 py-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-0.5">{spec.label}</div>
      <div className={`font-medium ${prominent ? 'text-base' : 'text-sm'} ${unknown ? 'text-ink-muted/50' : 'text-ink'}`}>{formatted}</div>
    </div>
  );
}

// ------------------------------------------------------------
// Metadata
// ------------------------------------------------------------

/** Google shows roughly 155-160 characters; clampDescription's default. */
const DESCRIPTION_MAX = 158;

/**
 * Meta description built only from real data: name, the first few
 * populated spec tiles (same labels/values the page shows), the best
 * in-stock price or RRP, and a fixed call to action.
 *
 * Sentences are kept whole rather than letting the ellipsis fall
 * wherever 158 characters lands: with four specs a frame's description
 * would lose its price mid-word, and the price is the strongest signal
 * in the snippet. So: start with four specs, price and CTA; if that is
 * over length drop the CTA (fixed copy, least informative); if still
 * over, drop trailing specs down to two. clampDescription() stays as
 * the final guard for a very long name plus two long specs.
 */
function buildDescription(part: PartDetail, specs: SpecField[], best: PriceRecord | null): string {
  const { brand, name, basePricePence } = part.part;
  const intro = `${withBrand(brand, name)} specs, UK price and compatibility.`;
  const specBits = specs
    .filter((s) => part[s.key] != null)
    .slice(0, 4)
    .map((s) => `${s.label} ${formatSpecValue(part[s.key], s.suffix)}`);
  const price = best
    ? ` From ${formatGbp(best.pricePence)}.`
    : basePricePence
      ? ` RRP ${formatGbp(basePricePence)}.`
      : '';
  const cta = ' See which parts fit it before you buy.';

  const compose = (n: number, withCta: boolean) =>
    `${intro}${n > 0 ? ` ${specBits.slice(0, n).join(', ')}.` : ''}${price}${withCta ? cta : ''}`;

  const full = compose(specBits.length, true);
  if (full.length <= DESCRIPTION_MAX) return clampDescription(full);
  for (let n = specBits.length; n >= 2; n--) {
    const candidate = compose(n, false);
    if (candidate.length <= DESCRIPTION_MAX) return clampDescription(candidate);
  }
  return clampDescription(compose(Math.min(specBits.length, 2), false));
}

// An unknown category or a missing part calls notFound() here as well as
// in the page (Next supports it in generateMetadata), so the 404 shell
// carries app/not-found.tsx's own metadata ("Page not found", noindex)
// rather than a half-resolved title from this route. The page still owns
// the 404 for the body; this just keeps <head> consistent with it. Note
// there is deliberately no loading.tsx on this route: a Suspense
// boundary above the page flushes a 200 shell before notFound() runs
// and turns real 404s into "soft" ones -- see the not-found handling
// notes in SESSION_LOG.md.

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const config = CATEGORY_BY_SLUG[params.category];
  if (!config) notFound();

  // Same fetch as the page body -- Next dedupes it within the request.
  const part = await getPartDetail(params.category, params.id);
  if (!part) notFound();

  const { brand, name, imageUrl, prices = [] } = part.part;
  const display = splitDisplayName(brand, name);
  const best = bestInStock(latestPerVendor(prices));

  // Model line, not the raw name: "Specialized Epic 8 Expert Frameset"
  // rather than "SRAM FC-FRC-1W-D2 Force 1 Wide Crankset". The root
  // layout's title template appends " — Build My Bike".
  const title = withBrand(brand, display.title);
  const description = buildDescription(part, config.specs, best);
  const canonical = `/parts/${params.category}/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default async function PartDetailPage({ params }: { params: Params }) {
  const { category, id } = params;
  const config = CATEGORY_BY_SLUG[category];
  if (!config) notFound();
  const { accent, soft, group } = accentFor(category);

  // The compatibility FAQ is a nice-to-have addition to the page, not
  // something the rest of the page (price, specs, vendors) should be
  // blocked by -- so a compat failure resolves to null instead of
  // throwing, exactly as the old client fetch swallowed its errors.
  const [part, compat] = await Promise.all([
    getPartDetail(category, id),
    getPartCompatibility(category, id).catch(() => null),
  ]);
  if (!part) notFound();

  const prices = part.part.prices ?? [];
  const currentPrices = latestPerVendor(prices);
  const bestRecord = bestInStock(currentPrices);
  const best = bestRecord?.pricePence ?? null;

  // Manufacturer feeds lead with the SKU ("FC-FRC-1W-D2 Force 1 Wide
  // Crankset"); lead the H1 with the model line and demote the code to a
  // small line underneath (audit 02.1). Presentation only -- the stored
  // name is untouched.
  const display = splitDisplayName(part.part.brand, part.part.name);

  // Frames get labelled spec subsections (audit 05.1); every other
  // category keeps the flat grid.
  const specGroups = category === 'frames' ? groupFrameSpecs(config.specs) : null;

  const canonical = `/parts/${category}/${id}`;
  const fullName = withBrand(part.part.brand, part.part.name);

  // Structured data. Offers come ONLY from evidence we hold: a current
  // in-stock vendor listing gives price + InStock + seller; a bare RRP
  // gives price alone, with NO availability, because we do not know it.
  // Never emit an availability we have no record for -- a wrong
  // "InStock" in a rich result is worse than none.
  //
  // No FAQPage schema here even though the FAQ block renders below: the
  // dedicated /compatibility/[category]/[id] page owns FAQPage for this
  // part, and the same FAQ marked up on two URLs reads as spam.
  const offers = bestRecord
    ? {
        '@type': 'Offer',
        priceCurrency: 'GBP',
        price: (bestRecord.pricePence / 100).toFixed(2),
        availability: 'https://schema.org/InStock',
        ...(bestRecord.productUrl ? { url: bestRecord.productUrl } : {}),
        seller: { '@type': 'Organization', name: bestRecord.vendor.name.replace(/_/g, ' ') },
      }
    : part.part.basePricePence
      ? {
          '@type': 'Offer',
          priceCurrency: 'GBP',
          price: (part.part.basePricePence / 100).toFixed(2),
        }
      : undefined;

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
        { '@type': 'ListItem', position: 2, name: config.label, item: absUrl(`/parts/${category}`) },
        { '@type': 'ListItem', position: 3, name: fullName, item: absUrl(canonical) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: fullName,
      brand: { '@type': 'Brand', name: part.part.brand },
      category: config.label,
      url: absUrl(canonical),
      ...(part.part.imageUrl ? { image: part.part.imageUrl } : {}),
      ...(display.sku ? { sku: display.sku } : {}),
      ...(offers ? { offers } : {}),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" style={{ ['--accent' as string]: accent }}>
      <JsonLd data={jsonLd} />

      <Link href={`/parts/${category}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6">
        <ArrowLeft size={14} /> {config.label}
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-card p-6 mb-6">
        <div className="flex items-start gap-5">
          <PartImage
            slug={category}
            imageUrl={part.part.imageUrl}
            alt={`${part.part.brand} ${part.part.name}`}
            className="w-24 h-24 rounded-2xl"
            iconClassName="w-12 h-12"
            accent={accent}
            soft={soft}
          />
          <div className="min-w-0 flex-1">
            <span className="chip mb-2" style={{ background: soft, color: accent }}>
              {GROUPS[group].label}
            </span>
            <div className="text-sm text-ink-muted">{part.part.brand}</div>
            <h1 className="font-display text-2xl font-bold text-ink leading-tight">{display.title}</h1>
            {display.sku && (
              <div className="font-mono text-xs text-ink-muted mt-0.5">SKU {display.sku}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
              {part.part.weightGrams > 0 && <span>{part.part.weightGrams} g</span>}
              {best != null && (
                <>
                  <span className="font-display font-bold text-lg text-ink">{formatGbp(best)}</span>
                  <span className="text-xs">
                    inc. VAT · {formatGbp(exVatPence(best))} ex. VAT
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Where these specs came from — shown above the specs, because
          it changes how much weight to put on them. */}
      <div className="mb-6">
        <ProvenanceBadge
          source={part.part.dataSource as DataSource}
          sourceUrl={part.part.sourceUrl}
          dataNotes={part.part.dataNotes}
          verifiedAt={part.part.verifiedAt}
        />
      </div>

      {/* Specs */}
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Specifications</h2>
      {specGroups ? (
        <div className="mb-8 space-y-5">
          {specGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">{g.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {g.specs.map((spec) => (
                  <SpecTile key={spec.key} spec={spec} value={part[spec.key]} prominent={FRAME_PROMINENT_KEYS.has(spec.key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {config.specs.map((spec) => (
            <SpecTile key={spec.key} spec={spec} value={part[spec.key]} />
          ))}
        </div>
      )}

      {/* Vendors */}
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Vendor Prices</h2>
      <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 mb-8 overflow-hidden">
        {currentPrices.length === 0 && <div className="px-4 py-4 text-sm text-ink-muted">No vendor prices recorded.</div>}
        {currentPrices.map((p) => (
          <a
            key={p.id}
            href={p.productUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5 text-sm hover:bg-black/[0.02] transition-colors group"
          >
            <span className="flex items-center gap-2 text-ink">
              {p.vendor.name.replace(/_/g, ' ')}
              <ExternalLink size={13} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="flex items-center gap-3">
              {!p.inStock && <span className="chip bg-brake-soft text-brake">Out of stock</span>}
              {p.inStock && p.pricePence === best && <span className="chip bg-wheel-soft text-wheel">Best price</span>}
              <span className="font-display font-bold text-ink">{formatGbp(p.pricePence)}</span>
            </span>
          </a>
        ))}
      </div>

      {/* History -- client leaf; see components/PriceHistoryChart.tsx for
          why the grouping and date formatting happen there. */}
      {prices.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Price History</h2>
          <PriceHistoryChart prices={prices} />
        </>
      )}

      {/* Compatibility FAQ — generated from the real compatibility engine's
          rule output for this exact part against the real catalogue (see
          GET /compatibility/parts/:slug/:partId). A part with too little
          real data to generate anything meaningful just shows nothing here
          rather than padding the page with invented specifics. */}
      {compat && compat.faqs.length > 0 && (
        <>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink mb-3">Compatibility FAQ</h2>
          <div className="rounded-xl bg-white border border-black/5 shadow-card divide-y divide-black/5 overflow-hidden mb-3">
            {compat.faqs.slice(0, 6).map((f) => {
              // Rule codes out of the prose, into chips (audit 06.1). The
              // rule *titles* stay in the sentence; only the parenthetical
              // ids move.
              const { text, codes } = extractRuleCodes(f.answer);
              return (
                <div key={f.question} className="px-4 py-3.5">
                  <div className="text-sm font-semibold text-ink mb-1">{f.question}</div>
                  <div className="text-sm text-ink-muted leading-relaxed">{text}</div>
                  {codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {codes.map((code) => (
                        <span key={code} className="font-mono text-[10px] leading-none px-1.5 py-1 rounded bg-black/[0.04] border border-black/5 text-ink-muted">
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={`/compatibility/${category}/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-chassis hover:underline mb-8"
          >
            See the full compatibility breakdown
          </Link>
        </>
      )}
    </div>
  );
}
