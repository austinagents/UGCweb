import { getClassificationShopPage, getShopPage, getTrendingShops } from "@/lib/server/commerce-read";
import { tiktokShopCategories } from "@/lib/commerce-categories";
import type { ShopRankingMetric, ShopRankingWindow } from "@/lib/types";
import { isCommerceHeatmapCategory } from "@/lib/commerce-heatmap-categories";
import { edgeCachedJson } from "@/lib/server/edge-cache";
import { getPartnerlinksSourceIdsForVisibleSubtree, resolvePartnerlinksVisibleClassification } from "@/lib/partnerlinks-taxonomy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classificationIdsRequest = resolveClassificationIds(searchParams.get("classification_ids"));
  if (classificationIdsRequest.status === "invalid") {
    return Response.json({ error: "Unknown or excluded classification" }, { status: 400 });
  }
  const classificationRequest = resolvePartnerlinksVisibleClassification(searchParams.get("classification_id"));
  if (classificationRequest.status === "invalid") {
    return Response.json({ error: "Unknown or excluded classification" }, { status: 400 });
  }
  const requestedClassification = classificationRequest.category;
  const requestedClassifications = classificationIdsRequest.categories;
  const categoryIds = requestedClassification
    ? getPartnerlinksSourceIdsForVisibleSubtree(requestedClassification.id)
    : validCategoryIds(searchParams.get("category_id"));
  const window = validWindow(searchParams.get("window"));
  const metric = validMetric(searchParams.get("metric"));
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const requestedHeatmapCategory = searchParams.get("heatmap_category");
  const heatmapCategory = !requestedClassification && !requestedClassifications.length && isCommerceHeatmapCategory(requestedHeatmapCategory) ? requestedHeatmapCategory : null;

  try {
    return edgeCachedJson(request, { edgeTtlSeconds: 120, cacheVersion: "category-activity-v2" }, () => searchParams.get("view") === "trending"
      ? getTrendingShops(categoryIds, window, metric)
      : requestedClassifications.length
        ? getClassificationShopPage(requestedClassifications.map((category) => category.id), window, metric, page, requestedHeatmapCategory ?? "Selected category")
      : requestedClassification
        ? getClassificationShopPage(requestedClassification.id, window, metric, page, requestedClassification.name)
      : getShopPage(heatmapCategory ? null : categoryIds, window, metric, page, heatmapCategory, heatmapCategory));
  } catch (error) {
    console.error("TikTok Shop API request failed", error);
    return Response.json({ error: "Failed to reach shops API" }, { status: 500 });
  }
}

function resolveClassificationIds(value: string | null) {
  if (!value) return { status: "ok" as const, categories: [] };
  const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length || ids.length > 32) return { status: "invalid" as const, categories: [] };
  const categories = ids.map((id) => resolvePartnerlinksVisibleClassification(id));
  if (categories.some((result) => result.status !== "valid" || !result.category)) return { status: "invalid" as const, categories: [] };
  return { status: "ok" as const, categories: categories.map((result) => result.category!) };
}

function validCategoryIds(value: string | null) {
  if (!value || value === "all") return null;
  const validIds = new Set(tiktokShopCategories.map((category) => category.id));
  const requestedIds = value.split(",").filter((id) => validIds.has(id as typeof tiktokShopCategories[number]["id"]));
  return requestedIds.length > 0 ? requestedIds : null;
}

function validWindow(value: string | null): ShopRankingWindow {
  return value === "1d" || value === "7d" ? value : "30d";
}

function validMetric(value: string | null): ShopRankingMetric {
  if (value === "product_card_gmv" || value === "live_gmv" || value === "video_gmv") return value;
  return "total_gmv";
}
