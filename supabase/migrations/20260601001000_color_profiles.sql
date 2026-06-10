-- Multi-color extraction and rolling user color profiles.

-- 1) Replace single dominant color usage with per-photo weighted color entries.
alter table public.joy_spots
  add column if not exists extracted_colors jsonb;

comment on column public.joy_spots.extracted_colors is
  'Weighted extracted colors per photo: [{hex,h,s,l,weight}] where weight is 3/2/1 by dominance rank.';

alter table public.joy_spots
  drop constraint if exists joy_spots_extracted_colors_is_array_check;

alter table public.joy_spots
  add constraint joy_spots_extracted_colors_is_array_check
  check (
    extracted_colors is null
    or jsonb_typeof(extracted_colors) = 'array'
  );

-- Backfill existing dominant_color into extracted_colors.
update public.joy_spots
set extracted_colors = jsonb_build_array(
  jsonb_build_object(
    'hex', lower(trim(dominant_color)),
    'h', round((degrees(
      atan2(
        sqrt(3) * (
          ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int) -
           ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int))
        ),
        (2 * ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)) -
        ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)) -
        ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
      )
    ) + 360)::numeric % 360, 2),
    's',
    round(
      (
        (
          greatest(
            ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
          )::numeric / 255
        ) -
        (
          least(
            ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
          )::numeric / 255
        )
      ) /
      nullif(
        1 - abs(
          (
            (
              greatest(
                ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
                ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
                ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
              )::numeric / 255
            ) +
            (
              least(
                ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
                ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
                ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
              )::numeric / 255
            )
          ) - 1
        ),
        0
      ) * 100,
      2
    ),
    'l',
    round(
      (
        (
          greatest(
            ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
          )::numeric / 255
        ) +
        (
          least(
            ((('x' || substr(lower(trim(dominant_color)), 3, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 5, 2))::bit(8)::int)),
            ((('x' || substr(lower(trim(dominant_color)), 7, 2))::bit(8)::int))
          )::numeric / 255
        )
      ) * 50,
      2
    ),
    'weight', 3
  )
)
where extracted_colors is null
  and dominant_color is not null
  and trim(dominant_color) ~ '^#[0-9A-Fa-f]{6}$';

-- 2) Rolling per-user color profile store.
create table if not exists public.user_color_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  submission_count int not null default 0,
  hue_buckets jsonb not null default '{}'::jsonb,
  avg_saturation numeric not null default 0,
  avg_lightness numeric not null default 0,
  saturation_variance numeric not null default 0,
  color_temperature jsonb not null default '{"warm":0,"cool":0,"green":0,"neutral":0}'::jsonb,
  top_hue_buckets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_color_profiles is
  'Rolling weighted color aggregates for each profile, used by Joy Aura visualization.';

comment on column public.user_color_profiles.hue_buckets is
  'Map of 12 hue buckets: keys are 0,30,...,330 with weighted totals.';

comment on column public.user_color_profiles.color_temperature is
  'Normalized proportions of warm/cool/green/neutral color weights.';

create index if not exists user_color_profiles_updated_at_idx
  on public.user_color_profiles (updated_at desc);

alter table public.user_color_profiles enable row level security;

create policy "user_color_profiles_select_all"
  on public.user_color_profiles
  for select
  to anon, authenticated
  using (true);

create policy "user_color_profiles_insert_own_profile"
  on public.user_color_profiles
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and trim(lower(p.device_id)) = public.request_device_id()
        and public.request_device_id() is not null
    )
  );

create policy "user_color_profiles_update_own_profile"
  on public.user_color_profiles
  for update
  to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and trim(lower(p.device_id)) = public.request_device_id()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and trim(lower(p.device_id)) = public.request_device_id()
    )
  );

grant select, insert, update on table public.user_color_profiles to anon, authenticated;
