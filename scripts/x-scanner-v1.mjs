#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
const runsDir = path.join(projectRoot, "data/x-scanner-runs");
const accountSnapshotsPath = path.join(projectRoot, "data/x-account-snapshots.json");
const toolEventsPath = path.join(projectRoot, "data/x-tool-events.json");
const summaryPath = path.join(projectRoot, "data/x-scanner-summary.csv");
const browserProfileDir = path.join(projectRoot, ".cache/x-scanner-browser");

const limit = numberArg("limit", 20);
const scanAll = hasFlag("all");
const headless = !hasFlag("headed");
const timeoutMs = numberArg("timeout-ms", 30000);
const delayMs = numberArg("delay-ms", 1500);
const recentPostLimit = numberArg("recent-post-limit", 10);
const mentionLimit = numberArg("mention-limit", 20);

const summaryColumns = [
  "scan_timestamp",
  "tool_slug",
  "tool_name",
  "official_handle",
  "x_user_id",
  "followers_count",
  "tweet_count",
  "official_posts_collected",
  "handle_mentions_collected",
  "profile_page_status",
  "search_page_status",
  "official_posts_visible",
  "handle_mentions_visible",
  "errors"
];

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  const runTimestamp = new Date().toISOString();
  const runId = runTimestamp.replace(/[:.]/g, "-");
  const runPath = path.join(runsDir, `${runId}.json`);
  ensureDir(runsDir);

  const { catalogTools, toolsWithHandles } = loadCatalogTools();
  const selectedTools = scanAll ? toolsWithHandles : toolsWithHandles.slice(0, Math.max(0, limit));
  const debug = {
    total_catalog_tools_loaded: catalogTools.length,
    total_tools_with_x_handles_found: toolsWithHandles.length,
    selected_tools_preview: selectedTools.slice(0, 10).map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      handle: tool.officialHandle
    }))
  };
  console.log(JSON.stringify(debug, null, 2));
  const existingSnapshots = readJson(accountSnapshotsPath, []);
  const existingEvents = readJson(toolEventsPath, []);
  const eventsByKey = new Map(existingEvents.map((event) => [eventKey(event), event]));
  const snapshots = [...existingSnapshots];
  const summaryRows = [];
  const rawPages = [];
  const errors = [];
  let eventsInserted = 0;
  let pagesVisited = 0;

  let context;
  if (selectedTools.length) {
    ensureDir(browserProfileDir);
    try {
      context = await chromium.launchPersistentContext(browserProfileDir, {
        headless,
        viewport: { width: 1366, height: 900 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
      });
    } catch (error) {
      const message = compactError(`browser_launch_failed: ${error.message || String(error)}`);
      for (const tool of selectedTools) {
        summaryRows.push({ ...emptySummaryRow(runTimestamp, tool), errors: message });
        errors.push({ toolSlug: tool.slug, toolName: tool.name, officialHandle: tool.officialHandle, error: message });
      }
    }
  }

  try {
    const page = context ? context.pages()[0] ?? await context.newPage() : null;
    if (page) page.setDefaultTimeout(timeoutMs);

    const toolsToScrape = page ? selectedTools : [];
    for (const [index, tool] of toolsToScrape.entries()) {
      const row = emptySummaryRow(runTimestamp, tool);
      try {
        const profileUrl = `https://x.com/${tool.officialHandle}`;
        await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        await settle(page);
        pagesVisited += 1;

        const profile = await scrapeProfilePage(page, tool);
        rawPages.push({ toolSlug: tool.slug, pageType: "official_profile", url: profileUrl, raw: profile.raw });
        const snapshot = accountSnapshotFromProfile(tool, profile, runTimestamp);
        snapshots.push(snapshot);
        row.x_user_id = snapshot.xUserId;
        row.followers_count = snapshot.followersCount;
        row.tweet_count = snapshot.tweetCount;
        row.profile_page_status = profile.status;
        row.official_posts_visible = String(profile.tweets.length > 0);

        for (const tweet of profile.tweets.slice(0, recentPostLimit)) {
          const event = eventFromScrapedTweet({
            tool,
            tweet,
            collectedAt: runTimestamp,
            eventType: officialEventType(tweet),
            sourceType: "official_activity"
          });
          if (!event.xPostId || eventsByKey.has(eventKey(event))) continue;
          eventsByKey.set(eventKey(event), event);
          row.official_posts_collected += 1;
          eventsInserted += 1;
        }

        const searchUrl = `https://x.com/search?q=${encodeURIComponent(`@${tool.officialHandle}`)}&src=typed_query&f=live`;
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        await settle(page);
        pagesVisited += 1;

        const mentions = await scrapeTweets(page, mentionLimit);
        const searchStatus = await pageStatus(page, mentions);
        row.search_page_status = searchStatus;
        row.handle_mentions_visible = String(mentions.length > 0);
        rawPages.push({ toolSlug: tool.slug, pageType: "handle_mentions", url: searchUrl, raw: { tweets: mentions.map((tweet) => tweet.raw) } });
        for (const tweet of mentions) {
          if (tweet.authorHandle.toLowerCase() === tool.officialHandle.toLowerCase()) continue;
          const event = eventFromScrapedTweet({
            tool,
            tweet,
            collectedAt: runTimestamp,
            eventType: "handle_mention",
            sourceType: "external_discussion"
          });
          if (!event.xPostId || eventsByKey.has(eventKey(event))) continue;
          eventsByKey.set(eventKey(event), event);
          row.handle_mentions_collected += 1;
          eventsInserted += 1;
        }
      } catch (error) {
        const message = compactError(error.message || String(error));
        row.errors = message;
        errors.push({ toolSlug: tool.slug, toolName: tool.name, officialHandle: tool.officialHandle, error: message });
      }

      summaryRows.push(row);
      if (index < toolsToScrape.length - 1 && delayMs > 0) await sleep(delayMs);
    }
  } finally {
    if (context) await context.close();
  }

  const allEvents = [...eventsByKey.values()].sort((a, b) => `${a.toolSlug}:${a.postedAt}:${a.xPostId}`.localeCompare(`${b.toolSlug}:${b.postedAt}:${b.xPostId}`));
  writeJson(accountSnapshotsPath, dedupeSnapshots(snapshots));
  writeJson(toolEventsPath, allEvents);
  writeCsv(summaryPath, summaryColumns, summaryRows);

  const run = {
    run_timestamp: runTimestamp,
    provider: "public_x_pages_playwright",
    collection_mechanism: "playwright_chromium_rendered_dom",
    metadata: {
      total_catalog_tools_loaded: catalogTools.length,
      tools_available_with_official_handles: toolsWithHandles.length,
      tools_scanned: selectedTools.length,
      pages_visited: pagesVisited,
      events_inserted: eventsInserted,
      errors: errors.length,
      default_limit: 20,
      all: scanAll,
      headless,
      recent_post_limit: recentPostLimit,
      mention_limit: mentionLimit
    },
    outputs: {
      run: relative(runPath),
      account_snapshots: relative(accountSnapshotsPath),
      tool_events: relative(toolEventsPath),
      summary_csv: relative(summaryPath)
    },
    tools_scanned: selectedTools.map((tool) => ({
      toolId: tool.id,
      toolSlug: tool.slug,
      toolName: tool.name,
      officialHandle: tool.officialHandle
    })),
    raw_pages: rawPages,
    errors
  };
  writeJson(runPath, run);

  console.log(JSON.stringify({
    run: relative(runPath),
    tools_scanned: selectedTools.length,
    pages_visited: pagesVisited,
    events_inserted: eventsInserted,
    errors: errors.length,
    account_snapshots: relative(accountSnapshotsPath),
    tool_events: relative(toolEventsPath),
    summary_csv: relative(summaryPath)
  }, null, 2));
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 900).catch(() => {});
  await page.waitForTimeout(900);
}

async function scrapeProfilePage(page, tool) {
  const loginWall = await isLoginWall(page);
  const tweets = await scrapeTweets(page, recentPostLimit);
  const profile = await page.evaluate((handle) => {
    const text = document.body?.innerText ?? "";
    const name = document.querySelector('[data-testid="UserName"]')?.textContent?.split("\n")[0]?.trim() ?? "";
    const followersText = [...document.querySelectorAll(`a[href$="/verified_followers"], a[href$="/followers"]`)]
      .map((node) => node.textContent ?? "")
      .find((value) => /followers/i.test(value)) ?? "";
    const followingText = [...document.querySelectorAll(`a[href$="/following"]`)]
      .map((node) => node.textContent ?? "")
      .find((value) => /following/i.test(value)) ?? "";
    return {
      loginWall: /Sign in to X|Don.t miss what.s happening|Log in/i.test(text),
      name,
      followersText,
      followingText,
      articleCount: document.querySelectorAll('article[data-testid="tweet"], [data-testid="cellInnerDiv"]').length,
      bodyText: text.slice(0, 8000),
      url: location.href,
      handle
    };
  }, tool.officialHandle);

  return {
    name: profile.name || tool.name,
    followersCount: parseCompactCount(profile.followersText),
    followingCount: parseCompactCount(profile.followingText),
    tweetCount: parseProfileTweetCount(profile.bodyText),
    verified: /\bVerified\b/i.test(profile.bodyText),
    loginWall: loginWall || profile.loginWall,
    tweets,
    status: statusForPage({ loginWall: loginWall || profile.loginWall, articleCount: profile.articleCount, visibleCount: tweets.length }),
    raw: profile
  };
}

async function scrapeTweets(page, limit) {
  return page.evaluate((maxTweets) => {
    const articleNodes = [...document.querySelectorAll('article[data-testid="tweet"]')];
    const fallbackNodes = [...document.querySelectorAll('[data-testid="cellInnerDiv"]')]
      .filter((node) => node.querySelector('a[href*="/status/"], [data-testid="tweetText"]'));
    const containers = (articleNodes.length ? articleNodes : fallbackNodes).slice(0, maxTweets);
    return containers.map((container) => {
      const links = [...container.querySelectorAll("a")].map((anchor) => ({
        href: anchor.href,
        text: anchor.textContent ?? ""
      }));
      const statusLink = links.find((link) => /\/status\/\d+/.test(link.href));
      const text = [...container.querySelectorAll('[data-testid="tweetText"]')]
        .map((node) => node.textContent ?? "")
        .join("\n")
        .trim() || container.textContent?.trim() || "";
      const metricsLabel = [...container.querySelectorAll("[aria-label]")]
        .map((node) => node.getAttribute("aria-label") ?? "")
        .find((label) => /repl|repost|like|view|quote/i.test(label)) ?? "";
      const authorLink = statusLink ?? links.find((link) => /^https:\/\/(?:x|twitter)\.com\/[^/?#]+$/i.test(link.href) && !/\/(home|explore|search|notifications|messages)$/i.test(link.href));
      return {
        text,
        url: statusLink?.href ?? "",
        authorUrl: authorLink?.href ?? "",
        authorText: authorLink?.text ?? "",
        metricsLabel,
        articleText: container.textContent?.slice(0, 4000) ?? "",
        rawLinks: links.slice(0, 40)
      };
    });
  }, limit).then((tweets) => tweets.map(normalizeScrapedTweet).filter((tweet) => tweet.xPostId));
}

async function isLoginWall(page) {
  const text = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  return /Sign in to X|Don.t miss what.s happening|Log in|Create account/i.test(text) && !/data-testid="tweet"/i.test(text);
}

function normalizeScrapedTweet(raw) {
  const statusMatch = raw.url.match(/\/([^/?#]+)\/status\/(\d+)/);
  const authorHandle = statusMatch?.[1] ?? handleFromXUrl(raw.authorUrl) ?? "";
  const metrics = parseMetricsLabel(raw.metricsLabel);
  return {
    xPostId: statusMatch?.[2] ?? "",
    authorHandle,
    authorId: "",
    text: cleanTweetText(raw.text),
    url: raw.url.replace("https://twitter.com/", "https://x.com/"),
    likeCount: metrics.likeCount,
    replyCount: metrics.replyCount,
    repostCount: metrics.repostCount,
    quoteCount: metrics.quoteCount,
    viewCount: metrics.viewCount,
    postedAt: "",
    raw
  };
}

function accountSnapshotFromProfile(tool, profile, collectedAt) {
  return {
    toolId: tool.id,
    toolSlug: tool.slug,
    toolName: tool.name,
    officialHandle: tool.officialHandle,
    xUserId: profile.raw?.handle ?? tool.officialHandle,
    name: profile.name,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    tweetCount: profile.tweetCount,
    listedCount: 0,
    verified: profile.verified,
    collectedAt,
    raw: profile.raw
  };
}

function eventFromScrapedTweet({ tool, tweet, collectedAt, eventType, sourceType }) {
  return {
    toolId: tool.id,
    toolSlug: tool.slug,
    toolName: tool.name,
    officialHandle: tool.officialHandle,
    xPostId: tweet.xPostId,
    eventType,
    sourceType,
    authorId: tweet.authorId,
    authorHandle: tweet.authorHandle,
    text: tweet.text,
    likeCount: tweet.likeCount,
    replyCount: tweet.replyCount,
    repostCount: tweet.repostCount,
    quoteCount: tweet.quoteCount,
    viewCount: tweet.viewCount,
    postedAt: tweet.postedAt,
    collectedAt,
    url: tweet.url,
    raw: tweet.raw
  };
}

function officialEventType(tweet) {
  const text = `${tweet.raw?.articleText ?? ""} ${tweet.text ?? ""}`;
  if (/reposted/i.test(text)) return "official_repost";
  if (/quoted/i.test(text)) return "official_quote";
  if (/Replying to/i.test(text)) return "official_reply";
  return "official_post";
}

function loadCatalogTools() {
  const dataTs = readFileSync(path.join(projectRoot, "lib/data.ts"), "utf8");
  const approvedXUrls = parseApprovedXUrls(dataTs);
  const rawTools = parseRawTools(dataTs);
  const importedTools = JSON.parse(readFileSync(path.join(projectRoot, "data/taaft-tools.json"), "utf8"));
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
  const catalogTools = [
    ...baseTools,
    ...importedMapped.filter((tool) => !baseSlugs.has(tool.slug) && !baseDomains.has(domainFromUrl(tool.websiteUrl)))
  ];
  const seen = new Set();
  const toolsWithHandles = catalogTools
    .map((tool) => {
      const officialXUrl = approvedXUrls[tool.slug] ?? approvedXUrls[tool.sourceSlug] ?? "";
      const officialHandle = handleFromXUrl(officialXUrl);
      return { ...tool, officialXUrl, officialHandle };
    })
    .filter((tool) => tool.officialHandle)
    .filter((tool) => {
      if (seen.has(tool.slug)) return false;
      seen.add(tool.slug);
      return true;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return { catalogTools, toolsWithHandles };
}

function parseApprovedXUrls(source) {
  const match = source.match(/const approvedToolXUrls: Record<string, string> = \{([\s\S]*?)\n\};/);
  if (!match) throw new Error("Could not find approvedToolXUrls in lib/data.ts.");
  const entries = {};
  const pairPattern = /"([^"]+)":\s*"([^"]+)"/g;
  let pair;
  while ((pair = pairPattern.exec(match[1]))) entries[pair[1]] = pair[2];
  return entries;
}

function parseRawTools(source) {
  const match = source.match(/const rawTools:[\s\S]*?= \[([\s\S]*?)\n\];/);
  if (!match) throw new Error("Could not find rawTools in lib/data.ts.");
  const tools = [];
  const rowPattern = /\[\s*"([^"]+)",\s*"[^"]+",\s*"[^"]*",\s*"([^"]+)"/g;
  let row;
  while ((row = rowPattern.exec(match[1]))) {
    tools.push({ name: normalizeProductDisplayName(row[1]), websiteUrl: row[2] });
  }
  return tools;
}

function parseMetricsLabel(label = "") {
  const get = (name) => {
    const match = label.match(new RegExp(`([\\d,.]+\\s*[KMB]?)\\s+${name}`, "i"));
    return parseCompactCount(match?.[1] ?? "");
  };
  return {
    replyCount: get("repl(?:y|ies)"),
    repostCount: get("repost"),
    quoteCount: get("quote"),
    likeCount: get("like"),
    viewCount: get("view")
  };
}

function parseCompactCount(value = "") {
  const match = String(value).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return 0;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]?.toUpperCase()] ?? 1;
  return Math.round(Number(match[1]) * multiplier);
}

function parseProfileTweetCount(text = "") {
  const match = text.match(/([\d,.]+)\s*(?:posts|tweets)/i);
  return parseCompactCount(match?.[1] ?? "");
}

function cleanTweetText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function compactError(value = "") {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 500);
}

function emptySummaryRow(scanTimestamp, tool) {
  return {
    scan_timestamp: scanTimestamp,
    tool_slug: tool.slug,
    tool_name: tool.name,
    official_handle: tool.officialHandle,
    x_user_id: "",
    followers_count: 0,
    tweet_count: 0,
    official_posts_collected: 0,
    handle_mentions_collected: 0,
    profile_page_status: "",
    search_page_status: "",
    official_posts_visible: "false",
    handle_mentions_visible: "false",
    errors: ""
  };
}

async function pageStatus(page, tweets) {
  const loginWall = await isLoginWall(page);
  const articleCount = await page.locator('article[data-testid="tweet"], [data-testid="cellInnerDiv"]').count().catch(() => 0);
  return statusForPage({ loginWall, articleCount, visibleCount: tweets.length });
}

function statusForPage({ loginWall, articleCount, visibleCount }) {
  if (visibleCount > 0) return loginWall ? "visible_posts_with_signup_prompt" : "visible_posts";
  if (articleCount > 0) return loginWall ? "visible_containers_unparsed_with_signup_prompt" : "visible_containers_unparsed";
  return loginWall ? "no_public_posts_visible_signup_prompt" : "no_public_posts_visible";
}

function eventKey(event) {
  return `${event.xPostId}:${event.toolId}:${event.eventType}`;
}

function dedupeSnapshots(snapshots) {
  const byKey = new Map();
  for (const snapshot of snapshots) byKey.set(`${snapshot.toolId}:${snapshot.xUserId}:${snapshot.collectedAt}`, snapshot);
  return [...byKey.values()].sort((a, b) => `${a.toolSlug}:${a.collectedAt}`.localeCompare(`${b.toolSlug}:${b.collectedAt}`));
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

function handleFromXUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["x.com", "twitter.com", "www.x.com", "www.twitter.com"].includes(parsed.hostname.toLowerCase())) return "";
    return parsed.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
  } catch {
    return "";
  }
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

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function csvEscape(value) {
  const string = String(value);
  if (!/[",\n\r]/.test(string)) return string;
  return `"${string.replace(/"/g, "\"\"")}"`;
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relative(filePath) {
  return path.relative(projectRoot, filePath);
}
