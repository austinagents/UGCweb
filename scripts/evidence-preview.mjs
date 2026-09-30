const directoryDomains = ["producthunt.com", "g2.com", "capterra.com", "sourceforge.net", "alternativeto.net", "theresanaiforthat.com", "futurepedia.io", "aitools.fyi", "toolify.ai"];
const newsDomains = ["techcrunch.com", "theverge.com", "wired.com", "venturebeat.com", "forbes.com", "businessinsider.com", "cnbc.com", "bloomberg.com", "reuters.com", "axios.com", "fastcompany.com"];
const newsletterBlogDomains = ["substack.com", "medium.com", "beehiiv.com", "ghost.io"];

export async function enrichEvidenceRecords(records, options = {}) {
  const {
    concurrency = 4,
    dryRun = false,
    limit = 0,
    refresh = false,
    timeoutMs = 8000,
    toolSlug
  } = options;
  const now = new Date().toISOString();
  const targetIndexes = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => !toolSlug || record.toolSlug === toolSlug)
    .filter(({ record }) => refresh || !record.previewFetchedAt)
    .slice(0, limit > 0 ? limit : undefined);

  const report = {
    attempted: targetIndexes.length,
    enriched: 0,
    failed: 0,
    skipped: records.length - targetIndexes.length,
    failures: []
  };

  const nextRecords = [...records];
  await mapLimit(targetIndexes, concurrency, async ({ record, index }) => {
    const result = await enrichRecord(record, { now, timeoutMs });
    if (result.ok) {
      report.enriched += 1;
      if (!dryRun) nextRecords[index] = result.record;
    } else {
      report.failed += 1;
      report.failures.push({ sourceUrl: record.sourceUrl, reason: result.reason });
      if (!dryRun) nextRecords[index] = { ...record, previewFetchedAt: now, previewFetchError: result.reason };
    }
  });

  return {
    records: dedupeEvidenceRecords(nextRecords),
    report
  };
}

async function enrichRecord(record, { now, timeoutMs }) {
  const sourceUrl = record.sourceUrl;
  try {
    const sourceType = record.sourceType === "official" ? "official" : sourceTypeForUrl(sourceUrl);
    const [oembed, html] = await Promise.all([
      fetchOembed(sourceUrl, sourceType, timeoutMs).catch(() => null),
      fetchHtmlMetadata(sourceUrl, timeoutMs).catch(() => null)
    ]);
    const canonicalUrl = html?.canonicalUrl || oembed?.canonicalUrl || record.canonicalUrl || sourceUrl;
    const sourceTitle = firstText(oembed?.title, html?.title, record.sourceTitle);
    const sourceAuthor = firstText(oembed?.authorName, html?.author, record.sourceAuthor, record.platformLabel, platformLabelFor(sourceUrl, sourceType));
    const sourceImageUrl = absoluteUrl(firstText(oembed?.thumbnailUrl, html?.image, record.sourceImageUrl), canonicalUrl);
    const snippet = firstText(html?.description, record.snippet);
    const platformLabel = firstText(html?.siteName, record.platformLabel, platformLabelFor(sourceUrl, sourceType));

    return {
      ok: true,
      record: {
        ...record,
        sourceType,
        sourceTitle,
        sourceAuthor,
        sourceUrl,
        canonicalUrl,
        ...(sourceImageUrl ? { sourceImageUrl } : {}),
        snippet,
        platformLabel,
        previewFetchedAt: now,
        previewFetchError: undefined
      }
    };
  } catch (error) {
    return { ok: false, reason: error?.message || "preview fetch failed" };
  }
}

async function fetchOembed(sourceUrl, sourceType, timeoutMs) {
  const endpoint = oembedEndpoint(sourceUrl, sourceType);
  if (!endpoint) return null;
  const response = await fetchWithTimeout(endpoint, { headers: { Accept: "application/json" } }, timeoutMs);
  if (!response.ok) throw new Error(`oEmbed ${response.status}`);
  const json = await response.json();
  return {
    title: plain(json.title),
    authorName: plain(json.author_name || json.provider_name),
    thumbnailUrl: json.thumbnail_url,
    canonicalUrl: json.url || sourceUrl
  };
}

function oembedEndpoint(sourceUrl, sourceType) {
  if (sourceType === "youtube") {
    const url = new URL("https://www.youtube.com/oembed");
    url.searchParams.set("url", sourceUrl);
    url.searchParams.set("format", "json");
    return url.href;
  }
  if (sourceType === "x") {
    const url = new URL("https://publish.twitter.com/oembed");
    url.searchParams.set("url", sourceUrl);
    url.searchParams.set("omit_script", "1");
    return url.href;
  }
  return "";
}

async function fetchHtmlMetadata(sourceUrl, timeoutMs) {
  const response = await fetchWithTimeout(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 AppScreenerPreviewBot/1.0",
      Accept: "text/html,application/xhtml+xml"
    }
  }, timeoutMs);
  if (!response.ok) throw new Error(`HTML ${response.status}`);
  const html = await response.text();
  return {
    title: firstText(metaContent(html, "property", "og:title"), metaContent(html, "name", "twitter:title"), htmlTitle(html)),
    description: firstText(metaContent(html, "property", "og:description"), metaContent(html, "name", "twitter:description"), metaContent(html, "name", "description")),
    image: firstText(metaContent(html, "property", "og:image"), metaContent(html, "name", "twitter:image")),
    canonicalUrl: firstText(metaContent(html, "property", "og:url"), linkHref(html, "canonical"), sourceUrl),
    siteName: firstText(metaContent(html, "property", "og:site_name"), readableDomain(sourceUrl)),
    author: firstText(metaContent(html, "name", "author"), metaContent(html, "property", "article:author"))
  };
}

function metaContent(html, attribute, value) {
  const pattern = new RegExp(`<meta[^>]+${attribute}=["']${escapeRegExp(value)}["'][^>]*>`, "i");
  const match = html.match(pattern);
  return match ? attr(match[0], "content") : "";
}

function linkHref(html, rel) {
  const pattern = new RegExp(`<link[^>]+rel=["'][^"']*${escapeRegExp(rel)}[^"']*["'][^>]*>`, "i");
  const match = html.match(pattern);
  return match ? attr(match[0], "href") : "";
}

function htmlTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? plain(match[1]) : "";
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

async function fetchWithTimeout(url, options, timeoutMs) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function dedupeEvidenceRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.toolSlug}|${record.canonicalUrl || record.sourceUrl}`;
    byKey.set(key, { ...byKey.get(key), ...record });
  }
  return [...byKey.values()];
}

function sourceTypeForUrl(sourceUrl) {
  const domain = hostnameFor(sourceUrl);
  const path = pathFor(sourceUrl);
  const text = `${domain} ${path}`.toLowerCase();
  if (domain === "x.com" || domain.endsWith(".x.com") || domain === "twitter.com" || domain.endsWith(".twitter.com")) return "x";
  if (domain.includes("youtube.com") || domain === "youtu.be") return "youtube";
  if (domain.includes("github.com")) return "github";
  if (isDocsSource(domain, path)) return "docs";
  if (newsDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) return "news";
  if (newsletterBlogDomains.some((item) => domain === item || domain.endsWith(`.${item}`)) || /\b(blog|newsletter)\b/.test(text) || domain.startsWith("blog.")) return "newsletter_blog";
  if (directoryDomains.some((item) => domain === item || domain.endsWith(`.${item}`))) return "directory";
  if (isArticleLikePath(path)) return "article";
  return "other";
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

function isArticleLikePath(path) {
  return /\/(articles?|posts?|resources?|learn|academy|guides?|tutorials?|news|stories?|blog)\b/.test(path);
}

function readableDomain(sourceUrl) {
  const hostname = hostnameFor(sourceUrl);
  if (!hostname) return "Public web";
  return hostname.split(".").slice(-2, -1)[0]?.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || hostname;
}

function absoluteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function firstText(...values) {
  return values.map(plain).find(Boolean) || "";
}

function plain(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
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

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}
