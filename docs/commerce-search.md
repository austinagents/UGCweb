# Commerce Search V1

Commerce Search is a server-only search surface over the existing TikTok Shop and creator datasets. It does not modify the source SQLite databases or creator JSON.

## Build or refresh the index

From the project root:

```bash
npm run build:commerce-search
```

The builder validates a representative source sample, applies the same high-confidence shop/creator identity exclusion used by the commerce rankings, and writes a temporary index before atomically activating `data/commerce-search.sqlite`.

The generated read model contains Shops, Creators, the 22 navigation categories, and the 36 homepage heatmap categories. Its metadata records source counts, indexed counts, exclusions, model version, and build timestamp. FTS row coverage and SQLite integrity are checked before activation.

Run the command again whenever `data/tiktok-shops.sqlite`, `data/creator-screener.json`, or the existing commerce taxonomy changes.

## Runtime

`GET /api/search?q=...` is the only runtime reader. The browser never receives the complete dataset. Supported result filters are `all`, `shop`, `creator`, and `category`.
