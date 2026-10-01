import "server-only";

import postgres, { type Sql } from "postgres";

let database: Sql | undefined;

export function getDatabase() {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for PostgreSQL access.");
  }

  database = postgres(connectionString, {
    max: positiveInteger(process.env.DATABASE_POOL_MAX, 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return database;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
