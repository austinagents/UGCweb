import "server-only";

import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { unstable_cache } from "next/cache";
import creatorData from "@/data/creator-screener.json";
import {
  commerceCategoryGroups,
  tiktokShopCategories,
  type CommerceCategory,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
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
  const database = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shops.sqlite"), { readOnly: true });
  const rankColumn = `rank_${window}_${metric}`;
  const categoryWhere = categoryId
    ? "WHERE instr('|' || replace(category_ids, ' ', '') || '|', '|' || ? || '|') > 0"
    : "";
  const parameters = categoryId ? [categoryId] : [];
  const total = Number((database.prepare(`SELECT count(*) AS count FROM shops ${categoryWhere}`).get(...parameters) as { count: number }).count);
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * allShopPageSize;
  const sourceRows = database.prepare(`
    SELECT
      shop_id, shop_name, shop_logo_url, storefront_url, category_ids, category_names,
      shop_sold_count, followers, estimated_30d_gmv,
      ${rankColumn} AS current_rank
    FROM shops
    ${categoryWhere}
    ORDER BY current_rank IS NULL, current_rank ASC, shop_name COLLATE NOCASE, shop_id
    LIMIT ? OFFSET ?
  `).all(...parameters, allShopPageSize, offset) as Array<Record<string, string | number | null>>;
  database.close();
  const category = categoryId ? tiktokShopCategories.find((item) => item.id === categoryId) : null;
  const rows: TikTokShop[] = sourceRows.map((row) => {
    const ids = String(row.category_ids ?? "").split("|").map((value) => value.trim()).filter(Boolean);
    const names = String(row.category_names ?? "").split("|").map((value) => value.trim()).filter(Boolean);
    const selectedIndex = categoryId ? Math.max(0, ids.indexOf(categoryId)) : 0;
    return {
      shop_id: String(row.shop_id),
      shop_name: row.shop_name ? String(row.shop_name) : null,
      shop_thumb_image_url: row.shop_logo_url ? String(row.shop_logo_url) : null,
      shop_status: null,
      shop_share_link: row.storefront_url ? String(row.storefront_url) : null,
      tiktok_username: null,
      tiktok_profile_url: null,
      tiktok_profile_source: null,
      tiktok_profile_verified_at: null,
      category_id: ids[selectedIndex] ?? "unknown",
      category_name: names[selectedIndex] ?? "Uncategorized",
      window,
      ranking_metric: metric,
      current_rank: row.current_rank === null ? null : String(row.current_rank),
      previous_rank: null,
      rank_change: null,
      capture_date: "2026-10-07",
      shop_sold_count: row.shop_sold_count === null ? null : Number(row.shop_sold_count),
      followers: row.followers === null ? null : Number(row.followers),
      estimated_30d_gmv: row.estimated_30d_gmv === null ? null : Number(row.estimated_30d_gmv),
    };
  });

  return {
    categoryId,
    categoryName: category?.name ?? "All Categories",
    categories: [...tiktokShopCategories],
    window,
    metric,
    captureDate: "2026-10-07",
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
    units_sold: creator.units_sold,
    units_sold_range: creator.units_sold_range,
    audience_gender: creator.audience_gender,
    socials: creator.socials,
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
