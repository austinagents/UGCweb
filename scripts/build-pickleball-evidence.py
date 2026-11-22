"""Build a topic from exact product, seller, shop, and creator graph links."""
import argparse
import json
import re
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("graph", type=Path)
args = parser.parse_args()
pattern = re.compile(r"\bpickleball\b", re.I)
products = sorted({
    identifier
    for shard in Path("public/graph-product-titles-v1").glob("*.json")
    for identifier, title in json.loads(shard.read_text()).items()
    if pattern.search(title)
})
with sqlite3.connect(args.graph.resolve().as_uri() + "?mode=ro&immutable=1", uri=True) as db:
    db.row_factory = sqlite3.Row
    params = (json.dumps(products),)
    shops = [dict(row) for row in db.execute("""
      SELECT ss.shop_id, count(DISTINCT ps.product_id) product_count,
        sum(ps.video_count) video_count, sum(ps.recent_30_video_count) recent_count
      FROM json_each(?) ids JOIN product_seller_edges ps ON ps.product_id=ids.value
      JOIN seller_shop_edges ss USING(seller_id)
      WHERE ps.confidence_state='verified_exact'
        AND ss.seller_id IN (SELECT seller_id FROM seller_shop_edges GROUP BY seller_id HAVING count(*)=1)
      GROUP BY ss.shop_id ORDER BY ss.shop_id
    """, params)]
    creators = [dict(row) for row in db.execute("""
      SELECT c.creator_id graph_creator_id, c.tiktok_uid, c.handle, c.display_name, c.follower_count,
        count(DISTINCT vp.product_id) product_count, count(DISTINCT vp.video_id) video_count,
        count(DISTINCT CASE WHEN vp.recent_30=1 THEN vp.video_id END) recent_count,
        max(vp.latest_observed_timestamp) latest_observed_timestamp
      FROM json_each(?) ids JOIN video_product_edges vp ON vp.product_id=ids.value
      JOIN videos v USING(video_id) JOIN creators c ON c.master_row=v.primary_master_row
      WHERE vp.relationship_state='verified_exact' AND v.attribution_state='single_observed_creator'
      GROUP BY c.creator_id ORDER BY c.creator_id
    """, params)]
Path("data/graph-topics/pickleball.json").write_text(json.dumps({
    "products": products, "shops": shops, "creators": creators,
}, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"{len(products)} products, {len(shops)} shops, {len(creators)} creator records")
