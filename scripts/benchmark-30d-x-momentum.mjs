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

const inputPath = path.resolve(argValue("input") ?? path.join(projectRoot, "data/30d-candidate-x-handles.csv"));
const reviewPath = path.resolve(argValue("review-output") ?? path.join(projectRoot, "data/30d-x-momentum-review.csv"));
const rankedPath = path.resolve(argValue("ranked-output") ?? path.join(projectRoot, "data/30d-x-momentum-ranked.csv"));
const rawDir = path.resolve(argValue("raw-dir") ?? path.join(projectRoot, "data/x-30d-raw"));
const timeoutMs = Number(argValue("timeout-ms") ?? "20000");
const delayMs = Number(argValue("delay-ms") ?? "350");
const maxPages = Number(argValue("max-pages") ?? "200");
const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ??
  process.env.TWITTERAPI_API_KEY ??
  process.env.TWITTER_API_IO_KEY ??
  process.env.TWITTERAPIIO_API_KEY ??
  "";

const endpoint = "https://api.twitterapi.io/twitter/tweet/advanced_search";
const reviewColumns = [
  "tool_name",
  "x_handle",
  "status",
  "followers",
  "posts_30d",
  "likes_30d",
  "reposts_30d",
  "replies_30d",
  "quotes_30d",
  "views_30d",
  "avg_engagement",
  "median_engagement",
  "max_engagement",
  "posts_over_1k_engagement",
  "posts_over_10k_engagement",
  "error"
];
const rankedColumns = [
  ...reviewColumns.slice(0, -1),
  "engagement_score",
  "consistency_score",
  "reach_score",
  "momentum_score",
  "error"
];

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing.");
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);

  const candidates = parseCsv(readFileSync(inputPath, "utf8")).map((row) => ({
    tool_name: row.Tool,
    x_handle: row["X Handle"],
    status: row.Status
  }));
  if (!candidates.length) throw new Error("No candidates found.");

  const { since, until } = dateWindow();
  ensureDir(rawDir);
  ensureParentDir(reviewPath);
  ensureParentDir(rankedPath);

  const rows = [];
  for (const [index, candidate] of candidates.entries()) {
    console.log(`[${index + 1}/${candidates.length}] ${candidate.tool_name} ${candidate.x_handle}`);
    const row = await benchmarkCandidate(candidate, { since, until }).catch((error) => ({
      ...emptyRow(candidate),
      error: error.message
    }));
    rows.push(row);
    writeCsv(reviewPath, reviewColumns, rows);
    writeCsv(rankedPath, rankedColumns, rankRows(rows));
    if (index < candidates.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  writeCsv(reviewPath, reviewColumns, rows);
  writeCsv(rankedPath, rankedColumns, rankRows(rows));

  const errors = rows.filter((row) => row.error);
  console.log(JSON.stringify({
    input: relative(inputPath),
    raw_dir: relative(rawDir),
    review_output: relative(reviewPath),
    ranked_output: relative(rankedPath),
    handles_processed: rows.length,
    errors: errors.length,
    since,
    until
  }, null, 2));
}

async function benchmarkCandidate(candidate, window) {
  const handle = normalizeHandle(candidate.x_handle);
  const raw = await fetchAllPages(handle, window);
  const rawPath = path.join(rawDir, `${handle}.json`);
  writeFileSync(rawPath, `${JSON.stringify(raw, null, 2)}\n`);

  const tweets = uniqueTweets(raw.pages.flatMap((page) => Array.isArray(page.response?.tweets) ? page.response.tweets : []));
  const engagements = tweets.map((tweet) => engagement(tweet));
  const totalEngagement = engagements.reduce((sum, value) => sum + value, 0);
  const views = tweets.reduce((sum, tweet) => sum + number(tweet.viewCount), 0);
  const engagementScore = round(Math.log10(1 + totalEngagement), 4);
  const consistencyScore = round(Math.min(tweets.length / 10, 1), 4);
  const reachScore = round(Math.log10(1 + views), 4);
  const momentumScore = round(engagementScore * 0.55 + consistencyScore * 0.25 + reachScore * 0.20, 4);

  return {
    tool_name: candidate.tool_name,
    x_handle: candidate.x_handle,
    status: candidate.status,
    followers: Math.max(...tweets.map((tweet) => number(tweet.author?.followers)), 0),
    posts_30d: tweets.length,
    likes_30d: tweets.reduce((sum, tweet) => sum + number(tweet.likeCount), 0),
    reposts_30d: tweets.reduce((sum, tweet) => sum + number(tweet.retweetCount), 0),
    replies_30d: tweets.reduce((sum, tweet) => sum + number(tweet.replyCount), 0),
    quotes_30d: tweets.reduce((sum, tweet) => sum + number(tweet.quoteCount), 0),
    views_30d: views,
    avg_engagement: round(tweets.length ? totalEngagement / tweets.length : 0, 2),
    median_engagement: round(median(engagements), 2),
    max_engagement: engagements.length ? Math.max(...engagements) : 0,
    posts_over_1k_engagement: engagements.filter((value) => value > 1000).length,
    posts_over_10k_engagement: engagements.filter((value) => value > 10000).length,
    engagement_score: engagementScore,
    consistency_score: consistencyScore,
    reach_score: reachScore,
    momentum_score: momentumScore,
    error: ""
  };
}

async function fetchAllPages(handle, { since, until }) {
  const pages = [];
  let nextCursor = "";
  const seenCursors = new Set();
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const page = await fetchPage(handle, { since, until, nextCursor });
    pages.push(page);
    const next = page.response?.next_cursor ?? "";
    if (!page.response?.has_next_page || !next || seenCursors.has(next)) break;
    seenCursors.add(next);
    nextCursor = next;
    if (delayMs > 0) await sleep(delayMs);
  }
  return {
    provider: "twitterapi.io",
    endpoint,
    handle: `@${handle}`,
    since,
    until,
    fetched_at: new Date().toISOString(),
    pages
  };
}

async function fetchPage(handle, { since, until, nextCursor }) {
  const url = new URL(endpoint);
  url.searchParams.set("query", `from:${handle} since:${since} until:${until}`);
  url.searchParams.set("queryType", "Latest");
  if (nextCursor) url.searchParams.set("next_cursor", nextCursor);

  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": "AppScreener 30D X Momentum Benchmark"
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
  return {
    request: {
      query: `from:${handle} since:${since} until:${until}`,
      queryType: "Latest",
      next_cursor: nextCursor || ""
    },
    response: json
  };
}

function emptyRow(candidate) {
  return {
    tool_name: candidate.tool_name,
    x_handle: candidate.x_handle,
    status: candidate.status,
    followers: 0,
    posts_30d: 0,
    likes_30d: 0,
    reposts_30d: 0,
    replies_30d: 0,
    quotes_30d: 0,
    views_30d: 0,
    avg_engagement: 0,
    median_engagement: 0,
    max_engagement: 0,
    posts_over_1k_engagement: 0,
    posts_over_10k_engagement: 0,
    engagement_score: 0,
    consistency_score: 0,
    reach_score: 0,
    momentum_score: 0,
    error: ""
  };
}

function rankRows(rows) {
  return [...rows].sort((a, b) => b.momentum_score - a.momentum_score);
}

function engagement(tweet) {
  return number(tweet.likeCount) + number(tweet.retweetCount) + number(tweet.replyCount) + number(tweet.quoteCount);
}

function uniqueTweets(tweets) {
  return [...new Map(tweets.map((tweet) => [tweet.id ?? tweet.url ?? JSON.stringify(tweet).slice(0, 100), tweet])).values()];
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function dateWindow() {
  const now = new Date();
  const untilDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const sinceDate = new Date(untilDate);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 30);
  return {
    since: formatDate(sinceDate),
    until: formatDate(untilDate)
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeHandle(handle) {
  const normalized = String(handle ?? "").trim().replace(/^@/, "");
  if (!normalized) throw new Error("Missing X handle.");
  return normalized;
}

async function fetchWithTimeout(url, { timeoutMs, headers }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function loadLocalEnvFiles(files) {
  for (const file of files) {
    const envPath = path.join(projectRoot, file);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function writeCsv(filePath, columns, rows) {
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n") + "\n";
  writeFileSync(filePath, csv);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function relative(filePath) {
  return path.relative(projectRoot, filePath);
}
