create or replace function public.ensure_owner_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_metadata jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  v_full_name text;
  v_organization_id uuid;
  v_business_unit_id uuid;
  v_branch_id uuid;
  v_owner_role_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticación requerida' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select organization_id into v_organization_id
  from public.profiles where id = v_user_id;
  if v_organization_id is not null then return v_organization_id; end if;

  if exists (
    select 1 from public.team_invitations
    where lower(email) = v_email
      and accepted_at is null
      and expires_at > now()
  ) then
    raise exception 'Debes aceptar tu invitación pendiente';
  end if;

  if v_metadata ? 'organization_onboarding' then
    perform private.complete_confirmed_owner_onboarding(v_user_id, v_metadata);
    select organization_id into v_organization_id
    from public.profiles where id = v_user_id;
    if v_organization_id is not null then return v_organization_id; end if;
  end if;

  v_full_name := btrim(coalesce(nullif(v_metadata ->> 'full_name', ''), split_part(v_email, '@', 1), 'Propietario'));

  insert into public.organizations (name, commercial_name)
  values (v_full_name || ' - Organización', v_full_name)
  returning id into v_organization_id;

  insert into public.business_units (
    organization_id, legal_name, commercial_name, owner_name
  ) values (
    v_organization_id, v_full_name || ' - Organización', v_full_name, v_full_name
  ) returning id into v_business_unit_id;

  insert into public.branches (
    organization_id, business_unit_id, name, code, branch_type, address
  ) values (
    v_organization_id, v_business_unit_id, 'Tienda principal', 'PRINCIPAL',
    'store', 'Dirección pendiente'
  ) returning id into v_branch_id;

  insert into public.profiles (id, organization_id, full_name)
  values (v_user_id, v_organization_id, v_full_name);

  select id into v_owner_role_id from public.roles
  where organization_id = v_organization_id and name = 'organization_owner';
  if v_owner_role_id is null then
    raise exception 'No fue posible crear el rol propietario';
  end if;

  insert into public.profile_roles (profile_id, role_id)
  values (v_user_id, v_owner_role_id)
  on conflict do nothing;

  insert into public.user_branch_access (profile_id, branch_id, can_manage)
  values (v_user_id, v_branch_id, true)
  on conflict do nothing;

  return v_organization_id;
end;
$$;

revoke all on function public.ensure_owner_workspace() from public, anon;
grant execute on function public.ensure_owner_workspace() to authenticated;
