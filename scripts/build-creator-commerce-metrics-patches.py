#!/usr/bin/env python3
import argparse
import csv
import hashlib
import json
from pathlib import Path


def sql_value(value):
    if value is None or value == "":
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


parser = argparse.ArgumentParser()
parser.add_argument("creator_master")
parser.add_argument("--output", default="work/creator-commerce-metrics-patches")
parser.add_argument("--rows-per-file", type=int, default=25_000)
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
output = root / args.output
output.mkdir(parents=True, exist_ok=True)
for old in output.glob("*.sql"):
    old.unlink()

rows = []
with open(args.creator_master, encoding="utf-8-sig", newline="") as source:
    for record in csv.DictReader(source):
        rows.append((
            int(record["master_row"]),
            float(record["sales"]) if record.get("sales") else None,
            int(float(record["orders"])) if record.get("orders") else None,
            (record.get("dominant_gender") or "").strip() or None,
            float(record["dominant_gender_pct"].rstrip("%")) if record.get("dominant_gender_pct") else None,
            int(float(record["followers"])) if record.get("followers") else None,
        ))

setup = output / "0000-setup.sql"
setup.write_text("""CREATE TABLE IF NOT EXISTS creator_master_metrics_stage(master_row INTEGER PRIMARY KEY,gmv_30d REAL,units_sold_30d INTEGER,audience_gender TEXT,audience_gender_percentage REAL,follower_count INTEGER) WITHOUT ROWID;
DELETE FROM creator_master_metrics_stage;
""", encoding="utf-8")

files = [setup]
for file_index, start in enumerate(range(0, len(rows), args.rows_per_file), 1):
    path = output / f"{file_index:04d}-data.sql"
    chunk = rows[start:start + args.rows_per_file]
    lines = []
    for batch_start in range(0, len(chunk), 500):
        batch = chunk[batch_start:batch_start + 500]
        lines.append("INSERT INTO creator_master_metrics_stage VALUES")
        for index, row in enumerate(batch):
            lines.append("(" + ",".join(sql_value(value) for value in row) + (");" if index == len(batch) - 1 else "),"))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    files.append(path)

finalize = output / f"{len(files):04d}-finalize.sql"
finalize.write_text("""ALTER TABLE creator_master ADD COLUMN gmv_30d REAL;
ALTER TABLE creator_master ADD COLUMN units_sold_30d INTEGER;
ALTER TABLE creator_master ADD COLUMN audience_gender TEXT;
ALTER TABLE creator_master ADD COLUMN audience_gender_percentage REAL;
UPDATE creator_master SET
  gmv_30d=(SELECT gmv_30d FROM creator_master_metrics_stage s WHERE s.master_row=creator_master.master_row),
  units_sold_30d=(SELECT units_sold_30d FROM creator_master_metrics_stage s WHERE s.master_row=creator_master.master_row),
  audience_gender=(SELECT audience_gender FROM creator_master_metrics_stage s WHERE s.master_row=creator_master.master_row),
  audience_gender_percentage=(SELECT audience_gender_percentage FROM creator_master_metrics_stage s WHERE s.master_row=creator_master.master_row),
  follower_count=coalesce((SELECT follower_count FROM creator_master_metrics_stage s WHERE s.master_row=creator_master.master_row),follower_count);
DROP TABLE creator_master_metrics_stage;
INSERT OR REPLACE INTO creator_master_metadata(key,value) VALUES('commerce_metrics_source','TikTok_Creators_Master.csv'),('model_version','partnerlinks-creator-master-v2');
""", encoding="utf-8")
files.append(finalize)

manifest = {
    "source": str(Path(args.creator_master).resolve()),
    "source_sha256": hashlib.sha256(Path(args.creator_master).read_bytes()).hexdigest(),
    "row_count": len(rows),
    "files": [{"name": path.name, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in files],
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))
