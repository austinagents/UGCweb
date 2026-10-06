import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import postgres from "postgres";

const expected = { entities: 148198, projections: 194728, observations: 349270 };
const datasetDirectory = resolve(process.argv[2] ?? process.env.TIKTOK_SHOP_DATASET_DIR ?? "");
const connectionString = process.env.DATABASE_URL;
const sessionRole = process.env.DATABASE_SESSION_ROLE;
if (!connectionString) throw new Error("DATABASE_URL is required.");
if (!process.argv[2] && !process.env.TIKTOK_SHOP_DATASET_DIR) throw new Error("Pass the corrected dataset directory or set TIKTOK_SHOP_DATASET_DIR.");
if (sessionRole && sessionRole !== "postgres") throw new Error("DATABASE_SESSION_ROLE may only be set to postgres for the privileged one-time cutover.");

const files = {
  entities: resolve(datasetDirectory, "tiktok_shop_entities.jsonl"),
  projections: resolve(datasetDirectory, "tiktok_shop_category_projection.jsonl"),
  observations: resolve(datasetDirectory, "tiktok_shop_ranking_observations.jsonl"),
};
await Promise.all(Object.values(files).map((file) => access(file)));

const sql = postgres(connectionString, { max: 1, idle_timeout: 20, connect_timeout: 10 });
try {
  if (sessionRole === "postgres") await sql`set role postgres`;
  await sql.begin(async (tx) => {
    await tx.unsafe(`
      create temporary table import_shop_entities
        (like partnerlinks.tiktok_shop_entities including defaults) on commit drop;
      create temporary table import_shop_projections
        (like partnerlinks.tiktok_shop_category_projections including defaults) on commit drop;
      create temporary table import_shop_observations
        (like partnerlinks.tiktok_shop_ranking_observations including defaults) on commit drop;
    `);

    await importJsonl(files.entities, 1000, async (rows) => {
      const clean = rows.map((row) => ({
        shop_id: row.shop_id,
        shop_name: row.shop_name,
        shop_thumb_image_url: row.shop_thumb_image_url,
        shop_status: row.shop_status,
        shop_share_link: row.shop_share_link,
        tiktok_username: null,
        tiktok_profile_url: null,
        tiktok_profile_source: null,
        tiktok_profile_verified_at: null,
        identity_source_category_id: row.identity_source_category_id,
        identity_source_category_name: row.identity_source_category_name,
        identity_source_window: row.identity_source_window,
        identity_source_page: row.identity_source_page,
        identity_source_file: row.identity_source_file,
        identity_captured_at: row.identity_captured_at,
      }));
      await tx`insert into import_shop_entities ${tx(clean)}`;
    });

    await importJsonl(files.projections, 1000, async (rows) => {
      const clean = rows.map((row) => ({ shop_id: row.shop_id, category_id: row.category_id, category_name: row.category_name }));
      await tx`insert into import_shop_projections ${tx(clean)}`;
    });

    await importJsonl(files.observations, 750, async (rows) => {
      const clean = rows.map((row) => ({
        shop_id: row.shop_id,
        category_id: row.category_id,
        category_name: row.category_name,
        ranking_window: row.window,
        capture_date: row.capture_date,
        captured_at: row.captured_at,
        source_page: row.source_page,
        source_file: row.source_file,
        source_row_index: row.source_row_index,
        reported_partition_total: row.reported_partition_total,
        api_interval_start_date: row.api_interval_start_date,
        api_interval_end_date: row.api_interval_end_date,
        total_gmv_rank: nullableRank(row.total_gmv_rank),
        total_gmv_previous_rank: nullableRank(row.total_gmv_previous_rank),
        total_gmv_rank_change: nullableRank(row.total_gmv_rank_change),
        product_card_gmv_rank: nullableRank(row.product_card_gmv_rank),
        product_card_gmv_previous_rank: nullableRank(row.product_card_gmv_previous_rank),
        product_card_gmv_rank_change: nullableRank(row.product_card_gmv_rank_change),
        live_gmv_rank: nullableRank(row.live_gmv_rank),
        live_gmv_previous_rank: nullableRank(row.live_gmv_previous_rank),
        live_gmv_rank_change: nullableRank(row.live_gmv_rank_change),
        video_gmv_rank: nullableRank(row.video_gmv_rank),
        video_gmv_previous_rank: nullableRank(row.video_gmv_previous_rank),
        video_gmv_rank_change: nullableRank(row.video_gmv_rank_change),
        raw_rank_family: tx.json(row.raw_rank_family),
      }));
      await tx`insert into import_shop_observations ${tx(clean)}`;
    });

    const [counts] = await tx`
      select
        (select count(*)::integer from import_shop_entities) as entities,
        (select count(*)::integer from import_shop_projections) as projections,
        (select count(*)::integer from import_shop_observations) as observations,
        (select count(distinct category_id)::integer from import_shop_projections) as categories,
        (select count(*)::integer from import_shop_entities where tiktok_username is not null or tiktok_profile_url is not null) as social_profiles
    `;
    for (const key of Object.keys(expected)) {
      if (counts[key] !== expected[key]) throw new Error(`Refusing cutover: ${key} ${counts[key]} != ${expected[key]}`);
    }
    if (counts.categories !== 29) throw new Error(`Refusing cutover: expected 29 categories, found ${counts.categories}`);
    if (counts.social_profiles !== 0) throw new Error("Refusing cutover: unverified social profiles were populated.");

    await tx`truncate partnerlinks.tiktok_shop_ranking_observations, partnerlinks.tiktok_shop_category_projections, partnerlinks.tiktok_shop_entities`;
    await tx`insert into partnerlinks.tiktok_shop_entities select * from import_shop_entities`;
    await tx`insert into partnerlinks.tiktok_shop_category_projections select * from import_shop_projections`;
    await tx`insert into partnerlinks.tiktok_shop_ranking_observations select * from import_shop_observations`;
    console.log(JSON.stringify({ status: "complete", ...counts }));
  });
} finally {
  await sql.end();
}

async function importJsonl(file, batchSize, consume) {
  const input = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let batch = [];
  for await (const line of input) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= batchSize) {
      await consume(batch);
      batch = [];
    }
  }
  if (batch.length) await consume(batch);
}

function nullableRank(value) {
  return value === null || value === undefined || value === "" ? null : value;
}
