import type { LifecycleState, Tool } from "./types";

const cap = (value: number, max: number) => Math.min(value / max, 1) * 100;

export function calculateMomentumScore(input: {
  growth24h: number;
  growth7d: number;
  mentions: number;
  creatorMentions: number;
  saves: number;
  workflowInclusions: number;
}) {
  const normalizedMentions = cap(input.mentions, 1800);
  const normalizedCreators = cap(input.creatorMentions, 150);
  const normalizedSaves = cap(input.saves, 30000);
  const normalizedWorkflows = cap(input.workflowInclusions, 10);

  return Math.round(
    input.growth24h * 0.3 +
      input.growth7d * 0.2 +
      normalizedMentions * 0.2 +
      normalizedCreators * 0.15 +
      normalizedSaves * 0.1 +
      normalizedWorkflows * 0.05
  );
}

export function getLifecycle(tool: Pick<Tool, "growth24h" | "growth7d" | "mentions24h" | "mentions7d" | "momentumScore" | "launchDate">): LifecycleState {
  const launchAge = Date.now() - new Date(tool.launchDate).getTime();
  const daysOld = launchAge / 86400000;

  if (tool.growth24h < -8 || tool.growth7d < -12) return "Cooling Off";
  if (daysOld > 900 && tool.growth24h > 24 && tool.growth7d > 35) return "Reviving";
  if (tool.growth24h > 42 && tool.momentumScore < 86 && tool.mentions24h < 1400) return "Breaking Out";
  if (tool.momentumScore > 88 && tool.mentions24h > 1300) return "Peak Hype";
  if (tool.momentumScore > 70 && Math.abs(tool.growth24h) < 10) return "Stabilizing";
  if (tool.momentumScore > 48 && tool.growth24h > 15) return "Accelerating";
  return "Emerging";
}

export function isBreakingOut(tool: Tool) {
  return tool.listingStatus === "accepted" && tool.breakoutScore >= 58 && tool.sizeClass !== "Mega";
}

export function normalizeProductDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function canonicalizeProductName(name: string) {
  const normalizedName = normalizeProductDisplayName(name);
  const compact = normalizedName.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(ai|app|tool)\b/g, "").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    "anthropic claude": "Claude",
    claude: "Claude",
    "openai chatgpt": "ChatGPT",
    chatgpt: "ChatGPT",
    "midjourney": "Midjourney",
    "midjourney ai": "Midjourney",
    "google notebooklm": "NotebookLM",
    notebooklm: "NotebookLM",
    "xai grok": "Grok",
    grok: "Grok"
  };

  return aliases[compact] ?? normalizedName;
}

export function movementClass(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}
