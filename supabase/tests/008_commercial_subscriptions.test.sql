begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public','platform_bank_accounts','platform bank accounts exist');
select has_table('public','subscription_payment_requests','subscription transfer requests exist');
select is((select (limits->>'customers')::integer from public.subscription_plans where code='trial'),50,'trial is capped at 50 customers');
select ok((select (features->>'advanced_audit')::boolean from public.subscription_plans where code='trial'),'trial includes advanced audit');
select is((select monthly_price from public.subscription_plans where code='small'),1999::numeric,'small monthly price is configured');
select is((select monthly_price from public.subscription_plans where code='medium'),4999::numeric,'medium monthly price is configured');
select is((select monthly_price from public.subscription_plans where code='large'),12999::numeric,'large monthly price is configured');

insert into auth.users(id,email) values
  ('98000000-0000-4000-8000-000000000001','owner-a@subscription.test'),
  ('98000000-0000-4000-8000-000000000002','owner-b@subscription.test');
insert into public.organizations(id,name,commercial_name) values
  ('98000000-0000-4000-8000-000000000010','Subscription A','Subscription A'),
  ('98000000-0000-4000-8000-000000000020','Subscription B','Subscription B');
insert into public.profiles(id,organization_id,full_name) values
  ('98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000010','Owner A'),
  ('98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000020','Owner B');
insert into public.profile_roles(profile_id,role_id)
select '98000000-0000-4000-8000-000000000001',id from public.roles
where organization_id='98000000-0000-4000-8000-000000000010' and name='organization_owner';
insert into public.profile_roles(profile_id,role_id)
select '98000000-0000-4000-8000-000000000002',id from public.roles
where organization_id='98000000-0000-4000-8000-000000000020' and name='organization_owner';

insert into public.customers(organization_id,normalized_dni,first_name,last_name,phone,customer_type)
select '98000000-0000-4000-8000-000000000010',lpad(n::text,13,'0'),'Cliente',n::text,'99990000','new'
from generate_series(1,50) n;

select throws_ok(
  $$insert into public.customers(organization_id,normalized_dni,first_name,last_name,phone,customer_type)
    values('98000000-0000-4000-8000-000000000010','9999999999999','Cliente','51','99990000','new')$$,
  'P0001',null,'the trial rejects customer 51'
);

update public.organization_subscriptions
set trial_ends_at=now()-interval '1 minute'
where organization_id='98000000-0000-4000-8000-000000000020';
select throws_ok(
  $$insert into public.customers(organization_id,normalized_dni,first_name,last_name,phone,customer_type)
    values('98000000-0000-4000-8000-000000000020','8888888888888','Expired','Trial','99990000','new')$$,
  'P0001',null,'an expired trial rejects new operational data'
);

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000001';
select is((public.subscription_summary()->'usage'->>'customers')::integer,50,'summary reports customer usage');
select results_eq('select count(*) from public.organization_subscriptions',array[1::bigint],'owner sees only own subscription');
select results_eq('select count(*) from public.customers',array[50::bigint],'owner sees own customers');
select is_empty(
  $$select id from public.customers where organization_id='98000000-0000-4000-8000-000000000020'$$,
  'owner cannot see another organization customers'
);
select lives_ok(
  $$select public.report_subscription_transfer('small','monthly','Banco Origen','REF-SUB-001',current_date)$$,
  'owner can report a plan transfer'
);
select results_eq(
  $$select expected_amount from public.subscription_payment_requests$$,
  array[1499::numeric],
  'the server fixes the expected amount from the selected plan'
);
select throws_ok(
  $$select public.report_subscription_transfer('small','monthly','Banco Origen','REF-SUB-001',current_date)$$,
  'P0001',null,'a transfer reference cannot be reused'
);

set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select is_empty(
  $$select id from public.subscription_payment_requests$$,
  'another organization cannot see the payment request'
);
select throws_ok(
  $$select public.confirm_subscription_transfer('98000000-0000-4000-8000-000000000099',true,null)$$,
  '42501',null,'authenticated owners cannot approve their own transfer'
);

select * from finish();
rollback;
