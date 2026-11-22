#!/usr/bin/env python3
"""Create resumable D1 patches from the completed, exact avatar archive ledger."""

import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("ledger")
parser.add_argument("--output-dir", default="data/cloudflare-import/creator-avatar-patches")
parser.add_argument("--rows-per-part", type=int, default=5000)
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
output = root / args.output_dir
output.mkdir(parents=True, exist_ok=True)
for old in output.glob("part-*.sql"):
    old.unlink()

rows = {}
with Path(args.ledger).open(encoding="utf-8") as source:
    for line in source:
        if not line.strip():
            continue
        record = json.loads(line)
        key = str(record.get("object_key") or "").strip()
        if key and record.get("status") in {"stored", "already_present"}:
            rows[int(record["master_row"])] = key

def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

parts = []
ordered = sorted(rows.items())
for index in range(0, len(ordered), args.rows_per_part):
    batch = ordered[index:index + args.rows_per_part]
    path = output / f"part-{index // args.rows_per_part + 1:04d}.sql"
    statements = [
        f"UPDATE creator_master SET avatar_object_key={quote(key)} WHERE master_row={master_row};"
        for master_row, key in batch
    ]
    path.write_text("\n".join(statements) + "\n")
    parts.append({"file": path.name, "rows": len(batch), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})

manifest = {"source": str(Path(args.ledger).resolve()), "archivedAvatarRows": len(rows), "parts": parts}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
