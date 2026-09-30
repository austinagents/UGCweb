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

const toolName = argValue("tool") ?? "Lovable";
const query = argValue("query") ?? `"${toolName}"`;
const limit = Number(argValue("limit") ?? "100");
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");
const outputPath = path.resolve(argValue("output") ?? path.join(projectRoot, "data/twitterapi-io-lovable-raw.json"));
const summaryPath = path.resolve(argValue("summary-output") ?? path.join(projectRoot, "data/twitterapi-io-lovable-summary.json"));
const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ??
  process.env.TWITTERAPI_API_KEY ??
  process.env.TWITTER_API_IO_KEY ??
  process.env.TWITTERAPIIO_API_KEY ??
  "";

const tweetCostUsdPerThousand = 0.15;
const tweetCostUsd = tweetCostUsdPerThousand / 1000;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  console.log(`TwitterAPI.io key: ${apiKey ? "present" : "missing"}`);
  console.log(`Tool: ${toolName}`);
  console.log(`Query: ${query}`);
  console.log(`Limit: ${limit}`);
  console.log(`Expected 100-tweet cost: ${formatUsd(100 * tweetCostUsd)}`);

  if (!apiKey) {
    throw new Error(
      "TwitterAPI.io API key missing. Set TWITTERAPI_IO_API_KEY, TWITTERAPI_API_KEY, TWITTER_API_IO_KEY, or TWITTERAPIIO_API_KEY."
    );
  }

  const raw = await fetchLatestTweets({ query, limit, timeoutMs });
  const tweets = raw.pages.flatMap((page) => Array.isArray(page.response?.tweets) ? page.response.tweets : []).slice(0, limit);
  const extracted = tweets.map(extractTweet);
  const uniqueAuthors = new Set(extracted.map((tweet) => tweet.author).filter(Boolean));
  const topTweets = [...extracted]
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 10);

  const summary = {
    generatedAt: new Date().toISOString(),
    tool: toolName,
    query,
    totalTweetsReturned: extracted.length,
    uniqueAuthors: uniqueAuthors.size,
    cost: {
      tweetCostUsdPerThousand,
      tweetCostUsd,
      exactReturnedTweetCostUsd: Number((extracted.length * tweetCostUsd).toFixed(6)),
      requested100TweetCostUsd: Number((100 * tweetCostUsd).toFixed(6))
    },
    top10TweetsByEngagement: topTweets
  };

  ensureParentDir(outputPath);
  writeFileSync(outputPath, `${JSON.stringify({ ...raw, extracted }, null, 2)}\n`);
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Raw JSON saved: ${outputPath}`);
  console.log(`Summary saved: ${summaryPath}`);
}

async function fetchLatestTweets({ query, limit, timeoutMs }) {
  const pages = [];
  let cursor = "";

  while (pages.reduce((count, page) => count + (page.response?.tweets?.length ?? 0), 0) < limit) {
    const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
    url.searchParams.set("query", query);
    url.searchParams.set("queryType", "Latest");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetchWithTimeout(url, {
      timeoutMs,
      headers: {
        "X-API-Key": apiKey,
        "User-Agent": "AppScreener TwitterAPI.io POC"
      }
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`TwitterAPI.io returned non-JSON response (${response.status}): ${text.slice(0, 500)}`);
    }

    if (!response.ok) {
      throw new Error(`TwitterAPI.io request failed (${response.status}): ${JSON.stringify(json).slice(0, 1000)}`);
    }

    pages.push({
      requestUrl: redactUrl(url),
      status: response.status,
      fetchedAt: new Date().toISOString(),
      response: json
    });

    const tweets = Array.isArray(json.tweets) ? json.tweets : [];
    if (!json.has_next_page || !json.next_cursor || tweets.length === 0) break;
    cursor = json.next_cursor;
  }

  return {
    generatedAt: new Date().toISOString(),
    provider: "twitterapi.io",
    endpoint: "GET /twitter/tweet/advanced_search",
    query,
    queryType: "Latest",
    requestedLimit: limit,
    pages
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
    text: tweet.text ?? tweet.full_text ?? "",
    likes,
    reposts,
    replies,
    views,
    engagementScore: likes + reposts + replies,
    createdAt: tweet.createdAt ?? tweet.created_at ?? ""
  };
}

function tweetUrlFor(authorHandle, id) {
  if (!authorHandle || !id) return "";
  return `https://x.com/${authorHandle}/status/${id}`;
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 12000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function redactUrl(url) {
  const safe = new URL(url);
  return safe.toString();
}

function formatUsd(value) {
  return `$${value.toFixed(3)}`;
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
