# Cloudflare deployment

UGCWEB deploys as a Next.js Worker with two D1 read models:

- `ugcweb-commerce`: shops, original ranking observations, estimates, heatmap affiliations, and creators.
- `ugcweb-search`: the Commerce Search V1 entity and FTS5 index.

Cloudflare R2 remains unchanged and continues to serve the existing image URLs. Source SQLite databases remain the local source of truth and are never modified by the export.

## Build reproducible import artifacts

```bash
npm run build:commerce-cloudflare-artifacts
```

Generated SQL and its checksum manifest are written to the ignored `data/cloudflare-import/` directory. The command also refreshes the small tracked creator/shop identity artifact used for deterministic shop-audience presentation.

## Refresh safely

Do not import a complete snapshot over populated tables. Create versioned replacement D1 databases, import and validate them, update the D1 IDs in `wrangler.jsonc`, deploy, and only retire the prior databases after production verification.

For each empty replacement database:

```bash
npx wrangler d1 execute <commerce-db> --remote --file=data/cloudflare-import/commerce-schema.sql --yes
npx wrangler d1 execute <commerce-db> --remote --file=data/cloudflare-import/commerce-data.sql --yes
npx wrangler d1 execute <commerce-db> --remote --file=data/cloudflare-import/creators-schema.sql --yes
npx wrangler d1 execute <commerce-db> --remote --file=data/cloudflare-import/creators-data.sql --yes

npx wrangler d1 execute <search-db> --remote --file=data/cloudflare-import/search-schema.sql --yes
npx wrangler d1 execute <search-db> --remote --file=data/cloudflare-import/search-data.sql --yes
```

Validate source and D1 row counts, representative 1D/7D/30D ordering, all heatmap category counts, creator exclusions, exact/handle/ID searches, FTS prefix searches, and preview results before changing bindings.

## Verify and deploy

```bash
npm run typecheck
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
npm run deploy:cloudflare
```

The production custom domains are declared in `wrangler.jsonc`:

- `partnerlinks.dev`
- `www.partnerlinks.dev`

No Cloudflare credentials or OAuth tokens belong in the repository.
