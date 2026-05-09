alter table public.joy_spots
  add column if not exists contributor_name text;

comment on column public.joy_spots.contributor_name is
  'Optional display name for the person sharing the joy spot.';
