import fs from "node:fs";
import path from "node:path";

const crawlRoot = "/Users/austin/Documents/Codex/2026-10-06/we-just-changed-our-tiktok-shop/outputs/storefront-enrichment-production-148198/shops";
const terms = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/commerce-heatmap-affinity-terms.json"), "utf8"));
const matchers = Object.fromEntries(Object.entries(terms).map(([category, values]) => [category, values.map((value) => phraseMatcher(value))]));
const matches = Object.fromEntries(Object.keys(terms).map((category) => [category, new Set()]));
const entries = fs.readdirSync(crawlRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());

let scannedShops = 0;
let scannedProducts = 0;
for (const entry of entries) {
  const source = path.join(crawlRoot, entry.name, "parsed", "modern-router-data.json");
  if (!fs.existsSync(source)) continue;
  let payload;
  try { payload = JSON.parse(fs.readFileSync(source, "utf8")); } catch { continue; }
  const titles = [...new Set(collectProducts(payload).map((product) => String(product.title ?? "")).filter(Boolean))];
  scannedShops += 1;
  scannedProducts += titles.length;
  for (const title of titles) {
    const normalizedTitle = normalize(title);
    for (const [category, categoryMatchers] of Object.entries(matchers)) {
      if (categoryMatchers.some((matcher) => matcher.test(normalizedTitle))) matches[category].add(entry.name);
    }
  }
  if (scannedShops % 10000 === 0) process.stdout.write(`scanned=${scannedShops} products=${scannedProducts}\n`);
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "storefront product titles",
  scannedShops,
  scannedProducts,
  categories: Object.fromEntries(Object.entries(matches).map(([category, ids]) => [category, [...ids]])),
};
fs.writeFileSync(path.join(process.cwd(), "data/commerce-heatmap-shop-affiliations.json"), `${JSON.stringify(output)}\n`);
console.log(JSON.stringify({ scannedShops, scannedProducts, counts: Object.fromEntries(Object.entries(matches).map(([category, ids]) => [category, ids.size])) }, null, 2));

function collectProducts(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (!Array.isArray(value) && value.product_id && value.title) output.push(value);
  for (const nested of Object.values(value)) collectProducts(nested, output);
  return output;
}

function normalize(value) {
  return ` ${value.toLowerCase().normalize("NFKD").replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim()} `;
}

function phraseMatcher(value) {
  const escaped = normalize(value).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`);
}
