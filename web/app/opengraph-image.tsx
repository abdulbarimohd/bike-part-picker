// app/opengraph-image.tsx
//
// Site-wide social card, generated at request time by the Next file
// convention (served at /opengraph-image and wired into og:image /
// twitter:image automatically). Pages that want their own card can add a
// sibling opengraph-image.tsx in their segment; until then every share
// falls back to this one.
//
// Visual language matches the header: gunmetal ground (Tailwind `ink`),
// white "BUILD" + light-slate "MYBIKE" wordmark, and the chain-link mark
// from components/Logo.tsx redrawn as three rounded rectangles (gold,
// silver, gold). ImageResponse renders through Satori, which supports a
// CSS subset -- flexbox only (no grid), every element explicitly sized,
// no next/font -- so the mark is flat colour rather than the SVG's
// gradient fill and the type falls back to Satori's bundled sans. The
// numbers in the strapline are the same fixed copy the home page hero
// shows.

import { ImageResponse } from 'next/og';

// Edge runtime: next/og is built for it, and the Node build of the
// renderer fails to prerender this route on Windows (fileURLToPath on a
// non-file:// path inside @vercel/og), which broke `next build` locally
// while working on Vercel's Linux builders. Edge is deterministic on
// both, and Next's standalone/`next start` server runs edge routes in
// its own sandbox, so the Docker image is unaffected.
export const runtime = 'edge';

export const alt = 'Build My Bike — check bike parts fit before you buy';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// From tailwind.config.ts `ink` and components/Logo.tsx.
const INK = '#12141a';
const GOLD = '#d4a537';
const SILVER = '#9a938a';
const SLATE_LIGHT = '#cbd5e1';
const SLATE_MUTED = '#94a3b8';

// One chain plate. Satori needs explicit sizes on everything, so the mark
// is laid out as absolutely-positioned rectangles inside a fixed box
// rather than relying on the SVG's transform/rotate.
function Plate({ left, colour }: { left: number; colour: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: 88,
        height: 44,
        borderRadius: 22,
        backgroundColor: colour,
        display: 'flex',
      }}
    />
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: INK,
          color: '#ffffff',
          padding: '72px 80px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Wordmark row: chain mark then BUILD MYBIKE. The plates overlap
            by 12px like real chain links (each is 88 wide on a 76 pitch). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ position: 'relative', width: 240, height: 44, display: 'flex' }}>
            <Plate left={0} colour={GOLD} />
            <Plate left={76} colour={SILVER} />
            <Plate left={152} colour={GOLD} />
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, letterSpacing: '-1px' }}>
            <span style={{ color: '#ffffff' }}>BUILD</span>
            <span style={{ color: SLATE_LIGHT }}>MYBIKE</span>
          </div>
        </div>

        {/* Strapline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-2px', maxWidth: 1000 }}>
            Check bike parts fit before you buy
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: SLATE_MUTED }}>
            27 categories · 103 compatibility rules · UK prices
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
