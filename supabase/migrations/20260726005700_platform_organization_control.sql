create table if not exists public.platform_administration_audit (
  id bigint generated always as identity primary key,
  operator_id uuid not null references auth.users(id),
  organization_id uuid not null references public.organizations(id),
  action text not null check (action in ('suspended', 'reactivated')),
  reason text not null check (length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now()
);

alter table public.platform_administration_audit enable row level security;
alter table public.platform_administration_audit force row level security;
revoke all on public.platform_administration_audit from public, anon, authenticated;

create or replace function public.list_platform_organizations()
returns table (
  organization_id uuid,
  organization_name text,
  organization_status public.entity_status,
  subscription_status public.subscription_status,
  plan_name text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  customers bigint,
  branches bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_operator() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
  select organization.id, organization.commercial_name, organization.status,
    subscription.status, plan.name, subscription.trial_ends_at,
    subscription.current_period_ends_at,
    (select count(*) from public.customers customer where customer.organization_id = organization.id),
    (select count(*) from public.branches branch where branch.organization_id = organization.id and branch.status = 'active')
  from public.organizations organization
  left join public.organization_subscriptions subscription on subscription.organization_id = organization.id
  left join public.subscription_plans plan on plan.id = subscription.plan_id
  order by organization.created_at desc;
end $$;

create or replace function public.set_platform_organization_access(p_organization_id uuid,p_action text,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_operator uuid := auth.uid(); v_subscription public.organization_subscriptions%rowtype;
begin
  if not private.is_platform_operator() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_action not in ('suspended', 'reactivated') then raise exception 'Acción inválida'; end if;
  if length(btrim(p_reason)) not between 5 and 500 then raise exception 'Escribe un motivo claro'; end if;
  select * into v_subscription from public.organization_subscriptions where organization_id = p_organization_id for update;
  if not found then raise exception 'La organización no tiene suscripción'; end if;
  if p_action = 'reactivated' and coalesce(v_subscription.current_period_ends_at, v_subscription.trial_ends_at) <= now() then
    raise exception 'El período está vencido; primero confirma un pago o asigna un período válido';
  end if;
  update public.organization_subscriptions
  set status = case when p_action = 'suspended' then 'suspended'::public.subscription_status
    when v_subscription.plan_id = (select id from public.subscription_plans where code = 'trial') then 'trialing'::public.subscription_status
    else 'active'::public.subscription_status end,
    locked_at = case when p_action = 'suspended' then now() else null end
  where organization_id = p_organization_id;
  insert into public.platform_administration_audit(operator_id,organization_id,action,reason)
  values(v_operator,p_organization_id,p_action,btrim(p_reason));
end $$;

revoke all on function public.list_platform_organizations() from public,anon;
revoke all on function public.set_platform_organization_access(uuid,text,text) from public,anon;
grant execute on function public.list_platform_organizations(),public.set_platform_organization_access(uuid,text,text) to authenticated;
