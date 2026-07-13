create or replace function public.create_organization_onboarding(p_name text,p_commercial_name text,p_legal_name text,p_owner_name text,p_rtn text,p_branch_name text,p_branch_code text,p_address text,p_phone text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_unit uuid;v_role uuid;
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501';end if;
 if exists(select 1 from public.profiles where id=v_user) then raise exception 'user already belongs to an organization';end if;
 if length(trim(p_name))<2 or length(trim(p_branch_code))<2 then raise exception 'invalid organization data';end if;
 insert into public.organizations(name,commercial_name) values(trim(p_name),trim(p_commercial_name)) returning id into v_org;
 insert into public.business_units(organization_id,legal_name,commercial_name,owner_name,rtn) values(v_org,trim(p_legal_name),trim(p_commercial_name),trim(p_owner_name),nullif(trim(p_rtn),'')) returning id into v_unit;
 insert into public.branches(organization_id,business_unit_id,name,code,branch_type,address,phone) values(v_org,v_unit,trim(p_branch_name),upper(trim(p_branch_code)),'store',trim(p_address),nullif(trim(p_phone),''));
 insert into public.profiles(id,organization_id,full_name) values(v_user,v_org,coalesce((auth.jwt()->'user_metadata'->>'full_name'),p_owner_name));
 insert into public.roles(organization_id,name,description,is_system) values(v_org,'organization_admin','Administrador de organización',true) returning id into v_role;
 insert into public.profile_roles(profile_id,role_id) values(v_user,v_role);
 return v_org;
end $$;
revoke all on function public.create_organization_onboarding(text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.create_organization_onboarding(text,text,text,text,text,text,text,text,text) to authenticated;
