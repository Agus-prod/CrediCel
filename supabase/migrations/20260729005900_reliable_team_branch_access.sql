-- Keep operational users attached to a store and let organization owners repair
-- legacy assignments without granting any cross-tenant access.

update public.team_invitations
set expires_at = least(expires_at, now())
where accepted_at is null
  and branch_id is null
  and role_name not in ('organization_admin', 'auditor');

alter table public.team_invitations
drop constraint if exists team_invitations_operational_role_branch_check;

alter table public.team_invitations
add constraint team_invitations_operational_role_branch_check
check (
  branch_id is not null
  or role_name in ('organization_admin', 'auditor')
  or accepted_at is not null
);

-- First recover the store recorded in the accepted invitation when an older
-- deployment created the profile but missed user_branch_access.
insert into public.user_branch_access (profile_id, branch_id, can_manage)
select
  profile.id,
  invitation.branch_id,
  invitation.role_name = 'branch_manager'
from public.profiles as profile
join auth.users as auth_user on auth_user.id = profile.id
join lateral (
  select candidate.branch_id, candidate.role_name
  from public.team_invitations as candidate
  where candidate.organization_id = profile.organization_id
    and lower(candidate.email) = lower(auth_user.email)
    and candidate.accepted_at is not null
    and candidate.branch_id is not null
  order by candidate.accepted_at desc, candidate.created_at desc
  limit 1
) as invitation on true
where not exists (
  select 1
  from public.user_branch_access as existing_access
  where existing_access.profile_id = profile.id
)
on conflict do nothing;

-- If the organization has only one active store there is no ambiguity, so
-- repair any remaining branch-scoped legacy member automatically.
with only_active_branch as (
  select
    branch.organization_id,
    (array_agg(branch.id order by branch.created_at, branch.id))[1] as branch_id
  from public.branches as branch
  where branch.status = 'active'
  group by branch.organization_id
  having count(*) = 1
), branch_scoped_profile as (
  select
    profile.id,
    profile.organization_id,
    bool_or(role.name = 'branch_manager') as can_manage
  from public.profiles as profile
  join public.profile_roles as profile_role on profile_role.profile_id = profile.id
  join public.roles as role on role.id = profile_role.role_id
  where role.name in (
    'branch_manager',
    'credit_manager',
    'credit_analyst',
    'salesperson',
    'cashier',
    'inventory_manager',
    'collections_agent'
  )
  group by profile.id, profile.organization_id
)
insert into public.user_branch_access (profile_id, branch_id, can_manage)
select scoped_profile.id, active_branch.branch_id, scoped_profile.can_manage
from branch_scoped_profile as scoped_profile
join only_active_branch as active_branch
  on active_branch.organization_id = scoped_profile.organization_id
where not exists (
  select 1
  from public.user_branch_access as existing_access
  where existing_access.profile_id = scoped_profile.id
)
on conflict do nothing;

create or replace function public.set_member_branch_access(
  p_profile_id uuid,
  p_branch_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_can_manage boolean;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not (
      private.has_role('organization_owner')
      or private.has_role('organization_admin')
    ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_profile_id
      and profile.organization_id = v_organization_id
      and profile.status = 'active'
  ) then
    raise exception 'El integrante no pertenece a esta organización';
  end if;

  if not exists (
    select 1
    from public.branches as branch
    where branch.id = p_branch_id
      and branch.organization_id = v_organization_id
      and branch.status = 'active'
  ) then
    raise exception 'Seleccione una tienda activa de la organización';
  end if;

  select exists (
    select 1
    from public.profile_roles as profile_role
    join public.roles as role on role.id = profile_role.role_id
    where profile_role.profile_id = p_profile_id
      and role.organization_id = v_organization_id
      and role.name = 'branch_manager'
  ) into v_can_manage;

  delete from public.user_branch_access
  where profile_id = p_profile_id;

  insert into public.user_branch_access (profile_id, branch_id, can_manage)
  values (p_profile_id, p_branch_id, v_can_manage);

  insert into public.audit_logs (
    organization_id,
    branch_id,
    user_id,
    action,
    entity_type,
    entity_id,
    after_values,
    metadata
  ) values (
    v_organization_id,
    p_branch_id,
    auth.uid(),
    'member_branch_access_updated',
    'profile',
    p_profile_id,
    jsonb_build_object('branch_id', p_branch_id, 'can_manage', v_can_manage),
    jsonb_build_object('source', 'team_access')
  );
end;
$$;

revoke all on function public.set_member_branch_access(uuid, uuid)
from public, anon;
grant execute on function public.set_member_branch_access(uuid, uuid)
to authenticated;
