#!/usr/bin/env node

import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

for (const fileName of [".env.sources", ".env.local", ".env"]) {
  if (!existsSync(fileName)) continue;
  for (const line of readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";
const evidencePath = "data/tool-evidence-sources.json";
const reportPath = "data/github-article-ingest-127-v1.csv";
const errorsPath = "data/github-article-ingest-127-errors-v1.csv";
const targetSlugs = parseSlugSet(process.env.TARGET_SLUGS || "");

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function hash(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function compact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function plain(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return plain(String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}

function tag(xml, name) {
  return xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "";
}

function parseRssItems(xml) {
  return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)]
    .map((match) => match[0])
    .map((item) => ({
      title: decodeXml(tag(item, "title")),
      link: decodeXml(item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || tag(item, "link")),
      description: decodeXml(tag(item, "description") || tag(item, "summary") || tag(item, "content:encoded")),
      publishedAt: decodeXml(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated"))
    }))
    .filter((item) => item.title && item.link);
}

function mentions(text, tool) {
  const haystack = compact(text);
  return haystack.includes(compact(tool.name)) || haystack.includes(compact(tool.slug));
}

function loadCatalogTools() {
  const data = readFileSync("lib/data.ts", "utf8");
  const rawStart = data.indexOf("const rawTools:");
  const rawEnd = data.indexOf("];", rawStart);
  const raw = [...data.slice(rawStart, rawEnd).matchAll(/^\s*\["([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"((?:[^"]|\\")*)"\s*,\s*"([^"]*)"/gm)].map((match) => ({
    name: match[1],
    slug: slugify(match[1]),
    category: match[2],
    websiteUrl: match[4]
  }));
  const imported = JSON.parse(readFileSync("data/taaft-tools.json", "utf8")).map((tool) => ({
    name: tool.name,
    slug: tool.slug,
    category: tool.category,
    websiteUrl: tool.websiteUrl || ""
  }));
  return [...raw, ...imported].sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseSlugSet(value) {
  const slugs = String(value || "").split(",").map((slug) => slug.trim()).filter(Boolean);
  return slugs.length ? new Set(slugs) : null;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AppScreenerSourceIngestionV1/0.1",
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

const tools = loadCatalogTools().filter((tool) => !targetSlugs || targetSlugs.has(tool.slug));
const rssFeeds = [
  { sourceName: "The Rundown", url: "https://www.therundown.ai/rss" },
  { sourceName: "Ben's Bites", url: "https://www.bensbites.co/feed" },
  { sourceName: "Latent Space", url: "https://www.latent.space/feed" },
  { sourceName: "FutureTools", url: "https://www.futuretools.io/rss.xml" },
  { sourceName: "OpenAI Blog", url: "https://openai.com/news/rss.xml" },
  { sourceName: "Anthropic Blog", url: "https://www.anthropic.com/news/rss.xml" },
  { sourceName: "Vercel Blog", url: "https://vercel.com/atom" }
];

const rssItems = [];
for (const feed of rssFeeds) {
  try {
    const response = await fetchWithTimeout(feed.url);
    if (!response.ok) continue;
    const xml = await response.text();
    rssItems.push(...parseRssItems(xml).map((item) => ({ ...item, sourceName: feed.sourceName })));
  } catch {}
}

const githubRecords = [];
const articleRecords = [];
const errors = [];

for (const [index, tool] of tools.entries()) {
  if ((index + 1) % 10 === 0) console.log(`[${index + 1}/${tools.length}]`);
  try {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", `${tool.name} in:name,description,readme`);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "3");
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
      }
    });
    if (!response.ok) {
      errors.push({ tool: tool.name, source: "github", error: `${response.status} ${(await response.text()).slice(0, 80)}` });
    } else {
      const json = await response.json();
      for (const repo of (json.items || []).slice(0, 3)) {
        githubRecords.push({
          tool,
          sourceType: "github",
          sourceUrl: repo.html_url,
          title: repo.full_name,
          creator: repo.owner?.login || "",
          publishedAt: repo.created_at,
          snippet: repo.description || "",
          platformLabel: `${repo.stargazers_count || 0} stars`
        });
      }
    }
  } catch (error) {
    errors.push({ tool: tool.name, source: "github", error: error.message });
  }

  for (const item of rssItems.filter((rssItem) => mentions(`${rssItem.title} ${rssItem.description} ${rssItem.link}`, tool)).slice(0, 3)) {
    articleRecords.push({
      tool,
      sourceType: "article",
      sourceUrl: item.link,
      title: item.title,
      creator: item.sourceName,
      publishedAt: item.publishedAt,
      snippet: item.description || item.title,
      platformLabel: item.sourceName
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 2100));
}

const existing = JSON.parse(readFileSync(evidencePath, "utf8"));
const targetKeys = new Set([...githubRecords, ...articleRecords].map((record) => `${record.sourceType}:${record.tool.slug}`));
const kept = existing.filter((item) => !targetKeys.has(`${item.sourceType}:${item.toolSlug}`));
const mapped = [];

for (const record of [...githubRecords, ...articleRecords]) {
  const proofRank = mapped.filter((item) => item.toolSlug === record.tool.slug && item.sourceType === record.sourceType).length + 1;
  if (proofRank > 3) continue;
  mapped.push({
    id: `${record.sourceType}_proof_${record.tool.slug}_${hash(record.sourceUrl)}`,
    toolSlug: record.tool.slug,
    sourceType: record.sourceType,
    sourceTitle: record.title,
    sourceAuthor: record.creator,
    sourceUrl: record.sourceUrl,
    sourcePublishedAt: record.publishedAt || undefined,
    detectedAt: new Date().toISOString(),
    matchedTools: [record.tool.name],
    snippet: record.snippet,
    platformLabel: record.platformLabel,
    proofRank,
    confidence: record.sourceType === "github" ? 85 : 75
  });
}

writeFileSync(evidencePath, `${JSON.stringify([...kept, ...mapped], null, 2)}\n`);

const after = JSON.parse(readFileSync(evidencePath, "utf8"));
const githubCovered = new Set(after.filter((item) => item.sourceType === "github").map((item) => item.toolSlug));
const articleCovered = new Set(after.filter((item) => item.sourceType === "article").map((item) => item.toolSlug));

writeFileSync(reportPath, [
  "source,coverage,missing_count,records_added",
  `github,${githubCovered.size}/${tools.length},${tools.length - githubCovered.size},${githubRecords.length}`,
  `article,${articleCovered.size}/${tools.length},${tools.length - articleCovered.size},${articleRecords.length}`
].join("\n") + "\n");

writeFileSync(errorsPath, ["tool,source,error", ...errors.map((error) => `"${error.tool}",${error.source},"${String(error.error).replace(/"/g, '""')}"`)].join("\n") + "\n");

console.log(JSON.stringify({
  githubCoverage: `${githubCovered.size}/${tools.length}`,
  articleCoverage: `${articleCovered.size}/${tools.length}`,
  githubRecords: githubRecords.length,
  articleRecords: articleRecords.length,
  errors: errors.length
}, null, 2));
