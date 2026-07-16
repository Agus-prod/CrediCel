-- Composite tenant foreign keys supersede their legacy single-column versions.
-- Keeping both makes PostgREST embeds ambiguous even though both relationships
-- point to the same parent row.

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select
      child_namespace.nspname as schema_name,
      child.relname as table_name,
      legacy.conname as constraint_name
    from pg_constraint as legacy
    join pg_class as child on child.oid = legacy.conrelid
    join pg_namespace as child_namespace
      on child_namespace.oid = child.relnamespace
    where legacy.contype = 'f'
      and child_namespace.nspname = 'public'
      and cardinality(legacy.conkey) = 1
      and exists (
        select 1
        from pg_constraint as tenant
        where tenant.contype = 'f'
          and tenant.conrelid = legacy.conrelid
          and tenant.confrelid = legacy.confrelid
          and cardinality(tenant.conkey) = 2
          and exists (
            select 1
            from generate_subscripts(tenant.conkey, 1) as position
            where tenant.conkey[position] = legacy.conkey[1]
              and tenant.confkey[position] = legacy.confkey[1]
          )
      )
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      v_constraint.schema_name,
      v_constraint.table_name,
      v_constraint.constraint_name
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
