create table public.brandbooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  brand_name text,
  light_logo_path text,
  dark_logo_path text,
  primary_color text not null default '#2563EB'
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#FFFFFF'
    check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  overlay_color text not null default '#000000'
    check (overlay_color ~ '^#[0-9A-Fa-f]{6}$'),
  overlay_opacity numeric not null default 0.40
    check (overlay_opacity between 0 and 1),
  heading_font text not null default 'Inter',
  body_font text not null default 'Inter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brandbooks_project_id_idx on public.brandbooks(project_id);

create trigger brandbooks_set_updated_at
before update on public.brandbooks
for each row execute function public.set_updated_at();
