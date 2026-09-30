"use client";

import { useEffect, useState, type ReactNode } from "react";
import { commerceParentCategories, type CommerceCategory } from "@/lib/commerce-categories";
import type { CreatorScreenerResponse, CreatorScreenerRow } from "@/lib/creator-screener";

export function CreatorTable({
  category,
}: {
  category: "All" | CommerceCategory;
}) {
  const [creators, setCreators] = useState<CreatorScreenerRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [category]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(`/api/creators?category=${encodeURIComponent(category)}&page=${page}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as CreatorScreenerResponse;
        if (!response.ok) throw new Error("Failed to load creators.");
        setCreators(data.creators);
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setCreators([]);
        setError(cause instanceof Error ? cause.message : "Failed to load creators.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [category, page]);

  const firstRank = (page - 1) * pageSize;

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
                <td data-label="Category"><span className="categoryCell commerceCategoryCell"><span className="categoryDot" />{displayCreatorCategory(creator, category)}</span></td>
                <td data-label="30D GMV"><strong className="commerceMetric">{formatCreatorGmv(creator)}</strong></td>
                <td data-label="Audience"><span className="creatorAudience">{formatAudience(creator)}</span></td>
                <td data-label="Units Sold">{creator.units_sold === null ? creator.units_sold_range ?? "—" : formatNumber(creator.units_sold)}</td>
                <td data-label="Followers"><span className="signalCount">{formatNumber(creator.followers)}</span></td>
                <td data-label="Socials">{formatCurrencyOrDash(creator.live_gmv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shopPagination creatorTableStatus" aria-label="Creator results status">
        <span>{isLoading ? "Loading creators…" : `${total.toLocaleString()} creators · ranked by 30D GMV`}</span>
        <div>
          <button type="button" disabled={isLoading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button>
          <strong>Page {page} of {totalPages}</strong>
          <button type="button" disabled={isLoading || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next →</button>
        </div>
      </div>
    </>
  );
}

function CreatorIdentity({ creator }: { creator: CreatorScreenerRow }) {
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

function displayCreatorCategory(creator: CreatorScreenerRow, selectedCategory: "All" | CommerceCategory) {
  if (selectedCategory !== "All" && creator.categoryMemberships.includes(selectedCategory)) return selectedCategory;
  return creator.categoryMemberships.find((category) => !commerceParentCategories.some((parent) => parent === category))
    ?? creator.categoryMemberships[0]
    ?? "Unmapped";
}

function formatCreatorGmv(creator: CreatorScreenerRow) {
  if (creator.med_gmv_revenue !== null) return formatCurrency(creator.med_gmv_revenue);
  return creator.med_gmv_revenue_range ?? "—";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatCurrencyOrDash(value: number | null) {
  return value === null ? "—" : formatCurrency(value);
}

function formatAudience(creator: CreatorScreenerRow) {
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
