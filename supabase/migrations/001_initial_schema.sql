create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  momentum_score numeric default 0,
  growth_24h numeric default 0,
  growth_7d numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  long_description text,
  category text not null,
  categories text[] default '{}',
  raw_source_categories text[] default '{}',
  logo_url text,
  official_logo_url text,
  favicon_url text,
  logo_source text,
  website_url text,
  company text,
  pricing_type text,
  pricing_tiers text[] default '{}',
  pricing_summary text,
  launch_date date,
  tags text[] default '{}',
  supported_platforms text[] default '{}',
  integrations text[] default '{}',
  api_available boolean default false,
  open_source boolean default false,
  screenshots text[] default '{}',
  use_cases text[] default '{}',
  related_tools text[] default '{}',
  competitors text[] default '{}',
  lifecycle_state text,
  attention_score numeric default 0,
  momentum_score numeric default 0,
  creator_score numeric default 0,
  workflow_score numeric default 0,
  breakout_score numeric default 0,
  mentions_24h integer default 0,
  mentions_7d integer default 0,
  saves_count integer default 0,
  growth_24h numeric default 0,
  growth_7d numeric default 0,
  estimated_users integer default 0,
  size_class text,
  baseline_attention numeric default 0,
  relative_growth_vs_baseline numeric default 0,
  recent_velocity numeric default 0,
  acceleration numeric default 0,
  organic_trending_score numeric default 0,
  organic_ranking_label text default 'Trending',
  listing_score numeric default 0,
  trusted_discovery_sources text[] default '{}',
  listing_status text default 'pending_source',
  listing_checks jsonb default '{}'::jsonb,
  boost_eligible boolean default false,
  workflow_eligible boolean default false,
  creator_signal_eligible boolean default false,
  source_urls text[] default '{}',
  source_url text,
  source_confidence numeric default 0,
  verification_signals text[] default '{}',
  imported_from text,
  imported_at timestamptz,
  taaft_rank integer,
  quality_score numeric default 0,
  suppressed boolean default false,
  abandoned boolean default false,
  trend_history jsonb default '[]'::jsonb,
  sparkline jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tool_metrics (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id) on delete cascade,
  timestamp timestamptz not null default now(),
  attention_score numeric default 0,
  mentions integer default 0,
  creator_mentions integer default 0,
  saves integer default 0,
  workflow_inclusions integer default 0,
  search_interest numeric default 0
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  outcome text,
  momentum_score numeric default 0,
  growth_24h numeric default 0,
  growth_7d numeric default 0,
  saves_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workflow_tools (
  workflow_id uuid references workflows(id) on delete cascade,
  tool_id uuid references tools(id) on delete cascade,
  primary key (workflow_id, tool_id)
);

create table if not exists movement_events (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id) on delete set null,
  workflow_id uuid references workflows(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  event_type text not null,
  source_url text,
  timestamp timestamptz not null default now()
);

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  platform text,
  profile_url text
);

create table if not exists creator_tool_mentions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  tool_id uuid references tools(id) on delete cascade,
  source_url text,
  timestamp timestamptz not null default now(),
  context text
);

create table if not exists ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  url text,
  enabled boolean default true,
  last_checked_at timestamptz
);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  target_count integer default 0,
  discovered_count integer default 0,
  imported_count integer default 0,
  accepted_count integer default 0,
  pending_review_count integer default 0,
  duplicate_merge_count integer default 0,
  logos_downloaded integer default 0,
  fallback_logos integer default 0,
  report jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists discovery_edges (
  id uuid primary key default gen_random_uuid(),
  from_tool_id uuid references tools(id) on delete cascade,
  to_tool_id uuid references tools(id) on delete cascade,
  from_slug text,
  to_slug text,
  edge_type text not null,
  strength numeric default 0,
  reason text,
  narrative text,
  evidence_source text,
  created_at timestamptz default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  contact_email text,
  created_at timestamptz default now()
);

create table if not exists boost_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references sponsors(id) on delete set null,
  tool_id uuid references tools(id) on delete cascade,
  tier_label text,
  multiplier integer default 0,
  placement text,
  priority_weight numeric default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  status text default 'scheduled',
  impressions integer default 0,
  clicks integer default 0,
  ctr numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tools_category_idx on tools(category);
create index if not exists tools_momentum_idx on tools(momentum_score desc);
create index if not exists tools_organic_trending_idx on tools(organic_trending_score desc);
create index if not exists tools_listing_status_idx on tools(listing_status);
create index if not exists tools_taaft_rank_idx on tools(taaft_rank);
create index if not exists tool_metrics_tool_time_idx on tool_metrics(tool_id, timestamp desc);
create index if not exists movement_events_timestamp_idx on movement_events(timestamp desc);
create index if not exists discovery_edges_from_tool_idx on discovery_edges(from_tool_id);
create index if not exists discovery_edges_strength_idx on discovery_edges(strength desc);
create index if not exists boost_campaigns_status_idx on boost_campaigns(status, expires_at);
