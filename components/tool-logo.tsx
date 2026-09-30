"use client";

import { useState } from "react";

export function ToolLogo({
  officialSrc,
  src,
  faviconSrc,
  fallback,
  alt = "",
  size = 28
}: {
  officialSrc?: string;
  src?: string;
  faviconSrc?: string;
  fallback: string;
  alt?: string;
  size?: number;
}) {
  const sources = [officialSrc, src, faviconSrc, fallback].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);
  const current = sources[index] ?? fallback;
  const isFallback = current === fallback;

  return (
    <img
      className={`toolLogo ${isFallback ? "fallback" : "official"}`}
      src={current}
      alt={alt}
      width={size}
      height={size}
      onError={() => {
        setIndex((currentIndex) => currentIndex + 1);
      }}
    />
  );
}
