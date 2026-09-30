import { ecosystemColorFor } from "./ecosystem-colors";

export const creatorSpecializations = [
  "AI Coding",
  "AI Agents",
  "AI Automation",
  "AI Workflows",
  "AI Productivity",
  "AI Design",
  "AI Image",
  "AI Video",
  "AI Marketing",
  "AI Research",
  "AI Infrastructure",
  "AI Voice",
  "AI Search",
  "Open Source AI"
] as const;

export type CreatorSpecialization = (typeof creatorSpecializations)[number];

export const creatorTypes = [
  "Technical Builder",
  "AI Researcher",
  "Workflow Operator",
  "Stack Builder",
  "Discovery Creator",
  "AI Educator",
  "Tool Specialist",
  "Automation Creator",
  "AI Founder",
  "Open Source Maintainer",
  "Product Operator"
] as const;

export type CreatorType = (typeof creatorTypes)[number];

export const platformFocusTags = [
  "X",
  "YouTube",
  "LinkedIn",
  "TikTok",
  "Newsletter",
  "GitHub",
  "Website",
  "Multi-platform",
  "Unknown"
] as const;

export type PlatformFocus = (typeof platformFocusTags)[number];

export const audienceTags = [
  "Developers",
  "Founders",
  "Builders",
  "Creators",
  "Marketers",
  "Operators",
  "Agencies",
  "Researchers",
  "Product Teams",
  "Technical Teams",
  "General AI Users"
] as const;

export type AudienceTag = (typeof audienceTags)[number];

export const influenceTags = [
  "Discovery Influence",
  "Workflow Influence",
  "Adoption Influence",
  "Technical Influence",
  "Research Influence",
  "Education Influence",
  "Builder Influence",
  "Open Source Influence",
  "Commercial Influence",
  "Creator-Stack Influence"
] as const;

export type InfluenceTag = (typeof influenceTags)[number];

export type CreatorTagSource = "manual" | "imported" | "inferred" | "admin_reviewed";

const specializationAliases: Record<string, CreatorSpecialization> = {
  "ai coding": "AI Coding",
  coding: "AI Coding",
  "developer tools": "AI Coding",
  "ai developer tools": "AI Coding",
  "ai agents": "AI Agents",
  agents: "AI Agents",
  "ai automation": "AI Automation",
  automation: "AI Automation",
  "ai automations": "AI Automation",
  "workflow automation": "AI Automation",
  "ai workflows": "AI Workflows",
  workflows: "AI Workflows",
  "ai workflow": "AI Workflows",
  "stack workflows": "AI Workflows",
  "ai productivity": "AI Productivity",
  productivity: "AI Productivity",
  "ai design": "AI Design",
  design: "AI Design",
  "ai image": "AI Image",
  image: "AI Image",
  "image ai": "AI Image",
  "generative image": "AI Image",
  "ai video": "AI Video",
  video: "AI Video",
  "video ai": "AI Video",
  "generative video": "AI Video",
  "ai marketing": "AI Marketing",
  marketing: "AI Marketing",
  "ai research": "AI Research",
  research: "AI Research",
  "ai infrastructure": "AI Infrastructure",
  infrastructure: "AI Infrastructure",
  infra: "AI Infrastructure",
  "llm infrastructure": "AI Infrastructure",
  "ai devops": "AI Infrastructure",
  "ai voice": "AI Voice",
  voice: "AI Voice",
  "ai search": "AI Search",
  "search ai": "AI Search",
  "answer engines": "AI Search",
  "open source ai": "Open Source AI",
  "open source": "Open Source AI",
  "oss ai": "Open Source AI",
  "open models": "Open Source AI"
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const unique = <T extends string>(values: T[]) => [...new Set(values)];

export function normalizeCreatorSpecialization(value: string | undefined): CreatorSpecialization | undefined {
  if (!value) return undefined;
  return specializationAliases[normalizeKey(value)];
}

export function normalizeCreatorSpecializations(values: Array<string | undefined>): CreatorSpecialization[] {
  return unique(values.flatMap((value) => {
    if (!value) return [];
    return value.split(/[,/|]+/).map((part) => normalizeCreatorSpecialization(part)).filter(Boolean) as CreatorSpecialization[];
  }));
}

export function primarySpecializationFrom(tags: CreatorSpecialization[]): CreatorSpecialization | undefined {
  return tags[0];
}

export function normalizeCreatorTypes(values: Array<string | undefined>): CreatorType[] {
  return unique(values.filter((value): value is CreatorType => creatorTypes.includes(value as CreatorType)));
}

export function normalizePlatformFocus(values: Array<string | undefined>): PlatformFocus[] {
  const normalized = unique(values.flatMap((value) => {
    if (!value) return [];
    return platformFocusTags.includes(value as PlatformFocus) ? [value as PlatformFocus] : [];
  }));
  return normalized.length ? normalized : ["Unknown"];
}

export function normalizeAudienceTags(values: Array<string | undefined>): AudienceTag[] {
  return unique(values.filter((value): value is AudienceTag => audienceTags.includes(value as AudienceTag)));
}

export function normalizeInfluenceTags(values: Array<string | undefined>): InfluenceTag[] {
  return unique(values.filter((value): value is InfluenceTag => influenceTags.includes(value as InfluenceTag)));
}

export function creatorTagSlug(tag: CreatorSpecialization) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function creatorSpecializationFromSlug(slug: string) {
  return creatorSpecializations.find((tag) => creatorTagSlug(tag) === slug);
}

export function creatorTagDisplayLabel(tag: CreatorSpecialization) {
  if (tag === "Open Source AI") return "Open Source";
  return tag.replace(/^AI\s+/, "");
}

export function creatorTagStyle(tag: CreatorSpecialization) {
  return { "--tag-color": ecosystemColorFor(tag), "--ecosystem-color": ecosystemColorFor(tag) } as Record<string, string>;
}
