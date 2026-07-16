begin;

select plan(17);

-- Isolated organizations, users and inventory for behavioral RLS/RPC tests.
insert into auth.users (id, email) values
  ('91600000-0000-0000-0000-000000000001', 'manager-a@credicel.test'),
  ('91700000-0000-0000-0000-000000000001', 'seller-a@credicel.test'),
  ('92600000-0000-0000-0000-000000000001', 'seller-b@credicel.test');

insert into public.organizations (id, name, commercial_name) values
  ('91000000-0000-0000-0000-000000000001', 'Tenant A', 'Tenant A'),
  ('92000000-0000-0000-0000-000000000001', 'Tenant B', 'Tenant B');

update public.organization_subscriptions
set
  plan_id = (select id from public.subscription_plans where code = 'growth'),
  status = 'active'
where organization_id = '91000000-0000-0000-0000-000000000001';

insert into public.business_units (
  id,
  organization_id,
  legal_name,
  commercial_name,
  owner_name,
  rtn
) values
  (
    '91100000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'Tenant A Origin, S. de R.L.',
    'Tenant A Origin',
    'Owner A1',
    '08019000000101'
  ),
  (
    '91100000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    'Tenant A Destination, S. de R.L.',
    'Tenant A Destination',
    'Owner A2',
    '08019000000102'
  ),
  (
    '92100000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'Tenant B, S. de R.L.',
    'Tenant B',
    'Owner B',
    '08019000000201'
  );

insert into public.branches (
  id,
  organization_id,
  business_unit_id,
  name,
  code,
  branch_type,
  address
) values
  (
    '91200000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    '91100000-0000-0000-0000-000000000001',
    'Tenant A Origin',
    'TEST-A-ORIGIN',
    'store',
    'Test address A1'
  ),
  (
    '91200000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    '91100000-0000-0000-0000-000000000002',
    'Tenant A Destination',
    'TEST-A-DEST',
    'store',
    'Test address A2'
  ),
  (
    '92200000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    '92100000-0000-0000-0000-000000000001',
    'Tenant B Branch',
    'TEST-B',
    'store',
    'Test address B'
  );

insert into public.profiles (id, organization_id, full_name) values
  ('91600000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Manager A'),
  ('91700000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Seller A'),
  ('92600000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'Seller B');

insert into public.profile_roles (profile_id, role_id)
select '91600000-0000-0000-0000-000000000001', id
from public.roles
where organization_id = '91000000-0000-0000-0000-000000000001'
  and name in ('organization_admin', 'inventory_manager');

insert into public.profile_roles (profile_id, role_id)
select '91700000-0000-0000-0000-000000000001', id
from public.roles
where organization_id = '91000000-0000-0000-0000-000000000001'
  and name = 'salesperson';

insert into public.profile_roles (profile_id, role_id)
select '92600000-0000-0000-0000-000000000001', id
from public.roles
where organization_id = '92000000-0000-0000-0000-000000000001'
  and name = 'salesperson';

insert into public.user_branch_access (profile_id, branch_id, can_manage) values
  ('91600000-0000-0000-0000-000000000001', '91200000-0000-0000-0000-000000000001', true),
  ('91600000-0000-0000-0000-000000000001', '91200000-0000-0000-0000-000000000002', true),
  ('91700000-0000-0000-0000-000000000001', '91200000-0000-0000-0000-000000000001', false),
  ('92600000-0000-0000-0000-000000000001', '92200000-0000-0000-0000-000000000001', false);

insert into public.product_brands (id, organization_id, name) values
  ('91300000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Test Brand A'),
  ('92300000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'Test Brand B');

insert into public.product_models (id, organization_id, brand_id, name) values
  ('91400000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '91300000-0000-0000-0000-000000000001', 'Test Model A'),
  ('92400000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '92300000-0000-0000-0000-000000000001', 'Test Model B');

insert into public.inventory_units (
  id,
  organization_id,
  owner_business_unit_id,
  current_branch_id,
  brand_id,
  model_id,
  imei_1,
  imei_2,
  serial_number,
  cost,
  cash_price,
  condition
) values
  (
    '91500000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    '91100000-0000-0000-0000-000000000001',
    '91200000-0000-0000-0000-000000000001',
    '91300000-0000-0000-0000-000000000001',
    '91400000-0000-0000-0000-000000000001',
    '359000000000001',
    '359000000000101',
    'TEST-A-001',
    100,
    150,
    'new'
  ),
  (
    '91500000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    '91100000-0000-0000-0000-000000000001',
    '91200000-0000-0000-0000-000000000001',
    '91300000-0000-0000-0000-000000000001',
    '91400000-0000-0000-0000-000000000001',
    '359000000000002',
    '359000000000102',
    'TEST-A-002',
    100,
    150,
    'new'
  ),
  (
    '91500000-0000-0000-0000-000000000003',
    '91000000-0000-0000-0000-000000000001',
    '91100000-0000-0000-0000-000000000002',
    '91200000-0000-0000-0000-000000000002',
    '91300000-0000-0000-0000-000000000001',
    '91400000-0000-0000-0000-000000000001',
    '359000000000003',
    '359000000000103',
    'TEST-A-003',
    100,
    150,
    'new'
  ),
  (
    '92500000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    '92100000-0000-0000-0000-000000000001',
    '92200000-0000-0000-0000-000000000001',
    '92300000-0000-0000-0000-000000000001',
    '92400000-0000-0000-0000-000000000001',
    '359000000000001',
    '359000000000201',
    'TEST-B-001',
    100,
    150,
    'new'
  );

select results_eq(
  $$select count(*) from public.roles where organization_id = '91000000-0000-0000-0000-000000000001'$$,
  array[11::bigint],
  'new organizations receive the complete role catalog'
);

select throws_ok(
  $$
    insert into public.branches (
      id, organization_id, business_unit_id, name, code, branch_type, address
    ) values (
      '91200000-0000-0000-0000-000000000099',
      '91000000-0000-0000-0000-000000000001',
      '92100000-0000-0000-0000-000000000001',
      'Cross tenant branch',
      'CROSS-TENANT',
      'store',
      'Invalid'
    )
  $$,
  '23503',
  null,
  'composite foreign keys reject cross-tenant parents'
);

set local role authenticated;
set local request.jwt.claim.sub = '91700000-0000-0000-0000-000000000001';

select results_eq(
  'select count(*) from public.branches',
  array[1::bigint],
  'a branch-scoped seller only sees the assigned point'
);

select results_eq(
  'select count(*) from public.inventory_units',
  array[2::bigint],
  'inventory RLS hides other points and organizations'
);

select throws_ok(
  $$
    update public.inventory_units
    set status = 'reserved'
    where id = '91500000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'authenticated clients cannot bypass inventory RPCs with direct DML'
);

select set_config('request.jwt.claim.sub', '91600000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$
    do $transfer$
    declare
      v_transfer_id uuid;
    begin
      v_transfer_id := public.create_inventory_transfer(
        '91200000-0000-0000-0000-000000000001',
        '91200000-0000-0000-0000-000000000002',
        array['91500000-0000-0000-0000-000000000001'::uuid],
        true,
        '91100000-0000-0000-0000-000000000002'
      );
      perform public.approve_inventory_transfer(v_transfer_id);
      perform public.dispatch_inventory_transfer(v_transfer_id, array['359000000000001']);
      perform public.receive_inventory_transfer(v_transfer_id, array['359000000000001']);
    end;
    $transfer$
  $$,
  'a complete ownership transfer is transactional'
);

select results_eq(
  $$
    select status::text || ':' || current_branch_id::text || ':' || owner_business_unit_id::text
    from public.inventory_units
    where id = '91500000-0000-0000-0000-000000000001'
  $$,
  array['available:91200000-0000-0000-0000-000000000002:91100000-0000-0000-0000-000000000002'::text],
  'receipt updates status, point and economic owner'
);

select ok(
  exists (
    select 1
    from public.inventory_unit_movements
    where inventory_unit_id = '91500000-0000-0000-0000-000000000001'
      and movement_type = 'receipt'
      and from_owner_business_unit_id = '91100000-0000-0000-0000-000000000001'
      and to_owner_business_unit_id = '91100000-0000-0000-0000-000000000002'
  ),
  'receipt movement preserves from/to ownership'
);

select lives_ok(
  $$
    do $dispatch$
    declare
      v_transfer_id uuid;
    begin
      v_transfer_id := public.create_inventory_transfer(
        '91200000-0000-0000-0000-000000000001',
        '91200000-0000-0000-0000-000000000002',
        array['91500000-0000-0000-0000-000000000002'::uuid],
        false,
        null
      );
      perform public.approve_inventory_transfer(v_transfer_id);
      perform public.dispatch_inventory_transfer(v_transfer_id, array['359000000000002']);
    end;
    $dispatch$
  $$,
  'a second device can be dispatched for discrepancy testing'
);

reset role;

select throws_ok(
  $$
    update public.inventory_units
    set status = 'sold_cash'
    where id = '91500000-0000-0000-0000-000000000002'
  $$,
  'P0001',
  null,
  'an in-transit device cannot be sold even by a privileged writer'
);

set local role authenticated;
set local request.jwt.claim.sub = '91600000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    select public.receive_inventory_transfer(
      transfer_id,
      array['000000000000000']
    )
    from public.inventory_transfer_items
    where inventory_unit_id = '91500000-0000-0000-0000-000000000002'
  $$,
  'an incorrect destination scan records a discrepancy without partial movement'
);

select results_eq(
  $$
    select transfer.status::text || ':' || inventory.status::text
    from public.inventory_transfer_items as transfer_item
    join public.inventory_transfers as transfer on transfer.id = transfer_item.transfer_id
    join public.inventory_units as inventory on inventory.id = transfer_item.inventory_unit_id
    where transfer_item.inventory_unit_id = '91500000-0000-0000-0000-000000000002'
  $$,
  array['received_with_discrepancy:in_transit'::text],
  'a mismatch keeps the device in transit and marks the transfer for review'
);

select lives_ok(
  $$
    select public.receive_inventory_transfer(
      transfer_id,
      array['359000000000002']
    )
    from public.inventory_transfer_items
    where inventory_unit_id = '91500000-0000-0000-0000-000000000002'
  $$,
  'the destination can retry a discrepant receipt with the correct IMEI'
);

select ok(
  exists (
    select 1
    from public.inventory_transfer_items as transfer_item
    join public.inventory_transfer_discrepancies as discrepancy
      on discrepancy.transfer_id = transfer_item.transfer_id
    join public.inventory_units as inventory
      on inventory.id = transfer_item.inventory_unit_id
    where transfer_item.inventory_unit_id = '91500000-0000-0000-0000-000000000002'
      and discrepancy.resolved_at is not null
      and inventory.status = 'available'
      and inventory.current_branch_id = '91200000-0000-0000-0000-000000000002'
  ),
  'a successful retry resolves the discrepancy and completes the movement'
);

reset role;

select throws_ok(
  $$
    insert into public.inventory_transfer_items (
      organization_id,
      transfer_id,
      inventory_unit_id
    )
    select
      '91000000-0000-0000-0000-000000000001',
      transfer_id,
      '92500000-0000-0000-0000-000000000001'
    from public.inventory_transfer_items
    where inventory_unit_id = '91500000-0000-0000-0000-000000000002'
  $$,
  '23503',
  null,
  'transfer items cannot reference another tenant inventory unit'
);

select throws_ok(
  $$
    insert into public.inventory_units (
      id,
      organization_id,
      owner_business_unit_id,
      current_branch_id,
      brand_id,
      model_id,
      imei_1,
      serial_number,
      cost,
      cash_price,
      condition
    ) values (
      '91500000-0000-0000-0000-000000000004',
      '91000000-0000-0000-0000-000000000001',
      '91100000-0000-0000-0000-000000000001',
      '91200000-0000-0000-0000-000000000001',
      '91300000-0000-0000-0000-000000000001',
      '91400000-0000-0000-0000-000000000001',
      '359000000000103',
      'TEST-A-004',
      100,
      150,
      'new'
    )
  $$,
  '23505',
  null,
  'an IMEI cannot move from imei_2 on one device to imei_1 on another'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where entity_type = 'inventory_units'
      and entity_id = '91500000-0000-0000-0000-000000000001'
      and action = 'update'
      and before_values ->> 'owner_business_unit_id' = '91100000-0000-0000-0000-000000000001'
      and after_values ->> 'owner_business_unit_id' = '91100000-0000-0000-0000-000000000002'
  ),
  'audit history captures ownership before and after the transfer'
);

select * from finish();
rollback;
