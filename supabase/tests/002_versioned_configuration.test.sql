begin;

select plan(17);

select has_function(
  'public',
  'get_configuration_state',
  array[]::text[],
  'configuration state read RPC exists'
);
select has_function(
  'public',
  'save_configuration_draft',
  array['uuid', 'jsonb', 'timestamp with time zone', 'timestamp with time zone'],
  'configuration draft save RPC exists'
);
select has_function(
  'public',
  'publish_configuration_draft',
  array['uuid'],
  'configuration publish RPC exists'
);
select has_function(
  'public',
  'resolve_configuration',
  array['text', 'timestamp with time zone'],
  'configuration resolver RPC exists'
);

select has_index(
  'public',
  'configuration_versions',
  'configuration_versions_one_active_per_organization',
  'only one active version is possible per organization'
);
select has_index(
  'public',
  'configuration_versions',
  'configuration_versions_one_draft_per_organization',
  'only one draft is possible per organization'
);
select has_index(
  'public',
  'configuration_values',
  'configuration_values_one_rule_per_version',
  'a version cannot contain an ambiguous duplicate rule'
);

insert into public.organizations (
  id,
  name,
  commercial_name
)
values (
  '90000000-0000-4000-8000-000000000029',
  'Configuration Test Organization',
  'Configuration Test'
);

select is(
  (
    select count(*)::bigint
    from public.configuration_scopes
    where organization_id = '90000000-0000-4000-8000-000000000029'
      and scope_type = 'organization'
      and scope_id = '90000000-0000-4000-8000-000000000029'
  ),
  1::bigint,
  'organization bootstrap creates its scope'
);

select is(
  (
    select count(*)::bigint
    from public.configuration_versions
    where organization_id = '90000000-0000-4000-8000-000000000029'
      and status = 'active'
  ),
  1::bigint,
  'organization bootstrap creates one active version'
);

select is(
  (
    select count(*)::bigint
    from public.configuration_versions
    where organization_id = '90000000-0000-4000-8000-000000000029'
      and status = 'draft'
  ),
  1::bigint,
  'organization bootstrap creates one editable draft'
);

select is(
  (
    select count(*)::bigint
    from public.configuration_values as value
    join public.configuration_versions as version
      on version.id = value.version_id
    where value.organization_id = '90000000-0000-4000-8000-000000000029'
      and version.status = 'active'
  ),
  5::bigint,
  'active version contains every required organization value'
);

select is(
  (
    select count(*)::bigint
    from public.configuration_values as value
    join public.configuration_versions as version
      on version.id = value.version_id
    where value.organization_id = '90000000-0000-4000-8000-000000000029'
      and version.status = 'draft'
  ),
  5::bigint,
  'draft starts as a copy of the active version'
);

select has_trigger(
  'public',
  'configuration_values',
  'configuration_values_validate',
  'configuration values validate type, scope and tenant'
);
select has_trigger(
  'public',
  'configuration_values',
  'configuration_values_audit',
  'configuration changes write their dedicated audit history'
);
select has_trigger(
  'public',
  'credit_applications',
  'credit_application_policy',
  'application creation attaches and enforces the active configuration'
);

select throws_ok(
  $$
    insert into public.configuration_values (
      organization_id,
      definition_id,
      scope_id,
      version_id,
      value,
      priority,
      effective_from,
      effective_until,
      status
    )
    select
      value.organization_id,
      value.definition_id,
      value.scope_id,
      value.version_id,
      value.value,
      value.priority,
      value.effective_from,
      value.effective_until,
      value.status
    from public.configuration_values as value
    join public.configuration_versions as version
      on version.id = value.version_id
    where value.organization_id = '90000000-0000-4000-8000-000000000029'
      and version.status = 'active'
    limit 1
  $$,
  '23505',
  'duplicate key value violates unique constraint "configuration_values_one_rule_per_version"',
  'duplicate rules in the same version are rejected'
);

select ok(
  (
    select count(*) >= 10
    from public.configuration_audit_logs
    where organization_id = '90000000-0000-4000-8000-000000000029'
  ),
  'initial active and draft values are auditable'
);

select * from finish();
rollback;
