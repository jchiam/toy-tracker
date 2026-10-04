import { useState } from 'react';

interface CatalogImageProps {
  /** Resolved CDN URL, or null when the image CDN is not configured. */
  src: string | null;
  alt: string;
  className?: string;
}

/** A catalog image that degrades to a placeholder when it has no URL or fails to load. */
export function CatalogImage({ src, alt, className }: CatalogImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const classes = ['br-image', className].filter(Boolean).join(' ');

  if (!src || failedSrc === src) {
    return <span className={`${classes} br-image-placeholder`} role="img" aria-label={alt} />;
  }
  return (
    <img className={classes} src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />
  );
}
