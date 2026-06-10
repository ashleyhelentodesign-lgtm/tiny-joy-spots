-- Key user color profiles by device_id (matches joy_spots.device_id).

alter table public.user_color_profiles
  drop constraint if exists user_color_profiles_pkey;

alter table public.user_color_profiles
  drop constraint if exists user_color_profiles_profile_id_fkey;

alter table public.user_color_profiles
  add column if not exists device_id text;

update public.user_color_profiles ucp
set device_id = trim(lower(p.device_id))
from public.profiles p
where ucp.profile_id = p.id
  and (ucp.device_id is null or trim(ucp.device_id) = '');

alter table public.user_color_profiles
  drop column if exists profile_id;

delete from public.user_color_profiles
where device_id is null or trim(device_id) = '';

alter table public.user_color_profiles
  alter column device_id set not null;

alter table public.user_color_profiles
  add constraint user_color_profiles_pkey primary key (device_id);

create unique index if not exists user_color_profiles_device_id_idx
  on public.user_color_profiles (device_id);

drop policy if exists "user_color_profiles_insert_own_profile" on public.user_color_profiles;
drop policy if exists "user_color_profiles_update_own_profile" on public.user_color_profiles;

create policy "user_color_profiles_insert_own_device"
  on public.user_color_profiles
  for insert
  to anon, authenticated
  with check (
    trim(lower(device_id)) = public.request_device_id()
    and public.request_device_id() is not null
  );

create policy "user_color_profiles_update_own_device"
  on public.user_color_profiles
  for update
  to anon, authenticated
  using (
    trim(lower(device_id)) = public.request_device_id()
  )
  with check (
    trim(lower(device_id)) = public.request_device_id()
  );
