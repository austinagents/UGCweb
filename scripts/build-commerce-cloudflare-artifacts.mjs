import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "data/cloudflare-import");
mkdirSync(outputDirectory, { recursive: true });

const commerceSources = [
  ["data/tiktok-shops.sqlite", ["shops"]],
  ["data/tiktok-shop-ranking-observations.sqlite", ["ranking_observations"]],
  ["data/tiktok-shop-gmv-estimates.sqlite", ["calibration_parameters", "model_metadata", "observation_estimates", "shop_estimates"]],
];

const commerceSchema = exportTables("commerce-schema.sql", commerceSources, false);
const commerceData = exportTables("commerce-data.sql", commerceSources, true);
appendHeatmapAffiliations(commerceSchema, commerceData);
const searchSchema = exportTables("search-schema.sql", [["data/commerce-search.sqlite", ["search_entities", "search_metadata"]]], false, true);
const searchData = exportTables("search-data.sql", [["data/commerce-search.sqlite", ["search_entities", "search_metadata"]]], true);

const identity = buildCreatorIdentity();
const identityPath = path.join(root, "data/commerce-shop-creator-identity.json");
writeFileSync(identityPath, `${JSON.stringify({
  creatorAudienceByShopId: identity.creatorAudienceByShopId,
  shopAudienceCategoryBaselines: identity.shopAudienceCategoryBaselines,
})}\n`);
const [creatorSchema, creatorData] = exportCreators(identity);

const artifacts = [commerceSchema, commerceData, creatorSchema, creatorData, searchSchema, searchData].map((filePath) => ({
  file: path.relative(root, filePath),
  sha256: createHash("sha256").update(readFileSync(filePath)).digest("hex"),
  bytes: readFileSync(filePath).byteLength,
}));

writeFileSync(path.join(outputDirectory, "manifest.json"), `${JSON.stringify({
  generated_at: new Date().toISOString(),
  artifacts,
  creator_identity: {
    excluded_creator_count: identity.shopLikeCreatorIds.length,
    matched_audience_count: Object.keys(identity.creatorAudienceByShopId).length,
  },
}, null, 2)}\n`);

console.log(JSON.stringify({ artifacts, identity: {
  excludedCreatorCount: identity.shopLikeCreatorIds.length,
  matchedAudienceCount: Object.keys(identity.creatorAudienceByShopId).length,
} }, null, 2));

function exportTables(filename, sources, includeData, searchSchemaOnly = false) {
  const outputPath = path.join(outputDirectory, filename);
  const descriptor = openSync(outputPath, "w");
  writeSync(descriptor, "PRAGMA foreign_keys=OFF;\n");
  for (const [relativeDatabasePath, tables] of sources) {
    const database = new DatabaseSync(path.join(root, relativeDatabasePath), { readOnly: true });
    for (const table of tables) {
      if (!includeData) {
        const row = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table);
        writeSync(descriptor, `${row.sql};\n`);
        for (const index of database.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL ORDER BY name").all(table)) {
          writeSync(descriptor, `${index.sql};\n`);
        }
      } else {
        const columns = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((column) => column.name);
        const statement = database.prepare(`SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table)}`);
        const prefix = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) VALUES `;
        let tuples = [];
        let statementBytes = Buffer.byteLength(prefix) + 2;
        for (const row of statement.iterate()) {
          const values = columns.map((column) => sqlLiteral(row[column])).join(",");
          const tuple = `(${values})`;
          const tupleBytes = Buffer.byteLength(tuple) + 1;
          if (tuples.length > 0 && (tuples.length >= 1_000 || statementBytes + tupleBytes > 90_000)) {
            writeSync(descriptor, `${prefix}${tuples.join(",")};\n`);
            tuples = [];
            statementBytes = Buffer.byteLength(prefix) + 2;
          }
          tuples.push(tuple);
          statementBytes += tupleBytes;
        }
        if (tuples.length > 0) writeSync(descriptor, `${prefix}${tuples.join(",")};\n`);
      }
    }
    database.close();
  }
  if (!includeData && searchSchemaOnly) {
    writeSync(descriptor, "CREATE VIRTUAL TABLE search_entities_fts USING fts5(name, secondary, entity_id, aliases, descendants, content='search_entities', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2');\n");
  }
  if (includeData && filename === "search-data.sql") {
    writeSync(descriptor, "INSERT INTO search_entities_fts(search_entities_fts) VALUES('rebuild');\n");
    writeSync(descriptor, "ANALYZE;\n");
  }
  closeSync(descriptor);
  return outputPath;
}

function buildCreatorIdentity() {
  const database = new DatabaseSync(path.join(root, "data/tiktok-shops.sqlite"), { readOnly: true });
  const shops = database.prepare("SELECT shop_id, shop_name, followers FROM shops").all();
  database.close();
  const creators = JSON.parse(readFileSync(path.join(root, "data/creator-screener.json"), "utf8")).creators;
  const shopsByName = new Map();
  for (const shop of shops) {
    const name = normalize(shop.shop_name);
    if (name.length < 4) continue;
    const rows = shopsByName.get(name) ?? [];
    rows.push(shop);
    shopsByName.set(name, rows);
  }
  const excluded = [];
  const audience = {};
  for (const creator of creators) {
    const handle = normalize(creator.handle);
    const nickname = normalize(creator.nickname);
    const candidates = [...(shopsByName.get(handle) ?? []), ...(shopsByName.get(nickname) ?? [])];
    const match = candidates.filter((shop) => isMatch(shop, creator, handle, nickname)).sort((a, b) => distance(a.followers, creator.followers) - distance(b.followers, creator.followers))[0];
    if (!match) continue;
    excluded.push(String(creator.creator_oecuid));
    if (creator.audience_gender) audience[String(match.shop_id)] = creator.audience_gender;
  }
  const baselineValues = {};
  for (const creator of creators) {
    if (!creator.audience_gender) continue;
    const femaleShare = creator.audience_gender.gender === "Female" ? creator.audience_gender.percentage : 100 - creator.audience_gender.percentage;
    for (const category of mapCreatorCategories(creator.categoryMemberships, creator.sourceQueries)) {
      (baselineValues[category] ??= []).push(femaleShare);
    }
  }
  const shopAudienceCategoryBaselines = Object.fromEntries(Object.entries(baselineValues).map(([category, shares]) => [category, shares.reduce((sum, value) => sum + value, 0) / shares.length]));
  return { shopLikeCreatorIds: [...new Set(excluded)].sort(), creatorAudienceByShopId: audience, shopAudienceCategoryBaselines };
}

function exportCreators(identity) {
  const schemaPath = path.join(outputDirectory, "creators-schema.sql");
  const dataPath = path.join(outputDirectory, "creators-data.sql");
  writeFileSync(schemaPath, [
    "CREATE TABLE creator_records (source_index INTEGER NOT NULL, creator_id TEXT PRIMARY KEY, handle TEXT NOT NULL, nickname TEXT NOT NULL, avatar TEXT, followers INTEGER, category_memberships_json TEXT NOT NULL, source_queries_json TEXT NOT NULL, med_gmv_revenue REAL, med_gmv_revenue_range TEXT, units_sold INTEGER, units_sold_range TEXT, audience_gender_json TEXT, socials_json TEXT NOT NULL) WITHOUT ROWID;",
    "CREATE INDEX creator_records_source ON creator_records(source_index, creator_id);",
    "CREATE TABLE creator_categories (category TEXT NOT NULL, creator_id TEXT NOT NULL, PRIMARY KEY(category, creator_id)) WITHOUT ROWID;",
    "CREATE TABLE creator_heatmap_affiliations (category TEXT NOT NULL, creator_id TEXT NOT NULL, PRIMARY KEY(category, creator_id)) WITHOUT ROWID;",
    "CREATE TABLE creator_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;",
  ].join("\n") + "\n");
  const source = JSON.parse(readFileSync(path.join(root, "data/creator-screener.json"), "utf8"));
  const affinityTerms = JSON.parse(readFileSync(path.join(root, "data/commerce-heatmap-affinity-terms.json"), "utf8"));
  const excluded = new Set(identity.shopLikeCreatorIds);
  const descriptor = openSync(dataPath, "w");
  writeSync(descriptor, `INSERT INTO creator_metadata(key,value) VALUES ('snapshot_timestamp',${sqlLiteral(source.snapshotTimestamp)});\n`);
  const recordPrefix = "INSERT INTO creator_records(source_index,creator_id,handle,nickname,avatar,followers,category_memberships_json,source_queries_json,med_gmv_revenue,med_gmv_revenue_range,units_sold,units_sold_range,audience_gender_json,socials_json) VALUES ";
  const records = [];
  const categories = [];
  const heatmaps = [];
  source.creators.forEach((creator, sourceIndex) => {
    if (excluded.has(String(creator.creator_oecuid))) return;
    const memberships = mapCreatorCategories(creator.categoryMemberships, creator.sourceQueries);
    records.push(`(${[
      sourceIndex, creator.creator_oecuid, creator.handle ?? "", creator.nickname ?? "", creator.avatar,
      creator.followers, JSON.stringify(memberships), JSON.stringify(creator.sourceQueries ?? []),
      creator.med_gmv_revenue, creator.med_gmv_revenue_range, creator.units_sold, creator.units_sold_range,
      creator.audience_gender ? JSON.stringify(creator.audience_gender) : null, JSON.stringify(creator.socials ?? []),
    ].map(sqlLiteral).join(",")})`);
    for (const category of memberships) categories.push(`(${sqlLiteral(category)},${sqlLiteral(creator.creator_oecuid)})`);
    const queries = (creator.sourceQueries ?? []).map(normalizePhrase);
    for (const [category, terms] of Object.entries(affinityTerms)) {
      if (queries.some((query) => terms.map(normalizePhrase).some((term) => phraseIncludes(query, term)))) {
        heatmaps.push(`(${sqlLiteral(category)},${sqlLiteral(creator.creator_oecuid)})`);
      }
    }
  });
  writeBatches(descriptor, recordPrefix, records);
  writeBatches(descriptor, "INSERT INTO creator_categories(category,creator_id) VALUES ", categories);
  writeBatches(descriptor, "INSERT INTO creator_heatmap_affiliations(category,creator_id) VALUES ", heatmaps);
  closeSync(descriptor);
  return [schemaPath, dataPath];
}

function mapCreatorCategories(categories = [], sourceQueries = []) {
  const aliases = {
    "Sports & Outdoors":"Sports & Outdoor",Golf:"Sports & Outdoor",Pickleball:"Sports & Outdoor",Fitness:"Sports & Outdoor",Running:"Sports & Outdoor",Camping:"Sports & Outdoor",Fishing:"Sports & Outdoor",Fashion:"Fashion Accessories",Dresses:"Womenswear",Activewear:"Sports & Outdoor",Shoes:"Shoes",Jewelry:"Fashion Accessories",Handbags:"Luggage & Bags",Menswear:"Menswear","Beauty & Care":"Beauty",Skincare:"Beauty",Makeup:"Beauty",Haircare:"Beauty",Fragrance:"Beauty",Bodycare:"Beauty",Nails:"Beauty","Food & Beverage":"Food & Beverages",Energy:"Food & Beverages",Snacks:"Food & Beverages",Coffee:"Food & Beverages",Protein:"Health",Hydration:"Food & Beverages",Candy:"Food & Beverages","Home & Living":"Home Supplies",Kitchen:"Kitchenware",Cleaning:"Home Supplies",Storage:"Home Supplies",Decor:"Home Supplies",Bedding:"Textiles & Furnishings",Bathroom:"Home Supplies","Pets & Hobbies":"Pet Supplies",Dogs:"Pet Supplies",Cats:"Pet Supplies",Toys:"Toys & Hobbies",Collectibles:"Collectibles",Cards:"Collectibles",Crafts:"Toys & Hobbies",
  };
  const mapped = [...new Set(categories.map((category) => aliases[category]).filter(Boolean))];
  if (mapped.length > 0) return mapped;
  const text = sourceQueries.join(" ").toLowerCase();
  const rules = [
    ["Sports & Outdoor",/sport|fitness|running|golf|camp|fish|workout|gym|yoga|cycling|outdoor/],["Food & Beverages",/food|snack|coffee|drink|beverage|candy|fruit|protein|grocery|tea|water|hydration/],["Womenswear",/women|dress|lingerie|bra|skirt|blouse/],["Menswear",/men|suit|necktie/],["Shoes",/shoe|sneaker|boot|footwear|sandal/],["Beauty",/beauty|cosmetic|makeup|skin|hair|fragrance|perfume|nail|self care/],["Kitchenware",/kitchen|cook|bake|dining|tableware|barbecue/],["Textiles & Furnishings",/textile|furniture|bedding|pillow|blanket|curtain|rug|mattress/],["Electronics",/phone|computer|laptop|tablet|electronic|audio|camera|cable|wi-fi|printer|smartwatch|drone/],["Pet Supplies",/pet|dog|cat|aquarium/],["Health",/health|medical|first aid|supplement|massage|recovery|wheelchair/],["Fashion Accessories",/jewelry|jewellery|bracelet|necklace|watch|accessor|sunglass/],["Toys & Hobbies",/toy|game|craft|hobby|doll|plush|kite/],["Tools & Hardware",/tool|hardware|repair|building|workshop|electrical equipment/],["Automotive & Motorcycle",/car|auto|vehicle|motorcycle|engine|truck/],["Books, Magazines & Audio",/book|magazine|vinyl|record|literature/],["Luggage & Bags",/bag|luggage|purse|backpack|travel case/],["Collectibles",/collectible|memorabilia|trading card|pre-owned|antique/],["Virtual Products",/virtual|software|digital|download/],["Kids",/kid|child|boy|girl|school/],["Baby & Maternity",/baby|maternity|infant|toddler/],["Home Supplies",/home|clean|storage|decor|bathroom|garden|household|organizer/],
  ];
  return [rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Home Supplies"];
}

function writeBatches(descriptor, prefix, tuples) {
  let batch = [];
  let bytes = Buffer.byteLength(prefix) + 2;
  for (const tuple of tuples) {
    const tupleBytes = Buffer.byteLength(tuple) + 1;
    if (batch.length && (batch.length >= 1_000 || bytes + tupleBytes > 90_000)) {
      writeSync(descriptor, `${prefix}${batch.join(",")};\n`);
      batch = [];
      bytes = Buffer.byteLength(prefix) + 2;
    }
    batch.push(tuple);
    bytes += tupleBytes;
  }
  if (batch.length) writeSync(descriptor, `${prefix}${batch.join(",")};\n`);
}

function normalizePhrase(value) {
  return String(value).toLowerCase().normalize("NFKD").replace(/[’']/g, "'").replace(/[^a-z0-9']+/g, " ").trim();
}

function phraseIncludes(value, phrase) {
  return ` ${value} `.includes(` ${phrase} `);
}

function appendHeatmapAffiliations(schemaPath, dataPath) {
  appendFileSync(schemaPath, "CREATE TABLE heatmap_shop_affiliations (category TEXT NOT NULL, shop_id TEXT NOT NULL, PRIMARY KEY (category, shop_id)) WITHOUT ROWID;\nCREATE INDEX heatmap_shop_affiliations_shop ON heatmap_shop_affiliations(shop_id, category);\n");
  const source = JSON.parse(readFileSync(path.join(root, "data/commerce-heatmap-shop-affiliations.json"), "utf8"));
  const descriptor = openSync(dataPath, "a");
  const prefix = "INSERT INTO heatmap_shop_affiliations(category,shop_id) VALUES ";
  let tuples = [];
  for (const [category, shopIds] of Object.entries(source.categories)) {
    for (const shopId of shopIds) {
      tuples.push(`(${sqlLiteral(category)},${sqlLiteral(shopId)})`);
      if (tuples.length >= 1_000) {
        writeSync(descriptor, `${prefix}${tuples.join(",")};\n`);
        tuples = [];
      }
    }
  }
  if (tuples.length > 0) writeSync(descriptor, `${prefix}${tuples.join(",")};\n`);
  closeSync(descriptor);
}

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function distance(left, right) {
  return left && right ? Math.abs(Math.log(Number(left) / Number(right))) : Number.POSITIVE_INFINITY;
}

function isMatch(shop, creator, handle, nickname) {
  const name = normalize(shop.shop_name);
  if (name === handle && name === nickname) return true;
  const shopFollowers = Number(shop.followers);
  const creatorFollowers = Number(creator.followers);
  if (!(shopFollowers > 0 && creatorFollowers > 0)) return false;
  const ratio = Math.max(shopFollowers, creatorFollowers) / Math.min(shopFollowers, creatorFollowers);
  if ((name === handle || name === nickname) && ratio <= 1.5) return true;
  return name.length >= 6 && ratio <= 1.35 && (handle.includes(name) || name.includes(handle));
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}
