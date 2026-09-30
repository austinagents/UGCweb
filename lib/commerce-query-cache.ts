type CacheEntry = {
  data?: unknown;
  updatedAt: number;
  promise?: Promise<unknown>;
};

const queryCache = new Map<string, CacheEntry>();

export function readCommerceQuery<T>(key: string, maxAgeMs = 60_000) {
  const entry = queryCache.get(key);
  if (!entry?.data) return null;
  return { data: entry.data as T, stale: Date.now() - entry.updatedAt > maxAgeMs };
}

export function loadCommerceQuery<T>(key: string, url: string, force = false): Promise<T> {
  const entry = queryCache.get(key);
  if (entry?.promise) return entry.promise as Promise<T>;
  if (!force && entry?.data) return Promise.resolve(entry.data as T);

  const promise = fetch(url)
    .then(async (response) => {
      const data = await response.json() as T & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load commerce data.");
      queryCache.set(key, { data, updatedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      const current = queryCache.get(key);
      if (current?.data) queryCache.set(key, { data: current.data, updatedAt: current.updatedAt });
      else queryCache.delete(key);
      throw error;
    });

  queryCache.set(key, { data: entry?.data, updatedAt: entry?.updatedAt ?? 0, promise });
  return promise;
}

export function prefetchCommerceQuery<T>(key: string, url: string) {
  if (queryCache.has(key)) return;
  void loadCommerceQuery<T>(key, url).catch(() => undefined);
}
