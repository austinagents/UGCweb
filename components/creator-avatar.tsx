"use client";

import { useState } from "react";

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CreatorAvatar({ name, src, size = 38 }: { name: string; src?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="creatorAvatar fallback" style={{ width: size, height: size }}>
        {initialsFor(name)}
      </span>
    );
  }

  return <img className="creatorAvatar" src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />;
}
