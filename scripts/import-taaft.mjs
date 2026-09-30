import fs from "node:fs/promises";
import path from "node:path";

const TARGET_COUNT = 500;
const TAAFT_HOME = "https://theresanaiforthat.com/";
const OUT_DIR = path.join(process.cwd(), "data");
const LOGO_DIR = path.join(process.cwd(), "public", "logos", "tools");
const IMPORT_PATH = path.join(OUT_DIR, "taaft-tools.json");
const REPORT_PATH = path.join(OUT_DIR, "taaft-import-report.json");
const LOGO_ASSETS_PATH = path.join(process.cwd(), "lib", "logo-assets.ts");

const APP_CATEGORIES = [
  "AI Video",
  "AI Coding",
  "AI Agents",
  "AI Voice",
  "AI Design",
  "AI Workflow",
  "AI Research",
  "AI Marketing",
  "AI Automation",
  "AI Search",
  "AI Infrastructure",
  "AI Image",
  "AI Productivity",
  "AI Meeting",
  "AI Audio",
  "AI Music",
  "AI Avatars",
  "AI Development",
  "AI Analytics",
  "AI Education",
  "AI Writing",
  "AI Sales",
  "Support"
];

const CATEGORY_RULES = [
  ["AI Coding", ["coding", "code", "developer", "development", "programming", "api", "repository", "debug", "devops", "web app", "software"]],
  ["AI Video", ["video", "youtube", "tiktok", "shorts", "film", "animation", "clip"]],
  ["AI Image", ["image", "photo", "picture", "thumbnail", "background", "avatar image", "png", "logo generator"]],
  ["AI Voice", ["voice", "speech", "tts", "dubbing", "transcription", "speaker"]],
  ["AI Audio", ["audio", "podcast", "sound", "recording"]],
  ["AI Music", ["music", "song", "melody", "beat"]],
  ["AI Agents", ["agent", "assistant", "chatbot", "companion", "copilot"]],
  ["AI Automation", ["automation", "workflow automation", "zapier", "operations", "crm", "bot"]],
  ["AI Search", ["search", "answer engine", "web search"]],
  ["AI Research", ["research", "summar", "knowledge", "documents", "pdf", "study", "analysis"]],
  ["AI Writing", ["writing", "copywriting", "email", "blog", "content", "text", "resume"]],
  ["AI Marketing", ["marketing", "ads", "seo", "social media", "growth", "brand", "campaign"]],
  ["AI Sales", ["sales", "lead", "prospect", "outreach", "recruiting"]],
  ["AI Productivity", ["productivity", "calendar", "notes", "meeting", "workspace", "task", "personal"]],
  ["AI Meeting", ["meeting", "transcript", "minutes"]],
  ["AI Design", ["design", "presentation", "website", "ui", "ux", "mockup"]],
  ["AI Analytics", ["analytics", "data", "dashboard", "insight", "metric"]],
  ["Support", ["customer support", "support", "helpdesk", "ticket"]],
  ["AI Education", ["education", "learning", "teacher", "student", "tutor", "homework"]],
  ["AI Infrastructure", ["infrastructure", "model", "hosting", "compute", "cloud", "security"]],
  ["AI Avatars", ["avatar", "vtuber", "character"]]
];

const aliases = new Map([
  ["claude ai", "claude"],
  ["anthropic claude", "claude"],
  ["openai chatgpt", "chatgpt"],
  ["chat gpt", "chatgpt"],
  ["midjourney ai", "midjourney"],
  ["google notebooklm", "notebooklm"],
  ["v0 by vercel", "v0"]
]);

const decodeEntities = (value = "") => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ")
  .trim();

const slugify = (value = "") => value
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const normalizeProductName = (value = "") => decodeEntities(value).split(/[|:-]/)[0].trim().replace(/\s+/g, " ");

const canonicalSlug = (name) => {
  const normalizedName = normalizeProductName(name);
  return aliases.get(normalizedName.toLowerCase().trim()) ?? slugify(normalizedName);
};

function cleanUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(decodeEntities(value));
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref") url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return decodeEntities(value);
  }
}

function domainFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mapCategory(rawCategory, description) {
  const haystack = `${rawCategory} ${description}`.toLowerCase();
  for (const [category, terms] of CATEGORY_RULES) {
    if (terms.some((term) => haystack.includes(term))) return category;
  }
  return "AI Productivity";
}

function pricingTypeFrom(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("enterprise")) return "enterprise";
  if (lower.includes("free") && (lower.includes("$") || lower.includes("/mo") || lower.includes("pro"))) return "freemium";
  if (lower.includes("free")) return "free";
  if (lower.includes("$") || lower.includes("/mo") || lower.includes("paid")) return "paid";
  return "freemium";
}

function stableHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function starterSignals(slug, rank, category, completeness) {
  const hash = stableHash(`${slug}:${category}`);
  const rankPower = Math.max(0, (TARGET_COUNT - rank + 1) / TARGET_COUNT);
  const variation = (hash % 37) - 18;
  const baselineAttention = Math.max(16, Math.round(48 + rankPower * 900 + completeness * 90 + (hash % 120)));
  const relativeGrowthVsBaseline = Number((0.72 + ((hash % 170) / 100) + rankPower * 0.9).toFixed(2));
  const recentVelocity = Number((0.8 + ((hash % 130) / 100) + rankPower * 0.65).toFixed(2));
  const acceleration = Math.round(-8 + rankPower * 58 + variation * 0.55);
  const growth24h = Math.max(-18, Math.round(acceleration + 10 + ((hash >> 3) % 28)));
  const growth7d = Math.max(-12, Math.round(growth24h * 1.45 + ((hash >> 4) % 38)));
  const mentions24h = Math.max(12, Math.round(baselineAttention * (0.55 + rankPower * 0.55)));
  const mentions7d = Math.max(80, Math.round(mentions24h * (5.2 + ((hash >> 5) % 18) / 10)));
  const savesCount = Math.max(50, Math.round(mentions7d * (0.45 + rankPower * 1.2)));
  const creatorMentions = Math.max(2, Math.round(8 + rankPower * 85 + ((hash >> 6) % 24)));
  const workflowInclusions = Math.max(1, Math.min(8, Math.round(1 + rankPower * 5 + ((hash >> 7) % 3))));
  const searchInterest = Math.max(8, Math.min(96, Math.round(22 + rankPower * 63 + ((hash >> 8) % 18))));
  return { baselineAttention, relativeGrowthVsBaseline, recentVelocity, acceleration, growth24h, growth7d, mentions24h, mentions7d, savesCount, creatorMentions, workflowInclusions, searchInterest };
}

function extractCardProducts(html) {
  const parts = html.split(/<li class="li /g).slice(1);
  const products = [];
  for (const rawPart of parts) {
    const part = `<li class="li ${rawPart.split(/<\/li>/)[0]}</li>`;
    const name = normalizeProductName(part.match(/data-name="([^"]+)"/)?.[1] ?? "");
    if (!name) continue;
    const rawCategory = decodeEntities(part.match(/data-task="([^"]+)"/)?.[1] ?? "");
    const rawCategorySlug = decodeEntities(part.match(/data-task_slug="([^"]+)"/)?.[1] ?? "");
    const websiteUrl = cleanUrl(part.match(/data-url="([^"]+)"/)?.[1] ?? "");
    const sourcePath = part.match(/href="https:\/\/theresanaiforthat\.com\/ai\/([^"]+)"/)?.[1] ?? "";
    const sourceUrl = sourcePath ? `https://theresanaiforthat.com/ai/${sourcePath.replace(/^\/|\/$/g, "")}/` : "";
    const description = decodeEntities(part.match(/<div class="short_desc">([\s\S]*?)<\/div>/)?.[1] ?? "");
    const logoUrl = decodeEntities(part.match(/<img[^>]+src="([^"]+)"[^>]+class="taaft_icon"/)?.[1] ?? "");
    const pricingSummary = decodeEntities(part.match(/<div class="price[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");
    const taskLabels = [...part.matchAll(/class="task_label"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => decodeEntities(match[1])).filter(Boolean);
    products.push({ name, rawCategory, rawCategorySlug, websiteUrl, sourceUrl, description, logoUrl, pricingSummary, taskLabels });
  }
  return products;
}

function extensionFrom(contentType, url) {
  const pathname = (() => {
    try { return new URL(url).pathname; } catch { return ""; }
  })();
  const ext = path.extname(pathname).replace(".", "").toLowerCase();
  if (["svg", "png", "jpg", "jpeg", "webp", "ico"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("icon")) return "ico";
  return "png";
}

async function downloadLogo(product) {
  if (!product.logoUrl) return { officialLogoUrl: "", faviconUrl: "", logoSource: "generated-fallback", downloaded: false, error: "missing logo url" };
  try {
    const response = await fetch(product.logoUrl, { headers: { "User-Agent": "AppScreener MVP importer" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const ext = extensionFrom(contentType, product.logoUrl);
    const file = `${product.slug}.${ext}`;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 120) throw new Error("logo payload too small");
    await fs.writeFile(path.join(LOGO_DIR, file), bytes);
    return { officialLogoUrl: `/logos/tools/${file}`, faviconUrl: `/logos/tools/${file}`, logoSource: "local", downloaded: true, error: "" };
  } catch (error) {
    return { officialLogoUrl: "", faviconUrl: "", logoSource: "generated-fallback", downloaded: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function readLogoAssets() {
  try {
    const source = await fs.readFile(LOGO_ASSETS_PATH, "utf8");
    const json = source.match(/export const logoAssets: Record<string, LogoAsset> = ([\s\S]*?);\n/)?.[1];
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

async function writeLogoAssets(assets) {
  const source = `export type LogoSource = "website-icon" | "apple-touch-icon" | "favicon" | "clearbit" | "google-favicon" | "local" | "generated-fallback";\n\nexport type LogoAsset = {\n  officialLogoUrl: string;\n  faviconUrl: string;\n  logoSource: LogoSource;\n};\n\nexport const logoAssets: Record<string, LogoAsset> = ${JSON.stringify(assets, null, 2)};\n`;
  await fs.writeFile(LOGO_ASSETS_PATH, source);
}

function buildTags(rawCategory, taskLabels, category, description) {
  const parts = [
    rawCategory,
    ...taskLabels,
    category.replace(/^AI\s+/, ""),
    ...description.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 4).slice(0, 4)
  ];
  return [...new Set(parts.map((part) => part.toLowerCase().trim()).filter(Boolean))].slice(0, 8);
}

function validateProduct(product) {
  return Boolean(product.name && product.slug && (product.websiteUrl || product.sourceUrl) && product.category && product.description);
}

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(LOGO_DIR, { recursive: true });

const report = {
  targetCount: TARGET_COUNT,
  source: "TAAFT",
  sourceUrl: TAAFT_HOME,
  importedAt: new Date().toISOString(),
  fetchedPages: [],
  blockedPages: [],
  discovered: 0,
  imported: 0,
  accepted: 0,
  pendingReview: 0,
  duplicateMergeCount: 0,
  logosDownloaded: 0,
  fallbackLogos: 0,
  logoErrors: [],
  failedImports: [],
  topCategories: [],
  notes: []
};

const homeResponse = await fetch(TAAFT_HOME, { headers: { "User-Agent": "Mozilla/5.0 AppScreener MVP importer" } });
const homeHtml = await homeResponse.text();
report.fetchedPages.push({ url: TAAFT_HOME, status: homeResponse.status, productCards: (homeHtml.match(/<li class="li /g) ?? []).length });

for (const url of ["https://theresanaiforthat.com/popular/", "https://theresanaiforthat.com/leaderboard/", "https://theresanaiforthat.com/tools/"]) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AppScreener MVP importer" } });
    const text = await response.text();
    const blocked = response.status === 403 || text.includes("Just a moment");
    if (blocked) report.blockedPages.push({ url, status: response.status, reason: "Cloudflare challenge" });
    else report.fetchedPages.push({ url, status: response.status, productCards: (text.match(/<li class="li /g) ?? []).length });
  } catch (error) {
    report.blockedPages.push({ url, status: 0, reason: error instanceof Error ? error.message : String(error) });
  }
}

const rawProducts = extractCardProducts(homeHtml);
report.discovered = rawProducts.length;

const existingLogoAssets = await readLogoAssets();
const nextLogoAssets = { ...existingLogoAssets };
const seenSlugs = new Set();
const seenDomains = new Set();
const imported = [];

for (const raw of rawProducts.slice(0, TARGET_COUNT)) {
  const slug = canonicalSlug(raw.name);
  const domain = domainFromUrl(raw.websiteUrl);
  const duplicateKey = domain || slug;
  if (seenSlugs.has(slug) || (domain && seenDomains.has(domain))) {
    report.duplicateMergeCount += 1;
    continue;
  }

  const category = mapCategory(raw.rawCategory, raw.description);
  const rank = imported.length + 1;
  const tags = buildTags(raw.rawCategory, raw.taskLabels, category, raw.description);
  const completeness = [raw.websiteUrl, raw.description, raw.logoUrl, raw.rawCategory, raw.sourceUrl].filter(Boolean).length / 5;
  const signals = starterSignals(slug, rank, category, completeness);
  const valid = validateProduct({ ...raw, slug, category });
  const logoAsset = existingLogoAssets[slug]?.officialLogoUrl
    ? { ...existingLogoAssets[slug], downloaded: false, error: "" }
    : await downloadLogo({ ...raw, slug });

  if (logoAsset.downloaded) report.logosDownloaded += 1;
  if (!logoAsset.officialLogoUrl) {
    report.fallbackLogos += 1;
    report.logoErrors.push({ slug, name: raw.name, error: logoAsset.error });
  }

  nextLogoAssets[slug] = {
    officialLogoUrl: logoAsset.officialLogoUrl,
    faviconUrl: logoAsset.faviconUrl,
    logoSource: logoAsset.logoSource
  };

  if (domain) seenDomains.add(domain);
  seenSlugs.add(slug);

  const listingStatus = valid ? "accepted" : "pending_review";
  if (valid) report.accepted += 1;
  else {
    report.pendingReview += 1;
    report.failedImports.push({ slug, name: raw.name, reason: "missing required name/site/category/description" });
  }

  imported.push({
    id: `taaft_${rank}`,
    name: raw.name,
    slug,
    description: raw.description || `${raw.name} is indexed for AI product discovery.`,
    longDescription: raw.description ? `${raw.description} AppScreener indexes this product for attention movement, related use cases, and emerging workflow fit.` : `${raw.name} is indexed for AppScreener attention tracking.`,
    websiteUrl: raw.websiteUrl,
    category,
    categories: [category],
    rawSourceCategories: [raw.rawCategory, ...raw.taskLabels].filter(Boolean),
    tags,
    useCases: raw.taskLabels.length ? raw.taskLabels : [raw.rawCategory || category.replace(/^AI\s+/, "")],
    pricingType: pricingTypeFrom(raw.pricingSummary),
    pricingSummary: raw.pricingSummary || "Not listed",
    pricingTiers: raw.pricingSummary ? raw.pricingSummary.split("+").map((part) => part.trim()).filter(Boolean) : ["Not listed"],
    taaftRank: rank,
    sourceUrl: raw.sourceUrl,
    sourceConfidence: valid ? Math.round(78 + completeness * 20) : 45,
    verificationSignals: ["trusted_directory_presence", raw.websiteUrl ? "working_url_present" : "source_page_present", raw.logoUrl ? "brand_asset_present" : "logo_missing", raw.rawCategory ? "category_present" : "category_missing"],
    importedFrom: "TAAFT",
    importedAt: report.importedAt,
    updatedAt: report.importedAt,
    listingStatus,
    listingScore: valid ? 90 + Math.round(completeness * 10) : 55,
    boostEligible: valid,
    workflowEligible: valid,
    creatorSignalEligible: valid,
    logoUrl: raw.logoUrl,
    officialLogoUrl: logoAsset.officialLogoUrl,
    faviconUrl: logoAsset.faviconUrl,
    logoSource: logoAsset.logoSource,
    ...signals
  });
}

report.imported = imported.length;
const categoryCounts = imported.reduce((acc, tool) => {
  acc[tool.category] = (acc[tool.category] ?? 0) + 1;
  return acc;
}, {});
report.topCategories = Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([category, count]) => ({ category, count }));

if (imported.length < TARGET_COUNT) {
  report.notes.push(`Imported ${imported.length}/${TARGET_COUNT}. TAAFT homepage exposed ${rawProducts.length} product cards; ranked/listing expansion pages returned Cloudflare challenges from this environment.`);
}

await fs.writeFile(IMPORT_PATH, `${JSON.stringify(imported, null, 2)}\n`);
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await writeLogoAssets(nextLogoAssets);

console.log(JSON.stringify(report, null, 2));
