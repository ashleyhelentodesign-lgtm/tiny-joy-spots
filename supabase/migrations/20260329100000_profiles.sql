-- Optional per-device profiles (no auth). Tied to joy_spots via device_id header/cookie.

-- Per-spot dominant color (hex) for profile avatar assignment; populated when media is processed.
alter table public.joy_spots
  add column if not exists dominant_color text;

comment on column public.joy_spots.dominant_color is
  'Optional #RRGGBB extracted from the submission; used to pick profile avatar_color.';

alter table public.joy_spots
  drop constraint if exists joy_spots_dominant_color_hex_check;

alter table public.joy_spots
  add constraint joy_spots_dominant_color_hex_check
  check (
    dominant_color is null
    or dominant_color ~ '^#[0-9A-Fa-f]{6}$'
  );

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  display_name text not null,
  bio text,
  avatar_color text not null,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_nonempty check (length(trim(display_name)) > 0),
  constraint profiles_bio_max_length check (bio is null or length(bio) <= 160),
  constraint profiles_avatar_color_hex check (avatar_color ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index profiles_device_id_unique_idx
  on public.profiles (trim(lower(device_id)));

create index profiles_created_at_idx
  on public.profiles (created_at desc);

comment on table public.profiles is
  'Optional display profile for a browser device. Not required to submit joy spots.';

comment on column public.profiles.device_id is
  'Normalized device id (trim + lower); one profile per device.';

comment on column public.profiles.avatar_color is
  'Auto-assigned on insert from dominant submission color or palette fallback.';

-- App UI palette (terracotta, tag brown, explorer taupe, etc.)
create or replace function public.profile_avatar_palette()
returns text[]
language sql
immutable
as $$
  select array[
    '#C17B5A',
    '#897c70',
    '#8B7E74',
    '#7A9E87',
    '#b06d4e',
    '#a89b8f',
    '#6d625a',
    '#a34a38'
  ]::text[];
$$;

create or replace function public.pick_profile_avatar_color(p_device_id text)
returns text
language plpgsql
stable
as $$
declare
  v_device text;
  v_color text;
  v_palette text[];
  v_idx int;
begin
  v_device := nullif(trim(lower(p_device_id)), '');

  if v_device is not null then
    select lower(js.dominant_color)
    into v_color
    from public.joy_spots js
    where trim(lower(js.device_id)) = v_device
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

comment on function public.pick_profile_avatar_color(text) is
  'Most common joy_spots.dominant_color for the device, else random profile_avatar_palette() entry.';

create or replace function public.profiles_before_write()
returns trigger
language plpgsql
as $$
begin
  NEW.device_id := trim(lower(NEW.device_id));
  NEW.display_name := trim(NEW.display_name);

  if NEW.bio is not null then
    NEW.bio := nullif(trim(NEW.bio), '');
  end if;

  if tg_op = 'INSERT' then
    NEW.avatar_color := public.pick_profile_avatar_color(NEW.device_id);
  end if;

  return NEW;
end;
$$;

create trigger profiles_before_insert
  before insert on public.profiles
  for each row
  execute function public.profiles_before_write();

create trigger profiles_before_update
  before update on public.profiles
  for each row
  execute function public.profiles_before_write();

alter table public.profiles enable row level security;

-- Public read (for showing names/avatars on spots later)
create policy "profiles_select_all"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_own_device"
  on public.profiles
  for insert
  to anon, authenticated
  with check (
    device_id is not null
    and trim(lower(device_id)) = public.request_device_id()
    and public.request_device_id() is not null
  );

create policy "profiles_update_own_device"
  on public.profiles
  for update
  to anon, authenticated
  using (trim(lower(device_id)) = public.request_device_id())
  with check (trim(lower(device_id)) = public.request_device_id());

create policy "profiles_delete_own_device"
  on public.profiles
  for delete
  to anon, authenticated
  using (trim(lower(device_id)) = public.request_device_id());

grant select, insert, update, delete on table public.profiles to anon, authenticated;
