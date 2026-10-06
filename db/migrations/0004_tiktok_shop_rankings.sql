CREATE TABLE partnerlinks.tiktok_shop_entities (
  shop_id text PRIMARY KEY,
  shop_name text,
  shop_thumb_image_url text,
  shop_status text,
  shop_share_link text,
  tiktok_username text,
  tiktok_profile_url text,
  tiktok_profile_source text,
  tiktok_profile_verified_at timestamptz,
  identity_source_category_id text,
  identity_source_category_name text,
  identity_source_window text,
  identity_source_page integer,
  identity_source_file text,
  identity_captured_at timestamptz NOT NULL,
  CHECK ((tiktok_username IS NULL) = (tiktok_profile_url IS NULL)),
  CHECK (tiktok_profile_url IS NULL OR tiktok_profile_url LIKE 'https://www.tiktok.com/@%')
);

CREATE TABLE partnerlinks.tiktok_shop_category_projections (
  shop_id text NOT NULL REFERENCES partnerlinks.tiktok_shop_entities(shop_id) ON DELETE CASCADE,
  category_id text NOT NULL,
  category_name text NOT NULL,
  PRIMARY KEY (shop_id, category_id)
);

CREATE INDEX tiktok_shop_projection_category_idx
  ON partnerlinks.tiktok_shop_category_projections (category_id, shop_id);

CREATE TABLE partnerlinks.tiktok_shop_ranking_observations (
  shop_id text NOT NULL,
  category_id text NOT NULL,
  category_name text NOT NULL,
  ranking_window text NOT NULL CHECK (ranking_window IN ('1d', '7d', '30d')),
  capture_date date NOT NULL,
  captured_at timestamptz NOT NULL,
  source_page integer NOT NULL,
  source_file text NOT NULL,
  source_row_index integer NOT NULL,
  reported_partition_total integer NOT NULL,
  api_interval_start_date date,
  api_interval_end_date date,
  total_gmv_rank bigint,
  total_gmv_previous_rank bigint,
  total_gmv_rank_change bigint,
  product_card_gmv_rank bigint,
  product_card_gmv_previous_rank bigint,
  product_card_gmv_rank_change bigint,
  live_gmv_rank bigint,
  live_gmv_previous_rank bigint,
  live_gmv_rank_change bigint,
  video_gmv_rank bigint,
  video_gmv_previous_rank bigint,
  video_gmv_rank_change bigint,
  raw_rank_family jsonb NOT NULL,
  PRIMARY KEY (shop_id, category_id, ranking_window),
  FOREIGN KEY (shop_id, category_id)
    REFERENCES partnerlinks.tiktok_shop_category_projections(shop_id, category_id) ON DELETE CASCADE
);

CREATE INDEX tiktok_shop_rank_total_idx
  ON partnerlinks.tiktok_shop_ranking_observations (ranking_window, category_id, total_gmv_rank, shop_id);
CREATE INDEX tiktok_shop_rank_product_idx
  ON partnerlinks.tiktok_shop_ranking_observations (ranking_window, category_id, product_card_gmv_rank, shop_id);
CREATE INDEX tiktok_shop_rank_live_idx
  ON partnerlinks.tiktok_shop_ranking_observations (ranking_window, category_id, live_gmv_rank, shop_id);
CREATE INDEX tiktok_shop_rank_video_idx
  ON partnerlinks.tiktok_shop_ranking_observations (ranking_window, category_id, video_gmv_rank, shop_id);

GRANT SELECT ON partnerlinks.tiktok_shop_entities TO partnerlinks_web_read;
GRANT SELECT ON partnerlinks.tiktok_shop_category_projections TO partnerlinks_web_read;
GRANT SELECT ON partnerlinks.tiktok_shop_ranking_observations TO partnerlinks_web_read;
GRANT SELECT, INSERT, UPDATE, TRUNCATE ON partnerlinks.tiktok_shop_entities TO partnerlinks_ingest;
GRANT SELECT, INSERT, UPDATE, TRUNCATE ON partnerlinks.tiktok_shop_category_projections TO partnerlinks_ingest;
GRANT SELECT, INSERT, UPDATE, TRUNCATE ON partnerlinks.tiktok_shop_ranking_observations TO partnerlinks_ingest;
