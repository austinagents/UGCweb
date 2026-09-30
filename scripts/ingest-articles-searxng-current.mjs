#!/usr/bin/env node

import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const evidencePath = "data/tool-evidence-sources.json";
const reportPath = "data/article-searxng-ingest-127-v1.csv";
const rejectionPath = "data/article-searxng-ingest-127-rejections-v1.csv";
const searxngBaseUrl = process.env.SEARXNG_BASE_URL || "http://127.0.0.1:8080";
const targetSlugs = parseSlugSet(process.env.TARGET_SLUGS || "");

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function compact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hash(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function plain(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function mentions(text, tool) {
  const haystack = compact(text);
  return haystack.includes(compact(tool.name)) || haystack.includes(compact(tool.slug));
}

function blockedDomain(domain) {
  return [
    "youtube.com",
    "youtu.be",
    "github.com",
    "x.com",
    "twitter.com",
    "theresanaiforthat.com",
    "futurepedia.io",
    "aitools.fyi",
    "topai.tools",
    "toolify.ai",
    "g2.com",
    "capterra.com",
    "alternativeto.net"
  ].some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
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

function parseResults(html) {
  const blocks = html.match(/<article class="result[\s\S]*?<\/article>/g) || [];
  const results = [];
  for (const block of blocks) {
    const linkMatch =
      block.match(/<h3>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i) ||
      block.match(/<a[^>]+class="[^"]*result[^"]*title[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<p class="content">\s*([\s\S]*?)<\/p>/i) || block.match(/<p[^>]*>\s*([\s\S]*?)<\/p>/i);
    const url = plain(linkMatch[1]);
    const title = plain(linkMatch[2]);
    const snippet = plain(snippetMatch?.[1] || "");
    if (url && title) results.push({ url, title, snippet, domain: domainFromUrl(url) });
  }
  return results;
}

async function search(query) {
  const url = new URL("/search", searxngBaseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("safesearch", "0");
  url.searchParams.set("engines", "bing news");
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 AppScreenerEvidenceBot/1.0"
    }
  });
  if (!response.ok) throw new Error(`SearXNG returned ${response.status}`);
  return parseResults(await response.text());
}

const tools = loadCatalogTools().filter((tool) => !targetSlugs || targetSlugs.has(tool.slug));
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const kept = evidence.filter((item) => item.sourceType !== "article" || (targetSlugs && !targetSlugs.has(item.toolSlug)));
const articleRecords = [];
const rejectionRows = [];

for (const [index, tool] of tools.entries()) {
  console.log(`[${index + 1}/${tools.length}] ${tool.name}`);
  const candidates = [];
  for (const query of [`"${tool.name}"`, `"${tool.name}" AI`, `"${tool.name}" review`, `"${tool.name}" launch`]) {
    const results = await search(query).catch((error) => {
      rejectionRows.push({ tool: tool.name, slug: tool.slug, url: "", reason: "search_error", notes: error.message });
      return [];
    });
    for (const result of results) {
      const text = `${result.title} ${result.snippet} ${result.url}`;
      if (!mentions(text, tool)) {
        rejectionRows.push({ tool: tool.name, slug: tool.slug, url: result.url, reason: "unrelated", notes: result.title });
        continue;
      }
      if (blockedDomain(result.domain)) {
        rejectionRows.push({ tool: tool.name, slug: tool.slug, url: result.url, reason: "blocked_domain", notes: result.title });
        continue;
      }
      candidates.push(result);
    }
    if (candidates.length >= 3) break;
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }

  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const proofRank = articleRecords.filter((record) => record.toolSlug === tool.slug).length + 1;
    if (proofRank > 3) break;
    articleRecords.push({
      id: `article_proof_${tool.slug}_${hash(candidate.url)}`,
      toolSlug: tool.slug,
      sourceType: "article",
      sourceTitle: candidate.title,
      sourceAuthor: candidate.domain,
      sourceUrl: candidate.url,
      detectedAt: new Date().toISOString(),
      matchedTools: [tool.name],
      snippet: candidate.snippet || candidate.title,
      platformLabel: candidate.domain,
      proofRank,
      confidence: 70
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 2400));
}

writeFileSync(evidencePath, `${JSON.stringify([...kept, ...articleRecords], null, 2)}\n`);

const covered = new Set(articleRecords.map((record) => record.toolSlug));
writeFileSync(reportPath, [
  "source,coverage,missing_count,records_added",
  `article,${covered.size}/${tools.length},${tools.length - covered.size},${articleRecords.length}`
].join("\n") + "\n");
writeFileSync(rejectionPath, [
  "tool,slug,url,reason,notes",
  ...rejectionRows.map((row) => `"${row.tool.replace(/"/g, '""')}","${row.slug}","${String(row.url).replace(/"/g, '""')}","${row.reason}","${String(row.notes).replace(/"/g, '""')}"`)
].join("\n") + "\n");

console.log(JSON.stringify({
  articleCoverage: `${covered.size}/${tools.length}`,
  articleRecords: articleRecords.length,
  missing: tools.length - covered.size,
  reportPath,
  rejectionPath
}, null, 2));
