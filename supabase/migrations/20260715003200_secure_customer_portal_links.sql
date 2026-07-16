-- Secure issuance of customer portal links by authorized staff.

create or replace function public.issue_customer_portal_link(
  p_customer_id uuid,
  p_rotate boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_access public.customer_portal_access%rowtype;
  v_branch_id uuid;
begin
  if v_organization_id is null then
    raise exception 'Autenticación requerida' using errcode = '42501';
  end if;

  select assignment.branch_id
  into v_branch_id
  from public.customer_assignments as assignment
  where assignment.organization_id = v_organization_id
    and assignment.customer_id = p_customer_id
    and assignment.ended_at is null
  order by assignment.assigned_at desc
  limit 1;

  if not exists (
    select 1
    from public.customers
    where id = p_customer_id
      and organization_id = v_organization_id
  ) or not (
    private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or (
      private.has_role('collections_agent')
      and exists (
        select 1
        from public.credit_accounts
        where organization_id = v_organization_id
          and customer_id = p_customer_id
      )
    )
    or (
      (
        private.has_role('branch_manager')
        or private.has_role('cashier')
        or private.has_role('credit_manager')
      )
      and v_branch_id is not null
      and private.has_branch_access(v_branch_id)
    )
  ) then
    raise exception 'No autorizado para emitir el acceso del cliente'
      using errcode = '42501';
  end if;

  select *
  into v_access
  from public.customer_portal_access
  where organization_id = v_organization_id
    and customer_id = p_customer_id
  order by created_at desc, id desc
  limit 1
  for update;

  if not found then
    insert into public.customer_portal_access (
      organization_id,
      customer_id
    )
    values (
      v_organization_id,
      p_customer_id
    )
    returning * into v_access;
  elsif p_rotate
    or v_access.revoked_at is not null
    or (v_access.expires_at is not null and v_access.expires_at <= now()) then
    update public.customer_portal_access
    set
      access_token = gen_random_uuid(),
      revoked_at = null,
      expires_at = null
    where id = v_access.id
    returning * into v_access;
  end if;

  insert into public.audit_logs (
    organization_id,
    branch_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    v_organization_id,
    v_branch_id,
    auth.uid(),
    'customer_portal_access',
    v_access.id,
    case when p_rotate then 'portal_link_rotated' else 'portal_link_issued' end,
    jsonb_build_object('customer_id', p_customer_id)
  );

  return v_access.access_token;
end;
$$;

revoke all on function public.issue_customer_portal_link(uuid, boolean)
  from public, anon;
grant execute on function public.issue_customer_portal_link(uuid, boolean)
  to authenticated;

comment on function public.issue_customer_portal_link(uuid, boolean) is
  'Returns or securely rotates a customer portal token after tenant, role and branch authorization.';
