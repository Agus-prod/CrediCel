begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public','register_android_mdm_device',array['uuid','text','text','text'],'MDM registration function exists');
select has_function('public','claim_android_mdm_commands',array['integer'],'MDM command claim exists');
select has_function('public','complete_android_mdm_command',array['uuid','boolean','text','jsonb'],'MDM completion exists');

insert into auth.users(id,email) values('99100000-0000-4000-8000-000000000001','mdm-test@credicel.test');
insert into public.profiles(id,organization_id,full_name)
values('99100000-0000-4000-8000-000000000001','10000000-0000-0000-0000-000000000001','MDM Tester');
insert into public.device_enrollments(id,organization_id,inventory_unit_id,created_by)
values('99100000-0000-4000-8000-000000000010','10000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','99100000-0000-4000-8000-000000000001');
insert into public.device_commands(id,organization_id,enrollment_id,command,reason,requested_by)
values('99100000-0000-4000-8000-000000000020','10000000-0000-0000-0000-000000000001','99100000-0000-4000-8000-000000000010','lock','Cuenta en mora','99100000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='99100000-0000-4000-8000-000000000001';
select throws_ok($$select public.register_android_mdm_device('99100000-0000-4000-8000-000000000010','enterprises/e/devices/1','354000000000001')$$,'42501','permission denied for function register_android_mdm_device','regular user cannot register provider device');

set local role service_role;
set local request.jwt.claim.role='service_role';
select throws_ok($$select public.register_android_mdm_device('99100000-0000-4000-8000-000000000010','enterprises/e/devices/1','000000000000000')$$,'P0001','El IMEI no coincide con el inventario','mismatched IMEI is rejected');
select lives_ok($$select public.register_android_mdm_device('99100000-0000-4000-8000-000000000010','enterprises/e/devices/1','354000000000001')$$,'matching IMEI registers device');
select is((select count(*)::integer from public.claim_android_mdm_commands(10)),1,'worker claims queued provider command');
select lives_ok($$select public.complete_android_mdm_command('99100000-0000-4000-8000-000000000020',true,'google-command-1','{}')$$,'worker completes provider command');
select throws_ok($$select public.complete_android_mdm_command('99100000-0000-4000-8000-000000000020',true,'duplicate','{}')$$,'P0001','Orden MDM no disponible','completed command is idempotently unavailable');

reset role;
select is((select status from public.device_enrollments where id='99100000-0000-4000-8000-000000000010'),'locked','successful lock updates enrollment');
select is((select imei_verified_at is not null from public.device_enrollments where id='99100000-0000-4000-8000-000000000010'),true,'IMEI verification is recorded');
select is((select delivery_attempts from public.device_commands where id='99100000-0000-4000-8000-000000000020'),1,'delivery attempt is recorded');

select * from finish();
rollback;
