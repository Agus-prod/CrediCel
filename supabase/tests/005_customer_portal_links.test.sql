begin;
select plan(3);

select has_function(
  'public',
  'issue_customer_portal_link',
  array['uuid', 'boolean'],
  'Existe el emisor seguro de enlaces del portal'
);

select function_privs_are(
  'public',
  'issue_customer_portal_link',
  array['uuid', 'boolean'],
  'anon',
  array[]::text[],
  'Anon no puede emitir enlaces'
);

select function_privs_are(
  'public',
  'issue_customer_portal_link',
  array['uuid', 'boolean'],
  'authenticated',
  array['EXECUTE'],
  'Los usuarios autenticados pasan por la autorización interna'
);

select * from finish();
rollback;
