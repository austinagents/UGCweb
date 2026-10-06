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

- `partnerlinks_web_read`: read-only access to explicitly granted application tables
- `partnerlinks_ingest`: explicitly granted ingestion access to application data
- `partnerlinks_migrate`: schema and object administration

Application-table grants are explicit rather than schema-wide defaults. Neither
the web nor ingestion role can read or modify `partnerlinks.schema_migrations`.
New migrations must grant access to new application tables deliberately.

The TikTok Shop ingestion tables grant `partnerlinks_ingest` only
`SELECT`, `INSERT`, `UPDATE`, and `TRUNCATE`. `TRUNCATE` is table-specific to
the three tables replaced atomically by the production importer; it is not a
schema-wide privilege. The importer truncates all three tables in one statement
so their foreign-key relationships remain valid without `CASCADE`.

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
