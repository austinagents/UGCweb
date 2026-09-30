#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fetchAuthorAvatar, normalizeHandle } from "./lib/x-avatar-lookup.mjs";

for (const fileName of [".env.sources", ".env.local", ".env"]) {
  if (!existsSync(fileName)) continue;
  for (const line of readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const apiKey =
  process.env.TWITTERAPI_IO_API_KEY ||
  process.env.TWITTERAPI_API_KEY ||
  process.env.TWITTER_API_IO_KEY ||
  process.env.TWITTERAPIIO_API_KEY ||
  "";
if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing");

const dataPath = path.join(process.cwd(), "data", "pdf-x-creators.json");
const reportPath = path.join(process.cwd(), "data", "creator-avatar-fetch-report.json");
const delayMs = Number(process.env.TWITTERAPI_DELAY_MS || "350");
const creators = JSON.parse(readFileSync(dataPath, "utf8"));
const report = {
  attemptedAt: new Date().toISOString(),
  source: "twitterapi.io_author_profile_image",
  storagePath: "data/pdf-x-creators.json",
  attemptedHandles: 0,
  updated: 0,
  missingHandle: 0,
  retainedExistingAvatar: 0,
  failedLookups: [],
  notes: []
};

for (const [index, creator] of creators.entries()) {
  const handle = normalizeHandle(creator.xHandle || creator.handle);
  if (!handle) {
    report.missingHandle += 1;
    continue;
  }
  report.attemptedHandles += 1;
  console.log(`[${index + 1}/${creators.length}] @${handle}`);
  try {
    const avatarUrl = await fetchAuthorAvatar(handle, { apiKey, userAgent: "AppScreener creator avatar importer" });
    if (avatarUrl) {
      creator.avatarUrl = avatarUrl;
      creator.avatarSourceType = "x_profile_image";
      creator.avatarSourceUrl = `https://x.com/${handle}`;
      creator.avatarVerified = true;
      creator.verificationSignals = Array.isArray(creator.verificationSignals) ? creator.verificationSignals : [];
      if (!creator.verificationSignals.includes("x_profile_image_verified")) creator.verificationSignals.push("x_profile_image_verified");
      report.updated += 1;
    } else if (creator.avatarUrl) {
      report.retainedExistingAvatar += 1;
    } else {
      report.failedLookups.push({ handle: `@${handle}`, reason: "avatar_not_found" });
    }
  } catch (error) {
    if (creator.avatarUrl) report.retainedExistingAvatar += 1;
    report.failedLookups.push({ handle: `@${handle}`, reason: error instanceof Error ? error.message : String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

if (!report.updated) report.notes.push("No creator avatars were updated. Existing avatars or initials fallback will remain in use.");

writeFileSync(dataPath, `${JSON.stringify(creators, null, 2)}\n`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
