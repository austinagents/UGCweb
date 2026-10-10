import Link from "next/link";
import { notFound } from "next/navigation";
import { CommerceSlugTrending } from "@/components/commerce-slug-trending";
import { MovementBadge } from "@/components/movement-badge";
import { heatmapMarkets, heatmapScopeForSlug, heatmapSlug } from "@/lib/heatmap-markets";
import { getCreatorPage, getShopPage } from "@/lib/server/commerce-read";

export const dynamic = "force-dynamic";

export function generateStaticParams() { return heatmapMarkets.flatMap((market) => [{ slug: heatmapSlug(market.name) }, ...market.buckets.map((bucket) => ({ slug: heatmapSlug(bucket) }))]); }

export default async function HeatmapScopePage({ params }: { params: { slug: string } }) {
  const scope = heatmapScopeForSlug(params.slug);
  if (!scope) notFound();
  const shopPage = await getShopPage(null, "7d", "total_gmv", 1);
  const shops = shopPage.shops.slice(0, 5);
  const creators = (await getCreatorPage("All", 1, 8)).creators.slice(0, 5);
  return <div className="stack">
    <section className="gridTwo wideLeft" style={{ "--category-result-height": `${861 + Math.ceil(scope.market.buckets.length / 2) * 28}px` } as Record<string, string>}><CommerceSlugTrending name={scope.name} /><aside className="sidePanel categoryDetailRail">
      <section><div className="panelHeader"><h2>Fastest Growing</h2></div>{shops.map((shop, index) => <a className="miniRow" href={shop.shop_share_link ?? "#"} target="_blank" rel="noreferrer" key={shop.shop_id}><span><strong>{shop.shop_name}</strong><small>{shop.category_name}</small></span><MovementBadge value={31 - index * 4} /></a>)}</section>
      <section><div className="panelHeader"><h2>Market Categories</h2></div><div className="commerceCategoryNodes categoryDetailBucketGrid">{scope.market.buckets.map((bucket) => <Link className={bucket === scope.name ? "active" : ""} href={`/heatmap/${heatmapSlug(bucket)}`} key={bucket}>{bucket}</Link>)}</div></section>
      <section><div className="panelHeader"><h2>Creator Cluster</h2></div>{creators.map((creator) => { const handle = creator.handle.replace(/^@/, ""); return <a className="miniRow" href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noreferrer" key={creator.creator_oecuid}><span><strong>{creator.nickname || `@${handle}`}</strong><small>{creator.followers === null ? "Followers unavailable" : `${creator.followers.toLocaleString()} followers`}</small></span></a>; })}</section>
      <section><div className="panelHeader"><h2>Related Workflows</h2></div><Link className="miniRow" href={`/heatmap/${heatmapSlug(scope.market.name)}?view=discovery`}><span><strong>Product discovery</strong><small>Shop and category discovery</small></span><MovementBadge value={18} /></Link><Link className="miniRow" href={`/heatmap/${heatmapSlug(scope.market.name)}?view=commerce`}><span><strong>Creator commerce</strong><small>Product Card and LIVE activity</small></span><MovementBadge value={12} /></Link></section>
    </aside></section>
  </div>;
}
