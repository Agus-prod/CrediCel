-- Secure platform operations for transfer review and renewal reminders.

create table public.platform_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

alter table public.platform_operators enable row level security;
alter table public.platform_operators force row level security;
revoke all on public.platform_operators from public, anon, authenticated;

create or replace function private.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_operators
    where user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_platform_operator(); $$;

alter table public.subscription_payment_requests
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists review_action_at timestamptz;

create table public.subscription_payment_audit (
  id bigint generated always as identity primary key,
  payment_request_id uuid not null references public.subscription_payment_requests(id),
  organization_id uuid not null references public.organizations(id),
  operator_id uuid not null references auth.users(id),
  action text not null check (action in ('confirmed', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.subscription_payment_audit enable row level security;
alter table public.subscription_payment_audit force row level security;
revoke all on public.subscription_payment_audit from public, anon, authenticated;
create trigger subscription_payment_audit_immutable
before update or delete on public.subscription_payment_audit
for each row execute function private.block_mutation();

create or replace function public.list_subscription_transfers_for_review()
returns table (
  id uuid,
  organization_name text,
  plan_name text,
  billing_cycle text,
  expected_amount numeric,
  origin_bank text,
  reference_number text,
  transferred_on date,
  reported_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_operator() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
  select request.id, organization.name, plan.name, request.billing_cycle,
    request.expected_amount, request.origin_bank, request.reference_number,
    request.transferred_on, request.created_at, request.status
  from public.subscription_payment_requests request
  join public.organizations organization on organization.id = request.organization_id
  join public.subscription_plans plan on plan.id = request.plan_id
  where request.status in ('reported', 'under_review')
  order by request.created_at;
end;
$$;

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
  v_operator uuid := auth.uid();
begin
  if auth.role() <> 'service_role' and not private.is_platform_operator() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_request
  from public.subscription_payment_requests
  where id = p_request_id and status in ('reported', 'under_review')
  for update;
  if not found then raise exception 'Solicitud no disponible'; end if;

  update public.subscription_payment_requests
  set status = case when p_approve then 'confirmed' else 'rejected' end,
      reviewed_at = now(), review_action_at = now(), reviewed_by = v_operator,
      reviewer_notes = nullif(btrim(p_notes), '')
  where id = p_request_id;

  if v_operator is not null then
    insert into public.subscription_payment_audit
      (payment_request_id, organization_id, operator_id, action, notes)
    values (v_request.id, v_request.organization_id, v_operator,
      case when p_approve then 'confirmed' else 'rejected' end,
      nullif(btrim(p_notes), ''));
  end if;

  if p_approve then
    update public.organization_subscriptions
    set plan_id = v_request.plan_id, status = 'active',
        current_period_started_at = now(),
        current_period_ends_at = now() + case when v_request.billing_cycle = 'annual' then interval '1 year' else interval '1 month' end,
        locked_at = null
    where organization_id = v_request.organization_id;
  end if;
end;
$$;

create table public.subscription_notifications (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id),
  subscription_id uuid not null references public.organization_subscriptions(id),
  notification_type text not null check (notification_type in ('trial_expiring', 'subscription_expiring', 'expired')),
  days_before integer not null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'dismissed')),
  scheduled_for date not null default current_date,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (subscription_id, notification_type, days_before, scheduled_for)
);

alter table public.subscription_notifications enable row level security;
alter table public.subscription_notifications force row level security;
create policy subscription_notifications_own_read on public.subscription_notifications
for select to authenticated using (organization_id = private.current_organization_id());
grant select on public.subscription_notifications to authenticated;

create or replace function public.enqueue_subscription_expiry_notifications(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into public.subscription_notifications
    (organization_id, subscription_id, notification_type, days_before, scheduled_for)
  select subscription.organization_id, subscription.id,
    case when subscription.status = 'trialing' then 'trial_expiring'
         when greatest(subscription.trial_ends_at, subscription.current_period_ends_at) < p_today::timestamptz then 'expired'
         else 'subscription_expiring' end,
    case when greatest(subscription.trial_ends_at, subscription.current_period_ends_at) < p_today::timestamptz then 0
         else (greatest(subscription.trial_ends_at, subscription.current_period_ends_at)::date - p_today) end,
    p_today
  from public.organization_subscriptions subscription
  where subscription.status in ('trialing', 'active')
    and (greatest(subscription.trial_ends_at, subscription.current_period_ends_at)::date - p_today) in (7, 3, 1)
     or (subscription.status in ('trialing', 'active') and greatest(subscription.trial_ends_at, subscription.current_period_ends_at)::date < p_today)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.is_platform_operator() from public, anon;
grant execute on function public.is_platform_operator() to authenticated;
revoke all on function public.list_subscription_transfers_for_review() from public, anon;
grant execute on function public.list_subscription_transfers_for_review() to authenticated;
revoke all on function public.confirm_subscription_transfer(uuid, boolean, text) from public, anon;
grant execute on function public.confirm_subscription_transfer(uuid, boolean, text) to authenticated, service_role;
revoke all on function public.enqueue_subscription_expiry_notifications(date) from public, anon, authenticated;
grant execute on function public.enqueue_subscription_expiry_notifications(date) to service_role;
revoke all on function private.is_platform_operator() from public, anon, authenticated;
