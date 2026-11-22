#!/usr/bin/env python3
"""Validate the approved taxonomy snapshot and build its runtime projection."""
import argparse, csv, hashlib, io, json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "partnerlinks-taxonomy"

def derive():
    policy = json.loads((DATA / "taxonomy_policy.json").read_text())
    source = (DATA / policy["source"]["filename"]).read_bytes()
    assert hashlib.sha256(source).hexdigest() == policy["source"]["sha256"], "Source snapshot mismatch"
    rows = list(csv.DictReader(io.StringIO(source.decode("utf-8-sig"), newline="")))
    expected = policy["expected"]
    assert len(rows) == expected["source_categories"]
    nodes = {r["category_id"]: r for r in rows}
    assert len(nodes) == len(rows), "Duplicate IDs"
    rules = {r["root_category_id"]: r for r in policy["root_rules"]}
    overrides = {r["category_id"]: r for r in policy["branch_overrides"]}
    assert set(rules) == {r["root_category_id"] for r in rows}
    counts, mapping, visible = Counter(), [], []
    for row in rows:
        cid, level = row["category_id"], int(row["level"])
        path = row["full_category_id_path"].split(" > ")
        assert len(path) == level and path[-1] == cid and path[0] == row["root_category_id"]
        assert (level == 1 and row["parent_id"] == "0") or (level > 1 and row["parent_id"] == path[-2] and row["parent_id"] in nodes)
        rule, status, cutoff, origin, bucket = rules[row["root_category_id"]], "excluded_from_ui", None, "root", None
        if rule["visibility"] == "included":
            cutoff = rule["max_visible_level"]
            for ancestor in path:
                if ancestor in overrides:
                    override = overrides[ancestor]
                    assert override["root_category_id"] == row["root_category_id"]
                    cutoff, origin = override["max_visible_level"], f"branch_override:{ancestor}"
                    break
            bucket = path[min(level, cutoff) - 1]
            status = "visible" if level <= cutoff else "rolled_up"
        record = {"id":cid,"parentId":None if row["parent_id"]=="0" else row["parent_id"],"level":level,"name":row["category_name"],"rootId":row["root_category_id"],"path":path,"uiStatus":status,"effectiveCutoffLevel":cutoff,"ruleOrigin":origin,"visibleBucketId":bucket}
        mapping.append(record); counts[status] += 1
        if status == "visible":
            visible.append({k:record[k] for k in ("id","parentId","level","name","rootId","path")}); counts[f"visible_level_{level}"] += 1
    visible_ids = {r["id"] for r in visible}
    assert all(r["level"] == 1 or r["parentId"] in visible_ids for r in visible)
    assert counts["visible"] == expected["visible_total"] and counts["rolled_up"] == expected["rolled_up_total"] and counts["excluded_from_ui"] == expected["excluded_from_ui_total"]
    assert all(counts[f"visible_level_{level}"] == value for level,value in expected["visible_by_level"].items())
    branch = [r for r in mapping if "950792" in r["path"]]
    assert len(branch) == expected["health_alternative_branch_rows"] and all(r["visibleBucketId"] == "950792" for r in branch)
    value = {"version":policy["version"],"sourceSha256":policy["source"]["sha256"],"expected":expected,"sourceCategories":mapping,"visibleCategories":visible}
    public_value = {"version":policy["version"],"categories":visible}
    return {
        "taxonomy_projection.json": (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode(),
        "taxonomy_visible.json": (json.dumps(public_value, ensure_ascii=False, separators=(",", ":")) + "\n").encode(),
    }

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--check",action="store_true"); args=parser.parse_args()
    outputs=derive()
    for filename, output in outputs.items():
        target=DATA / filename
        if args.check: assert target.is_file() and target.read_bytes() == output, f"Missing or stale {filename}"
        else: target.write_bytes(output)
    print("PASS: PartnerLinks taxonomy projection is valid and deterministic")
if __name__ == "__main__": main()
