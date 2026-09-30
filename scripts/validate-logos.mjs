import fs from "node:fs/promises";
import path from "node:path";

const mapSource = await fs.readFile(path.join(process.cwd(), "lib/logo-assets.ts"), "utf8");
const json = mapSource.match(/export const logoAssets: Record<string, LogoAsset> = ([\s\S]*?);\n/)?.[1];
const logoAssets = json ? JSON.parse(json) : {};
const missing = [];
const fallback = [];

for (const [slug, asset] of Object.entries(logoAssets)) {
  if (!asset.officialLogoUrl) {
    fallback.push(slug);
    continue;
  }
  try {
    await fs.access(path.join(process.cwd(), "public", asset.officialLogoUrl));
  } catch {
    missing.push(slug);
  }
}

console.log(JSON.stringify({
  total: Object.keys(logoAssets).length,
  localLogos: Object.values(logoAssets).filter((asset) => asset.officialLogoUrl).length,
  fallbackCount: fallback.length,
  missingFileCount: missing.length,
  fallback,
  missing
}, null, 2));
