#!/usr/bin/env node

import { readFileSync } from "node:fs";

const expectedAccountId = "44cc721515baade8fe3514e0e5a1f33b";
const productionDatabaseIds = new Set([
  "71427d3a-ec4f-4ec1-b73c-23b8b0ebf57e",
  "37fabe92-0dd8-43fd-a839-cde33679316b",
  "fdd85d9f-797b-4875-99c6-dcaf98b71769",
  "32bf0cf4-54cc-431c-b1cf-241d0a4784ec",
  "a3efd91a-8379-4a43-b2d7-aef0b830df7b",
  "3bfa36dc-c9fd-4903-a8d4-fec3074dccc5",
]);
const productionDatabaseNames = new Set([
  "creator-agent-db",
  "ugcweb-commerce",
  "ugcweb-search",
  "tiktok-shop-screener",
  "partnerlinks-creator-identity-v1",
  "partnerlinks-creator-evidence-v1",
]);
const expectedWorkerName = "partnerlinks-release-candidate-staging";
const expectedDatabases = new Map([
  ["COMMERCE_DB", "partnerlinks-staging-commerce-v1"],
  ["SEARCH_DB", "partnerlinks-staging-search-v1"],
  ["CREATOR_DB", "partnerlinks-staging-creator-identity-v1"],
  ["CREATOR_EVIDENCE_DB", "partnerlinks-staging-creator-evidence-v1"],
]);
const configPath = process.argv[2];
if (!configPath) throw new Error("Usage: validate-cloudflare-staging.mjs <wrangler-staging.jsonc>");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const failures = [];
if (config.account_id !== expectedAccountId) failures.push(`Config must target the approved account ${expectedAccountId}`);
if (process.env.CLOUDFLARE_ACCOUNT_ID !== expectedAccountId) failures.push(`CLOUDFLARE_ACCOUNT_ID must equal the approved account ${expectedAccountId}`);
if (config.name !== expectedWorkerName) failures.push(`Worker name must be exactly ${expectedWorkerName}`);
if ("routes" in config || "route" in config || "domains" in config) failures.push("Staging config must not define routes or domains");
if (config.workers_dev !== true) failures.push("Staging must use workers.dev");
if (config.preview_urls !== true) failures.push("Staging preview URLs must be enabled");
if (config.main !== "staging-worker.mjs") failures.push("Staging must use the fail-closed access wrapper");
if (config.assets?.run_worker_first !== true) failures.push("Staging assets must run through the access wrapper");

const bindings = new Set();
const databaseIds = new Set();
const databaseNames = new Set();
if ((config.d1_databases ?? []).length !== expectedDatabases.size) failures.push("Staging config must contain exactly four D1 bindings");
for (const database of config.d1_databases ?? []) {
  if (bindings.has(database.binding)) failures.push(`Duplicate binding ${database.binding}`);
  bindings.add(database.binding);
  const expectedName = expectedDatabases.get(database.binding);
  if (!expectedName) failures.push(`Unexpected D1 binding ${database.binding}`);
  if (database.database_name !== expectedName) failures.push(`${database.binding} database name must be exactly ${expectedName}`);
  if (!/^[0-9a-f-]{36}$/i.test(String(database.database_id ?? ""))) failures.push(`${database.binding} database ID is unresolved`);
  if (productionDatabaseIds.has(database.database_id)) failures.push(`${database.binding} points to a production database`);
  if (productionDatabaseNames.has(database.database_name)) failures.push(`${database.binding} uses a production database name`);
  if (databaseIds.has(database.database_id)) failures.push(`${database.binding} reuses another staging database ID`);
  if (databaseNames.has(database.database_name)) failures.push(`${database.binding} reuses another staging database name`);
  databaseIds.add(database.database_id);
  databaseNames.add(database.database_name);
  if (database.remote !== true) failures.push(`${database.binding} must explicitly target its remote staging database`);
}
for (const required of expectedDatabases.keys()) {
  if (!bindings.has(required)) failures.push(`Missing ${required} binding`);
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`PASS: ${expectedWorkerName} targets four isolated staging databases in approved account ${expectedAccountId}`);
