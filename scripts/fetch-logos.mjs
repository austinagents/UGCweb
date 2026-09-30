import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "lib/data.ts");
const outputDir = path.join(root, "public/logos/tools");
const mapPath = path.join(root, "lib/logo-assets.ts");

const source = await fs.readFile(dataPath, "utf8");
const rawToolBlock = source.match(/const rawTools[\s\S]*?\n\] as const;/)?.[0] ?? "";
const toolMatches = [...rawToolBlock.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/g)];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const extensionFor = (contentType, url) => {
  if (contentType?.includes("svg") || url.endsWith(".svg")) return "svg";
  if (contentType?.includes("png") || url.endsWith(".png")) return "png";
  if (contentType?.includes("webp") || url.endsWith(".webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg") || url.endsWith(".jpg") || url.endsWith(".jpeg")) return "jpg";
  if (contentType?.includes("icon") || url.endsWith(".ico")) return "ico";
  return "png";
};

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 AppScreenerLogoBot/0.1",
        accept: options.accept ?? "*/*"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

async function candidateUrls(websiteUrl) {
  const url = new URL(websiteUrl);
  const origin = url.origin;
  const htmlCandidates = [];

  try {
    const response = await fetchWithTimeout(websiteUrl, { accept: "text/html" });
    const html = await response.text();
    const linkMatches = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
    for (const link of linkMatches) {
      const rel = link.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
      const href = link.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (!href) continue;
      if (rel.includes("apple-touch-icon") || rel.includes("icon") || rel.includes("shortcut icon") || rel.includes("mask-icon")) {
        const resolved = absoluteUrl(href, websiteUrl);
        if (resolved) htmlCandidates.push({ url: resolved, source: rel.includes("apple") ? "apple-touch-icon" : "website-icon" });
      }
    }
  } catch {
    // Some sites block HTML fetches; the fallback list below still handles them.
  }

  return [
    ...htmlCandidates,
    { url: `${origin}/apple-touch-icon.png`, source: "apple-touch-icon" },
    { url: `${origin}/favicon.svg`, source: "favicon" },
    { url: `${origin}/favicon.png`, source: "favicon" },
    { url: `${origin}/favicon.ico`, source: "favicon" },
    { url: `https://logo.clearbit.com/${url.hostname.replace(/^www\./, "")}?size=128`, source: "clearbit" },
    { url: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`, source: "google-favicon" }
  ];
}

async function saveLogo(tool) {
  const candidates = await candidateUrls(tool.websiteUrl);
  const seen = new Set();

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    try {
      const response = await fetchWithTimeout(candidate.url);
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("image") && !candidate.url.endsWith(".svg")) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 96) continue;
      const ext = extensionFor(contentType, candidate.url);
      const filename = `${tool.slug}.${ext}`;
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, bytes);
      return {
        officialLogoUrl: `/logos/tools/${filename}`,
        faviconUrl: candidate.source === "favicon" || candidate.source === "google-favicon" ? `/logos/tools/${filename}` : "",
        logoSource: candidate.source
      };
    } catch {
      // Try the next source.
    }
  }

  return {
    officialLogoUrl: "",
    faviconUrl: "",
    logoSource: "generated-fallback"
  };
}

await fs.mkdir(outputDir, { recursive: true });

const tools = toolMatches.map((match) => ({
  name: match[1],
  slug: slugify(match[1]),
  websiteUrl: match[2]
}));

const entries = {};
for (const tool of tools) {
  const result = await saveLogo(tool);
  entries[tool.slug] = result;
  console.log(`${tool.slug}: ${result.logoSource}${result.officialLogoUrl ? ` -> ${result.officialLogoUrl}` : ""}`);
}

const file = `export type LogoSource = "website-icon" | "apple-touch-icon" | "favicon" | "clearbit" | "google-favicon" | "local" | "generated-fallback";

export type LogoAsset = {
  officialLogoUrl: string;
  faviconUrl: string;
  logoSource: LogoSource;
};

export const logoAssets: Record<string, LogoAsset> = ${JSON.stringify(entries, null, 2)};
`;

await fs.writeFile(mapPath, file);
