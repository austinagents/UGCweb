#!/usr/bin/env python3
"""Split the versioned creator-account dump into restart-safe D1 batches."""
import hashlib, json, shutil, sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/cloudflare-import/creator-account-v1/creator-account-resolution-v1.sql'
SOURCE_MANIFEST=ROOT/'data/cloudflare-import/creator-account-v1/manifest.json'
OUT=ROOT/'data/cloudflare-import/creator-account-v1/d1-chunks'
MAX_BYTES=8*1024*1024

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(8*1024*1024),b''):h.update(chunk)
 return h.hexdigest()

manifest=json.loads(SOURCE_MANIFEST.read_text())
if SOURCE.stat().st_size!=manifest['migrationBytes'] or digest(SOURCE)!=manifest['migrationSha256']:
 raise SystemExit('Source SQL does not match the authoritative manifest')
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir(parents=True)

database=sqlite3.connect(f"file:{ROOT/'data/cloudflare-import/creator-account-v1/creator-account-resolution-v1.sqlite'}?mode=ro&immutable=1",uri=True)
schema=[]
for kind,name,sql in database.execute("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END,name"):
 if kind=='table':sql=sql.replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ',1)
 elif sql.startswith('CREATE UNIQUE INDEX '):sql=sql.replace('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ',1)
 else:sql=sql.replace('CREATE INDEX ','CREATE INDEX IF NOT EXISTS ',1)
 schema.append(sql+';')
database.close()
inserts=[]
for line in SOURCE.read_text().splitlines():
 stripped=line.strip()
 if not stripped or stripped in {'BEGIN TRANSACTION;','COMMIT;','ANALYZE;'} or stripped.startswith('PRAGMA '):continue
 if stripped.startswith('INSERT INTO '):inserts.append(line.replace('INSERT INTO ','INSERT OR IGNORE INTO ',1))

schema_path=OUT/'0000-schema.sql'
schema_path.write_text('\n'.join(schema+["CREATE TABLE IF NOT EXISTS creator_account_migration_progress(chunk_name TEXT PRIMARY KEY,chunk_sha256 TEXT NOT NULL,applied_at TEXT NOT NULL) WITHOUT ROWID;"])+'\n')
chunks=[]; current=[]; size=0
def flush():
 global current,size
 if not current:return
 number=len(chunks)+1; name=f'{number:04d}-data.sql'; path=OUT/name
 body='\n'.join(current)+'\n'; payload_hash=hashlib.sha256(body.encode()).hexdigest()
 body+=f"INSERT OR REPLACE INTO creator_account_migration_progress VALUES('{name}','{payload_hash}',datetime('now'));\n"
 path.write_text(body);chunks.append({'file':name,'bytes':path.stat().st_size,'sha256':digest(path),'payloadSha256':payload_hash,'statements':len(current)+1});current=[];size=0
for statement in inserts:
 encoded=len(statement.encode())+1
 if current and size+encoded>MAX_BYTES:flush()
 current.append(statement);size+=encoded
flush()
result={'version':'partnerlinks-creator-account-d1-v1','source':str(SOURCE.relative_to(ROOT)),'sourceBytes':SOURCE.stat().st_size,'sourceSha256':digest(SOURCE),'schema':{'file':schema_path.name,'bytes':schema_path.stat().st_size,'sha256':digest(schema_path)},'chunks':chunks}
(OUT/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'chunks':len(chunks),'bytes':sum(c['bytes'] for c in chunks),'schema':result['schema']},indent=2))
