import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const validator = new URL("../scripts/validate-cloudflare-staging.mjs", import.meta.url).pathname;
const template = new URL("../wrangler.staging.template.jsonc", import.meta.url).pathname;

const accountId = "44cc721515baade8fe3514e0e5a1f33b";
const environment = { ...process.env, CLOUDFLARE_ACCOUNT_ID:accountId, CLOUDFLARE_API_TOKEN:"test-only" };

test("staging preflight refuses unresolved database IDs before resource creation", () => {
  const result = spawnSync(process.execPath, [validator, template], {
    encoding:"utf8",
    env:environment,
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/database ID is unresolved/);
});

test("staging preflight accepts only the exact approved account, names, bindings, and new IDs", () => {
  const config = JSON.parse(readFileSync(template,"utf8"));
  config.d1_databases.forEach((database,index) => { database.database_id = `00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`; });
  const directory = mkdtempSync(path.join(tmpdir(),"partnerlinks-staging-test-"));
  const configPath = path.join(directory,"wrangler.staging.jsonc");
  writeFileSync(configPath,JSON.stringify(config));
  const result = spawnSync(process.execPath,[validator,configPath],{encoding:"utf8",env:environment});
  assert.equal(result.status,0,result.stderr);
});

test("staging preflight blocks every known production database ID and name and any route", () => {
  const config = JSON.parse(readFileSync(template,"utf8"));
  config.d1_databases.forEach((database,index) => { database.database_id = `00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`; });
  config.d1_databases[0].database_id = "37fabe92-0dd8-43fd-a839-cde33679316b";
  config.d1_databases[1].database_name = "ugcweb-search";
  config.routes = [{ pattern:"partnerlinks.ai",custom_domain:true }];
  const directory = mkdtempSync(path.join(tmpdir(),"partnerlinks-staging-test-"));
  const configPath = path.join(directory,"wrangler.staging.jsonc");
  writeFileSync(configPath,JSON.stringify(config));
  const result = spawnSync(process.execPath,[validator,configPath],{encoding:"utf8",env:environment});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/points to a production database/);
  assert.match(result.stderr,/uses a production database name/);
  assert.match(result.stderr,/must not define routes or domains/);
});

test("staging preflight requires the fail-closed wrapper for application and asset requests", () => {
  const config = JSON.parse(readFileSync(template,"utf8"));
  config.d1_databases.forEach((database,index) => { database.database_id = `00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`; });
  config.main = ".open-next/worker.js";
  config.assets.run_worker_first = false;
  const directory = mkdtempSync(path.join(tmpdir(),"partnerlinks-staging-test-"));
  const configPath = path.join(directory,"wrangler.staging.jsonc");
  writeFileSync(configPath,JSON.stringify(config));
  const result = spawnSync(process.execPath,[validator,configPath],{encoding:"utf8",env:environment});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/fail-closed access wrapper/);
  assert.match(result.stderr,/assets must run through/);
});
