#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const defaultInputPath = path.join(projectRoot, "appscreener_tools_input.csv");
const defaultSourcePath = path.join(projectRoot, "data/source-ingestion-v1-sample.json");
const defaultOutputPath = path.join(projectRoot, "data/discussion-discovery-v1.json");
const defaultCsvOutputPath = path.join(projectRoot, "data/discussion-discovery-v1.csv");

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};
const hasFlag = (name) => args.includes(`--${name}`);

const inputPath = path.resolve(argValue("input") ?? defaultInputPath);
const sourcePath = path.resolve(argValue("source") ?? defaultSourcePath);
const outputPath = path.resolve(argValue("output") ?? defaultOutputPath);
const csvOutputPath = path.resolve(argValue("csv-output") ?? defaultCsvOutputPath);
const toolsArg = argValue("tools");
const selectedToolKeys = toolsArg
  ? toolsArg
      .split(",")
      .map((tool) => tool.trim().toLowerCase())
      .filter(Boolean)
  : [];
const maxTools = Number(argValue("max-tools") ?? "0");
const limit = Number(argValue("limit") ?? "10");
const delayMs = Number(argValue("delay-ms") ?? "500");
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");
const dryRun = hasFlag("dry-run");

const searchProvider = process.env.SERPER_API_KEY
  ? "serper"
  : process.env.TAVILY_API_KEY
    ? "tavily"
    : process.env.BRAVE_API_KEY
      ? "brave"
      : "";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  console.log(`Search provider: ${searchProvider || "none"}`);
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);
  if (!existsSync(sourcePath)) throw new Error(`Source ingestion output not found: ${sourcePath}`);

  const tools = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord);
  const matchingTools = selectedToolKeys.length
    ? tools.filter((tool) => selectedToolKeys.includes(tool.slug.toLowerCase()) || selectedToolKeys.includes(tool.name.toLowerCase()))
    : tools;
  const selectedTools = maxTools > 0 ? matchingTools.slice(0, maxTools) : matchingTools;
  if (!selectedTools.length) {
    const selection = selectedToolKeys.length ? selectedToolKeys.join(", ") : "appscreener_tools_input.csv";
    throw new Error(`No matching tools for selection: ${selection}`);
  }

  const sourceRecords = readSourceRecords(sourcePath);
  const records = [];

  for (const [index, tool] of selectedTools.entries()) {
    console.log(`[${index + 1}/${selectedTools.length}] ${tool.name}`);
    const existingRecords = sourceRecords.filter((record) => sameTool(record.tool_name, tool));
    records.push(...discoverFromExistingRecords(tool, existingRecords));

    if (searchProvider) {
      const providerRecords = await discoverFromSearchProvider(tool).catch((error) => {
        console.warn(`${tool.name} ${searchProvider} search failed: ${error.message}`);
        return [];
      });
      records.push(...providerRecords.slice(0, limit));
    }

    await delay(delayMs);
  }

  const deduped = dedupeRecords(records);
  const summary = summarize(deduped, selectedTools);
  const output = {
    generated_at: new Date().toISOString(),
    schema: outputSchema(),
    records: deduped,
    summary
  };

  if (!dryRun) {
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    writeFileSync(csvOutputPath, toCsv(deduped));
  }

  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) console.log("Dry run: no files written.");
}

function discoverFromExistingRecords(tool, sourceRecords) {
  return sourceRecords.flatMap((record) => {
    const text = evidenceTextFor(record);
    const urls = [...new Set([record.source_url, ...(record.extracted_urls ?? []), ...extractUrls(text)].filter(Boolean).map(normalizeUrl))];
    const xPostUrls = urls.filter(isXStatusUrl);
    const xProfileUrls = urls.filter((url) => isXProfileUrl(url) && !isXStatusUrl(url));
    const discussionUrls = urls.filter((url) => isDiscussionUrl(url));
    const baseUrl = record.source_url || discussionUrls[0] || xPostUrls[0] || xProfileUrls[0];
    if (!baseUrl && !text) return [];

    const base = {
      tool_name: tool.name,
      source_url: record.source_url || baseUrl,
      title: clean(record.title),
      creator: clean(record.creator),
      published_at: clean(record.published_at),
      discussion_type: discussionTypeFor(record, text),
      status: "existing_source",
      evidence_text: clean(text).slice(0, 600)
    };

    if (xPostUrls.length) {
      return xPostUrls.map((url) => ({
        ...base,
        discussion_url: url,
        source_type: "x_proof",
        x_post_url: url,
        x_profile_url: "",
        confidence: 1
      }));
    }

    if (xProfileUrls.length) {
      return xProfileUrls.map((url) => ({
        ...base,
        discussion_url: url,
        source_type: "x_profile_reference",
        x_post_url: "",
        x_profile_url: url,
        confidence: 0.7
      }));
    }

    const discussionUrl = discussionUrls[0] || baseUrl;
    if (!discussionUrl) return [];
    return [{
      ...base,
      discussion_url: discussionUrl,
      source_type: sourceTypeFor(record, discussionUrl),
      x_post_url: "",
      x_profile_url: "",
      confidence: confidenceFor(record, discussionUrl)
    }];
  });
}

async function discoverFromSearchProvider(tool) {
  if (searchProvider === "serper") return discoverFromSerper(tool);
  if (searchProvider === "tavily") return discoverFromTavily(tool);
  if (searchProvider === "brave") return discoverFromBrave(tool);
  return [];
}

async function discoverFromSerper(tool) {
  const json = await fetchJson("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ q: `${tool.name} discussion tutorial workflow`, num: limit })
  });
  return normalizeSearchResults(tool, (json.organic ?? []).map((item) => ({
    url: item.link,
    title: item.title,
    snippet: item.snippet,
    creator: item.source ?? ""
  })));
}

async function discoverFromTavily(tool) {
  const json = await fetchJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${tool.name} discussion tutorial workflow`,
      max_results: limit
    })
  });
  return normalizeSearchResults(tool, (json.results ?? []).map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.content,
    creator: domainFromUrl(item.url)
  })));
}

async function discoverFromBrave(tool) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", `${tool.name} discussion tutorial workflow`);
  url.searchParams.set("count", String(limit));
  const json = await fetchJson(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_API_KEY
    }
  });
  return normalizeSearchResults(tool, (json.web?.results ?? []).map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.description,
    creator: domainFromUrl(item.url)
  })));
}

function normalizeSearchResults(tool, results) {
  return results.filter((item) => item.url && hasToolMention(`${item.title} ${item.snippet} ${item.url}`, tool)).map((item) => {
    const text = `${item.title} ${item.snippet} ${item.url}`;
    const xPostUrl = extractUrls(text).find(isXStatusUrl) ?? "";
    const xProfileUrl = extractUrls(text).find((url) => isXProfileUrl(url) && !isXStatusUrl(url)) ?? "";
    return {
      tool_name: tool.name,
      discussion_url: xPostUrl || xProfileUrl || normalizeUrl(item.url),
      source_type: xPostUrl ? "x_proof" : xProfileUrl ? "x_profile_reference" : sourceTypeFor({ source_type: "" }, item.url),
      source_url: normalizeUrl(item.url),
      title: clean(item.title),
      creator: clean(item.creator),
      published_at: "",
      discussion_type: discussionTypeFor({ source_type: "" }, text),
      x_post_url: xPostUrl,
      x_profile_url: xProfileUrl,
      confidence: xPostUrl ? 1 : xProfileUrl ? 0.7 : 0.6,
      status: `search_provider:${searchProvider}`,
      evidence_text: clean(text).slice(0, 600)
    };
  });
}

function readSourceRecords(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.records ?? [];
}

function evidenceTextFor(record) {
  return [
    record.title,
    record.description,
    record.snippet,
    record.source_url,
    ...(record.extracted_urls ?? []),
    JSON.stringify(record.metadata ?? {}),
    JSON.stringify(record)
  ].filter(Boolean).join(" ");
}

function discussionTypeFor(record, text) {
  const haystack = clean(text).toLowerCase();
  const sourceType = record.source_type ?? "";
  if (/\b(vs|alternative|alternatives|compared to|better than|replace|replacement)\b/.test(haystack)) return "comparison_discussion";
  if (/\b(recommend|favorite|best|must try|useful)\b/.test(haystack)) return "recommendation_discussion";
  if (/\b(launch|launched|shipped|introducing|announcement|announced|released)\b/.test(haystack)) return "launch_discussion";
  if (/\b(workflow|how i use|tutorial|automation|stack|build with|built with|using)\b/.test(haystack)) return "workflow_discussion";
  if (sourceType === "github" || sourceType === "hackernews" || /\b(issue|discussion|implementation|code|api|sdk|repository|repo)\b/.test(haystack)) return "technical_discussion";
  if (record.creator || sourceType === "youtube" || /\b(author|creator|channel|newsletter)\b/.test(haystack)) return "creator_discussion";
  return "generic_mention";
}

function sourceTypeFor(record, url) {
  const existing = record.source_type;
  if (existing === "x_proof" || isXStatusUrl(url)) return "x_proof";
  if (existing === "x_profile_reference" || isXProfileUrl(url)) return "x_profile_reference";
  const domain = domainFromUrl(url);
  if (domain.includes("youtube.com") || domain === "youtu.be" || existing === "youtube") return "youtube";
  if (domain.includes("github.com") || existing === "github") return githubDiscussionSubtype(url);
  if (domain.includes("news.ycombinator.com") || existing === "hackernews") return "hackernews";
  if (domain.includes("reddit.com")) return "reddit";
  if (domain.includes("producthunt.com")) return "producthunt";
  if (existing === "rss") return rssSubtype(record, url);
  if (/\b(substack|beehiiv|newsletter|medium)\b/.test(domain)) return "newsletter";
  if (domain) return "article";
  return "unknown";
}

function githubDiscussionSubtype(url) {
  if (/\/(issues|discussions|pull)\//i.test(url)) return "github";
  return "github";
}

function rssSubtype(record, url) {
  const source = `${record.creator ?? ""} ${JSON.stringify(record.metadata ?? {})}`.toLowerCase();
  const domain = domainFromUrl(url);
  if (source.includes("newsletter") || domain.includes("substack") || domain.includes("beehiiv")) return "newsletter";
  if (source.includes("blog") || /\/blog|\/news|\/index/.test(new URLSafe(url).pathname)) return "blog";
  return "article";
}

function confidenceFor(record, url) {
  const sourceType = sourceTypeFor(record, url);
  const text = evidenceTextFor(record);
  if (isXStatusUrl(url)) return 1;
  if (["hackernews", "youtube", "github"].includes(sourceType) && hasDirectToolMention(text, record.tool_name)) return 0.9;
  if (["newsletter", "article", "blog"].includes(sourceType) && hasDirectToolMention(text, record.tool_name)) return 0.8;
  if (isXProfileUrl(url)) return 0.7;
  return 0.6;
}

function isDiscussionUrl(url) {
  const domain = domainFromUrl(url);
  return Boolean(domain) && (
    isXStatusUrl(url) ||
    isXProfileUrl(url) ||
    domain.includes("reddit.com") ||
    domain.includes("news.ycombinator.com") ||
    domain.includes("youtube.com") ||
    domain === "youtu.be" ||
    domain.includes("github.com") ||
    domain.includes("producthunt.com") ||
    ![""].includes(domain)
  );
}

function extractUrls(text) {
  return [...new Set((String(text).match(/https?:\/\/[^\s"'<>),\]}]+/gi) ?? []).map(normalizeUrl))];
}

function normalizeUrl(url) {
  return String(url ?? "").replace(/[.,;:!?]+$/, "");
}

function isXStatusUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (host === "x.com" || host === "twitter.com") && /^\/[^/]+\/status\/\d+/i.test(parsed.pathname);
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

function hasToolMention(text, tool) {
  return clean(text).toLowerCase().includes(tool.name.toLowerCase()) || clean(text).toLowerCase().includes(tool.slug.toLowerCase());
}

function hasDirectToolMention(text, toolName) {
  return clean(text).toLowerCase().includes(String(toolName ?? "").toLowerCase());
}

function sameTool(toolName, tool) {
  return String(toolName ?? "").toLowerCase() === tool.name.toLowerCase();
}

function dedupeRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    const key = `${record.tool_name}|${normalizeUrl(record.discussion_url)}|${normalizeUrl(record.x_post_url)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarize(records, tools) {
  const toolCounts = Object.fromEntries(tools.map((tool) => [tool.name, records.filter((record) => record.tool_name === tool.name).length]));
  return {
    tools_processed: tools.length,
    total_discussion_records: records.length,
    source_counts: countBy(records, "source_type"),
    discussion_type_counts: countBy(records, "discussion_type"),
    x_post_count: records.filter((record) => record.x_post_url).length,
    x_profile_count: records.filter((record) => record.x_profile_url).length,
    top_10_tools_by_discussion_count: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    bottom_10_tools_by_discussion_count: Object.entries(toolCounts).sort((a, b) => a[1] - b[1]).slice(0, 10)
  };
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] || "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AppScreenerDiscussionDiscoveryV1/0.1",
        ...(options.headers ?? {})
      }
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
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

function toCsv(records) {
  const headers = ["tool_name", "discussion_url", "source_type", "source_url", "title", "creator", "published_at", "discussion_type", "x_post_url", "x_profile_url", "confidence", "status", "evidence_text"];
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => csvCell(record[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function outputSchema() {
  return {
    tool_name: "string",
    discussion_url: "string",
    source_type: "x_proof | x_profile_reference | youtube | github | hackernews | reddit | newsletter | article | producthunt | blog | unknown",
    source_url: "string",
    title: "string",
    creator: "string",
    published_at: "string",
    discussion_type: "creator_discussion | workflow_discussion | comparison_discussion | recommendation_discussion | launch_discussion | technical_discussion | generic_mention",
    x_post_url: "string",
    x_profile_url: "string",
    confidence: "number",
    status: "string",
    evidence_text: "string"
  };
}

function clean(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

class URLSafe {
  constructor(url) {
    try {
      this.url = new URL(url);
    } catch {
      this.url = { pathname: "" };
    }
  }

  get pathname() {
    return this.url.pathname;
  }
}

function loadLocalEnvFiles(fileNames) {
  for (const fileName of fileNames) {
    const envPath = path.join(projectRoot, fileName);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (process.env[parsed.key] === undefined) process.env[parsed.key] = parsed.value;
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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return { key, value };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
