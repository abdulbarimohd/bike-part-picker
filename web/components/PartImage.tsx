'use client';

// components/PartImage.tsx
//
// Renders a real product photo when the part has one, and falls back
// to the line-art icon when it doesn't — or when the image fails to
// load, which matters more than it sounds: retailer CDNs block
// hotlinking by referrer, expire URLs, and rotate paths. A broken
// image icon in a product grid looks worse than no photo at all.
//
// Deliberately a plain <img> rather than next/image: next/image needs
// every remote host declared in next.config.js at build time, and we
// don't know which CDNs a future affiliate feed will use. The tradeoff
// is no automatic resizing/optimisation — revisit once the hosts are
// known and stable.

import { useState } from 'react';
import PartIcon from './PartIcon';

interface PartImageProps {
  slug: string;
  imageUrl?: string | null;
  alt: string;
  /** Tailwind size classes for the container. */
  className?: string;
  iconClassName?: string;
  accent: string;
  soft: string;
}

export default function PartImage({
  slug, imageUrl, alt, className = 'w-9 h-9', iconClassName = 'w-5 h-5', accent, soft,
}: PartImageProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = !!imageUrl && !failed;

  return (
    <div
      className={`${className} rounded-lg flex items-center justify-center shrink-0 overflow-hidden`}
      style={showPhoto ? { background: '#fff' } : { background: soft, color: accent }}
    >
      {showPhoto ? (
        <img
          src={imageUrl!}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <PartIcon slug={slug} className={iconClassName} />
      )}
    </div>
  );
}
