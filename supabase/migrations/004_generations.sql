create table public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_type text not null check (source_type in ('text', 'url')),
  source_text text,
  source_url text,
  language text not null default 'auto',
  output_type text not null
    check (output_type in ('background', 'poster', 'banner', 'media_pack')),
  campaign_name text,
  image_style text,
  additional_instructions text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  title text,
  key_points jsonb not null default '[]'::jsonb
    check (jsonb_typeof(key_points) = 'array'),
  social_posts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(social_posts) = 'object'),
  image_prompt text,
  llm_calls integer not null default 0 check (llm_calls >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost numeric(12, 6) not null default 0 check (estimated_cost >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generations_source_matches_type check (
    (
      source_type = 'text'
      and nullif(btrim(source_text), '') is not null
      and source_url is null
    )
    or
    (
      source_type = 'url'
      and nullif(btrim(source_url), '') is not null
      and source_text is null
    )
  )
);

create index generations_project_id_created_at_idx
on public.generations(project_id, created_at desc);

create trigger generations_set_updated_at
before update on public.generations
for each row execute function public.set_updated_at();
