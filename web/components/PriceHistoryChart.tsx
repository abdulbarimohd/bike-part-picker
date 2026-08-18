'use client';

// components/PriceHistoryChart.tsx
//
// The price-history line chart from the part detail page, split out so
// that page can be a server component. Recharts measures its container
// (ResponsiveContainer) and draws with browser APIs, so it has to run on
// the client; nothing else on the detail page does.
//
// The per-vendor grouping AND the tick-label date formatting live HERE
// rather than in the server page, on purpose. Formatting `recordedAt`
// with the runtime's default locale/timezone on the server and again in
// the browser can produce two different strings for the same instant
// ("8/14/2026" from a US-locale Node process, "14/08/2026" in a UK
// browser; or a different day either side of midnight) -- a hydration
// mismatch. Doing it in one place, with an explicit locale and timezone,
// makes the output deterministic wherever it runs.

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatGbp } from '../lib/money';
// Type-only import: erased at compile time, so this client bundle never
// pulls lib/server-api.ts (which imports 'server-only') into the browser.
import type { PriceRecord } from '../lib/server-api';

// Matches `chassis`/`wheel`/`drive` in tailwind.config.ts.
const CHART_COLORS = ['#A18800', '#059669', '#ea580c'];

/** One line per vendor, points in chronological order. The API returns
 *  prices newest-first, hence the reverse. */
function groupByVendor(prices: PriceRecord[]): Record<string, { date: string; price: number }[]> {
  const byVendor: Record<string, { date: string; price: number }[]> = {};
  for (const price of [...prices].reverse()) {
    (byVendor[price.vendor.name] ??= []).push({
      // UK site, UK dates: en-GB gives "14/08/2026" regardless of the
      // machine's locale; Europe/London pins the calendar day so a
      // record stamped just after midnight UTC doesn't land on a
      // different day server-side vs client-side.
      date: new Date(price.recordedAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }),
      price: price.pricePence / 100,
    });
  }
  return byVendor;
}

export default function PriceHistoryChart({ prices }: { prices: PriceRecord[] }) {
  const byVendor = groupByVendor(prices);
  if (Object.keys(byVendor).length === 0) return null;

  return (
    <div className="h-64 rounded-xl bg-white border border-black/5 shadow-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart>
          <CartesianGrid stroke="rgba(18,20,26,0.06)" vertical={false} />
          <XAxis dataKey="date" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => formatGbp(v * 100)} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid rgba(18,20,26,0.08)', fontSize: 12, boxShadow: '0 8px 24px -12px rgba(18,20,26,0.3)' }}
            formatter={(v) => [formatGbp(Number(v) * 100), '']}
          />
          {Object.entries(byVendor).map(([vendor, points], i) => (
            <Line
              key={vendor}
              data={points}
              dataKey="price"
              name={vendor.replace(/_/g, ' ')}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
