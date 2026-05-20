-- Link joy spots to optional device profile (set at submit time when one exists).

alter table public.joy_spots
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create index if not exists joy_spots_profile_id_idx
  on public.joy_spots (profile_id)
  where profile_id is not null;

comment on column public.joy_spots.profile_id is
  'Profile for the submitting device when one existed at post time; null for anonymous-only or no profile.';
