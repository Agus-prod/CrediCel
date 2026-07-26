-- RLS decides which tenant rows an authenticated user may read. PostgreSQL
-- privileges must still allow the SELECT operation before policies are checked.
grant select on all tables in schema public to authenticated;

-- Keep the same baseline for public tables introduced by future migrations.
alter default privileges in schema public
grant select on tables to authenticated;
