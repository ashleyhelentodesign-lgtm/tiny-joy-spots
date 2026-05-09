-- Joy Spots schema + RLS tied to a per-device id sent on each API request.
--
-- Browsers do not send your app cookie to Supabase’s API host. Read the device id
-- from the cookie in your app and pass it on the Supabase client, e.g.:
--   createBrowserClient(url, key, { global: { headers: { 'x-device-id': deviceId } } } })
-- RLS below compares rows to trim(lower(current_setting ...)) — use the same normalization
-- when you set the cookie/header so values match.

create or replace function public.request_device_id()
returns text
language sql
stable
as $$
  select nullif(
    trim(lower((current_setting('request.headers', true)::json ->> 'x-device-id'))),
    ''
  );
$$;

comment on function public.request_device_id() is
  'Device id from the x-device-id request header (sync from your cookie in the client).';

create table public.joy_spots (
  id uuid primary key default gen_random_uuid(),
  photo_url text,
  text_content text not null default '',
  "date" date not null,
  location_text text not null default '',
  created_at timestamptz not null default now(),
  device_id text not null
);

create index joy_spots_device_id_idx on public.joy_spots (device_id);
create index joy_spots_created_at_idx on public.joy_spots (created_at desc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.joy_spot_tags (
  joy_spot_id uuid not null references public.joy_spots (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (joy_spot_id, tag_id)
);

create index joy_spot_tags_tag_id_idx on public.joy_spot_tags (tag_id);

alter table public.joy_spots enable row level security;
alter table public.tags enable row level security;
alter table public.joy_spot_tags enable row level security;

-- joy_spots: public read; writes only when row device_id matches header
create policy "joy_spots_select_all"
  on public.joy_spots
  for select
  to anon, authenticated
  using (true);

create policy "joy_spots_insert_own_device"
  on public.joy_spots
  for insert
  to anon, authenticated
  with check (
    device_id is not null
    and trim(lower(device_id)) = public.request_device_id()
    and public.request_device_id() is not null
  );

create policy "joy_spots_update_own_device"
  on public.joy_spots
  for update
  to anon, authenticated
  using (trim(lower(device_id)) = public.request_device_id())
  with check (trim(lower(device_id)) = public.request_device_id());

create policy "joy_spots_delete_own_device"
  on public.joy_spots
  for delete
  to anon, authenticated
  using (trim(lower(device_id)) = public.request_device_id());

-- tags: readable by everyone; inserts allowed (adjust if you want curated tags only)
create policy "tags_select_all"
  on public.tags
  for select
  to anon, authenticated
  using (true);

create policy "tags_insert_any"
  on public.tags
  for insert
  to anon, authenticated
  with check (length(trim(name)) > 0);

-- junction: manage links only for spots you own (same device header)
create policy "joy_spot_tags_select_all"
  on public.joy_spot_tags
  for select
  to anon, authenticated
  using (true);

create policy "joy_spot_tags_insert_own_spot"
  on public.joy_spot_tags
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.joy_spots j
      where j.id = joy_spot_id
        and trim(lower(j.device_id)) = public.request_device_id()
    )
    and public.request_device_id() is not null
  );

create policy "joy_spot_tags_delete_own_spot"
  on public.joy_spot_tags
  for delete
  to anon, authenticated
  using (
    exists (
      select 1
      from public.joy_spots j
      where j.id = joy_spot_id
        and trim(lower(j.device_id)) = public.request_device_id()
    )
  );

grant execute on function public.request_device_id() to anon, authenticated;

grant select, insert, update, delete on table public.joy_spots to anon, authenticated;
grant select, insert on table public.tags to anon, authenticated;
grant select, insert, delete on table public.joy_spot_tags to anon, authenticated;
