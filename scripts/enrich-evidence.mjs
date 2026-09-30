#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { enrichEvidenceRecords } from "./evidence-preview.mjs";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const evidencePath = path.join(projectRoot, "data/tool-evidence-sources.json");
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const argValue = (name) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
};

const toolSlug = argValue("tool");
const limit = Number(argValue("limit") ?? 0);
const refresh = hasFlag("refresh");
const dryRun = hasFlag("dry-run");
const timeoutMs = Number(argValue("timeout-ms") ?? process.env.EVIDENCE_PREVIEW_TIMEOUT_MS ?? 8000);
const concurrency = Number(argValue("concurrency") ?? process.env.EVIDENCE_PREVIEW_CONCURRENCY ?? 4);

const records = JSON.parse(await fs.readFile(evidencePath, "utf8"));
const result = await enrichEvidenceRecords(records, {
  concurrency,
  dryRun,
  limit,
  refresh,
  timeoutMs,
  toolSlug
});

if (!dryRun) await fs.writeFile(evidencePath, `${JSON.stringify(result.records, null, 2)}\n`);

console.log(JSON.stringify({
  storage: path.relative(projectRoot, evidencePath),
  toolSlug: toolSlug || "all",
  dryRun,
  refresh,
  ...result.report,
  totalRecords: result.records.length
}, null, 2));
