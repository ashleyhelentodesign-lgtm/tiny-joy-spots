-- Optional single mood word per joy spot (stored for future use; not shown in gallery UI).
alter table public.joy_spots
  add column if not exists mood text;

comment on column public.joy_spots.mood is
  'Optional mood label (one word); used for filtering/analytics later.';

create index if not exists joy_spots_mood_idx
  on public.joy_spots (mood)
  where mood is not null and trim(mood) <> '';
