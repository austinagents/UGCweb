#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fetchAuthorAvatar, normalizeHandle } from "./lib/x-avatar-lookup.mjs";

for (const fileName of [".env.sources", ".env.local", ".env"]) {
  if (!existsSync(fileName)) continue;
  for (const line of readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const apiKey = process.env.TWITTERAPI_IO_API_KEY || process.env.TWITTERAPI_API_KEY || process.env.TWITTER_API_IO_KEY || process.env.TWITTERAPIIO_API_KEY || "";
if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing");

const sourcesPath = "data/x-proof-sources-v2-all.json";
const qualityPath = "data/x-proof-quality-v3-clean.json";
const catalogPath = "data/taaft-tools.json";
const reportPath = "data/x-proof-author-avatar-enrichment-v1.csv";
const delayMs = Number(process.env.TWITTERAPI_DELAY_MS || "350");
const dryRun = process.argv.includes("--dry-run");

const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
const quality = JSON.parse(readFileSync(qualityPath, "utf8"));
const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, "utf8")) : [];
const toolBySlug = new Map(catalog.map((tool) => [tool.slug, tool]));
const qualityBySlug = new Map((quality.records || []).map((record) => [record.slug, record]));

const bluechipXProofSlugs = new Set([
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

const bluechipAuthorCryptoNoiseTerms = [
  "crypto",
  "web3",
  "defi",
  "nft",
  "btc",
  "bitcoin",
  "eth",
  "ethereum",
  "sol",
  "solana",
  "airdrop",
  "memecoin",
  "onchain",
  "blockchain",
  "token",
  "tokens",
  "altcoin",
  "dao",
  "dex",
  "cex",
  "staking",
  "yield",
  "pumpfun"
];

const displayedTweets = [];
for (const record of sources.records || []) {
  const qualityRecord = qualityBySlug.get(record.slug);
  const tool = toolBySlug.get(record.slug) || { name: record.tool, slug: record.slug };
  if (!qualityRecord || Number(qualityRecord.useful_count || 0) < 3 || !handlesMatch(qualityRecord.x_handle, record.x_handle) || isSharedProofHandle(record.x_handle)) continue;
  const usefulTweets = rankedXProofTweets(record, qualityRecord)
    .filter((tweet) => isValidXProofTweet(tweet, tool, record))
    .reduce(selectDiverseXProofTweets, [])
    .slice(0, 3);
  for (const tweet of usefulTweets) displayedTweets.push({ record, tweet });
}

const missingDisplayedTweets = displayedTweets.filter(({ tweet }) => !avatarUrlFor(tweet));
const authors = [...new Set(missingDisplayedTweets.map(({ tweet }) => normalizeHandle(tweet.author || tweet.authorHandle)).filter(Boolean))];
const avatarByAuthor = new Map();
const errors = [];

for (const [index, author] of authors.entries()) {
  console.log(`[${index + 1}/${authors.length}] @${author}`);
  try {
    const avatar = dryRun ? "" : await fetchAuthorAvatar(author, { apiKey, userAgent: "AppScreener X Proof Avatar Enrichment" });
    if (avatar) avatarByAuthor.set(author, avatar);
  } catch (error) {
    errors.push({ author, error: error.message });
  }
  if (!dryRun && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}

let enriched = 0;
let fallback = 0;
let alreadyHadAvatar = 0;

for (const { tweet } of displayedTweets) {
  const author = normalizeHandle(tweet.author || tweet.authorHandle);
  tweet.authorHandle = author ? `@${author}` : tweet.authorHandle || "";
  tweet.authorName = tweet.authorName || "";
  if (avatarUrlFor(tweet)) {
    alreadyHadAvatar += 1;
    continue;
  }
  const avatar = avatarByAuthor.get(author);
  if (avatar) {
    tweet.authorProfileImageUrl = avatar;
    enriched += 1;
  } else {
    fallback += 1;
  }
}

if (!dryRun) writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
writeFileSync(reportPath, [
  "metric,value",
  `x_proof_items_checked,${displayedTweets.length}`,
  `x_proof_items_already_had_avatar,${alreadyHadAvatar}`,
  `x_proof_items_missing_avatar_before,${missingDisplayedTweets.length}`,
  `x_proof_items_enriched,${enriched}`,
  `x_proof_items_fallback,${fallback}`,
  `unique_authors_checked,${authors.length}`,
  `dry_run,${dryRun}`,
  `author_lookup_errors,${errors.length}`,
  ...errors.map((error) => `"error:${error.author}","${error.error.replace(/"/g, '""')}"`)
].join("\n") + "\n");

console.log(JSON.stringify({
  checked: displayedTweets.length,
  alreadyHadAvatar,
  missingBefore: missingDisplayedTweets.length,
  enriched,
  fallback,
  uniqueAuthors: authors.length,
  errors: errors.length,
  dryRun,
  reportPath
}, null, 2));

function avatarUrlFor(tweet) {
  return tweet?.authorProfileImageUrl || tweet?.profileImageUrl || tweet?.profilePicture || "";
}

function rankedXProofTweets(record, qualityRecord) {
  const tweetByUrl = new Map((record.top_tweets || []).map((tweet) => [tweet.url, tweet]));
  const seen = new Set();
  const ranked = [];
  const addTweet = (tweet) => {
    if (!tweet?.url || seen.has(tweet.url)) return;
    seen.add(tweet.url);
    ranked.push(tweet);
  };

  bestXProofUrls(qualityRecord).forEach((url) => addTweet(tweetByUrl.get(url)));
  (record.top_tweets || []).forEach(addTweet);

  return ranked;
}

function bestXProofUrls(record) {
  return String(record.best_3_tweet_urls || "")
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function isValidXProofTweet(tweet, tool, record) {
  return isEnglishLanguageXProofTweet(tweet) &&
    !isCryptoNoiseXProofTweet(tweet) &&
    !isBluechipCryptoNoiseXProofTweet(tweet, tool) &&
    !isBluechipAuthorCryptoNoiseXProofTweet(tweet, tool) &&
    !isSharedProofHandle(record.x_handle) &&
    toolMentionTerms(tool, record).some((term) => String(tweet.text || "").toLowerCase().includes(term));
}

function selectDiverseXProofTweets(selected, tweet, _index, tweets) {
  const author = normalizeHandle(tweet.author);
  const selectedAuthors = new Set(selected.map((item) => normalizeHandle(item.author)).filter(Boolean));
  const uniqueAuthors = new Set(tweets.map((item) => normalizeHandle(item.author)).filter(Boolean));

  if (selected.length < Math.min(3, uniqueAuthors.size) && author && !selectedAuthors.has(author)) return [...selected, tweet];
  if (selected.length < 3 && selected.length >= uniqueAuthors.size) return [...selected, tweet];
  return selected;
}

function isEnglishLanguageXProofTweet(tweet) {
  const language = (tweet.lang || tweet.language || tweet.tweetLanguage || "").trim().toLowerCase();
  if (!language) return true;
  return language === "en" || language === "eng" || language === "english";
}

function isCryptoNoiseXProofTweet(tweet) {
  const text = String(tweet.text || "");
  return /\$[A-Z0-9]{1,10}\b/i.test(text) || /\b(?:CA:|Contract:|contract address|airdrop|100x|moon|gem)\b/i.test(text);
}

function isBluechipCryptoNoiseXProofTweet(tweet, tool) {
  if (!bluechipXProofSlugs.has(tool.slug)) return false;
  const text = String(tweet.text || "");
  return /\$[A-Z0-9]{1,10}\b/i.test(text) || /\b(?:CA:|contract address|airdrop|token|memecoin|solana|sol|web3|ethereum|eth|presale|launchpad|degen|100x|moon|gem|pump)\b/i.test(text);
}

function isBluechipAuthorCryptoNoiseXProofTweet(tweet, tool) {
  if (!bluechipXProofSlugs.has(tool.slug)) return false;
  const authorText = `${tweet.author || ""} ${tweet.authorName || ""}`.toLowerCase();
  return bluechipAuthorCryptoNoiseTerms.some((term) => authorText.includes(term));
}

function toolMentionTerms(tool, record) {
  const terms = new Set();
  const addTerm = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) terms.add(normalized);
  };
  const handle = String(record.x_handle || "").replace(/^@/, "").trim();

  addTerm(tool.name);
  addTerm(tool.slug);
  addTerm(String(tool.slug || "").replace(/[-_]+/g, " "));
  addTerm(String(tool.name || "").replace(/([a-z])([A-Z])/g, "$1 $2"));

  if (handle && !isSharedProofHandle(handle)) {
    addTerm(handle);
    addTerm(`@${handle}`);
  }

  return Array.from(terms);
}

function handlesMatch(left, right) {
  const normalizedLeft = normalizeHandle(left);
  const normalizedRight = normalizeHandle(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function isSharedProofHandle(handle) {
  return new Set(["theresanaiforit", "producthunt", "toolfolio", "peerlist", "uneedlists", "betalist", "microlaunchhq", "tinylaunch"]).has(normalizeHandle(handle));
}
