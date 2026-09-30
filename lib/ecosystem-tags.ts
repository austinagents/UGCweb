import { canonicalAttentionSubCategories } from "./attention-subcategories";
import { creatorSpecializations, creatorTagDisplayLabel, creatorTagSlug } from "./creator-tags";
import { ecosystemColorFor } from "./ecosystem-colors";
import type { CategoryName } from "./types";

export type EcosystemTagKind = "creator_specialization" | "attention_subcategory";

export type EcosystemTag = {
  id: string;
  slug: string;
  label: string;
  kind: EcosystemTagKind;
  categories: CategoryName[];
  cluster?: string;
  color: string;
};

export const ecosystemTagSlug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const creatorCategoryFor = (tag: (typeof creatorSpecializations)[number]): CategoryName[] => {
  if (tag === "AI Workflows") return ["AI Workflow"];
  if (tag === "Open Source AI") return [];
  return [tag as CategoryName];
};

const creatorTags: EcosystemTag[] = creatorSpecializations.map((tag) => ({
  id: `creator_${ecosystemTagSlug(tag)}`,
  slug: creatorTagSlug(tag),
  label: creatorTagDisplayLabel(tag),
  kind: "creator_specialization",
  categories: creatorCategoryFor(tag),
  color: ecosystemColorFor(tag)
}));

const heatmapTags: EcosystemTag[] = canonicalAttentionSubCategories.map((tag) => ({
  id: tag.id,
  slug: tag.slug,
  label: tag.label,
  kind: "attention_subcategory",
  categories: tag.categories,
  cluster: tag.cluster,
  color: tag.color
}));

export const ecosystemTags: EcosystemTag[] = [...creatorTags, ...heatmapTags].filter(
  (tag, index, tags) => tags.findIndex((candidate) => candidate.slug === tag.slug) === index
);

export function ecosystemTagBySlug(slug: string) {
  return ecosystemTags.find((tag) => tag.slug === slug);
}
