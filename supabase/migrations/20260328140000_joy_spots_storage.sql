-- Public bucket for joy spot photos (tighten policies in production if needed).
insert into storage.buckets (id, name, public)
values ('joy-spot-photos', 'joy-spot-photos', true)
on conflict (id) do nothing;

create policy "joy_spots_storage_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'joy-spot-photos');

create policy "joy_spots_storage_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'joy-spot-photos');
