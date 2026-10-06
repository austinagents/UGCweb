import "server-only";

import { unstable_cache } from "next/cache";
import creatorData from "@/data/creator-screener.json";
import {
  commerceCategoryGroups,
  tiktokShopCategories,
  type CommerceCategory,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
import { getDatabase } from "@/lib/server/database";
import type { ShopRankingMetric, ShopRankingWindow, TikTokShop, TikTokShopsResponse } from "@/lib/types";

type ScreenerCategory = "All" | CommerceCategory;
const shopCacheSeconds = 60;
const allShopPageSize = 100;
const visibleRailSlots = 8;

const sourceCreators = creatorData.creators as CreatorScreenerRow[];
const creatorCategoryIndex = new Map<ScreenerCategory, CreatorListRow[]>();
const creatorCategoryCounts: Partial<Record<CommerceCategory, number>> = {};
const shopPageInflight = new Map<string, Promise<TikTokShopsResponse>>();

const allCreatorRows = sourceCreators.map(toCreatorListRow);
creatorCategoryIndex.set("All", allCreatorRows);
for (const group of commerceCategoryGroups) {
  creatorCategoryCounts[group.name] = 0;
  for (const child of group.children) creatorCategoryCounts[child] = 0;
}

for (const creator of allCreatorRows) {
  for (const category of creator.categoryMemberships) {
    const rows = creatorCategoryIndex.get(category) ?? [];
    rows.push(creator);
    creatorCategoryIndex.set(category, rows);
    creatorCategoryCounts[category] = (creatorCategoryCounts[category] ?? 0) + 1;
  }
}

const cachedShopPage = unstable_cache(
  loadShopPage,
  ["partnerlinks-official-tiktok-shop-rankings-v1"],
  { revalidate: shopCacheSeconds },
);

export async function getShopPage(categoryId: string | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const key = `${categoryId ?? "all"}:${window}:${metric}:${safePage}`;
  const pending = shopPageInflight.get(key);
  if (pending) return pending;

  const request = cachedShopPage(categoryId, window, metric, safePage).finally(() => {
    shopPageInflight.delete(key);
  });
  shopPageInflight.set(key, request);
  return request;
}

export async function getTrendingShops(categoryId: string | null, window: ShopRankingWindow, metric: ShopRankingMetric) {
  const page = await getShopPage(categoryId, window, metric, 1);
  return { shops: page.shops.slice(0, visibleRailSlots) };
}

export function getCreatorPage(category: ScreenerCategory, page: number, pageSize: number) {
  const rows = creatorCategoryIndex.get(category) ?? [];
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 100));
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    creators: rows.slice(start, start + safePageSize),
    categoryCounts: creatorCategoryCounts,
    page: safePage,
    pageSize: safePageSize,
    total: rows.length,
    totalPages,
    snapshotTimestamp: creatorData.snapshotTimestamp,
  };
}

export function getTrendingCreators(category: ScreenerCategory) {
  const page = getCreatorPage(category, 1, visibleRailSlots);
  return {
    creators: page.creators.map(toCreatorTrendingRow),
    snapshotTimestamp: page.snapshotTimestamp,
  };
}

export function getCategoryAvailability(mode: "shops" | "creators") {
  if (mode === "shops") {
    return tiktokShopCategories.map((category) => ({ category: category.name, available: true }));
  }

  return commerceCategoryGroups.flatMap((group) => [group.name, ...group.children]).map((category) => ({
    category,
    available: (creatorCategoryCounts[category] ?? 0) > 0,
    count: creatorCategoryCounts[category] ?? null,
  }));
}

async function loadShopPage(categoryId: string | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number): Promise<TikTokShopsResponse> {
  const sql = getDatabase();
  const categoryFilter = categoryId ? sql`AND observation.category_id = ${categoryId}` : sql``;
  const [{ count, capture_date }] = await sql<[{ count: number; capture_date: string | null }]>`
    SELECT count(*)::integer AS count, max(observation.capture_date)::text AS capture_date
    FROM partnerlinks.tiktok_shop_ranking_observations observation
    WHERE observation.ranking_window = ${window}
    ${categoryFilter}
  `;
  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * allShopPageSize;
  const rows = await sql<TikTokShop[]>`
    SELECT
      entity.shop_id,
      entity.shop_name,
      entity.shop_thumb_image_url,
      entity.shop_status,
      entity.shop_share_link,
      entity.tiktok_username,
      entity.tiktok_profile_url,
      entity.tiktok_profile_source,
      entity.tiktok_profile_verified_at::text,
      observation.category_id,
      observation.category_name,
      observation.ranking_window AS "window",
      ${metric}::text AS ranking_metric,
      CASE ${metric}
        WHEN 'total_gmv' THEN observation.total_gmv_rank
        WHEN 'product_card_gmv' THEN observation.product_card_gmv_rank
        WHEN 'live_gmv' THEN observation.live_gmv_rank
        WHEN 'video_gmv' THEN observation.video_gmv_rank
      END::text AS current_rank,
      CASE ${metric}
        WHEN 'total_gmv' THEN observation.total_gmv_previous_rank
        WHEN 'product_card_gmv' THEN observation.product_card_gmv_previous_rank
        WHEN 'live_gmv' THEN observation.live_gmv_previous_rank
        WHEN 'video_gmv' THEN observation.video_gmv_previous_rank
      END::text AS previous_rank,
      CASE ${metric}
        WHEN 'total_gmv' THEN observation.total_gmv_rank_change
        WHEN 'product_card_gmv' THEN observation.product_card_gmv_rank_change
        WHEN 'live_gmv' THEN observation.live_gmv_rank_change
        WHEN 'video_gmv' THEN observation.video_gmv_rank_change
      END::text AS rank_change,
      observation.capture_date::text
    FROM partnerlinks.tiktok_shop_ranking_observations observation
    JOIN partnerlinks.tiktok_shop_entities entity USING (shop_id)
    WHERE observation.ranking_window = ${window}
    ${categoryFilter}
    ORDER BY
      CASE ${metric}
        WHEN 'total_gmv' THEN observation.total_gmv_rank
        WHEN 'product_card_gmv' THEN observation.product_card_gmv_rank
        WHEN 'live_gmv' THEN observation.live_gmv_rank
        WHEN 'video_gmv' THEN observation.video_gmv_rank
      END ASC NULLS LAST,
      observation.category_id ASC,
      entity.shop_id ASC
    LIMIT ${allShopPageSize} OFFSET ${offset}
  `;
  const category = categoryId ? tiktokShopCategories.find((item) => item.id === categoryId) : null;

  return {
    categoryId,
    categoryName: category?.name ?? "All Categories",
    categories: [...tiktokShopCategories],
    window,
    metric,
    captureDate: capture_date,
    total,
    page: safePage,
    pageSize: allShopPageSize,
    totalPages,
    count: rows.length,
    shops: rows,
  };
}

function toCreatorListRow(creator: CreatorScreenerRow): CreatorListRow {
  return {
    creator_oecuid: creator.creator_oecuid,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    followers: creator.followers,
    categoryMemberships: creator.categoryMemberships,
    med_gmv_revenue: creator.med_gmv_revenue,
    med_gmv_revenue_range: creator.med_gmv_revenue_range,
    live_gmv: creator.live_gmv,
    units_sold: creator.units_sold,
    units_sold_range: creator.units_sold_range,
    audience_gender: creator.audience_gender,
  };
}

function toCreatorTrendingRow(creator: CreatorListRow): CreatorTrendingRow {
  return {
    creator_oecuid: creator.creator_oecuid,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    med_gmv_revenue: creator.med_gmv_revenue,
    med_gmv_revenue_range: creator.med_gmv_revenue_range,
  };
}
