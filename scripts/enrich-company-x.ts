import { existsSync, readFileSync, writeFileSync } from "node:fs";

type ToolInputRow = {
  name: string;
  slug: string;
  category: string;
  websiteUrl: string;
};

type EnrichedRow = ToolInputRow & {
  company_x_handle: string;
  company_x_url: string;
  source: string;
  evidence_url: string;
  confidence: string;
  notes: string;
};

type XCandidate = {
  handle: string;
  url: string;
  evidenceUrl: string;
};

const inputPath = argValue("--input") ?? "appscreener_tools_input.csv";
const outputPath = argValue("--output") ?? "appscreener_company_x_enriched.csv";
const limit = Number(argValue("--limit") ?? "0");
const requestDelayMs = Number(argValue("--delay-ms") ?? "900");
const requestTimeoutMs = Number(argValue("--timeout-ms") ?? "10000");

const ignoredXHandles = new Set([
  "download",
  "explore",
  "hashtag",
  "home",
  "i",
  "intent",
  "login",
  "messages",
  "notifications",
  "privacy",
  "search",
  "settings",
  "share",
  "signup",
  "tos"
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(inputPath)) {
    throw new Error(`Input CSV not found: ${inputPath}`);
  }

  const inputRows = parseCsv(readFileSync(inputPath, "utf8")).map(rowFromRecord);
  const rowsToProcess = limit > 0 ? inputRows.slice(0, limit) : inputRows;
  const outputRows: EnrichedRow[] = [];

  for (const [index, row] of rowsToProcess.entries()) {
    console.log(`[${index + 1}/${rowsToProcess.length}] ${row.name}`);
    const enriched = await enrichRow(row);
    outputRows.push(enriched);
    writeOutput(outputRows);
    await delay(requestDelayMs);
  }

  const found = outputRows.filter((row) => row.company_x_handle).length;
  console.log(`Done. Found ${found}; not found ${outputRows.length - found}. Output: ${outputPath}`);
}

async function enrichRow(row: ToolInputRow): Promise<EnrichedRow> {
  const official = await findFromOfficialWebsite(row);
  if (official) {
    return enriched(row, official, "official_website", "100", "");
  }

  const productHunt = await findFromProductHunt(row);
  if (productHunt) {
    return enriched(row, productHunt, "product_hunt", "90", "");
  }

  const taaft = await findFromTaaft(row);
  if (taaft) {
    return enriched(row, taaft, "taaft", "80", "");
  }

  return {
    ...row,
    company_x_handle: "",
    company_x_url: "",
    source: "",
    evidence_url: "",
    confidence: "0",
    notes: "No clear company X account found."
  };
}

async function findFromOfficialWebsite(row: ToolInputRow) {
  if (!row.websiteUrl) return null;
  const html = await fetchText(row.websiteUrl);
  if (!html) return null;
  return chooseCandidate(extractXCandidates(html, row.websiteUrl), row, row.websiteUrl);
}

async function findFromProductHunt(row: ToolInputRow) {
  const query = encodeURIComponent(`${row.name} ${domainFromUrl(row.websiteUrl)}`.trim());
  const searchUrl = `https://www.producthunt.com/search?q=${query}`;
  const searchHtml = await fetchText(searchUrl);
  if (!searchHtml) return null;

  const direct = chooseCandidate(extractXCandidates(searchHtml, searchUrl), row, searchUrl);
  if (direct) return direct;

  const productUrls = extractProductHuntProductUrls(searchHtml).slice(0, 3);
  for (const productUrl of productUrls) {
    await delay(requestDelayMs);
    const html = await fetchText(productUrl);
    if (!html) continue;
    const candidate = chooseCandidate(extractXCandidates(html, productUrl), row, productUrl);
    if (candidate) return candidate;
  }
  return null;
}

async function findFromTaaft(row: ToolInputRow) {
  const candidateUrls = [
    `https://theresanaiforthat.com/ai/${encodeURIComponent(row.slug)}/`,
    `https://theresanaiforthat.com/s/${encodeURIComponent(row.name)}/`
  ];

  for (const evidenceUrl of candidateUrls) {
    const html = await fetchText(evidenceUrl);
    if (!html) continue;
    const candidate = chooseCandidate(extractXCandidates(html, evidenceUrl), row, evidenceUrl);
    if (candidate) return candidate;
    await delay(requestDelayMs);
  }
  return null;
}

function chooseCandidate(candidates: XCandidate[], row: ToolInputRow, evidenceUrl: string): XCandidate | null {
  const unique = dedupeCandidates(candidates);
  if (!unique.length) return null;
  if (unique.length === 1) return { ...unique[0], evidenceUrl };

  const tokens = brandTokens(row);
  const matched = unique.filter((candidate) => tokens.some((token) => candidate.handle.toLowerCase().includes(token)));
  if (matched.length === 1) return { ...matched[0], evidenceUrl };

  return null;
}

function extractXCandidates(html: string, evidenceUrl: string): XCandidate[] {
  const candidates: XCandidate[] = [];
  const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);

  for (const match of linkMatches) {
    const href = decodeHtml(match[1]);
    const normalized = normalizeXUrl(href, evidenceUrl);
    if (normalized) candidates.push({ ...normalized, evidenceUrl });
  }

  return candidates;
}

function normalizeXUrl(rawHref: string, baseUrl: string): Pick<XCandidate, "handle" | "url"> | null {
  let parsed: URL;
  try {
    parsed = new URL(rawHref, baseUrl);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname !== "x.com" && hostname !== "twitter.com") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const handle = segments[0].replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return null;
  if (ignoredXHandles.has(handle.toLowerCase())) return null;
  if (segments[1]?.toLowerCase() === "status" || segments[1]?.toLowerCase() === "statuses") return null;

  return {
    handle,
    url: `https://x.com/${handle}`
  };
}

function extractProductHuntProductUrls(html: string) {
  const urls = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"']*\/products\/[^"']+)["']/gi)) {
    try {
      urls.add(new URL(decodeHtml(match[1]), "https://www.producthunt.com").toString());
    } catch {
      // Ignore malformed product links.
    }
  }
  return [...urls];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AppScreener company X enrichment/1.0",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function enriched(row: ToolInputRow, candidate: XCandidate, source: string, confidence: string, notes: string): EnrichedRow {
  return {
    ...row,
    company_x_handle: candidate.handle,
    company_x_url: candidate.url,
    source,
    evidence_url: candidate.evidenceUrl,
    confidence,
    notes
  };
}

function writeOutput(rows: EnrichedRow[]) {
  const headers = ["name", "slug", "category", "websiteUrl", "company_x_handle", "company_x_url", "source", "evidence_url", "confidence", "notes"];
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => csv(row[header as keyof EnrichedRow])).join(","))];
  writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

function rowFromRecord(record: Record<string, string>): ToolInputRow {
  return {
    name: record.name ?? "",
    slug: record.slug ?? "",
    category: record.category ?? "",
    websiteUrl: record.websiteUrl ?? ""
  };
}

function parseCsv(input: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
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
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""])));
}

function brandTokens(row: ToolInputRow) {
  const domain = domainFromUrl(row.websiteUrl).split(".")[0] ?? "";
  return [...new Set(`${row.name} ${row.slug} ${domain}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3))];
}

function dedupeCandidates(candidates: XCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.handle.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function csv(value: string) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function argValue(name: string) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg === name) return "true";
  return arg.slice(name.length + 1);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
