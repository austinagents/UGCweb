DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'partnerlinks_web_read') THEN
    CREATE ROLE partnerlinks_web_read NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'partnerlinks_ingest') THEN
    CREATE ROLE partnerlinks_ingest NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'partnerlinks_migrate') THEN
    CREATE ROLE partnerlinks_migrate NOLOGIN;
  END IF;
END $$;

REVOKE CREATE ON SCHEMA partnerlinks FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA partnerlinks FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA partnerlinks FROM PUBLIC;

GRANT USAGE ON SCHEMA partnerlinks TO partnerlinks_web_read;
GRANT SELECT ON
  partnerlinks.ingestion_runs,
  partnerlinks.creators,
  partnerlinks.commerce_categories,
  partnerlinks.tiktok_commerce_categories,
  partnerlinks.commerce_category_mappings,
  partnerlinks.creator_category_memberships,
  partnerlinks.creator_metric_snapshots,
  partnerlinks.creator_current_metrics,
  partnerlinks.creator_discoveries
TO partnerlinks_web_read;

GRANT USAGE ON SCHEMA partnerlinks TO partnerlinks_ingest;
GRANT SELECT, INSERT, UPDATE ON
  partnerlinks.ingestion_runs,
  partnerlinks.creators,
  partnerlinks.commerce_categories,
  partnerlinks.tiktok_commerce_categories,
  partnerlinks.commerce_category_mappings,
  partnerlinks.creator_category_memberships,
  partnerlinks.creator_metric_snapshots,
  partnerlinks.creator_current_metrics,
  partnerlinks.creator_discoveries
TO partnerlinks_ingest;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA partnerlinks TO partnerlinks_ingest;

GRANT ALL ON SCHEMA partnerlinks TO partnerlinks_migrate;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA partnerlinks TO partnerlinks_migrate;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA partnerlinks TO partnerlinks_migrate;

ALTER DEFAULT PRIVILEGES IN SCHEMA partnerlinks
  GRANT USAGE, SELECT ON SEQUENCES TO partnerlinks_ingest;
ALTER DEFAULT PRIVILEGES IN SCHEMA partnerlinks
  GRANT ALL PRIVILEGES ON TABLES TO partnerlinks_migrate;
ALTER DEFAULT PRIVILEGES IN SCHEMA partnerlinks
  GRANT ALL PRIVILEGES ON SEQUENCES TO partnerlinks_migrate;
