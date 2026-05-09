alter table public.joy_spots
  add column if not exists caption text;

comment on column public.joy_spots.caption is
  'Optional short caption for photo posts; null when unused.';
