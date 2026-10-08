"use client";

import { Activity, Layers3, Package, Radio, Search, Store, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { HeatmapMarket } from "@/lib/heatmap-markets";
import { heatmapSlug } from "@/lib/heatmap-markets";
import type { TikTokShop } from "@/lib/types";
import type { CreatorListRow } from "@/lib/creator-screener";
import { ProductImageStack } from "@/components/product-image-stack";
import { productImagesForCategory } from "@/lib/category-product-images";

type SidebarGroup = { title: string; icon: "activity" | "users" | "product" | "live" | "rotation"; shops: TikTokShop[] };
const marketColors = ["#70b7ad", "#b38bd4", "#d28b9c", "#d5a15a", "#7fa9d8", "#81b77a", "#6da8b7", "#cb8e70", "#8aaa64", "#d09a76", "#9a83cf", "#d2aa70", "#6db09f", "#79a0c9", "#b18ab8"];
const mockMovements = [42, 31, 24, 18, 11] as const;
const mockCreatorSignals = [214, 168, 128, 103, 86] as const;

export function CommerceHeatmapExplorer({ markets, sidebarGroups, creatorPool, initialQuery, initialBucket }: { markets: readonly HeatmapMarket[]; sidebarGroups: SidebarGroup[]; creatorPool: CreatorListRow[]; initialQuery: string; initialBucket: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMarkets = useMemo(() => markets.map((market) => {
    if (!normalizedQuery) return market;
    const parentMatches = market.name.toLowerCase().includes(normalizedQuery);
    const exactBucketFocus = initialBucket && normalizedQuery === initialBucket.toLowerCase();
    return { ...market, buckets: parentMatches ? market.buckets : market.buckets.filter((bucket) => exactBucketFocus ? bucket === initialBucket : bucket.toLowerCase().includes(normalizedQuery)) };
  }).filter((market) => market.buckets.length > 0), [initialBucket, markets, normalizedQuery]);

  return <div className="heatmapExplorerPage">
    <section className="heatmapControlRow"><div className="heatmapControls" aria-label="Heatmap controls">
      <span>All ecosystems</span>
      <label className="heatmapSearch"><Search size={13} /><input aria-label="Search markets and buckets" placeholder="Search map" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div></section>
    <section className="heatmapExplorerLayout">
      <main className="ecosystemMapSurface">
        {filteredMarkets.map((market) => {
          const marketIndex = markets.findIndex((item) => item.name === market.name);
          const showAll = Boolean(expanded[market.name]) || Boolean(normalizedQuery);
          const visibleBuckets = showAll ? market.buckets : market.buckets.slice(0, 5);
          const marketCreators = Array.from({ length: 5 }, (_, index) => creatorPool[(marketIndex * 5 + index) % creatorPool.length]).filter(Boolean);
          return <section className="ecosystemCluster" style={{ "--cluster-color": marketColors[marketIndex] } as Record<string, string>} key={market.name}>
            <header><div><Link className="heatmapMarketTitle" href={`/heatmap/${heatmapSlug(market.name)}`}>{market.name}</Link><small>{market.buckets.length} approved buckets</small></div></header>
            <div className="clusterToolGrid">{visibleBuckets.map((bucket) => {
              const products = productImagesForCategory(bucket);
              return <Link className="ecosystemToolNode commerceBucketRow" href={`/heatmap/${heatmapSlug(bucket)}`} title={`Open ${bucket}`} key={bucket}>
                {products.length ? <ProductImageStack products={products} /> : <span className="shopAvatarFallback heatmapBucketIcon" aria-hidden="true"><Store size={15} /></span>}
                <span><strong>{bucket}</strong><small>Shop results</small></span>
              </Link>;
            })}</div>
            {!normalizedQuery && market.buckets.length > 5 ? <button className="heatmapShowAll" type="button" onClick={() => setExpanded((current) => ({ ...current, [market.name]: !current[market.name] }))}>{showAll ? "Show Less" : `Show All (${market.buckets.length})`}</button> : null}
            <div className="clusterMetaLayer">
              <div className="creatorDensityLayer"><span>{creatorSignalCount(marketIndex, market.buckets.length)} creator signals</span><div>{marketCreators.map((creator) => { const handle = creator.handle.replace(/^@/, ""); return <a href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noreferrer" aria-label={creator.nickname || handle} key={creator.creator_oecuid}><CreatorCommerceAvatar creator={creator} /></a>; })}</div></div>
              <div className="workflowLayer">
                <Link href={`/heatmap/${heatmapSlug(market.name)}?view=discovery`}><Package size={20} /><span>Product discovery · Creator partnerships</span></Link>
                <Link href={`/heatmap/${heatmapSlug(market.name)}?view=commerce`}><Radio size={20} /><span>Product Card · LIVE commerce</span></Link>
              </div>
            </div>
          </section>;
        })}
        {filteredMarkets.length === 0 ? <section className="ecosystemCluster heatmapEmptyState"><strong>No markets or buckets match “{query}”.</strong></section> : null}
      </main>
      <aside className="heatmapIntelRail">
        {sidebarGroups.map((group, groupIndex) => <IntelCard title={group.title} icon={<SidebarIcon name={group.icon} />} key={group.title}>
          {group.shops.map((shop, index) => <ShopSignalRow shop={shop} detail={sidebarDetail(groupIndex, shop, index)} value={sidebarValue(groupIndex, shop, index)} key={`${group.title}:${shop.shop_id}`} />)}
        </IntelCard>)}
      </aside>
    </section>
  </div>;
}

function sidebarDetail(groupIndex: number, shop: TikTokShop, index: number) {
  if (groupIndex < 2) return shop.category_name;
  if (groupIndex === 2) return shop.current_rank ? `Product Card rank #${shop.current_rank}` : "Product Card rank unavailable";
  if (groupIndex === 3) return shop.current_rank ? `LIVE rank #${shop.current_rank}` : "LIVE rank unavailable";
  return shop.current_rank ? `Video rank #${shop.current_rank}` : "Video rank unavailable";
}

function sidebarValue(groupIndex: number, shop: TikTokShop, index: number) {
  if (groupIndex === 0) return `↑ ${mockMovements[index]}`;
  if (groupIndex === 1) return `${mockCreatorSignals[index]}`;
  return `#${shop.current_rank ?? "—"}`;
}

function SidebarIcon({ name }: { name: SidebarGroup["icon"] }) {
  if (name === "users") return <Users size={14} />;
  if (name === "product") return <Package size={14} />;
  if (name === "live") return <Radio size={14} />;
  if (name === "rotation") return <Layers3 size={14} />;
  return <Activity size={14} />;
}

function IntelCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="heatmapIntelCard"><h2>{icon}{title}</h2><div>{children}</div></section>;
}

function ShopSignalRow({ shop, detail, value }: { shop: TikTokShop; detail: string; value: string }) {
  const content = <><ShopAvatar shop={shop} size={24} /><span><strong>{shop.shop_name ?? "Unknown Shop"}</strong><small>{detail}</small></span><em className="heatmapRankBadge">{value}</em></>;
  return shop.shop_share_link ? <a href={shop.shop_share_link} className="toolSignalRow" target="_blank" rel="noreferrer">{content}</a> : <div className="toolSignalRow">{content}</div>;
}

function ShopAvatar({ shop, size }: { shop: TikTokShop; size: number }) {
  return <span className="shopAvatarFallback heatmapShopLogo" style={{ width: size, height: size }} aria-hidden="true">{initials(shop.shop_name)}{shop.shop_thumb_image_url ? <img src={shop.shop_thumb_image_url} alt="" width={size} height={size} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}</span>;
}

function CreatorCommerceAvatar({ creator }: { creator: CreatorListRow }) {
  return <span className="shopAvatarFallback heatmapShopLogo" style={{ width: 20, height: 20 }} aria-hidden="true"><Users size={11} />{creator.avatar ? <img src={creator.avatar} alt="" width={20} height={20} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}</span>;
}

function creatorSignalCount(index: number, bucketCount: number) {
  return 28 + bucketCount * 3 + (index * 17) % 61;
}

function initials(name: string | null) {
  return (name ?? "Shop").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
