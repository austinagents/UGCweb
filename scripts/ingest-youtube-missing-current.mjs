#!/usr/bin/env node

import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";
if (!youtubeApiKey) throw new Error("YOUTUBE_API_KEY missing");

const evidencePath = "data/tool-evidence-sources.json";
const reportPath = "data/youtube-ingest-missing-current-v1.csv";
const errorsPath = "data/youtube-ingest-missing-current-errors-v1.csv";
const delayMs = Number(process.env.YOUTUBE_DELAY_MS || "2500");
const targetSlugs = parseSlugSet(process.env.TARGET_SLUGS || "");

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function hash(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function plain(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function loadCatalogTools() {
  const data = readFileSync("lib/data.ts", "utf8");
  const rawStart = data.indexOf("const rawTools:");
  const rawEnd = data.indexOf("];", rawStart);
  const raw = [...data.slice(rawStart, rawEnd).matchAll(/^\s*\["([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"((?:[^"]|\\")*)"\s*,\s*"([^"]*)"/gm)].map((match) => ({
    name: match[1],
    slug: slugify(match[1])
  }));
  const imported = JSON.parse(readFileSync("data/taaft-tools.json", "utf8")).map((tool) => ({
    name: tool.name,
    slug: tool.slug
  }));
  return [...raw, ...imported].sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseSlugSet(value) {
  const slugs = String(value || "").split(",").map((slug) => slug.trim()).filter(Boolean);
  return slugs.length ? new Set(slugs) : null;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function collectYouTube(tool) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", tool.name);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "3");
  url.searchParams.set("key", youtubeApiKey);
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 160)}`);
  const json = JSON.parse(text);
  return (json.items || [])
    .filter((item) => item.id?.videoId)
    .slice(0, 3)
    .map((item, index) => {
      const snippet = item.snippet || {};
      const sourceUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
      return {
        id: `youtube_proof_${tool.slug}_${hash(sourceUrl)}`,
        toolSlug: tool.slug,
        sourceType: "youtube",
        sourceTitle: plain(snippet.title),
        sourceAuthor: plain(snippet.channelTitle),
        sourceUrl,
        sourceImageUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || undefined,
        sourcePublishedAt: snippet.publishedAt || undefined,
        detectedAt: new Date().toISOString(),
        matchedTools: [tool.name],
        snippet: plain(snippet.description),
        platformLabel: plain(snippet.channelTitle) || "YouTube",
        proofRank: index + 1,
        confidence: 85
      };
    });
}

const tools = loadCatalogTools().filter((tool) => !targetSlugs || targetSlugs.has(tool.slug));
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const existingYouTubeSlugs = new Set(evidence.filter((item) => item.sourceType === "youtube").map((item) => item.toolSlug));
const missingTools = tools.filter((tool) => !existingYouTubeSlugs.has(tool.slug));
const added = [];
const reportRows = [];
const errorRows = [];

for (const [index, tool] of missingTools.entries()) {
  console.log(`[${index + 1}/${missingTools.length}] ${tool.name}`);
  try {
    const records = await collectYouTube(tool);
    added.push(...records);
    reportRows.push({
      tool: tool.name,
      slug: tool.slug,
      records_added: records.length,
      urls: records.map((record) => record.sourceUrl).join(" | "),
      status: records.length ? "added" : "no_results"
    });
  } catch (error) {
    errorRows.push({ tool: tool.name, slug: tool.slug, error: error.message });
    reportRows.push({ tool: tool.name, slug: tool.slug, records_added: 0, urls: "", status: "error" });
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

const updated = [...evidence, ...added];
writeFileSync(evidencePath, `${JSON.stringify(updated, null, 2)}\n`);

const finalCoverage = new Set(updated.filter((item) => item.sourceType === "youtube").map((item) => item.toolSlug));
writeFileSync(reportPath, [
  "tool,slug,records_added,urls,status",
  ...reportRows.map((row) => `"${row.tool.replace(/"/g, '""')}","${row.slug}",${row.records_added},"${row.urls.replace(/"/g, '""')}","${row.status}"`),
  `__SUMMARY__,youtube_coverage,${finalCoverage.size}/${tools.length},records_added:${added.length},missing:${tools.length - finalCoverage.size}`
].join("\n") + "\n");

writeFileSync(errorsPath, [
  "tool,slug,error",
  ...errorRows.map((row) => `"${row.tool.replace(/"/g, '""')}","${row.slug}","${row.error.replace(/"/g, '""')}"`)
].join("\n") + "\n");

console.log(JSON.stringify({
  beforeCoverage: `${existingYouTubeSlugs.size}/${tools.length}`,
  afterCoverage: `${finalCoverage.size}/${tools.length}`,
  missingProcessed: missingTools.length,
  recordsAdded: added.length,
  errors: errorRows.length,
  reportPath,
  errorsPath
}, null, 2));
