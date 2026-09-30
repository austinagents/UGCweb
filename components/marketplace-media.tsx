"use client";

import { ImageOff, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MarketplaceImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div className={`marketplaceMediaFallback ${className}`} role="img" aria-label={`${alt} image unavailable`}>
        <ImageOff size={24} />
        <span>Image unavailable</span>
      </div>
    );
  }

  return <img ref={imageRef} className={className} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function MarketplaceVideo({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current?.error) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div className="marketplaceVideoFallback">
        <VideoOff size={22} />
        <span>Video unavailable</span>
      </div>
    );
  }

  return <video ref={videoRef} controls playsInline preload="metadata" src={src} aria-label={title} onError={() => setFailed(true)} />;
}
