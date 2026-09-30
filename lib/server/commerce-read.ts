import "server-only";

import { unstable_cache } from "next/cache";
import creatorData from "@/data/creator-screener.json";
import {
  commerceCategoryGroups,
  commerceParentCategories,
  type CommerceCategory,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
import type { TikTokShop, TikTokShopsResponse } from "@/lib/types";

type ScreenerCategory = "All" | CommerceCategory;
type RankedShop = TikTokShop & { category?: string };

const shopCacheSeconds = 60;
const allShopPageSize = 100;
const visibleRailSlots = 8;
const shopsApiBaseUrl =
  process.env.SHOPS_API_BASE_URL ??
  "https://tiktok-shop-screener-api.austindtaylor7.workers.dev";

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
  ["partnerlinks-commerce-shop-page-v1"],
  { revalidate: shopCacheSeconds },
);

export async function getShopPage(category: string, page: number) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const key = `${category}:${safePage}`;
  const pending = shopPageInflight.get(key);
  if (pending) return pending;

  const request = cachedShopPage(category, safePage).finally(() => {
    shopPageInflight.delete(key);
  });
  shopPageInflight.set(key, request);
  return request;
}

export async function getTrendingShops() {
  const page = await getShopPage("All", 1);
  return {
    shops: page.shops.slice(0, visibleRailSlots).map((shop) => ({
      seller_id: shop.seller_id,
      name: shop.name,
      avatar_url: shop.avatar_url,
      tiktok_unique_id: shop.tiktok_unique_id,
      day7_total_gmv: shop.day7_total_gmv,
      category: (shop as RankedShop).category,
    })),
  };
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
    return commerceCategoryGroups.map((group) => ({ category: group.name, available: true }));
  }

  return commerceCategoryGroups.flatMap((group) => [group.name, ...group.children]).map((category) => ({
    category,
    available: (creatorCategoryCounts[category] ?? 0) > 0,
    count: creatorCategoryCounts[category] ?? null,
  }));
}

async function loadShopPage(category: string, page: number): Promise<TikTokShopsResponse> {
  if (category === "All") return aggregateAllCategories(page);

  const workerUrl = new URL("/shops", shopsApiBaseUrl);
  workerUrl.searchParams.set("category", category);
  workerUrl.searchParams.set("page", String(page));
  const response = await fetch(workerUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${category} shops`);
  return response.json() as Promise<TikTokShopsResponse>;
}

async function aggregateAllCategories(page: number): Promise<TikTokShopsResponse> {
  const responses = await Promise.all(commerceParentCategories.map(async (category) => {
    const data = await getShopPage(category, 1);
    return data.shops.map((shop) => ({ ...shop, category }));
  }));
  const uniqueShops = new Map<string, RankedShop>();
  responses.flat().forEach((shop) => {
    if (!uniqueShops.has(shop.seller_id)) uniqueShops.set(shop.seller_id, shop);
  });
  const rankedShops = [...uniqueShops.values()].sort(
    (left, right) => (right.day7_total_gmv ?? -1) - (left.day7_total_gmv ?? -1),
  );
  const total = rankedShops.length;
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * allShopPageSize;

  return {
    category: "All",
    categories: commerceParentCategories,
    total,
    page: safePage,
    pageSize: allShopPageSize,
    totalPages,
    count: Math.min(allShopPageSize, Math.max(0, total - start)),
    shops: rankedShops.slice(start, start + allShopPageSize),
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
