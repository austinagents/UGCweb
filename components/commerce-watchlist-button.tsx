"use client";

import { useEffect, useState } from "react";
import { COMMERCE_WATCHLIST_EVENT, type CommerceWatchlistItem, readCommerceWatchlist, toggleCommerceWatchlist } from "@/lib/commerce-watchlist";

export function CommerceWatchlistButton({ item }: { item: CommerceWatchlistItem }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function sync() {
      setSaved(readCommerceWatchlist().some((savedItem) => savedItem.kind === item.kind && savedItem.id === item.id));
    }
    sync();
    window.addEventListener(COMMERCE_WATCHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMMERCE_WATCHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id, item.kind]);

  return (
    <button className={`commerceWatchlistTag${saved ? " saved" : ""}`} type="button" aria-pressed={saved} aria-label={`${saved ? "Remove" : "Add"} ${item.name} ${saved ? "from" : "to"} watchlist`} title={saved ? "Remove from Watchlist" : "Add to Watchlist"} onClick={() => setSaved(toggleCommerceWatchlist(item))}>
      <WatchlistGlyph />
    </button>
  );
}

function WatchlistGlyph() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path d="M5 2.5h6A1.5 1.5 0 0 1 12.5 4v9L8 10.5 3.5 13V4A1.5 1.5 0 0 1 5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
