import { NextRequest } from "next/server";
import { commerceNavigationCategories, type CommerceNavigationCategoryName } from "@/lib/commerce-categories";
import { getCreatorPage, getTrendingCreators } from "@/lib/server/commerce-read";
import { isCommerceHeatmapCategory } from "@/lib/commerce-heatmap-categories";
import { edgeCachedJson } from "@/lib/server/edge-cache";

type ScreenerCategory = "All" | CommerceNavigationCategoryName;

const validCategories = new Set<string>([
  "All",
  ...commerceNavigationCategories.map((category) => category.name),
]);

export async function GET(request: NextRequest) {
  const requestedCategory = request.nextUrl.searchParams.get("category") ?? "All";
  const category = (validCategories.has(requestedCategory) ? requestedCategory : "All") as ScreenerCategory;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize")) || 100;
  const requestedHeatmapCategory = request.nextUrl.searchParams.get("heatmap_category");
  const heatmapCategory = isCommerceHeatmapCategory(requestedHeatmapCategory) ? requestedHeatmapCategory : null;
  return edgeCachedJson(request, { edgeTtlSeconds: 300 }, () => request.nextUrl.searchParams.get("view") === "trending"
    ? getTrendingCreators(category)
    : getCreatorPage(category, page, pageSize, heatmapCategory));
}
