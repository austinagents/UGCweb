import "server-only";

type CloudflareCacheStorage = CacheStorage & { default?: Cache };

export async function edgeCachedJson<T>(
  request: Request,
  options: { edgeTtlSeconds: number; browserTtlSeconds?: number; staleWhileRevalidateSeconds?: number },
  load: () => Promise<T>,
) {
  const startedAt = performance.now();
  const cache = (globalThis.caches as CloudflareCacheStorage | undefined)?.default;
  const cacheKey = new Request(normalizedCacheUrl(request.url), { method: "GET" });

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return responseWithPerformanceHeaders(cached, "HIT", performance.now() - startedAt, options);
  }

  const dataStartedAt = performance.now();
  const data = await load();
  const dataDuration = performance.now() - dataStartedAt;
  const response = Response.json(data, {
    headers: {
      "Cache-Control": `public, max-age=${options.browserTtlSeconds ?? 0}, s-maxage=${options.edgeTtlSeconds}, stale-while-revalidate=${options.staleWhileRevalidateSeconds ?? options.edgeTtlSeconds * 2}`,
      "CDN-Cache-Control": `public, max-age=${options.edgeTtlSeconds}`,
    },
  });

  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch (error) {
      console.warn("UGCWEB edge cache write failed", error);
    }
  }
  return responseWithPerformanceHeaders(response, cache ? "MISS" : "BYPASS", performance.now() - startedAt, options, dataDuration);
}

function normalizedCacheUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const sorted = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  url.search = "";
  for (const [key, value] of sorted) url.searchParams.append(key, value);
  return url.toString();
}

function responseWithPerformanceHeaders(
  response: Response,
  cacheStatus: "HIT" | "MISS" | "BYPASS",
  totalDuration: number,
  options: { edgeTtlSeconds: number; browserTtlSeconds?: number; staleWhileRevalidateSeconds?: number },
  dataDuration?: number,
) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${options.browserTtlSeconds ?? 0}, s-maxage=${options.edgeTtlSeconds}, stale-while-revalidate=${options.staleWhileRevalidateSeconds ?? options.edgeTtlSeconds * 2}`);
  headers.set("CDN-Cache-Control", `public, max-age=${options.edgeTtlSeconds}`);
  headers.set("X-UGCWEB-Cache", cacheStatus);
  headers.set("Server-Timing", [
    `total;dur=${totalDuration.toFixed(1)}`,
    dataDuration === undefined ? null : `data;dur=${dataDuration.toFixed(1)}`,
  ].filter(Boolean).join(", "));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
