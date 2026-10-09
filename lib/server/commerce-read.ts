import "server-only";

import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { unstable_cache } from "next/cache";
import creatorData from "@/data/creator-screener.json";
import {
  commerceNavigationCategories,
  commerceNavigationCategoryForId,
  creatorShopCategories,
  tiktokShopCategories,
  type CommerceNavigationCategoryName,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
import type { ShopRankingMetric, ShopRankingWindow, TikTokShop, TikTokShopsResponse } from "@/lib/types";
import { followerDistance, isHighConfidenceShopCreatorMatch, normalizeCommerceIdentity } from "@/lib/commerce-identity";

type ScreenerCategory = "All" | CommerceNavigationCategoryName;
const shopCacheSeconds = 60;
const allShopPageSize = 100;
const visibleShopRailSlots = 10;
const visibleCreatorRailSlots = 8;

const sourceCreators = creatorData.creators as CreatorScreenerRow[];
const creatorCategoryIndex = new Map<ScreenerCategory, CreatorListRow[]>();
const creatorCategoryCounts: Partial<Record<CommerceNavigationCategoryName, number>> = {};
const shopPageInflight = new Map<string, Promise<TikTokShopsResponse>>();

const shopIdentityModel = buildShopIdentityModel();
const allCreatorRows = sourceCreators.filter((creator) => !shopIdentityModel.shopLikeCreatorIds.has(creator.creator_oecuid)).map(toCreatorListRow);
const shopAudienceCategoryBaselines = buildShopAudienceCategoryBaselines();
creatorCategoryIndex.set("All", allCreatorRows);
for (const category of commerceNavigationCategories) creatorCategoryCounts[category.name] = 0;

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
  ["partnerlinks-official-tiktok-shop-rankings-v11"],
  { revalidate: shopCacheSeconds },
);

export async function getShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, shopIds: string[] | null = null, resultLabel: string | null = null) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const key = `${categoryIds?.join(",") ?? "all"}:${shopIds?.join(",") ?? "all"}:${window}:${metric}:${safePage}`;
  const pending = shopPageInflight.get(key);
  if (pending) return pending;

  const request = cachedShopPage(categoryIds, window, metric, safePage, shopIds, resultLabel).finally(() => {
    shopPageInflight.delete(key);
  });
  shopPageInflight.set(key, request);
  return request;
}

export async function getTrendingShops(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric) {
  const page = await getShopPage(categoryIds, window, metric, 1);
  return { shops: page.shops.slice(0, visibleShopRailSlots) };
}

export function getCreatorPage(category: ScreenerCategory, page: number, pageSize: number, creatorIds: Set<string> | null = null) {
  const categoryRows = creatorCategoryIndex.get(category) ?? [];
  const rows = creatorIds ? allCreatorRows.filter((creator) => creatorIds.has(creator.creator_oecuid)) : categoryRows;
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
  const page = getCreatorPage(category, 1, visibleCreatorRailSlots);
  return {
    creators: page.creators.map(toCreatorTrendingRow),
    snapshotTimestamp: page.snapshotTimestamp,
  };
}

export function getCategoryAvailability(mode: "shops" | "creators") {
  if (mode === "shops") {
    return tiktokShopCategories.map((category) => ({ category: category.name, available: true }));
  }

  return commerceNavigationCategories.map(({ name }) => ({
    category: name,
    available: (creatorCategoryCounts[name] ?? 0) > 0,
    count: creatorCategoryCounts[name] ?? null,
  }));
}

async function loadShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, selectedShopIds: string[] | null = null, resultLabel: string | null = null): Promise<TikTokShopsResponse> {
  const rankingDatabase = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shop-ranking-observations.sqlite"), { readOnly: true });
  const shopDatabase = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shops.sqlite"), { readOnly: true });
  const estimateDatabase = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shop-gmv-estimates.sqlite"), { readOnly: true });
  const rankColumn = `${metric}_rank`;
  const previousRankColumn = `${metric}_previous_rank`;
  const rankChangeColumn = `${metric}_rank_change`;
  const estimateColumn = `estimated_${window}_gmv`;
  const sourceCategoryColumn = `source_${window}_category_id`;
  const sourceRankColumn = `source_${window}_rank`;
  const categoryFilter = categoryIds ? `AND category_id IN (${categoryIds.map(() => "?").join(", ")})` : "";
  const parameters = [window, ...(categoryIds ?? [])];
  const selectedShopFilter = selectedShopIds ? `WHERE shop_id IN (${selectedShopIds.map(() => "?").join(", ") || "NULL"})` : "";
  const total = selectedShopIds
    ? Number((estimateDatabase.prepare(`SELECT count(*) AS count FROM shop_estimates ${selectedShopFilter}`).get(...selectedShopIds) as { count: number }).count)
    : categoryIds
    ? Number((rankingDatabase.prepare(`SELECT count(*) AS count FROM ranking_observations WHERE window = ? AND ${rankColumn} IS NOT NULL ${categoryFilter}`).get(...parameters) as { count: number }).count)
    : Number((estimateDatabase.prepare("SELECT count(*) AS count FROM shop_estimates").get() as { count: number }).count);
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * allShopPageSize;
  const sourceCategoryIds = tiktokShopCategories.map((category) => category.id);
  const categoryOrder = sourceCategoryIds.map((categoryId, index) => `WHEN '${categoryId}' THEN ${index}`).join(" ");
  const sourceRows = categoryIds
    ? rankingDatabase.prepare(`
        SELECT *, ${rankColumn} AS official_rank, ${previousRankColumn} AS official_previous_rank, ${rankChangeColumn} AS official_rank_change
        FROM ranking_observations
        WHERE window = ? AND ${rankColumn} IS NOT NULL ${categoryFilter}
        ORDER BY CASE category_id ${categoryOrder} ELSE ${sourceCategoryIds.length} END, source_page, source_row_index, shop_id
        LIMIT ? OFFSET ?
      `).all(...parameters, allShopPageSize, offset) as Array<Record<string, string | number | null>>
    : estimateDatabase.prepare(`
        SELECT shop_id, ${estimateColumn} AS estimated_gmv, ${sourceCategoryColumn} AS category_id, ${sourceRankColumn} AS official_rank
        FROM shop_estimates
        ${selectedShopFilter}
        ORDER BY estimated_gmv IS NULL, estimated_gmv DESC, shop_id
        LIMIT ? OFFSET ?
      `).all(...(selectedShopIds ?? []), allShopPageSize, offset) as Array<Record<string, string | number | null>>;
  const shopIds = sourceRows.map((row) => String(row.shop_id));
  const shopRows = shopIds.length === 0 ? [] : shopDatabase.prepare(`
    SELECT shop_id, shop_name, shop_logo_url, storefront_url, shop_sold_count, weighted_median_price, followers, estimated_30d_gmv
    FROM shops
    WHERE shop_id IN (${shopIds.map(() => "?").join(", ")})
  `).all(...shopIds) as Array<Record<string, string | number | null>>;
  const shopsById = new Map(shopRows.map((row) => [String(row.shop_id), row]));
  const rankingDetails = shopIds.length === 0 ? [] : rankingDatabase.prepare(`
    SELECT * FROM ranking_observations
    WHERE window = ? AND shop_id IN (${shopIds.map(() => "?").join(", ")})
  `).all(window, ...shopIds) as Array<Record<string, string | number | null>>;
  const rankingByKey = new Map(rankingDetails.map((row) => [`${row.shop_id}:${row.category_id}`, row]));
  const observationEstimates = categoryIds && shopIds.length > 0 ? estimateDatabase.prepare(`
    SELECT shop_id, category_id, estimated_gmv FROM observation_estimates
    WHERE window = ? AND shop_id IN (${shopIds.map(() => "?").join(", ")})
  `).all(window, ...shopIds) as Array<Record<string, string | number | null>> : [];
  const estimateByKey = new Map(observationEstimates.map((row) => [`${row.shop_id}:${row.category_id}`, row.estimated_gmv]));
  rankingDatabase.close();
  shopDatabase.close();
  estimateDatabase.close();
  const category = categoryIds ? commerceNavigationCategories.find((item) => item.categoryIds.length === categoryIds.length && item.categoryIds.every((id) => categoryIds.includes(id))) : null;
  const rows: TikTokShop[] = sourceRows.map((row, index) => {
    const shop = shopsById.get(String(row.shop_id));
    const officialCategoryId = row.category_id ? String(row.category_id) : "unknown";
    const detail = rankingByKey.get(`${row.shop_id}:${officialCategoryId}`);
    const officialCategoryName = detail?.category_name ? String(detail.category_name) : tiktokShopCategories.find((item) => item.id === officialCategoryId)?.name ?? "Unranked";
    const navigationCategoryName = commerceNavigationCategoryForId(officialCategoryId);
    const estimatedGmv = categoryIds ? estimateByKey.get(`${row.shop_id}:${officialCategoryId}`) : row.estimated_gmv;
    const numericEstimatedGmv = estimatedGmv === null || estimatedGmv === undefined ? null : Number(estimatedGmv);
    const weightedMedianPrice = shop?.weighted_median_price === null || shop?.weighted_median_price === undefined ? null : Number(shop.weighted_median_price);
    const estimatedUnitsSold = numericEstimatedGmv !== null && numericEstimatedGmv > 0 && weightedMedianPrice !== null && weightedMedianPrice > 0
      ? Math.max(1, Math.round(numericEstimatedGmv / weightedMedianPrice))
      : null;
    const audience = estimateShopAudience(String(row.shop_id), navigationCategoryName);
    return {
      shop_id: String(row.shop_id),
      shop_name: shop?.shop_name ? String(shop.shop_name) : null,
      shop_thumb_image_url: shop?.shop_logo_url ? String(shop.shop_logo_url) : null,
      shop_status: null,
      shop_share_link: shop?.storefront_url ? String(shop.storefront_url) : null,
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
      previous_rank: categoryIds ? row.official_previous_rank === null ? null : String(row.official_previous_rank) : detail?.[previousRankColumn] === null || detail?.[previousRankColumn] === undefined ? null : String(detail[previousRankColumn]),
      rank_change: categoryIds ? row.official_rank_change === null ? null : String(row.official_rank_change) : detail?.[rankChangeColumn] === null || detail?.[rankChangeColumn] === undefined ? null : String(detail[rankChangeColumn]),
      official_category_id: officialCategoryId,
      official_category_name: officialCategoryName,
      capture_date: detail?.capture_date ? String(detail.capture_date) : "",
      shop_sold_count: shop?.shop_sold_count === null || shop?.shop_sold_count === undefined ? null : Number(shop.shop_sold_count),
      estimated_units_sold: estimatedUnitsSold,
      units_sold_estimate_source: estimatedUnitsSold === null ? null : "weighted_median_product_price",
      followers: shop?.followers === null || shop?.followers === undefined ? null : Number(shop.followers),
      audience_gender: audience.audience,
      audience_estimate_source: audience.source,
      estimated_30d_gmv: shop?.estimated_30d_gmv === null || shop?.estimated_30d_gmv === undefined ? null : Number(shop.estimated_30d_gmv),
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
    captureDate: rows[0]?.capture_date ?? null,
    total,
    page: safePage,
    pageSize: allShopPageSize,
    totalPages,
    count: rows.length,
    shops: rows,
  };
}

function buildShopIdentityModel() {
  const database = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shops.sqlite"), { readOnly: true });
  const shops = database.prepare("SELECT shop_id, shop_name, followers FROM shops").all() as Array<{ shop_id: string; shop_name: string | null; followers: number | null }>;
  database.close();
  const shopsByName = new Map<string, typeof shops>();
  for (const shop of shops) {
    const name = normalizeCommerceIdentity(shop.shop_name);
    if (name.length < 4) continue;
    const matches = shopsByName.get(name) ?? [];
    matches.push(shop);
    shopsByName.set(name, matches);
  }
  const shopLikeCreatorIds = new Set<string>();
  const creatorAudienceByShopId = new Map<string, CreatorScreenerRow["audience_gender"]>();
  for (const creator of sourceCreators) {
    const handle = normalizeCommerceIdentity(creator.handle);
    const nickname = normalizeCommerceIdentity(creator.nickname);
    const candidates = [...(shopsByName.get(handle) ?? []), ...(shopsByName.get(nickname) ?? [])];
    const match = candidates
      .filter((shop) => isHighConfidenceShopCreatorMatch(shop, creator, handle, nickname))
      .sort((left, right) => followerDistance(left.followers, creator.followers) - followerDistance(right.followers, creator.followers))[0];
    if (!match) continue;
    shopLikeCreatorIds.add(creator.creator_oecuid);
    if (creator.audience_gender) creatorAudienceByShopId.set(String(match.shop_id), creator.audience_gender);
  }
  return { shopLikeCreatorIds, creatorAudienceByShopId };
}

function buildShopAudienceCategoryBaselines() {
  const values = new Map<CommerceNavigationCategoryName, number[]>();
  for (const creator of sourceCreators) {
    if (!creator.audience_gender) continue;
    const femaleShare = creator.audience_gender.gender === "Female" ? creator.audience_gender.percentage : 100 - creator.audience_gender.percentage;
    for (const category of creatorShopCategories(creator.categoryMemberships, creator.sourceQueries)) {
      const categoryValues = values.get(category) ?? [];
      categoryValues.push(femaleShare);
      values.set(category, categoryValues);
    }
  }
  return new Map([...values].map(([category, shares]) => [category, shares.reduce((sum, share) => sum + share, 0) / shares.length]));
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

function toCreatorListRow(creator: CreatorScreenerRow): CreatorListRow {
  return {
    creator_oecuid: creator.creator_oecuid,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    followers: creator.followers,
    categoryMemberships: creatorShopCategories(creator.categoryMemberships, creator.sourceQueries),
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
