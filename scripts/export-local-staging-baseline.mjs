#!/usr/bin/env node

import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const root = process.cwd();
const localDirectory = path.join(root, "work/local-d1/v3/d1/miniflare-D1DatabaseObject");
const commerceDatabase = path.join(localDirectory, "37202af4a48e51a6f9bf1676145f85cdbaaf76a4a51b95f5120b328bf5460e72.sqlite");
const searchDatabase = path.join(localDirectory, "e008b887739dc346252b088c36b2f730fe39b9f5ee833a61f1235030e0df6b5d.sqlite");
const outputDirectory = path.join(root, "data/cloudflare-import/baseline-v1");
mkdirSync(outputDirectory, { recursive:true });

const commerceTables = [
  "calibration_parameters", "creator_categories", "creator_heatmap_affiliations", "creator_metadata",
  "creator_records", "heatmap_shop_affiliations", "model_metadata", "observation_estimates",
  "ranking_observations", "shop_estimates", "shops",
];
const classificationTables = ["classification_creators", "classification_metadata", "classification_products", "classification_shops"];
const searchTables = ["search_entities", "search_metadata"];

const artifacts = [
  exportDatabase(commerceDatabase, commerceTables, "commerce-baseline-v1"),
  exportDatabase(commerceDatabase, classificationTables, "classification-v1"),
  exportDatabase(searchDatabase, searchTables, "search-baseline-v1", true),
].flat();

const manifest = {
  version:"partnerlinks-staging-baseline-v1",
  source:"isolated local D1 verification databases",
  artifacts:artifacts.map((file) => ({
    file:path.basename(file),
    bytes:readFileSync(file).byteLength,
    sha256:createHash("sha256").update(readFileSync(file)).digest("hex"),
  })),
};
writeFileSync(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify(manifest,null,2));

function exportDatabase(databasePath, tables, prefix, withFts = false) {
  const database = new DatabaseSync(databasePath, { readOnly:true });
  const schemaPath = path.join(outputDirectory, `${prefix}-schema.sql`);
  const dataPath = path.join(outputDirectory, `${prefix}-data.sql`);
  const schema = openSync(schemaPath,"w");
  const data = openSync(dataPath,"w");
  writeSync(schema,"PRAGMA foreign_keys=OFF;\n");
  writeSync(data,"PRAGMA foreign_keys=OFF;\n");
  for (const table of tables) {
    const tableRow = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!tableRow?.sql) throw new Error(`Missing ${table} in ${databasePath}`);
    writeSync(schema,`${tableRow.sql};\n`);
    for (const index of database.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL ORDER BY name").all(table)) {
      writeSync(schema,`${index.sql};\n`);
    }
    exportRows(database, table, data);
  }
  if (withFts) {
    writeSync(schema,"CREATE VIRTUAL TABLE search_entities_fts USING fts5(name, secondary, entity_id, aliases, descendants, content='search_entities', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2');\n");
    writeSync(data,"INSERT INTO search_entities_fts(search_entities_fts) VALUES('rebuild');\nANALYZE;\n");
  }
  closeSync(schema); closeSync(data); database.close();
  return [schemaPath,dataPath];
}

function exportRows(database, table, descriptor) {
  const columns = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((column) => column.name);
  const prefix = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) VALUES `;
  let tuples = [], bytes = Buffer.byteLength(prefix)+2;
  for (const row of database.prepare(`SELECT ${columns.map(quoteIdentifier).join(",")} FROM ${quoteIdentifier(table)}`).iterate()) {
    const tuple = `(${columns.map((column) => sqlLiteral(row[column])).join(",")})`;
    const tupleBytes = Buffer.byteLength(tuple)+1;
    if (tuples.length && (tuples.length>=1000 || bytes+tupleBytes>90000)) {
      writeSync(descriptor,`${prefix}${tuples.join(",")};\n`); tuples=[]; bytes=Buffer.byteLength(prefix)+2;
    }
    tuples.push(tuple); bytes+=tupleBytes;
  }
  if (tuples.length) writeSync(descriptor,`${prefix}${tuples.join(",")};\n`);
}

function quoteIdentifier(value) { return `"${String(value).replaceAll('"','""')}"`; }
function sqlLiteral(value) {
  if (value===null || value===undefined) return "NULL";
  if (typeof value==="number" || typeof value==="bigint") return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${String(value).replaceAll("'","''")}'`;
}
