begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_table('public','platform_operators','platform operators exist');
select has_table('public','subscription_payment_audit','payment audit exists');
select has_table('public','subscription_notifications','subscription reminders exist');

insert into auth.users(id,email) values
 ('99000000-0000-4000-8000-000000000001','owner@operations.test'),
 ('99000000-0000-4000-8000-000000000002','operator@operations.test');
insert into public.organizations(id,name,commercial_name) values
 ('99000000-0000-4000-8000-000000000010','Operations Org','Operations Org');
insert into public.profiles(id,organization_id,full_name) values
 ('99000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000010','Owner');
insert into public.profile_roles(profile_id,role_id)
select '99000000-0000-4000-8000-000000000001',id from public.roles
where organization_id='99000000-0000-4000-8000-000000000010' and name='organization_owner';
insert into public.platform_operators(user_id,display_name)
values ('99000000-0000-4000-8000-000000000002','Billing Operator');

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='99000000-0000-4000-8000-000000000001';
select is(public.is_platform_operator(),false,'organization owner is not platform operator');
select throws_ok($$select * from public.list_subscription_transfers_for_review()$$,'42501','No autorizado','owner cannot list platform payment queue');
select lives_ok($$select public.report_subscription_transfer('small','monthly','Test Bank','OPS-001',current_date)$$,'owner reports transfer');

set local request.jwt.claim.sub='99000000-0000-4000-8000-000000000002';
select is(public.is_platform_operator(),true,'registered platform operator is recognized');
select is((select count(*)::integer from public.list_subscription_transfers_for_review()),1,'operator sees pending transfer');
select lives_ok($$select public.confirm_subscription_transfer((select id from public.list_subscription_transfers_for_review() where reference_number='OPS-001'),true,'Matched bank statement')$$,'operator confirms transfer');
reset role;
select is((select status from public.organization_subscriptions where organization_id='99000000-0000-4000-8000-000000000010'),'active','confirmation activates subscription');
select is((select action from public.subscription_payment_audit where organization_id='99000000-0000-4000-8000-000000000010'),'confirmed','confirmation is audited');
select throws_ok($$update public.subscription_payment_audit set notes='tampered'$$,'42501','immutable audit record','payment audit cannot be changed');

update public.organization_subscriptions
set status='active',current_period_ends_at=current_date+interval '3 days',trial_ends_at=current_date-interval '1 day'
where organization_id='99000000-0000-4000-8000-000000000010';
set local role service_role;
set local request.jwt.claim.role='service_role';
select is(public.enqueue_subscription_expiry_notifications(current_date),1,'daily job queues three-day reminder');
reset role;
select is((select notification_type from public.subscription_notifications where organization_id='99000000-0000-4000-8000-000000000010'),'subscription_expiring','paid expiry reminder is classified');

select * from finish();
rollback;
