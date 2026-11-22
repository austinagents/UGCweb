#!/usr/bin/env python3
"""Build the additive creator-account resolution layer without changing source rows."""

import argparse
import hashlib
import json
import sqlite3
import subprocess
from pathlib import Path


SCHEMA = """
CREATE TABLE creator_accounts(
  account_id TEXT PRIMARY KEY,
  canonical_graph_creator_id TEXT NOT NULL UNIQUE,
  tiktok_uid TEXT,
  username TEXT NOT NULL,
  display_name TEXT,
  country TEXT,
  follower_count INTEGER,
  profile_url TEXT,
  avatar_object_key TEXT,
  profile_resolution_status TEXT NOT NULL,
  source_record_count INTEGER NOT NULL,
  canonical_video_count INTEGER NOT NULL,
  recent_snapshot_video_count INTEGER NOT NULL,
  latest_video_timestamp INTEGER,
  ambiguous_video_count INTEGER NOT NULL,
  verified_product_evidence INTEGER NOT NULL,
  approved_classification_evidence INTEGER NOT NULL,
  gmv_30d REAL,
  units_sold_30d INTEGER,
  audience_gender TEXT,
  audience_gender_percentage REAL,
  metric_resolution_status TEXT NOT NULL,
  normalized_username TEXT NOT NULL,
  normalized_display_name TEXT NOT NULL
) WITHOUT ROWID;
CREATE INDEX creator_accounts_username ON creator_accounts(normalized_username,account_id);
CREATE INDEX creator_accounts_display_name ON creator_accounts(normalized_display_name,account_id);
CREATE UNIQUE INDEX creator_accounts_uid ON creator_accounts(tiktok_uid) WHERE tiktok_uid IS NOT NULL;
CREATE TABLE creator_account_members(
  account_id TEXT NOT NULL,
  graph_creator_id TEXT PRIMARY KEY,
  master_row INTEGER NOT NULL UNIQUE,
  is_canonical INTEGER NOT NULL CHECK(is_canonical IN (0,1)),
  FOREIGN KEY(account_id) REFERENCES creator_accounts(account_id)
) WITHOUT ROWID;
CREATE INDEX creator_account_members_account ON creator_account_members(account_id,is_canonical DESC,master_row);
CREATE TABLE creator_account_page_anchors(page INTEGER PRIMARY KEY,account_id TEXT NOT NULL UNIQUE) WITHOUT ROWID;
CREATE TABLE creator_account_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL) WITHOUT ROWID;
"""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def metric_value(rows, key):
    values = {row[key] for row in rows}
    return (next(iter(values)), "consistent") if len(values) == 1 else (None, "conflict")


parser = argparse.ArgumentParser()
parser.add_argument("--identity", default="data/cloudflare-import/creator-v1/partnerlinks-creator-identity-v1.sqlite")
parser.add_argument("--evidence", default="data/cloudflare-import/creator-v1/partnerlinks-creator-evidence-v1.sqlite")
parser.add_argument("--output", default="data/cloudflare-import/creator-account-v1/creator-account-resolution-v1.sqlite")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
identity_path = (root / args.identity).resolve()
evidence_path = (root / args.evidence).resolve()
output_path = (root / args.output).resolve()
output_path.parent.mkdir(parents=True, exist_ok=True)
if output_path.exists():
    output_path.unlink()

source = sqlite3.connect(f"file:{identity_path}?mode=ro&immutable=1", uri=True)
source.row_factory = sqlite3.Row
evidence = sqlite3.connect(f"file:{evidence_path}?mode=ro&immutable=1", uri=True)
target = sqlite3.connect(output_path)
target.executescript("PRAGMA journal_mode=OFF;PRAGMA synchronous=OFF;" + SCHEMA)

groups = {}
for row in source.execute("SELECT * FROM creator_master ORDER BY master_row"):
    account_id = f"tiktok:{row['tiktok_uid']}" if row["tiktok_uid"] else str(row["graph_creator_id"])
    groups.setdefault(account_id, []).append(row)

account_insert = "INSERT INTO creator_accounts VALUES(" + ",".join("?" for _ in range(24)) + ")"
target.execute("BEGIN")
duplicate_groups = excess = split_video_groups = product_groups = classified_groups = metric_conflicts = 0
for account_id, rows in groups.items():
    if len(rows) > 1:
        duplicate_groups += 1
        excess += len(rows) - 1
    canonical = min(rows, key=lambda r: (
        -int(r["approved_classification_evidence"]),
        -int(r["verified_product_evidence"]),
        -int(r["canonical_video_count"]),
        -int(r["recent_snapshot_video_count"]),
        -int(r["latest_video_timestamp"] or 0),
        int(r["master_row"]),
    ))
    avatar_object_key = canonical["avatar_object_key"] or next(
        (row["avatar_object_key"] for row in rows if row["avatar_object_key"]), None
    )
    if sum(int(r["canonical_video_count"] > 0) for r in rows) > 1:
        split_video_groups += 1
    if any(r["verified_product_evidence"] for r in rows):
        product_groups += int(len(rows) > 1)
    if any(r["approved_classification_evidence"] for r in rows):
        classified_groups += int(len(rows) > 1)
    gmv, gmv_state = metric_value(rows, "gmv_30d")
    units, units_state = metric_value(rows, "units_sold_30d")
    metric_state = "conflict" if "conflict" in (gmv_state, units_state) else "consistent"
    metric_conflicts += int(len(rows) > 1 and metric_state == "conflict")
    ambiguous_ids = set()
    if len(rows) == 1:
        ambiguous_count = int(canonical["ambiguous_video_count"])
    else:
        for row in rows:
            found = evidence.execute("SELECT evidence_json FROM creator_ambiguous_video_evidence WHERE graph_creator_id=?", (row["graph_creator_id"],)).fetchone()
            if found:
                ambiguous_ids.update(str(item[0]) for item in json.loads(found[0]))
        ambiguous_count = len(ambiguous_ids)
    target.execute(account_insert, (
        account_id, canonical["graph_creator_id"], canonical["tiktok_uid"], canonical["username"],
        canonical["display_name"], canonical["country"], canonical["follower_count"], canonical["profile_url"],
        avatar_object_key, canonical["profile_resolution_status"], len(rows),
        sum(int(r["canonical_video_count"]) for r in rows),
        sum(int(r["recent_snapshot_video_count"]) for r in rows),
        max((r["latest_video_timestamp"] for r in rows if r["latest_video_timestamp"] is not None), default=None),
        ambiguous_count, max(int(r["verified_product_evidence"]) for r in rows),
        max(int(r["approved_classification_evidence"]) for r in rows), gmv, units,
        canonical["audience_gender"], canonical["audience_gender_percentage"], metric_state,
        canonical["normalized_username"], canonical["normalized_display_name"],
    ))
    target.executemany("INSERT INTO creator_account_members VALUES(?,?,?,?)", [
        (account_id, row["graph_creator_id"], row["master_row"], int(row["graph_creator_id"] == canonical["graph_creator_id"]))
        for row in rows
    ])
target.commit()
target.execute("""
INSERT INTO creator_account_page_anchors(page,account_id)
SELECT ((ordinal-1)/50)+1,account_id FROM (
  SELECT account_id,row_number() OVER (ORDER BY canonical_graph_creator_id) ordinal FROM creator_accounts
) WHERE (ordinal-1)%50=0
""")
metadata = {
    "model_version": "partnerlinks-creator-account-v1",
    "source_identity_sha256": sha256(identity_path),
    "source_evidence_sha256": sha256(evidence_path),
    "source_record_count": str(source.execute("SELECT count(*) FROM creator_master").fetchone()[0]),
    "account_count": str(len(groups)),
    "duplicate_uid_groups": str(duplicate_groups),
    "excess_identity_rows": str(excess),
    "split_video_groups": str(split_video_groups),
    "duplicate_uid_product_groups": str(product_groups),
    "duplicate_uid_classified_groups": str(classified_groups),
    "metric_conflict_groups": str(metric_conflicts),
}
target.executemany("INSERT INTO creator_account_metadata VALUES(?,?)", metadata.items())
target.commit()
target.execute("ANALYZE")
integrity = target.execute("PRAGMA integrity_check").fetchone()[0]
if integrity != "ok":
    raise RuntimeError(integrity)
target.close()
sql_path = output_path.with_suffix(".sql")
with sql_path.open("wb") as sql_output:
    subprocess.run(["sqlite3", str(output_path), ".dump"], check=True, stdout=sql_output)
manifest = {"artifact": str(output_path.relative_to(root)), "bytes": output_path.stat().st_size,
            "sha256": sha256(output_path), "migration": str(sql_path.relative_to(root)),
            "migrationBytes": sql_path.stat().st_size, "migrationSha256": sha256(sql_path), "metadata": metadata}
(output_path.parent / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
