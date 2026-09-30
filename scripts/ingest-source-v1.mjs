#!/usr/bin/env node

import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const defaultInputPath = path.join(projectRoot, "appscreener_tools_input.csv");
const defaultOutputPath = path.join(projectRoot, "data/source-ingestion-v1-sample.json");
const defaultCsvOutputPath = path.join(projectRoot, "data/source-ingestion-v1-sample.csv");

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};
const hasFlag = (name) => args.includes(`--${name}`);

const inputPath = path.resolve(argValue("input") ?? defaultInputPath);
const outputPath = path.resolve(argValue("output") ?? defaultOutputPath);
const csvOutputPath = path.resolve(argValue("csv-output") ?? defaultCsvOutputPath);
const toolsArg = argValue("tools");
const selectedToolKeys = toolsArg
  ? toolsArg
      .split(",")
      .map((tool) => tool.trim().toLowerCase())
      .filter(Boolean)
  : [];
const perSourceLimit = Number(argValue("limit") ?? "5");
const maxTools = Number(argValue("max-tools") ?? "0");
const requestDelayMs = Number(argValue("delay-ms") ?? "250");
const requestTimeoutMs = Number(argValue("timeout-ms") ?? "12000");
const dryRun = hasFlag("dry-run");
const githubToken = process.env.GITHUB_TOKEN ?? process.env.GITHUB_PAT ?? process.env.GITHUB_API_TOKEN ?? process.env.GITHUB_ACCESS_TOKEN ?? "";
const youtubeApiKey = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_DATA_API_KEY ?? "";

const rssFeeds = [
  { sourceName: "The Rundown", url: "https://www.therundown.ai/rss" },
  { sourceName: "Ben's Bites", url: "https://www.bensbites.co/feed" },
  { sourceName: "Latent Space", url: "https://www.latent.space/feed" },
  { sourceName: "FutureTools", url: "https://www.futuretools.io/rss.xml" },
  { sourceName: "OpenAI Blog", url: "https://openai.com/news/rss.xml" },
  { sourceName: "Anthropic Blog", url: "https://www.anthropic.com/news/rss.xml" },
  { sourceName: "Vercel Blog", url: "https://vercel.com/atom" }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  console.log(`GitHub token: ${githubToken ? "present" : "missing"}`);
  console.log(`YouTube key: ${youtubeApiKey ? "present" : "missing"}`);

  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);

  const tools = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord);
  const matchingTools = selectedToolKeys.length
    ? tools.filter((tool) => selectedToolKeys.includes(tool.slug.toLowerCase()) || selectedToolKeys.includes(tool.name.toLowerCase()))
    : tools;
  const selectedTools = maxTools > 0 ? matchingTools.slice(0, maxTools) : matchingTools;
  if (!selectedTools.length) {
    const selection = selectedToolKeys.length ? selectedToolKeys.join(", ") : "appscreener_tools_input.csv";
    throw new Error(`No matching tools for selection: ${selection}`);
  }

  const records = [];
  const sourceErrors = [];

  for (const [index, tool] of selectedTools.entries()) {
    console.log(`[${index + 1}/${selectedTools.length}] ${tool.name}`);
    const collected = [
      ...(await collectGithub(tool).catch((error) => trackError(sourceErrors, tool, "github", error))),
      ...(await collectYouTube(tool).catch((error) => trackError(sourceErrors, tool, "youtube", error))),
      ...(await collectRss(tool).catch((error) => trackError(sourceErrors, tool, "rss", error))),
      ...(await collectHackerNews(tool).catch((error) => trackError(sourceErrors, tool, "hackernews", error)))
    ];

    const normalized = collected.flatMap((source) => normalizeSource(tool, source, tools));
    records.push(...normalized);
    await delay(requestDelayMs);
  }

  const deduped = dedupeRecords(records);
  const summary = summarize(deduped, selectedTools, sourceErrors);

  if (!dryRun) {
    writeFileSync(outputPath, `${JSON.stringify({ generated_at: new Date().toISOString(), schema: outputSchema(), records: deduped, summary }, null, 2)}\n`);
    writeFileSync(csvOutputPath, toCsv(deduped));
  }

  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) console.log("Dry run: no files written.");
}

function loadLocalEnvFiles(fileNames) {
  for (const fileName of fileNames) {
    const envPath = path.join(projectRoot, fileName);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex < 1) return null;
  const key = normalized.slice(0, separatorIndex).trim();
  let value = normalized.slice(separatorIndex + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

async function collectGithub(tool) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `${tool.name} in:name,description,readme`);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perSourceLimit));

  const json = await fetchJson(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
    }
  });

  return (json.items ?? []).map((repo) => ({
    sourceType: "github",
    sourceUrl: repo.html_url,
    title: repo.full_name,
    creator: repo.owner?.login ?? "",
    publishedAt: repo.created_at,
    text: `${repo.full_name} ${repo.description ?? ""}`,
    metadata: {
      description: repo.description ?? "",
      stars: repo.stargazers_count ?? 0,
      owner: repo.owner?.login ?? "",
      created_at: repo.created_at
    }
  }));
}

async function collectYouTube(tool) {
  if (!youtubeApiKey) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", tool.name);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(perSourceLimit));
  url.searchParams.set("key", youtubeApiKey);

  const json = await fetchJson(url);
  return (json.items ?? []).map((item) => ({
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    title: item.snippet?.title ?? "",
    creator: item.snippet?.channelTitle ?? "",
    publishedAt: item.snippet?.publishedAt ?? "",
    text: `${item.snippet?.title ?? ""} ${item.snippet?.description ?? ""} ${item.snippet?.channelTitle ?? ""}`,
    metadata: {
      description: item.snippet?.description ?? "",
      channel: item.snippet?.channelTitle ?? "",
      published_at: item.snippet?.publishedAt ?? "",
      thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? ""
    }
  }));
}

async function collectRss(tool) {
  const results = [];
  for (const feed of rssFeeds) {
    await delay(requestDelayMs);
    const xml = await fetchText(feed.url).catch(() => "");
    if (!xml) continue;
    const items = parseRssItems(xml)
      .filter((item) => mentionsTool(`${item.title} ${item.description} ${item.link}`, tool))
      .slice(0, perSourceLimit);

    results.push(...items.map((item) => ({
      sourceType: "rss",
      sourceUrl: item.link,
      title: item.title,
      creator: feed.sourceName,
      publishedAt: item.publishedAt,
      text: `${item.title} ${item.description} ${item.link}`,
      metadata: {
        source_name: feed.sourceName
      }
    })));
  }
  return results.slice(0, perSourceLimit);
}

async function collectHackerNews(tool) {
  const hits = [];
  for (const tag of ["story", "comment"]) {
    const url = new URL("https://hn.algolia.com/api/v1/search");
    url.searchParams.set("query", tool.name);
    url.searchParams.set("hitsPerPage", String(perSourceLimit));
    url.searchParams.set("tags", tag);
    const json = await fetchJson(url);
    hits.push(...(json.hits ?? []));
    await delay(requestDelayMs);
  }

  return hits.slice(0, perSourceLimit).map((hit) => ({
    sourceType: "hackernews",
    sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    title: hit.title || hit.story_title || plain(hit.comment_text).slice(0, 120) || `Hacker News item ${hit.objectID}`,
    creator: hit.author ?? "",
    publishedAt: hit.created_at ?? "",
    text: `${hit.title ?? ""} ${hit.story_title ?? ""} ${plain(hit.comment_text ?? "")} ${hit.url ?? ""}`,
    metadata: {
      author: hit.author ?? "",
      created_at: hit.created_at ?? "",
      object_id: hit.objectID
    }
  }));
}

function normalizeSource(tool, source, allTools) {
  const extractedUrls = extractUrls(`${source.title} ${source.text} ${source.sourceUrl}`);
  const xProofUrls = extractedUrls.filter(isXStatusUrl);
  const xProfileUrls = extractedUrls.filter((url) => isXProfileUrl(url) && !isXStatusUrl(url));
  const mentionedTools = mentionedToolNames(`${source.title} ${source.text} ${source.sourceUrl}`, allTools);
  const base = {
    tool_name: tool.name,
    source_url: source.sourceUrl,
    title: plain(source.title),
    creator: plain(source.creator),
    published_at: source.publishedAt || "",
    confidence: confidenceFor(source.sourceType),
    domain: domainFromUrl(source.sourceUrl),
    mentioned_tools: mentionedTools,
    extracted_urls: extractedUrls,
    metadata: source.metadata ?? {}
  };

  if (xProofUrls.length) {
    return xProofUrls.map((url) => ({ ...base, source_type: "x_proof", source_url: normalizeUrl(url), confidence: 95, domain: domainFromUrl(url) }));
  }

  if (xProfileUrls.length) {
    return xProfileUrls.map((url) => ({ ...base, source_type: "x_profile_reference", source_url: normalizeUrl(url), confidence: 80, domain: domainFromUrl(url) }));
  }

  return [{ ...base, source_type: source.sourceType }];
}

function confidenceFor(sourceType) {
  if (sourceType === "github") return 85;
  if (sourceType === "youtube") return 85;
  if (sourceType === "rss") return 75;
  if (sourceType === "hackernews") return 70;
  if (sourceType === "article") return 70;
  return 60;
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AppScreenerSourceIngestionV1/0.1",
        ...(options.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...body] = rows.filter((item) => item.some((field) => field.trim()));
  return body.map((item) => Object.fromEntries(headers.map((header, index) => [header.replace(/^"|"$/g, ""), item[index] ?? ""])));
}

function rowFromRecord(record) {
  return {
    name: record.name,
    slug: record.slug,
    category: record.category,
    websiteUrl: record.websiteUrl
  };
}

function parseRssItems(xml) {
  const itemMatches = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  return itemMatches.map((item) => ({
    title: decodeXml(firstTag(item, "title")),
    link: decodeXml(firstTag(item, "link") || firstLinkHref(item)),
    description: decodeXml(firstTag(item, "description") || firstTag(item, "summary") || firstTag(item, "content:encoded")),
    publishedAt: decodeXml(firstTag(item, "pubDate") || firstTag(item, "published") || firstTag(item, "updated"))
  })).filter((item) => item.title && item.link);
}

function firstTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() ?? "";
}

function firstLinkHref(xml) {
  const match = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ?? "";
}

function decodeXml(value) {
  return plain(String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"));
}

function plain(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mentionsTool(text, tool) {
  return compact(text).includes(compact(tool.name)) || compact(text).includes(compact(tool.slug));
}

function mentionedToolNames(text, tools) {
  const haystack = compact(text);
  return tools.filter((tool) => haystack.includes(compact(tool.name)) || haystack.includes(compact(tool.slug))).map((tool) => tool.name);
}

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractUrls(text) {
  return [...new Set((String(text).match(/https?:\/\/[^\s"'<>),]+/gi) ?? []).map(normalizeUrl))];
}

function normalizeUrl(url) {
  return String(url).replace(/[.,;:!?]+$/, "");
}

function isXStatusUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (host === "x.com" || host === "twitter.com") && /\/status\/\d+/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isXProfileUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "x.com" && host !== "twitter.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length === 1 && !["home", "intent", "share", "search", "hashtag", "i"].includes(parts[0].toLowerCase());
  } catch {
    return false;
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function dedupeRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    const key = `${record.tool_name}|${record.source_type}|${record.source_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarize(records, tools, sourceErrors) {
  const sourceCounts = countBy(records, "source_type");
  const toolCounts = Object.fromEntries(tools.map((tool) => [tool.name, records.filter((record) => record.tool_name === tool.name).length]));
  return {
    tools_processed: tools.length,
    total_records: records.length,
    source_counts: sourceCounts,
    tool_counts: toolCounts,
    source_errors: sourceErrors
  };
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] || "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function toCsv(records) {
  const headers = ["tool_name", "source_type", "source_url", "title", "creator", "published_at", "confidence"];
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => csvCell(record[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function outputSchema() {
  return {
    tool_name: "string",
    source_type: "github | youtube | rss | hackernews | article | x_proof | x_profile_reference",
    source_url: "string",
    title: "string",
    creator: "string",
    published_at: "string",
    confidence: "number",
    domain: "string",
    mentioned_tools: "string[]",
    extracted_urls: "string[]",
    metadata: "object"
  };
}

function trackError(errors, tool, sourceType, error) {
  errors.push({ tool: tool.name, source_type: sourceType, error: error.message });
  return [];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
