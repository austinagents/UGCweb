#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const inputPath = path.resolve(argValue("input") ?? path.join(projectRoot, "data/tool-x-master.csv"));
const outputPath = path.resolve(argValue("output") ?? path.join(projectRoot, "data/x-proof-sources-v1.json"));
const maxTools = Number(argValue("max-tools") ?? "25");
const tweetsPerTool = Math.min(Number(argValue("tweets-per-tool") ?? "20"), 100);
const topTweetsLimit = Number(argValue("top-tweets") ?? "5");
const delayMs = Math.max(Number(argValue("delay-ms") ?? "6500"), 6000);
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");
const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ??
  process.env.TWITTERAPI_API_KEY ??
  process.env.TWITTER_API_IO_KEY ??
  process.env.TWITTERAPIIO_API_KEY ??
  "";

const records = [];
const errors = [];
let lastTwitterRequestAt = 0;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing.");
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);

  const tools = parseCsv(readFileSync(inputPath, "utf8"))
    .map(rowFromRecord)
    .filter((tool) => tool.x_handle);
  const selectedTools = maxTools > 0 ? tools.slice(0, maxTools) : tools;

  for (const [index, tool] of selectedTools.entries()) {
    console.log(`[${index + 1}/${selectedTools.length}] ${tool.tool} ${tool.x_handle}`);
    const record = await ingestHandle(tool).catch((error) => {
      errors.push({ tool: tool.tool, slug: tool.slug, x_handle: tool.x_handle, error: error.message });
      return null;
    });
    if (record) records.push(record);
    writeOutput(selectedTools);
  }

  writeOutput(selectedTools);
  console.log(JSON.stringify(summary(selectedTools), null, 2));
}

async function ingestHandle(tool) {
  const handle = tool.x_handle.replace(/^@/, "");
  const tweets = await searchTweets(`from:${handle}`, tweetsPerTool);
  const topTweets = [...tweets]
    .sort((a, b) => b.engagement.total - a.engagement.total)
    .slice(0, topTweetsLimit);

  return {
    tool: tool.tool,
    slug: tool.slug,
    x_handle: `@${handle}`,
    confidence: tool.confidence,
    query: `from:${handle}`,
    tweets_returned: tweets.length,
    authors: [...new Set(tweets.map((tweet) => tweet.author).filter(Boolean))],
    urls: tweets.map((tweet) => tweet.url).filter(Boolean),
    top_tweets: topTweets
  };
}

async function searchTweets(query, limit) {
  await waitForTwitterRateLimit();
  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.set("query", query);
  url.searchParams.set("queryType", "Latest");

  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": "AppScreener X Proof Sources V1"
    }
  });
  const text = await response.text();
  lastTwitterRequestAt = Date.now();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TwitterAPI.io returned non-JSON response (${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`TwitterAPI.io request failed (${response.status}): ${JSON.stringify(json).slice(0, 600)}`);
  }
  return (json.tweets ?? []).slice(0, limit).map(extractTweet);
}

function extractTweet(tweet) {
  const authorHandle = tweet.author?.userName ?? tweet.user?.screen_name ?? "";
  const authorName = tweet.author?.name ?? tweet.user?.name ?? "";
  const likes = numberFrom(tweet.likeCount ?? tweet.favorite_count ?? tweet.public_metrics?.like_count);
  const reposts = numberFrom(tweet.retweetCount ?? tweet.retweet_count ?? tweet.public_metrics?.retweet_count);
  const replies = numberFrom(tweet.replyCount ?? tweet.reply_count ?? tweet.public_metrics?.reply_count);
  const views = numberFrom(tweet.viewCount ?? tweet.views ?? tweet.public_metrics?.impression_count);
  const id = tweet.id ?? tweet.tweetId ?? tweet.rest_id ?? "";

  return {
    id,
    author: authorHandle || authorName,
    authorName,
    text: plain(tweet.text ?? tweet.full_text ?? ""),
    url: tweet.url ?? tweetUrlFor(authorHandle, id),
    createdAt: tweet.createdAt ?? tweet.created_at ?? "",
    engagement: {
      likes,
      reposts,
      replies,
      views,
      total: likes + reposts + replies
    }
  };
}

function writeOutput(selectedTools) {
  ensureParentDir(outputPath);
  writeFileSync(outputPath, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    provider: "twitterapi.io",
    endpoint: "GET /twitter/tweet/advanced_search",
    input: path.relative(projectRoot, inputPath),
    scope: `first ${selectedTools.length} handles`,
    summary: summary(selectedTools),
    records,
    errors
  }, null, 2)}\n`);
}

function summary(selectedTools) {
  return {
    tools_requested: selectedTools.length,
    tools_ingested: records.length,
    tools_failed: errors.length,
    total_tweets_returned: records.reduce((total, record) => total + record.tweets_returned, 0)
  };
}

async function waitForTwitterRateLimit() {
  const elapsed = Date.now() - lastTwitterRequestAt;
  const remaining = delayMs - elapsed;
  if (remaining > 0) await delay(remaining);
}

function rowFromRecord(row) {
  return {
    tool: row.tool ?? "",
    slug: row.slug ?? "",
    x_handle: row.x_handle ?? "",
    confidence: Number(row.confidence ?? 0)
  };
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.length)) rows.push(row);
  }
  const [headers = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
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

function tweetUrlFor(authorHandle, id) {
  if (!authorHandle || !id) return "";
  return `https://x.com/${authorHandle}/status/${id}`;
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function plain(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
