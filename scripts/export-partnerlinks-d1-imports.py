#!/usr/bin/env python3
"""Export versioned SQLite read models as D1-compatible SQL import files."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument("--artifact-dir", default="data/cloudflare-import/creator-v1")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
artifact_dir = (root / args.artifact_dir).resolve()

exports = {}
for name in ("identity", "evidence"):
    database = artifact_dir / f"partnerlinks-creator-{name}-v1.sqlite"
    output = artifact_dir / f"partnerlinks-creator-{name}-v1.sql"
    if not database.exists():
        raise FileNotFoundError(database)
    with output.open("wb") as target:
        subprocess.run(["sqlite3", str(database), ".dump"], check=True, stdout=target)
    exports[name] = {"file":output.name, "bytes":output.stat().st_size, "sha256":sha256(output)}

manifest_path = artifact_dir / "manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest["imports"] = exports
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(exports, indent=2))
