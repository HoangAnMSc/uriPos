-- Run this in Supabase SQL Editor if image upload/library fails with product_media RLS.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.product_media to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.product_media disable row level security;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'product_media';
