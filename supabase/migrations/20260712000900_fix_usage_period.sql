create or replace function public.submit_credit_application(
  p_branch_id uuid,p_inventory_unit_id uuid,p_dni text,p_first_name text,p_last_name text,
  p_phone text,p_email text,p_requested_price numeric,p_down_payment numeric,p_term integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_unit uuid;v_customer uuid;v_application uuid;v_inventory public.inventory_units%rowtype;
begin
  v_org=private.current_organization_id();
  if v_org is null or not private.has_permission('applications.create') or not private.has_branch_access(p_branch_id) then raise exception 'No autorizado' using errcode='42501'; end if;
  if not private.subscription_allows('applications_monthly') then raise exception 'El plan alcanzó el límite mensual de solicitudes'; end if;
  if nullif(trim(p_dni),'') is null or nullif(trim(p_first_name),'') is null or nullif(trim(p_last_name),'') is null or nullif(trim(p_phone),'') is null then raise exception 'Complete los datos obligatorios del cliente'; end if;
  if p_requested_price<=0 or p_down_payment<0 or p_down_payment>=p_requested_price or p_term not in (3,6,9,12,18,24) then raise exception 'Condiciones de crédito inválidas'; end if;
  select * into v_inventory from public.inventory_units where id=p_inventory_unit_id and organization_id=v_org and current_branch_id=p_branch_id and status='available' for update;
  if not found then raise exception 'El dispositivo ya no está disponible'; end if;
  select business_unit_id into v_unit from public.branches where id=p_branch_id and organization_id=v_org;
  insert into public.customers(organization_id,normalized_dni,first_name,last_name,phone,email,created_by)
  values(v_org,regexp_replace(p_dni,'[^0-9]','','g'),trim(p_first_name),trim(p_last_name),trim(p_phone),nullif(trim(p_email),''),auth.uid())
  on conflict(organization_id,normalized_dni) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,email=coalesce(excluded.email,public.customers.email),updated_at=now() returning id into v_customer;
  insert into public.customer_assignments(organization_id,customer_id,salesperson_id,branch_id) values(v_org,v_customer,auth.uid(),p_branch_id) on conflict do nothing;
  insert into public.credit_applications(organization_id,branch_id,business_unit_id,customer_id,inventory_unit_id,requested_price,proposed_down_payment,proposed_term,status,created_by)
  values(v_org,p_branch_id,v_unit,v_customer,p_inventory_unit_id,p_requested_price,p_down_payment,p_term,'submitted',auth.uid()) returning id into v_application;
  insert into public.credit_application_items(organization_id,application_id,inventory_unit_id,description,price) values(v_org,v_application,p_inventory_unit_id,'Dispositivo IMEI '||v_inventory.imei_1,p_requested_price);
  insert into public.credit_application_status_history(organization_id,application_id,status,actor_id,reason) values(v_org,v_application,'submitted',auth.uid(),'Solicitud enviada por vendedor');
  update public.inventory_units set status='reserved',updated_at=now() where id=p_inventory_unit_id;
  insert into public.subscription_usage(organization_id,metric,period_start,period_end,used) values(v_org,'applications_monthly',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month'-interval '1 day')::date,1)
  on conflict(organization_id,metric,period_start) do update set used=public.subscription_usage.used+1;
  return v_application;
end $$;
