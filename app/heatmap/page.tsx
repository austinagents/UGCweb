import { CommerceHeatmapExplorer } from "@/components/commerce-heatmap-explorer";
import { heatmapMarkets } from "@/lib/heatmap-markets";
import { getCreatorPage, getShopPage } from "@/lib/server/commerce-read";
import type { TikTokShop } from "@/lib/types";
import { productImagesForCategory } from "@/lib/category-product-images";

export const dynamic = "force-dynamic";

export default async function HeatmapPage({ searchParams }: { searchParams?: { market?: string; bucket?: string; view?: string } }) {
  const [total, productCard, live, video] = await Promise.all([
    getShopPage(null, "30d", "total_gmv", 1),
    getShopPage(null, "30d", "product_card_gmv", 1),
    getShopPage(null, "30d", "live_gmv", 1),
    getShopPage(null, "30d", "video_gmv", 1),
  ]);
  const used = new Set<string>();
  const takeUnique = (shops: TikTokShop[], count: number) => shops
    .filter((shop) => !used.has(shop.shop_id) && shop.shop_name)
    .slice(0, count)
    .map((shop) => (used.add(shop.shop_id), shop));

  const sidebarGroups = [
    { title: "Breaking out now", icon: "activity" as const, shops: takeUnique(total.shops, 5) },
    { title: "Fastest creator adoption", icon: "users" as const, shops: takeUnique(total.shops, 5) },
    { title: "Product Card Leaders", icon: "product" as const, shops: takeUnique(productCard.shops, 5) },
    { title: "LIVE Commerce Leaders", icon: "live" as const, shops: takeUnique(live.shops, 5) },
    { title: "Attention rotation", icon: "rotation" as const, shops: takeUnique(video.shops, 5) },
  ];
  const creatorPool = (await getCreatorPage("All", 1, 75)).creators;
  const productImages = Object.fromEntries(heatmapMarkets.flatMap((market) => market.buckets.slice(0, 5)).map((bucket) => [bucket, productImagesForCategory(bucket)]));

  const initialQuery = searchParams?.bucket ?? searchParams?.market ?? "";
  return <CommerceHeatmapExplorer key={`${searchParams?.market ?? "all"}:${searchParams?.bucket ?? "all"}:${searchParams?.view ?? "default"}`} markets={heatmapMarkets} sidebarGroups={sidebarGroups} creatorPool={creatorPool} productImages={productImages} initialQuery={initialQuery} initialBucket={searchParams?.bucket ?? ""} />;
}
