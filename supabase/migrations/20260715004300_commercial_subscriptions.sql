-- Commercial subscription model: a 14-day trial capped at 50 customers,
-- three paid tiers, bank-transfer requests and server-enforced expiration.

alter table public.subscription_plans
  add column if not exists description text,
  add column if not exists annual_price numeric(12, 2);

update public.subscription_plans
set
  name = 'Prueba gratuita',
  description = '14 días para validar CrediCel con una tienda y hasta 50 clientes.',
  limits = '{"branches":1,"users":5,"customers":50,"applications_monthly":50}'::jsonb,
  features = '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true}'::jsonb,
  monthly_price = 0,
  annual_price = 0,
  trial_days = 14,
  status = 'active'
where code = 'trial';

insert into public.subscription_plans (
  code, name, description, monthly_price, annual_price, limits, features, status
) values
  (
    'small', 'Pequeño',
    'Para una tienda que está ordenando su venta a crédito.',
    1499, 14990,
    '{"branches":1,"users":6,"customers":250,"applications_monthly":150}',
    '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true}',
    'active'
  ),
  (
    'medium', 'Mediano',
    'Para operaciones en crecimiento con varias tiendas y equipo de crédito.',
    3499, 34990,
    '{"branches":5,"users":25,"customers":1500,"applications_monthly":750}',
    '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"advanced_audit":true}',
    'active'
  ),
  (
    'large', 'Grande',
    'Para cadenas con alto volumen, mayor control y acompañamiento prioritario.',
    7999, 79990,
    '{"branches":15,"users":75,"customers":5000,"applications_monthly":2500}',
    '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"advanced_audit":true,"priority_support":true}',
    'active'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  limits = excluded.limits,
  features = excluded.features,
  status = excluded.status;

-- Preserve existing customers by mapping legacy paid plans before hiding them.
update public.organization_subscriptions as subscription
set plan_id = replacement.id
from public.subscription_plans as legacy
join public.subscription_plans as replacement
  on replacement.code = case legacy.code when 'starter' then 'small' else 'medium' end
where subscription.plan_id = legacy.id
  and legacy.code in ('starter', 'growth');

update public.subscription_plans
set status = 'inactive'
where code in ('starter', 'growth');

alter table public.organization_subscriptions
  add column if not exists current_period_started_at timestamptz,
  add column if not exists current_period_ends_at timestamptz,
  add column if not exists locked_at timestamptz;

update public.organization_subscriptions
set
  current_period_started_at = coalesce(current_period_started_at, trial_started_at),
  current_period_ends_at = coalesce(
    current_period_ends_at,
    case when status = 'trialing' then trial_ends_at else now() + interval '1 month' end
  );

create table public.platform_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  account_type text not null check (account_type in ('checking', 'savings')),
  currency text not null default 'HNL' check (currency in ('HNL', 'USD')),
  instructions text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.subscription_payment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.subscription_plans(id),
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  expected_amount numeric(12, 2) not null check (expected_amount > 0),
  origin_bank text not null check (length(btrim(origin_bank)) between 2 and 100),
  reference_number text not null check (length(btrim(reference_number)) between 3 and 100),
  transferred_on date not null,
  status text not null default 'reported'
    check (status in ('reported', 'under_review', 'confirmed', 'rejected')),
  created_by uuid not null references public.profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  unique (origin_bank, reference_number)
);

alter table public.platform_bank_accounts enable row level security;
alter table public.subscription_payment_requests enable row level security;
alter table public.subscription_payment_requests force row level security;

create policy platform_bank_accounts_read
on public.platform_bank_accounts for select to authenticated
using (status = 'active');

create policy subscription_payment_requests_own_read
on public.subscription_payment_requests for select to authenticated
using (organization_id = private.current_organization_id());

grant select on public.platform_bank_accounts, public.subscription_payment_requests to authenticated;

create or replace function private.enforce_plan_resource_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metric text;
  v_limit integer;
  v_count integer;
  v_status public.subscription_status;
  v_trial_end timestamptz;
  v_period_end timestamptz;
begin
  v_metric := case tg_table_name
    when 'branches' then 'branches'
    when 'profiles' then 'users'
    when 'customers' then 'customers'
  end;

  select
    subscription.status,
    subscription.trial_ends_at,
    subscription.current_period_ends_at,
    (plan.limits ->> v_metric)::integer
  into v_status, v_trial_end, v_period_end, v_limit
  from public.organization_subscriptions as subscription
  join public.subscription_plans as plan on plan.id = subscription.plan_id
  where subscription.organization_id = new.organization_id;

  if not found then
    raise exception 'La organización no tiene una suscripción';
  end if;

  if v_status in ('suspended', 'cancelled', 'expired')
    or (v_status = 'trialing' and v_trial_end <= now())
    or (v_status <> 'trialing' and coalesce(v_period_end, now()) <= now()) then
    raise exception 'La suscripción está vencida o suspendida';
  end if;

  execute format(
    'select count(*) from public.%I where organization_id = $1',
    tg_table_name
  ) into v_count using new.organization_id;

  if v_count >= v_limit then
    raise exception 'El plan permite un máximo de % %',
      v_limit,
      case v_metric
        when 'branches' then 'tiendas'
        when 'users' then 'usuarios'
        else 'clientes'
      end;
  end if;

  return new;
end;
$$;

drop trigger if exists customers_plan_limit on public.customers;
create trigger customers_plan_limit
before insert on public.customers
for each row execute function private.enforce_plan_resource_limit();

create or replace function private.enforce_subscription_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feature text;
  v_status public.subscription_status;
  v_trial_end timestamptz;
  v_period_end timestamptz;
  v_enabled boolean;
  v_limit integer;
  v_count integer;
begin
  v_feature := case tg_table_name
    when 'credit_applications' then 'credit'
    when 'inventory_units' then 'inventory'
    when 'inventory_transfers' then 'inventory'
    when 'transfer_reports' then 'payments'
  end;

  select
    subscription.status,
    subscription.trial_ends_at,
    subscription.current_period_ends_at,
    coalesce((plan.features ->> v_feature)::boolean, false),
    (plan.limits ->> 'applications_monthly')::integer
  into v_status, v_trial_end, v_period_end, v_enabled, v_limit
  from public.organization_subscriptions as subscription
  join public.subscription_plans as plan on plan.id = subscription.plan_id
  where subscription.organization_id = new.organization_id;

  if not found
    or v_status in ('suspended', 'cancelled', 'expired')
    or (v_status = 'trialing' and v_trial_end <= now())
    or (v_status <> 'trialing' and coalesce(v_period_end, now()) <= now()) then
    raise exception 'La suscripción está vencida o suspendida';
  end if;

  if not v_enabled then
    raise exception 'Esta función no está incluida en el plan actual';
  end if;

  if tg_table_name = 'credit_applications' then
    select count(*) into v_count
    from public.credit_applications
    where organization_id = new.organization_id
      and created_at >= date_trunc('month', now());
    if v_count >= v_limit then
      raise exception 'Se alcanzó el límite mensual de solicitudes';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.subscription_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
select jsonb_build_object(
  'subscription', jsonb_build_object(
    'status', case
      when subscription.status = 'trialing' and subscription.trial_ends_at <= now() then 'expired'
      when subscription.status <> 'trialing'
        and coalesce(subscription.current_period_ends_at, now()) <= now() then 'expired'
      else subscription.status::text
    end,
    'trial_started_at', subscription.trial_started_at,
    'trial_ends_at', subscription.trial_ends_at,
    'current_period_ends_at', subscription.current_period_ends_at,
    'days_remaining', greatest(0, ceil(extract(epoch from (
      case when subscription.status = 'trialing'
        then subscription.trial_ends_at
        else subscription.current_period_ends_at
      end - now()
    )) / 86400))
  ),
  'plan', jsonb_build_object(
    'id', plan.id,
    'code', plan.code,
    'name', plan.name,
    'limits', plan.limits,
    'features', plan.features
  ),
  'usage', jsonb_build_object(
    'branches', (select count(*) from public.branches where organization_id = subscription.organization_id),
    'users', (select count(*) from public.profiles where organization_id = subscription.organization_id),
    'customers', (select count(*) from public.customers where organization_id = subscription.organization_id),
    'applications_monthly', (
      select count(*) from public.credit_applications
      where organization_id = subscription.organization_id
        and created_at >= date_trunc('month', now())
    )
  ),
  'pending_payment', (
    select jsonb_build_object(
      'id', request.id,
      'plan_code', request_plan.code,
      'plan_name', request_plan.name,
      'billing_cycle', request.billing_cycle,
      'amount', request.expected_amount,
      'status', request.status,
      'reference_number', request.reference_number,
      'created_at', request.created_at
    )
    from public.subscription_payment_requests as request
    join public.subscription_plans as request_plan on request_plan.id = request.plan_id
    where request.organization_id = subscription.organization_id
      and request.status in ('reported', 'under_review')
    order by request.created_at desc
    limit 1
  )
)
from public.organization_subscriptions as subscription
join public.subscription_plans as plan on plan.id = subscription.plan_id
where subscription.organization_id = private.current_organization_id();
$$;

create or replace function public.report_subscription_transfer(
  p_plan_code text,
  p_billing_cycle text,
  p_origin_bank text,
  p_reference_number text,
  p_transferred_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_plan public.subscription_plans%rowtype;
  v_request_id uuid;
  v_amount numeric(12, 2);
begin
  if v_organization_id is null or not private.has_role('organization_owner') then
    raise exception 'Solo el propietario puede comprar un plan' using errcode = '42501';
  end if;

  if p_billing_cycle not in ('monthly', 'annual') then
    raise exception 'Ciclo de facturación inválido';
  end if;

  select * into v_plan
  from public.subscription_plans
  where code = p_plan_code
    and status = 'active'
    and code <> 'trial';

  if not found then raise exception 'Plan inválido'; end if;
  if p_transferred_on > current_date or p_transferred_on < current_date - 30 then
    raise exception 'Fecha de transferencia inválida';
  end if;

  v_amount := case when p_billing_cycle = 'annual'
    then v_plan.annual_price else v_plan.monthly_price end;

  insert into public.subscription_payment_requests (
    organization_id, plan_id, billing_cycle, expected_amount,
    origin_bank, reference_number, transferred_on, created_by
  ) values (
    v_organization_id, v_plan.id, p_billing_cycle, v_amount,
    btrim(p_origin_bank), btrim(p_reference_number), p_transferred_on, auth.uid()
  ) returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'Esta referencia de transferencia ya fue reportada';
end;
$$;

revoke all on function public.report_subscription_transfer(text, text, text, text, date)
from public, anon;
grant execute on function public.report_subscription_transfer(text, text, text, text, date)
to authenticated;

create or replace function public.confirm_subscription_transfer(
  p_request_id uuid,
  p_approve boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.subscription_payment_requests%rowtype;
begin
  select * into v_request
  from public.subscription_payment_requests
  where id = p_request_id and status in ('reported', 'under_review')
  for update;
  if not found then raise exception 'Solicitud no disponible'; end if;

  update public.subscription_payment_requests
  set
    status = case when p_approve then 'confirmed' else 'rejected' end,
    reviewed_at = now(),
    reviewer_notes = nullif(btrim(p_notes), '')
  where id = p_request_id;

  if p_approve then
    update public.organization_subscriptions
    set
      plan_id = v_request.plan_id,
      status = 'active',
      current_period_started_at = now(),
      current_period_ends_at = now() + case
        when v_request.billing_cycle = 'annual' then interval '1 year'
        else interval '1 month'
      end,
      locked_at = null
    where organization_id = v_request.organization_id;
  end if;
end;
$$;

revoke all on function public.confirm_subscription_transfer(uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.confirm_subscription_transfer(uuid, boolean, text)
to service_role;

-- Direct self-service plan activation is intentionally disabled.
revoke execute on function public.change_subscription_plan(text) from authenticated;
