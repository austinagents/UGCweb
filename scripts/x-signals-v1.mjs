#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
loadLocalEnvFiles([".env.sources", ".env.local", ".env"]);

const args = process.argv.slice(2);
const dryRun = hasFlag("dry-run");
const timeoutMs = numberArg("timeout-ms", 12000);
const delayMs = numberArg("delay-ms", 250);
const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ??
  process.env.TWITTERAPI_API_KEY ??
  process.env.TWITTER_API_IO_KEY ??
  process.env.TWITTERAPIIO_API_KEY ??
  "";

const endpoint = "https://api.twitterapi.io/twitter/tweet/advanced_search";
const signalsDir = path.join(projectRoot, "data/x-signals");
const summaryPath = path.join(projectRoot, "data/x-signals-summary.csv");
const tweetCostUsdPerThousand = 0.15;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!dryRun && !apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing.");
  ensureDir(signalsDir);

  const now = new Date();
  const collectedAt = now.toISOString();
  const todayPath = path.join(signalsDir, `${collectedAt.slice(0, 10)}.json`);
  const previous = readLatestSignals(todayPath);
  const lastScan = previous?.collectedAt ?? previous?.run?.collectedAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sinceTime = Math.floor(new Date(lastScan).getTime() / 1000);
  const untilTime = Math.floor(now.getTime() / 1000);

  const targets = loadTwentyFourHourTargets();
  const records = [];
  const raw = [];
  const errors = [];
  let requestsMade = 0;
  let tweetsReturned = 0;

  for (const [index, tool] of targets.entries()) {
    console.log(`[${index + 1}/${targets.length}] ${tool.name} @${tool.handle}`);
    try {
      const officialQuery = `from:${tool.handle} since_time:${sinceTime} until_time:${untilTime}`;
      const mentionQuery = `@${tool.handle} -from:${tool.handle} min_faves:3 -filter:replies since_time:${sinceTime} until_time:${untilTime}`;

      const official = dryRun ? emptySearchResult(officialQuery) : await searchTweets(officialQuery);
      requestsMade += dryRun ? 0 : 1;
      tweetsReturned += official.tweets.length;
      raw.push({ toolSlug: tool.slug, type: "official_activity", query: officialQuery, response: official.raw });

      if (delayMs > 0 && !dryRun) await sleep(delayMs);

      const mentions = dryRun ? emptySearchResult(mentionQuery) : await searchTweets(mentionQuery);
      requestsMade += dryRun ? 0 : 1;
      tweetsReturned += mentions.tweets.length;
      raw.push({ toolSlug: tool.slug, type: "external_discussion", query: mentionQuery, response: mentions.raw });

      const officialEngagementTotal = sumEngagement(official.tweets);
      const mentionEngagementTotal = sumEngagement(mentions.tweets);
      const mentionAuthorsCount = new Set(mentions.tweets.map((tweet) => normalizeHandle(tweet.authorHandle)).filter(Boolean)).size;
      const externalDiscussionScore = mentions.tweets.length + mentionAuthorsCount + mentionEngagementTotal;
      const officialActivityScore = official.tweets.length + officialEngagementTotal;
      const combinedScore = externalDiscussionScore * 0.8 + officialActivityScore * 0.2;

      records.push({
        toolSlug: tool.slug,
        toolName: tool.name,
        handle: tool.handle,
        officialPostsCount: official.tweets.length,
        officialEngagementTotal,
        mentionPostsCount: mentions.tweets.length,
        mentionAuthorsCount,
        mentionEngagementTotal,
        externalDiscussionScore,
        officialActivityScore,
        combinedScore: round(combinedScore, 2),
        collectedAt
      });
    } catch (error) {
      const message = error.message || String(error);
      errors.push({ toolSlug: tool.slug, toolName: tool.name, handle: tool.handle, error: message });
      records.push({
        toolSlug: tool.slug,
        toolName: tool.name,
        handle: tool.handle,
        officialPostsCount: 0,
        officialEngagementTotal: 0,
        mentionPostsCount: 0,
        mentionAuthorsCount: 0,
        mentionEngagementTotal: 0,
        externalDiscussionScore: 0,
        officialActivityScore: 0,
        combinedScore: 0,
        collectedAt,
        error: message
      });
    }
  }

  const output = {
    run: {
      collectedAt,
      lastScan,
      sinceTime,
      untilTime,
      endpoint: "GET /twitter/tweet/advanced_search",
      maxPages: 1,
      noPagination: true,
      scope: "current 24H list only",
      toolsRequested: targets.length,
      toolsScanned: records.length,
      requestsMade,
      tweetsReturned,
      estimatedCostUsd: round((tweetsReturned * tweetCostUsdPerThousand) / 1000, 4),
      errors
    },
    records,
    raw
  };

  writeJson(todayPath, output);
  writeCsv(summaryPath, [
    "tool_slug",
    "tool_name",
    "handle",
    "official_posts_count",
    "official_engagement_total",
    "mention_posts_count",
    "mention_authors_count",
    "mention_engagement_total",
    "combined_score"
  ], records.map((record) => ({
    tool_slug: record.toolSlug,
    tool_name: record.toolName,
    handle: record.handle,
    official_posts_count: record.officialPostsCount,
    official_engagement_total: record.officialEngagementTotal,
    mention_posts_count: record.mentionPostsCount,
    mention_authors_count: record.mentionAuthorsCount,
    mention_engagement_total: record.mentionEngagementTotal,
    combined_score: record.combinedScore
  })).sort((a, b) => Number(b.combined_score) - Number(a.combined_score)));

  console.log(JSON.stringify({
    output: relative(todayPath),
    summary: relative(summaryPath),
    tools_scanned: records.length,
    requests_made: requestsMade,
    tweets_returned: tweetsReturned,
    estimated_cost_usd: output.run.estimatedCostUsd,
    errors: errors.length,
    top_20: [...records].sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 20).map((record) => ({
      toolSlug: record.toolSlug,
      toolName: record.toolName,
      handle: record.handle,
      combinedScore: record.combinedScore
    }))
  }, null, 2));
}

async function searchTweets(query) {
  const url = new URL(endpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("queryType", "Latest");
  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": "AppScreener X Signals V1"
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
    raw: json,
    tweets: (Array.isArray(json.tweets) ? json.tweets : []).map(extractTweet)
  };
}

function extractTweet(tweet) {
  const authorHandle = tweet.author?.userName ?? tweet.user?.screen_name ?? "";
  const id = tweet.id ?? tweet.tweetId ?? tweet.rest_id ?? "";
  return {
    tweetId: id,
    authorHandle,
    timestamp: tweet.createdAt ?? tweet.created_at ?? "",
    likes: numberFrom(tweet.likeCount ?? tweet.favorite_count ?? tweet.public_metrics?.like_count),
    replies: numberFrom(tweet.replyCount ?? tweet.reply_count ?? tweet.public_metrics?.reply_count),
    reposts: numberFrom(tweet.retweetCount ?? tweet.retweet_count ?? tweet.public_metrics?.retweet_count),
    quotes: numberFrom(tweet.quoteCount ?? tweet.public_metrics?.quote_count),
    views: numberFrom(tweet.viewCount ?? tweet.views ?? tweet.public_metrics?.impression_count),
    url: tweet.url ?? tweetUrlFor(authorHandle, id)
  };
}

function loadTwentyFourHourTargets() {
  const componentSource = readFileSync(path.join(projectRoot, "components/home-trending-filter.tsx"), "utf8");
  const dataSource = readFileSync(path.join(projectRoot, "lib/data.ts"), "utf8");
  const approvedXUrls = parseApprovedXUrls(dataSource);
  const slugs = parseTwentyFourHourSlugs(componentSource);
  const catalog = loadCatalogTools(dataSource);
  const bySlug = new Map();
  for (const tool of catalog) {
    bySlug.set(tool.slug, tool);
    if (tool.sourceSlug) bySlug.set(tool.sourceSlug, tool);
  }
  const targets = [];
  const missing = [];
  const catalogSlugAliases = new Map([
    ["flux-black-forest-labs", "flux"]
  ]);

  for (const slug of slugs) {
    const tool = bySlug.get(slug) ?? bySlug.get(catalogSlugAliases.get(slug) ?? "");
    const xUrl = approvedXUrls.get(slug) ?? (tool?.sourceSlug ? approvedXUrls.get(tool.sourceSlug) : "") ?? "";
    const handle = handleFromXUrl(xUrl);
    if (!tool || !handle) {
      missing.push({ slug, reason: !tool ? "tool_not_found" : "missing_x_handle" });
      continue;
    }
    targets.push({ slug, name: tool.name, handle });
  }

  if (targets.length !== 100) {
    throw new Error(`Expected 100 24H tools with handles, found ${targets.length}. Missing: ${JSON.stringify(missing).slice(0, 1000)}`);
  }
  return targets;
}

function parseTwentyFourHourSlugs(source) {
  const discovery = parseStringArrayConst(source, "twentyFourHourDiscoverySlugs");
  const topBody = arrayConstBody(source, "twentyFourHourTopToolSlugs");
  const explicit = [...topBody.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return [...discovery, ...explicit];
}

function parseStringArrayConst(source, name) {
  return [...arrayConstBody(source, name).matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function arrayConstBody(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) throw new Error(`Could not find ${name}.`);
  return match[1];
}

function loadCatalogTools(dataSource) {
  const rawTools = parseRawTools(dataSource);
  const importedTools = readJson(path.join(projectRoot, "data/taaft-tools.json"), []);
  const baseTools = rawTools.map((tool, index) => ({
    id: `tool_${index + 1}`,
    name: tool.name,
    slug: slugify(tool.name),
    sourceSlug: slugify(tool.name),
    websiteUrl: tool.websiteUrl
  }));
  const importedMapped = importedTools.map((tool, index) => ({
    id: tool.id || `taaft_${index + 1}`,
    name: normalizeProductDisplayName(tool.name),
    slug: slugify(normalizeProductDisplayName(tool.name)),
    sourceSlug: tool.slug || slugify(tool.name),
    websiteUrl: tool.websiteUrl
  }));
  const baseSlugs = new Set(baseTools.map((tool) => tool.slug));
  const baseDomains = new Set(baseTools.map((tool) => domainFromUrl(tool.websiteUrl)).filter(Boolean));
  return [
    ...baseTools,
    ...importedMapped.filter((tool) => !baseSlugs.has(tool.slug) && !baseDomains.has(domainFromUrl(tool.websiteUrl)))
  ];
}

function parseRawTools(source) {
  const match = source.match(/const rawTools:[\s\S]*?= \[([\s\S]*?)\n\] as const;/);
  if (!match) throw new Error("Could not find rawTools in lib/data.ts.");
  const tools = [];
  const rowPattern = /\[\s*"([^"]+)",\s*"[^"]+",\s*"[^"]*",\s*"([^"]+)"/g;
  let row;
  while ((row = rowPattern.exec(match[1]))) {
    tools.push({ name: normalizeProductDisplayName(row[1]), websiteUrl: row[2] });
  }
  return tools;
}

function parseApprovedXUrls(source) {
  const match = source.match(/const approvedToolXUrls: Record<string, string> = \{([\s\S]*?)\n\};/);
  if (!match) throw new Error("Could not find approvedToolXUrls in lib/data.ts.");
  return new Map([...match[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((pair) => [pair[1], pair[2]]));
}

function sumEngagement(tweets) {
  return tweets.reduce((sum, tweet) => sum + tweet.likes + tweet.replies + tweet.reposts + tweet.quotes, 0);
}

function emptySearchResult(query) {
  return { raw: { dryRun: true, query, tweets: [] }, tweets: [] };
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

function readLatestSignals(todayPath) {
  const files = existsSync(signalsDir) ? [...readDirJson(signalsDir)].sort().reverse() : [];
  for (const file of files) {
    const fullPath = path.join(signalsDir, file);
    if (fullPath !== todayPath) return readJson(fullPath, null);
  }
  return null;
}

function readDirJson(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".json")) : [];
}

function loadLocalEnvFiles(names) {
  for (const name of names) {
    const filePath = path.join(projectRoot, name);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

function writeJson(filePath, value) {
  ensureParentDir(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(filePath, columns, rows) {
  ensureParentDir(filePath);
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function csvEscape(value) {
  const string = String(value);
  if (!/[",\n\r]/.test(string)) return string;
  return `"${string.replace(/"/g, "\"\"")}"`;
}

function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function argValue(name) {
  const equalsPrefix = `--${name}=`;
  const equalsArg = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) return equalsArg.slice(equalsPrefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function numberArg(name, fallback) {
  const parsed = Number(argValue(name) ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numberFrom(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHandle(handle) {
  return String(handle || "").replace(/^@/, "").trim().toLowerCase();
}

function handleFromXUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["x.com", "twitter.com", "www.x.com", "www.twitter.com"].includes(parsed.hostname.toLowerCase())) return "";
    return parsed.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
  } catch {
    return "";
  }
}

function tweetUrlFor(authorHandle, id) {
  if (!authorHandle || !id) return "";
  return `https://x.com/${authorHandle}/status/${id}`;
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeProductDisplayName(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const displayNameOverrides = {
    "Flux (Black Forest Labs)": "Flux",
    "Luma AI": "Luma",
    "Kling AI": "Kling",
    "CapCut AI": "CapCut",
    "Replit AI": "Replit"
  };
  return displayNameOverrides[normalized] ?? normalized;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relative(filePath) {
  return path.relative(projectRoot, filePath);
}
