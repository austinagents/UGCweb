import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import creatorData from "../data/creator-screener.json" with { type: "json" };
import heatmapAffinityTerms from "../data/commerce-heatmap-affinity-terms.json" with { type: "json" };
import {
  commerceCategoryGroups,
  commerceNavigationCategories,
  commerceNavigationCategoryForId,
  creatorShopCategories,
  tiktokShopCategories,
} from "../lib/commerce-categories.ts";
import { commerceHeatmapBucketAliases, commerceHeatmapCategories } from "../lib/commerce-heatmap-categories.ts";
import { normalizeCommerceIdentity, shopLikeCreatorIds } from "../lib/commerce-identity.ts";

const root = process.cwd();
const sourcePath = path.join(root, "data/tiktok-shops.sqlite");
const outputPath = path.join(root, "data/commerce-search.sqlite");
const temporaryPath = `${outputPath}.tmp`;

if (!fs.existsSync(sourcePath)) throw new Error(`Missing shop source: ${sourcePath}`);
if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);

const source = new DatabaseSync(sourcePath, { readOnly: true });
const shops = source.prepare(`
  SELECT shop_id, shop_name, shop_logo_url, storefront_url, category_ids, followers
  FROM shops
  ORDER BY shop_id
`).all();
source.close();

const creators = creatorData.creators;
validateRepresentativeSample(shops.slice(0, 250), creators.slice(0, 250));

const excludedCreatorIds = shopLikeCreatorIds(shops, creators);
const database = new DatabaseSync(temporaryPath);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE search_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
  CREATE TABLE search_entities (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('shop', 'creator', 'category')),
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    secondary TEXT NOT NULL DEFAULT '',
    normalized_name TEXT NOT NULL,
    normalized_secondary TEXT NOT NULL DEFAULT '',
    normalized_id TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '',
    normalized_aliases TEXT NOT NULL DEFAULT '',
    descendants TEXT NOT NULL DEFAULT '',
    normalized_descendants TEXT NOT NULL DEFAULT '',
    category TEXT,
    category_key TEXT,
    category_kind TEXT,
    followers INTEGER,
    image_url TEXT,
    destination_url TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  );
  CREATE INDEX search_entities_exact_name ON search_entities(entity_type, normalized_name);
  CREATE INDEX search_entities_exact_secondary ON search_entities(entity_type, normalized_secondary);
  CREATE INDEX search_entities_exact_id ON search_entities(entity_type, normalized_id);
  CREATE VIRTUAL TABLE search_entities_fts USING fts5(
    name, secondary, entity_id, aliases, descendants,
    content='search_entities', content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
  );
`);

const insert = database.prepare(`
  INSERT INTO search_entities (
    entity_type, entity_id, name, secondary, normalized_name, normalized_secondary,
    normalized_id, aliases, normalized_aliases, descendants, normalized_descendants,
    category, category_key, category_kind, followers, image_url, destination_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

database.exec("BEGIN IMMEDIATE");
for (const shop of shops) {
  const name = clean(shop.shop_name) || `Shop ${shop.shop_id}`;
  const categoryId = splitCategoryIds(shop.category_ids)[0] ?? "";
  const category = categoryId ? commerceNavigationCategoryForId(categoryId) : null;
  const categoryKey = commerceNavigationCategories.find((item) => item.name === category)?.key ?? null;
  insert.run(
    "shop", String(shop.shop_id), name, "", normalize(name), "", normalize(String(shop.shop_id)),
    "", "", "", "", category, categoryKey, null, nullableNumber(shop.followers), clean(shop.shop_logo_url), clean(shop.storefront_url),
  );
}

let indexedCreators = 0;
for (const creator of creators) {
  if (excludedCreatorIds.has(creator.creator_oecuid)) continue;
  const handle = clean(creator.handle).replace(/^@/, "");
  const nickname = clean(creator.nickname) || (handle ? `@${handle}` : `Creator ${creator.creator_oecuid}`);
  const categories = creatorShopCategories(creator.categoryMemberships, creator.sourceQueries);
  const category = categories[0] ?? null;
  const categoryKey = commerceNavigationCategories.find((item) => item.name === category)?.key ?? null;
  insert.run(
    "creator", String(creator.creator_oecuid), nickname, handle ? `@${handle}` : "", normalize(nickname), normalize(handle),
    normalize(String(creator.creator_oecuid)), handle, normalize(handle), "", "", category, categoryKey, null,
    nullableNumber(creator.followers), clean(creator.avatar), handle ? `https://www.tiktok.com/@${handle}` : "https://www.tiktok.com/",
  );
  indexedCreators += 1;
}

for (const navigation of commerceNavigationCategories) {
  const sourceAliases = tiktokShopCategories.filter((item) => navigation.categoryIds.some((id) => id === item.id)).map((item) => item.name);
  const childCategories = commerceHeatmapCategories.filter((child) => creatorShopCategories([child]).includes(navigation.name));
  const parentAliases = commerceCategoryGroups.filter((group) => creatorShopCategories([group.name]).includes(navigation.name)).map((group) => group.name);
  const descendants = childCategories.flatMap((child) => [child, ...commerceHeatmapBucketAliases[child], ...(heatmapAffinityTerms[child] ?? [])]);
  const aliases = unique([navigation.key, ...sourceAliases, ...parentAliases]);
  insert.run(
    "category", `navigation:${navigation.key}`, navigation.name, "Navigation category", normalize(navigation.name), normalize("Navigation category"),
    normalize(navigation.key), aliases.join(" | "), normalize(aliases.join(" ")), unique(descendants).join(" | "), normalize(unique(descendants).join(" ")),
    navigation.name, navigation.key, "navigation", null, null, `/?mode=shops&category=${encodeURIComponent(navigation.key)}`,
  );
}

for (const category of commerceHeatmapCategories) {
  const aliases = unique([...commerceHeatmapBucketAliases[category], ...(heatmapAffinityTerms[category] ?? [])]);
  const navigationCategory = creatorShopCategories([category])[0];
  insert.run(
    "category", `heatmap:${slugify(category)}`, category, "Category Map", normalize(category), normalize("Category Map"),
    normalize(slugify(category)), aliases.join(" | "), normalize(aliases.join(" ")), aliases.join(" | "), normalize(aliases.join(" ")),
    navigationCategory, slugify(category), "heatmap", null, null, `/?mode=shops&heatmap_category=${encodeURIComponent(category)}`,
  );
}

const metadata = database.prepare("INSERT INTO search_metadata (key, value) VALUES (?, ?)");
const metadataRows = {
  model_version: "commerce-search-v1",
  built_at: new Date().toISOString(),
  source_shop_count: String(shops.length),
  source_creator_count: String(creators.length),
  indexed_shop_count: String(shops.length),
  indexed_creator_count: String(indexedCreators),
  excluded_shop_like_creator_count: String(excludedCreatorIds.size),
  indexed_navigation_category_count: String(commerceNavigationCategories.length),
  indexed_heatmap_category_count: String(commerceHeatmapCategories.length),
};
for (const [key, value] of Object.entries(metadataRows)) metadata.run(key, value);
database.exec("COMMIT");
database.exec("INSERT INTO search_entities_fts(search_entities_fts) VALUES('rebuild');");
database.exec("PRAGMA optimize;");

const integrity = database.prepare("PRAGMA integrity_check").get();
const ftsRows = Number(database.prepare("SELECT count(*) AS count FROM search_entities_fts").get().count);
const entityRows = Number(database.prepare("SELECT count(*) AS count FROM search_entities").get().count);
if (integrity.integrity_check !== "ok") throw new Error(`Index integrity check failed: ${integrity.integrity_check}`);
if (ftsRows !== entityRows) throw new Error(`FTS coverage mismatch: ${ftsRows} != ${entityRows}`);
database.close();

if (fs.existsSync(outputPath)) fs.copyFileSync(outputPath, `${outputPath}.previous`);
fs.renameSync(temporaryPath, outputPath);

console.log(JSON.stringify({ ...metadataRows, entity_rows: entityRows, fts_rows: ftsRows, integrity: "ok", output: outputPath }, null, 2));

function validateRepresentativeSample(sampleShops, sampleCreators) {
  if (!sampleShops.length || !sampleCreators.length) throw new Error("Representative source sample is empty.");
  for (const shop of sampleShops) {
    if (!String(shop.shop_id).trim() || !clean(shop.storefront_url)) throw new Error(`Invalid shop sample: ${shop.shop_id}`);
  }
  for (const creator of sampleCreators) {
    if (!String(creator.creator_oecuid).trim() || !clean(creator.handle) || !clean(creator.nickname)) throw new Error(`Invalid creator sample: ${creator.creator_oecuid}`);
  }
  console.log(`Representative validation passed: ${sampleShops.length} shops, ${sampleCreators.length} creators.`);
}

function clean(value) { return value === null || value === undefined ? "" : String(value).trim(); }
function normalize(value) { return clean(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function nullableNumber(value) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value); }
function splitCategoryIds(value) { return clean(value).split("|").map((item) => item.trim()).filter(Boolean); }
function unique(values) { return [...new Set(values.map(clean).filter(Boolean))]; }
function slugify(value) { return normalizeCommerceIdentity(value).replace(/([a-z])([0-9])/g, "$1-$2") || normalize(value).replace(/\s+/g, "-"); }
