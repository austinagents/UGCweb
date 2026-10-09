import { getShopPage, getTrendingShops } from "@/lib/server/commerce-read";
import { tiktokShopCategories } from "@/lib/commerce-categories";
import type { ShopRankingMetric, ShopRankingWindow } from "@/lib/types";
import { isCommerceHeatmapCategory } from "@/lib/commerce-heatmap-categories";
import { shopIdsForHeatmapCategory } from "@/lib/server/commerce-heatmap-affiliations";

export const dynamic = "force-dynamic";

const responseCacheControl = "public, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryIds = validCategoryIds(searchParams.get("category_id"));
  const window = validWindow(searchParams.get("window"));
  const metric = validMetric(searchParams.get("metric"));
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const requestedHeatmapCategory = searchParams.get("heatmap_category");
  const heatmapCategory = isCommerceHeatmapCategory(requestedHeatmapCategory) ? requestedHeatmapCategory : null;

  try {
    const data = searchParams.get("view") === "trending"
      ? await getTrendingShops(categoryIds, window, metric)
      : await getShopPage(heatmapCategory ? null : categoryIds, window, metric, page, heatmapCategory ? shopIdsForHeatmapCategory(heatmapCategory) : null, heatmapCategory);
    return Response.json(data, {
      headers: { "Cache-Control": responseCacheControl },
    });
  } catch (error) {
    console.error("TikTok Shop API request failed", error);
    return Response.json({ error: "Failed to reach shops API" }, { status: 500 });
  }
}

function validCategoryIds(value: string | null) {
  if (!value || value === "all") return null;
  const validIds = new Set(tiktokShopCategories.map((category) => category.id));
  const requestedIds = value.split(",").filter((id) => validIds.has(id as typeof tiktokShopCategories[number]["id"]));
  return requestedIds.length > 0 ? requestedIds : null;
}

function validWindow(value: string | null): ShopRankingWindow {
  return value === "1d" || value === "30d" ? value : "7d";
}

function validMetric(value: string | null): ShopRankingMetric {
  if (value === "product_card_gmv" || value === "live_gmv" || value === "video_gmv") return value;
  return "total_gmv";
}
