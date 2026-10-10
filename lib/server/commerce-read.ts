import "server-only";

import { unstable_cache } from "next/cache";
import creatorIdentityData from "@/data/commerce-shop-creator-identity.json";
import {
  commerceNavigationCategories,
  commerceNavigationCategoryForId,
  tiktokShopCategories,
  type CommerceNavigationCategoryName,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
import type { ShopRankingMetric, ShopRankingWindow, TikTokShop, TikTokShopsResponse } from "@/lib/types";
import { getCommerceDatabase } from "@/lib/server/cloudflare-d1";

type ScreenerCategory = "All" | CommerceNavigationCategoryName;
type CreatorRecord = {
  creator_id: string;
  handle: string;
  nickname: string;
  avatar: string | null;
  followers: number | null;
  category_memberships_json: string;
  med_gmv_revenue: number | null;
  med_gmv_revenue_range: string | null;
  units_sold: number | null;
  units_sold_range: string | null;
  audience_gender_json: string | null;
  socials_json: string;
};
const shopCacheSeconds = 60;
const allShopPageSize = 25;
const visibleShopRailSlots = 10;
const visibleCreatorRailSlots = 8;

const shopPageInflight = new Map<string, Promise<TikTokShopsResponse>>();

const shopIdentityModel = {
  creatorAudienceByShopId: new Map(Object.entries(creatorIdentityData.creatorAudienceByShopId)) as Map<string, CreatorScreenerRow["audience_gender"]>,
};
const shopAudienceCategoryBaselines = new Map(Object.entries(creatorIdentityData.shopAudienceCategoryBaselines)) as Map<CommerceNavigationCategoryName, number>;

const cachedShopPage = unstable_cache(
  loadShopPage,
  ["partnerlinks-official-tiktok-shop-rankings-v11"],
  { revalidate: shopCacheSeconds },
);

export async function getShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, heatmapCategory: string | null = null, resultLabel: string | null = null) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const key = `${categoryIds?.join(",") ?? "all"}:${heatmapCategory ?? "all"}:${window}:${metric}:${safePage}`;
  const pending = shopPageInflight.get(key);
  if (pending) return pending;

  const request = cachedShopPage(categoryIds, window, metric, safePage, heatmapCategory, resultLabel).finally(() => {
    shopPageInflight.delete(key);
  });
  shopPageInflight.set(key, request);
  return request;
}

export async function getTrendingShops(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric) {
  const page = await getShopPage(categoryIds, window, metric, 1);
  return { shops: page.shops.slice(0, visibleShopRailSlots) };
}

export async function getCreatorPage(category: ScreenerCategory, page: number, pageSize: number, heatmapCategory: string | null = null) {
  const database = getCommerceDatabase();
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 100));
  const categoryJoin = category === "All" ? "" : "JOIN creator_categories cc ON cc.creator_id = cr.creator_id AND cc.category = ?";
  const heatmapJoin = heatmapCategory ? "JOIN creator_heatmap_affiliations ch ON ch.creator_id = cr.creator_id AND ch.category = ?" : "";
  const parameters = [...(category === "All" ? [] : [category]), ...(heatmapCategory ? [heatmapCategory] : [])];
  const total = Number((await database.prepare(`SELECT count(*) AS count FROM creator_records cr ${categoryJoin} ${heatmapJoin}`).bind(...parameters).first<{ count: number }>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const [recordsResult, countResult, metadataResult] = await Promise.all([
    database.prepare(`
      SELECT cr.* FROM creator_records cr ${categoryJoin} ${heatmapJoin}
      ORDER BY cr.source_index, cr.creator_id LIMIT ? OFFSET ?
    `).bind(...parameters, safePageSize, start).all<CreatorRecord>(),
    database.prepare("SELECT category, count(*) AS count FROM creator_categories GROUP BY category").all<{ category: CommerceNavigationCategoryName; count: number }>(),
    database.prepare("SELECT value FROM creator_metadata WHERE key = 'snapshot_timestamp'").first<{ value: string }>(),
  ]);
  const records = recordsResult.results;
  const creatorCategoryCounts = Object.fromEntries(countResult.results.map((row) => [row.category, Number(row.count)]));

  return {
    creators: records.map(toCreatorListRow),
    categoryCounts: creatorCategoryCounts,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    snapshotTimestamp: metadataResult?.value ?? "",
  };
}

export async function getTrendingCreators(category: ScreenerCategory) {
  const page = await getCreatorPage(category, 1, visibleCreatorRailSlots);
  return {
    creators: page.creators.map(toCreatorTrendingRow),
    snapshotTimestamp: page.snapshotTimestamp,
  };
}

export async function getCategoryAvailability(mode: "shops" | "creators") {
  if (mode === "shops") {
    return tiktokShopCategories.map((category) => ({ category: category.name, available: true }));
  }

  const countRows = (await getCommerceDatabase().prepare("SELECT category, count(*) AS count FROM creator_categories GROUP BY category").all<{ category: CommerceNavigationCategoryName; count: number }>()).results;
  const counts = new Map(countRows.map((row) => [row.category, Number(row.count)]));
  return commerceNavigationCategories.map(({ name }) => ({
    category: name,
    available: (counts.get(name) ?? 0) > 0,
    count: counts.get(name) ?? null,
  }));
}

async function loadShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, heatmapCategory: string | null = null, resultLabel: string | null = null): Promise<TikTokShopsResponse> {
  const database = getCommerceDatabase();
  const rankColumn = `${metric}_rank`;
  const previousRankColumn = `${metric}_previous_rank`;
  const rankChangeColumn = `${metric}_rank_change`;
  const estimateColumn = `estimated_${window}_gmv`;
  const sourceCategoryColumn = `source_${window}_category_id`;
  const sourceRankColumn = `source_${window}_rank`;
  const categoryFilter = categoryIds ? `AND category_id IN (${categoryIds.map(() => "?").join(", ")})` : "";
  const parameters = [window, ...(categoryIds ?? [])];
  const heatmapJoin = heatmapCategory ? "JOIN heatmap_shop_affiliations h ON h.shop_id = se.shop_id AND h.category = ?" : "";
  const heatmapCountJoin = heatmapCategory ? "JOIN heatmap_shop_affiliations h ON h.shop_id = shop_estimates.shop_id AND h.category = ?" : "";
  const total = heatmapCategory
    ? Number((await database.prepare(`SELECT count(*) AS count FROM shop_estimates ${heatmapCountJoin}`).bind(heatmapCategory).first<{ count: number }>())?.count ?? 0)
    : categoryIds
    ? Number((await database.prepare(`SELECT count(*) AS count FROM ranking_observations WHERE window = ? AND ${rankColumn} IS NOT NULL ${categoryFilter}`).bind(...parameters).first<{ count: number }>())?.count ?? 0)
    : Number((await database.prepare("SELECT count(*) AS count FROM shop_estimates").first<{ count: number }>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * allShopPageSize;
  const sourceCategoryIds = tiktokShopCategories.map((category) => category.id);
  const categoryOrder = sourceCategoryIds.map((categoryId, index) => `WHEN '${categoryId}' THEN ${index}`).join(" ");
  const rows = categoryIds
    ? (await database.prepare(`
        SELECT ro.*, ro.${rankColumn} AS official_rank, ro.${previousRankColumn} AS official_previous_rank,
          ro.${rankChangeColumn} AS official_rank_change, oe.estimated_gmv,
          s.shop_name, s.shop_logo_url, s.storefront_url, s.shop_sold_count,
          s.weighted_median_price, s.followers, s.estimated_30d_gmv
        FROM ranking_observations ro
        JOIN shops s ON s.shop_id = ro.shop_id
        LEFT JOIN observation_estimates oe ON oe.shop_id = ro.shop_id AND oe.category_id = ro.category_id AND oe.window = ro.window
        WHERE ro.window = ? AND ro.${rankColumn} IS NOT NULL ${categoryFilter.replaceAll("category_id", "ro.category_id")}
        ORDER BY CASE ro.category_id ${categoryOrder} ELSE ${sourceCategoryIds.length} END, ro.source_page, ro.source_row_index, ro.shop_id
        LIMIT ? OFFSET ?
      `).bind(...parameters, allShopPageSize, offset).all<Record<string, string | number | null>>()).results
    : (await database.prepare(`
        SELECT se.shop_id, se.${estimateColumn} AS estimated_gmv, se.${sourceCategoryColumn} AS category_id,
          se.${sourceRankColumn} AS official_rank, s.shop_name, s.shop_logo_url, s.storefront_url,
          s.shop_sold_count, s.weighted_median_price, s.followers, s.estimated_30d_gmv,
          ro.category_name, ro.capture_date, ro.${previousRankColumn} AS official_previous_rank,
          ro.${rankChangeColumn} AS official_rank_change
        FROM shop_estimates se
        JOIN shops s ON s.shop_id = se.shop_id
        LEFT JOIN ranking_observations ro ON ro.shop_id = se.shop_id AND ro.window = ? AND ro.category_id = se.${sourceCategoryColumn}
        ${heatmapJoin}
        ORDER BY se.${estimateColumn} DESC, se.shop_id
        LIMIT ? OFFSET ?
      `).bind(window, ...(heatmapCategory ? [heatmapCategory] : []), allShopPageSize, offset).all<Record<string, string | number | null>>()).results;
  const category = categoryIds ? commerceNavigationCategories.find((item) => item.categoryIds.length === categoryIds.length && item.categoryIds.every((id) => categoryIds.includes(id))) : null;
  const shops: TikTokShop[] = rows.map((row, index) => {
    const officialCategoryId = row.category_id ? String(row.category_id) : "unknown";
    const officialCategoryName = row.category_name ? String(row.category_name) : tiktokShopCategories.find((item) => item.id === officialCategoryId)?.name ?? "Unranked";
    const navigationCategoryName = commerceNavigationCategoryForId(officialCategoryId);
    const estimatedGmv = row.estimated_gmv;
    const numericEstimatedGmv = estimatedGmv === null || estimatedGmv === undefined ? null : Number(estimatedGmv);
    const weightedMedianPrice = row.weighted_median_price === null || row.weighted_median_price === undefined ? null : Number(row.weighted_median_price);
    const estimatedUnitsSold = numericEstimatedGmv !== null && numericEstimatedGmv > 0 && weightedMedianPrice !== null && weightedMedianPrice > 0
      ? Math.max(1, Math.round(numericEstimatedGmv / weightedMedianPrice))
      : null;
    const audience = estimateShopAudience(String(row.shop_id), navigationCategoryName);
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
      category_id: officialCategoryId,
      category_name: navigationCategoryName,
      window,
      ranking_metric: metric,
      display_rank: categoryIds ? null : offset + index + 1,
      rank_display_scope: categoryIds ? "official_category" : "ugcweb_estimated",
      current_rank: row.official_rank === null ? null : String(row.official_rank),
      previous_rank: row.official_previous_rank === null || row.official_previous_rank === undefined ? null : String(row.official_previous_rank),
      rank_change: row.official_rank_change === null || row.official_rank_change === undefined ? null : String(row.official_rank_change),
      official_category_id: officialCategoryId,
      official_category_name: officialCategoryName,
      capture_date: row.capture_date ? String(row.capture_date) : "",
      shop_sold_count: row.shop_sold_count === null || row.shop_sold_count === undefined ? null : Number(row.shop_sold_count),
      estimated_units_sold: estimatedUnitsSold,
      units_sold_estimate_source: estimatedUnitsSold === null ? null : "weighted_median_product_price",
      followers: row.followers === null || row.followers === undefined ? null : Number(row.followers),
      audience_gender: audience.audience,
      audience_estimate_source: audience.source,
      estimated_30d_gmv: row.estimated_30d_gmv === null || row.estimated_30d_gmv === undefined ? null : Number(row.estimated_30d_gmv),
      estimated_gmv: numericEstimatedGmv,
      estimate_model_version: "provisional-empirical-velocity-v4",
      estimate_is_provisional: true,
    };
  });

  return {
    categoryId: categoryIds?.join(",") ?? null,
    categoryName: resultLabel ?? category?.name ?? "All Categories",
    categories: [...tiktokShopCategories],
    window,
    metric,
    captureDate: shops[0]?.capture_date ?? null,
    total,
    page: safePage,
    pageSize: allShopPageSize,
    totalPages,
    count: shops.length,
    shops,
  };
}

function estimateShopAudience(shopId: string, category: CommerceNavigationCategoryName) {
  const matched = shopIdentityModel.creatorAudienceByShopId.get(shopId);
  if (matched) return { audience: matched, source: "matched_creator" as const };
  const baseline = shopAudienceCategoryBaselines.get(category);
  if (baseline === undefined) return { audience: null, source: null };
  const variation = ((stableHash(shopId) % 1201) / 100) - 6;
  const femaleShare = Math.min(88, Math.max(22, baseline + variation));
  return {
    audience: femaleShare >= 50
      ? { gender: "Female" as const, percentage: femaleShare }
      : { gender: "Male" as const, percentage: 100 - femaleShare },
    source: "category_model" as const,
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toCreatorListRow(creator: CreatorRecord): CreatorListRow {
  return {
    creator_oecuid: creator.creator_id,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    followers: creator.followers,
    categoryMemberships: JSON.parse(creator.category_memberships_json) as CommerceNavigationCategoryName[],
    med_gmv_revenue: creator.med_gmv_revenue,
    med_gmv_revenue_range: creator.med_gmv_revenue_range,
    units_sold: creator.units_sold,
    units_sold_range: creator.units_sold_range,
    audience_gender: creator.audience_gender_json ? JSON.parse(creator.audience_gender_json) : null,
    socials: JSON.parse(creator.socials_json),
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
