"use client";

import type { CSSProperties } from "react";
import { twentyFourHourDisplayPercentageForSlug } from "@/components/home-trending-filter";
import { tools } from "@/lib/data";
import { ToolLogo } from "./tool-logo";

const visibleRailSlots = 8;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const safeSponsoredTextColor = "#789F99";
const temporaryDiscoverySlotSlug = "clocsy";

export const INDUSTRY_LEADER_EXCLUSIONS = [
  "chatgpt",
  "claude",
  "perplexity",
  "cursor",
  "windsurf",
  "lovable",
  "replit",
  "runway",
  "kling",
  "pika",
  "elevenlabs",
  "midjourney",
  "ideogram",
  "heygen",
  "synthesia",
  "notion-ai",
  "zapier",
  "gamma",
  "v0",
  "bolt",
  "linear",
  "capcut",
  "descript",
  "suno",
  "notebooklm",
  "grok",
  "clay",
  "jasper",
  "glean",
  "make",
  "framer-ai",
  "vercel",
  "n8n",
  "apollo",
  "framer",
  "slack",
  "hubspot",
  "linkedin",
  "google-maps",
  "manus",
  "udio",
  "granola",
  "lindy",
  "tome",
  "typefully",
  "instantly",
  "taplio"
] as const;

const industryLeaderExclusions = new Set<string>(INDUSTRY_LEADER_EXCLUSIONS);
const sponsoredBrandColors: Record<string, string> = {
  "biela-dev": "#4ADE80",
  clocsy: "#16F1FD"
};
type MomentumRailItem = {
  tool: (typeof tools)[number];
  placement: { momentumLift: number } | null;
  railScore: number;
  sponsored: boolean;
  label: string;
};

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

const momentumRailToolSlugs = [
  "step-3-7-flash",
  "messari",
  "willow-scribe",
  "lindy",
  "wingbits-ai",
  "higgsfield",
  "trendspider",
  "fireflies-ai"
] as const;

const toolsBySlug = new Map(tools.map((tool) => [tool.slug, tool]));
const momentumRailItems = momentumRailToolSlugs
  .flatMap((slug) => toolsBySlug.get(slug) ?? [])
  .map((tool) => ({ tool, placement: null, railScore: tool.organicTrendingScore }));

function DiscoverySlotName({ name }: { name: string }) {
  return <span>{name.toUpperCase()}</span>;
}

export function PromotedMomentumRail() {
  const discoveryCandidate = tools.find((tool) => tool.slug === temporaryDiscoverySlotSlug) ?? discoveryCandidateForDay();
  const discoveryHref = discoveryCandidate?.websiteUrl || `/tools/${discoveryCandidate?.slug}`;
  const discoveryIsExternal = Boolean(discoveryCandidate?.websiteUrl);
  const discoveryLinkProps = discoveryIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const railItems: MomentumRailItem[] = momentumRailItems.map((item) => ({ ...item, sponsored: false, label: item.tool.organicRankingLabel }));

  return (
    <section className="promotedRail" aria-label="Promoted momentum rail">
      {discoveryCandidate ? (
        <a
          className="railLabel railAdSlot"
          aria-label={`Discovery candidate: ${discoveryCandidate.name}`}
          href={discoveryHref}
          style={
            {
              "--rail-ad-brand-color": sponsoredBrandColorFor(discoveryCandidate.slug)
            } as CSSProperties
          }
          {...discoveryLinkProps}
        >
          <DiscoverySlotName name={discoveryCandidate.name} />
        </a>
      ) : (
        null
      )}
      <div className="railViewport">
        <div className="railTrack">
          {[...railItems, ...railItems].map((item, index) => {
            const itemRank = index % railItems.length;
            const itemClassName = `railItem${item.sponsored ? " sponsored" : ""}${itemRank < 3 ? " leader" : ""}`;
            const growth24h = twentyFourHourDisplayPercentageForSlug(item.tool.slug) ?? item.tool.growth24h;
            const content = (
              <>
                <span className="railRank">#{itemRank + 1}</span>
                <ToolLogo
                  officialSrc={item.tool.officialLogoUrl}
                  src={item.tool.logoUrl}
                  faviconSrc={item.tool.faviconUrl}
                  fallback={item.tool.iconUrl}
                  alt=""
                  size={24}
                />
                <strong>{item.tool.name}</strong>
                <em>+{item.sponsored ? item.placement?.momentumLift : growth24h}%</em>
              </>
            );

            return item.tool.websiteUrl ? (
              <a
                className={itemClassName}
                href={item.tool.websiteUrl}
                key={`${item.tool.slug}-${index}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            ) : (
              <div className={itemClassName} key={`${item.tool.slug}-${index}`}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
