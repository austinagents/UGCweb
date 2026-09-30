import type { PromotionPlacement, RankingMode, SizeClass, Tool } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const normalized = (value: number, max: number) => clamp((value / max) * 100);

const knownUserEstimates: Record<string, number> = {
  chatgpt: 180_000_000,
  claude: 22_000_000,
  perplexity: 18_000_000,
  midjourney: 20_000_000,
  capcut: 90_000_000,
  cursor: 800_000,
  runway: 900_000,
  elevenlabs: 1_500_000,
  "notion-ai": 8_000_000,
  zapier: 7_000_000,
  replit: 5_000_000,
  grok: 35_000_000
};

export function estimateUsers(input: { slug: string; mentions24h: number; mentions7d: number; savesCount: number; creatorMentions: number; searchInterest: number }) {
  if (knownUserEstimates[input.slug]) return knownUserEstimates[input.slug];
  return Math.max(
    4_000,
    Math.round(input.savesCount * 16 + input.mentions7d * 18 + input.creatorMentions * 850 + input.searchInterest * 1_250 + input.mentions24h * 9)
  );
}

export function sizeClassForUsers(users: number): SizeClass {
  if (users >= 50_000_000) return "Mega";
  if (users >= 1_000_000) return "Major";
  if (users >= 100_000) return "Growth";
  if (users >= 10_000) return "Emerging";
  return "Micro";
}

export function sizeClassDampener(sizeClass: SizeClass) {
  const dampeners: Record<SizeClass, number> = {
    Micro: 0.95,
    Emerging: 1.1,
    Growth: 1,
    Major: 0.8,
    Mega: 0.65
  };
  return dampeners[sizeClass];
}

export function baselineAttentionFor(input: { mentions7d: number; mentions24h: number; creatorMentions: number; workflowInclusions: number }) {
  const sevenDayAverage = Math.max(1, input.mentions7d / 7);
  const categorySignalFloor = input.creatorMentions * 3 + input.workflowInclusions * 18;
  return Math.round(Math.max(sevenDayAverage, categorySignalFloor, input.mentions24h * 0.42));
}

export function organicTrendingScoreFor(input: {
  growth24h: number;
  growth7d: number;
  mentions24h: number;
  mentions7d: number;
  creatorMentions: number;
  workflowInclusions: number;
  searchInterest: number;
  listingScore: number;
  sizeClass: SizeClass;
  launchDate: string;
}) {
  const baselineAttention = baselineAttentionFor(input);
  const relativeGrowthVsBaseline = input.mentions24h / Math.max(1, baselineAttention);
  const previousVelocity = Math.max(1, input.mentions7d / 7);
  const recentVelocity = input.mentions24h / previousVelocity;
  const acceleration = input.growth24h - input.growth7d / 7;
  const daysOld = (Date.now() - new Date(input.launchDate).getTime()) / 86400000;
  const freshnessEventBonus = daysOld < 90 ? 100 : daysOld < 365 ? 58 : input.growth24h > 24 ? 48 : 22;

  const raw =
    normalized(relativeGrowthVsBaseline, 4) * 0.3 +
    normalized(recentVelocity, 4) * 0.25 +
    normalized(input.creatorMentions, 130) * 0.15 +
    normalized(input.workflowInclusions, 8) * 0.1 +
    normalized(input.searchInterest + Math.max(0, acceleration), 140) * 0.1 +
    freshnessEventBonus * 0.05 +
    input.listingScore * 0.05;

  return {
    baselineAttention,
    relativeGrowthVsBaseline,
    recentVelocity,
    acceleration,
    organicTrendingScore: Math.round(clamp(raw * sizeClassDampener(input.sizeClass)))
  };
}

export function breakingOutScoreFor(tool: Pick<Tool, "growth24h" | "relativeGrowthVsBaseline" | "creatorMentions" | "workflowInclusions" | "launchDate" | "listingScore" | "sizeClass" | "listingStatus">) {
  if (tool.listingStatus !== "accepted" || tool.listingScore < 70 || tool.sizeClass === "Mega") return 0;
  const daysOld = (Date.now() - new Date(tool.launchDate).getTime()) / 86400000;
  const freshness = daysOld < 180 ? 100 : daysOld < 540 ? 55 : 30;

  return Math.round(clamp(
    normalized(tool.growth24h, 80) * 0.35 +
      normalized(tool.relativeGrowthVsBaseline, 4) * 0.25 +
      normalized(tool.creatorMentions, 90) * 0.15 +
      normalized(tool.workflowInclusions, 8) * 0.1 +
      freshness * 0.1 +
      tool.listingScore * 0.05
  ));
}

export function organicRankingLabel(tool: Pick<Tool, "sizeClass" | "growth24h" | "organicTrendingScore" | "breakoutScore" | "lifecycleState" | "launchDate">): RankingMode {
  const daysOld = (Date.now() - new Date(tool.launchDate).getTime()) / 86400000;
  if (tool.breakoutScore >= 58 && tool.sizeClass !== "Mega") return "Breaking Out";
  if (daysOld < 120) return "New";
  if (tool.sizeClass === "Mega" || tool.sizeClass === "Major") return "Blue Chips";
  if (tool.growth24h >= 35) return "Fastest Growing";
  return "Trending";
}

export function boostRailScoreFor(placement: PromotionPlacement, tool: Tool) {
  const boostTierWeight = normalized(placement.priorityWeight, 100);
  const campaignPerformance = normalized(placement.impressions * (placement.ctr / 100), 850);
  const freshnessScore = Date.now() - new Date(placement.startsAt).getTime() < 1000 * 60 * 60 * 24 * 3 ? 100 : 45;
  const ctrBonus = normalized(placement.ctr, 6);

  return Math.round(clamp(
    boostTierWeight * 0.7 +
      campaignPerformance * 0.1 +
      tool.organicTrendingScore * 0.08 +
      freshnessScore * 0.05 +
      tool.listingScore * 0.05 +
      ctrBonus * 0.02
  ));
}

export function rankingModeSort(tools: Tool[], mode: RankingMode) {
  const accepted = tools.filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed);
  if (mode === "Most Used") return [...accepted].sort((a, b) => b.estimatedUsers - a.estimatedUsers);
  if (mode === "Breaking Out") return [...accepted].filter((tool) => tool.breakoutScore > 0).sort((a, b) => b.breakoutScore - a.breakoutScore);
  if (mode === "Blue Chips") return [...accepted].filter((tool) => tool.sizeClass === "Major" || tool.sizeClass === "Mega").sort((a, b) => b.momentumScore - a.momentumScore);
  if (mode === "New") return [...accepted].sort((a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime());
  if (mode === "Fastest Growing") return [...accepted].sort((a, b) => b.growth24h - a.growth24h);
  if (mode === "Most Discussed") return [...accepted].sort((a, b) => b.mentions24h - a.mentions24h);
  if (mode === "Most Saved") return [...accepted].sort((a, b) => b.savesCount - a.savesCount);
  return [...accepted].sort((a, b) => b.organicTrendingScore - a.organicTrendingScore);
}
