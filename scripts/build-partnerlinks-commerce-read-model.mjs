import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const graphPath = process.argv[2] || process.env.PARTNERLINKS_ADMIN_GRAPH_PATH;
if (!graphPath) throw new Error("Pass the Admin Graph path or set PARTNERLINKS_ADMIN_GRAPH_PATH.");
const projection = JSON.parse(readFileSync(path.join(root, "data/partnerlinks-taxonomy/taxonomy_projection.json"), "utf8"));
const sourceToVisible = new Map(projection.sourceCategories.filter((row) => row.visibleBucketId).map((row) => [row.id, row.visibleBucketId]));
const graph = new DatabaseSync(path.resolve(graphPath), { readOnly: true });
const outputDirectory = path.join(root, "data/cloudflare-import");
mkdirSync(outputDirectory, { recursive: true });
const modelPath = path.join(outputDirectory, "partnerlinks-commerce-read-model.sqlite");
const model = new DatabaseSync(modelPath);
model.exec(`
  PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA temp_store=MEMORY;
  DROP TABLE IF EXISTS classification_products;
  DROP TABLE IF EXISTS classification_shops;
  DROP TABLE IF EXISTS classification_creators;
  DROP TABLE IF EXISTS classification_metadata;
  CREATE TABLE classification_products (
    product_id TEXT PRIMARY KEY, source_category_id TEXT NOT NULL, visible_classification_id TEXT NOT NULL,
    relationship_count INTEGER NOT NULL, video_count INTEGER NOT NULL, creator_count INTEGER NOT NULL,
    seller_count INTEGER NOT NULL, first_observed_timestamp TEXT, latest_observed_timestamp TEXT,
    snapshot_30d_video_count INTEGER NOT NULL, source_kind TEXT NOT NULL, mapping_state TEXT NOT NULL
  ) WITHOUT ROWID;
  CREATE INDEX classification_products_visible ON classification_products(visible_classification_id, snapshot_30d_video_count DESC, latest_observed_timestamp DESC, product_id);
  CREATE TABLE classification_shops (
    shop_id TEXT NOT NULL, visible_classification_id TEXT NOT NULL, shop_name TEXT, storefront_url TEXT,
    product_count INTEGER NOT NULL, video_count INTEGER NOT NULL, creator_count INTEGER NOT NULL,
    first_observed_timestamp TEXT, latest_observed_timestamp TEXT, snapshot_30d_video_count INTEGER NOT NULL,
    source_provenance TEXT NOT NULL, confidence_state TEXT NOT NULL,
    PRIMARY KEY(visible_classification_id, shop_id)
  ) WITHOUT ROWID;
  CREATE INDEX classification_shops_shop ON classification_shops(shop_id, visible_classification_id);
  CREATE TABLE classification_creators (
    graph_creator_id TEXT NOT NULL, visible_classification_id TEXT NOT NULL, tiktok_uid TEXT, handle TEXT,
    display_name TEXT, follower_count INTEGER, product_count INTEGER NOT NULL, video_count INTEGER NOT NULL,
    first_observed_timestamp TEXT, latest_observed_timestamp TEXT, snapshot_30d_video_count INTEGER NOT NULL,
    source_provenance TEXT NOT NULL, confidence_state TEXT NOT NULL,
    PRIMARY KEY(visible_classification_id, graph_creator_id)
  ) WITHOUT ROWID;
  CREATE INDEX classification_creators_creator ON classification_creators(graph_creator_id, visible_classification_id);
  CREATE INDEX classification_creators_uid ON classification_creators(tiktok_uid) WHERE tiktok_uid IS NOT NULL AND tiktok_uid <> '';
  CREATE TABLE classification_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
`);

const productInsert = model.prepare("INSERT INTO classification_products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
const shopUpsert = model.prepare(`INSERT INTO classification_shops VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(visible_classification_id,shop_id) DO UPDATE SET
  product_count=product_count+excluded.product_count, video_count=video_count+excluded.video_count, creator_count=creator_count+excluded.creator_count,
  first_observed_timestamp=min(first_observed_timestamp,excluded.first_observed_timestamp), latest_observed_timestamp=max(latest_observed_timestamp,excluded.latest_observed_timestamp),
  snapshot_30d_video_count=snapshot_30d_video_count+excluded.snapshot_30d_video_count`);
const creatorUpsert = model.prepare(`INSERT INTO classification_creators VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(visible_classification_id,graph_creator_id) DO UPDATE SET
  product_count=product_count+excluded.product_count, video_count=video_count+excluded.video_count,
  first_observed_timestamp=min(first_observed_timestamp,excluded.first_observed_timestamp), latest_observed_timestamp=max(latest_observed_timestamp,excluded.latest_observed_timestamp),
  snapshot_30d_video_count=snapshot_30d_video_count+excluded.snapshot_30d_video_count`);

model.exec("BEGIN");
for (const row of graph.prepare(`SELECT p.*, e.category_id, e.source_kind, e.mapping_state FROM products p JOIN product_category_edges e USING(product_id) WHERE e.taxonomy_chain_valid=1`).iterate()) {
  const visible = sourceToVisible.get(String(row.category_id));
  if (!visible) continue;
  productInsert.run(String(row.product_id), String(row.category_id), visible, n(row.relationship_count), n(row.video_count), n(row.creator_count), n(row.seller_count), row.first_observed_timestamp, row.latest_observed_timestamp, n(row.recent_30_video_count), String(row.source_kind), String(row.mapping_state));
}
for (const row of graph.prepare(`SELECT e.*, s.shop_name, s.storefront_url FROM shop_category_edges e JOIN shops s USING(shop_id)`).iterate()) {
  const visible = sourceToVisible.get(String(row.category_id));
  if (!visible) continue;
  shopUpsert.run(String(row.shop_id), visible, row.shop_name, row.storefront_url, n(row.product_count), n(row.video_count), n(row.creator_count), row.first_observed_timestamp, row.latest_observed_timestamp, n(row.recent_30_video_count), String(row.source_provenance), String(row.confidence_state));
}
for (const row of graph.prepare(`SELECT e.*, c.tiktok_uid, c.handle, c.display_name, c.follower_count FROM creator_category_edges e JOIN creators c USING(creator_id) WHERE e.confidence_state='derived_from_verified_commercial_edges'`).iterate()) {
  const visible = sourceToVisible.get(String(row.category_id));
  if (!visible) continue;
  creatorUpsert.run(String(row.creator_id), visible, clean(row.tiktok_uid), clean(row.handle), clean(row.display_name), row.follower_count, n(row.product_count), n(row.video_count), row.first_observed_timestamp, row.latest_observed_timestamp, n(row.recent_30_video_count), String(row.source_provenance), String(row.confidence_state));
}
const metadata = model.prepare("INSERT INTO classification_metadata VALUES (?,?)");
metadata.run("taxonomy_version", projection.version);
metadata.run("graph_file", path.basename(graphPath));
metadata.run("graph_sha256", sha256(graphPath));
metadata.run("activity_cutoff_utc", "2026-11-11T04:07:31Z");
metadata.run("snapshot_30d_start_utc", "2026-10-12T04:07:31Z");
metadata.run("snapshot_30d_end_utc", "2026-11-11T04:07:31Z");
model.exec("COMMIT; ANALYZE;");

const schemaPath = path.join(outputDirectory, "classification-schema.sql");
const dataPath = path.join(outputDirectory, "classification-data.sql");
exportSql(model, schemaPath, dataPath);
const counts = Object.fromEntries(["classification_products", "classification_shops", "classification_creators"].map((table) => [table, model.prepare(`SELECT count(*) count FROM ${table}`).get().count]));
const distinct = {
  products: model.prepare("SELECT count(DISTINCT product_id) count FROM classification_products").get().count,
  shops: model.prepare("SELECT count(DISTINCT shop_id) count FROM classification_shops").get().count,
  creators: model.prepare("SELECT count(DISTINCT graph_creator_id) count FROM classification_creators").get().count,
};
const manifest = { generated_at: new Date().toISOString(), source: { file: path.basename(graphPath), sha256: sha256(graphPath) }, taxonomy_version: projection.version, activity_window: { start: "2026-10-12T04:07:31Z", end: "2026-11-11T04:07:31Z" }, counts, distinct, artifacts: [modelPath, schemaPath, dataPath].map((file) => ({ file: path.relative(root, file), bytes: statSync(file).size, sha256: sha256(file) })) };
writeFileSync(path.join(outputDirectory, "classification-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
graph.close(); model.close();

function n(value) { return Number(value || 0); }
function clean(value) { const text = value == null ? "" : String(value).trim(); return text || null; }
function sha256(file) { const hash=createHash("sha256"), fd=openSync(file,"r"); const buffer=Buffer.allocUnsafe(8*1024*1024); let bytes; while((bytes=readSync(fd,buffer,0,buffer.length,null))>0) hash.update(buffer.subarray(0,bytes)); closeSync(fd); return hash.digest("hex"); }
function literal(value) { if(value===null||value===undefined)return "NULL"; if(typeof value==="number"||typeof value==="bigint")return String(value); return `'${String(value).replaceAll("'", "''")}'`; }
function quote(value) { return `"${String(value).replaceAll('"','""')}"`; }
function exportSql(database, schemaPath, dataPath) {
  const schemaFd=openSync(schemaPath,"w"), dataFd=openSync(dataPath,"w"); writeSync(schemaFd,"PRAGMA foreign_keys=OFF;\n");
  for(const table of ["classification_products","classification_shops","classification_creators","classification_metadata"]){
    writeSync(schemaFd,database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table).sql+";\n");
    for(const index of database.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL ORDER BY name").all(table)) writeSync(schemaFd,index.sql+";\n");
    const columns=database.prepare(`PRAGMA table_info(${quote(table)})`).all().map((x)=>x.name), prefix=`INSERT INTO ${quote(table)} (${columns.map(quote).join(",")}) VALUES `; let batch=[], bytes=Buffer.byteLength(prefix)+2;
    const flush=()=>{if(batch.length){writeSync(dataFd,`${prefix}${batch.join(",")};\n`);batch=[];bytes=Buffer.byteLength(prefix)+2;}};
    for(const row of database.prepare(`SELECT * FROM ${quote(table)}`).iterate()){const tuple=`(${columns.map((column)=>literal(row[column])).join(",")})`, tupleBytes=Buffer.byteLength(tuple)+1;if(batch.length&&(batch.length===500||bytes+tupleBytes>90000))flush();batch.push(tuple);bytes+=tupleBytes;} flush();
  }
  closeSync(schemaFd); closeSync(dataFd);
}
