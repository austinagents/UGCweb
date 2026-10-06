# Official TikTok Shop ranking migration

This is a hard replacement of the retired user-facing shop source. The application shop read path uses only:

- `partnerlinks.tiktok_shop_entities`
- `partnerlinks.tiktok_shop_category_projections`
- `partnerlinks.tiktok_shop_ranking_observations`

Expected corrected dataset counts:

- 148,198 entities
- 194,728 shop/category projections
- 349,270 category/window observations
- 29 official US L1 categories

Apply the schema and perform the transactional import:

```sh
npm run db:migrate
npm run import:tiktok-shop-rankings -- /absolute/path/to/tiktok-shop-ranking-corrected
```

The importer stages all three JSONL files, validates the exact counts and category count, verifies that no unverified social profiles were populated, and only then truncates and replaces the official shop tables in one database transaction. A failure rolls back without exposing a partial dataset.

Ranks are TikTok L1-category ranks, never global US ranks or dollar GMV values. Missing observations remain absent. The known source discrepancy remains documented as `Home Supplies × 7d: 11,066 / 11,067` and is not repaired or represented as reconciled.

`shop_share_link` is the official TikTok Shop destination. It is never treated as a TikTok social profile. Social fields remain null until a deterministic, verified profile mapping is ingested.
