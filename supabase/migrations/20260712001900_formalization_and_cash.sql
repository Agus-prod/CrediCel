create table public.credit_contracts(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations,
 application_id uuid not null unique references credit_applications, contract_number text not null,
 accepted_by_customer boolean not null default false, accepted_at timestamptz, signature_name text,
 terms_snapshot jsonb not null default '{}', created_by uuid not null references profiles, created_at timestamptz not null default now(),
 unique(organization_id,contract_number)
);
create table public.cash_transactions(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations,
 branch_id uuid not null references branches, application_id uuid references credit_applications,
 account_id uuid references credit_accounts, transaction_type text not null check(transaction_type in('down_payment','installment','cash_sale','expense','refund')),
 amount numeric(14,2) not null check(amount>0), payment_method text not null check(payment_method in('cash','card','transfer','other')),
 reference text, received_by uuid not null references profiles, created_at timestamptz not null default now()
);
do $$ declare t text;begin foreach t in array array['credit_contracts','cash_transactions']loop execute format('alter table public.%I enable row level security',t);execute format('alter table public.%I force row level security',t);end loop;end$$;
create policy contracts_scoped_read on public.credit_contracts for select to authenticated using(organization_id=private.current_organization_id() and exists(select 1 from public.credit_applications a where a.id=application_id and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_branch_access(a.branch_id))));
create policy cash_scoped_read on public.cash_transactions for select to authenticated using(organization_id=private.current_organization_id()and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_branch_access(branch_id)));

create or replace function public.formalize_credit(p_application_id uuid,p_signature_name text,p_payment_method text,p_reference text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_app public.credit_applications%rowtype;v_customer public.customers%rowtype;v_account uuid;v_contract uuid;v_number text;v_financed numeric;v_installment numeric;
begin
 select * into v_app from public.credit_applications where id=p_application_id and organization_id=private.current_organization_id()for update;
 if not found or not(private.has_role('cashier')or private.has_role('branch_manager')or private.has_role('organization_owner')or private.has_role('organization_admin'))or not(private.has_branch_access(v_app.branch_id)or private.has_role('organization_owner')or private.has_role('organization_admin'))then raise exception 'No autorizado'using errcode='42501';end if;
 if v_app.status<>'approved'then raise exception 'Solo se formalizan solicitudes aprobadas';end if;
 if nullif(trim(p_signature_name),'')is null or p_payment_method not in('cash','card','transfer','other')then raise exception 'Firma o forma de pago inválida';end if;
 select * into v_customer from public.customers where id=v_app.customer_id;
 v_financed=v_app.requested_price-v_app.proposed_down_payment;v_installment=round(v_financed/v_app.proposed_term,2);v_number='CC-'||to_char(current_date,'YYYYMM')||'-'||upper(substr(replace(v_app.id::text,'-',''),1,8));
 insert into public.credit_contracts(organization_id,application_id,contract_number,accepted_by_customer,accepted_at,signature_name,terms_snapshot,created_by)
 values(v_app.organization_id,v_app.id,v_number,true,now(),trim(p_signature_name),jsonb_build_object('customer',v_customer.first_name||' '||v_customer.last_name,'dni',v_customer.normalized_dni,'price',v_app.requested_price,'down_payment',v_app.proposed_down_payment,'term',v_app.proposed_term,'installment',v_installment),auth.uid())returning id into v_contract;
 insert into public.credit_accounts(organization_id,application_id,customer_id,principal,down_payment,term,installment_amount,outstanding_balance,status)
 values(v_app.organization_id,v_app.id,v_app.customer_id,v_app.requested_price,v_app.proposed_down_payment,v_app.proposed_term,v_installment,v_financed,'active')returning id into v_account;
 insert into public.credit_installments(organization_id,account_id,installment_number,due_date,amount,status)select v_app.organization_id,v_account,n,(current_date+(n||' month')::interval)::date,case when n=v_app.proposed_term then v_financed-v_installment*(v_app.proposed_term-1)else v_installment end,'pending'from generate_series(1,v_app.proposed_term)n;
 insert into public.cash_transactions(organization_id,branch_id,application_id,account_id,transaction_type,amount,payment_method,reference,received_by)values(v_app.organization_id,v_app.branch_id,v_app.id,v_account,'down_payment',v_app.proposed_down_payment,p_payment_method,nullif(trim(p_reference),''),auth.uid());
 update public.credit_applications set status='activated',updated_at=now()where id=v_app.id;
 update public.inventory_units set status='sold',updated_at=now()where id=v_app.inventory_unit_id and status='reserved';
 insert into public.credit_application_status_history(organization_id,application_id,status,actor_id,reason)values(v_app.organization_id,v_app.id,'activated',auth.uid(),'Contrato aceptado, prima recibida y dispositivo entregado');
 insert into public.customer_portal_access(organization_id,customer_id)values(v_app.organization_id,v_app.customer_id)on conflict do nothing;
 return jsonb_build_object('contract_id',v_contract,'account_id',v_account,'contract_number',v_number);
end$$;
revoke all on function public.formalize_credit(uuid,text,text,text)from public,anon;grant execute on function public.formalize_credit(uuid,text,text,text)to authenticated;

create or replace function public.record_cash_installment(p_account_id uuid,p_amount numeric,p_payment_method text,p_reference text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_account public.credit_accounts%rowtype;v_app public.credit_applications%rowtype;v_remaining numeric;v_row public.credit_installments%rowtype;v_tx uuid;v_overdue boolean;
begin
 select * into v_account from public.credit_accounts where id=p_account_id and organization_id=private.current_organization_id()for update;
 select * into v_app from public.credit_applications where id=v_account.application_id;
 if not found or p_amount<=0 or not(private.has_role('cashier')or private.has_role('branch_manager')or private.has_role('organization_owner')or private.has_role('organization_admin'))or not(private.has_branch_access(v_app.branch_id)or private.has_role('organization_owner')or private.has_role('organization_admin'))then raise exception 'Pago no autorizado o inválido';end if;
 insert into public.cash_transactions(organization_id,branch_id,application_id,account_id,transaction_type,amount,payment_method,reference,received_by)values(v_account.organization_id,v_app.branch_id,v_app.id,v_account.id,'installment',p_amount,p_payment_method,nullif(trim(p_reference),''),auth.uid())returning id into v_tx;
 v_remaining=p_amount;for v_row in select * from public.credit_installments where account_id=v_account.id and status in('pending','partial','overdue')order by installment_number for update loop exit when v_remaining<=0;update public.credit_installments set paid_amount=least(amount,paid_amount+v_remaining),status=case when paid_amount+v_remaining>=amount then'paid'when due_date<current_date then'overdue'else'partial'end where id=v_row.id;v_remaining=greatest(0,v_remaining-(v_row.amount-v_row.paid_amount));end loop;
 select exists(select 1 from public.credit_installments where account_id=v_account.id and due_date<current_date and status<>'paid')into v_overdue;
 update public.credit_accounts set outstanding_balance=greatest(0,outstanding_balance-p_amount),status=case when outstanding_balance-p_amount<=0 then'paid'when v_overdue then'delinquent'else'active'end where id=v_account.id;
 return v_tx;
end$$;
revoke all on function public.record_cash_installment(uuid,numeric,text,text)from public,anon;grant execute on function public.record_cash_installment(uuid,numeric,text,text)to authenticated;

grant select on public.credit_contracts,public.cash_transactions to authenticated;
