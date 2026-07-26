begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_column('public','device_enrollments','provider_enrollment_token_name','provider token metadata exists');
select has_column('public','device_enrollments','provider_enrollment_expires_at','provider token expiry exists');
select has_function('public','record_android_enrollment_token',array['uuid','text','timestamp with time zone'],'token metadata function exists');

insert into auth.users(id,email)
values('99200000-0000-4000-8000-000000000001','mdm-enrollment@credicel.test');
insert into public.profiles(id,organization_id,full_name)
values('99200000-0000-4000-8000-000000000001','10000000-0000-0000-0000-000000000001','MDM Enrollment Tester');
insert into public.profile_roles(profile_id,role_id)
select '99200000-0000-4000-8000-000000000001',id
from public.roles
where organization_id='10000000-0000-0000-0000-000000000001'
  and name='inventory_manager';
insert into public.user_branch_access(profile_id,branch_id,can_manage)
values('99200000-0000-4000-8000-000000000001','30000000-0000-0000-0000-000000000001',true);

insert into public.credit_applications(
  id,organization_id,branch_id,business_unit_id,customer_id,inventory_unit_id,
  requested_price,proposed_down_payment,proposed_term,status,created_by
) values (
  '99200000-0000-4000-8000-000000000010','10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',
  23990,5000,12,'activated','99200000-0000-4000-8000-000000000001'
);
insert into public.credit_accounts(
  id,organization_id,application_id,customer_id,principal,down_payment,term,
  installment_amount,outstanding_balance,status
) values (
  '99200000-0000-4000-8000-000000000020','10000000-0000-0000-0000-000000000001',
  '99200000-0000-4000-8000-000000000010','70000000-0000-0000-0000-000000000001',
  18990,5000,12,1800,21600,'active'
);

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='99200000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.create_device_enrollment('60000000-0000-0000-0000-000000000002','99200000-0000-4000-8000-000000000020')$$,
  'P0001','El dispositivo no corresponde al crédito seleccionado',
  'an account cannot generate a QR for another inventory device'
);
select lives_ok(
  $$select public.create_device_enrollment('60000000-0000-0000-0000-000000000001','99200000-0000-4000-8000-000000000020')$$,
  'the matching active credit creates an enrollment'
);
select lives_ok(
  $$select public.record_android_enrollment_token(
    (select id from public.device_enrollments where account_id='99200000-0000-4000-8000-000000000020'),
    'enterprises/test/enrollmentTokens/one-time-token',now()+interval '8 hours')$$,
  'authorized staff records non-secret provider metadata'
);
select is(
  (select mdm_provider from public.device_enrollments where account_id='99200000-0000-4000-8000-000000000020'),
  'android_management_api','provider is recorded'
);
select is(
  (select status from public.device_enrollments where account_id='99200000-0000-4000-8000-000000000020'),
  'pending','enrollment remains pending until Google reports the device'
);
select is(
  (select provider_enrollment_token_name from public.device_enrollments where account_id='99200000-0000-4000-8000-000000000020'),
  'enterprises/test/enrollmentTokens/one-time-token','only provider token metadata is retained'
);

select * from finish();
rollback;
