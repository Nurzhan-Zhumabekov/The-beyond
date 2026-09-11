create table public.assets (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  parent_asset_id uuid references public.assets(id) on delete set null,
  asset_type text not null check (asset_type in ('background', 'poster', 'banner')),
  format text not null check (format in ('png', 'jpg')),
  storage_path text not null check (nullif(btrim(storage_path), '') is not null),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now()
);

create index assets_generation_id_idx on public.assets(generation_id);
create index assets_parent_asset_id_idx on public.assets(parent_asset_id);
create unique index assets_generation_path_version_key
on public.assets(generation_id, storage_path, version);
