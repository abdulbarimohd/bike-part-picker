// components/PartIcon.tsx
//
// Original line-art icons, one per category. Drawn here rather than
// using product photography: retailer image CDNs block hotlinking and
// expire, and manufacturer photography isn't ours to redistribute.
// These are schematic — they say "this is a crankset" at a glance,
// which is all a category tile needs.
//
// All strokes use currentColor so the subsystem accent colour flows in.

interface PartIconProps {
  slug: string;
  className?: string;
}

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function paths(slug: string) {
  switch (slug) {
    case 'frames':
      return <><path d="M6 17 11 7l7 .5" {...S} /><path d="M6 17h9l3.2-9.5" {...S} /><path d="M11 7 15 17" {...S} /><circle cx="6" cy="17" r="1.6" {...S} /><circle cx="18" cy="17" r="1.6" {...S} /><path d="M15 17h3" {...S} /></>;
    case 'forks':
      return <><path d="M12 3v6" {...S} /><path d="M12 9 8.5 19M12 9l3.5 10" {...S} /><path d="M7.5 19h2M14.5 19h2" {...S} /><circle cx="12" cy="6" r="0" {...S} /></>;
    case 'headsets':
      return <><ellipse cx="12" cy="7" rx="6" ry="2.4" {...S} /><ellipse cx="12" cy="17" rx="6" ry="2.4" {...S} /><path d="M6 7v10M18 7v10" {...S} /></>;
    case 'rear-shocks':
      return <><circle cx="5" cy="19" r="1.8" {...S} /><circle cx="19" cy="5" r="1.8" {...S} /><path d="M6.3 17.7 9 15" {...S} /><path d="M9 15l1.8 1.8 2-2-1.8-1.8 2-2 1.8 1.8 2-2-1.8-1.8" {...S} /><path d="M15 9l2.7-2.7" {...S} /></>;
    case 'bottom-brackets':
      return <><circle cx="12" cy="12" r="7" {...S} /><circle cx="12" cy="12" r="3" {...S} /><path d="M12 5v2M12 17v2M5 12h2M17 12h2" {...S} /></>;
    case 'cranksets':
      return <><circle cx="9" cy="12" r="5" {...S} /><circle cx="9" cy="12" r="1.6" {...S} /><path d="M9 12l7 5" {...S} /><rect x="15.4" y="16" width="3.4" height="2.6" rx="0.8" {...S} /></>;
    case 'chainrings':
      return <><circle cx="12" cy="12" r="7" {...S} /><circle cx="12" cy="12" r="2.2" {...S} /><path d="M12 5v1.6M12 17.4V19M5 12h1.6M17.4 12H19M7 7l1.1 1.1M15.9 15.9 17 17M17 7l-1.1 1.1M8.1 15.9 7 17" {...S} /></>;
    case 'cassettes':
      return <><path d="M4 8h16M5.5 11h13M7 14h10M8.5 17h7" {...S} /><path d="M12 6.5v12" {...S} /></>;
    case 'chains':
      return <><rect x="3" y="10" width="5.5" height="4" rx="2" {...S} /><rect x="9.2" y="10" width="5.5" height="4" rx="2" {...S} /><rect x="15.4" y="10" width="5.5" height="4" rx="2" {...S} /></>;
    case 'shifters':
      return <><path d="M4 15h7a3 3 0 0 0 3-3V8" {...S} /><path d="M14 8l3-3" {...S} /><circle cx="18" cy="4.5" r="1.5" {...S} /><path d="M4 13v4" {...S} /></>;
    case 'rear-derailleurs':
      return <><path d="M13 4v5" {...S} /><path d="M13 9l-2.5 4" {...S} /><circle cx="9" cy="15" r="2.6" {...S} /><circle cx="14" cy="18" r="2.2" {...S} /><path d="M10.6 13.2 12.6 16.4" {...S} /></>;
    case 'front-derailleurs':
      return <><path d="M7 4v9" {...S} /><rect x="9" y="10" width="8" height="4" rx="1" {...S} /><path d="M7 13h2" {...S} /><path d="M11 14v4M15 14v4" {...S} /></>;
    case 'wheelsets':
      return <><circle cx="12" cy="12" r="8" {...S} /><circle cx="12" cy="12" r="1.6" {...S} /><path d="M12 4v6.4M12 13.6V20M4 12h6.4M13.6 12H20M6.3 6.3l4.5 4.5M13.2 13.2l4.5 4.5M17.7 6.3l-4.5 4.5M10.8 13.2l-4.5 4.5" {...S} /></>;
    case 'tyres':
      return <><circle cx="12" cy="12" r="8.5" {...S} /><circle cx="12" cy="12" r="5.5" {...S} /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" {...S} /></>;
    case 'tubes':
      return <><circle cx="12" cy="13" r="7" {...S} /><circle cx="12" cy="13" r="4" {...S} /><path d="M12 6V2.5" {...S} /><rect x="11" y="2" width="2" height="2" rx="0.5" {...S} /></>;
    case 'brake-calipers':
      return <><path d="M8 5v9a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V5" {...S} /><rect x="9.6" y="7" width="4.8" height="6" rx="1" {...S} /><path d="M8 19h8" {...S} /></>;
    case 'brake-levers':
      return <><path d="M3 9h6" {...S} /><path d="M9 9c4 0 6 1.5 8 4.5" {...S} /><path d="M17 13.5 20 16" {...S} /><rect x="3" y="7" width="2.6" height="4" rx="1" {...S} /></>;
    case 'rotors':
      return <><circle cx="12" cy="12" r="8" {...S} /><circle cx="12" cy="12" r="3" {...S} /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" {...S} /><path d="M6.9 6.9 8.3 8.3M15.7 15.7l1.4 1.4M17.1 6.9l-1.4 1.4M8.3 15.7l-1.4 1.4" {...S} /></>;
    case 'handlebars':
      return <><path d="M3 10v4" {...S} /><path d="M21 10v4" {...S} /><path d="M3 12h4a2 2 0 0 1 2 2v0h6v0a2 2 0 0 1 2-2h4" {...S} /></>;
    case 'stems':
      return <><rect x="4" y="8" width="4" height="8" rx="1.2" {...S} /><rect x="16" y="9.5" width="4" height="5" rx="1.2" {...S} /><path d="M8 12h8" {...S} /></>;
    case 'seatposts':
      return <><rect x="10" y="3" width="4" height="14" rx="2" {...S} /><path d="M8 17h8" {...S} /><path d="M10 8h4" {...S} /><path d="M12 19v2" {...S} /></>;
    case 'seat-clamps':
      return <><circle cx="12" cy="12" r="6" {...S} /><circle cx="12" cy="12" r="3.4" {...S} /><path d="M16.5 8.5 19 6" {...S} /><rect x="18.4" y="4.4" width="3" height="2" rx="0.6" transform="rotate(45 19.9 5.4)" {...S} /></>;
    case 'saddles':
      return <><path d="M3.5 12c4-3.5 12-4 17-1.5-3 3-9.5 4.5-13 3.5" {...S} /><path d="M11 14.5 12 19" {...S} /><path d="M10 19h4" {...S} /></>;
    case 'pedals':
      return <><rect x="4" y="9" width="12" height="6" rx="1.2" {...S} /><path d="M16 12h4" {...S} /><path d="M7 9v6M10.5 9v6M13.5 9v6" {...S} /></>;
    case 'shoes':
      return <><path d="M3 15h11l5 2v2H3z" {...S} /><path d="M3 15V9h4l2 3h5" {...S} /><path d="M6 12h1.5" {...S} /></>;
    case 'chain-guides':
      return <><circle cx="12" cy="13" r="5" {...S} /><path d="M7 8h10" {...S} /><path d="M7 8v3M17 8v3" {...S} /><circle cx="12" cy="13" r="1.6" {...S} /></>;
    case 'derailleur-hangers':
      return <><path d="M9 4h4l2 6-3 9h-2l-2-7z" {...S} /><circle cx="11" cy="7.5" r="1.2" {...S} /><circle cx="11.6" cy="15" r="1.2" {...S} /></>;
    default:
      return <><rect x="4" y="4" width="16" height="16" rx="3" {...S} /><path d="M9 12h6" {...S} /></>;
  }
}

export default function PartIcon({ slug, className = 'w-6 h-6' }: PartIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-hidden="true">
      {paths(slug)}
    </svg>
  );
}
