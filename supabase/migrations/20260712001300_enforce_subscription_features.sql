create or replace function private.enforce_subscription_feature() returns trigger language plpgsql security definer set search_path='' as $$
declare v_feature text;v_status public.subscription_status;v_trial_end timestamptz;v_enabled boolean;v_limit integer;v_count integer;
begin
 v_feature=case tg_table_name when 'credit_applications' then 'credit' when 'inventory_units' then 'inventory' when 'inventory_transfers' then 'inventory' when 'transfer_reports' then 'payments' end;
 select s.status,s.trial_ends_at,coalesce((p.features->>v_feature)::boolean,false),(p.limits->>'applications_monthly')::integer into v_status,v_trial_end,v_enabled,v_limit from public.organization_subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.organization_id=new.organization_id;
 if not found or v_status in('suspended','cancelled','expired') or (v_status='trialing' and v_trial_end<=now()) then raise exception 'La suscripción está vencida o suspendida';end if;
 if not v_enabled then raise exception 'Esta función no está incluida en el plan actual';end if;
 if tg_table_name='credit_applications' then select count(*) into v_count from public.credit_applications where organization_id=new.organization_id and created_at>=date_trunc('month',now());if v_count>=v_limit then raise exception 'Se alcanzó el límite mensual de solicitudes';end if;end if;
 return new;
end $$;
create trigger credit_applications_subscription before insert on public.credit_applications for each row execute function private.enforce_subscription_feature();
create trigger inventory_units_subscription before insert on public.inventory_units for each row execute function private.enforce_subscription_feature();
create trigger inventory_transfers_subscription before insert on public.inventory_transfers for each row execute function private.enforce_subscription_feature();
create trigger transfer_reports_subscription before insert on public.transfer_reports for each row execute function private.enforce_subscription_feature();

create or replace function public.subscription_summary() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('subscription',jsonb_build_object('status',case when s.status='trialing' and s.trial_ends_at<=now() then 'expired' else s.status::text end,'trial_started_at',s.trial_started_at,'trial_ends_at',s.trial_ends_at,'days_remaining',greatest(0,ceil(extract(epoch from(s.trial_ends_at-now()))/86400))),'plan',jsonb_build_object('id',p.id,'code',p.code,'name',p.name,'limits',p.limits,'features',p.features),'usage',jsonb_build_object('branches',(select count(*) from public.branches b where b.organization_id=s.organization_id),'users',(select count(*) from public.profiles u where u.organization_id=s.organization_id),'applications_monthly',(select count(*) from public.credit_applications a where a.organization_id=s.organization_id and a.created_at>=date_trunc('month',now())))) from public.organization_subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.organization_id=private.current_organization_id()
$$;
