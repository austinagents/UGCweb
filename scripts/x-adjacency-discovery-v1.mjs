#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const defaultInputPath = path.join(projectRoot, "appscreener_tools_input.csv");
const defaultOutputPath = path.join(projectRoot, "data/x-adjacency-discovery-v1.json");
const defaultCsvOutputPath = path.join(projectRoot, "data/x-adjacency-discovery-v1.csv");

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const inputPath = path.resolve(argValue("input") ?? defaultInputPath);
const outputPath = path.resolve(argValue("output") ?? defaultOutputPath);
const csvOutputPath = path.resolve(argValue("csv-output") ?? defaultCsvOutputPath);
const toolArg = argValue("tool") ?? "";
const limit = Number(argValue("limit") ?? "100");
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");

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
  const startedAt = Date.now();
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);
  if (!toolArg) throw new Error("Missing required --tool=<name-or-slug>");

  const tools = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord);
  const targetTool = findTool(tools, toolArg);
  if (!targetTool) throw new Error(`Tool not found: ${toolArg}`);

  console.log(`Tool: ${targetTool.name}`);
  console.log(`Search provider: ${searchProvider || "none"}`);

  const posts = searchProvider ? await searchXMentions(targetTool) : [];
  const rankedAdjacency = rankAdjacency(targetTool, tools, posts);
  const runtimeMs = Date.now() - startedAt;
  const output = {
    generated_at: new Date().toISOString(),
    tool_name: targetTool.name,
    search_provider: searchProvider || "none",
    requested_mentions: limit,
    returned_mentions: posts.length,
    runtime_ms: runtimeMs,
    records: rankedAdjacency,
    summary: {
      adjacent_tools_found: rankedAdjacency.length,
      total_co_mentions: rankedAdjacency.reduce((sum, item) => sum + item.co_mention_count, 0),
      status: searchProvider ? "completed" : "missing_search_provider"
    }
  };

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(csvOutputPath, toCsv(rankedAdjacency));
  console.log(JSON.stringify(output.summary, null, 2));
  console.log(JSON.stringify(rankedAdjacency.slice(0, 10), null, 2));
}

async function searchXMentions(tool) {
  const queries = [`site:x.com "${tool.name}"`, `site:twitter.com "${tool.name}"`];
  const perQueryLimit = Math.ceil(limit / queries.length);
  const results = [];
  for (const query of queries) {
    const queryResults = await searchProviderResults(query, perQueryLimit).catch((error) => {
      console.warn(`${searchProvider} query failed: ${error.message}`);
      return [];
    });
    results.push(...queryResults);
  }
  return dedupePosts(results).slice(0, limit);
}

async function searchProviderResults(query, count) {
  if (searchProvider === "serper") {
    const json = await fetchJson("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, num: count })
    });
    return (json.organic ?? []).map((item) => normalizeSearchResult(item.link, item.title, item.snippet, item.date));
  }
  if (searchProvider === "tavily") {
    const json = await fetchJson("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: count })
    });
    return (json.results ?? []).map((item) => normalizeSearchResult(item.url, item.title, item.content, item.published_date));
  }
  if (searchProvider === "brave") {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(20, count)));
    url.searchParams.set("freshness", "pm");
    const json = await fetchJson(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY }
    });
    return (json.web?.results ?? []).map((item) => normalizeSearchResult(item.url, item.title, item.description, item.age));
  }
  return [];
}

function normalizeSearchResult(url, title, snippet, publishedAt) {
  return {
    post_url: normalizeUrl(url),
    title: clean(title),
    snippet: clean(snippet),
    published_at: clean(publishedAt),
    text: clean(`${title ?? ""} ${snippet ?? ""} ${url ?? ""}`)
  };
}

function rankAdjacency(targetTool, tools, posts) {
  const candidates = tools.filter((tool) => tool.slug !== targetTool.slug);
  const adjacency = new Map();
  for (const post of posts) {
    for (const tool of candidates) {
      if (!mentionsTool(post.text, tool)) continue;
      const current = adjacency.get(tool.slug) ?? {
        tool_name: tool.name,
        tool_slug: tool.slug,
        adjacency_score: 0,
        co_mention_count: 0,
        sample_posts: []
      };
      current.co_mention_count += 1;
      if (current.sample_posts.length < 3) {
        current.sample_posts.push({
          post_url: post.post_url,
          title: post.title,
          snippet: post.snippet
        });
      }
      adjacency.set(tool.slug, current);
    }
  }
  return [...adjacency.values()]
    .map((item) => ({
      ...item,
      adjacency_score: Number((item.co_mention_count / Math.max(1, posts.length)).toFixed(3))
    }))
    .sort((a, b) => b.co_mention_count - a.co_mention_count || a.tool_name.localeCompare(b.tool_name));
}

function mentionsTool(text, tool) {
  const haystack = compact(text);
  return toolKeys(tool).some((key) => key.length > 1 && haystack.includes(key));
}

function toolKeys(tool) {
  const keys = [tool.name, tool.slug];
  if (tool.name.toLowerCase().endsWith(" ai")) keys.push(tool.name.slice(0, -3));
  return [...new Set(keys.map(compact).filter(Boolean))];
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AppScreenerXAdjacencyDiscoveryV1/0.1",
        ...(options.headers ?? {})
      }
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function findTool(tools, value) {
  const key = compact(value);
  return tools.find((tool) => compact(tool.slug) === key || compact(tool.name) === key);
}

function dedupePosts(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    if (!post.post_url) return false;
    const key = post.post_url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const headers = ["tool_name", "tool_slug", "adjacency_score", "co_mention_count", "sample_posts"];
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => csvCell(header === "sample_posts" ? JSON.stringify(record.sample_posts) : record[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeUrl(url) {
  return String(url ?? "").replace(/[.,;:!?]+$/, "");
}

function clean(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
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
