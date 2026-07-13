create or replace function private.create_trial_subscription() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.organization_subscriptions(organization_id,plan_id,status,trial_started_at,trial_ends_at) select new.id,id,'trialing',now(),now()+(trial_days||' days')::interval from public.subscription_plans where code='trial' on conflict(organization_id) do nothing;return new;end $$;
create trigger organizations_trial_subscription after insert on public.organizations for each row execute function private.create_trial_subscription();

-- El primer administrador de organizaciones existentes se reconoce como propietario.
insert into public.profile_roles(profile_id,role_id)
select distinct on(p.organization_id) p.id,owner_role.id from public.profiles p join public.profile_roles pr on pr.profile_id=p.id join public.roles cr on cr.id=pr.role_id and cr.name='organization_admin' join public.roles owner_role on owner_role.organization_id=p.organization_id and owner_role.name='organization_owner' order by p.organization_id,p.created_at on conflict do nothing;

create or replace function private.enforce_plan_resource_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare v_metric text;v_limit integer;v_count integer;v_status public.subscription_status;v_trial_end timestamptz;
begin
 v_metric=case tg_table_name when 'branches' then 'branches' when 'profiles' then 'users' end;
 select s.status,s.trial_ends_at,(p.limits->>v_metric)::integer into v_status,v_trial_end,v_limit from public.organization_subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.organization_id=new.organization_id;
 if not found then raise exception 'La organización no tiene una suscripción';end if;
 if v_status in('suspended','cancelled','expired') or (v_status='trialing' and v_trial_end<=now()) then raise exception 'La suscripción no está activa';end if;
 execute format('select count(*) from public.%I where organization_id=$1',tg_table_name) into v_count using new.organization_id;
 if v_count>=v_limit then raise exception 'El plan permite un máximo de % %',v_limit,case v_metric when 'branches' then 'tiendas' else 'usuarios' end;end if;
 return new;
end $$;
create trigger branches_plan_limit before insert on public.branches for each row execute function private.enforce_plan_resource_limit();
create trigger profiles_plan_limit before insert on public.profiles for each row execute function private.enforce_plan_resource_limit();

alter table public.subscription_plans add column monthly_price numeric(12,2) not null default 0;
update public.subscription_plans set monthly_price=case code when 'starter' then 1499 when 'growth' then 2999 else 0 end;

create or replace function public.subscription_summary() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('subscription',jsonb_build_object('status',s.status,'trial_started_at',s.trial_started_at,'trial_ends_at',s.trial_ends_at,'days_remaining',greatest(0,ceil(extract(epoch from(s.trial_ends_at-now()))/86400))),'plan',jsonb_build_object('id',p.id,'code',p.code,'name',p.name,'limits',p.limits,'features',p.features),'usage',jsonb_build_object('branches',(select count(*) from public.branches b where b.organization_id=s.organization_id),'users',(select count(*) from public.profiles u where u.organization_id=s.organization_id),'applications_monthly',coalesce((select used from public.subscription_usage su where su.organization_id=s.organization_id and su.metric='applications_monthly' and current_date between su.period_start and su.period_end),0))) from public.organization_subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.organization_id=private.current_organization_id()
$$;
grant execute on function public.subscription_summary() to authenticated;

create or replace function public.change_subscription_plan(p_plan_code text) returns void language plpgsql security definer set search_path='' as $$
declare v_plan public.subscription_plans%rowtype;v_summary jsonb;
begin
 if not private.has_role('organization_owner') then raise exception 'Solo el propietario puede cambiar el plan' using errcode='42501';end if;
 select * into v_plan from public.subscription_plans where code=p_plan_code and status='active' and code<>'trial';if not found then raise exception 'Plan inválido';end if;
 v_summary=public.subscription_summary();
 if (v_summary->'usage'->>'branches')::integer>(v_plan.limits->>'branches')::integer or (v_summary->'usage'->>'users')::integer>(v_plan.limits->>'users')::integer then raise exception 'El uso actual supera los límites del plan seleccionado';end if;
 update public.organization_subscriptions set plan_id=v_plan.id,status='active' where organization_id=private.current_organization_id();
end $$;
revoke all on function public.change_subscription_plan(text) from public,anon;grant execute on function public.change_subscription_plan(text) to authenticated;

create or replace function public.create_organization_onboarding(p_name text,p_commercial_name text,p_legal_name text,p_owner_name text,p_rtn text,p_branch_name text,p_branch_code text,p_address text,p_phone text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_org uuid;v_unit uuid;v_role uuid;v_branch uuid;
begin
 if v_user is null then raise exception 'Autenticación requerida' using errcode='42501';end if;if exists(select 1 from public.profiles where id=v_user) then raise exception 'El usuario ya pertenece a una organización';end if;if length(trim(p_name))<2 or length(trim(p_branch_code))<2 then raise exception 'Datos de organización inválidos';end if;
 insert into public.organizations(name,commercial_name)values(trim(p_name),trim(p_commercial_name))returning id into v_org;
 insert into public.business_units(organization_id,legal_name,commercial_name,owner_name,rtn)values(v_org,trim(p_legal_name),trim(p_commercial_name),trim(p_owner_name),nullif(trim(p_rtn),''))returning id into v_unit;
 insert into public.branches(organization_id,business_unit_id,name,code,branch_type,address,phone)values(v_org,v_unit,trim(p_branch_name),upper(trim(p_branch_code)),'store',trim(p_address),nullif(trim(p_phone),''))returning id into v_branch;
 insert into public.profiles(id,organization_id,full_name)values(v_user,v_org,coalesce((auth.jwt()->'user_metadata'->>'full_name'),p_owner_name));
 insert into public.roles(organization_id,name,description,is_system)values(v_org,'organization_owner','Propietario de la organización',true)on conflict(organization_id,name)do update set description=excluded.description returning id into v_role;
 insert into public.role_permissions(role_id,permission_id)select v_role,id from public.permissions on conflict do nothing;insert into public.profile_roles(profile_id,role_id)values(v_user,v_role);insert into public.user_branch_access(profile_id,branch_id,can_manage)values(v_user,v_branch,true);
 return v_org;
end $$;
