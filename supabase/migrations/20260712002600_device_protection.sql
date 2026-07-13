create table public.device_enrollments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,inventory_unit_id uuid not null unique references inventory_units,
 account_id uuid references credit_accounts,enrollment_token uuid not null default gen_random_uuid()unique,
 status text not null default'pending'check(status in('pending','enrolled','locked','released','revoked')),device_identifier text,last_seen_at timestamptz,enrolled_at timestamptz,
 created_by uuid not null references profiles,created_at timestamptz not null default now()
);
create table public.device_commands(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,enrollment_id uuid not null references device_enrollments on delete cascade,
 command text not null check(command in('lock','unlock','sync_policy','show_payment_notice','release')),reason text not null,
 status text not null default'queued'check(status in('queued','delivered','acknowledged','failed','cancelled')),requested_by uuid not null references profiles,
 requested_at timestamptz not null default now(),acknowledged_at timestamptz,result jsonb
);
do $$ declare t text;begin foreach t in array array['device_enrollments','device_commands']loop execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);end loop;end $$;
create policy enrollment_staff_read on public.device_enrollments for select to authenticated using(organization_id=private.current_organization_id()and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('credit_manager')or private.has_role('collections_agent')or exists(select 1 from public.inventory_units i where i.id=inventory_unit_id and private.has_branch_access(i.current_branch_id))));
create policy commands_staff_read on public.device_commands for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.device_enrollments e where e.id=enrollment_id));
grant select on public.device_enrollments,public.device_commands to authenticated;

create or replace function public.create_device_enrollment(p_inventory_unit_id uuid,p_account_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_unit public.inventory_units%rowtype;v_id uuid;v_token uuid;begin
 select*into v_unit from public.inventory_units where id=p_inventory_unit_id and organization_id=private.current_organization_id();
 if not found or not v_unit.mdm_compatible or not(private.has_role('branch_manager')or private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('inventory_manager'))then raise exception'Equipo no compatible o acceso denegado';end if;
 insert into public.device_enrollments(organization_id,inventory_unit_id,account_id,created_by)values(v_unit.organization_id,v_unit.id,p_account_id,auth.uid())on conflict(inventory_unit_id)do update set account_id=coalesce(excluded.account_id,public.device_enrollments.account_id),status=case when public.device_enrollments.status='revoked'then'pending'else public.device_enrollments.status end returning id,enrollment_token into v_id,v_token;
 return jsonb_build_object('enrollment_id',v_id,'token',v_token);
end $$;
create or replace function public.queue_device_command(p_enrollment_id uuid,p_command text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_e public.device_enrollments%rowtype;v_id uuid;begin
 select*into v_e from public.device_enrollments where id=p_enrollment_id and organization_id=private.current_organization_id();
 if not found or not(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('credit_manager')or private.has_role('collections_agent'))then raise exception'No autorizado';end if;
 if nullif(trim(p_reason),'')is null then raise exception'Indique el motivo';end if;
 if p_command='lock'and not exists(select 1 from public.credit_accounts where id=v_e.account_id and status='delinquent')then raise exception'El bloqueo solo procede para cuentas en mora';end if;
 insert into public.device_commands(organization_id,enrollment_id,command,reason,requested_by)values(v_e.organization_id,v_e.id,p_command,trim(p_reason),auth.uid())returning id into v_id;return v_id;
end $$;
revoke all on function public.create_device_enrollment(uuid,uuid),public.queue_device_command(uuid,text,text)from public,anon;
grant execute on function public.create_device_enrollment(uuid,uuid),public.queue_device_command(uuid,text,text)to authenticated;

create or replace function public.activate_device_enrollment(p_token uuid,p_device_identifier text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin if nullif(trim(p_device_identifier),'')is null then raise exception'Identificador requerido';end if;update public.device_enrollments set status='enrolled',device_identifier=trim(p_device_identifier),enrolled_at=coalesce(enrolled_at,now()),last_seen_at=now()where enrollment_token=p_token and status in('pending','enrolled')returning id into v_id;if v_id is null then raise exception'Código de enrolamiento inválido';end if;return v_id;end $$;
create or replace function public.device_command_sync(p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_commands jsonb;begin update public.device_enrollments set last_seen_at=now()where enrollment_token=p_token and status in('enrolled','locked')returning id into v_id;if v_id is null then raise exception'Dispositivo no enrolado';end if;update public.device_commands set status='delivered'where enrollment_id=v_id and status='queued';select coalesce(jsonb_agg(jsonb_build_object('id',id,'command',command,'reason',reason,'requested_at',requested_at)order by requested_at),'[]'::jsonb)into v_commands from public.device_commands where enrollment_id=v_id and status='delivered';return v_commands;end $$;
create or replace function public.acknowledge_device_command(p_token uuid,p_command_id uuid,p_success boolean,p_result jsonb default'{}')
returns void language plpgsql security definer set search_path='' as $$
declare v_command text;v_enrollment uuid;begin select c.command,c.enrollment_id into v_command,v_enrollment from public.device_commands c join public.device_enrollments e on e.id=c.enrollment_id where c.id=p_command_id and e.enrollment_token=p_token and c.status='delivered'for update;if not found then raise exception'Orden inválida';end if;update public.device_commands set status=case when p_success then'acknowledged'else'failed'end,acknowledged_at=now(),result=coalesce(p_result,'{}')where id=p_command_id;if p_success then update public.device_enrollments set status=case v_command when'lock'then'locked'when'unlock'then'enrolled'when'release'then'released'else status end where id=v_enrollment;end if;end $$;
grant execute on function public.activate_device_enrollment(uuid,text),public.device_command_sync(uuid),public.acknowledge_device_command(uuid,uuid,boolean,jsonb)to anon,authenticated;
