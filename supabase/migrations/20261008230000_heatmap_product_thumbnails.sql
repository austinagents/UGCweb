create schema if not exists partnerlinks;

create table if not exists partnerlinks.heatmap_product_thumbnails (
  id bigint generated always as identity primary key,
  category_slug text not null,
  category_name text not null,
  product_id text not null,
  shop_id text not null,
  source_url text not null,
  storage_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size integer not null check (byte_size > 0),
  sha256 text not null,
  sort_order smallint not null check (sort_order between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_slug, sort_order),
  unique (category_slug, shop_id)
);

create index if not exists heatmap_product_thumbnails_category_idx
  on partnerlinks.heatmap_product_thumbnails (category_slug, sort_order);

alter table partnerlinks.heatmap_product_thumbnails enable row level security;

drop policy if exists "Public can read heatmap product thumbnails" on partnerlinks.heatmap_product_thumbnails;
create policy "Public can read heatmap product thumbnails"
  on partnerlinks.heatmap_product_thumbnails
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'heatmap-product-thumbnails',
  'heatmap-product-thumbnails',
  true,
  102400,
  array['image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view heatmap product thumbnails" on storage.objects;
create policy "Public can view heatmap product thumbnails"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'heatmap-product-thumbnails');
