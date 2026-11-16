import { useState } from 'react';

interface Props {
  src: string;
  /** procedural placeholder used until the generated PNG exists */
  fallback: () => string;
  size: number;
  alt: string;
  className?: string;
}

export function PixelImg({ src, fallback, size, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={`pixel ${className ?? ''}`}
      src={failed ? fallback() : src}
      onError={() => setFailed(true)}
      width={size}
      height={size}
      alt={alt}
    />
  );
}
