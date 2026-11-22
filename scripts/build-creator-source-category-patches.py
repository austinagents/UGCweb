#!/usr/bin/env python3
import csv, json, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/Users/austin/Documents/Codex/2026-11-04/run-a-100-account-tiktok-profile/outputs/TikTok_Creators_Master.csv')
OUT=ROOT/'data/cloudflare-import/creator-source-categories-v1'; OUT.mkdir(parents=True,exist_ok=True)
for p in OUT.glob('*.sql'): p.unlink()
names=['Home Supplies','Kitchenware','Textiles & Soft Furnishings','Household Appliances','Womenswear & Underwear','Shoes','Beauty & Personal Care','Phones & Electronics','Computers & Office Equipment','Pet Supplies','Baby & Maternity','Sports & Outdoor','Toys & Hobbies','Furniture','Tools & Hardware','Home Improvement','Automotive & Motorcycle','Fashion Accessories','Food & Beverages','Health','Books, Magazines & Audio',"Kids' Fashion",'Menswear & Underwear','Luggage & Bags','Virtual Products','Collectibles','Jewelry Accessories & Derivatives']
rows=[]
with SOURCE.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):
  raw=r.get('categories',''); matched=[n for n in names if n in raw]
  rows.append((int(r['master_row']),json.dumps(matched,separators=(',',':'))))
schema="CREATE TABLE IF NOT EXISTS creator_source_categories(master_row INTEGER PRIMARY KEY,categories_json TEXT NOT NULL) WITHOUT ROWID;\nDELETE FROM creator_source_categories;\n"
(OUT/'0000-schema.sql').write_text(schema)
parts=[]
for i,start in enumerate(range(0,len(rows),25000),1):
 p=OUT/f'{i:04d}-data.sql'; lines=['BEGIN;']
 for batch_start in range(start,min(start+25000,len(rows)),500):
  batch=rows[batch_start:min(batch_start+500,start+25000,len(rows))]
  values=','.join(f"({mr},'{cats.replace(chr(39),chr(39)*2)}')" for mr,cats in batch)
  lines.append('INSERT INTO creator_source_categories VALUES '+values+';')
 lines.append('COMMIT;'); p.write_text('\n'.join(lines)+'\n'); parts.append(p)
manifest={'source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'rows':len(rows),'parts':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in parts]}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n'); print(json.dumps({'rows':len(rows),'parts':len(parts)}))
