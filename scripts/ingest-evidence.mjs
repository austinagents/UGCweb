#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { enrichEvidenceRecords } from "./evidence-preview.mjs";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const evidencePath = path.join(projectRoot, "data/tool-evidence-sources.json");

require.extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: filename
  });
  module._compile(output.outputText, filename);
};

const {
  microWorkflowToolRelationships,
  tools,
  workflowToolRelationships,
  workflows
} = require(path.join(projectRoot, "lib/data.ts"));

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const searxngBaseUrl = process.env.SEARXNG_BASE_URL;
const onlyTool = argValue("tool");
const sourceFilter = argValue("source");
const limit = Number(argValue("limit") ?? process.env.EVIDENCE_RECORD_LIMIT ?? 0);
const maxResultsPerQuery = Number(argValue("results") ?? process.env.EVIDENCE_RESULTS_PER_QUERY ?? 8);
const queryLimit = Number(argValue("query-limit") ?? process.env.EVIDENCE_QUERY_LIMIT ?? 0);
const maxTools = Number(argValue("max-tools") ?? process.env.EVIDENCE_MAX_TOOLS ?? 0);
const requestTimeoutMs = Number(argValue("timeout-ms") ?? process.env.EVIDENCE_REQUEST_TIMEOUT_MS ?? 8000);
const queryConcurrency = Number(argValue("concurrency") ?? process.env.EVIDENCE_QUERY_CONCURRENCY ?? 3);
const previewConcurrency = Number(process.env.EVIDENCE_PREVIEW_CONCURRENCY ?? 4);
const relationshipOnly = hasFlag("relationship-only");
const toolOnly = hasFlag("tool-only");
const refresh = hasFlag("refresh");
const dryRun = hasFlag("dry-run");
const debug = hasFlag("debug") || process.env.DEBUG_EVIDENCE === "1";
const now = new Date().toISOString();

const sourcePriority = {
  x: 1,
  youtube: 2,
  github: 3,
  docs: 4,
  official: 5,
  news: 6,
  newsletter_blog: 7,
  article: 8,
  directory: 9,
  other: 10
};

const rejectionTerms = [
  "vs",
  "versus",
  "comparison",
  "compare",
  "alternatives",
  "alternative to",
  "replacement for",
  "competitor",
  "which should you choose",
  "which is better",
  "top ai tools",
  "best ai tools",
  "50 ai tools",
  "100 ai tools",
  "must have ai tools",
  "ultimate ai tools list",
  "ai tools directory"
];

const rejectionPatterns = rejectionTerms.map((term) => new RegExp(`\\b${escapeRegExp(term).replace(/\\ /g, "\\s+")}\\b`, "i"));
const blockedSourceDomains = ["producthunt.com"];
const directoryDomains = ["g2.com", "capterra.com", "sourceforge.net", "alternativeto.net", "theresanaiforthat.com", "futurepedia.io", "aitools.fyi", "toolify.ai"];
const newsDomains = ["techcrunch.com", "theverge.com", "wired.com", "venturebeat.com", "forbes.com", "businessinsider.com", "cnbc.com", "bloomberg.com", "reuters.com", "axios.com", "fastcompany.com"];
const newsletterBlogDomains = ["substack.com", "medium.com", "beehiiv.com", "ghost.io"];
const officialDomainOverrides = {
  chatgpt: ["openai.com"],
  claude: ["anthropic.com", "claude.ai"],
  perplexity: ["perplexity.ai"],
  lovable: ["lovable.dev"],
  bolt: ["bolt.new", "stackblitz.com"]
};
const publicTools = tools.filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed);
const toolBySlug = new Map(tools.map((tool) => [tool.slug, tool]));
const toolByKey = new Map(publicTools.flatMap((tool) => toolKeys(tool).map((key) => [key, tool])));
const workflowBySlug = new Map(workflows.map((workflow) => [workflow.slug, workflow]));

function readExistingEvidence() {
  if (!fs.existsSync(evidencePath)) return [];
  const raw = fs.readFileSync(evidencePath, "utf8").trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeEvidence(records) {
  const sorted = [...records].sort((a, b) => {
    const priority = (sourcePriority[a.sourceType] ?? 99) - (sourcePriority[b.sourceType] ?? 99);
    if (priority) return priority;
    return String(b.detectedAt).localeCompare(String(a.detectedAt));
  });
  fs.writeFileSync(evidencePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

function quoted(value) {
  return `"${value}"`;
}

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function plain(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function containsRejectedNoise(text) {
  return rejectionPatterns.some((pattern) => pattern.test(text));
}

function debugLog(...values) {
  if (debug) console.log(...values);
}

function toolKeys(tool) {
  return [tool.name, tool.slug, ...(tool.aliases ?? [])].filter(Boolean).map(compact);
}

function hasToolMention(text, tool) {
  const haystack = compact(text);
  return toolKeys(tool).some((key) => key.length > 2 && haystack.includes(key));
}

function matchedToolsFor(text, candidates = publicTools) {
  return candidates
    .filter((tool) => hasToolMention(text, tool))
    .map((tool) => ({ slug: tool.slug, name: tool.name }));
}

function evidenceId(toolSlug, sourceUrl) {
  return `evidence_${crypto.createHash("sha1").update(`${toolSlug}|${sourceUrl}`).digest("hex").slice(0, 16)}`;
}

function inferWorkflowSlug(matchedToolSlugs) {
  let best = null;
  for (const workflow of workflows) {
    const overlap = workflow.toolSlugs.filter((slug) => matchedToolSlugs.includes(slug)).length;
    if (overlap >= 2 && (!best || overlap > best.overlap)) best = { workflow, overlap };
  }
  return best?.workflow.slug;
}

function sourceTypeForUrl(sourceUrl, tool) {
  const domain = hostnameFor(sourceUrl);
  const path = pathFor(sourceUrl);
  const text = `${domain} ${path}`.toLowerCase();
  if (domain === "x.com" || domain.endsWith(".x.com") || domain === "twitter.com" || domain.endsWith(".twitter.com")) return "x";
  if (domain.includes("youtube.com") || domain === "youtu.be") return "youtube";
  if (domain.includes("github.com")) return "github";
  if (isDocsSource(domain, path)) return "docs";
  if (tool && isOfficialToolSource(domain, tool)) return "official";
  if (newsDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) return "news";
  if (newsletterBlogDomains.some((item) => domain === item || domain.endsWith(`.${item}`)) || /\b(blog|newsletter)\b/.test(text) || domain.startsWith("blog.")) return "newsletter_blog";
  if (directoryDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) return "directory";
  if (isArticleLikePath(path)) return "article";
  return "other";
}

function isSourceAllowed(sourceUrl) {
  return !sourceFilter || sourceTypeForUrl(sourceUrl) === sourceFilter;
}

function platformLabelFor(sourceUrl, sourceType) {
  if (sourceType === "x") return "X";
  if (sourceType === "youtube") return "YouTube";
  if (sourceType === "github") return "GitHub";
  if (sourceType === "docs") return "Docs";
  if (sourceType === "official") return "Official";
  if (sourceType === "news") return "News";
  if (sourceType === "newsletter_blog") return "Newsletter / Blog";
  if (sourceType === "directory") return "Directory";
  return readableDomain(sourceUrl);
}

function sourceAuthorFor(sourceUrl) {
  const sourceType = sourceTypeForUrl(sourceUrl);
  if (sourceType === "github") return "GitHub";
  if (sourceType === "youtube") return "YouTube";
  if (sourceType === "x") return "X";
  return readableDomain(sourceUrl);
}

function hostnameFor(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function pathFor(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    return `${url.pathname} ${url.search}`.toLowerCase();
  } catch {
    return "";
  }
}

function rootDomain(domain) {
  const parts = domain.split(".").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join(".") : domain;
}

function isDocsSource(domain, path) {
  const text = `${domain} ${path}`.toLowerCase();
  return domain.startsWith("docs.") ||
    domain.startsWith("developer.") ||
    domain.startsWith("developers.") ||
    text.includes("devdocs") ||
    text.includes("/docs") ||
    text.includes("api-reference") ||
    text.includes("api_reference") ||
    text.includes("api reference") ||
    text.includes("documentation");
}

function isOfficialToolSource(domain, tool) {
  const domains = new Set([
    rootDomain(hostnameFor(tool.websiteUrl)),
    ...(officialDomainOverrides[tool.slug] ?? [])
  ].filter(Boolean));
  return [...domains].some((item) => domain === item || domain.endsWith(`.${item}`));
}

function isArticleLikePath(path) {
  return /\/(articles?|posts?|resources?|learn|academy|guides?|tutorials?|news|stories?|blog)\b/.test(path);
}

function isBlockedSource(sourceUrl) {
  const domain = hostnameFor(sourceUrl);
  return blockedSourceDomains.some((item) => domain === item || domain.endsWith(`.${item}`));
}

function readableDomain(sourceUrl) {
  const hostname = hostnameFor(sourceUrl);
  if (!hostname) return "Public web";
  return hostname.split(".").slice(-2, -1)[0]?.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || hostname;
}

function publishedAtFromSnippet(snippet) {
  const match = String(snippet ?? "").match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i);
  return match?.[0];
}

function youtubeImageFor(sourceUrl) {
  const videoId = youtubeVideoId(sourceUrl);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;
}

function youtubeVideoId(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || undefined;
  } catch {
    return undefined;
  }
  return undefined;
}

function sourceFromResult(result) {
  const sourceType = sourceTypeForUrl(result.url);
  return {
    sourceType,
    sourceTitle: plain(result.title),
    sourceAuthor: plain(result.sourceAuthor || sourceAuthorFor(result.url)),
    sourceUrl: result.url,
    sourceImageUrl: result.sourceImageUrl || youtubeImageFor(result.url),
    sourcePublishedAt: result.sourcePublishedAt || publishedAtFromSnippet(result.snippet),
    snippet: plain(result.snippet),
    platformLabel: result.platformLabel || platformLabelFor(result.url, sourceType)
  };
}

function buildEvidenceRecord(tool, source, matched, workflowSlug) {
  const workflow = workflowSlug ? workflowBySlug.get(workflowSlug) : undefined;
  const sourceType = sourceTypeForUrl(source.sourceUrl, tool);
  return {
    id: evidenceId(tool.slug, source.sourceUrl),
    toolId: tool.id,
    toolSlug: tool.slug,
    ...(workflowSlug ? { workflowId: workflow?.id, workflowSlug } : {}),
    sourceType,
    sourceTitle: source.sourceTitle,
    sourceAuthor: source.sourceAuthor,
    sourceUrl: source.sourceUrl,
    ...(source.sourceImageUrl ? { sourceImageUrl: source.sourceImageUrl } : {}),
    ...(source.sourcePublishedAt ? { sourcePublishedAt: source.sourcePublishedAt } : {}),
    detectedAt: now,
    matchedTools: matched.map((item) => item.name),
    snippet: source.snippet,
    platformLabel: platformLabelFor(source.sourceUrl, sourceType)
  };
}

function relationshipRecordsFromResult(result, expectedTools) {
  const source = sourceFromResult(result);
  const text = plain(`${source.sourceTitle} ${source.snippet} ${source.sourceUrl}`);
  if (!source.sourceUrl) return { records: [], rejected: "missing url" };
  if (isBlockedSource(source.sourceUrl)) return { records: [], rejected: "blocked source domain" };
  if (containsRejectedNoise(text)) return { records: [], rejected: "comparison/listicle noise" };

  const matched = matchedToolsFor(text, expectedTools);
  if (matched.length < 2) return { records: [], rejected: "fewer than 2 matched tools" };

  const workflowSlug = inferWorkflowSlug(matched.map((item) => item.slug));
  return {
    records: matched.map((matchedTool) => buildEvidenceRecord(toolBySlug.get(matchedTool.slug), source, matched, workflowSlug)),
    rejected: ""
  };
}

function toolRecordFromResult(result, tool) {
  const source = sourceFromResult(result);
  const text = plain(`${source.sourceTitle} ${source.snippet} ${source.sourceUrl}`);
  if (!source.sourceUrl) return { record: null, rejected: "missing url" };
  if (isBlockedSource(source.sourceUrl)) return { record: null, rejected: "blocked source domain" };
  if (containsRejectedNoise(text)) return { record: null, rejected: "comparison/listicle noise" };
  if (!hasToolMention(text, tool)) return { record: null, rejected: "tool not mentioned" };

  return {
    record: buildEvidenceRecord(tool, source, [{ slug: tool.slug, name: tool.name }], undefined),
    rejected: ""
  };
}

function relationshipQueryJobs() {
  const jobs = [];
  const validationStacks = [
    ["Claude", "n8n"],
    ["Cursor", "Supabase", "Vercel"],
    ["ChatGPT", "ElevenLabs", "HeyGen"]
  ];

  for (const names of validationStacks) {
    const expectedTools = names.map((name) => toolByKey.get(compact(name))).filter(Boolean);
    if (expectedTools.length < 2) continue;
    jobs.push({
      kind: "relationship",
      query: names.map(quoted).join(" "),
      expectedTools
    });
  }

  for (const workflow of workflows) {
    const stack = workflow.toolSlugs.map((slug) => toolBySlug.get(slug)).filter(Boolean);
    if (stack.length < 2) continue;
    jobs.push({
      kind: "relationship",
      query: stack.slice(0, 4).map((tool) => quoted(tool.name)).join(" "),
      expectedTools: stack,
      workflowSlug: workflow.slug
    });
  }

  const microGroups = new Map();
  for (const edge of microWorkflowToolRelationships) {
    if (edge.status !== "accepted") continue;
    const tool = toolBySlug.get(edge.toolSlug);
    if (!tool) continue;
    const current = microGroups.get(edge.microWorkflowSlug) ?? [];
    current.push(tool);
    microGroups.set(edge.microWorkflowSlug, current);
  }
  for (const [microWorkflowSlug, stack] of microGroups) {
    if (stack.length < 2) continue;
    jobs.push({
      kind: "relationship",
      query: stack.slice(0, 4).map((tool) => quoted(tool.name)).join(" "),
      expectedTools: stack,
      microWorkflowSlug
    });
  }

  for (const tool of publicTools) {
    for (const relatedSlug of tool.relatedTools ?? []) {
      const related = toolBySlug.get(relatedSlug);
      if (!related) continue;
      jobs.push({
        kind: "relationship",
        query: `${quoted(tool.name)} ${quoted(related.name)}`,
        expectedTools: [tool, related]
      });
    }
  }

  return dedupeJobs(jobs);
}

function xQueryJobs() {
  const stacks = [
    ["ChatGPT", "ElevenLabs", "HeyGen"],
    ["Claude", "n8n"]
  ];
  return stacks.flatMap((names) => {
    const expectedTools = names.map((name) => toolByKey.get(compact(name))).filter(Boolean);
    if (onlyTool && !expectedTools.some((tool) => tool.slug === onlyTool || compact(tool.name) === compact(onlyTool))) return [];
    if (expectedTools.length < 2) return [];
    return ["x.com", "twitter.com"].map((domain) => ({
      kind: "relationship",
      query: `site:${domain} ${names.map(quoted).join(" ")}`,
      expectedTools,
      sourceProbe: "x"
    }));
  });
}

function toolQueryJobs() {
  const selectedTools = onlyTool
    ? publicTools.filter((tool) => tool.slug === onlyTool || compact(tool.name) === compact(onlyTool))
    : publicTools;
  const selected = maxTools > 0 ? selectedTools.slice(0, maxTools) : selectedTools;
  const exclusions = "-login -status -download -docs -documentation";
  return selected.flatMap((tool) => {
    const toolNames = uniqueBy([tool.name, ...(tool.aliases ?? [])].filter(Boolean), compact).slice(0, 3);
    const queries = [
      ...toolNames.flatMap((name) => [
        `site:x.com ${quoted(name)}`,
        `site:twitter.com ${quoted(name)}`,
        `site:youtube.com ${quoted(name)} tutorial`,
        `site:youtube.com ${quoted(name)} review`,
        `site:youtube.com ${quoted(name)} workflow`,
        `site:github.com ${quoted(name)}`,
        `${quoted(name)} tutorial ${exclusions}`,
        `${quoted(name)} review ${exclusions}`,
        `${quoted(name)} workflow ${exclusions}`,
        `${quoted(name)} "use case" ${exclusions}`,
        `${quoted(name)} github ${exclusions}`,
        `${quoted(name)} youtube ${exclusions}`
      ])
    ];
    const selectedQueries = queryLimit > 0 ? uniqueBy(queries, (query) => query).slice(0, queryLimit) : uniqueBy(queries, (query) => query);
    return selectedQueries.map((query) => ({
      kind: "tool",
      query,
      tool
    }));
  });
}

function scopedJobs(jobs) {
  let selected = jobs;
  if (onlyTool) {
    const tool = publicTools.find((item) => item.slug === onlyTool || compact(item.name) === compact(onlyTool));
    selected = tool
      ? jobs.filter((job) => job.kind === "tool" ? job.tool.slug === tool.slug : job.expectedTools.some((item) => item.slug === tool.slug))
      : [];
  }
  if (selected.every((job) => job.kind === "tool")) return selected;
  return queryLimit > 0 ? selected.slice(0, queryLimit) : selected;
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.kind}|${job.query}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searxngSearch(query) {
  if (!searxngBaseUrl) {
    throw new Error("SEARXNG_BASE_URL missing. Start SearXNG or configure search provider.");
  }
  const searchUrl = new URL("/search", searxngBaseUrl);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("language", "en");
  debugLog("SEARXNG_BASE_URL", searxngBaseUrl);
  debugLog("finalSearchUrl", searchUrl.href);

  const response = await fetchWithRetry(searchUrl.href, {
    headers: { Accept: "application/json" }
  });
  debugLog("response.status", response.status);
  if (response.status === 403) return searxngHtmlSearch(query);
  if (!response.ok) throw new Error(`SearXNG ${response.status} ${response.statusText}`);
  const json = await response.json();
  const results = Array.isArray(json.results) ? json.results : [];
  return uniqueBy(results.map((item) => ({
    title: plain(item.title),
    url: item.url,
    snippet: plain(item.content || item.snippet || ""),
    domain: item.parsed_url?.[1] || hostnameFor(item.url),
    sourceImageUrl: item.img_src,
    sourcePublishedAt: item.publishedDate,
    platformLabel: item.engine ? plain(item.engine) : undefined
  })).filter((item) => item.title && item.url), (item) => item.url).slice(0, maxResultsPerQuery);
}

async function searxngHtmlSearch(query) {
  const searchUrl = new URL("/search", searxngBaseUrl);
  const body = new URLSearchParams({
    q: query,
    language: "en",
    safesearch: "0"
  });
  debugLog("finalSearchUrl", searchUrl.href);
  const response = await fetchWithRetry(searchUrl.href, {
    method: "POST",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 AppScreenerEvidenceBot/1.0"
    },
    body
  });
  debugLog("response.status", response.status);
  if (!response.ok) throw new Error(`SearXNG HTML ${response.status} ${response.statusText}`);
  return parseSearxngHtmlResults(await response.text()).slice(0, maxResultsPerQuery);
}

function parseSearxngHtmlResults(html) {
  const results = [];
  const blocks = html.match(/<article class="result[\s\S]*?<\/article>/g) ?? [];

  for (const block of blocks) {
    const linkMatch = block.match(/<h3>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<p class="content">\s*([\s\S]*?)<\/p>/i);
    const url = decodeHtml(linkMatch[1]);
    const title = plain(linkMatch[2]);
    const snippet = plain(snippetMatch?.[1] ?? "");
    if (!url || !title) continue;
    results.push({
      title,
      url,
      snippet,
      domain: hostnameFor(url)
    });
  }

  return uniqueBy(results, (item) => item.url);
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      debugLog("fetch.exception", error?.name || "Error", error?.message || String(error));
      lastError = error;
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function runJob(job) {
  const results = await searxngSearch(job.query);
  const records = [];
  const rejected = [];
  const xRawResults = results.filter((result) => sourceTypeForUrl(result.url) === "x").length;

  for (const result of results) {
    if (!isSourceAllowed(result.url)) {
      rejected.push({ reason: "source filtered out", url: result.url, sourceType: sourceTypeForUrl(result.url) });
      continue;
    }
    if (job.kind === "relationship") {
      const outcome = relationshipRecordsFromResult(result, job.expectedTools);
      if (outcome.records.length) records.push(...outcome.records);
      else rejected.push({ reason: outcome.rejected, url: result.url, sourceType: sourceTypeForUrl(result.url) });
    } else {
      const outcome = toolRecordFromResult(result, job.tool);
      if (outcome.record) records.push(outcome.record);
      else rejected.push({ reason: outcome.rejected, url: result.url, sourceType: sourceTypeForUrl(result.url) });
    }
  }

  return {
    job,
    resultsReturned: results.length,
    xRawResults,
    records,
    rejected
  };
}

async function runJobSafely(job) {
  try {
    return await runJob(job);
  } catch (error) {
    return {
      job,
      resultsReturned: 0,
      xRawResults: 0,
      records: [],
      rejected: [{
        reason: `search failed: ${error?.message || String(error)}`,
        url: "",
        sourceType: "other"
      }]
    };
  }
}

async function main() {
  if (!searxngBaseUrl) {
    console.error("SEARXNG_BASE_URL missing. Start SearXNG or configure search provider.");
    process.exit(1);
  }

  const relationshipJobs = toolOnly ? [] : sourceFilter === "x" ? scopedJobs(xQueryJobs()) : scopedJobs(relationshipQueryJobs());
  const toolJobs = relationshipOnly || sourceFilter === "x" ? [] : scopedJobs(toolQueryJobs());
  const jobs = [...relationshipJobs, ...toolJobs];
  const existing = readExistingEvidence();
  const byKey = new Map(existing.map((record) => [`${record.toolSlug}|${record.canonicalUrl || record.sourceUrl}`, record]));
  const added = [];
  const rejected = [];
  const queryReports = [];

  const jobResults = await mapLimit(jobs, queryConcurrency, runJobSafely);
  for (const result of jobResults) {
    queryReports.push({
      kind: result.job.kind,
      query: result.job.query,
      resultsReturned: result.resultsReturned,
      xRawResults: result.xRawResults,
      recordsAccepted: result.records.length,
      recordsRejected: result.rejected.length
    });
    rejected.push(...result.rejected.map((item) => ({ query: result.job.query, ...item })));

    for (const record of result.records) {
      const key = `${record.toolSlug}|${record.sourceUrl}`;
      if (!refresh && byKey.has(key)) continue;
      if (!byKey.has(key)) added.push(record);
      byKey.set(key, { ...byKey.get(key), ...record });
      if (limit > 0 && added.length >= limit) break;
    }
    if (limit > 0 && added.length >= limit) break;
  }

  const recordsBeforeEnrichment = [...byKey.values()];
  const enriched = await enrichEvidenceRecords(recordsBeforeEnrichment, {
    concurrency: previewConcurrency,
    dryRun,
    refresh,
    timeoutMs: requestTimeoutMs,
    toolSlug: onlyTool
  });

  const finalRecords = enriched.records;
  if (!dryRun) writeEvidence(finalRecords);

  const toolsPopulated = new Set(finalRecords.map((record) => record.toolSlug));
  const rejectionReasons = countBy(rejected.map((item) => item.reason || "unknown"));
  const rawXResultsFound = queryReports.reduce((sum, report) => sum + report.xRawResults, 0);
  const xResultsAccepted = added.filter((record) => record.sourceType === "x").length;
  const xRejected = rejected.filter((item) => item.sourceType === "x" || sourceTypeForUrl(item.url || "") === "x");
  const xRejectionReasons = countBy(xRejected.map((item) => item.reason || "unknown"));
  const sampleRecords = added.slice(0, 8).map((record) => ({
    toolSlug: record.toolSlug,
    sourceType: record.sourceType,
    sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl,
    matchedTools: record.matchedTools
  }));

  console.log(JSON.stringify({
    storage: path.relative(projectRoot, evidencePath),
    searchProvider: "SearXNG",
    searxngBaseUrl,
    apiKeysRequired: false,
    searxngHtmlParsingSupported: true,
    json403FallsBackToHtml: true,
    relationshipQueriesRun: relationshipJobs.length,
    toolQueriesRun: toolJobs.length,
    relationshipQueriesFirst: true,
    resultsReturned: queryReports.reduce((sum, report) => sum + report.resultsReturned, 0),
    recordsAccepted: added.length,
    recordsRejected: rejected.length,
    rejectionReasons: Object.fromEntries(rejectionReasons),
    queries: queryReports.map((report) => ({
      query: report.query,
      resultsReturned: report.resultsReturned,
      recordsAccepted: report.recordsAccepted,
      recordsRejected: report.recordsRejected,
      rejectionReasons: Object.fromEntries(countBy(rejected.filter((item) => item.query === report.query).map((item) => item.reason || "unknown")))
    })),
    xDebug: {
      rawXResultsFound,
      xResultsAccepted,
      xResultsRejected: xRejected.length,
      rejectionReasons: Object.fromEntries(xRejectionReasons)
    },
    toolsPopulated: [...toolsPopulated],
    sampleRecords,
    previewEnrichment: enriched.report,
    dryRun,
    message: "Evidence ingestion completed with real SearXNG search result records only."
  }, null, 2));
}

function countBy(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, "\"")
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&middot;/g, "·")
    .replace(/&#0183;|&#183;/g, "·")
    .replace(/&#32;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function mapLimit(items, limitValue, fn) {
  const queue = [...items];
  const results = [];
  const workers = Array.from({ length: Math.max(1, limitValue) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return results;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
