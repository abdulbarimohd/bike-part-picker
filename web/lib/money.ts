// lib/money.ts
//
// UK pricing. Everything is stored in pence, VAT-inclusive, because
// that's the figure a UK shopper is quoted. Ex-VAT is derived on
// demand rather than stored, so the two can't drift apart.

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const GBP_WHOLE = new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0,
});

/// Shown when a part has no published price. Manufacturer spec sheets carry
/// no RRP, so null is a real and common state — rendering it as "£0.00" would
/// read as free rather than unknown.
export const NO_PRICE = 'Price unknown';

export function formatGbp(pence: number | null | undefined): string {
  if (pence == null) return NO_PRICE;
  return GBP.format(pence / 100);
}

/** Compact form for cards, where pennies are noise. */
export function formatGbpWhole(pence: number | null | undefined): string {
  if (pence == null) return NO_PRICE;
  return GBP_WHOLE.format(pence / 100);
}

/** Strips VAT back out of a VAT-inclusive figure. */
export function exVatPence(pence: number, vatRatePercent = 20): number {
  return Math.round(pence / (1 + vatRatePercent / 100));
}
