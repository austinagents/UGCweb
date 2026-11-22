#!/usr/bin/env python3
import argparse, csv, json, sqlite3, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('graph');p.add_argument('profiles');p.add_argument('--creator-master');p.add_argument('--avatar-results');p.add_argument('--output',default='data/cloudflare-import/partnerlinks-creator-master.sqlite');a=p.parse_args()
out=ROOT/a.output;out.parent.mkdir(parents=True,exist_ok=True)
if out.exists(): out.unlink()
source=sqlite3.connect(f'file:{Path(a.graph).resolve()}?mode=ro&immutable=1',uri=True)
db=sqlite3.connect(out);db.executescript('''PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
CREATE TABLE creator_master(graph_creator_id TEXT PRIMARY KEY,master_row INTEGER NOT NULL UNIQUE,username TEXT NOT NULL,tiktok_uid TEXT,display_name TEXT,country TEXT,follower_count INTEGER,profile_url TEXT,avatar_object_key TEXT,profile_resolution_status TEXT NOT NULL,canonical_video_count INTEGER NOT NULL,recent_snapshot_video_count INTEGER NOT NULL,latest_video_timestamp INTEGER,ambiguous_video_count INTEGER NOT NULL,verified_product_evidence INTEGER NOT NULL DEFAULT 0,approved_classification_evidence INTEGER NOT NULL DEFAULT 0,gmv_30d REAL,units_sold_30d INTEGER,audience_gender TEXT,audience_gender_percentage REAL,normalized_username TEXT NOT NULL,normalized_display_name TEXT NOT NULL) WITHOUT ROWID;
CREATE INDEX creator_master_username ON creator_master(normalized_username,master_row); CREATE INDEX creator_master_display_name ON creator_master(normalized_display_name,master_row); CREATE INDEX creator_master_uid ON creator_master(tiktok_uid) WHERE tiktok_uid IS NOT NULL;
CREATE TABLE creator_video_evidence(graph_creator_id TEXT PRIMARY KEY,evidence_json TEXT NOT NULL) WITHOUT ROWID;
CREATE TABLE creator_ambiguous_video_evidence(graph_creator_id TEXT PRIMARY KEY,evidence_json TEXT NOT NULL) WITHOUT ROWID;
CREATE TABLE creator_master_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL) WITHOUT ROWID;
''')
profiles={}
with open(a.profiles,encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f): profiles[int(r['master_row'])]=r
commerce_metrics={}
if a.creator_master:
 with open(a.creator_master,encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f): commerce_metrics[int(r['master_row'])]=r
archived_avatars={}
if a.avatar_results:
 with open(a.avatar_results,encoding='utf-8') as f:
  for line in f:
   if not line.strip(): continue
   r=json.loads(line); key=(r.get('object_key') or '').strip()
   if key and r.get('status') in {'stored','already_present'}: archived_avatars[int(r['master_row'])]=key
ins=db.cursor();db.execute('BEGIN')
for r in source.execute('SELECT creator_id,master_row,handle,tiktok_uid,display_name,country,follower_count,total_unique_videos,videos_0_30,latest_video_timestamp,ambiguous_creator_videos,profile_state FROM creators ORDER BY master_row'):
 cid,mr,handle,uid,name,country,followers,videos,recent,latest,ambiguous,state=r;pr=profiles.get(mr,{});cm=commerce_metrics.get(mr,{})
 username=(pr.get('tiktok_username') or handle or pr.get('username') or '').strip();puid=(pr.get('tiktok_uid') or uid or '').strip() or None
 profile=(pr.get('profile_url') or (f'https://www.tiktok.com/@{username}' if username else '')).strip() or None
 avatar=archived_avatars.get(mr) or (pr.get('avatar_object_key') or '').strip() or None; resolution=(pr.get('resolution_status') or state or 'unresolved').strip()
 norm=lambda x:' '.join(''.join(c.lower() if c.isalnum() else ' ' for c in (x or '')).split())
 metric_followers=int(float(cm['followers'])) if cm.get('followers') else followers
 gmv=float(cm['sales']) if cm.get('sales') else None; units=int(float(cm['orders'])) if cm.get('orders') else None
 gender=(cm.get('dominant_gender') or '').strip() or None; gender_pct=float(cm['dominant_gender_pct'].rstrip('%')) if cm.get('dominant_gender_pct') else None
 ins.execute('INSERT INTO creator_master VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(cid,mr,username,puid,name or pr.get('display_name') or '',country,metric_followers,profile,avatar,resolution,videos,recent,latest,ambiguous,0,0,gmv,units,gender,gender_pct,norm(username),norm(name or pr.get('display_name'))))
db.commit()

def write_groups(query,table):
 cur=db.cursor();db.execute('BEGIN');current=None;items=[]
 for cid,vid,ts,state in source.execute(query):
  if current is not None and cid!=current: cur.execute(f'INSERT INTO {table} VALUES(?,?)',(current,json.dumps(items,separators=(',',':'))));items=[]
  current=cid;items.append([vid,ts,state])
 if current is not None: cur.execute(f'INSERT INTO {table} VALUES(?,?)',(current,json.dumps(items,separators=(',',':'))))
 db.commit()
write_groups("SELECT 'creator:'||primary_master_row,video_id,create_timestamp,CASE WHEN attribution_state='single_observed_creator' THEN 'verified_observed' ELSE 'observed_conflict_primary' END FROM videos INDEXED BY idx_videos_creator_time WHERE canonical_inventory=1 AND primary_master_row IS NOT NULL ORDER BY primary_master_row,create_timestamp DESC",'creator_video_evidence')
write_groups("SELECT creator_id,video_id,NULL,confidence_state FROM creator_video_alternate_edges ORDER BY creator_id,video_id",'creator_ambiguous_video_evidence')
projection=json.loads((ROOT/'data/partnerlinks-taxonomy/taxonomy_projection.json').read_text())
approved={r['id'] for r in projection['sourceCategories'] if r.get('visibleBucketId')}
classified={(r[0],) for r in source.execute("SELECT creator_id,category_id FROM creator_category_edges WHERE confidence_state='derived_from_verified_commercial_edges'") if r[1] in approved}
db.executemany("UPDATE creator_master SET approved_classification_evidence=1 WHERE graph_creator_id=?",classified)
db.executemany("UPDATE creator_master SET verified_product_evidence=1 WHERE master_row=?",source.execute("SELECT DISTINCT v.primary_master_row FROM videos v JOIN video_product_edges e USING(video_id) WHERE v.attribution_state='single_observed_creator'"))
meta={'model_version':'partnerlinks-creator-master-v2','source_graph':Path(a.graph).name,'source_profiles':Path(a.profiles).name,'source_creator_master':Path(a.creator_master).name if a.creator_master else 'not_provided','source_avatar_results':Path(a.avatar_results).name if a.avatar_results else 'profile_csv_only','snapshot_30d_end_utc':'2026-11-11T04:07:31Z'}
db.executemany('INSERT INTO creator_master_metadata VALUES(?,?)',meta.items());db.commit();db.execute('ANALYZE');
counts=dict(zip(['total','video_backed','recent','products','classified'],db.execute('SELECT count(*),sum(canonical_video_count>0),sum(recent_snapshot_video_count>0),sum(verified_product_evidence),sum(approved_classification_evidence) FROM creator_master').fetchone()))
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'counts':counts},indent=2));db.close();source.close()
