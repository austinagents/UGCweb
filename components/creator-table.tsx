"use client";

import { useEffect, useState, type ReactNode } from "react";
import { loadCommerceQuery, prefetchCommerceQuery, readCommerceQuery } from "@/lib/commerce-query-cache";
import { commerceParentCategories, type CommerceCategory } from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerResponse } from "@/lib/creator-screener";

type CreatorTableResult = {
  category: "All" | CommerceCategory;
  data: CreatorScreenerResponse;
};

export function CreatorTable({
  category,
  active = true,
}: {
  category: "All" | CommerceCategory;
  active?: boolean;
}) {
  const [pagination, setPagination] = useState({ category, page: 1 });
  const [result, setResult] = useState<CreatorTableResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = pagination.category === category ? pagination.page : 1;

  useEffect(() => {
    let cancelled = false;
    const key = creatorQueryKey(category, page);
    const url = creatorQueryUrl(category, page);
    const cached = readCommerceQuery<CreatorScreenerResponse>(key, 300_000);
    if (cached) {
      setResult({ category, data: cached.data });
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);
    loadCommerceQuery<CreatorScreenerResponse>(key, url, cached?.stale ?? false)
      .then((data) => {
        if (cancelled) return;
        setResult({ category, data });
        if (active && data.page < data.totalPages) {
          const nextPage = data.page + 1;
          prefetchCommerceQuery<CreatorScreenerResponse>(creatorQueryKey(category, nextPage), creatorQueryUrl(category, nextPage));
        }
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Failed to load creators.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [active, category, page]);

  const data = result?.data;
  const creators = data?.creators ?? [];
  const renderedCategory = result?.category ?? category;
  const renderedPage = data?.page ?? page;
  const pageSize = data?.pageSize ?? 100;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const firstRank = (renderedPage - 1) * pageSize;
  const setPage = (nextPage: number) => setPagination({ category, page: nextPage });

  return (
    <>
      <div className="tableWrap shopTableWrap creatorTableWrap">
        <table className="terminalTable focusedToolsTable shopScreenerTable creatorScreenerTable">
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
              <th>Creator</th>
              <th>Category</th>
              <th>30D GMV</th>
              <th>Audience</th>
              <th>Units Sold</th>
              <th>Followers</th>
              <th>Socials</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && creators.length === 0 ? <CreatorStateRow><strong>Loading creators…</strong></CreatorStateRow> : null}
            {error ? <CreatorStateRow><strong>Unable to load creators.</strong><small>{error}</small></CreatorStateRow> : null}
            {!isLoading && !error && creators.length === 0 ? (
              <CreatorStateRow>
                <strong>No collected creators in this category yet.</strong>
                <small>{category === "All" ? "No persisted creator records are available." : `${category} does not have mapped creator coverage in the current sample.`}</small>
              </CreatorStateRow>
            ) : null}
            {!error && creators.map((creator, index) => (
              <tr key={creator.creator_oecuid}>
                <td className="rank" data-label="Rank">#{firstRank + index + 1}</td>
                <td data-label="Creator"><CreatorIdentity creator={creator} /></td>
                <td data-label="Category"><span className="categoryCell commerceCategoryCell"><span className="categoryDot" />{displayCreatorCategory(creator, renderedCategory)}</span></td>
                <td data-label="30D GMV"><strong className="commerceMetric">{formatCreatorGmv(creator)}</strong></td>
                <td data-label="Audience"><span className="creatorAudience">{formatAudience(creator)}</span></td>
                <td data-label="Units Sold">{creator.units_sold === null ? creator.units_sold_range ?? "—" : formatNumber(creator.units_sold)}</td>
                <td data-label="Followers"><span className="signalCount">{formatNumber(creator.followers)}</span></td>
                <td data-label="Socials" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shopPagination creatorTableStatus" aria-label="Creator results status">
        <span>{isLoading ? `Updating ${category} creators…` : `${total.toLocaleString()} creators · ranked by 30D GMV`}</span>
        <div>
          <button type="button" disabled={isLoading || renderedPage <= 1} onClick={() => setPage(Math.max(1, renderedPage - 1))}>← Previous</button>
          <strong>Page {renderedPage} of {totalPages}</strong>
          <button type="button" disabled={isLoading || renderedPage >= totalPages} onClick={() => setPage(Math.min(totalPages, renderedPage + 1))}>Next →</button>
        </div>
      </div>
    </>
  );
}

function creatorQueryKey(category: "All" | CommerceCategory, page: number) {
  return `creators:${category}:${page}`;
}

function creatorQueryUrl(category: "All" | CommerceCategory, page: number) {
  return `/api/creators?category=${encodeURIComponent(category)}&page=${page}`;
}

function CreatorIdentity({ creator }: { creator: CreatorListRow }) {
  const handle = creator.handle.replace(/^@/, "");
  return (
    <a className="toolCell shopCell creatorCell" href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noreferrer">
      <span className="shopAvatarFallback" aria-hidden="true">
        {initials(creator.nickname || handle)}
        {creator.avatar ? <img src={creator.avatar} alt="" width={30} height={30} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      </span>
      <span><strong title={`@${handle}`}>{creator.nickname || `@${handle}`}</strong></span>
    </a>
  );
}

function CreatorStateRow({ children }: { children: ReactNode }) {
  return <tr className="shopStateRow creatorStateRow"><td colSpan={8}>{children}</td></tr>;
}

function displayCreatorCategory(creator: CreatorListRow, selectedCategory: "All" | CommerceCategory) {
  if (selectedCategory !== "All" && creator.categoryMemberships.includes(selectedCategory)) return selectedCategory;
  return creator.categoryMemberships.find((category) => !commerceParentCategories.some((parent) => parent === category))
    ?? creator.categoryMemberships[0]
    ?? "Unmapped";
}

function formatCreatorGmv(creator: CreatorListRow) {
  if (creator.med_gmv_revenue !== null) return formatCurrency(creator.med_gmv_revenue);
  return creator.med_gmv_revenue_range ?? "—";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatAudience(creator: CreatorListRow) {
  if (!creator.audience_gender) return "—";
  return `${creator.audience_gender.gender} ${Math.round(creator.audience_gender.percentage)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}
