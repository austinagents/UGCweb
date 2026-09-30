import type { ListingStatus, Tool, TrustedDiscoverySource } from "./types";

export const trustedDiscoverySources: TrustedDiscoverySource[] = ["Product Hunt", "TAAFT"];

export const mvpListingRequirements = [
  "Discoverable on Product Hunt or TAAFT",
  "Working product, site, or demo",
  "Identifiable branding or logo",
  "Clear AI or software use case",
  "Non-malicious and non-spam",
  "Usable public product page"
];

export function trustedSourcesForSeed(index: number): TrustedDiscoverySource[] {
  if (index % 5 === 0) return ["Product Hunt", "TAAFT"];
  return index % 2 === 0 ? ["Product Hunt"] : ["TAAFT"];
}

export function trustedSourceUrls(slug: string, sources: TrustedDiscoverySource[]) {
  return sources.map((source) => source === "Product Hunt" ? `https://www.producthunt.com/search?q=${slug}` : `https://theresanaiforthat.com/s/${slug}/`);
}

export function listingChecksForSeed(sources: TrustedDiscoverySource[]) {
  return {
    trustedPlatform: sources.some((source) => trustedDiscoverySources.includes(source)),
    workingProduct: true,
    identifiableBranding: true,
    clearUseCase: true,
    categoryFit: true,
    freshnessActivity: true,
    publicMetadataCompleteness: true,
    spamSafetyPass: true,
    nonSpam: true,
    publicProductPage: true
  };
}

export function calculateListingScore(checks: Tool["listingChecks"]) {
  return (
    (checks.trustedPlatform ? 25 : 0) +
    (checks.workingProduct ? 20 : 0) +
    (checks.clearUseCase ? 15 : 0) +
    (checks.identifiableBranding ? 10 : 0) +
    (checks.categoryFit ? 10 : 0) +
    (checks.freshnessActivity ? 10 : 0) +
    (checks.publicMetadataCompleteness ? 5 : 0) +
    (checks.spamSafetyPass ? 5 : 0)
  );
}

export function listingStatusFromChecks(checks: Tool["listingChecks"]): ListingStatus {
  const score = calculateListingScore(checks);
  if (score >= 70) return "accepted";
  return checks.trustedPlatform ? "pending_source" : "rejected";
}
