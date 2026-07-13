create table public.credit_accounts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,application_id uuid not null unique references credit_applications,
 customer_id uuid not null references customers,principal numeric(14,2) not null,down_payment numeric(14,2) not null,term integer not null,
 installment_amount numeric(14,2) not null,outstanding_balance numeric(14,2) not null,status text not null check(status in('active','delinquent','paid','cancelled')),activated_at timestamptz not null default now()
);
create table public.credit_installments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,account_id uuid not null references credit_accounts on delete cascade,
 installment_number integer not null,due_date date not null,amount numeric(14,2) not null,paid_amount numeric(14,2) not null default 0,status text not null check(status in('pending','partial','paid','overdue')),unique(account_id,installment_number)
);
create table public.customer_portal_access(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,customer_id uuid not null references customers on delete cascade,
 access_token uuid not null default gen_random_uuid() unique,expires_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now()
);
create table public.payment_applications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,transfer_report_id uuid not null unique references transfer_reports,
 account_id uuid not null references credit_accounts,amount numeric(14,2) not null,applied_by uuid references profiles,applied_at timestamptz not null default now()
);
do $$ declare t text;begin foreach t in array array['credit_accounts','credit_installments','customer_portal_access','payment_applications'] loop execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);end loop;end $$;
create policy accounts_staff_read on credit_accounts for select to authenticated using(organization_id=private.current_organization_id() and (private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_role('credit_manager') or private.has_role('collections_agent') or private.has_role('cashier') or exists(select 1 from credit_applications a where a.id=application_id and private.has_branch_access(a.branch_id))));
create policy installments_staff_read on credit_installments for select to authenticated using(organization_id=private.current_organization_id() and exists(select 1 from credit_accounts ca where ca.id=account_id));
create policy portal_access_admin on customer_portal_access for select to authenticated using(organization_id=private.current_organization_id() and (private.has_role('organization_owner') or private.has_role('organization_admin')));
create policy payment_applications_staff on payment_applications for select to authenticated using(organization_id=private.current_organization_id() and (private.has_permission('payments.validate') or private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_role('collections_agent')));

create or replace function public.create_inventory_transfer(p_origin uuid,p_destination uuid,p_inventory_ids uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_transfer uuid;v_count integer;
begin
 v_org=private.current_organization_id();
 if v_org is null or not private.has_branch_access(p_origin) or not private.has_permission('inventory.write') then raise exception 'No autorizado' using errcode='42501';end if;
 if p_origin=p_destination or not exists(select 1 from public.branches where id=p_destination and organization_id=v_org) then raise exception 'La tienda de destino debe pertenecer a la misma organización';end if;
 select count(*) into v_count from public.inventory_units where id=any(p_inventory_ids) and organization_id=v_org and current_branch_id=p_origin and status='available';
 if cardinality(p_inventory_ids)=0 or v_count<>cardinality(p_inventory_ids) then raise exception 'Uno o más dispositivos no están disponibles en la tienda de origen';end if;
 insert into public.inventory_transfers(organization_id,origin_branch_id,destination_branch_id,status,requested_by) values(v_org,p_origin,p_destination,'approved',auth.uid()) returning id into v_transfer;
 insert into public.inventory_transfer_items(organization_id,transfer_id,inventory_unit_id) select v_org,v_transfer,unnest(p_inventory_ids);
 update public.inventory_units set status='transfer_pending',updated_at=now() where id=any(p_inventory_ids);
 insert into public.inventory_transfer_events(organization_id,transfer_id,event_type,actor_id) values(v_org,v_transfer,'requested_and_approved',auth.uid());
 return v_transfer;
end $$;
revoke all on function public.create_inventory_transfer(uuid,uuid,uuid[]) from public,anon;grant execute on function public.create_inventory_transfer(uuid,uuid,uuid[]) to authenticated;

create or replace function public.customer_portal_summary(p_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('customer',jsonb_build_object('name',c.first_name||' '||c.last_name),'account',jsonb_build_object('id',ca.id,'status',ca.status,'principal',ca.principal,'outstanding_balance',ca.outstanding_balance,'installment_amount',ca.installment_amount,'paid_installments',(select count(*) from public.credit_installments i where i.account_id=ca.id and i.status='paid'),'total_installments',ca.term,'next_due_date',(select min(due_date) from public.credit_installments i where i.account_id=ca.id and i.status in('pending','partial','overdue'))),'bank_accounts',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'bank_name',b.bank_name,'account_name',b.account_name,'masked_account_number',b.masked_account_number)) from public.bank_accounts b where b.organization_id=pa.organization_id and b.status='active'),'[]'::jsonb),'reports',coalesce((select jsonb_agg(jsonb_build_object('id',tr.id,'amount',tr.amount,'date',tr.transferred_on,'reference',tr.reference_number,'status',tr.status) order by tr.created_at desc) from public.transfer_reports tr where tr.customer_id=c.id),'[]'::jsonb))
from public.customer_portal_access pa join public.customers c on c.id=pa.customer_id join lateral(select * from public.credit_accounts x where x.customer_id=c.id order by x.activated_at desc limit 1)ca on true where pa.access_token=p_token and pa.revoked_at is null and (pa.expires_at is null or pa.expires_at>now()) limit 1
$$;
grant execute on function public.customer_portal_summary(uuid) to anon,authenticated;

create or replace function public.report_customer_payment(p_token uuid,p_account_id uuid,p_bank_account_id uuid,p_origin_bank text,p_amount numeric,p_date date,p_reference text,p_holder text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_access public.customer_portal_access%rowtype;v_account public.credit_accounts%rowtype;v_report uuid;
begin
 select * into v_access from public.customer_portal_access where access_token=p_token and revoked_at is null and (expires_at is null or expires_at>now());if not found then raise exception 'Acceso inválido';end if;
 select * into v_account from public.credit_accounts where id=p_account_id and customer_id=v_access.customer_id and organization_id=v_access.organization_id;if not found then raise exception 'Crédito inválido';end if;
 if p_amount<=0 or nullif(trim(p_reference),'') is null or nullif(trim(p_origin_bank),'') is null then raise exception 'Datos de pago incompletos';end if;
 if not exists(select 1 from public.bank_accounts where id=p_bank_account_id and organization_id=v_access.organization_id and status='active') then raise exception 'Cuenta receptora inválida';end if;
 insert into public.transfer_reports(organization_id,customer_id,credit_application_id,bank_account_id,origin_bank,amount,transferred_on,reference_number,sender_account_holder,status) values(v_access.organization_id,v_access.customer_id,v_account.application_id,p_bank_account_id,trim(p_origin_bank),p_amount,p_date,trim(p_reference),trim(p_holder),'reported') returning id into v_report;
 return v_report;
end $$;
grant execute on function public.report_customer_payment(uuid,uuid,uuid,text,numeric,date,text,text) to anon,authenticated;

create policy portal_receipt_upload on storage.objects for insert to anon with check(bucket_id='transfer-receipts' and exists(select 1 from public.customer_portal_access pa where pa.access_token=(storage.foldername(name))[1]::uuid and pa.revoked_at is null and (pa.expires_at is null or pa.expires_at>now())));
create or replace function public.attach_customer_receipt(p_token uuid,p_report_id uuid,p_storage_path text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.customer_portal_access pa join public.transfer_reports tr on tr.customer_id=pa.customer_id and tr.organization_id=pa.organization_id where pa.access_token=p_token and tr.id=p_report_id and p_storage_path like p_token::text||'/'||p_report_id::text||'/%') then raise exception 'Comprobante inválido';end if;
 insert into public.transfer_report_files(organization_id,transfer_report_id,storage_path) select organization_id,id,p_storage_path from public.transfer_reports where id=p_report_id;
end $$;
grant execute on function public.attach_customer_receipt(uuid,uuid,text) to anon,authenticated;

create or replace function public.validate_customer_payment(p_report_id uuid,p_approve boolean,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare v_report public.transfer_reports%rowtype;v_account public.credit_accounts%rowtype;v_remaining numeric;v_installment public.credit_installments%rowtype;
begin
 select * into v_report from public.transfer_reports where id=p_report_id and organization_id=private.current_organization_id() for update;
 if not found or not private.has_permission('payments.validate') then raise exception 'No autorizado' using errcode='42501';end if;
 if v_report.status not in('reported','under_review') then raise exception 'El reporte ya fue procesado';end if;
 if not p_approve then update public.transfer_reports set status='rejected' where id=v_report.id;insert into public.transfer_validation_events(organization_id,transfer_report_id,from_status,to_status,actor_id,notes)values(v_report.organization_id,v_report.id,v_report.status,'rejected',auth.uid(),coalesce(p_notes,'Rechazado'));return;end if;
 select * into v_account from public.credit_accounts where application_id=v_report.credit_application_id for update;if not found then raise exception 'No existe cuenta de crédito activa';end if;
 insert into public.payment_applications(organization_id,transfer_report_id,account_id,amount,applied_by)values(v_report.organization_id,v_report.id,v_account.id,v_report.amount,auth.uid());
 v_remaining=v_report.amount;
 for v_installment in select * from public.credit_installments where account_id=v_account.id and status in('pending','partial','overdue') order by installment_number for update loop exit when v_remaining<=0;update public.credit_installments set paid_amount=least(amount,paid_amount+v_remaining),status=case when paid_amount+v_remaining>=amount then 'paid' else 'partial' end where id=v_installment.id;v_remaining=greatest(0,v_remaining-(v_installment.amount-v_installment.paid_amount));end loop;
 update public.credit_accounts set outstanding_balance=greatest(0,outstanding_balance-v_report.amount),status=case when outstanding_balance-v_report.amount<=0 then 'paid' else 'active' end where id=v_account.id;
 update public.transfer_reports set status='applied' where id=v_report.id;
 insert into public.transfer_validation_events(organization_id,transfer_report_id,from_status,to_status,actor_id,notes)values(v_report.organization_id,v_report.id,v_report.status,'applied',auth.uid(),coalesce(p_notes,'Pago validado y aplicado'));
end $$;
revoke all on function public.validate_customer_payment(uuid,boolean,text) from public,anon;grant execute on function public.validate_customer_payment(uuid,boolean,text) to authenticated;

-- Convierte solicitudes activadas existentes en cuentas de demostración y crea un acceso estable para pruebas.
insert into public.credit_accounts(organization_id,application_id,customer_id,principal,down_payment,term,installment_amount,outstanding_balance,status)
select a.organization_id,a.id,a.customer_id,a.requested_price,a.proposed_down_payment,a.proposed_term,round((a.requested_price-a.proposed_down_payment)/a.proposed_term,2),round((a.requested_price-a.proposed_down_payment),2),case when iu.status='delinquent' then 'delinquent' else 'active' end
from public.credit_applications a left join public.inventory_units iu on iu.id=a.inventory_unit_id where a.status='activated' on conflict(application_id) do nothing;
insert into public.credit_installments(organization_id,account_id,installment_number,due_date,amount,status)
select ca.organization_id,ca.id,n,(ca.activated_at::date+(n||' month')::interval)::date,ca.installment_amount,case when ca.status='delinquent' and n=1 then 'overdue' else 'pending' end from public.credit_accounts ca cross join lateral generate_series(1,ca.term)n on conflict do nothing;
insert into public.customer_portal_access(organization_id,customer_id,access_token) select organization_id,customer_id,'11111111-1111-1111-1111-111111111111'::uuid from public.credit_accounts order by activated_at limit 1 on conflict(access_token) do nothing;
