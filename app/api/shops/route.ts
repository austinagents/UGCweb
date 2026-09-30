import { getShopPage, getTrendingShops } from "@/lib/server/commerce-read";

export const dynamic = "force-dynamic";

const responseCacheControl = "public, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "Sports & Outdoors";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  try {
    const data = searchParams.get("view") === "trending"
      ? await getTrendingShops()
      : await getShopPage(category, page);
    return Response.json(data, {
      headers: { "Cache-Control": responseCacheControl },
    });
  } catch (error) {
    console.error("TikTok Shop API request failed", error);
    return Response.json({ error: "Failed to reach shops API" }, { status: 500 });
  }
}
