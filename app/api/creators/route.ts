import { NextRequest, NextResponse } from "next/server";
import { tiktokShopCategories, type TikTokShopCategoryName } from "@/lib/commerce-categories";
import { getCreatorPage, getTrendingCreators } from "@/lib/server/commerce-read";

type ScreenerCategory = "All" | TikTokShopCategoryName;

const responseCacheControl = "public, s-maxage=300, stale-while-revalidate=600";
const validCategories = new Set<string>([
  "All",
  ...tiktokShopCategories.map((category) => category.name),
]);

export function GET(request: NextRequest) {
  const requestedCategory = request.nextUrl.searchParams.get("category") ?? "All";
  const category = (validCategories.has(requestedCategory) ? requestedCategory : "All") as ScreenerCategory;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize")) || 100;
  const response = request.nextUrl.searchParams.get("view") === "trending"
    ? getTrendingCreators(category)
    : getCreatorPage(category, page, pageSize);

  return NextResponse.json(response, {
    headers: { "Cache-Control": responseCacheControl },
  });
}
