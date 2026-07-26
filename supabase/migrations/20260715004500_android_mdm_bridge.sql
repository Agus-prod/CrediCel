-- Production-oriented bridge for an Android Enterprise / MDM provider.

alter table public.device_enrollments
  add column if not exists mdm_provider text,
  add column if not exists provider_device_name text,
  add column if not exists management_mode text check (management_mode in ('fully_managed', 'company_owned_personal', 'work_profile')),
  add column if not exists compliance_state text not null default 'unknown' check (compliance_state in ('unknown', 'compliant', 'non_compliant')),
  add column if not exists imei_verified_at timestamptz,
  add column if not exists last_policy_sync_at timestamptz,
  add column if not exists last_error text;

alter table public.device_commands
  add column if not exists provider_command_id text,
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

create unique index if not exists device_enrollments_provider_device_unique
on public.device_enrollments (mdm_provider, provider_device_name)
where provider_device_name is not null;

create or replace function public.register_android_mdm_device(
  p_enrollment_id uuid,
  p_provider_device_name text,
  p_imei text,
  p_management_mode text default 'fully_managed'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_enrollment public.device_enrollments%rowtype; v_expected_imei text;
begin
  if auth.role() <> 'service_role' then raise exception 'No autorizado' using errcode='42501'; end if;
  if p_management_mode not in ('fully_managed','company_owned_personal','work_profile') then raise exception 'Modo MDM inválido'; end if;
  select enrollment.* into v_enrollment
  from public.device_enrollments enrollment
  where enrollment.id=p_enrollment_id for update;
  if not found then raise exception 'Enrolamiento no encontrado'; end if;
  select regexp_replace(unit.imei_1,'[^0-9]','','g') into v_expected_imei
  from public.inventory_units unit where unit.id=v_enrollment.inventory_unit_id;
  if regexp_replace(coalesce(p_imei,''),'[^0-9]','','g') <> v_expected_imei then raise exception 'El IMEI no coincide con el inventario'; end if;
  if nullif(btrim(p_provider_device_name),'') is null then raise exception 'Identificador MDM requerido'; end if;
  update public.device_enrollments set
    mdm_provider='android_management_api', provider_device_name=btrim(p_provider_device_name),
    management_mode=p_management_mode, device_identifier=btrim(p_provider_device_name),
    imei_verified_at=now(), enrolled_at=coalesce(enrolled_at,now()), last_seen_at=now(),
    compliance_state='unknown', status='enrolled', last_error=null
  where id=p_enrollment_id;
end;
$$;

create or replace function public.claim_android_mdm_commands(p_limit integer default 25)
returns table(command_id uuid, enrollment_id uuid, provider_device_name text, command text, reason text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'No autorizado' using errcode='42501'; end if;
  return query
  with claimed as (
    select queued.id from public.device_commands queued
    join public.device_enrollments enrollment on enrollment.id=queued.enrollment_id
    where queued.status='queued' and enrollment.mdm_provider='android_management_api'
      and enrollment.provider_device_name is not null
    order by queued.requested_at
    for update of queued skip locked
    limit greatest(1,least(coalesce(p_limit,25),100))
  ), updated as (
    update public.device_commands queued set status='delivered', delivery_attempts=delivery_attempts+1,last_attempt_at=now()
    from claimed where queued.id=claimed.id returning queued.*
  )
  select updated.id, updated.enrollment_id, enrollment.provider_device_name, updated.command, updated.reason
  from updated join public.device_enrollments enrollment on enrollment.id=updated.enrollment_id;
end;
$$;

create or replace function public.complete_android_mdm_command(
  p_command_id uuid,
  p_success boolean,
  p_provider_command_id text default null,
  p_result jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_command public.device_commands%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'No autorizado' using errcode='42501'; end if;
  select * into v_command from public.device_commands where id=p_command_id and status='delivered' for update;
  if not found then raise exception 'Orden MDM no disponible'; end if;
  update public.device_commands set status=case when p_success then 'acknowledged' else 'failed' end,
    acknowledged_at=now(),provider_command_id=nullif(btrim(p_provider_command_id),''),result=coalesce(p_result,'{}')
  where id=p_command_id;
  update public.device_enrollments set
    status=case when p_success and v_command.command='lock' then 'locked'
                when p_success and v_command.command='unlock' then 'enrolled'
                when p_success and v_command.command='release' then 'released' else status end,
    last_policy_sync_at=now(),last_seen_at=now(),
    last_error=case when p_success then null else coalesce(p_result->>'error','Fallo del proveedor MDM') end
  where id=v_command.enrollment_id;
end;
$$;

-- The old token polling endpoints were a prototype. Device commands now pass through a trusted server bridge.
revoke execute on function public.activate_device_enrollment(uuid,text) from anon, authenticated;
revoke execute on function public.device_command_sync(uuid) from anon, authenticated;
revoke execute on function public.acknowledge_device_command(uuid,uuid,boolean,jsonb) from anon, authenticated;
grant execute on function public.activate_device_enrollment(uuid,text) to service_role;
grant execute on function public.device_command_sync(uuid) to service_role;
grant execute on function public.acknowledge_device_command(uuid,uuid,boolean,jsonb) to service_role;

revoke all on function public.register_android_mdm_device(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.claim_android_mdm_commands(integer) from public,anon,authenticated;
revoke all on function public.complete_android_mdm_command(uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.register_android_mdm_device(uuid,text,text,text) to service_role;
grant execute on function public.claim_android_mdm_commands(integer) to service_role;
grant execute on function public.complete_android_mdm_command(uuid,boolean,text,jsonb) to service_role;
