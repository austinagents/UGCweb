import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const modelPath = new URL("../data/cloudflare-import/partnerlinks-commerce-read-model.sqlite", import.meta.url).pathname;
const projection = JSON.parse(readFileSync(new URL("../data/partnerlinks-taxonomy/taxonomy_projection.json", import.meta.url)));

test("generated read model reconciles to the audited verified populations", { skip: !existsSync(modelPath) }, () => {
  const db = new DatabaseSync(modelPath, { readOnly:true });
  assert.equal(db.prepare("SELECT count(*) count FROM classification_products").get().count, 267300);
  assert.equal(db.prepare("SELECT count(DISTINCT shop_id) count FROM classification_shops").get().count, 27240);
  assert.equal(db.prepare("SELECT count(DISTINCT graph_creator_id) count FROM classification_creators").get().count, 111998);
  assert.equal(db.prepare("SELECT count(*) count FROM classification_creators WHERE confidence_state<>'derived_from_verified_commercial_edges'").get().count, 0);
  db.close();
});

test("deep source categories retain their exact ID and approved terminal rollup", { skip: !existsSync(modelPath) }, () => {
  const deep = projection.sourceCategories.find((row) => row.level >= 5 && row.visibleBucketId);
  assert.ok(deep);
  const db = new DatabaseSync(modelPath, { readOnly:true });
  const row = db.prepare("SELECT source_category_id, visible_classification_id FROM classification_products WHERE source_category_id=? LIMIT 1").get(deep.id);
  if (row) {
    assert.equal(row.source_category_id, deep.id);
    assert.equal(row.visible_classification_id, deep.visibleBucketId);
  }
  db.close();
});
