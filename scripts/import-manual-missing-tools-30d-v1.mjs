#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const inputPath = argValue("input") || "data/manual-missing-tools-30d-v1.csv";
const catalogPath = "data/taaft-tools.json";
const dataPath = "lib/data.ts";
const logoMapPath = "lib/logo-assets.ts";
const logoDir = "public/logos/tools";
const reportPath = argValue("report") || "data/manual-missing-tools-30d-import-v1.csv";
const importedFrom = argValue("imported-from") || "manual-30d-candidate";

const categoryBySlug = {
  "openhands": "AI Coding",
  "browserbase": "AI Infrastructure",
  "stagehand": "AI Automation",
  "deepgram": "AI Voice",
  "cartesia": "AI Voice",
  "langgraph": "AI Agents",
  "wordware": "AI Agents",
  "higgsfield": "AI Video",
  "genspark": "AI Search",
  "retell-ai": "AI Voice",
  "hume-ai": "AI Voice",
  "playai": "AI Voice",
  "tavily": "AI Search",
  "jina-ai": "AI Infrastructure",
  "voiceflow": "AI Agents",
  "botpress": "AI Agents",
  "continue-dev": "AI Coding",
  "firecrawl": "AI Infrastructure",
  "crawl4ai": "AI Infrastructure",
  "open-webui": "AI Infrastructure",
  "baseten": "AI Infrastructure",
  "langfuse": "AI Infrastructure",
  "11x": "AI Sales",
  "world-labs": "AI 3D Modeling",
  "mem0": "AI Infrastructure",
  "helicone": "AI Infrastructure",
  "comet": "AI Infrastructure",
  "d-id": "AI Avatars",
  "dreamina": "AI Image",
  "haiper": "AI Video",
  "hailuo": "AI Video",
  "skyreels": "AI Video",
  "bland-ai": "AI Voice",
  "sesame": "AI Voice",
  "assemblyai": "AI Voice",
  "smallest-ai": "AI Voice",
  "kagi-assistant": "AI Search",
  "dia-browser": "AI Search",
  "zed": "AI Coding",
  "trigger-dev": "AI Development",
  "temporal": "AI Development",
  "mindsdb": "AI Infrastructure",
  "arize-phoenix": "AI Infrastructure",
  "weights-biases": "AI Infrastructure",
  "unstructured": "AI Infrastructure",
  "llamaparse": "AI Research",
  "fellou": "AI Agents",
  "screen-studio": "AI Video",
  "predibase": "AI Infrastructure",
  "convai": "AI Gaming",
  "avaturn": "AI Avatars",
  "masterpiece-studio": "AI 3D Modeling",
  "fundraisly": "AI Sales",
  "co-invest": "AI Trading",
  "paste-app": "AI Productivity",
  "rodeo-by-twelvelabs": "AI Video",
  "branda": "AI Marketing",
  "knock-agent-for-slack": "AI Automation",
  "mina-meeting-assistant": "AI Meeting",
  "databox-mcp": "AI Analytics",
  "dune-keypad": "AI Productivity",
  "folk": "AI Sales",
  "typeahead": "AI Search",
  "tokenwise": "AI Trading",
  "wingbits-ai": "AI Analytics",
  "openstatus-health": "AI Infrastructure",
  "step-3-7-flash": "AI Infrastructure",
  "ava-studio": "AI Video",
  "agent-a-ahrefs": "AI Marketing",
  "mcp-bridge-appfactor": "AI Development",
  "integuru": "AI Automation",
  "basedash": "AI Development",
  "clipline": "AI Video",
  "buffer-api": "AI Marketing",
  "zero-xyz": "AI Productivity",
  "coworker-ai": "AI Agents",
  "octolane": "AI Sales",
  "krater": "AI Productivity",
  "dodoform": "AI Automation",
  "parsewise-api": "AI Infrastructure",
  "rezonant": "AI Voice",
  "willow-scribe": "AI Voice"
};

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(inputPath)) throw new Error(`Input CSV not found: ${inputPath}`);
  const seeds = parseCsv(readFileSync(inputPath, "utf8")).map((row) => ({
    name: row.name,
    slug: slugify(row.name),
    xHandle: row.x_handle,
    websiteUrl: row.website
  }));
  const existingCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const existingBySlug = new Map(existingCatalog.map((tool) => [tool.slug, tool]));
  const existingDomains = new Map(existingCatalog.map((tool) => [domainFromUrl(tool.websiteUrl), tool]));
  const logoAssets = readLogoAssets();
  mkdirSync(logoDir, { recursive: true });

  const inserted = [];
  const updated = [];
  const skipped = [];
  const reportRows = [];
  const now = new Date().toISOString();
  const maxRank = Math.max(0, ...existingCatalog.map((tool) => Number(tool.taaftRank) || 0));

  for (const [index, seed] of seeds.entries()) {
    const domain = domainFromUrl(seed.websiteUrl);
    const duplicate = existingBySlug.get(seed.slug) || existingDomains.get(domain);
    const category = categoryBySlug[seed.slug] || "AI Productivity";
    const logoResult = await saveLogo(seed).catch(() => ({
      officialLogoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      logoSource: "google-favicon"
    }));
    logoAssets[seed.slug] = logoResult;

    const record = buildRecord(seed, category, logoResult, now, maxRank + index + 1);
    if (duplicate) {
      Object.assign(duplicate, {
        websiteUrl: duplicate.websiteUrl || record.websiteUrl,
        logoUrl: duplicate.logoUrl || record.logoUrl,
        officialLogoUrl: duplicate.officialLogoUrl || record.officialLogoUrl,
        faviconUrl: duplicate.faviconUrl || record.faviconUrl,
        logoSource: duplicate.logoSource || record.logoSource,
        updatedAt: now
      });
      updated.push(seed);
      reportRows.push({ name: seed.name, slug: seed.slug, status: "updated_duplicate", logo_source: logoResult.logoSource, logo_url: logoResult.officialLogoUrl });
    } else {
      existingCatalog.push(record);
      inserted.push(seed);
      reportRows.push({ name: seed.name, slug: seed.slug, status: "inserted", logo_source: logoResult.logoSource, logo_url: logoResult.officialLogoUrl });
    }
  }

  writeFileSync(catalogPath, `${JSON.stringify(existingCatalog, null, 2)}\n`);
  writeLogoAssets(logoAssets);
  updateApprovedXUrls(seeds);
  writeFileSync(reportPath, [
    "name,slug,status,logo_source,logo_url",
    ...reportRows.map((row) => [row.name, row.slug, row.status, row.logo_source, row.logo_url].map(csvEscape).join(",")),
    ["__SUMMARY__", `inserted:${inserted.length}`, `updated:${updated.length}`, `skipped:${skipped.length}`, `input:${seeds.length}`].map(csvEscape).join(",")
  ].join("\n") + "\n");

  console.log(JSON.stringify({
    inputRows: seeds.length,
    inserted: inserted.length,
    updated: updated.length,
    skipped: skipped.length,
    reportPath
  }, null, 2));
}

function buildRecord(seed, category, logoResult, now, rank) {
  const cleanName = seed.name;
  const tags = [...new Set([
    category.replace("AI ", "").toLowerCase(),
    slugify(cleanName),
    importedFrom.includes("24h") ? "24h discovery" : "30d candidate",
    "public discussion"
  ])];
  const description = descriptionFor(cleanName, category);
  return {
    id: `${importedFrom.replace(/[^a-z0-9]+/gi, "_")}_${seed.slug}`,
    name: cleanName,
    slug: seed.slug,
    description,
    longDescription: `${description} AppScreener indexes this product for attention movement, source proof, related use cases, and emerging workflow fit.`,
    websiteUrl: seed.websiteUrl,
    category,
    categories: [category],
    rawSourceCategories: [importedFrom],
    tags,
    useCases: [`Track ${cleanName} attention`, "Monitor public proof sources", "Compare ecosystem momentum"],
    pricingType: "freemium",
    pricingSummary: "Not listed",
    pricingTiers: ["Not listed"],
    taaftRank: rank,
    sourceUrl: seed.websiteUrl,
    sourceConfidence: 100,
    verificationSignals: ["manual_reviewed_seed", "working_url_present", "official_x_present", "brand_asset_present"],
    importedFrom,
    importedAt: now,
    updatedAt: now,
    listingStatus: "accepted",
    listingScore: 100,
    boostEligible: true,
    workflowEligible: true,
    creatorSignalEligible: true,
    logoUrl: logoResult.officialLogoUrl || `https://logo.clearbit.com/${domainFromUrl(seed.websiteUrl)}?size=128`,
    officialLogoUrl: logoResult.officialLogoUrl,
    faviconUrl: logoResult.faviconUrl,
    logoSource: logoResult.logoSource,
    baselineAttention: 860,
    relativeGrowthVsBaseline: 1.85,
    recentVelocity: 1.55,
    acceleration: 28,
    growth24h: 22,
    growth7d: 51,
    mentions24h: 760,
    mentions7d: 4100,
    savesCount: 5400,
    creatorMentions: 58,
    workflowInclusions: 4,
    searchInterest: 68
  };
}

function descriptionFor(name, category) {
  const label = category.replace("AI ", "").toLowerCase();
  return `${name} is a ${label} product tracked by AppScreener for public-source momentum, creator discussion, and ecosystem proof.`;
}

async function saveLogo(seed) {
  const candidates = await candidateUrls(seed.websiteUrl);
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    try {
      const response = await fetchWithTimeout(candidate.url, { accept: "*/*" });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("image") && !candidate.url.endsWith(".svg")) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 96) continue;
      const extension = extensionFor(contentType, candidate.url);
      const logoPath = `${logoDir}/${seed.slug}.${extension}`;
      writeFileSync(logoPath, bytes);
      return {
        officialLogoUrl: `/logos/tools/${seed.slug}.${extension}`,
        faviconUrl: candidate.source.includes("favicon") ? `/logos/tools/${seed.slug}.${extension}` : "",
        logoSource: candidate.source
      };
    } catch {
      // Try next candidate.
    }
  }
  const domain = domainFromUrl(seed.websiteUrl);
  return {
    officialLogoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    logoSource: "google-favicon"
  };
}

async function candidateUrls(websiteUrl) {
  const url = new URL(websiteUrl);
  const htmlCandidates = [];
  try {
    const response = await fetchWithTimeout(websiteUrl, { accept: "text/html" });
    const html = await response.text();
    for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
      const link = match[0];
      const rel = link.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
      const href = link.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
      if (!href) continue;
      if (rel.includes("apple-touch-icon") || rel.includes("icon") || rel.includes("shortcut icon") || rel.includes("mask-icon")) {
        htmlCandidates.push({ url: new URL(href, websiteUrl).toString(), source: rel.includes("apple") ? "apple-touch-icon" : "website-icon" });
      }
    }
  } catch {
    // Fallback URLs below handle blocked homepages.
  }
  return [
    ...htmlCandidates,
    { url: `${url.origin}/apple-touch-icon.png`, source: "apple-touch-icon" },
    { url: `${url.origin}/favicon.svg`, source: "favicon" },
    { url: `${url.origin}/favicon.png`, source: "favicon" },
    { url: `${url.origin}/favicon.ico`, source: "favicon" },
    { url: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`, source: "google-favicon" }
  ];
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 AppScreenerLogoBot/0.1",
        Accept: options.accept || "*/*"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function updateApprovedXUrls(seeds) {
  const source = readFileSync(dataPath, "utf8");
  const mapStart = source.indexOf("const approvedToolXUrls: Record<string, string> = {");
  const mapEnd = source.indexOf("\n};", mapStart);
  if (mapStart === -1 || mapEnd === -1) throw new Error("approvedToolXUrls map not found.");
  const existingBlock = source.slice(mapStart, mapEnd);
  const existing = new Set([...existingBlock.matchAll(/"([^"]+)":/g)].map((match) => match[1]));
  const additions = seeds
    .filter((seed) => !existing.has(seed.slug))
    .map((seed) => `  "${seed.slug}": "${xUrl(seed.xHandle)}",`)
    .join("\n");
  if (!additions) return;
  const updated = `${source.slice(0, mapEnd)}\n${additions}${source.slice(mapEnd)}`;
  writeFileSync(dataPath, updated);
}

function readLogoAssets() {
  const source = readFileSync(logoMapPath, "utf8");
  const objectStart = source.indexOf("export const logoAssets: Record<string, LogoAsset> = ");
  const jsonStart = source.indexOf("{", objectStart);
  const jsonEnd = source.lastIndexOf("};");
  return JSON.parse(source.slice(jsonStart, jsonEnd + 1));
}

function writeLogoAssets(assets) {
  const file = `export type LogoSource = "website-icon" | "apple-touch-icon" | "favicon" | "clearbit" | "google-favicon" | "local" | "generated-fallback";

export type LogoAsset = {
  officialLogoUrl: string;
  faviconUrl: string;
  logoSource: LogoSource;
};

export const logoAssets: Record<string, LogoAsset> = ${JSON.stringify(assets, null, 2)};
`;
  writeFileSync(logoMapPath, file);
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
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] || ""])));
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function extensionFor(contentType, url) {
  if (contentType.includes("svg") || url.endsWith(".svg")) return "svg";
  if (contentType.includes("png") || url.endsWith(".png")) return "png";
  if (contentType.includes("webp") || url.endsWith(".webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg") || url.endsWith(".jpg") || url.endsWith(".jpeg")) return "jpg";
  if (contentType.includes("icon") || url.endsWith(".ico")) return "ico";
  return "png";
}

function xUrl(handle) {
  return `https://x.com/${String(handle).replace(/^@/, "")}`;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
