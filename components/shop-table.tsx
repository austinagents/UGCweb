"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { loadCommerceQuery, prefetchCommerceQuery, readCommerceQuery } from "@/lib/commerce-query-cache";
import type { ShopRankingMetric, ShopRankingWindow, TikTokShop, TikTokShopsResponse } from "@/lib/types";

type ShopTableResult = { category: string; data: TikTokShopsResponse };

export function ShopTable({ categoryId, window, metric, active = true, rowLimit }: { categoryId: string | null; window: ShopRankingWindow; metric: ShopRankingMetric; active?: boolean; rowLimit?: number }) {
  const scope = `${categoryId ?? "all"}:${window}:${metric}`;
  const [pagination, setPagination] = useState({ scope, page: 1 });
  const [result, setResult] = useState<ShopTableResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = pagination.scope === scope ? pagination.page : 1;

  useEffect(() => {
    let cancelled = false;
    const key = shopQueryKey(categoryId, window, metric, page);
    const url = shopQueryUrl(categoryId, window, metric, page);
    const cached = readCommerceQuery<TikTokShopsResponse>(key);
    if (cached) {
      setResult({ category: categoryId ?? "All", data: cached.data });
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    loadCommerceQuery<TikTokShopsResponse>(key, url, cached?.stale ?? false)
      .then((data) => {
        if (cancelled) return;
        setResult({ category: categoryId ?? "All", data });
        if (active && data.page < data.totalPages) {
          const nextPage = data.page + 1;
          prefetchCommerceQuery<TikTokShopsResponse>(shopQueryKey(categoryId, window, metric, nextPage), shopQueryUrl(categoryId, window, metric, nextPage));
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
  }, [active, categoryId, metric, page, window]);

  const data = result?.data;
  const shops = data?.shops ?? [];
  const visibleShops = rowLimit ? shops.slice(0, rowLimit) : shops;
  const renderedCategory = data?.categoryName ?? "All Categories";
  const renderedPage = data?.page ?? page;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const setPage = (nextPage: number) => setPagination({ scope, page: nextPage });

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
              <th>Est. 30D GMV</th>
              <th>Audience</th>
              <th>Units Sold</th>
              <th>Followers</th>
              <th>Socials</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && shops.length === 0 ? <ShopStateRow>Loading {renderedCategory} shops…</ShopStateRow> : null}
            {error ? <ShopStateRow error={error}>Unable to load shops.</ShopStateRow> : null}
            {!error && !isLoading && shops.length === 0 ? <ShopStateRow>No shops found for {renderedCategory}.</ShopStateRow> : null}

            {!error && visibleShops.map((shop) => (
              <tr key={`${shop.shop_id}:${shop.category_id}`}>
                <td className="rank" data-label="Rank"><ShopRank shop={shop} /></td>
                <td data-label="Shop"><ShopIdentity shop={shop} /></td>
                <td data-label="Category">
                  <span className="categoryCell commerceCategoryCell" title={`TikTok L1 category ${shop.category_id}`}><span className="categoryDot" />{shop.category_name}</span>
                </td>
                <td data-label="Est. 30D GMV"><strong className="commerceMetric">{formatCurrencyOrDash(shop.estimated_30d_gmv)}</strong></td>
                <UnavailableCell label="Audience" />
                <td data-label="Units Sold">{formatUnits(shop.shop_sold_count)}</td>
                <td data-label="Followers"><span className="signalCount">{formatFollowers(shop.followers)}</span></td>
                <td data-label="Socials"><SocialProfile shop={shop} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shopPagination" aria-label="Shop results pagination">
        <span>{isLoading ? `Updating ${renderedCategory} shops…` : `${total.toLocaleString()} shops · ranked by ${window.toUpperCase()} GMV`}</span>
        <div>
          <button type="button" disabled={isLoading || renderedPage <= 1} onClick={() => setPage(Math.max(1, renderedPage - 1))}>← Previous</button>
          <strong>Page {renderedPage} of {totalPages}</strong>
          <button type="button" disabled={isLoading || renderedPage >= totalPages} onClick={() => setPage(Math.min(totalPages, renderedPage + 1))}>Next →</button>
        </div>
      </div>
    </>
  );
}

function shopQueryKey(categoryId: string | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number) {
  return `shops:${categoryId ?? "all"}:${window}:${metric}:${page}`;
}

function shopQueryUrl(categoryId: string | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number) {
  const params = new URLSearchParams({ category_id: categoryId ?? "all", window, metric, page: String(page) });
  return `/api/shops?${params}`;
}

function ShopStateRow({ children, error }: { children: ReactNode; error?: string }) {
  return <tr className="shopStateRow"><td colSpan={8}><strong>{children}</strong>{error ? <small>{error}</small> : null}</td></tr>;
}

function ShopIdentity({ shop }: { shop: TikTokShop }) {
  const content = (
    <>
      <span className="shopAvatarFallback" aria-hidden="true">
        {initials(shop.shop_name)}
        {shop.shop_thumb_image_url ? <img src={shop.shop_thumb_image_url} alt="" width={32} height={32} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      </span>
      <span><strong title={shop.shop_name ?? undefined}>{shop.shop_name ?? "Unknown Shop"}</strong></span>
    </>
  );

  if (!shop.shop_share_link) return <div className="toolCell shopCell">{content}</div>;
  return <a className="toolCell shopCell" href={"https:" + "//shop.tiktok.com/us/store/partnerlinks/" + shop.shop_id} target="_blank" rel="noreferrer" title="Open TikTok Shop">{content}</a>;
}

function ShopRank({ shop }: { shop: TikTokShop }) {
  const current = Number(shop.current_rank);
  const previous = Number(shop.previous_rank);
  const movement = shop.current_rank && shop.previous_rank && Number.isFinite(current) && Number.isFinite(previous) ? previous - current : 0;
  return (
    <span title={`${shop.window.toUpperCase()} ${metricLabel(shop.ranking_metric)} rank in ${shop.category_name}`}>
      {shop.current_rank ? `#${shop.current_rank}` : "—"}
      {movement !== 0 ? <small className={movement > 0 ? "shopRankUp" : "shopRankDown"}>{movement > 0 ? "↑" : "↓"}{Math.abs(movement)}</small> : null}
    </span>
  );
}

function UnavailableCell({ label }: { label: string }) {
  return <td data-label={label}><span title={`${label} is not available from the official TikTok ranking source`}>—</span></td>;
}

function formatUnits(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 2 : value >= 100_000 ? 0 : value >= 10_000 ? 1 : 2,
  }).format(value);
}

function formatFollowers(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrencyOrDash(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function SocialProfile({ shop }: { shop: TikTokShop }) {
  if (!shop.tiktok_profile_url || !shop.tiktok_username) return <span title="TikTok social profile not yet verified">—</span>;
  return <a className="shopSocialLink" href={shop.tiktok_profile_url} target="_blank" rel="noreferrer" aria-label={`Open @${shop.tiktok_username} on TikTok`} title={`@${shop.tiktok_username}`}><span aria-hidden="true">♪</span></a>;
}

function metricLabel(metric: ShopRankingMetric) {
  if (metric === "product_card_gmv") return "Product-card GMV";
  if (metric === "live_gmv") return "LIVE GMV";
  if (metric === "video_gmv") return "Video GMV";
  return "Total GMV";
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
