import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";

const source = path.resolve(process.argv[2] ?? "");
const destination = path.resolve(process.argv[3] ?? "data/tiktok-shop-ranking-observations.sqlite");

if (!process.argv[2] || !fs.existsSync(source)) {
  throw new Error("Usage: npm run build:tiktok-shop-ranking-read-model -- /absolute/path/to/tiktok_shop_ranking_observations.csv [output.sqlite]");
}
if (fs.existsSync(destination)) {
  throw new Error(`Refusing to overwrite existing read model: ${destination}`);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
const database = new DatabaseSync(destination);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE ranking_observations (
    shop_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    window TEXT NOT NULL,
    capture_date TEXT NOT NULL,
    reported_partition_total INTEGER NOT NULL,
    source_page INTEGER NOT NULL,
    source_row_index INTEGER NOT NULL,
    source_file TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    total_gmv_rank INTEGER NOT NULL,
    total_gmv_previous_rank INTEGER,
    total_gmv_rank_change INTEGER,
    product_card_gmv_rank INTEGER NOT NULL,
    product_card_gmv_previous_rank INTEGER,
    product_card_gmv_rank_change INTEGER,
    live_gmv_rank INTEGER NOT NULL,
    live_gmv_previous_rank INTEGER,
    live_gmv_rank_change INTEGER,
    video_gmv_rank INTEGER NOT NULL,
    video_gmv_previous_rank INTEGER,
    video_gmv_rank_change INTEGER,
    PRIMARY KEY (shop_id, category_id, window)
  ) WITHOUT ROWID;
`);

const insert = database.prepare(`
  INSERT INTO ranking_observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const input = readline.createInterface({ input: fs.createReadStream(source), crlfDelay: Infinity });
let headers;
let inserted = 0;
database.exec("BEGIN");
for await (const line of input) {
  if (!line) continue;
  const values = parseCsvLine(line);
  if (!headers) {
    headers = new Map(values.map((value, index) => [value, index]));
    continue;
  }
  const value = (name) => values[headers.get(name)];
  const integer = (name) => value(name) === "" ? null : Number(value(name));
  insert.run(
    value("shop_id"), value("category_id"), value("category_name"), value("window"), value("capture_date"),
    integer("reported_partition_total"), integer("source_page"), integer("source_row_index"), value("source_file"), value("captured_at"),
    integer("total_gmv_rank"), integer("total_gmv_previous_rank"), integer("total_gmv_rank_change"),
    integer("product_card_gmv_rank"), integer("product_card_gmv_previous_rank"), integer("product_card_gmv_rank_change"),
    integer("live_gmv_rank"), integer("live_gmv_previous_rank"), integer("live_gmv_rank_change"),
    integer("video_gmv_rank"), integer("video_gmv_previous_rank"), integer("video_gmv_rank_change"),
  );
  inserted += 1;
}
const expectedObservations = 349_270;
if (inserted !== expectedObservations) {
  database.exec("ROLLBACK");
  database.close();
  throw new Error(`Expected ${expectedObservations.toLocaleString("en-US")} observations, received ${inserted.toLocaleString("en-US")}.`);
}
database.exec(`
  COMMIT;
  CREATE INDEX ranking_total ON ranking_observations (window, category_id, total_gmv_rank, shop_id);
  CREATE INDEX ranking_product_card ON ranking_observations (window, category_id, product_card_gmv_rank, shop_id);
  CREATE INDEX ranking_live ON ranking_observations (window, category_id, live_gmv_rank, shop_id);
  CREATE INDEX ranking_video ON ranking_observations (window, category_id, video_gmv_rank, shop_id);
  PRAGMA journal_mode = DELETE;
  VACUUM;
`);
const validation = database.prepare(`
  SELECT count(*) AS observations, count(DISTINCT category_id) AS categories
  FROM ranking_observations
`).get();
if (Number(validation.observations) !== expectedObservations || Number(validation.categories) !== 29) {
  database.close();
  throw new Error(`Read-model validation failed: ${validation.observations} observations across ${validation.categories} categories.`);
}
database.close();
console.log(`Created ${destination} with ${inserted.toLocaleString("en-US")} authoritative observations.`);

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}
