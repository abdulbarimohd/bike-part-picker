// components/Logo.tsx
//
// Chain-link mark: two gold plates flanking a silver centre link, on a
// muted drop-shadow layer for depth. Renders at whatever size `className`
// gives it (h-7 w-7 in the header) since it's a plain square viewBox.
//
// The gradient needs a stable id even though only one instance renders
// today -- two Logos on the same page would otherwise fight over
// `#goldPlate` and one would silently render unfilled.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" className={className} role="img" aria-label="Bike PartPicker logo">
      <defs>
        <linearGradient id="bpp-logo-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0D28A" />
          <stop offset="1" stopColor="#A87F16" />
        </linearGradient>
      </defs>
      <g transform="translate(80,80) rotate(-32)">
        <g fill="#5C4433" opacity="0.4">
          <rect x="-62" y="-11" width="52" height="26" rx="13" />
          <rect x="-16" y="-11" width="52" height="26" rx="13" />
          <rect x="30" y="-11" width="52" height="26" rx="13" />
        </g>
        <g fill="url(#bpp-logo-gold)">
          <rect x="-62" y="-15" width="52" height="26" rx="13" />
          <rect x="30" y="-15" width="52" height="26" rx="13" />
        </g>
        <rect x="-16" y="-15" width="52" height="26" rx="13" fill="#9A938A" />
        <g fill="#4A3728">
          <circle cx="-49" cy="-2" r="7.5" />
          <circle cx="-3" cy="-2" r="7.5" />
          <circle cx="43" cy="-2" r="7.5" />
          <circle cx="69" cy="-2" r="7.5" />
        </g>
        <g fill="#8A8578">
          <circle cx="-49" cy="-2" r="3.5" />
          <circle cx="-3" cy="-2" r="3.5" />
          <circle cx="43" cy="-2" r="3.5" />
          <circle cx="69" cy="-2" r="3.5" />
        </g>
      </g>
    </svg>
  );
}
