# PartnerLinks PostgreSQL foundation

PartnerLinks uses ordinary PostgreSQL through `DATABASE_URL`. Supabase may host
the database, but migrations and application access do not use Supabase REST,
browser, Auth, Storage, or Realtime APIs.

## Configuration

Set a PostgreSQL connection string outside source control:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

`DATABASE_POOL_MAX` optionally controls the application pool size and defaults
to `5`. Use the Supabase connection string appropriate for a persistent server
or its transaction pooler for serverless deployments. Do not expose this value
through a `NEXT_PUBLIC_` variable.

## Apply migrations

Run against only the intended PartnerLinks database:

```bash
npm run db:migrate
```

The runner takes a PostgreSQL advisory lock, records applied filenames in
`partnerlinks.schema_migrations`, and applies each migration transactionally.

## Roles

The migrations create three NOLOGIN group roles without credentials:

- `partnerlinks_web_read`: read-only application access
- `partnerlinks_ingest`: select/insert/update access for ingestion workers
- `partnerlinks_migrate`: schema and object administration

Create separate LOGIN users through the database host, use independently
generated secrets, and grant each login only the matching group role. The
normal web `DATABASE_URL` should belong to a login with
`partnerlinks_web_read`, never the ingestion or migration roles.

The account applying the initial migrations must be allowed to create schemas
and roles. No application credentials or role passwords belong in migrations.

## Raw source retention

Normalized tables intentionally do not store complete raw Marketplace payloads.
Ingestion workers should retain recent compressed raw responses in replayable
temporary storage and record the storage reference in `ingestion_runs.metadata`.
No object-storage provider is selected by this foundation.
