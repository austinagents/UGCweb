import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required. No migration was attempted.");
  process.exit(1);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, "../../db/migrations");
const sql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10 });

try {
  await sql`select pg_advisory_lock(hashtext('partnerlinks_schema_migrations'))`;
  await sql.unsafe(`
    create schema if not exists partnerlinks;
    create table if not exists partnerlinks.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const appliedRows = await sql`select version from partnerlinks.schema_migrations`;
  const applied = new Set(appliedRows.map((row) => row.version));
  const migrations = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const migration of migrations) {
    if (applied.has(migration)) continue;
    const source = await readFile(join(migrationsDirectory, migration), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`
        insert into partnerlinks.schema_migrations (version)
        values (${migration})
      `;
    });
    console.log(`Applied ${migration}`);
  }

  console.log("PartnerLinks migrations are current.");
} finally {
  try {
    await sql`select pg_advisory_unlock(hashtext('partnerlinks_schema_migrations'))`;
  } finally {
    await sql.end();
  }
}
