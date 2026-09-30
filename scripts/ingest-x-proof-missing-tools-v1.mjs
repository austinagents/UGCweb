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

const coveragePath = path.resolve(argValue("coverage") ?? path.join(projectRoot, "data/proof-coverage-v1.csv"));
const sourcesPath = path.resolve(argValue("sources") ?? path.join(projectRoot, "data/x-proof-sources-v2-all.json"));
const qualityPath = path.resolve(argValue("quality") ?? path.join(projectRoot, "data/x-proof-quality-v3-clean.json"));
const qualityCsvPath = path.resolve(argValue("quality-csv") ?? path.join(projectRoot, "data/x-proof-quality-v3-clean.csv"));
const reportPath = path.resolve(argValue("report") ?? path.join(projectRoot, "data/x-proof-ingest-missing-tools-v1.csv"));
const tweetsPerTool = Math.min(Number(argValue("tweets-per-tool") ?? "100"), 100);
const concurrency = Math.max(1, Number(argValue("concurrency") ?? "25"));
const timeoutMs = Number(argValue("timeout-ms") ?? "12000");
const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ??
  process.env.TWITTERAPI_API_KEY ??
  process.env.TWITTER_API_IO_KEY ??
  process.env.TWITTERAPIIO_API_KEY ??
  "";

const cryptoNoisePattern = /\$[A-Z0-9]{1,10}\b|\bCA:\b|\bContract:\b|contract address|\bairdrop\b|\b100x\b|\bmoon\b|\bgem\b/i;
const bluechipCryptoNoisePattern = /\$[A-Z0-9]{1,10}\b|\bCA:\b|contract address|\b(?:airdrop|token|memecoin|solana|sol|web3|ethereum|eth|presale|launchpad|degen|100x|moon|gem|pump)\b/i;
const bluechipAuthorCryptoNoiseTerms = ["crypto", "web3", "defi", "nft", "btc", "bitcoin", "eth", "ethereum", "sol", "solana", "airdrop", "memecoin", "onchain", "blockchain", "token", "tokens", "altcoin", "dao", "dex", "cex", "staking", "yield", "pumpfun"];
const bluechipProofSlugs = new Set([
  "chatgpt",
  "claude",
  "perplexity",
  "cursor",
  "vercel",
  "midjourney",
  "runway",
  "elevenlabs",
  "kling",
  "pika",
  "heygen",
  "synthesia",
  "notebooklm",
  "capcut"
]);
const englishLanguages = new Set(["en", "eng", "english"]);

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing.");
  const tools = loadMissingProofTools();
  const sources = readJson(sourcesPath, { summary: {}, records: [] });
  const quality = readJson(qualityPath, { summary: {}, records: [] });
  const existingSourceBySlug = new Map((sources.records ?? []).map((record) => [record.slug, record]));
  const existingQualityBySlug = new Map((quality.records ?? []).map((record) => [record.slug, record]));
  const selectedTools = tools.filter((tool) => !existingSourceBySlug.has(tool.slug));
  const reportRows = [];
  const errors = [];
  const startedAt = Date.now();

  let cursor = 0;
  async function worker() {
    while (cursor < selectedTools.length) {
      const tool = selectedTools[cursor++];
      console.log(`[${cursor}/${selectedTools.length}] ${tool.tool} ${tool.x_handle}`);
      try {
        const ingested = await ingestTool(tool);
        existingSourceBySlug.set(tool.slug, ingested.sourceRecord);
        existingQualityBySlug.set(tool.slug, ingested.qualityRecord);
        reportRows.push(ingested.reportRow);
      } catch (error) {
        errors.push({ tool: tool.tool, slug: tool.slug, x_handle: tool.x_handle, error: error.message });
        reportRows.push({
          tool: tool.tool,
          slug: tool.slug,
          x_handle: tool.x_handle,
          tweets_returned: 0,
          useful_proof_count: 0,
          proof_quality_score: 0,
          status: `error: ${error.message}`
        });
      }
      writeOutputs(sources, quality, existingSourceBySlug, existingQualityBySlug, reportRows, selectedTools, errors, startedAt);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, selectedTools.length) }, worker));
  writeOutputs(sources, quality, existingSourceBySlug, existingQualityBySlug, reportRows, selectedTools, errors, startedAt);
  console.log(JSON.stringify(summary(reportRows, selectedTools, errors, startedAt), null, 2));
}

function loadMissingProofTools() {
  if (!existsSync(coveragePath)) throw new Error(`Coverage CSV not found: ${coveragePath}`);
  const coverageRows = parseCsv(readFileSync(coveragePath, "utf8"));
  const missingSlugs = new Set(coverageRows.filter((row) => row.has_proof_source === "false").map((row) => row.slug));
  const catalog = loadCatalogTools();
  return catalog
    .filter((tool) => missingSlugs.has(tool.slug))
    .map((tool) => ({ ...tool, x_handle: handleFromXUrl(tool.officialXUrl) }))
    .filter((tool) => tool.x_handle);
}

function loadCatalogTools() {
  const dataTs = readFileSync(path.join(projectRoot, "lib/data.ts"), "utf8");
  const rawMatch = dataTs.match(/const rawTools:[\s\S]*?= \[([\s\S]*?)\] as const;/);
  const xMapMatch = dataTs.match(/const approvedToolXUrls: Record<string, string> = \{([\s\S]*?)\n\};/);
  const xUrls = new Map();
  for (const match of (xMapMatch?.[1] ?? "").matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
    xUrls.set(match[1], match[2]);
  }
  const tools = [];
  const rowPattern = /\["([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"(?:[^"]|\\")*"\s*,\s*"([^"]*)"/g;
  for (const match of (rawMatch?.[1] ?? "").matchAll(rowPattern)) {
    const slug = slugify(match[1]);
    tools.push({ tool: match[1], slug, category: match[2], websiteUrl: match[3], officialXUrl: xUrls.get(slug) ?? "" });
  }
  const imported = readJson(path.join(projectRoot, "data/taaft-tools.json"), []);
  for (const tool of imported) {
    tools.push({ tool: tool.name, slug: tool.slug, category: tool.category, websiteUrl: tool.websiteUrl, officialXUrl: xUrls.get(tool.slug) ?? "" });
  }
  return tools;
}

async function ingestTool(tool) {
  const handle = tool.x_handle.replace(/^@/, "");
  const query = `@${handle} -from:${handle} min_faves:3 -filter:replies`;
  const tweets = await searchTweets(query, tweetsPerTool);
  const validTweets = tweets.filter((tweet) => qualifiesTweet(tweet, tool, handle));
  const sortedValidTweets = [...validTweets].sort((a, b) => b.engagement.total - a.engagement.total);
  const scoredTweets = tweets.map((tweet) => scoreTweet(tweet, tool, handle));
  const usefulCount = sortedValidTweets.length;
  const badCount = scoredTweets.filter((tweet) => !tweet.useful).length;
  const proofQualityScore = Math.min(100, usefulCount * 10);
  const topTweets = sortedValidTweets.slice(0, 10);
  const bestDisplayTweets = selectDiverseTweets(topTweets).slice(0, 3);
  return {
    sourceRecord: {
      tool: tool.tool,
      slug: tool.slug,
      x_handle: `@${handle}`,
      confidence: 100,
      query,
      tweets_returned: tweets.length,
      authors: [...new Set(tweets.map((tweet) => tweet.author).filter(Boolean))],
      urls: tweets.map((tweet) => tweet.url).filter(Boolean),
      top_tweets: topTweets
    },
    qualityRecord: {
      tool: tool.tool,
      slug: tool.slug,
      x_handle: `@${handle}`,
      tweets_returned: tweets.length,
      useful_count: usefulCount,
      bad_count: badCount,
      proof_quality_score: proofQualityScore,
      best_3_tweet_urls: bestDisplayTweets.map((tweet) => tweet.url).join(" | "),
      notes: noteSummary(scoredTweets),
      scored_tweets: scoredTweets
    },
    reportRow: {
      tool: tool.tool,
      slug: tool.slug,
      x_handle: `@${handle}`,
      tweets_returned: tweets.length,
      useful_proof_count: usefulCount,
      proof_quality_score: proofQualityScore,
      status: usefulCount >= 3 ? "qualified_3_plus" : usefulCount > 0 ? "partial_1_plus" : "no_useful_proof"
    }
  };
}

async function searchTweets(query, limit) {
  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.set("query", query);
  url.searchParams.set("queryType", "Latest");
  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": "AppScreener Missing X Proof Ingest V1"
    }
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TwitterAPI.io returned non-JSON response (${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.ok) throw new Error(`TwitterAPI.io request failed (${response.status}): ${JSON.stringify(json).slice(0, 600)}`);
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
    lang: tweet.lang ?? tweet.language ?? "",
    engagement: { likes, reposts, replies, views, total: likes + reposts + replies }
  };
}

function qualifiesTweet(tweet, tool, handle) {
  return scoreTweet(tweet, tool, handle).useful;
}

function scoreTweet(tweet, tool, handle) {
  const text = tweet.text ?? "";
  const reasons = [];
  if (cryptoNoisePattern.test(text)) reasons.push("hard_reject_crypto_noise");
  if (bluechipProofSlugs.has(tool.slug) && bluechipCryptoNoisePattern.test(text)) reasons.push("hard_reject_bluechip_crypto_noise");
  if (bluechipProofSlugs.has(tool.slug) && hasBluechipAuthorCryptoNoise(tweet)) reasons.push("hard_reject_bluechip_author_crypto_noise");
  if (tweet.lang && !englishLanguages.has(String(tweet.lang).toLowerCase())) reasons.push("hard_reject_non_english");
  if (!mentionsTool(text, tool, handle)) reasons.push("unrelated_tool_post");
  const useful = reasons.length === 0;
  if (!useful && !reasons.length) reasons.push("unclear_proof_value");
  return { url: tweet.url, text, useful, spam: reasons.some((reason) => reason.startsWith("hard_reject")), reasons };
}

function hasBluechipAuthorCryptoNoise(tweet) {
  const authorText = `${tweet.author ?? ""} ${tweet.authorName ?? ""}`.toLowerCase();
  return bluechipAuthorCryptoNoiseTerms.some((term) => authorText.includes(term));
}

function mentionsTool(text, tool, handle) {
  const haystack = String(text ?? "").toLowerCase();
  const name = tool.tool.toLowerCase();
  const slugWords = tool.slug.replace(/-/g, " ").toLowerCase();
  const cleanHandle = handle.toLowerCase();
  return haystack.includes(name) || haystack.includes(slugWords) || haystack.includes(`@${cleanHandle}`) || haystack.includes(cleanHandle);
}

function selectDiverseTweets(tweets) {
  const uniqueAuthorCount = new Set(tweets.map((tweet) => normalizeAuthor(tweet.author)).filter(Boolean)).size;
  const selected = [];
  const selectedAuthors = new Set();

  for (const tweet of tweets) {
    const author = normalizeAuthor(tweet.author);
    if (selected.length < Math.min(3, uniqueAuthorCount) && author && !selectedAuthors.has(author)) {
      selected.push(tweet);
      selectedAuthors.add(author);
      continue;
    }
    if (selected.length < 3 && selected.length >= uniqueAuthorCount) {
      selected.push(tweet);
      if (author) selectedAuthors.add(author);
    }
    if (selected.length >= 3) break;
  }

  return selected;
}

function normalizeAuthor(author) {
  return String(author ?? "").replace(/^@/, "").trim().toLowerCase();
}

function noteSummary(scoredTweets) {
  const counts = new Map();
  for (const tweet of scoredTweets) for (const reason of tweet.reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts.entries()].map(([reason, count]) => `${reason}:${count}`).join("; ");
}

function writeOutputs(sources, quality, sourceBySlug, qualityBySlug, reportRows, tools, errors, startedAt) {
  const sourceRecords = [...sourceBySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const qualityRecords = [...qualityBySlug.values()].sort((a, b) => b.proof_quality_score - a.proof_quality_score || a.slug.localeCompare(b.slug));
  const sourceSummary = {
    ...(sources.summary ?? {}),
    generated_at: new Date().toISOString(),
    input: "data/proof-coverage-v1.csv",
    query: "@handle -from:handle min_faves:3 -filter:replies",
    missing_tools_run: summary(reportRows, tools, errors, startedAt),
    records_after_missing_tools_run: sourceRecords.length
  };
  const qualitySummary = {
    ...(quality.summary ?? {}),
    generated_at: new Date().toISOString(),
    source: "data/x-proof-sources-v2-all.json",
    missing_tools_run: summary(reportRows, tools, errors, startedAt),
    true_qualifying_tool_count: qualityRecords.filter((record) => record.useful_count >= 3).length,
    records_after_missing_tools_run: qualityRecords.length
  };
  ensureParentDir(sourcesPath);
  writeFileSync(sourcesPath, `${JSON.stringify({ summary: sourceSummary, records: sourceRecords }, null, 2)}\n`);
  writeFileSync(qualityPath, `${JSON.stringify({ summary: qualitySummary, records: qualityRecords }, null, 2)}\n`);
  writeQualityCsv(qualityRecords);
  writeReportCsv(reportRows);
}

function summary(reportRows, tools, errors, startedAt) {
  const totalTweets = reportRows.reduce((sum, row) => sum + Number(row.tweets_returned || 0), 0);
  const useful = reportRows.reduce((sum, row) => sum + Number(row.useful_proof_count || 0), 0);
  return {
    tools_processed: tools.length,
    tools_failed: errors.length,
    total_tweets_returned: totalTweets,
    total_useful_proof_posts: useful,
    tools_with_1_plus_useful_proof_posts: reportRows.filter((row) => row.useful_proof_count >= 1).length,
    tools_with_3_plus_useful_proof_posts: reportRows.filter((row) => row.useful_proof_count >= 3).length,
    tools_with_0_useful_proof_posts: reportRows.filter((row) => row.useful_proof_count === 0).length,
    runtime_seconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
    errors
  };
}

function writeQualityCsv(records) {
  const rows = [["tool", "slug", "x_handle", "tweets_returned", "useful_count", "bad_count", "proof_quality_score", "best_3_tweet_urls", "notes"]];
  for (const record of records) rows.push([record.tool, record.slug, record.x_handle, record.tweets_returned, record.useful_count, record.bad_count, record.proof_quality_score, record.best_3_tweet_urls, record.notes]);
  writeFileSync(qualityCsvPath, toCsv(rows));
}

function writeReportCsv(rows) {
  const outputRows = [["tool", "slug", "x_handle", "tweets_returned", "useful_proof_count", "proof_quality_score", "status"]];
  for (const row of [...rows].sort((a, b) => a.slug.localeCompare(b.slug))) outputRows.push([row.tool, row.slug, row.x_handle, row.tweets_returned, row.useful_proof_count, row.proof_quality_score, row.status]);
  writeFileSync(reportPath, toCsv(outputRows));
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

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const value = String(cell ?? "");
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(",")).join("\n") + "\n";
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

function readJson(filePath, fallback) {
  return existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : fallback;
}

function handleFromXUrl(url) {
  try {
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return handle ? `@${handle}` : "";
  } catch {
    return "";
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

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return { key, value };
}
