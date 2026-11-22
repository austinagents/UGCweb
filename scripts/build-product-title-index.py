"""Export exact-ID product titles for public graph products into Worker assets."""
import argparse
import json
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("read_model", type=Path)
parser.add_argument("scrape_root", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()

with sqlite3.connect(args.read_model.resolve().as_uri() + "?mode=ro", uri=True) as db:
    product_ids = {row[0] for row in db.execute("SELECT DISTINCT product_id FROM classification_products")}

root = args.scrape_root
run = root / "product_metadata_pdp_remaining_356505_v20261113_01"
captures = [run / "results.jsonl", *sorted(run.glob("historical_node_fetch_pass_*/worker_*.jsonl"))]
archives = sorted(run.glob("*recovery_pass_*/recovered_products.jsonl"))
component_capture = root / "tiktok_pdp_metadata_test_first100_v20261113_01/resolved_component_data.jsonl"
titles = {}


def add_title(product_id, title, observed_at):
    if product_id not in product_ids or not isinstance(title, str):
        return
    title = " ".join(title.split())
    if not title or len(title) > 600:
        return
    stamp = observed_at or ""
    previous = titles.get(product_id)
    if previous is None or (stamp, title) > previous:
        titles[product_id] = (stamp, title)


for path in captures + archives + [component_capture]:
    with path.open(encoding="utf-8") as file:
        for line in file:
            if not line.strip():
                continue
            row = json.loads(line)
            product_id = str(row.get("product_id", ""))
            if product_id not in product_ids:
                continue
            if path == component_capture:
                product = row.get("component_data", {}).get("product_info", {})
                if str(product.get("product_id", "")) == product_id:
                    add_title(product_id, product.get("title"), "")
            elif path in archives:
                url = urlparse(row.get("product_url") or "")
                if url.hostname == "shop.tiktok.com" and url.path.rstrip("/").endswith("/" + product_id):
                    add_title(product_id, row.get("title"), "")
            elif row.get("outcome") == "resolved" and row.get("exact_id_match") is True and str(row.get("embedded_product_id")) == product_id:
                add_title(product_id, row.get("title"), row.get("observed_at_utc"))

shards = {}
for product_id, (_, title) in sorted(titles.items()):
    shards.setdefault(product_id[-3:], {})[product_id] = title
args.output.mkdir(parents=True, exist_ok=True)
for shard, values in shards.items():
    (args.output / f"{shard}.json").write_text(json.dumps(values, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(titles):,} titled products of {len(product_ids):,} graph products ({len(shards)} assets)")
