#!/usr/bin/env python3
"""Split the deterministic creator model into independently versioned D1 read models."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def create_database(path: Path, schema: str, source_path: Path, copy_sql: str) -> None:
    if path.exists():
        path.unlink()
    database = sqlite3.connect(path)
    database.executescript("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;" + schema)
    database.execute("ATTACH DATABASE ? AS source", (str(source_path),))
    database.executescript("BEGIN;" + copy_sql + "COMMIT; ANALYZE;")
    result = database.execute("PRAGMA integrity_check").fetchone()[0]
    database.close()
    if result != "ok":
        raise RuntimeError(f"Integrity check failed for {path}: {result}")


parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("--output-dir", default="data/cloudflare-import/creator-v1")
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
source = Path(args.source).resolve()
output_dir = (root / args.output_dir).resolve()
output_dir.mkdir(parents=True, exist_ok=True)
identity = output_dir / "partnerlinks-creator-identity-v1.sqlite"
evidence = output_dir / "partnerlinks-creator-evidence-v1.sqlite"

identity_schema = """
CREATE TABLE creator_master(graph_creator_id TEXT PRIMARY KEY,master_row INTEGER NOT NULL UNIQUE,username TEXT NOT NULL,tiktok_uid TEXT,display_name TEXT,country TEXT,follower_count INTEGER,profile_url TEXT,avatar_object_key TEXT,profile_resolution_status TEXT NOT NULL,canonical_video_count INTEGER NOT NULL,recent_snapshot_video_count INTEGER NOT NULL,latest_video_timestamp INTEGER,ambiguous_video_count INTEGER NOT NULL,verified_product_evidence INTEGER NOT NULL DEFAULT 0,approved_classification_evidence INTEGER NOT NULL DEFAULT 0,normalized_username TEXT NOT NULL,normalized_display_name TEXT NOT NULL) WITHOUT ROWID;
CREATE INDEX creator_master_username ON creator_master(normalized_username,master_row);
CREATE INDEX creator_master_display_name ON creator_master(normalized_display_name,master_row);
CREATE INDEX creator_master_uid ON creator_master(tiktok_uid) WHERE tiktok_uid IS NOT NULL;
CREATE TABLE creator_page_anchors(page INTEGER PRIMARY KEY,master_row INTEGER NOT NULL UNIQUE) WITHOUT ROWID;
CREATE TABLE creator_master_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL) WITHOUT ROWID;
"""
evidence_schema = """
CREATE TABLE creator_video_evidence(graph_creator_id TEXT PRIMARY KEY,evidence_json TEXT NOT NULL) WITHOUT ROWID;
CREATE TABLE creator_ambiguous_video_evidence(graph_creator_id TEXT PRIMARY KEY,evidence_json TEXT NOT NULL) WITHOUT ROWID;
CREATE TABLE creator_master_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL) WITHOUT ROWID;
"""

create_database(
    identity,
    identity_schema,
    source,
    "INSERT INTO creator_master SELECT * FROM source.creator_master;"
    "INSERT INTO creator_page_anchors(page,master_row) "
    "SELECT ((ordinal-1)/50)+1,master_row FROM ("
    "SELECT master_row,row_number() OVER (ORDER BY master_row) ordinal FROM creator_master"
    ") WHERE (ordinal-1)%50=0;"
    "INSERT INTO creator_master_metadata SELECT * FROM source.creator_master_metadata;",
)
create_database(
    evidence,
    evidence_schema,
    source,
    "INSERT INTO creator_video_evidence SELECT * FROM source.creator_video_evidence;"
    "INSERT INTO creator_ambiguous_video_evidence SELECT * FROM source.creator_ambiguous_video_evidence;"
    "INSERT INTO creator_master_metadata SELECT * FROM source.creator_master_metadata;",
)

manifest = {
    "modelVersion": "partnerlinks-creator-master-v1",
    "source": source.name,
    "artifacts": {
        "identity": {"file": identity.name, "bytes": identity.stat().st_size, "sha256": digest(identity)},
        "evidence": {"file": evidence.name, "bytes": evidence.stat().st_size, "sha256": digest(evidence)},
    },
    "counts": {
        "creators": sqlite3.connect(identity).execute("SELECT count(*) FROM creator_master").fetchone()[0],
        "canonicalVideoAssociations": sqlite3.connect(evidence).execute("SELECT sum(json_array_length(evidence_json)) FROM creator_video_evidence").fetchone()[0],
        "ambiguousVideoAssociations": sqlite3.connect(evidence).execute("SELECT sum(json_array_length(evidence_json)) FROM creator_ambiguous_video_evidence").fetchone()[0],
    },
}
(output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
