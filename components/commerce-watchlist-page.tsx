"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommerceWatchlistButton } from "@/components/commerce-watchlist-button";
import { COMMERCE_WATCHLIST_EVENT, type CommerceWatchlistItem, type CommerceWatchlistKind, readCommerceWatchlist } from "@/lib/commerce-watchlist";

export function CommerceWatchlistPage() {
  const [items, setItems] = useState<CommerceWatchlistItem[]>([]);
  const [kind, setKind] = useState<CommerceWatchlistKind>("shop");

  useEffect(() => {
    function sync() { setItems(readCommerceWatchlist()); }
    sync();
    window.addEventListener(COMMERCE_WATCHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMMERCE_WATCHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visible = useMemo(() => items.filter((item) => item.kind === kind), [items, kind]);
  const shopCount = items.filter((item) => item.kind === "shop").length;
  const creatorCount = items.length - shopCount;

  return (
    <section className="watchlistScreen">
      <header className="watchlistHeader">
        <div><span className="watchlistEyebrow"><Bookmark size={13} /> Saved commerce</span><h1>Watchlist</h1><p>Shops and creators you want to revisit.</p></div>
        <span className="watchlistTotal">{items.length.toLocaleString()} saved</span>
      </header>
      <div className="watchlistModeRow">
        <div className="entityModeToggle" aria-label="Watchlist type">
          <button className={kind === "shop" ? "active" : ""} type="button" onClick={() => setKind("shop")}>Shops <span>{shopCount}</span></button>
          <button className={kind === "creator" ? "active" : ""} type="button" onClick={() => setKind("creator")}>Creators <span>{creatorCount}</span></button>
        </div>
      </div>
      <div className="tableWrap watchlistTableWrap">
        <table className="terminalTable focusedToolsTable shopScreenerTable watchlistTable">
          <colgroup><col className="shopRankColumn" /><col className="shopNameColumn" /><col className="shopCategoryColumn" /><col className="shopMetricColumn" /><col className="shopNumberColumn" /><col className="shopNumberColumn" /><col className="shopCreatorColumn" /></colgroup>
          <thead><tr><th>Rank</th><th>{kind === "shop" ? "Shop" : "Creator"}</th><th>Category</th><th>Audience</th><th>Units Sold</th><th>Followers</th><th>Watchlist</th></tr></thead>
          <tbody>
            {visible.length ? visible.map((item) => <WatchlistRow item={item} key={`${item.kind}:${item.id}`} />) : <tr className="shopStateRow watchlistEmptyRow"><td colSpan={7}><Bookmark size={18} /><strong>No saved {kind === "shop" ? "shops" : "creators"} yet.</strong><small>Use the bookmark icon in any ranking list to add one.</small></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WatchlistRow({ item }: { item: CommerceWatchlistItem }) {
  return (
    <tr>
      <td className="rank" data-label="Rank">{item.rank}</td>
      <td data-label={item.kind === "shop" ? "Shop" : "Creator"}><a className="toolCell shopCell creatorCell" href={item.href} target="_blank" rel="noreferrer"><span className="shopAvatarFallback" aria-hidden="true">{initials(item.name)}{item.imageUrl ? <img src={item.imageUrl} alt="" width={30} height={30} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}</span><span><strong>{item.name}</strong></span></a></td>
      <td data-label="Category"><span className="categoryCell commerceCategoryCell"><span className="categoryDot" />{item.category}</span></td>
      <td data-label="Audience"><span className="creatorAudience">{item.audience}</span></td>
      <td data-label="Units Sold">{item.unitsSold}</td>
      <td data-label="Followers"><span className="signalCount">{item.followers}</span></td>
      <td data-label="Watchlist"><CommerceWatchlistButton item={item} /></td>
    </tr>
  );
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}
