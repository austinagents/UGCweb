"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { loadCommerceQuery, prefetchCommerceQuery, readCommerceQuery } from "@/lib/commerce-query-cache";
import { displayShopName } from "@/lib/shop-display-name";
import type { TikTokShop, TikTokShopsResponse } from "@/lib/types";

type ShopTableResult = { category: string; data: TikTokShopsResponse };

export function ShopTable({ category, active = true }: { category: string; active?: boolean }) {
  const [pagination, setPagination] = useState({ category, page: 1 });
  const [result, setResult] = useState<ShopTableResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = pagination.category === category ? pagination.page : 1;

  useEffect(() => {
    let cancelled = false;
    const key = shopQueryKey(category, page);
    const url = shopQueryUrl(category, page);
    const cached = readCommerceQuery<TikTokShopsResponse>(key);
    if (cached) {
      setResult({ category, data: cached.data });
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    loadCommerceQuery<TikTokShopsResponse>(key, url, cached?.stale ?? false)
      .then((data) => {
        if (cancelled) return;
        setResult({ category, data });
        if (active && data.page < data.totalPages) {
          const nextPage = data.page + 1;
          prefetchCommerceQuery<TikTokShopsResponse>(shopQueryKey(category, nextPage), shopQueryUrl(category, nextPage));
        }
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Failed to load shops.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [active, category, page]);

  const data = result?.data;
  const shops = data?.shops ?? [];
  const renderedCategory = result?.category ?? category;
  const renderedPage = data?.page ?? page;
  const pageSize = data?.pageSize ?? 100;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const firstRank = (renderedPage - 1) * pageSize;
  const setPage = (nextPage: number) => setPagination({ category, page: nextPage });

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
                <td data-label="Shop"><ShopIdentity shop={shop} category={shopCategory(shop, renderedCategory)} /></td>
                <td data-label="Category">
                  <span className="categoryCell commerceCategoryCell"><span className="categoryDot" />{shopCategory(shop, renderedCategory)}</span>
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
        <span>{isLoading ? `Updating ${category} shops…` : `${total.toLocaleString()} shops · ranked by 7D GMV`}</span>
        <div>
          <button type="button" disabled={isLoading || renderedPage <= 1} onClick={() => setPage(Math.max(1, renderedPage - 1))}>← Previous</button>
          <strong>Page {renderedPage} of {totalPages}</strong>
          <button type="button" disabled={isLoading || renderedPage >= totalPages} onClick={() => setPage(Math.min(totalPages, renderedPage + 1))}>Next →</button>
        </div>
      </div>
    </>
  );
}

function shopQueryKey(category: string, page: number) {
  return `shops:${category}:${page}`;
}

function shopQueryUrl(category: string, page: number) {
  return `/api/shops?category=${encodeURIComponent(category)}&page=${page}`;
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
