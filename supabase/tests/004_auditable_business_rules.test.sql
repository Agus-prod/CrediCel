begin;

select plan(26);

select has_function(
  'public',
  'publish_rule_set',
  array['uuid'],
  'rule set publication is transactional'
);
select has_function(
  'public',
  'record_rule_execution',
  array['uuid', 'text', 'uuid', 'jsonb', 'jsonb', 'jsonb'],
  'rule execution audit RPC exists'
);
select has_index(
  'public',
  'rule_sets',
  'rule_sets_one_active_per_organization',
  'only one active rule set is possible per organization'
);
select col_is_unique(
  'public',
  'rule_sets',
  array['organization_id', 'name', 'version'],
  'rule set versions are unique per organization and name'
);
select has_trigger(
  'public',
  'rule_sets',
  'rule_sets_guard',
  'published rule sets are immutable'
);
select has_trigger(
  'public',
  'business_rules',
  'business_rules_editable',
  'published rule definitions are immutable'
);
select has_trigger(
  'public',
  'rule_conditions',
  'rule_conditions_validate',
  'rule conditions validate operator operands'
);
select has_trigger(
  'public',
  'rule_actions',
  'rule_actions_validate',
  'rule actions validate recommendation values'
);
select has_trigger(
  'public',
  'rule_execution_logs',
  'rule_execution_logs_validate',
  'execution payloads are recommendation-only'
);
select has_trigger(
  'public',
  'rule_execution_logs',
  'rule_execution_logs_immutable',
  'execution history is append-only'
);

insert into auth.users (id, email)
values (
  '94000000-0000-4000-8000-000000000001',
  'rules-admin@credicel.test'
);

insert into public.organizations (id, name, commercial_name)
values (
  '94000000-0000-4000-8000-000000000002',
  'Rules Test Organization',
  'Rules Test'
);

update public.organization_subscriptions
set
  plan_id = (select id from public.subscription_plans where code = 'growth'),
  status = 'active'
where organization_id = '94000000-0000-4000-8000-000000000002';

insert into public.profiles (id, organization_id, full_name)
values (
  '94000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000002',
  'Rules Administrator'
);

insert into public.profile_roles (profile_id, role_id)
select '94000000-0000-4000-8000-000000000001', id
from public.roles
where organization_id = '94000000-0000-4000-8000-000000000002'
  and name = 'organization_admin';

insert into public.business_units (
  id,
  organization_id,
  legal_name,
  commercial_name,
  owner_name,
  rtn
)
values (
  '94000000-0000-4000-8000-000000000003',
  '94000000-0000-4000-8000-000000000002',
  'Rules Test, S. de R.L.',
  'Rules Test',
  'Rules Owner',
  '08019000000401'
);

insert into public.branches (
  id,
  organization_id,
  business_unit_id,
  name,
  code,
  branch_type,
  address
)
values (
  '94000000-0000-4000-8000-000000000004',
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000003',
  'Rules Test Branch',
  'RULES-TEST',
  'store',
  'Test address'
);

insert into public.customers (
  id,
  organization_id,
  normalized_dni,
  first_name,
  last_name,
  phone,
  created_by
)
values (
  '94000000-0000-4000-8000-000000000005',
  '94000000-0000-4000-8000-000000000002',
  '0801199000001',
  'Rule',
  'Customer',
  '99990001',
  '94000000-0000-4000-8000-000000000001'
);

insert into public.credit_applications (
  id,
  organization_id,
  branch_id,
  business_unit_id,
  customer_id,
  requested_price,
  proposed_down_payment,
  proposed_term,
  created_by
)
values (
  '94000000-0000-4000-8000-000000000006',
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000004',
  '94000000-0000-4000-8000-000000000003',
  '94000000-0000-4000-8000-000000000005',
  1000,
  200,
  12,
  '94000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)::bigint
    from public.rule_sets
    where organization_id = '94000000-0000-4000-8000-000000000002'
      and status = 'active'
  ),
  1::bigint,
  'organization bootstrap creates one active rule set'
);

select is(
  (
    select count(*)::bigint
    from public.business_rules as rule
    join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
    where rule_set.organization_id = '94000000-0000-4000-8000-000000000002'
      and rule_set.status = 'active'
  ),
  0::bigint,
  'the starter rule set is neutral and contains no hard-coded policy'
);

select throws_ok(
  $$
    insert into public.rule_sets (organization_id, name, version, status)
    values (
      '94000000-0000-4000-8000-000000000002',
      'Invalid version',
      0,
      'draft'
    )
  $$,
  '23514',
  null,
  'rule set versions must be positive'
);

select throws_ok(
  $$
    insert into public.rule_sets (organization_id, name, version, status)
    values (
      '94000000-0000-4000-8000-000000000002',
      'Second active',
      2,
      'active'
    )
  $$,
  '23505',
  null,
  'a tenant cannot have two active rule sets'
);

insert into public.rule_sets (id, organization_id, name, version, status)
values (
  '94000000-0000-4000-8000-000000000007',
  '94000000-0000-4000-8000-000000000002',
  'Credit recommendations',
  2,
  'draft'
);

insert into public.business_rules (
  id,
  organization_id,
  rule_set_id,
  code,
  name,
  priority,
  enabled
)
values (
  '94000000-0000-4000-8000-000000000008',
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000007',
  'review_requested_price',
  'Review requested price',
  10,
  true
);

insert into public.rule_conditions (
  organization_id,
  rule_id,
  field,
  operator,
  operand,
  position
)
values (
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000008',
  'requested_price',
  'greater_than_or_equal',
  '1000'::jsonb,
  1
);

insert into public.rule_actions (
  organization_id,
  rule_id,
  action_type,
  value,
  position
)
values (
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000008',
  'add_warning',
  '"Human review recommended"'::jsonb,
  1
);

select throws_ok(
  $$
    insert into public.rule_conditions (
      organization_id, rule_id, field, operator, operand, position
    ) values (
      '94000000-0000-4000-8000-000000000002',
      '94000000-0000-4000-8000-000000000008',
      'requested_price',
      'between',
      '[2000, 1000]'::jsonb,
      2
    )
  $$,
  'P0001',
  null,
  'between rejects reversed boundaries'
);

select throws_ok(
  $$
    insert into public.rule_actions (
      organization_id, rule_id, action_type, value, position
    ) values (
      '94000000-0000-4000-8000-000000000002',
      '94000000-0000-4000-8000-000000000008',
      'require_supervisor_approval',
      'false'::jsonb,
      2
    )
  $$,
  'P0001',
  null,
  'a human-review recommendation cannot be disabled with false'
);

set local role authenticated;
set local request.jwt.claim.sub = '94000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.publish_rule_set('94000000-0000-4000-8000-000000000007')$$,
  'an authorized administrator can publish a valid draft atomically'
);

reset role;

select is(
  (
    select count(*)::bigint
    from public.rule_sets
    where organization_id = '94000000-0000-4000-8000-000000000002'
      and id = '94000000-0000-4000-8000-000000000007'
      and status = 'active'
  ),
  1::bigint,
  'the published version is the sole active rule set'
);

select is(
  (
    select count(*)::bigint
    from public.rule_sets
    where organization_id = '94000000-0000-4000-8000-000000000002'
      and status = 'retired'
  ),
  1::bigint,
  'publication retires the previous active rule set'
);

select throws_ok(
  $$
    update public.business_rules
    set name = 'Tampered published rule'
    where id = '94000000-0000-4000-8000-000000000008'
  $$,
  '42501',
  null,
  'published rule definitions cannot be changed'
);

set local role authenticated;
set local request.jwt.claim.sub = '94000000-0000-4000-8000-000000000001';

select lives_ok(
  $$
    select public.record_rule_execution(
      '94000000-0000-4000-8000-000000000007',
      'credit_application',
      '94000000-0000-4000-8000-000000000006',
      '{"requested_price": 1000}'::jsonb,
      '[{"ruleId":"94000000-0000-4000-8000-000000000008","ruleName":"Review requested price","matched":true,"conditionResults":[true]}]'::jsonb,
      '{"recommendation_only":true,"recommendations":[{"type":"add_warning","value":"Human review recommended"}],"conflicts":[],"applied_rule_ids":["94000000-0000-4000-8000-000000000008"],"explanation":"Recommendation only."}'::jsonb
    )
  $$,
  'a recommendation-only execution can be recorded'
);

select is(
  (
    select count(*)::bigint
    from public.rule_execution_logs
    where organization_id = '94000000-0000-4000-8000-000000000002'
      and result -> 'recommendation_only' = 'true'::jsonb
      and jsonb_array_length(result -> 'recommendations') = 1
      and not (result ? 'decision')
  ),
  1::bigint,
  'the stored result is explicitly non-decisional'
);

select throws_ok(
  $$
    select public.record_rule_execution(
      '94000000-0000-4000-8000-000000000007',
      'credit_application',
      '94000000-0000-4000-8000-000000000006',
      '{}'::jsonb,
      '[]'::jsonb,
      '{"recommendation_only":true,"recommendations":[],"conflicts":[],"applied_rule_ids":[],"explanation":"Invalid approval.","approved":true}'::jsonb
    )
  $$,
  'P0001',
  null,
  'the RPC rejects an approval field'
);

reset role;

select throws_ok(
  $$
    update public.rule_execution_logs
    set result = result || '{"tampered": true}'::jsonb
    where organization_id = '94000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'execution logs cannot be updated'
);

select throws_ok(
  $$
    insert into public.rule_execution_logs (
      organization_id,
      rule_set_id,
      subject_type,
      subject_id,
      inputs,
      evaluations,
      result
    ) values (
      '94000000-0000-4000-8000-000000000002',
      '94000000-0000-4000-8000-000000000007',
      'credit_application',
      '94000000-0000-4000-8000-000000000006',
      '{}'::jsonb,
      '[]'::jsonb,
      '{"recommendation_only":false,"recommendations":[],"conflicts":[],"applied_rule_ids":[],"explanation":"Invalid."}'::jsonb
    )
  $$,
  'P0001',
  null,
  'direct inserts cannot store a decisional result either'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where organization_id = '94000000-0000-4000-8000-000000000002'
      and entity_type in ('rule_sets', 'rule_conditions', 'rule_actions')
      and action in ('insert', 'update')
  ),
  'rule publication and definition changes produce audit history'
);

select * from finish();
rollback;
