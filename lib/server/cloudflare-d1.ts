import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type UGCWebCloudflareEnv = {
  COMMERCE_DB: D1Database;
  SEARCH_DB: D1Database;
};

export function getCommerceDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).COMMERCE_DB;
}

export function getSearchDatabase() {
  return (getCloudflareContext().env as unknown as UGCWebCloudflareEnv).SEARCH_DB;
}
