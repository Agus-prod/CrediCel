alter table public.device_enrollments
  add column if not exists provider_enrollment_token_name text,
  add column if not exists provider_enrollment_created_at timestamptz,
  add column if not exists provider_enrollment_expires_at timestamptz;

create unique index if not exists device_enrollments_provider_token_unique
on public.device_enrollments (provider_enrollment_token_name)
where provider_enrollment_token_name is not null;

create or replace function public.create_device_enrollment(
  p_inventory_unit_id uuid,
  p_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.inventory_units%rowtype;
  v_account public.credit_accounts%rowtype;
  v_application public.credit_applications%rowtype;
  v_id uuid;
begin
  select * into v_unit
  from public.inventory_units
  where id = p_inventory_unit_id
    and organization_id = private.current_organization_id();

  if not found
    or not v_unit.mdm_compatible
    or not (
      private.has_role('branch_manager')
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
      or private.has_role('inventory_manager')
    ) then
    raise exception 'Equipo no compatible o acceso denegado';
  end if;

  if p_account_id is null then
    raise exception 'Debe vincular un crédito activo';
  end if;

  select * into v_account
  from public.credit_accounts
  where id = p_account_id
    and organization_id = v_unit.organization_id
    and status in ('active', 'delinquent');

  if not found then
    raise exception 'Crédito activo no encontrado';
  end if;

  select * into v_application
  from public.credit_applications
  where id = v_account.application_id
    and organization_id = v_unit.organization_id;

  if not found or v_application.inventory_unit_id is distinct from v_unit.id then
    raise exception 'El dispositivo no corresponde al crédito seleccionado';
  end if;

  insert into public.device_enrollments (
    organization_id,
    inventory_unit_id,
    account_id,
    created_by
  )
  values (
    v_unit.organization_id,
    v_unit.id,
    v_account.id,
    auth.uid()
  )
  on conflict (inventory_unit_id) do update set
    account_id = excluded.account_id,
    status = case
      when public.device_enrollments.status in ('revoked', 'released') then 'pending'
      else public.device_enrollments.status
    end,
    provider_enrollment_token_name = null,
    provider_enrollment_created_at = null,
    provider_enrollment_expires_at = null,
    last_error = null
  returning id into v_id;

  return jsonb_build_object('enrollment_id', v_id);
end;
$$;

create or replace function public.record_android_enrollment_token(
  p_enrollment_id uuid,
  p_provider_token_name text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_provider_token_name), '') is null
    or p_expires_at <= now() then
    raise exception 'Metadatos de enrolamiento inválidos';
  end if;

  update public.device_enrollments enrollment set
    mdm_provider = 'android_management_api',
    provider_enrollment_token_name = btrim(p_provider_token_name),
    provider_enrollment_created_at = now(),
    provider_enrollment_expires_at = p_expires_at,
    status = 'pending',
    last_error = null
  where enrollment.id = p_enrollment_id
    and enrollment.organization_id = private.current_organization_id()
    and (
      private.has_role('branch_manager')
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
      or private.has_role('inventory_manager')
    );

  if not found then
    raise exception 'Enrolamiento no autorizado' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.create_device_enrollment(uuid, uuid) from public, anon;
revoke all on function public.record_android_enrollment_token(uuid, text, timestamptz) from public, anon;
grant execute on function public.create_device_enrollment(uuid, uuid) to authenticated;
grant execute on function public.record_android_enrollment_token(uuid, text, timestamptz) to authenticated;
