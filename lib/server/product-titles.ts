import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getGraphProductTitles(productIds: readonly string[], requestUrl: string) {
  const shards = new Map<string, string[]>();
  for (const id of productIds) {
    if (!/^\d{3,}$/.test(id)) continue;
    const shard = id.slice(-3);
    const ids = shards.get(shard) ?? [];
    ids.push(id);
    shards.set(shard, ids);
  }

  const assets = (getCloudflareContext().env as { ASSETS?: Fetcher }).ASSETS;
  const origin = new URL(requestUrl);
  const titles = new Map<string, string>();
  await Promise.all([...shards].map(async ([shard, ids]) => {
    const url = new URL(`/graph-product-titles-v1/${shard}.json`, origin);
    const index = process.env.NODE_ENV === "development"
      ? await readLocalTitleShard(url.pathname)
      : await readAssetTitleShard(assets, url);
    if (!index) return;
    for (const id of ids) {
      if (typeof index[id] === "string") titles.set(id, index[id]);
    }
  }));
  return titles;
}

async function readAssetTitleShard(assets: Fetcher | undefined, url: URL) {
  const response = await assets?.fetch(url.href);
  return response?.ok ? response.json<Record<string, string>>() : null;
}

async function readLocalTitleShard(pathname: string) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(`${process.cwd()}/public${pathname}`, "utf8")) as Record<string, string>;
}
