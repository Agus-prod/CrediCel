create or replace function private.complete_confirmed_owner_onboarding(
  p_user_id uuid,
  p_user_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_onboarding jsonb := p_user_metadata -> 'organization_onboarding';
  v_organization_id uuid;
  v_business_unit_id uuid;
  v_branch_id uuid;
  v_owner_role_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (select 1 from public.profiles where id = p_user_id) then
    return false;
  end if;
  if v_onboarding is null
    or length(btrim(coalesce(v_onboarding ->> 'name', ''))) < 2
    or length(btrim(coalesce(v_onboarding ->> 'branch_code', ''))) < 2 then
    return false;
  end if;

  insert into public.organizations (name, commercial_name)
  values (
    btrim(v_onboarding ->> 'name'),
    btrim(coalesce(v_onboarding ->> 'commercial_name', v_onboarding ->> 'name'))
  )
  returning id into v_organization_id;

  insert into public.business_units (
    organization_id, legal_name, commercial_name, owner_name, rtn
  )
  values (
    v_organization_id,
    btrim(coalesce(v_onboarding ->> 'legal_name', v_onboarding ->> 'name')),
    btrim(coalesce(v_onboarding ->> 'commercial_name', v_onboarding ->> 'name')),
    btrim(coalesce(v_onboarding ->> 'owner_name', p_user_metadata ->> 'full_name')),
    nullif(btrim(coalesce(v_onboarding ->> 'rtn', '')), '')
  )
  returning id into v_business_unit_id;

  insert into public.branches (
    organization_id, business_unit_id, name, code,
    branch_type, address, phone
  )
  values (
    v_organization_id,
    v_business_unit_id,
    btrim(coalesce(v_onboarding ->> 'branch_name', 'Tienda principal')),
    upper(btrim(v_onboarding ->> 'branch_code')),
    'store',
    btrim(coalesce(v_onboarding ->> 'address', 'Dirección pendiente')),
    nullif(btrim(coalesce(v_onboarding ->> 'phone', '')), '')
  )
  returning id into v_branch_id;

  insert into public.profiles (id, organization_id, full_name)
  values (
    p_user_id,
    v_organization_id,
    btrim(coalesce(
      p_user_metadata ->> 'full_name',
      v_onboarding ->> 'owner_name',
      'Propietario'
    ))
  );

  select id into v_owner_role_id
  from public.roles
  where organization_id = v_organization_id
    and name = 'organization_owner';

  if v_owner_role_id is null then
    raise exception 'No fue posible crear el rol propietario';
  end if;

  insert into public.profile_roles (profile_id, role_id)
  values (p_user_id, v_owner_role_id)
  on conflict do nothing;

  insert into public.user_branch_access (profile_id, branch_id, can_manage)
  values (p_user_id, v_branch_id, true)
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function private.complete_confirmed_owner_onboarding(uuid, jsonb)
from public, anon, authenticated;

create or replace function private.on_confirmed_owner_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null then
    perform private.complete_confirmed_owner_onboarding(
      new.id,
      coalesce(new.raw_user_meta_data, '{}'::jsonb)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists confirmed_owner_onboarding_insert on auth.users;
create trigger confirmed_owner_onboarding_insert
after insert on auth.users
for each row execute function private.on_confirmed_owner_onboarding();

drop trigger if exists confirmed_owner_onboarding_update on auth.users;
create trigger confirmed_owner_onboarding_update
after update of email_confirmed_at on auth.users
for each row execute function private.on_confirmed_owner_onboarding();

do $$
declare
  v_user record;
begin
  for v_user in
    select users.id, users.raw_user_meta_data
    from auth.users as users
    where users.email_confirmed_at is not null
      and users.raw_user_meta_data ? 'organization_onboarding'
      and not exists (
        select 1 from public.profiles where profiles.id = users.id
      )
  loop
    perform private.complete_confirmed_owner_onboarding(
      v_user.id,
      coalesce(v_user.raw_user_meta_data, '{}'::jsonb)
    );
  end loop;
end;
$$;
