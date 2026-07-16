-- Organizational integrity, explicit inventory ownership and auditable mutations.

-- The organization owner is the only role that receives every permission by default.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
cross join public.permissions as permission
where role.name = 'organization_owner'
on conflict do nothing;

create or replace function public.create_business_unit(
  p_legal_name text,
  p_commercial_name text,
  p_owner_name text,
  p_rtn text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_business_unit_id uuid;
  v_normalized_rtn text;
begin
  v_organization_id := private.current_organization_id();
  v_normalized_rtn := regexp_replace(coalesce(p_rtn, ''), '[^0-9]', '', 'g');

  if v_organization_id is null
    or not (private.has_role('organization_owner') or private.has_role('organization_admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if nullif(trim(p_legal_name), '') is null
    or nullif(trim(p_commercial_name), '') is null
    or nullif(trim(p_owner_name), '') is null
    or length(v_normalized_rtn) <> 14 then
    raise exception 'Complete los datos y use un RTN de 14 dígitos';
  end if;

  insert into public.business_units (
    organization_id,
    legal_name,
    commercial_name,
    owner_name,
    rtn
  )
  values (
    v_organization_id,
    trim(p_legal_name),
    trim(p_commercial_name),
    trim(p_owner_name),
    v_normalized_rtn
  )
  returning id into v_business_unit_id;

  return v_business_unit_id;
end;
$$;

revoke all on function public.create_business_unit(text, text, text, text) from public, anon;
grant execute on function public.create_business_unit(text, text, text, text) to authenticated;

-- A branch must always declare its economic owner explicitly.
drop function if exists public.create_branch(text, text, text, text);

create function public.create_branch(
  p_business_unit_id uuid,
  p_name text,
  p_code text,
  p_address text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_branch_id uuid;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not (private.has_role('organization_owner') or private.has_role('organization_admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_units
    where id = p_business_unit_id
      and organization_id = v_organization_id
      and status = 'active'
  ) then
    raise exception 'Unidad propietaria inválida';
  end if;

  if nullif(trim(p_name), '') is null
    or nullif(trim(p_code), '') is null
    or nullif(trim(p_address), '') is null then
    raise exception 'Complete los datos de la tienda';
  end if;

  insert into public.branches (
    organization_id,
    business_unit_id,
    name,
    code,
    branch_type,
    address,
    phone
  )
  values (
    v_organization_id,
    p_business_unit_id,
    trim(p_name),
    upper(trim(p_code)),
    'store',
    trim(p_address),
    nullif(trim(p_phone), '')
  )
  returning id into v_branch_id;

  return v_branch_id;
end;
$$;

revoke all on function public.create_branch(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_branch(uuid, text, text, text, text) to authenticated;

-- Request a physical move, optionally coupled to an economic ownership transfer.
drop function if exists public.create_inventory_transfer(uuid, uuid, uuid[]);

create or replace function public.create_inventory_transfer(
  p_origin uuid,
  p_destination uuid,
  p_inventory_ids uuid[],
  p_transfer_ownership boolean,
  p_destination_owner_business_unit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_transfer_id uuid;
  v_matching_inventory integer;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not private.has_branch_access(p_origin)
    or not private.has_permission('inventory.write') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_origin = p_destination
    or not exists (
      select 1
      from public.branches
      where id = p_destination
        and organization_id = v_organization_id
        and status = 'active'
    ) then
    raise exception 'El destino debe ser otra tienda activa de la misma organización';
  end if;

  if p_transfer_ownership and (
    not private.has_permission('transfers.change_owner')
    or p_destination_owner_business_unit_id is null
    or not exists (
      select 1
      from public.business_units
      where id = p_destination_owner_business_unit_id
        and organization_id = v_organization_id
        and status = 'active'
    )
  ) then
    raise exception 'La transferencia de propiedad requiere permiso y una unidad destino válida';
  end if;

  -- Serialize competing requests for the same IMEI before validating availability.
  perform 1
  from public.inventory_units
  where id = any(coalesce(p_inventory_ids, array[]::uuid[]))
  order by id
  for update;

  select count(*)
  into v_matching_inventory
  from public.inventory_units
  where id = any(coalesce(p_inventory_ids, array[]::uuid[]))
    and organization_id = v_organization_id
    and current_branch_id = p_origin
    and status = 'available';

  if coalesce(cardinality(p_inventory_ids), 0) = 0
    or v_matching_inventory <> cardinality(p_inventory_ids) then
    raise exception 'Uno o más dispositivos no están disponibles en el punto de origen';
  end if;

  insert into public.inventory_transfers (
    organization_id,
    origin_branch_id,
    destination_branch_id,
    transfer_ownership,
    destination_owner_business_unit_id,
    status,
    requested_by
  )
  values (
    v_organization_id,
    p_origin,
    p_destination,
    p_transfer_ownership,
    case when p_transfer_ownership then p_destination_owner_business_unit_id end,
    'requested',
    auth.uid()
  )
  returning id into v_transfer_id;

  insert into public.inventory_transfer_items (
    organization_id,
    transfer_id,
    inventory_unit_id
  )
  select v_organization_id, v_transfer_id, inventory_id
  from unnest(p_inventory_ids) as inventory_id;

  update public.inventory_units
  set status = 'transfer_pending', updated_at = now()
  where id = any(p_inventory_ids);

  insert into public.inventory_transfer_events (
    organization_id,
    transfer_id,
    event_type,
    actor_id,
    metadata
  )
  values (
    v_organization_id,
    v_transfer_id,
    'requested',
    auth.uid(),
    jsonb_build_object('transfer_ownership', p_transfer_ownership)
  );

  return v_transfer_id;
end;
$$;

revoke all on function public.create_inventory_transfer(uuid, uuid, uuid[], boolean, uuid) from public, anon;
grant execute on function public.create_inventory_transfer(uuid, uuid, uuid[], boolean, uuid) to authenticated;

create or replace function public.approve_inventory_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.inventory_transfers%rowtype;
begin
  select *
  into v_transfer
  from public.inventory_transfers
  where id = p_transfer_id
  for update;

  if not found
    or v_transfer.organization_id <> private.current_organization_id()
    or not private.has_branch_access(v_transfer.origin_branch_id)
    or not private.has_permission('transfers.dispatch') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_transfer.status <> 'requested' then
    raise exception 'El traslado ya no está pendiente de aprobación';
  end if;

  update public.inventory_transfers
  set status = 'approved', approved_by = auth.uid(), updated_at = now()
  where id = p_transfer_id;

  insert into public.inventory_transfer_events (
    organization_id,
    transfer_id,
    event_type,
    actor_id
  )
  values (v_transfer.organization_id, p_transfer_id, 'approved', auth.uid());
end;
$$;

revoke all on function public.approve_inventory_transfer(uuid) from public, anon;
grant execute on function public.approve_inventory_transfer(uuid) to authenticated;

-- Keep duplicates visible for review instead of rejecting the insert outright.
drop index if exists public.transfer_reports_potential_duplicate;
create index transfer_reports_potential_duplicate
  on public.transfer_reports (organization_id, lower(reference_number), amount, transferred_on)
  where status not in ('rejected', 'reversed');

create or replace function private.flag_duplicate_transfer_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.transfer_reports as report
    where report.organization_id = new.organization_id
      and lower(trim(report.reference_number)) = lower(trim(new.reference_number))
      and report.amount = new.amount
      and report.transferred_on between new.transferred_on - 7 and new.transferred_on + 7
      and report.status not in ('rejected', 'reversed')
  ) then
    new.status := 'duplicate_suspected';
  end if;

  return new;
end;
$$;

create trigger transfer_report_duplicate_check
before insert on public.transfer_reports
for each row execute function private.flag_duplicate_transfer_reference();

-- Immutable audit rows are produced inside the database, not by browser code.
create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_organization_id uuid;
  v_branch_id uuid;
  v_actor_id uuid;
  v_headers jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_before := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_after := to_jsonb(new);
  end if;

  v_row := coalesce(v_after, v_before);
  v_organization_id := nullif(v_row ->> 'organization_id', '')::uuid;
  v_branch_id := coalesce(
    nullif(v_row ->> 'branch_id', ''),
    nullif(v_row ->> 'current_branch_id', ''),
    nullif(v_row ->> 'origin_branch_id', '')
  )::uuid;

  select id into v_actor_id
  from public.profiles
  where id = auth.uid();

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  if v_organization_id is not null then
    insert into public.audit_logs (
      organization_id,
      branch_id,
      user_id,
      entity_type,
      entity_id,
      action,
      before_values,
      after_values,
      metadata
    )
    values (
      v_organization_id,
      v_branch_id,
      v_actor_id,
      tg_table_name,
      nullif(v_row ->> 'id', '')::uuid,
      lower(tg_op),
      v_before,
      v_after,
      jsonb_build_object(
        'ip', coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip'),
        'user_agent', v_headers ->> 'user-agent'
      )
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'business_units',
    'branches',
    'profiles',
    'customers',
    'customer_addresses',
    'customer_employment',
    'customer_references',
    'customer_documents',
    'customer_consents',
    'inventory_units',
    'inventory_transfers',
    'credit_applications',
    'credit_decisions',
    'credit_accounts',
    'credit_installments',
    'payment_applications',
    'transfer_validation_events',
    'transfer_reports',
    'configuration_versions',
    'configuration_scopes',
    'configuration_values',
    'business_rules',
    'collection_actions',
    'cash_transactions',
    'device_commands'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.write_audit_log()',
      'audit_' || v_table,
      v_table
    );
  end loop;
end;
$$;
