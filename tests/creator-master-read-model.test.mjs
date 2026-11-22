import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const modelPath = new URL("../data/cloudflare-import/partnerlinks-creator-master.sqlite", import.meta.url).pathname;
const identityPath = new URL("../data/cloudflare-import/creator-v1/partnerlinks-creator-identity-v1.sqlite", import.meta.url).pathname;
const evidencePath = new URL("../data/cloudflare-import/creator-v1/partnerlinks-creator-evidence-v1.sqlite", import.meta.url).pathname;
const accountPath = new URL("../data/cloudflare-import/creator-account-v1/creator-account-resolution-v1.sqlite", import.meta.url).pathname;
const commercePath = new URL("../data/cloudflare-import/partnerlinks-commerce-read-model.sqlite", import.meta.url).pathname;
const options = { skip: !existsSync(modelPath) };

test("creator master reconciles to the approved inventory", options, () => {
  const db = new DatabaseSync(modelPath, { readOnly: true });
  const row = db.prepare(`
    SELECT count(*) AS total,
           sum(canonical_video_count > 0) AS video_backed,
           sum(recent_snapshot_video_count > 0) AS snapshot_recent,
           sum(verified_product_evidence) AS product_linked,
           sum(approved_classification_evidence) AS classified
    FROM creator_master
  `).get();

  assert.deepEqual({ ...row }, {
    total: 540846,
    video_backed: 472994,
    snapshot_recent: 298132,
    product_linked: 118290,
    classified: 111998,
  });
  db.close();
});

test("canonical and ambiguous attribution remain separate", options, () => {
  const db = new DatabaseSync(modelPath, { readOnly: true });
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM creator_video_evidence").get().count,
    472994,
  );
  assert.equal(
    db.prepare(`
      SELECT count(*) AS count
      FROM creator_ambiguous_video_evidence a
      LEFT JOIN creator_master c USING (graph_creator_id)
      WHERE c.graph_creator_id IS NULL
    `).get().count,
    0,
  );
  db.close();
});

test("creator identity and pagination indexes are present", options, () => {
  const db = new DatabaseSync(modelPath, { readOnly: true });
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(({ name }) => name);
  assert.ok(indexes.includes("creator_master_username"));
  assert.ok(indexes.includes("creator_master_display_name"));
  assert.ok(indexes.includes("creator_master_uid"));
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM creator_master WHERE graph_creator_id IS NULL OR username = ''").get().count,
    0,
  );
  db.close();
});

test("versioned D1 artifacts separate identity from evidence without losing rows", { skip:!existsSync(identityPath)||!existsSync(evidencePath) }, () => {
  const identity = new DatabaseSync(identityPath, { readOnly:true });
  const evidence = new DatabaseSync(evidencePath, { readOnly:true });
  assert.equal(identity.prepare("SELECT count(*) count FROM creator_master").get().count,540846);
  assert.equal(identity.prepare("SELECT count(*) count FROM creator_page_anchors").get().count,10817);
  const lastAnchor = identity.prepare("SELECT master_row FROM creator_page_anchors ORDER BY page DESC LIMIT 1").get().master_row;
  assert.deepEqual(
    identity.prepare("SELECT master_row FROM creator_master WHERE master_row >= ? ORDER BY master_row").all(lastAnchor).map(({ master_row }) => master_row),
    identity.prepare("SELECT master_row FROM creator_master ORDER BY master_row DESC LIMIT 46").all().map(({ master_row }) => master_row).reverse(),
  );
  assert.equal(identity.prepare("SELECT count(*) count FROM sqlite_master WHERE name LIKE 'creator_%evidence'").get().count,0);
  assert.equal(evidence.prepare("SELECT count(*) count FROM sqlite_master WHERE name='creator_master'").get().count,0);
  assert.equal(evidence.prepare("SELECT sum(json_array_length(evidence_json)) count FROM creator_video_evidence").get().count,39839796);
  assert.equal(evidence.prepare("SELECT sum(json_array_length(evidence_json)) count FROM creator_ambiguous_video_evidence").get().count,1430561);
  assert.ok(evidence.prepare("SELECT max(length(evidence_json)) size FROM creator_video_evidence").get().size < 2_000_000);
  identity.close(); evidence.close();
});

test("account resolution preserves source identities while deduplicating verified UIDs", { skip:!existsSync(accountPath) }, () => {
  const db=new DatabaseSync(accountPath,{readOnly:true});
  assert.deepEqual({...db.prepare(`SELECT count(*) accounts,sum(source_record_count) source_rows,sum(source_record_count-1) excess FROM creator_accounts`).get()},{accounts:530196,source_rows:540846,excess:10650});
  assert.equal(db.prepare("SELECT count(*) count FROM creator_accounts WHERE tiktok_uid IS NOT NULL").get().count,393703);
  assert.equal(db.prepare("SELECT count(*) count FROM creator_account_members").get().count,540846);
  assert.equal(db.prepare("SELECT count(*) count FROM creator_accounts WHERE source_record_count>1").get().count,9771);
  assert.equal(db.prepare("SELECT count(*) count FROM creator_accounts WHERE source_record_count>1 AND metric_resolution_status='conflict'").get().count,50);
  db.close();
});

test("representative duplicate accounts resolve deterministically with complete counts", { skip:!existsSync(accountPath) }, () => {
  const db=new DatabaseSync(accountPath,{readOnly:true});
  const rows=db.prepare("SELECT username,canonical_graph_creator_id,source_record_count,canonical_video_count FROM creator_accounts WHERE username IN ('alexandriasfindss','wildernessoutdoormedia','chickenpimp') ORDER BY username").all();
  assert.deepEqual(rows.map(row=>({...row})),[
    {username:"alexandriasfindss",canonical_graph_creator_id:"creator:4909",source_record_count:2,canonical_video_count:101},
    {username:"chickenpimp",canonical_graph_creator_id:"creator:141341",source_record_count:7,canonical_video_count:105},
    {username:"wildernessoutdoormedia",canonical_graph_creator_id:"creator:5208",source_record_count:3,canonical_video_count:100},
  ]);
  db.close();
});

test("account resolution leaves commercial and classification attribution pair-unique", { skip:!existsSync(accountPath)||!existsSync(commercePath) }, () => {
  const db=new DatabaseSync(accountPath,{readOnly:true});
  db.exec(`ATTACH '${commercePath.replaceAll("'","''")}' AS commerce`);
  assert.equal(db.prepare("SELECT count(*) count FROM (SELECT graph_creator_id,visible_classification_id,count(*) n FROM commerce.classification_creators GROUP BY graph_creator_id,visible_classification_id HAVING n>1)").get().count,0);
  assert.equal(db.prepare("SELECT count(*) count FROM (SELECT m.account_id,c.visible_classification_id,count(*) n FROM creator_account_members m JOIN commerce.classification_creators c USING(graph_creator_id) GROUP BY m.account_id,c.visible_classification_id HAVING n>1)").get().count,0);
  assert.equal(db.prepare("SELECT value FROM creator_account_metadata WHERE key='duplicate_uid_product_groups'").get().value,"47");
  assert.equal(db.prepare("SELECT value FROM creator_account_metadata WHERE key='duplicate_uid_classified_groups'").get().value,"37");
  db.close();
});
