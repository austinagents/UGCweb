"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { tools } from "@/lib/data";
import { loadCommerceQuery, readCommerceQuery } from "@/lib/commerce-query-cache";
import type { CommerceCategory } from "@/lib/commerce-categories";
import type { CreatorTrendingResponse, CreatorTrendingRow } from "@/lib/creator-screener";
import { defaultTikTokShopCategoryId } from "@/lib/commerce-categories";
import type { TikTokShop } from "@/lib/types";

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const safeSponsoredTextColor = "#789F99";
const temporaryDiscoverySlotSlug = "clocsy";
type TrendingShopsResponse = { shops: TikTokShop[] };

export const INDUSTRY_LEADER_EXCLUSIONS = [
  "chatgpt", "claude", "perplexity", "cursor", "windsurf", "lovable", "replit", "runway", "kling", "pika",
  "elevenlabs", "midjourney", "ideogram", "heygen", "synthesia", "notion-ai", "zapier", "gamma", "v0", "bolt",
  "linear", "capcut", "descript", "suno", "notebooklm", "grok", "clay", "jasper", "glean", "make", "framer-ai",
  "vercel", "n8n", "apollo", "framer", "slack", "hubspot", "linkedin", "google-maps", "manus", "udio", "granola",
  "lindy", "tome", "typefully", "instantly", "taplio"
] as const;

const industryLeaderExclusions = new Set<string>(INDUSTRY_LEADER_EXCLUSIONS);
const sponsoredBrandColors: Record<string, string> = { "biela-dev": "#4ADE80", clocsy: "#16F1FD" };
const discoveryCandidateTools = tools.filter((tool) => tool.name && tool.slug && !industryLeaderExclusions.has(tool.slug));

function utcDayIndex(date = new Date()) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / millisecondsPerDay);
}

function discoveryCandidateForDay(dayIndex = utcDayIndex()) {
  return discoveryCandidateTools[dayIndex % discoveryCandidateTools.length];
}

function sponsoredBrandColorFor(slug: string) {
  return sponsoredBrandColors[slug] ?? safeSponsoredTextColor;
}

function DiscoverySlotName({ name }: { name: string }) {
  return <span>{name.toUpperCase()}</span>;
}

export function PromotedMomentumRail({ mode = "shops", category = "All" }: { mode?: "shops" | "creators"; category?: "All" | CommerceCategory }) {
  const [shops, setShops] = useState<TikTokShop[]>([]);
  const [creators, setCreators] = useState<CreatorTrendingRow[]>([]);
  const discoveryCandidate = tools.find((tool) => tool.slug === temporaryDiscoverySlotSlug) ?? discoveryCandidateForDay();
  const discoveryHref = discoveryCandidate?.websiteUrl || `/tools/${discoveryCandidate?.slug}`;
  const discoveryIsExternal = Boolean(discoveryCandidate?.websiteUrl);
  const discoveryLinkProps = discoveryIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

  useEffect(() => {
    if (mode !== "shops") return;
    let cancelled = false;
    const key = "shops:trending";
    const url = `/api/shops?view=trending&category_id=${defaultTikTokShopCategoryId}&window=7d&metric=total_gmv`;
    const cached = readCommerceQuery<TrendingShopsResponse>(key);
    if (cached) setShops(cached.data.shops);
    loadCommerceQuery<TrendingShopsResponse>(key, url, cached?.stale ?? false)
      .then((data) => { if (!cancelled) setShops(data.shops); })
      .catch(() => {
        if (!cancelled && !cached) setShops([]);
      });
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    if (mode !== "creators") return;
    let cancelled = false;
    const key = `creators:trending:${category}`;
    const url = `/api/creators?view=trending&category=${encodeURIComponent(category)}`;
    const cached = readCommerceQuery<CreatorTrendingResponse>(key, 300_000);
    if (cached) setCreators(cached.data.creators);
    else setCreators([]);
    loadCommerceQuery<CreatorTrendingResponse>(key, url, cached?.stale ?? false)
      .then((data) => { if (!cancelled) setCreators(data.creators); })
      .catch(() => {
        if (!cancelled && !cached) setCreators([]);
      });
    return () => { cancelled = true; };
  }, [category, mode]);

  const railItems = shops.length > 0 ? [...shops, ...shops] : [];
  const creatorRailItems = creators.length > 0 ? [...creators, ...creators] : [];

  return (
    <section className="promotedRail" aria-label={`Trending TikTok ${mode === "shops" ? "Shops" : "Creators"}`} aria-busy={mode === "shops" && shops.length === 0}>
      {discoveryCandidate ? (
        <a
          className="railLabel railAdSlot"
          aria-label={`Discovery candidate: ${discoveryCandidate.name}`}
          href={discoveryHref}
          style={{ "--rail-ad-brand-color": sponsoredBrandColorFor(discoveryCandidate.slug) } as CSSProperties}
          {...discoveryLinkProps}
        >
          <DiscoverySlotName name={discoveryCandidate.name} />
        </a>
      ) : null}
      <div className="railViewport">
        <div className={`railTrack ${mode === "creators" && creatorRailItems.length === 0 ? "railEmptyTrack" : ""}`}>
          {mode === "creators" ? creatorRailItems.length > 0 ? creatorRailItems.map((creator, index) => {
            const itemRank = index % creators.length;
            const handle = creator.handle.replace(/^@/, "");
            const displayName = creator.nickname || `@${handle}`;
            return (
              <a className={`railItem creatorRailItem${itemRank < 3 ? " leader" : ""}`} href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noopener noreferrer" key={`${creator.creator_oecuid}-${index}`}>
                <span className="railRank">#{itemRank + 1}</span>
                <CreatorRailAvatar creator={creator} />
                <strong title={displayName}>{displayName}</strong>
                <small>{formatCreatorGmv(creator)}</small>
              </a>
            );
          }) : (
            <div className="railItem creatorRailEmpty"><strong>No collected creators in {category === "All" ? "this view" : category}</strong></div>
          ) : railItems.length > 0 ? railItems.map((shop, index) => {
            const itemRank = index % shops.length;
            const itemClassName = `railItem${itemRank < 3 ? " leader" : ""}`;
            const category = categoryContext(shop.shop_name, shop.category_name);
            const content = (
              <>
                <span className="railRank">#{itemRank + 1}</span>
                <ShopRailLogo shop={shop} />
                <strong title={shop.shop_name ?? "Unknown Shop"}>{shop.shop_name ?? "Unknown Shop"}</strong>
                {category ? <small>{category}</small> : null}
              </>
            );

            return shop.shop_share_link ? (
              <a
                className={itemClassName}
                href={shop.shop_share_link}
                key={`${shop.shop_id}:${shop.category_id}:${index}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            ) : (
              <div className={itemClassName} key={`${shop.shop_id}:${shop.category_id}:${index}`}>
                {content}
              </div>
            );
          }) : <div className="railItem railLoadingItem" aria-hidden="true"><strong>Loading trending shops…</strong></div>}
        </div>
      </div>
    </section>
  );
}

function CreatorRailAvatar({ creator }: { creator: CreatorTrendingRow }) {
  return (
    <span className="railShopLogo" aria-hidden="true">
      {initials(creator.nickname || creator.handle)}
      {creator.avatar ? <img src={creator.avatar} alt="" width={28} height={28} loading="eager" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
  );
}

function formatCreatorGmv(creator: CreatorTrendingRow) {
  if (creator.med_gmv_revenue !== null) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(creator.med_gmv_revenue);
  }
  return creator.med_gmv_revenue_range ?? "GMV unavailable";
}

function ShopRailLogo({ shop }: { shop: TikTokShop }) {
  return (
    <span className="railShopLogo" aria-hidden="true">
      {initials(shop.shop_name)}
      {shop.shop_thumb_image_url ? <img src={shop.shop_thumb_image_url} alt="" width={28} height={28} loading="eager" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
  );
}

function categoryContext(shopName: string | null, category?: string) {
  if (!category) return null;
  const shopTokens = new Set(words(shopName ?? ""));
  const categoryTokens = words(category).filter((word) => word !== "and");
  return categoryTokens.some((word) => shopTokens.has(word)) ? null : category;
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") ? word.slice(0, -1) : word);
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
