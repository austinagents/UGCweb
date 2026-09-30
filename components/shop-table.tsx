"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { displayShopName } from "@/lib/shop-display-name";
import type { TikTokShop, TikTokShopsResponse } from "@/lib/types";

export function ShopTable({ category }: { category: string }) {
  const [shops, setShops] = useState<TikTokShop[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/shops?category=${encodeURIComponent(category)}&page=${page}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as Partial<TikTokShopsResponse>;
        if (!response.ok) throw new Error(data.error ?? "Failed to load shops.");

        setShops(data.shops ?? []);
        setPage(data.page ?? page);
        setPageSize(data.pageSize ?? 100);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setShops([]);
        setTotal(0);
        setTotalPages(1);
        setError(cause instanceof Error ? cause.message : "Failed to load shops.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [category, page]);

  const firstRank = (page - 1) * pageSize;

  return (
    <>
      <div className="tableWrap shopTableWrap" aria-busy={isLoading}>
        <table className="terminalTable focusedToolsTable shopScreenerTable">
          <colgroup>
            <col className="shopRankColumn" />
            <col className="shopNameColumn" />
            <col className="shopCategoryColumn" />
            <col className="shopMetricColumn" />
            <col className="shopMetricColumn" />
            <col className="shopNumberColumn" />
            <col className="shopNumberColumn" />
            <col className="shopCreatorColumn" />
          </colgroup>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Shop</th>
              <th>Category</th>
              <th>7D GMV</th>
              <th>Lifetime GMV</th>
              <th>7D Units</th>
              <th>Products</th>
              <th>Socials</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && shops.length === 0 ? <ShopStateRow>Loading {category} shops…</ShopStateRow> : null}
            {error ? <ShopStateRow error={error}>Unable to load shops.</ShopStateRow> : null}
            {!error && !isLoading && shops.length === 0 ? <ShopStateRow>No shops found for {category}.</ShopStateRow> : null}

            {!error && shops.map((shop, index) => (
              <tr key={shop.seller_id}>
                <td className="rank" data-label="Rank">#{firstRank + index + 1}</td>
                <td data-label="Shop"><ShopIdentity shop={shop} category={shopCategory(shop, category)} /></td>
                <td data-label="Category">
                  <span className="categoryCell commerceCategoryCell"><span className="categoryDot" />{shopCategory(shop, category)}</span>
                </td>
                <td data-label="7D GMV"><strong className="commerceMetric">{formatCurrency(shop.day7_total_gmv)}</strong></td>
                <td data-label="Lifetime GMV">{formatCurrency(shop.total_gmv)}</td>
                <td data-label="7D Units">{formatNumber(shop.day7_units_sold)}</td>
                <td data-label="Products">{formatNumber(shop.on_sale_product_count)}</td>
                <td data-label="Socials"><span className="signalCount">{formatNumber(shop.affiliate_creator_count)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shopPagination" aria-label="Shop results pagination">
        <span>{isLoading ? "Loading shops…" : `${total.toLocaleString()} shops · ranked by 7D GMV`}</span>
        <div>
          <button type="button" disabled={isLoading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button>
          <strong>Page {page} of {totalPages}</strong>
          <button type="button" disabled={isLoading || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next →</button>
        </div>
      </div>
    </>
  );
}

function shopCategory(shop: TikTokShop, fallback: string) {
  return (shop as TikTokShop & { category?: string }).category ?? fallback;
}

function ShopStateRow({ children, error }: { children: ReactNode; error?: string }) {
  return <tr className="shopStateRow"><td colSpan={8}><strong>{children}</strong>{error ? <small>{error}</small> : null}</td></tr>;
}

function ShopIdentity({ shop, category }: { shop: TikTokShop; category: string }) {
  const displayName = displayShopName(shop.name, category);
  const content = (
    <>
      <span className="shopAvatarFallback" aria-hidden="true">
        {initials(shop.name)}
        {shop.avatar_url ? <img src={shop.avatar_url} alt="" width={32} height={32} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      </span>
      <span><strong title={shop.name ?? undefined}>{displayName}</strong></span>
    </>
  );

  if (!shop.tiktok_unique_id) return <div className="toolCell shopCell">{content}</div>;
  return <a className="toolCell shopCell" href={`https://www.tiktok.com/@${shop.tiktok_unique_id}`} target="_blank" rel="noreferrer">{content}</a>;
}

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
