import { ecosystemColorFor } from "./ecosystem-colors";
import type { CategoryName } from "./types";

export type AttentionHeatmapCluster =
  | "Trading & Markets"
  | "Growth & Sales"
  | "Daily Buzz"
  | "Builder Tools"
  | "Automation & Ops";

export type AttentionSubCategoryTag = {
  id: string;
  slug: string;
  label: string;
  cluster: AttentionHeatmapCluster;
  category: CategoryName;
  categories: CategoryName[];
  color: string;
};

const attentionTagSlug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const attentionTag = (
  label: string,
  cluster: AttentionHeatmapCluster,
  categories: CategoryName[]
): AttentionSubCategoryTag => {
  const slug = attentionTagSlug(label);

  return {
    id: `subcat_${slug.replace(/-/g, "_")}`,
    slug,
    label,
    cluster,
    category: categories[0],
    categories,
    color: ecosystemColorFor(categories[0])
  };
};

export const canonicalAttentionSubCategories: AttentionSubCategoryTag[] = [
  attentionTag("Trading Bots", "Trading & Markets", ["AI Trading", "AI Automation"]),
  attentionTag("Prediction Markets", "Trading & Markets", ["AI Trading"]),
  attentionTag("Market Analysis", "Trading & Markets", ["AI Trading", "AI Research"]),
  attentionTag("Whale Tracking", "Trading & Markets", ["AI Trading", "AI Research"]),
  attentionTag("Mass Email", "Growth & Sales", ["AI Automation"]),
  attentionTag("Lead Generation", "Growth & Sales", ["AI Automation", "AI Research"]),
  attentionTag("Cold Outreach", "Growth & Sales", ["AI Automation"]),
  attentionTag("Web Scraping", "Growth & Sales", ["AI Automation", "AI Research"]),
  attentionTag("Daily Buzz", "Daily Buzz", ["AI Video", "AI Image"]),
  attentionTag("Thumbnails", "Daily Buzz", ["AI Image", "AI Video"]),
  attentionTag("Websites", "Builder Tools", ["AI Coding"]),
  attentionTag("Vibe Coding", "Builder Tools", ["AI Coding"]),
  attentionTag("Debugging", "Builder Tools", ["AI Coding"]),
  attentionTag("3D Assets", "Builder Tools", ["AI 3D Modeling"]),
  attentionTag("Research Agents", "Automation & Ops", ["AI Research", "AI Agents"]),
  attentionTag("AI Employees", "Automation & Ops", ["AI Agents", "AI Automation"]),
  attentionTag("Video Editing", "Automation & Ops", ["AI Video"]),
  attentionTag("Automation", "Automation & Ops", ["AI Automation"])
];

export const attentionSubCategoryLabels = canonicalAttentionSubCategories.map((tag) => tag.label);

export function attentionSubCategoryByLabel(label: string) {
  return canonicalAttentionSubCategories.find((tag) => tag.label === label);
}

export function attentionSubCategoryStyle(label: string) {
  const color = attentionSubCategoryByLabel(label)?.color ?? "#64748B";
  return { "--ecosystem-color": color, "--tag-color": color } as Record<string, string>;
}
