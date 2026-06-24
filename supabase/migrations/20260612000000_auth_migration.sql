-- Switch from device_id attribution to auth.users for ownership.
--
-- joy_spots  : add nullable user_id FK (auth.users); device_id kept for anon fallback.
-- profiles   : add user_id FK (auth.users), make device_id nullable, update RLS.
-- user_color_profiles : replace device_id PK with user_id PK (data is fully derived).

-- ─── joy_spots ────────────────────────────────────────────────────────────────

alter table public.joy_spots
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists joy_spots_user_id_idx
  on public.joy_spots (user_id)
  where user_id is not null;

comment on column public.joy_spots.user_id is
  'Authenticated owner; null for anonymous posts. device_id kept for anon-deletion fallback.';

drop policy if exists "joy_spots_insert_own_device" on public.joy_spots;
drop policy if exists "joy_spots_update_own_device" on public.joy_spots;
drop policy if exists "joy_spots_delete_own_device" on public.joy_spots;

-- Insert: auth users supply user_id = auth.uid(); anon use device header.
create policy "joy_spots_insert_own"
  on public.joy_spots
  for insert
  to anon, authenticated
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (
      auth.uid() is null
      and user_id is null
      and device_id is not null
      and trim(lower(device_id)) = public.request_device_id()
      and public.request_device_id() is not null
    )
  );

-- Update: auth users by user_id; anon by device header.
create policy "joy_spots_update_own"
  on public.joy_spots
  for update
  to anon, authenticated
  using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and trim(lower(device_id)) = public.request_device_id())
  )
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and trim(lower(device_id)) = public.request_device_id())
  );

-- Delete: authenticated only via RLS; anon deletion goes through a service-role API route.
create policy "joy_spots_delete_own"
  on public.joy_spots
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── profiles ─────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
  alter column device_id drop not null;

create unique index if not exists profiles_user_id_unique_idx
  on public.profiles (user_id)
  where user_id is not null;

comment on column public.profiles.user_id is
  'auth.users.id for the owning account. Legacy device-only profiles have null here.';

-- Avatar-color picker updated to resolve by user_id first, device_id as fallback.
create or replace function public.pick_profile_avatar_color_for_user(
  p_user_id uuid,
  p_device_id text default null
)
returns text
language plpgsql
stable
as $$
declare
  v_color text;
  v_palette text[];
  v_idx int;
begin
  if p_user_id is not null then
    select lower(js.dominant_color)
    into v_color
    from public.joy_spots js
    where js.user_id = p_user_id
      and js.dominant_color is not null
      and trim(js.dominant_color) <> ''
      and js.dominant_color ~ '^#[0-9A-Fa-f]{6}$'
    group by lower(js.dominant_color)
    order by count(*) desc, max(js.created_at) desc
    limit 1;
  end if;

  if v_color is null and p_device_id is not null then
    select lower(js.dominant_color)
    into v_color
    from public.joy_spots js
    where trim(lower(js.device_id)) = trim(lower(p_device_id))
      and js.dominant_color is not null
      and trim(js.dominant_color) <> ''
      and js.dominant_color ~ '^#[0-9A-Fa-f]{6}$'
    group by lower(js.dominant_color)
    order by count(*) desc, max(js.created_at) desc
    limit 1;
  end if;

  if v_color is not null then
    return v_color;
  end if;

  v_palette := public.profile_avatar_palette();
  v_idx := 1 + floor(random() * array_length(v_palette, 1))::int;
  return v_palette[v_idx];
end;
$$;

comment on function public.pick_profile_avatar_color_for_user(uuid, text) is
  'Most common joy_spots dominant_color for the user (by user_id then device_id), else random palette color.';

-- Update write trigger to use new picker and allow nullable device_id.
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
as $$
begin
  if NEW.device_id is not null then
    NEW.device_id := trim(lower(NEW.device_id));
  end if;
  NEW.display_name := trim(NEW.display_name);

  if NEW.bio is not null then
    NEW.bio := nullif(trim(NEW.bio), '');
  end if;

  if tg_op = 'INSERT' then
    NEW.avatar_color := public.pick_profile_avatar_color_for_user(NEW.user_id, NEW.device_id);
  end if;

  return NEW;
end;
$$;

-- Replace device-based policies with auth-based ones.
drop policy if exists "profiles_insert_own_device" on public.profiles;
drop policy if exists "profiles_update_own_device" on public.profiles;
drop policy if exists "profiles_delete_own_device" on public.profiles;

create policy "profiles_insert_own_user"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own_user"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles_delete_own_user"
  on public.profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── user_color_profile (singular — matches live table name) ─────────────────
-- All data here is recomputed from joy_spots on each submission — safe to clear.

truncate table public.user_color_profile;

drop policy if exists "user_color_profiles_insert_own_device" on public.user_color_profile;
drop policy if exists "user_color_profiles_update_own_device" on public.user_color_profile;
drop policy if exists "user_color_profiles_insert_own_profile" on public.user_color_profile;
drop policy if exists "user_color_profiles_update_own_profile" on public.user_color_profile;

alter table public.user_color_profile
  drop constraint if exists user_color_profiles_pkey;

alter table public.user_color_profile
  drop constraint if exists user_color_profile_pkey;

drop index if exists user_color_profiles_device_id_idx;
drop index if exists user_color_profile_device_id_idx;

alter table public.user_color_profile
  drop column if exists device_id;

alter table public.user_color_profile
  drop column if exists profile_id;

alter table public.user_color_profile
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.user_color_profile
  alter column user_id set not null;

alter table public.user_color_profile
  add constraint user_color_profile_pkey primary key (user_id);

create policy "user_color_profile_insert_own_user"
  on public.user_color_profile
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_color_profile_update_own_user"
  on public.user_color_profile
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.user_color_profile to anon, authenticated;

grant execute on function public.pick_profile_avatar_color_for_user(uuid, text) to anon, authenticated;
