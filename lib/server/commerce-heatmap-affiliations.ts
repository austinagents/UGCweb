import "server-only";

import affinityTerms from "@/data/commerce-heatmap-affinity-terms.json";
import shopAffiliations from "@/data/commerce-heatmap-shop-affiliations.json";
import creatorData from "@/data/creator-screener.json";
import type { CommerceChildCategory } from "@/lib/commerce-categories";
import type { CreatorScreenerRow } from "@/lib/creator-screener";

const creators = creatorData.creators as CreatorScreenerRow[];
const shopIdsByCategory = shopAffiliations.categories as Record<CommerceChildCategory, string[]>;
const termsByCategory = affinityTerms as Record<CommerceChildCategory, string[]>;

export function shopIdsForHeatmapCategory(category: CommerceChildCategory) {
  return shopIdsByCategory[category] ?? [];
}

export function creatorIdsForHeatmapCategory(category: CommerceChildCategory) {
  const terms = termsByCategory[category].map(normalize);
  return new Set(creators.filter((creator) => {
    const queries = creator.sourceQueries.map(normalize);
    return queries.some((query) => terms.some((term) => phraseIncludes(query, term)));
  }).map((creator) => creator.creator_oecuid));
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim();
}

function phraseIncludes(value: string, phrase: string) {
  return ` ${value} `.includes(` ${phrase} `);
}
