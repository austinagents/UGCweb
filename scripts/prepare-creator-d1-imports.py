#!/usr/bin/env python3
"""Create D1-compatible creator imports without changing authoritative dumps."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data/cloudflare-import/creator-v1"
OUTPUT_DIR = ROOT / "data/cloudflare-import/staging-v1"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

EXPECTED = {
    "identity": "d6474f69e07cc5e9507fcc885176f7055917a67cbaa81b59d4c0dda0fa66f087",
    "evidence": "8040955e4898902235280a34b4352ddf2d35053b4556eec55e4d655331b164a6",
}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def convert(kind: str) -> dict:
    source_path = SOURCE_DIR / f"partnerlinks-creator-{kind}-v1.sql"
    source_hash = digest(source_path)
    if source_hash != EXPECTED[kind]:
        raise RuntimeError(f"Unexpected {kind} source hash: {source_hash}")

    output_path = OUTPUT_DIR / f"partnerlinks-creator-{kind}-d1-v1.sql"
    skipped = {"transactions": 0, "statistics": 0}
    statements = 0
    with source_path.open("rb") as source, output_path.open("wb") as target:
        for line in source:
            stripped = line.strip()
            if stripped in (b"BEGIN TRANSACTION;", b"COMMIT;"):
                skipped["transactions"] += 1
                continue
            if stripped == b"ANALYZE sqlite_schema;" or stripped.startswith(b"INSERT INTO sqlite_stat1 "):
                skipped["statistics"] += 1
                continue
            target.write(line)
            if stripped.endswith(b";"):
                statements += 1
        target.write(b"ANALYZE;\n")
        statements += 1

    return {
        "source": str(source_path.relative_to(ROOT)),
        "sourceBytes": source_path.stat().st_size,
        "sourceSha256": source_hash,
        "file": str(output_path.relative_to(ROOT)),
        "bytes": output_path.stat().st_size,
        "sha256": digest(output_path),
        "statements": statements,
        "skipped": skipped,
    }


manifest = {
    "version": "partnerlinks-creator-d1-import-v1",
    "conversion": "Removed dump-level BEGIN/COMMIT and sqlite_stat1 payload; appended ANALYZE",
    "artifacts": {kind: convert(kind) for kind in ("identity", "evidence")},
}
(OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
