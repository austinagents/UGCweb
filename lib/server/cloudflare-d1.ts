import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type UGCWebCloudflareEnv = {
  COMMERCE_DB: D1Database;
  SEARCH_DB: D1Database;
  CREATOR_DB: D1Database;
  CREATOR_EVIDENCE_DB: D1Database;
  CREATOR_AVATAR_ARCHIVE: R2Bucket;
};

export function getCommerceDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).COMMERCE_DB;
}

export function getSearchDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).SEARCH_DB;
}

export function getCreatorDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).CREATOR_DB;
}

export function getCreatorEvidenceDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).CREATOR_EVIDENCE_DB;
}

export function getCreatorAvatarArchive() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).CREATOR_AVATAR_ARCHIVE;
}
