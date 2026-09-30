#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const defaultInputPath = path.join(projectRoot, "appscreener_tools_input.csv");
const defaultJsonOutputPath = path.join(projectRoot, "data/searchability-benchmark-v1.json");
const defaultCsvOutputPath = path.join(projectRoot, "data/searchability-benchmark-v1.csv");

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};
const hasFlag = (name) => args.includes(`--${name}`);

const inputPath = path.resolve(argValue("input") ?? defaultInputPath);
const jsonOutputPath = path.resolve(argValue("output") ?? defaultJsonOutputPath);
const csvOutputPath = path.resolve(argValue("csv-output") ?? defaultCsvOutputPath);
const selectedToolsArg = argValue("tools");
const selectedToolKeys = selectedToolsArg
  ? selectedToolsArg.split(",").map((tool) => tool.trim().toLowerCase()).filter(Boolean)
  : [];
const maxTools = Number(argValue("max-tools") ?? "0");
const tweetsPerQuery = Math.min(Number(argValue("tweets-per-query") ?? "20"), 20);
const delayMs = Math.max(Number(argValue("delay-ms") ?? "6000"), 6000);
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");
const dryRun = hasFlag("dry-run");
const apiKey = process.env.TWITTERAPI_IO_API_KEY ?? "";
let lastTwitterRequestAt = 0;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing.");
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);

  const tools = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord);
  const matchingTools = selectedToolKeys.length
    ? tools.filter((tool) => selectedToolKeys.includes(tool.slug.toLowerCase()) || selectedToolKeys.includes(tool.name.toLowerCase()))
    : tools;
  const selectedTools = maxTools > 0 ? matchingTools.slice(0, maxTools) : matchingTools;
  if (!selectedTools.length) throw new Error("No tools selected.");

  const records = [];
  const errors = [];

  for (const [index, tool] of selectedTools.entries()) {
    console.log(`[${index + 1}/${selectedTools.length}] ${tool.name}`);
    const benchmark = await benchmarkTool(tool).catch((error) => {
      errors.push({ tool: tool.name, slug: tool.slug, error: error.message });
      return null;
    });
    if (benchmark) records.push(benchmark);
  }

  const summary = summarize(records, selectedTools, errors);
  if (!records.length && errors.length) {
    throw new Error(`Searchability benchmark produced no records. First error: ${errors[0].tool} - ${errors[0].error}`);
  }

  const output = {
    generated_at: new Date().toISOString(),
    provider: "twitterapi.io",
    endpoint: "GET /twitter/tweet/advanced_search",
    schema: {
      tool: "string",
      slug: "string",
      category: "string",
      best_query: "string",
      searchability: "HIGH_SEARCHABILITY | MEDIUM_SEARCHABILITY | LOW_SEARCHABILITY",
      signal_score: "number 0-100",
      noise_score: "number 0-100",
      tweets_returned: "number",
      sample_tweets: "array"
    },
    records,
    summary
  };

  if (!dryRun) {
    ensureParentDir(jsonOutputPath);
    writeFileSync(jsonOutputPath, `${JSON.stringify(output, null, 2)}\n`);
    writeFileSync(csvOutputPath, toCsv(records));
  }

  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) console.log("Dry run: no files written.");
}

async function benchmarkTool(tool) {
  const queryResults = [];
  for (const query of queriesForTool(tool)) {
    const tweets = await searchTweets(query);
    queryResults.push(scoreQuery(tool, query, tweets));
  }

  const best = queryResults
    .sort((a, b) => {
      const signalDelta = b.signal_score - a.signal_score;
      if (signalDelta) return signalDelta;
      return a.noise_score - b.noise_score;
    })[0];

  return {
    tool: tool.name,
    slug: tool.slug,
    category: tool.category,
    best_query: best.query,
    searchability: searchabilityFor(best.signal_score, best.noise_score, best.tweets_returned),
    signal_score: best.signal_score,
    noise_score: best.noise_score,
    tweets_returned: best.tweets_returned,
    sample_tweets: best.sample_tweets,
    query_results: queryResults
  };
}

function queriesForTool(tool) {
  const queries = [
    `"${tool.name}"`,
    `"${tool.name}" AI`
  ];
  const officialHandle = officialHandleFor(tool);
  if (officialHandle) queries.push(`@${officialHandle}`);
  const domain = hostnameFor(tool.websiteUrl);
  if (domain) queries.push(`"${domain}"`);
  return [...new Set(queries)];
}

async function searchTweets(query) {
  await waitForTwitterRateLimit();
  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.set("query", query);
  url.searchParams.set("queryType", "Latest");

  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": "AppScreener Searchability Benchmark V1"
    }
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TwitterAPI.io returned non-JSON response (${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`TwitterAPI.io request failed (${response.status}): ${JSON.stringify(json).slice(0, 600)}`);
  }
  lastTwitterRequestAt = Date.now();
  return (json.tweets ?? []).slice(0, tweetsPerQuery).map(extractTweet);
}

async function waitForTwitterRateLimit() {
  const elapsed = Date.now() - lastTwitterRequestAt;
  const remaining = delayMs - elapsed;
  if (remaining > 0) await delay(remaining);
}

function scoreQuery(tool, query, tweets) {
  const scoredTweets = tweets.map((tweet) => scoreTweet(tool, tweet));
  const relevantCount = scoredTweets.filter((tweet) => tweet.relevant).length;
  const noiseCount = scoredTweets.filter((tweet) => tweet.noisy).length;
  const signal_score = clamp(Math.round((relevantCount / Math.max(tweetsPerQuery, 1)) * 100), 0, 100);
  const noise_score = clamp(Math.round((noiseCount / Math.max(tweets.length, 1)) * 100), 0, 100);

  return {
    query,
    signal_score,
    noise_score,
    tweets_returned: tweets.length,
    likely_relevant_tweets: relevantCount,
    obvious_noise_tweets: noiseCount,
    sample_tweets: scoredTweets.slice(0, 3).map(sampleTweet)
  };
}

function scoreTweet(tool, tweet) {
  const text = `${tweet.text} ${tweet.author} ${tweet.authorName} ${tweet.url}`;
  const exactMention = hasExactToolMention(text, tool);
  const officialDomainMention = hostnameFor(tool.websiteUrl) && text.toLowerCase().includes(hostnameFor(tool.websiteUrl));
  const officialHandleMention = officialHandleFor(tool) && text.toLowerCase().includes(`@${officialHandleFor(tool).toLowerCase()}`);
  const noisy = isNoisyTweet(tool, tweet);
  return {
    ...tweet,
    relevant: Boolean((exactMention || officialDomainMention || officialHandleMention) && !noisy),
    noisy
  };
}

function sampleTweet(tweet) {
  return {
    author: tweet.author,
    text: tweet.text,
    likes: tweet.likes,
    reposts: tweet.reposts,
    replies: tweet.replies,
    views: tweet.views,
    url: tweet.url
  };
}

function extractTweet(tweet) {
  const authorHandle = tweet.author?.userName ?? tweet.user?.screen_name ?? "";
  const authorName = tweet.author?.name ?? tweet.user?.name ?? "";
  const likes = numberFrom(tweet.likeCount ?? tweet.favorite_count ?? tweet.public_metrics?.like_count);
  const reposts = numberFrom(tweet.retweetCount ?? tweet.retweet_count ?? tweet.public_metrics?.retweet_count);
  const replies = numberFrom(tweet.replyCount ?? tweet.reply_count ?? tweet.public_metrics?.reply_count);
  const views = numberFrom(tweet.viewCount ?? tweet.views ?? tweet.public_metrics?.impression_count);

  return {
    id: tweet.id ?? tweet.tweetId ?? tweet.rest_id ?? "",
    url: tweet.url ?? tweetUrlFor(authorHandle, tweet.id ?? tweet.tweetId ?? tweet.rest_id),
    author: authorHandle || authorName,
    authorName,
    text: plain(tweet.text ?? tweet.full_text ?? ""),
    likes,
    reposts,
    replies,
    views,
    createdAt: tweet.createdAt ?? tweet.created_at ?? ""
  };
}

function searchabilityFor(signalScore, noiseScore, tweetsReturned) {
  if (tweetsReturned >= 12 && signalScore >= 55 && noiseScore <= 35) return "HIGH_SEARCHABILITY";
  if (tweetsReturned >= 5 && signalScore >= 25 && noiseScore <= 65) return "MEDIUM_SEARCHABILITY";
  return "LOW_SEARCHABILITY";
}

function isNoisyTweet(tool, tweet) {
  const text = plain(tweet.text).toLowerCase();
  const rejectionTerms = [
    "best ai tools",
    "top ai tools",
    "100 ai tools",
    "50 ai tools",
    "alternatives",
    "alternative to",
    "vs",
    "versus",
    "comparison",
    "compare",
    "competitor",
    "which is better",
    "which should you choose"
  ];
  if (rejectionTerms.some((term) => text.includes(term))) return true;
  const compactToolName = compact(tool.name);
  return compactToolName.length < 5 && !hasExactToolMention(text, tool);
}

function officialHandleFor(tool) {
  const handleBySlug = {
    chatgpt: "ChatGPTapp",
    claude: "claudeai",
    cursor: "cursor_ai",
    perplexity: "perplexity_ai",
    lovable: "lovable_dev",
    n8n: "n8n_io",
    vercel: "vercel",
    elevenlabs: "elevenlabsio",
    heygen: "HeyGen_Official"
  };
  return handleBySlug[tool.slug] ?? "";
}

function summarize(records, selectedTools, errors) {
  const bySearchability = countBy(records, "searchability");
  return {
    tools_requested: selectedTools.length,
    tools_benchmarked: records.length,
    errors,
    searchability_counts: bySearchability,
    high_searchability: bySearchability.HIGH_SEARCHABILITY ?? 0,
    medium_searchability: bySearchability.MEDIUM_SEARCHABILITY ?? 0,
    low_searchability: bySearchability.LOW_SEARCHABILITY ?? 0,
    average_signal_score: average(records.map((record) => record.signal_score)),
    average_noise_score: average(records.map((record) => record.noise_score)),
    total_tweets_returned: records.reduce((total, record) => total + record.tweets_returned, 0)
  };
}

function toCsv(records) {
  const columns = ["tool", "slug", "category", "best_query", "searchability", "signal_score", "noise_score", "tweets_returned"];
  const lines = [columns.map(csvEscape).join(",")];
  for (const record of records) {
    lines.push(columns.map((column) => csvEscape(record[column] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function hasExactToolMention(text, tool) {
  const haystack = plain(text).toLowerCase();
  const names = [tool.name, tool.slug].filter(Boolean);
  return names.some((name) => {
    const normalized = plain(name).toLowerCase();
    if (!normalized) return false;
    const escaped = escapeRegExp(normalized).replace(/\\ /g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
  });
}

function tweetUrlFor(authorHandle, id) {
  if (!authorHandle || !id) return "";
  return `https://x.com/${authorHandle}/status/${id}`;
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function rowFromRecord(record) {
  return {
    name: record.name ?? "",
    slug: record.slug ?? slugify(record.name ?? ""),
    category: record.category ?? "",
    websiteUrl: record.websiteUrl ?? ""
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  const [header = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function hostnameFor(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function plain(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function slugify(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvEscape(value) {
  const string = String(value ?? "");
  return `"${string.replace(/"/g, '""')}"`;
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] || "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function average(values) {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return Number((cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length).toFixed(2));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureParentDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}
