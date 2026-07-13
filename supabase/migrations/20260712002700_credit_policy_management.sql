create table public.credit_policies(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null unique references organizations,
 min_down_payment_ratio numeric(6,4)not null default .10,max_term integer not null default 24,max_payment_income_ratio numeric(6,4)not null default .30,
 min_employment_months integer not null default 3,require_guarantor_below_score integer not null default 50,updated_by uuid references profiles,updated_at timestamptz not null default now(),
 check(min_down_payment_ratio between 0 and .90),check(max_term in(3,6,9,12,18,24)),check(max_payment_income_ratio between .05 and .80)
);
alter table public.credit_policies enable row level security;alter table public.credit_policies force row level security;
create policy policy_org_read on public.credit_policies for select to authenticated using(organization_id=private.current_organization_id());grant select on public.credit_policies to authenticated;
insert into public.credit_policies(organization_id)select id from public.organizations on conflict do nothing;
create or replace function private.create_default_credit_policy()returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.credit_policies(organization_id)values(new.id)on conflict do nothing;return new;end $$;
create trigger organization_default_credit_policy after insert on public.organizations for each row execute function private.create_default_credit_policy();
create or replace function public.update_credit_policy(p_min_down_payment_ratio numeric,p_max_term integer,p_max_payment_income_ratio numeric,p_min_employment_months integer,p_require_guarantor_below_score integer)
returns void language plpgsql security definer set search_path='' as $$
begin if not(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('credit_manager'))then raise exception'No autorizado';end if;
 insert into public.credit_policies(organization_id,min_down_payment_ratio,max_term,max_payment_income_ratio,min_employment_months,require_guarantor_below_score,updated_by)
 values(private.current_organization_id(),p_min_down_payment_ratio,p_max_term,p_max_payment_income_ratio,p_min_employment_months,p_require_guarantor_below_score,auth.uid())
 on conflict(organization_id)do update set min_down_payment_ratio=excluded.min_down_payment_ratio,max_term=excluded.max_term,max_payment_income_ratio=excluded.max_payment_income_ratio,min_employment_months=excluded.min_employment_months,require_guarantor_below_score=excluded.require_guarantor_below_score,updated_by=auth.uid(),updated_at=now();end $$;
revoke all on function public.update_credit_policy(numeric,integer,numeric,integer,integer)from public,anon;grant execute on function public.update_credit_policy(numeric,integer,numeric,integer,integer)to authenticated;
create or replace function private.enforce_credit_policy()returns trigger language plpgsql security definer set search_path='' as $$
declare v public.credit_policies%rowtype;begin select*into v from public.credit_policies where organization_id=new.organization_id;if found and(new.proposed_down_payment/new.requested_price<v.min_down_payment_ratio or new.proposed_term>v.max_term)then raise exception'Las condiciones exceden la política de crédito de la organización';end if;return new;end $$;
create trigger credit_application_policy before insert on public.credit_applications for each row execute function private.enforce_credit_policy();
