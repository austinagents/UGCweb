import type { AudienceTag, CreatorSpecialization, CreatorTagSource, CreatorType, InfluenceTag, PlatformFocus } from "./creator-tags";

export type LifecycleState =
  | "Emerging"
  | "Accelerating"
  | "Breaking Out"
  | "Peak Hype"
  | "Stabilizing"
  | "Cooling Off"
  | "Reviving";

export type CategoryName =
  | "AI Video"
  | "AI Coding"
  | "AI Agents"
  | "AI Voice"
  | "AI Design"
  | "AI Workflow"
  | "AI Research"
  | "AI Marketing"
  | "AI Automation"
  | "AI Trading"
  | "AI Gaming"
  | "AI 3D Modeling"
  | "AI Search"
  | "AI Infrastructure"
  | "AI Image"
  | "AI Productivity"
  | "AI Meeting"
  | "AI Audio"
  | "AI Music"
  | "AI Avatars"
  | "AI Development"
  | "AI Analytics"
  | "AI Education"
  | "AI Writing"
  | "AI Sales"
  | "Support";

export type PricingType = "free" | "freemium" | "paid" | "enterprise" | "waitlist";
export type LogoSource = "website-icon" | "apple-touch-icon" | "favicon" | "clearbit" | "google-favicon" | "local" | "generated-fallback";
export type TrustedDiscoverySource = "Product Hunt" | "TAAFT";
export type ListingStatus = "accepted" | "pending_source" | "pending_review" | "rejected";
export type SizeClass = "Micro" | "Emerging" | "Growth" | "Major" | "Mega";
export type RankingMode = "Trending" | "Most Used" | "Breaking Out" | "Blue Chips" | "New" | "Fastest Growing" | "Most Discussed" | "Most Saved" | "Boosted";
export type ClaimStatus = "unclaimed" | "pending" | "claimed" | "verified";
export type LocalOwnershipStatus = "owner_created" | "claimed";

export type Platform = "Web" | "macOS" | "Windows" | "iOS" | "Android" | "Chrome" | "API" | "Slack" | "Discord" | "Figma" | "VS Code";

export type Tool = {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  longDescription: string;
  category: CategoryName;
  categories: CategoryName[];
  rawSourceCategories: string[];
  subCategoryTags: string[];
  logoUrl: string;
  officialLogoUrl: string;
  faviconUrl: string;
  iconUrl: string;
  logoSource: LogoSource;
  websiteUrl: string;
  officialXUrl?: string;
  company: string;
  creatorMetadata: string;
  pricingType: PricingType;
  pricingTiers: string[];
  pricingSummary: string;
  launchDate: string;
  tags: string[];
  supportedPlatforms: Platform[];
  integrations: string[];
  apiAvailable: boolean;
  openSource: boolean;
  screenshots: string[];
  useCases: string[];
  relatedTools: string[];
  competitors: string[];
  lifecycleState: LifecycleState;
  attentionScore: number;
  momentumScore: number;
  creatorScore: number;
  workflowScore: number;
  breakoutScore: number;
  mentions24h: number;
  mentions7d: number;
  savesCount: number;
  growth24h: number;
  growth7d: number;
  creatorMentions: number;
  workflowInclusions: number;
  searchInterest: number;
  qualityScore: number;
  suppressed: boolean;
  abandoned: boolean;
  estimatedUsers: number;
  sizeClass: SizeClass;
  baselineAttention: number;
  relativeGrowthVsBaseline: number;
  recentVelocity: number;
  acceleration: number;
  organicTrendingScore: number;
  organicRankingLabel: RankingMode;
  listingScore: number;
  trustedDiscoverySources: TrustedDiscoverySource[];
  listingStatus: ListingStatus;
  listingChecks: {
    trustedPlatform: boolean;
    workingProduct: boolean;
    identifiableBranding: boolean;
    clearUseCase: boolean;
    categoryFit: boolean;
    freshnessActivity: boolean;
    publicMetadataCompleteness: boolean;
    spamSafetyPass: boolean;
    nonSpam: boolean;
    publicProductPage: boolean;
  };
  boostEligible: boolean;
  workflowEligible: boolean;
  creatorSignalEligible: boolean;
  sourceUrls: string[];
  sourceUrl?: string;
  sourceConfidence: number;
  verificationSignals: string[];
  importedFrom: string;
  importedAt: string;
  updatedAt: string;
  taaftRank?: number;
  trendHistory: number[];
  sparkline: number[];
};

export type Category = {
  id: string;
  name: CategoryName;
  slug: string;
  description: string;
  momentumScore: number;
  growth24h: number;
  growth7d: number;
  toolsTracked: number;
  sparkline: number[];
};

export type AttentionSubCategory = {
  id: string;
  slug: string;
  label: string;
  color: string;
  momentumScore: number;
  growth24h: number;
  growth7d: number;
  toolsTracked: number;
  relatedToolSlugs: string[];
};

export type Workflow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  outcome: string;
  toolSlugs: string[];
  momentumScore: number;
  growth24h: number;
  growth7d: number;
  savesCount: number;
  creatorUsage: number;
  sparkline: number[];
  featured?: boolean;
};

export type MicroWorkflow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  outcome: string;
  status: RelationshipStatus;
  confidence: number;
  sourceType: RelationshipSourceType;
};

export type WorkflowMicroWorkflowRelationship = {
  id: string;
  workflowSlug: string;
  microWorkflowSlug: string;
  position?: number;
  required?: boolean;
  confidence: number;
  status: RelationshipStatus;
  sourceType: RelationshipSourceType;
};

export type MicroWorkflowToolRelationship = {
  id: string;
  microWorkflowSlug: string;
  toolSlug: string;
  position?: number;
  required?: boolean;
  confidence: number;
  status: RelationshipStatus;
  sourceType: RelationshipSourceType;
};

export type MovementEvent = {
  id: string;
  toolSlug?: string;
  workflowSlug?: string;
  categorySlug?: string;
  title: string;
  description: string;
  eventType: "creator_spike" | "launch" | "workflow_spread" | "reddit_spike" | "youtube_spike" | "api_release" | "category_shift";
  sourceUrl: string;
  timestamp: string;
};

export type CreatorSignal = {
  id: string;
  creatorName: string;
  handle: string;
  platform: CreatorPlatform;
  toolSlug: string;
  sourceUrl: string;
  timestamp: string;
  context: string;
};

export type ToolEvidenceSourceType = "x" | "youtube" | "github" | "docs" | "official" | "news" | "newsletter_blog" | "directory" | "article" | "other";
export type ToolEvidenceTier = "discussion" | "reference" | "other";

export type ToolEvidenceSource = {
  id: string;
  toolId?: string;
  toolSlug: string;
  workflowId?: string;
  workflowSlug?: string;
  sourceType: ToolEvidenceSourceType;
  sourceTitle: string;
  sourceAuthor: string;
  sourceUrl: string;
  canonicalUrl?: string;
  sourceImageUrl?: string;
  sourcePublishedAt?: string;
  detectedAt: string;
  matchedTools: string[];
  snippet: string;
  platformLabel: string;
  previewFetchedAt?: string;
  previewFetchError?: string;
};

export type CreatorPlatform = "YouTube" | "X" | "Reddit" | "Newsletter" | "TikTok" | "Instagram" | "LinkedIn" | "Website" | "Multi-platform" | "Unknown";
export type RelationshipStatus = "accepted" | "pending_review" | "rejected";
export type RelationshipSourceType = "manual" | "imported" | "derived" | "creator_post" | "profile_bio";

export type CreatorToolRelationship = {
  id: string;
  creatorId: string;
  toolSlug: string;
  relationshipType: "uses" | "teaches" | "mentions" | "recommends" | "builds_with" | "switched_to" | "abandoned";
  validationLayer?: "observed" | "verified" | "creator_claimed";
  confidence: number;
  status: RelationshipStatus;
  sourceType: RelationshipSourceType;
  sourceUrl?: string;
  evidenceText?: string;
  observedAt?: string;
};

export type WorkflowToolRelationship = {
  id: string;
  workflowSlug: string;
  toolSlug: string;
  role: "research" | "generation" | "editing" | "automation" | "publishing" | "analysis" | "infrastructure" | "other";
  position?: number;
  required?: boolean;
  confidence: number;
  status: RelationshipStatus;
  sourceType: RelationshipSourceType;
};

export type CreatorWorkflowRelationship = {
  id: string;
  creatorId: string;
  workflowSlug: string;
  relationshipType: "uses" | "teaches" | "mentions" | "inferred_from_tools";
  confidence: number;
  status: RelationshipStatus;
  sourceType: RelationshipSourceType;
  sourceUrl?: string;
  evidenceText?: string;
  supportingToolSlugs?: string[];
};

export type CreatorProfile = {
  id: string;
  name: string;
  handle: string;
  xHandle?: string;
  avatarUrl: string;
  avatarSourceType?: "x_profile_image" | "official_website" | "youtube" | "linkedin" | "none";
  avatarSourceUrl?: string;
  avatarVerified?: boolean;
  platform: CreatorPlatform;
  primaryPlatform: CreatorPlatform;
  bio: string;
  followers: number;
  followerCount: number;
  creatorCategory: string;
  niches: string[];
  primarySpecialization?: CreatorSpecialization;
  specializationTags: CreatorSpecialization[];
  creatorTypes: CreatorType[];
  platformFocus: PlatformFocus[];
  audienceTags: AudienceTag[];
  influenceTags: InfluenceTag[];
  workflowTags: string[];
  toolCategoryTags: CreatorSpecialization[];
  tagConfidence?: number;
  tagSource?: CreatorTagSource;
  tagNotes?: string;
  rawImportedTags?: string[];
  tagInferenceMethod?: string;
  workflowSlugs: string[];
  toolSlugs: string[];
  recentMentions: string[];
  creatorScore: number;
  categorySlugs: string[];
  rankingPosition?: number;
  xUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  officialWebsite?: string;
  websiteUrl?: string;
  status?: ListingStatus;
  sourceUrl?: string;
  importedFrom?: string;
  importedAt?: string;
  listingStatus?: ListingStatus;
  sourceConfidence?: number;
  verificationSignals?: string[];
};

export type CreatorClaimRequest = {
  id: string;
  creatorId: string;
  name: string;
  email: string;
  socialProofUrl: string;
  preferredProfileUrl?: string;
  note?: string;
  status: "pending_review" | "approved" | "rejected";
  submittedAt: string;
};

export type ProductClaimRequest = {
  id: string;
  toolSlug: string;
  requesterName: string;
  workEmail: string;
  role: string;
  websiteUrl: string;
  claimProof: string;
  note?: string;
  status: "pending_review" | "approved" | "rejected";
  submittedAt: string;
};

export type LocalProductRecord = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  website: string;
  socialUrl: string;
  tagline: string;
  description: string;
  category: CategoryName;
  workflowSlugs: string[];
  microWorkflowSlugs: string[];
  createdAt: string;
  updatedAt: string;
  ownershipStatus: LocalOwnershipStatus;
};

export type LocalCreatorRecord = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string;
  socialUrl: string;
  website: string;
  bio: string;
  toolSlugs: string[];
  workflowSlugs: string[];
  microWorkflowSlugs: string[];
  createdAt: string;
  updatedAt: string;
  ownershipStatus: LocalOwnershipStatus;
};

export type AttentionFeedItem = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  entityType: "tool" | "workflow" | "category" | "creator";
  entitySlug: string;
  timestamp: string;
};

export type DiscoveryEdge = {
  id: string;
  fromSlug: string;
  toSlug: string;
  fromToolId?: string;
  toToolId?: string;
  relationship: "also_viewed" | "creator_overlap" | "workflow_overlap" | "migration" | "ecosystem";
  strength: number;
  narrative: string;
  reason?: string;
  evidenceSource?: string;
};

export type FeatureFlag = {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description: string;
};

export type PromotionPlacement = {
  id: string;
  toolSlug: string;
  label: string;
  sponsorName: string;
  placement: "top_rail" | "table_injection" | "workflow_feature" | "homepage_panel";
  priorityWeight: number;
  momentumLift: number;
  impressions: number;
  ctr: number;
  startsAt: string;
  expiresAt: string;
  status: "scheduled" | "active" | "paused" | "expired" | "moderation";
};

export type BoostTier = {
  id: string;
  label: string;
  multiplier: number;
  price: string;
  duration: string;
  description: string;
  placementSlots: string[];
};
