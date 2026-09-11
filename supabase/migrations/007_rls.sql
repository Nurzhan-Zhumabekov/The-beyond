alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.brandbooks enable row level security;
alter table public.generations enable row level security;
alter table public.assets enable row level security;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "projects_select_own"
on public.projects for select to authenticated
using (user_id = (select auth.uid()));

create policy "projects_insert_own"
on public.projects for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "projects_update_own"
on public.projects for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "projects_delete_own"
on public.projects for delete to authenticated
using (user_id = (select auth.uid()));

create policy "brandbooks_select_through_project"
on public.brandbooks for select to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = brandbooks.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "brandbooks_insert_through_project"
on public.brandbooks for insert to authenticated
with check (
  exists (
    select 1 from public.projects
    where projects.id = brandbooks.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "brandbooks_update_through_project"
on public.brandbooks for update to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = brandbooks.project_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = brandbooks.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "brandbooks_delete_through_project"
on public.brandbooks for delete to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = brandbooks.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "generations_select_through_project"
on public.generations for select to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = generations.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "generations_insert_through_project"
on public.generations for insert to authenticated
with check (
  exists (
    select 1 from public.projects
    where projects.id = generations.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "generations_update_through_project"
on public.generations for update to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = generations.project_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = generations.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "generations_delete_through_project"
on public.generations for delete to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = generations.project_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "assets_select_through_project"
on public.assets for select to authenticated
using (
  exists (
    select 1
    from public.generations
    join public.projects on projects.id = generations.project_id
    where generations.id = assets.generation_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "assets_insert_through_project"
on public.assets for insert to authenticated
with check (
  exists (
    select 1
    from public.generations
    join public.projects on projects.id = generations.project_id
    where generations.id = assets.generation_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "assets_update_through_project"
on public.assets for update to authenticated
using (
  exists (
    select 1
    from public.generations
    join public.projects on projects.id = generations.project_id
    where generations.id = assets.generation_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.generations
    join public.projects on projects.id = generations.project_id
    where generations.id = assets.generation_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "assets_delete_through_project"
on public.assets for delete to authenticated
using (
  exists (
    select 1
    from public.generations
    join public.projects on projects.id = generations.project_id
    where generations.id = assets.generation_id
      and projects.user_id = (select auth.uid())
  )
);

create policy "storage_select_own_prefix"
on storage.objects for select to authenticated
using (
  bucket_id in ('brand-assets', 'generated-assets')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage_insert_own_prefix"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('brand-assets', 'generated-assets')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage_update_own_prefix"
on storage.objects for update to authenticated
using (
  bucket_id in ('brand-assets', 'generated-assets')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('brand-assets', 'generated-assets')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage_delete_own_prefix"
on storage.objects for delete to authenticated
using (
  bucket_id in ('brand-assets', 'generated-assets')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
