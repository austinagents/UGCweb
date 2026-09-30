import { commerceParentCategories } from "@/lib/commerce-categories";
import type { TikTokShop, TikTokShopsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const SHOPS_API_BASE_URL =
  process.env.SHOPS_API_BASE_URL ??
  "https://tiktok-shop-screener-api.austindtaylor7.workers.dev";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "Sports & Outdoors";
  const page = searchParams.get("page") ?? "1";

  try {
    if (category === "All") return aggregateAllCategories(page);

    const workerUrl = new URL("/shops", SHOPS_API_BASE_URL);
    workerUrl.searchParams.set("category", category);
    workerUrl.searchParams.set("page", page);

    const response = await fetch(workerUrl, { cache: "no-store" });
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json"
      }
    });
  } catch (error) {
    console.error("TikTok Shop API request failed", error);
    return Response.json({ error: "Failed to reach shops API" }, { status: 500 });
  }
}

async function aggregateAllCategories(requestedPage: string) {
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(requestedPage, 10) || 1);
  const responses = await Promise.all(commerceParentCategories.map(async (category) => {
    const workerUrl = new URL("/shops", SHOPS_API_BASE_URL);
    workerUrl.searchParams.set("category", category);
    workerUrl.searchParams.set("page", "1");

    const response = await fetch(workerUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${category} shops`);
    const data = await response.json() as TikTokShopsResponse;
    return data.shops.map((shop) => ({ ...shop, category }));
  }));

  const uniqueShops = new Map<string, TikTokShop & { category: string }>();
  responses.flat().forEach((shop) => {
    if (!uniqueShops.has(shop.seller_id)) uniqueShops.set(shop.seller_id, shop);
  });

  const rankedShops = [...uniqueShops.values()].sort(
    (left, right) => (right.day7_total_gmv ?? -1) - (left.day7_total_gmv ?? -1)
  );
  const total = rankedShops.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return Response.json({
    category: "All",
    categories: commerceParentCategories,
    total,
    page: safePage,
    pageSize,
    totalPages,
    count: Math.min(pageSize, Math.max(0, total - start)),
    shops: rankedShops.slice(start, start + pageSize)
  });
}
