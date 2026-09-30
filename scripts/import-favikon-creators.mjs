import fs from "node:fs/promises";
import path from "node:path";

const TARGET_COUNT = 100;
const OUT_DIR = path.join(process.cwd(), "data");
const IMPORT_PATH = path.join(OUT_DIR, "favikon-creators.json");
const REPORT_PATH = path.join(OUT_DIR, "favikon-creator-import-report.json");
const FAVIKON_PUBLIC_AI_ARTISTS_URL = "https://www.favikon.com/blog/top-ai-artists-social-media";
const FAVIKON_PUBLIC_URLS = [
  FAVIKON_PUBLIC_AI_ARTISTS_URL,
  "https://www.favikon.com/blog/top-ai-experts",
  "https://www.favikon.com/rankings"
];

const PUBLIC_AI_ARTISTS_SNAPSHOT = [
  ["John Cut", 1, "Entrepreneur and technologist building bridges between innovation, creativity, and real-world application. Founder of projects such as Resona and Dream Path, he turns experimental ideas into working products and treats AI as a tool serving humans.", 8858],
  ["Tyler M. Bernabe", 2, "Tyler M. Bernabe, known as jboogx.creative, is a VFX and AI artist teaching tools for generative art. He has collaborated with Coachella, Will Smith, Meta AI, Anyma, and Grimes, and shares tutorials on AI workflows, Midjourney, and animation.", 8765],
  ["Lucas Gabriel", 3, "Brazilian designer and AI enthusiast building digital businesses with a focus on design, AI, and creativity. Founder of Principium School, with work blending graphic design and generative AI tools for branding and content workflows.", 8723],
  ["Hidreley Diao", 4, "Brazilian AI art pioneer creating AI-generated caricatures and digital art, collaborating with Bored Panda and high-profile names. His work blends pop culture tributes, social storytelling, and recognizable AI creativity.", 8693],
  ["Gizem Akdag", 5, "AI art focused brand designer and Creative Director blending branding with generative imagery. Gizem creates AI-driven visuals and videos for brands, builds visual systems, and shares prompt formulas.", 8640],
  ["Sara Shakeel", 6, "Award-winning artist known for crystal art and imaginative digital creations. Her work explores healing and connection, using AI to bring visual ideas to life.", 8632],
  ["If Only", 7, "AI artist based in Paris specializing in merging art and artificial intelligence. The creator shares original artworks and prompts primarily using Midjourney, with imaginative scenarios and visual storytelling.", 8573],
  ["Bilawal Sidhu", 8, "Prominent AI creator and influencer with over 1.4M subscribers across platforms. He specializes in VFX, 3D, generative AI, spatial intelligence, tutorials, and creative projects.", 8554],
  ["Libre777AI", 9, "Spanish-speaking AI content creator delivering original AI-focused videos, playful parrot-themed humor, tech insights, quick AI explainers, and high-engagement TikTok clips.", 8484],
  ["Nabab Uddin", 10, "AI content creator and prompt engineer producing AI-driven films, music videos, and experimental visuals. Based in Mumbai, he partners with HeyGen, Kling, ImagineArt, and Veo3 and has 135K+ Instagram followers.", 8481],
  ["James Gerde", 11, "Seattle-based AI animator and filmmaker with over 1.7M Instagram followers. His work focuses on surreal AI-generated animations blending art and technology across nature, food, and dance.", 8461],
  ["Mac Baconai", 12, "Creative ambassador for Perplexity and Leonardo.Ai, focused on aesthetic content, artistic expression, motivational messages, and a community around creativity.", 8446],
  ["Nitesh", 13, "AI art and illustration specialist crafting blueprint-style, high-detail digital artworks featuring cars and pop culture icons. He produces downloadable wallpapers and long-running visual series.", 9209],
  ["Joann", 14, "Joann, also known as Joann AI Studio, creates AI-driven art and imaginary fashion campaigns through AI-assisted art direction, textile-inspired visuals, and wearable concepts.", 8431],
  ["Will Toulan", 15, "Digital artist creating AI-generated 3D artworks using Cinema 4D and Midjourney prompts, with surreal landscapes, abstract scenes, and AI-assisted visual design.", 8370],
  ["Hannes Caspar", 16, "AI artist and photographer known for AI-generated art and the project The Unreal People, sharing daily portraits and stories through a digital lens.", 8370],
  ["AIFusionMaster", 17, "AI content creator known for TikTok videos that depict countries and zodiac signs in humorous and imaginative ways, sharing viral prompts and AI-generated art.", 8366],
  ["Sahid SK", 18, "Creative professional and co-founder of Megalodon specializing in AI-generated content, reimagining popular culture through AI with humor and social commentary.", 8362],
  ["Ali Aboutine", 19, "AI artist creating whimsical and fantastical content, often featuring mythical creatures, oceanic themes, imaginative storytelling, alien diplomacy, and ancient horror.", 8352],
  ["Josh Gottsegen", 20, "Josh Gottsegen, known as Tropland Universe, creates a digital animal kingdom through AI-generated art, vibrant wildlife depictions, and heartwarming digital storytelling.", 8351]
];

const decodeEntities = (value = "") => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

const slugify = (value = "") => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const canonicalName = (value = "") => decodeEntities(value).split(/[|:-]/)[0].trim().replace(/\s+/g, " ");

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result;
}

function parseFollowerCount(text = "") {
  const match = text.match(/([\d.]+)\s*(M|million|K|k)\+?\s+(?:subscribers|followers)/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "m" || unit === "million") return Math.round(value * 1_000_000);
  return Math.round(value * 1_000);
}

function inferPlatform(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("youtube")) return "YouTube";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("instagram")) return "Instagram";
  if (lower.includes("linkedin")) return "LinkedIn";
  if (lower.includes("twitter") || lower.includes("x.com")) return "X";
  if (lower.includes("newsletter")) return "Newsletter";
  return "Multi-platform";
}

function tagsFor(text = "") {
  const lower = text.toLowerCase();
  const tags = new Set(["ai art", "creator signal"]);
  for (const tag of ["generative ai", "midjourney", "animation", "video", "vfx", "branding", "fashion", "prompt engineering", "tiktok", "instagram", "design", "filmmaking"]) {
    if (lower.includes(tag)) tags.add(tag);
  }
  return [...tags].slice(0, 8);
}

function toolSlugsFor(text = "") {
  const lower = text.toLowerCase();
  const matches = [];
  const candidates = [
    ["midjourney", "Midjourney"],
    ["perplexity", "Perplexity"],
    ["leonardo", "Leonardo.Ai"],
    ["heygen", "HeyGen"],
    ["kling", "Kling"],
    ["veo3", "Veo3"],
    ["veo", "Veo3"]
  ];
  for (const [needle, slug] of candidates) {
    if (lower.includes(needle)) matches.push(slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  }
  return [...new Set(matches)];
}

function validateCreator(raw) {
  const hasName = Boolean(raw.name);
  const hasProfile = Boolean(raw.xUrl || raw.youtubeUrl || raw.linkedinUrl || raw.instagramUrl || raw.tiktokUrl || raw.websiteUrl);
  const hasAvatar = Boolean(raw.avatarUrl);
  const hasCategory = Boolean(raw.creatorCategory || raw.niches?.length);
  const accepted = hasName && hasProfile && hasAvatar && hasCategory;
  return {
    accepted,
    listingStatus: accepted ? "accepted" : "pending_review",
    sourceConfidence: accepted ? 92 : Math.round(55 + [hasName, hasProfile, hasAvatar, hasCategory].filter(Boolean).length * 8),
    verificationSignals: [
      "favikon_public_ranking_presence",
      hasProfile ? "creator_profile_or_social_present" : "profile_or_social_missing",
      hasAvatar ? "avatar_present" : "avatar_missing",
      hasCategory ? "creator_category_present" : "creator_category_missing"
    ]
  };
}

function normalizeCreator(input, importedAt, sourceMode) {
  const name = canonicalName(input.name);
  const slug = slugify(name);
  const bio = decodeEntities(input.bio);
  const followerCount = input.followerCount || parseFollowerCount(bio);
  const platform = input.primaryPlatform || inferPlatform(`${bio} ${input.niches?.join(" ") ?? ""}`);
  const rankingPosition = Number(input.rankingPosition || 0);
  const creatorScore = input.creatorScore || Math.min(100, Math.round((input.authorityScore || 7600) / 100));
  const niches = input.niches?.length ? input.niches : tagsFor(bio);
  const raw = {
    id: `creator_${slug}`,
    name,
    slug,
    handle: input.handle || "",
    avatarUrl: input.avatarUrl || "",
    bio,
    primaryPlatform: platform,
    platform,
    xUrl: input.xUrl || "",
    youtubeUrl: input.youtubeUrl || "",
    linkedinUrl: input.linkedinUrl || "",
    instagramUrl: input.instagramUrl || "",
    tiktokUrl: input.tiktokUrl || "",
    websiteUrl: input.websiteUrl || "",
    followerCount,
    followers: followerCount,
    creatorCategory: input.creatorCategory || "AI Artists",
    niches,
    rankingPosition,
    sourceUrl: input.sourceUrl || FAVIKON_PUBLIC_AI_ARTISTS_URL,
    importedFrom: "Favikon",
    importedAt,
    sourceMode,
    workflowSlugs: [],
    toolSlugs: toolSlugsFor(bio),
    recentMentions: [`Creator ranking signal #${rankingPosition || "unranked"}`, ...niches.slice(0, 2).map((tag) => `Creator signal: ${tag}`)],
    creatorScore,
    categorySlugs: ["ai-image", "ai-video", "ai-design"]
  };
  return { ...raw, ...validateCreator(raw) };
}

function extractCreatorsFromHtml(html, sourceUrl) {
  const text = decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n"));
  const sectionPattern = /(?:^|\n)\s*(?:#{1,4}\s*)?(\d{1,3})\.?\s+([A-Z][^\n]{2,80})\s*\n([\s\S]*?)(?=(?:\n\s*(?:#{1,4}\s*)?\d{1,3}\.?\s+[A-Z])|$)/g;
  const creators = [];
  for (const match of text.matchAll(sectionPattern)) {
    const rankingPosition = Number(match[1]);
    const name = canonicalName(match[2]);
    const body = decodeEntities(match[3]);
    if (!name || rankingPosition > TARGET_COUNT || !/AI|art|creator|generative|technology|prompt|video|VFX|Midjourney/i.test(body)) continue;
    const score = body.match(/Favikon Authority Score\s*:?\s*([\d\s]+)/i)?.[1]?.replace(/\s/g, "");
    creators.push({
      name,
      rankingPosition,
      bio: body.split(/Favikon Authority Score/i)[0].trim(),
      authorityScore: score ? Number(score) : undefined,
      creatorCategory: "AI Creators",
      sourceUrl
    });
  }
  return creators;
}

async function fetchPage(url, report) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "AppScreener creator importer" } });
    const text = await response.text();
    const blocked = response.status >= 400 || /login|sign in|cloudflare|just a moment/i.test(text);
    if (blocked) report.blockedPages.push({ url, status: response.status, reason: "blocked, login-gated, or challenge response" });
    else report.fetchedPages.push({ url, status: response.status });
    return blocked ? "" : text;
  } catch (error) {
    report.blockedPages.push({ url, status: 0, reason: error instanceof Error ? error.message : String(error) });
    return "";
  }
}

await fs.mkdir(OUT_DIR, { recursive: true });

const importedAt = new Date().toISOString();
const report = {
  targetCount: TARGET_COUNT,
  source: "Favikon",
  importedAt,
  fetchedPages: [],
  blockedPages: [],
  usedPublicSnapshot: false,
  discovered: 0,
  imported: 0,
  accepted: 0,
  pendingReview: 0,
  xLinks: 0,
  youtubeLinks: 0,
  linkedinLinks: 0,
  avatars: 0,
  duplicateMergeCount: 0,
  notes: []
};

const rawCreators = [];
for (const url of FAVIKON_PUBLIC_URLS) {
  const html = await fetchPage(url, report);
  if (!html) continue;
  rawCreators.push(...extractCreatorsFromHtml(html, url));
}

if (rawCreators.length === 0) {
  report.usedPublicSnapshot = true;
  report.notes.push("Live Favikon fetch was blocked in this environment, so the importer used a cached public snapshot from Favikon's Top 20 AI Artists public ranking page.");
  rawCreators.push(...PUBLIC_AI_ARTISTS_SNAPSHOT.map(([name, rankingPosition, bio, authorityScore]) => ({
    name,
    rankingPosition,
    bio,
    authorityScore,
    creatorCategory: "AI Artists",
    sourceUrl: FAVIKON_PUBLIC_AI_ARTISTS_URL
  })));
}

const seen = new Set();
const creators = [];
for (const raw of rawCreators) {
  const slug = slugify(canonicalName(raw.name));
  if (!slug) continue;
  if (seen.has(slug)) {
    report.duplicateMergeCount += 1;
    continue;
  }
  seen.add(slug);
  creators.push(normalizeCreator(raw, importedAt, report.usedPublicSnapshot ? "public_snapshot" : "live_public_page"));
  if (creators.length >= TARGET_COUNT) break;
}

report.discovered = rawCreators.length;
report.imported = creators.length;
report.accepted = creators.filter((creator) => creator.listingStatus === "accepted").length;
report.pendingReview = creators.filter((creator) => creator.listingStatus !== "accepted").length;
report.xLinks = creators.filter((creator) => creator.xUrl).length;
report.youtubeLinks = creators.filter((creator) => creator.youtubeUrl).length;
report.linkedinLinks = creators.filter((creator) => creator.linkedinUrl).length;
report.avatars = creators.filter((creator) => creator.avatarUrl).length;

if (report.accepted === 0) {
  report.notes.push("No creators were auto-accepted because the accessible sample lacks creator avatars and direct social/profile links. They are imported as pending_review and can be promoted after live Favikon profile/social data is available.");
}

await fs.writeFile(IMPORT_PATH, `${JSON.stringify(creators, null, 2)}\n`);
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
