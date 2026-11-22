# PartnerLinks Release Runbook

This runbook deploys versioned read models without overwriting the existing production D1 databases or attaching a staging Worker to a production route.

## Architecture

| Binding | Purpose | Local artifact |
|---|---|---|
| `COMMERCE_DB` | Existing commerce rankings plus verified classification products, shops, and creators | `baseline-v1/*commerce*` and `baseline-v1/*classification*` |
| `SEARCH_DB` | Existing shops, legacy creators, and canonical classifications search index | `baseline-v1/*search*` |
| `CREATOR_DB` | 540,846 canonical identities and indexed profile/search fields | `creator-v1/partnerlinks-creator-identity-v1.sql` |
| `CREATOR_EVIDENCE_DB` | Canonical and quarantined creator/video evidence | `creator-v1/partnerlinks-creator-evidence-v1.sql` |

The split keeps the 3.3 GiB evidence inventory from serializing identity-search and commerce traffic on the same single-threaded D1 database. It also permits reversible binding-only cutovers. No evidence is removed.

## Required staging authorization

Use the existing Cloudflare account `44cc721515baade8fe3514e0e5a1f33b` with four new, versioned staging databases. The staging configuration must pass the checked-in preflight and must not reference any existing production database, route, or domain.

Use an API token with:

- Account / D1 / Edit
- Account / Workers Scripts / Edit
- Account / Account Settings / Read

No Zone, DNS, Workers Routes, or SSL permission is needed. Set `CLOUDFLARE_ACCOUNT_ID=44cc721515baade8fe3514e0e5a1f33b` and `CLOUDFLARE_API_TOKEN` in the shell; never commit the token.

## Create isolated staging resources

Run these only after explicit approval of the resource plan:

```sh
npx wrangler d1 create partnerlinks-staging-commerce-v1
npx wrangler d1 create partnerlinks-staging-search-v1
npx wrangler d1 create partnerlinks-staging-creator-identity-v1
npx wrangler d1 create partnerlinks-staging-creator-evidence-v1
```

Copy `wrangler.staging.template.jsonc` to ignored `wrangler.staging.jsonc` and replace its four database ID placeholders with the IDs returned by the create commands. Do not add routes. Before any import or Worker deployment, independently list the account databases, verify all four name/ID pairs, and run:

```sh
npm run staging:preflight -- wrangler.staging.jsonc
```

The preflight rejects the production account, production database IDs, unresolved IDs, missing bindings, non-staging names, and configs containing routes.

## Import versioned artifacts

Each import targets a new empty staging database. If an import fails, do not resume blindly: inspect the table counts; recreate only that new staging database and retry its complete ordered sequence.

```sh
npx wrangler d1 execute COMMERCE_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/commerce-baseline-v1-schema.sql
npx wrangler d1 execute COMMERCE_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/commerce-baseline-v1-data.sql
npx wrangler d1 execute COMMERCE_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/classification-v1-schema.sql
npx wrangler d1 execute COMMERCE_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/classification-v1-data.sql

npx wrangler d1 execute SEARCH_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/search-baseline-v1-schema.sql
npx wrangler d1 execute SEARCH_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/baseline-v1/search-baseline-v1-data.sql

npx wrangler d1 execute CREATOR_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/creator-v1/partnerlinks-creator-identity-v1.sql
npx wrangler d1 execute CREATOR_EVIDENCE_DB --remote --config wrangler.staging.jsonc --file=data/cloudflare-import/creator-v1/partnerlinks-creator-evidence-v1.sql
```

The largest import file is approximately 2.30 GB, below D1's 5 GB import-file limit. The largest evidence row is 6.3 KB, below D1's 2 MB row limit.

## Reconcile before deploying the staging Worker

Execute read-only counts against the configured bindings:

```sql
-- CREATOR_DB
SELECT count(*) total,
       sum(canonical_video_count > 0) video_backed,
       sum(recent_snapshot_video_count > 0) recent,
       sum(verified_product_evidence) product_linked,
       sum(approved_classification_evidence) classified
FROM creator_master;
-- Expected: 540846 | 472994 | 298132 | 118290 | 111998

-- CREATOR_EVIDENCE_DB
SELECT count(*) creators, sum(json_array_length(evidence_json)) videos FROM creator_video_evidence;
-- Expected: 472994 | 39839796

SELECT count(*) creators, sum(json_array_length(evidence_json)) videos FROM creator_ambiguous_video_evidence;
-- Expected: 17053 | 1430561

-- COMMERCE_DB
SELECT count(*) FROM classification_products;
-- Expected: 267300
SELECT count(DISTINCT shop_id) FROM classification_shops;
-- Expected: 27240
SELECT count(DISTINCT graph_creator_id) FROM classification_creators;
-- Expected: 111998
```

Also run `PRAGMA integrity_check`, inspect every `d1 execute` metadata result, and retain the manifests and SHA-256 values beside the release record.

## Deploy and test staging

```sh
npm run typecheck
npm run test:taxonomy
npm run test:classification
npm run test:creator-master
npm run test:staging-safety
npx opennextjs-cloudflare build
npx wrangler deploy --config wrangler.staging.jsonc
```

The staging config uses only its `workers.dev` URL and contains no custom domains or routes. Run browser/API tests and Cloudflare load tests against that URL. Capture cold/warm response latency, D1 `rows_read`, query duration, Worker CPU, failures, and concurrent throughput.

## Rollback and recovery

- Staging and production read models are versioned, newly created databases. Never import over the existing production commerce or search databases.
- A failed new database import is recovered by recreating that versioned staging database, updating only the staging config ID, and replaying its complete import sequence.
- Record `wrangler d1 time-travel info <database>` bookmarks before any authorized change to an existing D1 database. Time Travel is the destructive-write recovery mechanism; do not run restore without separate approval.
- Production cutover is a Worker-version/binding change only. Keep the previous Worker version and old database IDs. Roll back by deploying the prior Worker version; the old databases remain unchanged.
- Do not use `wrangler d1 export` against a live production database during release preparation: Cloudflare documents that export can make the database unavailable while it runs.

## Production authorization gate

No command that creates, imports, binds, routes, or deploys production resources is authorized by this runbook. Production cutover requires explicit approval after remote staging reconciliation and performance results pass.
