// lib/display-name.ts
//
// Manufacturer feeds put the SKU first: "FC-FRC-1W-D2 Force 1 Wide Crankset",
// "RD-FRC-1-A1 Force 1 Rear Derailleur", "11.5018.050.004 SRAM Force AXS ...".
// Rendered as-is in a card's title slot, a listing reads like an exported
// parts database. This splits the leading code off so the human-readable
// model line can lead and the SKU can sit underneath in small type.
//
// It's a *presentation* split only -- the stored `name` is untouched, and
// nothing is invented: if a name doesn't start with something that's
// unambiguously a code, it's returned whole. Rules for "unambiguously a
// code": a single leading token, uppercase letters/digits/hyphens only,
// containing at least one hyphen AND one digit (so "XX SL Eagle" and
// "S-Works" don't split), or a dotted numeric part number with 3+ groups.
// A leading repeat of the brand in the remainder ("SHIMANO CLARIS
// Crankset" under brand Shimano) is dropped since cards show brand
// separately.

export interface DisplayName {
  /** The human-readable model line to lead with. Never empty. */
  title: string;
  /** The leading SKU/code, if one was split off. */
  sku?: string;
}

const HYPHEN_CODE = /^([A-Z0-9]+(?:-[A-Z0-9]+)+)\s+(.+)$/;
const DOTTED_CODE = /^(\d+(?:\.\d+){2,})\s+(.+)$/;

export function splitDisplayName(brand: string | null | undefined, name: string): DisplayName {
  const raw = (name ?? '').trim();
  if (!raw) return { title: brand ?? '' };

  let sku: string | undefined;
  let rest = raw;

  const dotted = raw.match(DOTTED_CODE);
  const hyph = raw.match(HYPHEN_CODE);
  if (dotted) {
    sku = dotted[1];
    rest = dotted[2];
  } else if (hyph && /\d/.test(hyph[1])) {
    sku = hyph[1];
    rest = hyph[2];
  }

  // Drop a leading brand repeat ("SRAM RED AXS ..." under brand SRAM), but
  // only if something is left afterwards -- a name that IS just the brand
  // stays put rather than becoming empty.
  if (brand) {
    const b = brand.trim();
    const re = new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    const stripped = rest.replace(re, '');
    if (stripped && stripped !== rest) rest = stripped;
  }

  rest = rest.trim();
  if (!rest) return { title: raw };
  return sku ? { title: rest, sku } : { title: rest };
}
