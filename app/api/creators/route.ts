import { NextRequest } from "next/server";
import { commerceNavigationCategories, type CommerceNavigationCategoryName } from "@/lib/commerce-categories";
import { getClassificationCreatorPage, getCreatorPage, getTrendingCreators } from "@/lib/server/commerce-read";
import { isCommerceHeatmapCategory } from "@/lib/commerce-heatmap-categories";
import { edgeCachedJson } from "@/lib/server/edge-cache";
import { resolvePartnerlinksVisibleClassification } from "@/lib/partnerlinks-taxonomy";

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
  const classificationIdsRequest = resolveClassificationIds(request.nextUrl.searchParams.get("classification_ids"));
  if (classificationIdsRequest.status === "invalid") {
    return Response.json({ error: "Unknown or excluded classification" }, { status: 400 });
  }
  const classificationRequest = resolvePartnerlinksVisibleClassification(request.nextUrl.searchParams.get("classification_id"));
  if (classificationRequest.status === "invalid") {
    return Response.json({ error: "Unknown or excluded classification" }, { status: 400 });
  }
  const classification = classificationRequest.category;
  const heatmapCategory = !classification && !classificationIdsRequest.categories.length && isCommerceHeatmapCategory(requestedHeatmapCategory) ? requestedHeatmapCategory : null;
  return edgeCachedJson(request, { edgeTtlSeconds: 300 }, () => request.nextUrl.searchParams.get("view") === "trending"
    ? getTrendingCreators(category)
    : classificationIdsRequest.categories.length
      ? getClassificationCreatorPage(classificationIdsRequest.categories.map((category) => category.id), page, pageSize)
    : classification
      ? getClassificationCreatorPage(classification.id, page, pageSize)
      : getCreatorPage(category, page, pageSize, heatmapCategory));
}

function resolveClassificationIds(value: string | null) {
  if (!value) return { status: "ok" as const, categories: [] };
  const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length || ids.length > 32) return { status: "invalid" as const, categories: [] };
  const categories = ids.map((id) => resolvePartnerlinksVisibleClassification(id));
  if (categories.some((result) => result.status !== "valid" || !result.category)) return { status: "invalid" as const, categories: [] };
  return { status: "ok" as const, categories: categories.map((result) => result.category!) };
}
