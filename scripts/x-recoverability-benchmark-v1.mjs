#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const defaultInputPath = path.join(projectRoot, "appscreener_tools_input.csv");
const defaultSourcePath = path.join(projectRoot, "data/source-ingestion-v1-sample.json");
const defaultOutputPath = path.join(projectRoot, "data/x-recoverability-benchmark-v1.json");
const defaultCsvOutputPath = path.join(projectRoot, "data/x-recoverability-benchmark-v1.csv");

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const inputPath = path.resolve(argValue("input") ?? defaultInputPath);
const sourcePath = path.resolve(argValue("source") ?? defaultSourcePath);
const outputPath = path.resolve(argValue("output") ?? defaultOutputPath);
const csvOutputPath = path.resolve(argValue("csv-output") ?? defaultCsvOutputPath);
const maxTools = Number(argValue("max-tools") ?? "25");
const limit = Number(argValue("limit") ?? "10");
const delayMs = Number(argValue("delay-ms") ?? "500");
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");

const searchProvider = process.env.SERPER_API_KEY
  ? "serper"
  : process.env.TAVILY_API_KEY
    ? "tavily"
    : process.env.BRAVE_API_KEY
      ? "brave"
      : "";

const benchmarkMethods = [
  "existing_evidence_x_urls",
  "search_discovered_x_urls",
  "article_newsletter_embedded_x_urls"
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  console.log(`Search provider: ${searchProvider || "none"}`);
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);
  if (!existsSync(sourcePath)) throw new Error(`Source ingestion output not found: ${sourcePath}`);

  const tools = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord).slice(0, maxTools);
  const sourceRecords = readSourceRecords(sourcePath);
  const rows = [];

  for (const [index, tool] of tools.entries()) {
    console.log(`[${index + 1}/${tools.length}] ${tool.name}`);
    const toolRecords = sourceRecords.filter((record) => sameTool(record.tool_name, tool));
    rows.push(measureExistingEvidenceX(tool, toolRecords));
    rows.push(measureArticleNewsletterEmbeddedX(tool, toolRecords));
    rows.push(await measureSearchDiscoveredX(tool));
    await delay(delayMs);
  }

  const runtimeMs = Date.now() - startedAt;
  const summary = summarize(rows, tools, runtimeMs);
  const output = {
    generated_at: new Date().toISOString(),
    schema: {
      tool_name: "string",
      method: benchmarkMethods.join(" | "),
      unique_x_posts: "number",
      unique_x_accounts: "number",
      coverage_score: "number"
    },
    rows,
    summary
  };

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(csvOutputPath, toCsv(rows));
  console.log(JSON.stringify(summary, null, 2));
}

function measureExistingEvidenceX(tool, records) {
  return measureUrls(tool, "existing_evidence_x_urls", records, records);
}

function measureArticleNewsletterEmbeddedX(tool, records) {
  const articleLikeRecords = records.filter((record) => {
    const type = String(record.source_type ?? "").toLowerCase();
    const creator = String(record.creator ?? "").toLowerCase();
    const domain = domainFromUrl(record.source_url);
    return ["rss", "article", "blog", "newsletter", "newsletter_blog"].includes(type)
      || creator.includes("blog")
      || creator.includes("newsletter")
      || domain.includes("substack")
      || domain.includes("medium.com")
      || domain.includes("beehiiv");
  });
  return measureUrls(tool, "article_newsletter_embedded_x_urls", articleLikeRecords, records);
}

async function measureSearchDiscoveredX(tool) {
  if (!searchProvider) {
    return benchmarkRow(tool, "search_discovered_x_urls", [], [], "missing_search_provider");
  }
  const results = await searchForX(tool).catch((error) => {
    console.warn(`${tool.name} ${searchProvider} search failed: ${error.message}`);
    return [];
  });
  const urls = results.flatMap((result) => extractUrls(`${result.url} ${result.title} ${result.snippet}`));
  return benchmarkRow(tool, "search_discovered_x_urls", urls.filter(isXStatusUrl), urls.filter(isXProfileUrl), `provider:${searchProvider}`);
}

function measureUrls(tool, method, records, allRecords) {
  const urls = records.flatMap((record) => extractUrls(evidenceTextFor(record)));
  const postUrls = urls.filter(isXStatusUrl);
  const profileUrls = urls.filter((url) => isXProfileUrl(url) && !isXStatusUrl(url));
  return benchmarkRow(tool, method, postUrls, profileUrls, `records_scanned:${records.length};total_tool_records:${allRecords.length}`);
}

function benchmarkRow(tool, method, postUrls, profileUrls, status) {
  const uniquePosts = uniqueNormalized(postUrls);
  const uniqueAccounts = uniqueNormalized([...profileUrls, ...postUrls.map(accountUrlFromXPost).filter(Boolean)]);
  return {
    tool_name: tool.name,
    method,
    unique_x_posts: uniquePosts.length,
    unique_x_accounts: uniqueAccounts.length,
    coverage_score: coverageScore(uniquePosts.length, uniqueAccounts.length),
    status
  };
}

function coverageScore(postCount, accountCount) {
  return Number(Math.min(1, postCount * 0.2 + accountCount * 0.05).toFixed(2));
}

async function searchForX(tool) {
  const query = `site:x.com OR site:twitter.com "${tool.name}"`;
  if (searchProvider === "serper") {
    const json = await fetchJson("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, num: limit })
    });
    return (json.organic ?? []).map((item) => ({ url: item.link, title: item.title, snippet: item.snippet }));
  }
  if (searchProvider === "tavily") {
    const json = await fetchJson("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: limit })
    });
    return (json.results ?? []).map((item) => ({ url: item.url, title: item.title, snippet: item.content }));
  }
  if (searchProvider === "brave") {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));
    const json = await fetchJson(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY }
    });
    return (json.web?.results ?? []).map((item) => ({ url: item.url, title: item.title, snippet: item.description }));
  }
  return [];
}

function summarize(rows, tools, runtimeMs) {
  const methodSummaries = benchmarkMethods.map((method) => {
    const methodRows = rows.filter((row) => row.method === method);
    const toolsWithPosts = methodRows.filter((row) => row.unique_x_posts > 0).length;
    const toolsWithAccounts = methodRows.filter((row) => row.unique_x_accounts > 0).length;
    const totalPosts = sum(methodRows, "unique_x_posts");
    const totalAccounts = sum(methodRows, "unique_x_accounts");
    return {
      method,
      total_unique_x_posts: totalPosts,
      total_unique_x_accounts: totalAccounts,
      tools_with_x_posts: toolsWithPosts,
      tools_with_x_accounts: toolsWithAccounts,
      coverage_percent: Number(((Math.max(toolsWithPosts, toolsWithAccounts) / tools.length) * 100).toFixed(1)),
      average_coverage_score: Number((sum(methodRows, "coverage_score") / Math.max(1, methodRows.length)).toFixed(3)),
      cost_estimate: costEstimateFor(method),
      runtime_ms: runtimeMs
    };
  });
  return {
    tools_processed: tools.length,
    runtime_ms: runtimeMs,
    best_method: [...methodSummaries].sort((a, b) => b.coverage_percent - a.coverage_percent || b.total_unique_x_posts - a.total_unique_x_posts)[0],
    methods_ranked: methodSummaries.sort((a, b) => b.coverage_percent - a.coverage_percent || b.total_unique_x_posts - a.total_unique_x_posts)
  };
}

function costEstimateFor(method) {
  if (method === "existing_evidence_x_urls") return "$0 incremental; uses existing Source Ingestion V1 records";
  if (method === "article_newsletter_embedded_x_urls") return "$0 incremental; uses existing article/RSS/newsletter records";
  if (!searchProvider) return "$0 run cost; skipped because no search provider key is configured";
  return `Uses existing ${searchProvider} API key; cost depends on provider quota/pricing`;
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

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AppScreenerXRecoverabilityBenchmarkV1/0.1",
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

function extractUrls(text) {
  return [...new Set((String(text).match(/https?:\/\/[^\s"'<>),\]}]+/gi) ?? []).map(normalizeUrl))];
}

function normalizeUrl(url) {
  return String(url ?? "").replace(/[.,;:!?]+$/, "");
}

function uniqueNormalized(urls) {
  return [...new Set(urls.map(normalizeUrl).filter(Boolean))];
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

function accountUrlFromXPost(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle ? `https://${host}/${handle}` : "";
  } catch {
    return "";
  }
}

function sameTool(toolName, tool) {
  return String(toolName ?? "").toLowerCase() === tool.name.toLowerCase();
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function toCsv(rows) {
  const headers = ["tool_name", "method", "unique_x_posts", "unique_x_accounts", "coverage_score", "status"];
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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
