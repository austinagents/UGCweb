import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import xProofQualityV3 from "@/data/x-proof-quality-v3-clean.json";
import xProofSourcesV2 from "@/data/x-proof-sources-v2-all.json";
import { ClaimStatusBadge } from "@/components/claims/claim-status";
import { CreatorAvatar } from "@/components/creator-avatar";
import { MovementBadge } from "@/components/movement-badge";
import { SaveButton } from "@/components/save-button";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { XMarkIcon, XProfileButton } from "@/components/x-profile-button";
import { creators, creatorToolRelationships, evidenceSourcesForTool, getTool, microWorkflows, tools, toolsForMicroWorkflow, toolsForWorkflow, workflows } from "@/lib/data";
import { ecosystemTagSlug } from "@/lib/ecosystem-tags";
import { betaEventBootstrapScript } from "@/lib/events";
import { displayCategory } from "@/lib/format";
import { LOCAL_PRODUCTS_KEY } from "@/lib/local-graph";
import type { CreatorProfile, CreatorToolRelationship, Tool, ToolEvidenceSource, Workflow as WorkflowType } from "@/lib/types";

function isTool(item: Tool | undefined): item is Tool {
  return Boolean(item);
}

function publicTrackingState(tool: Tool) {
  if (tool.listingStatus === "accepted") return "Active";
  if (tool.listingStatus === "pending_source") return "Under Observation";
  return "Suppressed";
}

function publicVerificationState(tool: Tool) {
  if (tool.listingScore >= 90) return "Verified Momentum";
  if (tool.listingScore >= 70) return "Discovery Verified";
  return "";
}

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = getTool(params.slug);
  if (!tool) return <LocalProductProfile slug={params.slug} />;

  const evidenceItems = evidenceSourcesForTool(tool.slug);
  const validEvidenceItems = [...evidenceItems, ...xProofSourcesForTool(tool)].filter((item) => isToolEvidence(item));
  const toolEvidenceItems = validEvidenceItems.filter((item) => isCurrentToolOnlyEvidence(item, tool));
  const microWorkflowGroups = evidenceGraphGroups(tool, validEvidenceItems, "micro");
  const workflowGroups = evidenceGraphGroups(tool, validEvidenceItems, "workflow");
  const relationshipSummaries = commonRelationshipSummaries(tool, [...microWorkflowGroups, ...workflowGroups]);
  const relatedTags = [...new Set([...tool.subCategoryTags, ...tool.tags.slice(0, 5)])].slice(0, 8);
  const rank = [...tools].sort((a, b) => b.organicTrendingScore - a.organicTrendingScore).findIndex((item) => item.slug === tool.slug) + 1;

  return (
    <div className="toolIntelReport">
      <script dangerouslySetInnerHTML={{ __html: productProfileEventScript(tool.slug) }} />
      <div className="toolIntelWorkspace">
        <section className="toolIntelHeroGrid">
          <article className="toolIntelHero">
            <Link href="/search" className="toolBackLink">← Back to search</Link>
            <div className="toolHeroBody">
              <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={112} />
              <div>
                <h1>
                  {tool.name}
                  <XProfileButton href={tool.officialXUrl} label={`${tool.name} on X`} />
                </h1>
                <p className="toolHeroCategory">{displayCategory(tool.category)}</p>
                <p className="toolHeroDescription">{tool.description}</p>
                <TagRail tool={tool} tags={relatedTags.slice(0, 5)} />
                <div className="toolHeroActions">
                  <a className="iconTextButton primaryWebsiteButton" href={tool.websiteUrl} target="_blank" rel="noreferrer">Visit website <ExternalLink size={14} /></a>
                  <Link className="iconTextButton" href={`/compare?tools=${tool.slug}`}>Compare</Link>
                  <SaveButton kind="tools" id={tool.slug} label="Add to watchlist" />
                </div>
              </div>
            </div>
          </article>

          <TrendingCard tool={tool} rank={rank} />
        </section>

        <ToolEvidence tool={tool} evidenceItems={toolEvidenceItems} />
        <CommonlyAppearsWithOverview tool={tool} relationships={relationshipSummaries} />
        <EvidenceWorkflows tool={tool} groups={workflowGroups} />
        <EvidenceMicroWorkflows tool={tool} groups={microWorkflowGroups} />
      </div>
    </div>
  );
}

function LocalProductProfile({ slug }: { slug: string }) {
  const workflowLookup = workflows.map((workflow) => ({
    slug: workflow.slug,
    name: workflow.name,
    outcome: workflow.outcome,
    tools: toolsForWorkflow(workflow).map((tool) => tool.name)
  }));
  const microWorkflowLookup = microWorkflowLookupForClient();

  return (
    <div className="toolIntelReport">
      <div className="toolIntelWorkspace">
        <section className="toolIntelHeroGrid">
          <article className="toolIntelHero">
            <Link href="/search" className="toolBackLink">← Back to discover</Link>
            <div className="toolHeroBody">
              <img className="toolLogo official" id="localProductLogo" alt="" width={112} height={112} style={{ display: "none" }} />
              <div>
                <h1 id="localProductName">Local product profile</h1>
                <p className="toolHeroCategory" id="localProductCategory">Created product</p>
                <p className="toolHeroDescription" id="localProductDescription">Looking for this product in your local AppScreener graph.</p>
                <p className="ownershipUnlockCopy" id="localProductTagline" />
                <div className="toolHeroActions">
                  <a className="iconTextButton primaryWebsiteButton" id="localProductWebsite" href="/dashboard/product">Visit website <ExternalLink size={14} /></a>
                  <ClaimStatusBadge status="claimed" />
                </div>
              </div>
            </div>
          </article>
        </section>
        <section className="toolIntelContentGrid">
          <main className="toolIntelMain">
            <Panel title="Used In Workflows" subtitle="Workflow contexts connected by this product owner">
              <div className="toolWorkflowShelf" id="localProductWorkflows" />
            </Panel>
            <Panel title="Associated Micro Workflows" subtitle="Specific tasks this product helps complete">
              <div className="toolWorkflowShelf" id="localProductMicroWorkflows" />
            </Panel>
          </main>
          <aside className="toolIntelRail">
            <Panel title="About this product">
              <div className="toolAboutTable">
                <InfoRow label="Website" value={<span id="localProductWebsiteText">Add website</span>} />
                <InfoRow label="Category" value={<span id="localProductCategoryText">Created product</span>} />
                <InfoRow label="Social" value={<span id="localProductSocial">Add social profile</span>} />
              </div>
            </Panel>
          </aside>
        </section>
      </div>
      <Script id={`local-product-${slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: localProductScript(slug, workflowLookup, microWorkflowLookup) }} />
    </div>
  );
}

function microWorkflowLookupForClient() {
  return microWorkflows.map((microWorkflow) => ({
    slug: microWorkflow.slug,
    name: microWorkflow.name,
    outcome: microWorkflow.outcome,
    tools: toolsForMicroWorkflow(microWorkflow.slug).map((tool) => tool.name)
  }));
}

function localProductScript(slug: string, workflowLookup: Array<{ slug: string; name: string; outcome: string; tools: string[] }>, microWorkflowLookup: Array<{ slug: string; name: string; outcome: string; tools: string[] }>) {
  return `
    (function() {
      var slug = ${JSON.stringify(slug)};
      var workflows = ${JSON.stringify(workflowLookup)};
      var microWorkflows = ${JSON.stringify(microWorkflowLookup)};
      var records = [];
      try { records = JSON.parse(localStorage.getItem(${JSON.stringify(LOCAL_PRODUCTS_KEY)}) || "[]"); } catch (error) { records = []; }
      var product = Array.isArray(records) ? records.find(function(item) { return item && item.slug === slug; }) : null;
      function text(id, value) { var node = document.getElementById(id); if (node) node.textContent = value || ""; }
      function safeUrl(value) { return /^https?:\\/\\//i.test(value || "") ? value : ""; }
      function renderRows(id, slugs, lookup, emptyText) {
        var container = document.getElementById(id);
        if (!container) return;
        container.textContent = "";
        var matches = (slugs || []).map(function(item) { return lookup.find(function(entry) { return entry.slug === item; }); }).filter(Boolean);
        if (!matches.length) {
          var empty = document.createElement("p");
          empty.className = "toolEmptyState";
          empty.textContent = emptyText;
          container.appendChild(empty);
          return;
        }
        matches.forEach(function(item) {
          var row = document.createElement("article");
          row.className = "toolWorkflowCard";
          var title = document.createElement("strong");
          title.textContent = item.name;
          var context = document.createElement("p");
          context.textContent = item.tools && item.tools.length ? item.tools.join(" -> ") : item.outcome;
          row.appendChild(title);
          row.appendChild(context);
          container.appendChild(row);
        });
      }
      if (!product) {
        text("localProductName", "Product not found");
        text("localProductDescription", "No local product profile exists for this slug in this browser.");
        return;
      }
      var logo = document.getElementById("localProductLogo");
      if (logo && product.logoUrl) {
        logo.src = product.logoUrl;
        logo.style.display = "";
      }
      text("localProductName", product.name);
      text("localProductCategory", (product.category || "").replace(/^AI\\s+/, "") || "Created product");
      text("localProductCategoryText", (product.category || "").replace(/^AI\\s+/, "") || "Created product");
      text("localProductDescription", product.description);
      text("localProductTagline", product.tagline);
      text("localProductWebsiteText", product.website);
      text("localProductSocial", product.socialUrl);
      var website = safeUrl(product.website);
      var websiteLink = document.getElementById("localProductWebsite");
      if (websiteLink && website) websiteLink.href = website;
      renderRows("localProductWorkflows", product.workflowSlugs, workflows, "Connect workflows from the product dashboard to improve discovery.");
      renderRows("localProductMicroWorkflows", product.microWorkflowSlugs, microWorkflows, "Connect micro workflows from the product dashboard to show specific tasks.");
    })();
  `;
}

function productProfileEventScript(toolSlug: string) {
  return `
    ${betaEventBootstrapScript()}
    document.addEventListener("click", function(event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-beta-product-claim-cta]") : null;
      if (!target) return;
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("product_claim_cta_clicked", {
        toolSlug: ${JSON.stringify(toolSlug)},
        source: "product_profile"
      });
    });
  `;
}

const receiptSourceCards: Array<{ type: ToolEvidenceSource["sourceType"]; label: string; icon: ReactNode; iconClassName: string }> = [
  { type: "x", label: "X", icon: <SourceXIcon />, iconClassName: "sourceIconX" },
  { type: "youtube", label: "YouTube", icon: <SourceYouTubeIcon />, iconClassName: "sourceIconYouTube" },
  { type: "github", label: "GitHub", icon: <SourceGitHubIcon />, iconClassName: "sourceIconGitHub" },
  { type: "article", label: "Articles", icon: <SourceArticleIcon />, iconClassName: "sourceIconArticle" }
];

function SourceXIcon() {
  return <XMarkIcon />;
}

function SourceYouTubeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M14.4 4.5a2 2 0 0 0-1.4-1.42C11.76 2.75 8 2.75 8 2.75s-3.76 0-5 .33A2 2 0 0 0 1.6 4.5 20.7 20.7 0 0 0 1.27 8c0 1.18.1 2.36.33 3.5A2 2 0 0 0 3 12.92c1.24.33 5 .33 5 .33s3.76 0 5-.33a2 2 0 0 0 1.4-1.42c.23-1.14.33-2.32.33-3.5 0-1.18-.1-2.36-.33-3.5ZM6.66 10.35v-4.7L10.67 8 6.66 10.35Z" />
    </svg>
  );
}

function SourceGitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 .9a7.1 7.1 0 0 0-2.25 13.83c.36.07.5-.16.5-.35v-1.23c-2.04.44-2.47-.98-2.47-.98-.33-.85-.81-1.08-.81-1.08-.67-.46.05-.45.05-.45.74.05 1.13.76 1.13.76.66 1.13 1.73.8 2.15.61.07-.48.26-.8.47-.99-1.63-.18-3.34-.81-3.34-3.62 0-.8.29-1.45.76-1.96-.08-.19-.33-.94.07-1.94 0 0 .62-.2 2.03.75A6.98 6.98 0 0 1 8 4c.63 0 1.26.08 1.85.25 1.4-.95 2.03-.75 2.03-.75.4 1 .15 1.75.07 1.94.47.51.76 1.16.76 1.96 0 2.82-1.72 3.44-3.35 3.62.27.23.5.68.5 1.37v2.03c0 .2.13.42.5.35A7.1 7.1 0 0 0 8 .9Z" />
    </svg>
  );
}

function SourceArticleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 1.75h6.15L13 4.6v10.15H4A1.75 1.75 0 0 1 2.25 13V3.5A1.75 1.75 0 0 1 4 1.75Zm5.7 1.15V5h2.1L9.7 2.9ZM4.5 7h7v1.2h-7V7Zm0 2.35h7v1.2h-7v-1.2Zm0 2.35h4.8v1.2H4.5v-1.2Z" />
    </svg>
  );
}

type XProofTweet = {
  author?: string;
  authorHandle?: string;
  authorName?: string;
  authorProfileImageUrl?: string;
  profileImageUrl?: string;
  profilePicture?: string;
  text?: string;
  url?: string;
  createdAt?: string;
  lang?: string;
  language?: string;
  tweetLanguage?: string;
  engagement?: {
    likes?: number;
    reposts?: number;
    replies?: number;
    views?: number;
    total?: number;
  };
};

type XProofRecord = {
  tool?: string;
  slug?: string;
  x_handle?: string;
  top_tweets?: XProofTweet[];
};

type XProofData = {
  records?: XProofRecord[];
};

type XProofQualityRecord = {
  slug?: string;
  x_handle?: string;
  useful_count?: number | string;
  best_3_tweet_urls?: string;
};

type XProofQualityData = {
  records?: XProofQualityRecord[];
};

function xProofSourcesForTool(tool: Tool): ToolEvidenceSource[] {
  const qualityRecord = eligibleXProofQualityRecord(tool);
  const proofData = xProofSourcesV2 as XProofData;
  const record = proofData.records?.find((item) => item.slug === tool.slug);
  if (!qualityRecord || !record || !handlesMatch(qualityRecord.x_handle, record.x_handle)) return [];

  const usefulTweets = rankedXProofTweets(record, qualityRecord)
    .filter((tweet) => isValidXProofTweet(tweet, tool, record))
    .reduce(selectDiverseXProofTweets, [] as XProofTweet[])
    .slice(0, 3);

  if (!usefulTweets.length) return [];

  return usefulTweets.map((tweet, index) => ({
    id: `xproof_v2_${tool.slug}_${index + 1}`,
    toolSlug: tool.slug,
    sourceType: "x",
    sourceTitle: tweet.text ?? "",
    sourceAuthor: tweet.authorHandle || (tweet.author ? `@${tweet.author.replace(/^@/, "")}` : "X"),
    sourceImageUrl: tweet.authorProfileImageUrl || tweet.profileImageUrl || tweet.profilePicture,
    sourceUrl: tweet.url ?? "",
    sourcePublishedAt: tweet.createdAt,
    detectedAt: "2026-06-04T10:51:32.946Z",
    matchedTools: [tool.name],
    snippet: tweet.text ?? "",
    platformLabel: `${compactNumber(tweet.engagement?.total ?? 0)} engagement`
  }));
}

function eligibleXProofQualityRecord(tool: Tool) {
  const qualityData = xProofQualityV3 as XProofQualityData;
  const record = qualityData.records?.find((item) => item.slug === tool.slug);
  if (!record || Number(record.useful_count ?? 0) < 3 || isSharedProofHandle(record.x_handle ?? "")) return undefined;
  return record;
}

function isCryptoNoiseXProofTweet(tweet: XProofTweet) {
  const text = String(tweet.text ?? "");
  return /\$[A-Z0-9]{1,10}\b/i.test(text) || /\b(?:CA:|Contract:|contract address|airdrop|100x|moon|gem)\b/i.test(text);
}

const bluechipXProofSlugs = new Set([
  "chatgpt",
  "claude",
  "perplexity",
  "cursor",
  "vercel",
  "midjourney",
  "runway",
  "elevenlabs",
  "kling",
  "pika",
  "heygen",
  "synthesia",
  "notebooklm",
  "capcut"
]);

const bluechipAuthorCryptoNoiseTerms = [
  "crypto",
  "web3",
  "defi",
  "nft",
  "btc",
  "bitcoin",
  "eth",
  "ethereum",
  "sol",
  "solana",
  "airdrop",
  "memecoin",
  "onchain",
  "blockchain",
  "token",
  "tokens",
  "altcoin",
  "dao",
  "dex",
  "cex",
  "staking",
  "yield",
  "pumpfun"
];

function isBluechipCryptoNoiseXProofTweet(tweet: XProofTweet, tool: Tool) {
  if (!bluechipXProofSlugs.has(tool.slug)) return false;
  const text = String(tweet.text ?? "");
  return /\$[A-Z0-9]{1,10}\b/i.test(text) || /\b(?:CA:|contract address|airdrop|token|memecoin|solana|sol|web3|ethereum|eth|presale|launchpad|degen|100x|moon|gem|pump)\b/i.test(text);
}

function isBluechipAuthorCryptoNoiseXProofTweet(tweet: XProofTweet, tool: Tool) {
  if (!bluechipXProofSlugs.has(tool.slug)) return false;
  const authorText = `${tweet.author ?? ""} ${tweet.authorName ?? ""}`.toLowerCase();
  return bluechipAuthorCryptoNoiseTerms.some((term) => authorText.includes(term));
}

function rankedXProofTweets(record: XProofRecord, qualityRecord: XProofQualityRecord) {
  const tweetByUrl = new Map(record.top_tweets?.map((tweet) => [tweet.url, tweet]) ?? []);
  const seen = new Set<string>();
  const ranked: XProofTweet[] = [];
  const addTweet = (tweet?: XProofTweet) => {
    if (!tweet?.url || seen.has(tweet.url)) return;
    seen.add(tweet.url);
    ranked.push(tweet);
  };

  bestXProofUrls(qualityRecord).forEach((url) => addTweet(tweetByUrl.get(url)));
  record.top_tweets?.forEach(addTweet);

  return ranked;
}

function isValidXProofTweet(tweet: XProofTweet, tool: Tool, record: XProofRecord) {
  if (!isEnglishLanguageXProofTweet(tweet) || isCryptoNoiseXProofTweet(tweet) || isBluechipCryptoNoiseXProofTweet(tweet, tool) || isBluechipAuthorCryptoNoiseXProofTweet(tweet, tool) || isSharedProofHandle(record.x_handle ?? "")) return false;
  const text = String(tweet.text ?? "").toLowerCase();
  return toolMentionTerms(tool, record).some((term) => text.includes(term));
}

function selectDiverseXProofTweets(selected: XProofTweet[], tweet: XProofTweet, _index: number, tweets: XProofTweet[]) {
  const author = normalizeXHandle(tweet.author);
  const selectedAuthors = new Set(selected.map((item) => normalizeXHandle(item.author)).filter(Boolean));
  const uniqueAuthors = new Set(tweets.map((item) => normalizeXHandle(item.author)).filter(Boolean));

  if (selected.length < Math.min(3, uniqueAuthors.size) && author && !selectedAuthors.has(author)) {
    return [...selected, tweet];
  }

  if (selected.length < 3 && selected.length >= uniqueAuthors.size) {
    return [...selected, tweet];
  }

  return selected;
}

function isEnglishLanguageXProofTweet(tweet: XProofTweet) {
  const language = (tweet.lang ?? tweet.language ?? tweet.tweetLanguage)?.trim().toLowerCase();
  if (!language) return true;
  return language === "en" || language === "eng" || language === "english";
}

function toolMentionTerms(tool: Tool, record: XProofRecord) {
  const terms = new Set<string>();
  const addTerm = (value?: string) => {
    const normalized = value?.trim().toLowerCase();
    if (normalized) terms.add(normalized);
  };
  const handle = record.x_handle?.replace(/^@/, "").trim();

  addTerm(tool.name);
  addTerm(tool.slug);
  addTerm(tool.slug.replace(/[-_]+/g, " "));
  addTerm(tool.name.replace(/([a-z])([A-Z])/g, "$1 $2"));

  if (handle && !isSharedProofHandle(handle)) {
    addTerm(handle);
    addTerm(`@${handle}`);
  }

  return Array.from(terms);
}

function bestXProofUrls(record: XProofQualityRecord) {
  return String(record.best_3_tweet_urls ?? "")
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function handlesMatch(left?: string, right?: string) {
  const normalizedLeft = normalizeXHandle(left);
  const normalizedRight = normalizeXHandle(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeXHandle(handle?: string) {
  return handle?.replace(/^@/, "").trim().toLowerCase() ?? "";
}

function isSharedProofHandle(handle: string) {
  return new Set(["theresanaiforit", "producthunt", "toolfolio", "peerlist", "uneedlists", "betalist", "microlaunchhq", "tinylaunch"]).has(normalizeXHandle(handle));
}

function SourceReceiptCard({ source, evidenceItems, tool }: { source: (typeof receiptSourceCards)[number]; evidenceItems: ToolEvidenceSource[]; tool: Tool }) {
  const sourceSummaries = sourceSummariesFor(evidenceItems.filter((item) => item.sourceType === source.type && isPublicSourceDisplayReceipt(item, tool))).slice(0, 3);
  if (!sourceSummaries.length) return null;

  return (
    <article className="toolEvidenceCard">
      <div className="toolReceiptSourceHeader">
        <span className={source.iconClassName}>{source.icon}</span>
        <strong>{source.label}</strong>
      </div>
      <div className="toolReceiptPreviewList">
        {sourceSummaries.map((summary) => {
          const avatarUrl = sourceIdentityAvatarUrl(summary.strongestReceipt) || summary.imageUrl;
          return (
            <a className="toolIntelMiniRow" href={summary.sourceUrl} target="_blank" rel="noopener noreferrer" key={summary.key}>
              <SourceIdentityAvatar imageUrl={avatarUrl} fallbackIcon={source.icon} fallbackClassName={source.iconClassName} />
              <span>
                <strong className="toolSourceEntityTitle">{summary.title}</strong>
                {summary.name ? <small className="toolSourceEntityMeta">{summary.name}</small> : null}
              </span>
            </a>
          );
        })}
      </div>
      <span className="toolReportCta">View All →</span>
    </article>
  );
}

function SourceIdentityAvatar({ imageUrl, fallbackIcon, fallbackClassName }: { imageUrl?: string; fallbackIcon: ReactNode; fallbackClassName: string }) {
  if (imageUrl) return <img className="toolSourceAvatar" src={imageUrl} alt="" width={24} height={24} loading="lazy" />;
  return (
    <span className={`toolSourceAvatar toolSourceAvatarFallback ${fallbackClassName}`}>
      {fallbackIcon}
    </span>
  );
}

function ToolEvidence({ tool, evidenceItems }: { tool: Tool; evidenceItems: ToolEvidenceSource[] }) {
  const publicSourceEvidence = evidenceItems.filter((item) => item.sourceType !== "x" || isV2XProofSource(item)).filter((item) => !isOfficialOwnedPublicSource(item, tool));
  const activeSources = receiptSourceCards.filter((source) => publicSourceEvidence.some((item) => item.sourceType === source.type && isPublicSourceDisplayReceipt(item, tool)));
  if (!activeSources.length) return null;

  return (
    <Panel className="toolEvidenceFeed" title="Detected Across Public Sources" subtitle={`Evidence specific to ${tool.name} across indexed public receipts.`}>
      <div className="toolEvidenceRow">
        {activeSources.map((source) => <SourceReceiptCard source={source} evidenceItems={publicSourceEvidence} tool={tool} key={source.type} />)}
      </div>
      <p className="toolReceiptFooter">These receipts answer where {tool.name} is appearing across public sources.</p>
    </Panel>
  );
}

function sourceSummariesFor(evidenceItems: ToolEvidenceSource[]) {
  if (evidenceItems.some(isV2XProofSource)) {
    return evidenceItems.filter(isV2XProofSource).map((item) => ({
      key: item.id,
      name: [item.sourceAuthor, item.platformLabel].filter(Boolean).join(" · "),
      count: 1,
      strongestReceipt: item,
      title: sourceTitleForDisplay(item),
      sourceUrl: item.sourceUrl,
      imageUrl: item.sourceImageUrl
    }));
  }

  const groups = new Map<string, { name: string; receipts: ToolEvidenceSource[] }>();

  evidenceItems.forEach((item) => {
    const name = sourceNameForEvidence(item);
    const key = normalizeToolName(name);
    const existing = groups.get(key);
    if (existing) {
      existing.receipts.push(item);
      return;
    }
    groups.set(key, { name, receipts: [item] });
  });

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      name: group.name,
      count: group.receipts.length,
      strongestReceipt: rankEvidence(group.receipts)[0],
      title: sourceTitleForDisplay(rankEvidence(group.receipts)[0]) || group.name,
      sourceUrl: rankEvidence(group.receipts)[0]?.sourceUrl || "#",
      imageUrl: rankEvidence(group.receipts).find((item) => item.sourceImageUrl)?.sourceImageUrl
    }))
    .sort((a, b) => b.count - a.count || evidenceStrength(b.strongestReceipt) - evidenceStrength(a.strongestReceipt));
}

function isV2XProofSource(item: ToolEvidenceSource) {
  return item.sourceType === "x" && item.id.startsWith("xproof_v2_");
}

function sourceIdentityAvatarUrl(item?: ToolEvidenceSource) {
  if (!item) return "";
  if (item.sourceImageUrl) return item.sourceImageUrl;
  if (item.sourceType === "github") return githubAvatarUrl(item.sourceUrl);
  if (item.sourceType === "article") return faviconUrlFor(item.sourceUrl);
  return "";
}

function sourceNameForEvidence(item: ToolEvidenceSource) {
  if (item.sourceType === "github") return githubEntityName(item.sourceUrl) || cleanSourceName(item.sourceAuthor) || "GitHub";
  if (item.sourceType === "x") return cleanSourceName(item.sourceAuthor, ["X"]) || xEntityName(item.sourceUrl) || "X";
  if (item.sourceType === "youtube") return cleanSourceName(item.sourceAuthor, ["YouTube"]) || cleanSourceName(item.platformLabel, ["YouTube"]) || "YouTube";
  return item.sourceAuthor || item.platformLabel || domainFor(item.sourceUrl);
}

function sourceTitleForDisplay(item?: ToolEvidenceSource) {
  if (!item) return "";
  if (item.sourceType === "x") return item.snippet || item.sourceTitle;
  return item.sourceTitle;
}

function isPublicSourceDisplayReceipt(item: ToolEvidenceSource, tool: Tool) {
  if (isOfficialOwnedPublicSource(item, tool)) return false;
  if (isLowValueGithubReceipt(item)) return false;
  return true;
}

function cleanSourceName(value?: string, blocked: string[] = []) {
  const name = String(value ?? "").trim();
  if (!name) return "";
  return blocked.some((item) => normalizeToolName(item) === normalizeToolName(name)) ? "" : name;
}

function githubEntityName(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (owner && repo) return `${owner}/${repo}`;
    return owner || "";
  } catch {
    return "";
  }
}

function githubAvatarUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const [owner] = url.pathname.split("/").filter(Boolean);
    return owner ? `https://github.com/${owner}.png?size=48` : "";
  } catch {
    return "";
  }
}

function faviconUrlFor(sourceUrl: string) {
  const domain = domainFor(sourceUrl);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : "";
}

function isLowValueGithubReceipt(item: ToolEvidenceSource) {
  if (item.sourceType !== "github") return false;
  try {
    const url = new URL(item.sourceUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
    const [owner, repo] = segments;
    if (hostname === "docs.github.com") return true;
    if (!owner || !repo) return true;
    if (["topics", "marketplace", "features", "explore", "collections", "trending", "login"].includes(owner)) return true;
    if (["docs", "documentation", "wiki", "marketplace"].includes(repo)) return true;
    if (segments.some((segment) => ["docs", "documentation", "wiki", "marketplace"].includes(segment))) return true;
    return false;
  } catch {
    return true;
  }
}

function xEntityName(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const [handle] = url.pathname.split("/").filter(Boolean);
    return handle ? `@${handle}` : "";
  } catch {
    return "";
  }
}

const officialSourceKeysByTool: Record<string, string[]> = {
  chatgpt: ["openai", "chatgpt"],
  claude: ["anthropic", "anthropics", "claude", "claudeai"],
  cursor: ["cursor", "anysphere"],
  elevenlabs: ["elevenlabs"],
  heygen: ["heygen"],
  n8n: ["n8n"],
  vercel: ["vercel"]
};

function isOfficialOwnedPublicSource(item: ToolEvidenceSource, tool: Tool) {
  const keys = officialSourceKeysForTool(tool);
  if (!keys.length) return false;

  if (item.sourceType === "x" || item.sourceType === "youtube") {
    const entityName = sourceNameForEvidence(item);
    return officialKeyMatches(entityName, keys);
  }

  if (item.sourceType === "github") {
    const owner = githubEntityName(item.sourceUrl).split("/")[0];
    return officialKeyMatches(owner, keys);
  }

  if (item.sourceType === "article") {
    return officialDomainMatches(item.sourceUrl, tool);
  }

  return false;
}

function officialSourceKeysForTool(tool: Tool) {
  return [
    tool.name,
    tool.slug,
    ...(officialSourceKeysByTool[tool.slug] ?? [])
  ].map(normalizeToolName).filter(Boolean);
}

function officialKeyMatches(value: string, keys: string[]) {
  const normalized = normalizeToolName(value);
  return keys.some((key) => normalized === key || normalized.includes(key));
}

function officialDomainMatches(sourceUrl: string, tool: Tool) {
  const sourceDomain = rootDomainForUrl(sourceUrl);
  const officialDomain = rootDomainForUrl(tool.websiteUrl);
  if (!sourceDomain || !officialDomain) return false;
  return sourceDomain === officialDomain || sourceDomain.endsWith(`.${officialDomain}`);
}

function rootDomainForUrl(sourceUrl: string) {
  try {
    const parts = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase().split(".").filter(Boolean);
    return parts.length > 2 ? parts.slice(-2).join(".") : parts.join(".");
  } catch {
    return "";
  }
}

type ToolRelationshipSummary = {
  tool: Tool;
  receipts: ToolEvidenceSource[];
  sharedReceiptCount: number;
  sourceMix: Array<{ type: ToolEvidenceSource["sourceType"]; count: number }>;
};

type EvidenceGraphGroup = {
  key: string;
  label: string;
  href?: string;
  ctaLabel: string;
  toolSlugs: string[];
  toolNames: string[];
  receipts: ToolEvidenceSource[];
  sourceMix: Array<{ type: ToolEvidenceSource["sourceType"]; count: number }>;
  lastSeen: string;
};

function CommonlyAppearsWithOverview({ tool, relationships }: { tool: Tool; relationships: ToolRelationshipSummary[] }) {
  return (
    <Panel className="toolRelationshipPanel" title="Commonly Appears With" subtitle={`Collapsed relationship overview for tools appearing with ${tool.name}.`}>
      {relationships.length ? (
        <div className="toolCommonGrid">
          {relationships.slice(0, 5).map((relationship) => (
            <Link className="toolCommonCard" href={`/tools/${relationship.tool.slug}`} key={relationship.tool.slug}>
              <ToolLogo officialSrc={relationship.tool.officialLogoUrl} src={relationship.tool.logoUrl} faviconSrc={relationship.tool.faviconUrl} fallback={relationship.tool.iconUrl} alt="" size={30} />
              <span>
                <strong>{relationship.tool.name}</strong>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="toolEmptyState">No related-tool graph receipts are indexed for {tool.name} yet.</p>
      )}
    </Panel>
  );
}

function EvidenceMicroWorkflows({ tool, groups }: { tool: Tool; groups: EvidenceGraphGroup[] }) {
  return (
    <Panel className="toolRelationshipReceipts" title="Micro Workflows" subtitle={`Exact two-tool connections involving ${tool.name}.`}>
      {groups.length ? (
        <div className="toolRelationshipReceiptList">
          {groups.map((group) => <EvidenceGraphGroupCard group={group} key={group.key} />)}
        </div>
      ) : (
        <p className="toolEmptyState">No exact two-tool micro workflow receipts are indexed for {tool.name} yet.</p>
      )}
    </Panel>
  );
}

function EvidenceWorkflows({ tool, groups }: { tool: Tool; groups: EvidenceGraphGroup[] }) {
  return (
    <Panel className="toolRelationshipReceipts" title="Workflows" subtitle={`Three-plus-tool stacks involving ${tool.name}.`}>
      {groups.length ? (
        <div className="toolRelationshipReceiptList">
          {groups.map((group) => <EvidenceGraphGroupCard group={group} key={group.key} />)}
        </div>
      ) : (
        <p className="toolEmptyState">No three-plus-tool workflow receipts are indexed for {tool.name} yet.</p>
      )}
    </Panel>
  );
}

function EvidenceGraphGroupCard({ group }: { group: EvidenceGraphGroup }) {
  return (
    <article className="toolRelationshipReceiptGroup">
      <div className="toolRelationshipReceiptHeader">
        <div>
          <h3>{group.label}</h3>
          <div className="toolStackSummary compact">
            <WorkflowStack toolSlugs={group.toolSlugs} limit={5} />
          </div>
        </div>
        <span className="toolGraphStats">
          {group.href ? <Link className="toolReportCta" href={group.href}>{group.ctaLabel}</Link> : <em>{group.ctaLabel}</em>}
        </span>
      </div>
    </article>
  );
}
function TrendingCard({ tool }: { tool: Tool; rank: number }) {
  return (
    <aside className="toolTrendPanel">
      <h2>About {tool.name}</h2>
      <div className="toolTrendStats toolAboutStats">
        <span><small>Category</small><strong>{displayCategory(tool.category)}</strong></span>
        <span><small>Use cases</small><strong>{tool.useCases.slice(0, 2).join(", ")}</strong></span>
        <span><small>Platform</small><strong>{tool.supportedPlatforms.slice(0, 3).join(", ")}</strong></span>
        <span><small>Pricing</small><strong>{tool.pricingSummary}</strong></span>
        <span><small>Launch Year</small><strong>{knownYear(tool.launchDate) || "Not listed"}</strong></span>
        <span><small>Status</small><strong>{publicTrackingState(tool)}</strong></span>
      </div>
    </aside>
  );
}

function Panel({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: ReactNode }) {
  return (
    <section className={["toolIntelPanel", className].filter(Boolean).join(" ")}>
      <div className="toolPanelHeader">
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
      {children}
    </section>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return <span><strong>{title}</strong><small>{text}</small></span>;
}

function CommonToolCard({ tool, index }: { tool: Tool; index: number }) {
  const detections = Math.max(8, Math.round(tool.workflowInclusions * (1.9 - index * 0.18)));
  const growth = Math.max(4, Math.round(Math.abs(tool.growth24h) / 2 + 12 - index * 3));
  const lastSeen = lastSeenFor(tool);
  return (
    <Link className="toolCommonCard" href={`/tools/${tool.slug}`}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={30} />
      <span><strong>{tool.name}</strong><small>{detections} detections</small><small>+{growth}% 24H</small><small>Last seen {lastSeen}</small></span>
    </Link>
  );
}

function VerifiedWorkflowRow({ workflow }: { workflow: WorkflowType }) {
  const stackTools = toolsForWorkflow(workflow);
  const detections = workflowDetectionCount(workflow);
  return (
    <article className="toolVerifiedWorkflowRow">
      <div>
        <strong>{workflow.name}</strong>
        <p>{workflow.outcome}</p>
        <div className="toolStackSummary compact">
          <WorkflowStack toolSlugs={workflow.toolSlugs} limit={5} />
          <small>{stackTools.map((item) => item.name).join(" + ")}</small>
        </div>
      </div>
      <span><small>Detections</small><strong>{detections}</strong></span>
      <span><small>Creators</small><strong>{workflow.creatorUsage || Math.max(1, Math.round(detections / 3))}</strong></span>
      <Link className="toolReportCta" href={`/workflows/${workflow.slug}`}>View</Link>
    </article>
  );
}

function MicroWorkflowCard({ microWorkflow, index }: { microWorkflow: (typeof microWorkflows)[number]; index: number }) {
  const usage = index === 1 || index === 3 ? "Medium usage" : "High usage";
  const stackTools = toolsForMicroWorkflow(microWorkflow.slug);
  return (
    <Link className="toolMicroCard" href="/workflows">
      <strong>{microWorkflow.name}</strong>
      <small>{usage}</small>
      {stackTools.length ? <em>{stackTools.map((item) => item.name).join(" + ")}</em> : null}
    </Link>
  );
}

function CreatorCard({ creator, relationshipType }: { creator: CreatorProfile; relationshipType: CreatorAdoptionRelationshipType }) {
  const tags = [creator.primarySpecialization, ...creator.specializationTags].filter(Boolean).slice(0, 1);
  return (
    <Link href={`/creators/${creator.id}`} className="toolIntelCreatorCard">
      <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={54} />
      <strong>{creator.name}</strong>
      <small className="toolRelationshipBadge">{relationshipBadgeLabel(relationshipType)}</small>
      <small>{creator.handle}</small>
      <em>{tags.map((tag) => tag ? tag.replace(/^AI\s+/, "").replace(/ AI$/, "") : "").join(" · ") || creator.creatorCategory}</em>
      {creator.followers ? <small>{compactNumber(creator.followers)} followers</small> : null}
      <span>{creator.workflowSlugs.length ? `Linked to ${creator.workflowSlugs.length} workflows` : "Add workflow links"}</span>
    </Link>
  );
}

function WorkflowCard({ workflow }: { workflow: WorkflowType }) {
  const workflowCreators = creatorsForWorkflow(workflow.slug);
  const stackTools = toolsForWorkflow(workflow);
  return (
    <Link href={`/workflows/${workflow.slug}`} className="toolIntelWorkflowCard">
      <strong>{workflow.name}</strong>
      <WorkflowStack toolSlugs={workflow.toolSlugs} />
      <small>{stackTools.map((tool) => tool.name).join(" · ")}</small>
      <em>{workflowCreators.length ? `${workflowCreators.length} creator ${workflowCreators.length === 1 ? "relationship" : "relationships"}` : "Add creator relationships"}</em>
      {workflowCreators.length ? (
        <span className="workflowCreatorStrip">
          {workflowCreators.slice(0, 5).map((creator) => <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={18} key={creator.id} />)}
        </span>
      ) : (
        <span className="workflowCreatorStrip empty">No public creator links yet</span>
      )}
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | ReactNode }) {
  if (!value) return null;
  return <div><small>{label}</small><strong>{value}</strong></div>;
}

function ToolMiniRow({ tool, showGrowth = false }: { tool: Tool; showGrowth?: boolean }) {
  return (
    <Link className="toolIntelMiniRow" href={`/tools/${tool.slug}`}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} />
      <span><strong>{tool.name}</strong><small>{displayCategory(tool.category)}</small></span>
      {showGrowth ? <MovementBadge value={tool.growth24h} /> : null}
    </Link>
  );
}

function TagRail({ tool, tags }: { tool: Tool; tags: string[] }) {
  return (
    <div className="toolIntelTags">
      <Link href={`/categories/${slugify(tool.category)}`}>{displayCategory(tool.category)}</Link>
      {tags.map((tag) => <Link href={`/tags/${ecosystemTagSlug(tag)}`} key={tag}>{tag}</Link>)}
    </div>
  );
}

type CreatorAdoptionRelationshipType = Extract<CreatorToolRelationship["relationshipType"], "uses" | "teaches">;

function isCreatorAdoptionRelationship(relationship: CreatorToolRelationship): relationship is CreatorToolRelationship & { relationshipType: CreatorAdoptionRelationshipType } {
  return relationship.relationshipType === "uses" || relationship.relationshipType === "teaches";
}

function creatorRelationshipsForTool(tool: Tool) {
  return creatorToolRelationships
    .filter((relationship) => relationship.status === "accepted" && relationship.toolSlug === tool.slug && isCreatorAdoptionRelationship(relationship))
    .map((relationship) => {
      const creator = creators.find((item) => item.id === relationship.creatorId);
      return creator ? { creator, relationshipType: relationship.relationshipType } : null;
    })
    .filter((item): item is { creator: CreatorProfile; relationshipType: CreatorAdoptionRelationshipType } => Boolean(item))
    .slice(0, 5);
}

function relationshipBadgeLabel(type: CreatorAdoptionRelationshipType) {
  return type === "uses" ? "Uses" : "Teaches";
}

function creatorsForWorkflow(workflowSlug: string) {
  return creators.filter((creator) => creator.workflowSlugs.includes(workflowSlug));
}

function reasonsForTool(tool: Tool, workflowCount: number, relatedCount: number, creatorCount: number, mentionCount: number) {
  const hasPublicCreatorEvidence = creatorCount > 0 || mentionCount > 0;
  return [
    hasPublicCreatorEvidence
      ? { title: "Verified creator context indexed", text: `${creatorCount + mentionCount} public creator ${creatorCount + mentionCount === 1 ? "relationship is" : "relationships are"} attached to this profile.` }
      : tool.creatorMentions
        ? { title: "Creator attention", text: "Seeded attention metrics show creator-side activity and room to connect more public attribution." }
        : { title: "Creator relationships", text: "Connect creator usage to improve product discovery." },
    workflowCount
      ? { title: `Active in ${displayCategory(tool.category)} workflows`, text: `Appears in ${workflowCount} tracked workflow ${workflowCount === 1 ? "stack" : "stacks"} on AppScreener.` }
      : { title: "Workflow relationships forming", text: "No verified workflow stack currently includes this tool." },
    relatedCount
      ? { title: "Often paired with adjacent tools", text: "Relationship mapping shows nearby products in similar workflow and category lanes." }
      : { title: "Adjacent tools", text: "Connect adjacent products to strengthen graph traversal." },
    { title: "Growing in ecosystem discovery", text: `${tool.name} is part of the current organic discovery universe for ${displayCategory(tool.category)}.` }
  ];
}

function relatedToolsFor(tool: Tool) {
  const explicit = tool.relatedTools.map(getTool).filter(isTool);
  const fallback = tools.filter((item) => item.category === tool.category && item.slug !== tool.slug);
  return [...new Map([...explicit, ...fallback].map((item) => [item.slug, item])).values()].slice(0, 5);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function domainFor(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function knownYear(date: string) {
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) ? String(year) : "";
}

function sourceTypeLabel(type: ToolEvidenceSource["sourceType"]) {
  if (type === "x") return "X";
  if (type === "youtube") return "YouTube";
  if (type === "github") return "GitHub";
  if (type === "docs") return "Docs";
  if (type === "official") return "Official";
  if (type === "news") return "News";
  if (type === "newsletter_blog") return "Newsletter / Blog";
  if (type === "directory") return "Directory";
  if (type === "article") return "Article";
  return "Other";
}

const comparisonEvidencePattern = /\b(vs\.?|versus|comparison|compare|compared|alternatives?|alternative to|replacement for|competitors?|which should you choose|which is better)\b/i;
const listicleSpamEvidencePattern = /\b(top ai tools|best ai tools|100 ai tools|50 ai tools|must have ai tools|ultimate ai tools list)\b/i;
function evidenceText(item: ToolEvidenceSource) {
  return `${item.sourceTitle || ""} ${item.snippet || ""} ${item.sourceUrl || ""}`;
}

function isComparisonEvidence(item: ToolEvidenceSource) {
  return comparisonEvidencePattern.test(evidenceText(item));
}

function isListicleSpamEvidence(item: ToolEvidenceSource) {
  return listicleSpamEvidencePattern.test(evidenceText(item));
}

function isToolEvidence(item: ToolEvidenceSource) {
  return !isComparisonEvidence(item) && !isListicleSpamEvidence(item);
}

function isCurrentToolOnlyEvidence(item: ToolEvidenceSource, tool: Tool) {
  return item.matchedTools.length === 1 && normalizeToolName(item.matchedTools[0]) === normalizeToolName(tool.name);
}

function evidenceIncludesCurrentTool(item: ToolEvidenceSource, tool: Tool) {
  return item.matchedTools.some((toolName) => normalizeToolName(toolName) === normalizeToolName(tool.name));
}

function evidenceGraphGroups(tool: Tool, evidenceItems: ToolEvidenceSource[], layer: "micro" | "workflow"): EvidenceGraphGroup[] {
  const expectedLength = layer === "micro" ? 2 : 3;
  const knownTools = new Map(tools.map((item) => [normalizeToolName(item.name), item]));
  const groups = new Map<string, { toolSlugs: string[]; toolNames: string[]; receipts: ToolEvidenceSource[] }>();

  evidenceItems
    .filter((item) => layer === "micro" ? item.matchedTools.length === expectedLength : item.matchedTools.length >= expectedLength)
    .filter((item) => evidenceIncludesCurrentTool(item, tool))
    .forEach((item) => {
      const matched = item.matchedTools
        .map((toolName) => knownTools.get(normalizeToolName(toolName)))
        .filter(isTool)
        .filter((matchedTool, index, list) => list.findIndex((candidate) => candidate.slug === matchedTool.slug) === index);
      if (layer === "micro" && matched.length !== 2) return;
      if (layer === "workflow" && matched.length < 3) return;

      const key = matched.map((matchedTool) => matchedTool.slug).sort().join("|");
      const existing = groups.get(key);
      if (existing) {
        existing.receipts.push(item);
        return;
      }
      groups.set(key, {
        toolSlugs: matched.map((matchedTool) => matchedTool.slug),
        toolNames: matched.map((matchedTool) => matchedTool.name),
        receipts: [item]
      });
    });

  return [...groups.entries()]
    .map(([key, group]) => {
      const uniqueReceipts = rankEvidence([...new Map(group.receipts.map((item) => [item.id, item])).values()]);
      return {
        key,
        ...graphGroupRoute(group.toolSlugs, group.toolNames, layer),
        toolSlugs: group.toolSlugs,
        toolNames: group.toolNames,
        receipts: uniqueReceipts,
        sourceMix: sourceMixFor(uniqueReceipts),
        lastSeen: relativeLastSeen(uniqueReceipts[0]?.detectedAt)
      };
    })
    .sort((a, b) => b.receipts.length - a.receipts.length || evidenceStrength(b.receipts[0]) - evidenceStrength(a.receipts[0]));
}

function graphGroupRoute(toolSlugs: string[], toolNames: string[], layer: "micro" | "workflow"): { label: string; href?: string; ctaLabel: string } {
  const exactKey = [...toolSlugs].sort().join("|");
  if (layer === "workflow") {
    const knownWorkflow = workflows.find((workflow) => [...workflow.toolSlugs].sort().join("|") === exactKey);
    if (knownWorkflow) return { label: knownWorkflow.name, href: `/workflows/${knownWorkflow.slug}`, ctaLabel: "View Workflow →" };
    return { label: toolNames.join(" + "), href: "/workflows", ctaLabel: "View Workflow →" };
  }
  const knownMicroWorkflow = microWorkflows.find((microWorkflow) => [...toolsForMicroWorkflow(microWorkflow.slug).map((tool) => tool.slug)].sort().join("|") === exactKey);
  return {
    label: knownMicroWorkflow?.name || toolNames.join(" + "),
    href: `/micro-workflows/${microWorkflowPairSlug(toolSlugs)}`,
    ctaLabel: "View Micro Workflow →"
  };
}

function microWorkflowPairSlug(toolSlugs: string[]) {
  return [...toolSlugs].sort().join("-");
}

function commonRelationshipSummaries(tool: Tool, groups: EvidenceGraphGroup[]): ToolRelationshipSummary[] {
  const currentToolKey = normalizeToolName(tool.name);
  const knownTools = new Map(tools.map((item) => [item.slug, item]));
  const relationshipGroups = new Map<string, { tool: Tool; receipts: ToolEvidenceSource[] }>();

  groups.forEach((group) => {
    group.toolSlugs.forEach((toolSlug) => {
      const relatedTool = knownTools.get(toolSlug);
      if (!relatedTool || normalizeToolName(relatedTool.name) === currentToolKey) return;
      const existing = relationshipGroups.get(relatedTool.slug);
      if (existing) {
        existing.receipts.push(...group.receipts);
        return;
      }
      relationshipGroups.set(relatedTool.slug, {
        tool: relatedTool,
        receipts: [...group.receipts]
      });
    });
  });

  return [...relationshipGroups.values()]
    .map((group) => {
      const uniqueReceipts = [...new Map(group.receipts.map((item) => [item.id, item])).values()];
      return {
        tool: group.tool,
        receipts: rankEvidence(uniqueReceipts),
        sharedReceiptCount: uniqueReceipts.length,
        sourceMix: sourceMixFor(uniqueReceipts)
      };
    })
    .sort((a, b) => b.sharedReceiptCount - a.sharedReceiptCount || evidenceStrength(b.receipts[0]) - evidenceStrength(a.receipts[0]));
}

function sourceMixFor(receipts: ToolEvidenceSource[]) {
  const types: ToolEvidenceSource["sourceType"][] = ["x", "youtube", "github", "docs", "official", "news", "newsletter_blog", "article", "directory", "other"];
  return types
    .map((type) => ({ type, count: receipts.filter((item) => item.sourceType === type).length }))
    .filter((source) => source.count > 0);
}

function normalizeToolName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function relativeLastSeen(value?: string) {
  if (!value) return "recently";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return formatEvidenceDate(value);
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function rankEvidence(items: ToolEvidenceSource[]) {
  return [...items].sort((a, b) => evidenceStrength(b) - evidenceStrength(a));
}

function evidenceStrength(item: ToolEvidenceSource) {
  const typeWeight: Record<ToolEvidenceSource["sourceType"], number> = {
    x: 32,
    youtube: 31,
    github: 30,
    docs: 26,
    official: 24,
    news: 22,
    newsletter_blog: 20,
    article: 18,
    directory: 3,
    other: 1
  };
  const workflowLanguage = /\b(workflow|build|deploy|automate|automation|agent|stack|integrat|template|tutorial|guide|using|with)\b/i.test(`${item.sourceTitle} ${item.snippet}`);
  const detectedAt = new Date(item.detectedAt).getTime();
  const recency = Number.isFinite(detectedAt) ? Math.min(8, Math.max(0, Math.round((detectedAt - Date.now() + 1000 * 60 * 60 * 24 * 30) / (1000 * 60 * 60 * 24 * 4)))) : 0;
  return item.matchedTools.length * 20 + typeWeight[item.sourceType] + (workflowLanguage ? 12 : 0) + recency;
}

function formatEvidenceDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function workflowDetectionCount(workflow: WorkflowType) {
  return Math.max(8, Math.round(workflow.savesCount / 85 + workflow.creatorUsage * 2 + workflow.toolSlugs.length * 4));
}

function toolDetectionCount(tool: Tool) {
  return Math.max(12, tool.workflowInclusions * 7 + Math.round(tool.mentions24h / 20));
}

function uniqueCreatorCount(tool: Tool) {
  return Math.max(1, Math.round(tool.creatorMentions * 0.65));
}

function lastSeenFor(tool: Tool) {
  if (tool.growth24h >= 40) return "1h ago";
  if (tool.growth24h >= 20) return "3h ago";
  if (tool.growth24h >= 8) return "6h ago";
  return "12h ago";
}

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString();
}
