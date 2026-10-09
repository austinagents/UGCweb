import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const modelVersion = "provisional-empirical-velocity-v4";
const assumedExposureDays = 1095;
const rankingPath = path.resolve(process.argv[2] ?? "data/tiktok-shop-ranking-observations.sqlite");
const shopPath = path.resolve(process.argv[3] ?? "data/tiktok-shops.sqlite");
const destination = path.resolve(process.argv[4] ?? "data/tiktok-shop-gmv-estimates.sqlite");
if (!fs.existsSync(rankingPath) || !fs.existsSync(shopPath)) throw new Error("Ranking and shop read models are required.");
if (fs.existsSync(destination)) throw new Error(`Refusing to overwrite existing read model: ${destination}`);

const rankings = new DatabaseSync(rankingPath, { readOnly: true });
const shops = new DatabaseSync(shopPath, { readOnly: true });
const output = new DatabaseSync(destination);
output.exec(`
  PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;
  CREATE TABLE model_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE calibration_parameters (
    category_id TEXT NOT NULL, category_name TEXT NOT NULL, window TEXT NOT NULL,
    evidence_count INTEGER NOT NULL, quantile_count INTEGER NOT NULL,
    calibration_target TEXT NOT NULL, is_provisional INTEGER NOT NULL,
    price_floor REAL NOT NULL, price_ceiling REAL NOT NULL,
    daily_p01 REAL NOT NULL, daily_p50 REAL NOT NULL, daily_p99 REAL NOT NULL,
    distribution_json TEXT NOT NULL,
    PRIMARY KEY (category_id, window)
  ) WITHOUT ROWID;
  CREATE TABLE observation_estimates (
    shop_id TEXT NOT NULL, category_id TEXT NOT NULL, category_name TEXT NOT NULL, window TEXT NOT NULL,
    official_rank INTEGER NOT NULL, reported_partition_total INTEGER NOT NULL,
    raw_estimated_gmv REAL, estimated_gmv REAL, reconciliation_factor REAL, model_version TEXT NOT NULL,
    PRIMARY KEY (shop_id, category_id, window)
  ) WITHOUT ROWID;
  CREATE TABLE shop_estimates (
    shop_id TEXT PRIMARY KEY,
    raw_estimated_1d_gmv REAL, raw_estimated_7d_gmv REAL, raw_estimated_30d_gmv REAL,
    estimated_1d_gmv REAL, estimated_7d_gmv REAL, estimated_30d_gmv REAL,
    source_1d_category_id TEXT, source_7d_category_id TEXT, source_30d_category_id TEXT,
    source_1d_rank INTEGER, source_7d_rank INTEGER, source_30d_rank INTEGER,
    model_version TEXT NOT NULL
  ) WITHOUT ROWID;
`);

const shopById = new Map();
const allShopIds = [];
for (const row of shops.prepare("SELECT shop_id, shop_sold_count, followers, weighted_median_price, priced_product_count FROM shops ORDER BY shop_id").iterate()) {
  const shopId = String(row.shop_id);
  allShopIds.push(shopId);
  shopById.set(shopId, { sold: positive(row.shop_sold_count), followers: positive(row.followers), price: positive(row.weighted_median_price), pricedProducts: positive(row.priced_product_count) });
}
const observations = rankings.prepare(`
  SELECT shop_id, category_id, category_name, window, reported_partition_total, total_gmv_rank
  FROM ranking_observations ORDER BY category_id, window, source_page, source_row_index, shop_id
`).all();

const pricesByCategory = new Map();
for (const observation of observations) {
  const price = shopById.get(String(observation.shop_id))?.price;
  if (!price) continue;
  const key = String(observation.category_id);
  const values = pricesByCategory.get(key) ?? [];
  values.push(price); pricesByCategory.set(key, values);
}
const priceBounds = new Map();
for (const [categoryId, prices] of pricesByCategory) {
  prices.sort((a, b) => a - b);
  priceBounds.set(categoryId, { floor: Math.max(0.5, quantile(prices, 0.05)), ceiling: Math.min(1000, quantile(prices, 0.95)) });
}

const groups = new Map();
for (const observation of observations) {
  const shop = shopById.get(String(observation.shop_id));
  const bounds = priceBounds.get(String(observation.category_id));
  if (!shop?.sold || !shop.price || !bounds) continue;
  const dailyValue = shop.sold * clamp(shop.price, bounds.floor, bounds.ceiling) / assumedExposureDays;
  if (!Number.isFinite(dailyValue) || dailyValue <= 0) continue;
  const key = `${observation.category_id}:${observation.window}`;
  const group = groups.get(key) ?? { categoryId: String(observation.category_id), categoryName: String(observation.category_name), window: String(observation.window), rows: [], priceFloor: bounds.floor, priceCeiling: bounds.ceiling };
  group.rows.push([Number(observation.total_gmv_rank), dailyValue]); groups.set(key, group);
}
const parameters = new Map();
for (const [key, group] of groups) { const fit = fitRankDistribution(group.rows); if (fit) parameters.set(key, { ...group, ...fit }); }

const metadata = {
  model_version: modelVersion,
  formula: "q=.995-.985*(ln(rank)/ln(category_total))^1.7; daily_rate=category empirical daily-value quantile(q); 1D=r1; 7D=r1+6*r7; 30D=r1+6*r7+23*r30",
  status: "provisional_unverified_period_gmv",
  calibration_target: `shop_sold_count * category-winsorized weighted_median_price / ${assumedExposureDays} assumed exposure days`,
  limitation: "No dated GMV, shop age, refunds, or sales-velocity benchmark exists. Outputs are modeled estimates, not TikTok-reported GMV.",
  price_method: "Weighted median price winsorized to category P05-P95 and absolute $0.50-$1,000 bounds.",
  parameter_method: "Rank percentile maps to a 101-point empirical category daily-value distribution. Log-rank curvature spreads leaders across the observed heavy tail; target is winsorized P01-P99; minimum 100 evidence rows.",
  cumulative_method: "Window ranks estimate daily rates. Totals accumulate current-day, trailing-7-day, and trailing-30-day rate components by construction.",
  multi_category_rule: "Select lowest official rank percentile; tie-break by category_id. Preserve category observations separately.",
  missing_rank_rule: "Leave estimate null; never convert missing evidence to zero.",
  generated_at: new Date().toISOString(),
};
const insertMetadata = output.prepare("INSERT INTO model_metadata VALUES (?, ?)");
const insertParameter = output.prepare("INSERT INTO calibration_parameters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const insertObservation = output.prepare("INSERT INTO observation_estimates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const insertShop = output.prepare("INSERT INTO shop_estimates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

output.exec("BEGIN");
for (const [key, value] of Object.entries(metadata)) insertMetadata.run(key, String(value));
for (const p of parameters.values()) insertParameter.run(p.categoryId, p.categoryName, p.window, p.evidenceCount, p.quantiles.length, metadata.calibration_target, 1, p.priceFloor, p.priceCeiling, p.dailyP01, p.dailyP50, p.dailyP99, JSON.stringify(p.quantiles));

const records = [], categoryGroups = new Map();
for (const observation of observations) {
  const p = parameters.get(`${observation.category_id}:${observation.window}`);
  const rate = p ? estimateDailyRate(p, Number(observation.total_gmv_rank), Number(observation.reported_partition_total)) : null;
  const rawEstimate = rate ? Math.round(rate * days(String(observation.window))) : null;
  const record = { ...observation, rate, rawEstimate, estimate: rawEstimate }; records.push(record);
  const key = `${observation.shop_id}:${observation.category_id}`, group = categoryGroups.get(key) ?? [];
  group.push(record); categoryGroups.set(key, group);
}
for (const group of categoryGroups.values()) {
  const cumulative = cumulativeEstimates(group.map((record) => [String(record.window), record.rate]));
  for (const record of group) record.estimate = cumulative.get(String(record.window)) ?? null;
}

const selectedByShop = new Map();
for (const record of records) {
  const factor = record.rawEstimate && record.estimate ? record.estimate / record.rawEstimate : null;
  insertObservation.run(record.shop_id, record.category_id, record.category_name, record.window, record.total_gmv_rank, record.reported_partition_total, record.rawEstimate, record.estimate, factor, modelVersion);
  const key = `${record.shop_id}:${record.window}`, percentile = Number(record.total_gmv_rank) / Number(record.reported_partition_total), current = selectedByShop.get(key);
  if (!current || percentile < current.percentile || (percentile === current.percentile && String(record.category_id) < current.categoryId)) selectedByShop.set(key, { categoryId: String(record.category_id), rank: Number(record.total_gmv_rank), rawEstimate: record.rawEstimate, rate: record.rate, percentile });
}
for (const shopId of allShopIds) {
  const one = selectedByShop.get(`${shopId}:1d`), seven = selectedByShop.get(`${shopId}:7d`), thirty = selectedByShop.get(`${shopId}:30d`);
  const cumulative = cumulativeEstimates([["1d", one?.rate ?? null], ["7d", seven?.rate ?? null], ["30d", thirty?.rate ?? null]]);
  insertShop.run(shopId, one?.rawEstimate ?? null, seven?.rawEstimate ?? null, thirty?.rawEstimate ?? null, cumulative.get("1d") ?? null, cumulative.get("7d") ?? null, cumulative.get("30d") ?? null, one?.categoryId ?? null, seven?.categoryId ?? null, thirty?.categoryId ?? null, one?.rank ?? null, seven?.rank ?? null, thirty?.rank ?? null, modelVersion);
}
output.exec(`COMMIT;
  CREATE INDEX shop_estimates_1d ON shop_estimates (estimated_1d_gmv DESC, shop_id);
  CREATE INDEX shop_estimates_7d ON shop_estimates (estimated_7d_gmv DESC, shop_id);
  CREATE INDEX shop_estimates_30d ON shop_estimates (estimated_30d_gmv DESC, shop_id);
  CREATE INDEX observation_estimates_scope ON observation_estimates (window, category_id, official_rank, shop_id);
  PRAGMA journal_mode=DELETE; VACUUM;
`);
const counts = output.prepare("SELECT count(*) shops, count(estimated_1d_gmv) estimated_1d, count(estimated_7d_gmv) estimated_7d, count(estimated_30d_gmv) estimated_30d FROM shop_estimates").get();
output.close(); rankings.close(); shops.close();
if (Number(counts.shops) !== 148198) throw new Error(`Expected 148,198 shops, received ${counts.shops}.`);
console.log(JSON.stringify({ modelVersion, assumedExposureDays, parameters: parameters.size, ...counts }, null, 2));

function fitRankDistribution(rows) {
  if (rows.length < 100) return null;
  const targets = rows.map((row) => row[1]).sort((a, b) => a - b);
  const low = quantile(targets, 0.01), high = quantile(targets, 0.99);
  const robust = targets.map((value) => clamp(value, low, high));
  const quantiles = Array.from({ length: 101 }, (_, index) => quantile(robust, index / 100));
  return { evidenceCount: rows.length, quantiles, dailyP01: low, dailyP50: quantile(robust, 0.5), dailyP99: high };
}
function estimateDailyRate(parameter, rank, categoryTotal) {
  if (!(rank > 0) || !(categoryTotal > 1)) return null;
  const logPosition = Math.log(rank) / Math.log(categoryTotal);
  const q = clamp(0.995 - 0.985 * Math.pow(logPosition, 1.7), 0.01, 0.995);
  const scaled = q * 100, lower = Math.floor(scaled), upper = Math.ceil(scaled);
  if (lower === upper) return parameter.quantiles[lower];
  return parameter.quantiles[lower] + (parameter.quantiles[upper] - parameter.quantiles[lower]) * (scaled - lower);
}
function cumulativeEstimates(entries) {
  const rates = new Map(entries.filter(([, value]) => Number.isFinite(value) && value > 0)), result = new Map(), r1 = rates.get("1d"), r7 = rates.get("7d"), r30 = rates.get("30d");
  if (r1) result.set("1d", Math.round(r1));
  if (r7) result.set("7d", Math.round((r1 ?? r7) + 6 * r7));
  if (r30) result.set("30d", Math.round((result.get("7d") ?? 7 * r30) + 23 * r30));
  return result;
}
function days(window) { return window === "1d" ? 1 : window === "7d" ? 7 : 30; }
function positive(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function quantile(sorted, q) { if (!sorted.length) return 0; const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }
