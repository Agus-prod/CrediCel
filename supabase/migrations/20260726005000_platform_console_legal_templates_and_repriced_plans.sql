-- Product-ready SaaS tiers, tenant-owned legal templates and platform controls.

update public.subscription_plans set
  name = 'Esencial',
  description = 'Para una tienda que inicia su cartera de crédito con control completo.',
  monthly_price = 899,
  annual_price = 8990,
  limits = '{"branches":2,"users":10,"customers":300,"applications_monthly":250}'::jsonb,
  features = '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"legal_templates":true}'::jsonb
where code = 'small';

update public.subscription_plans set
  name = 'Negocio',
  description = 'Para equipos con varias tiendas, más volumen y trazabilidad avanzada.',
  monthly_price = 1899,
  annual_price = 18990,
  limits = '{"branches":5,"users":30,"customers":1500,"applications_monthly":1200}'::jsonb,
  features = '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"advanced_audit":true,"legal_templates":true}'::jsonb
where code = 'medium';

update public.subscription_plans set
  name = 'Red',
  description = 'Para cadenas con operación intensiva, múltiples sedes y atención prioritaria.',
  monthly_price = 3999,
  annual_price = 39990,
  limits = '{"branches":15,"users":100,"customers":5000,"applications_monthly":5000}'::jsonb,
  features = '{"credit":true,"inventory":true,"payments":true,"collections":true,"reports":true,"advanced_audit":true,"priority_support":true,"legal_templates":true}'::jsonb
where code = 'large';

create table public.organization_legal_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  document_type text not null check (document_type in ('credit_contract','promissory_note','privacy_policy','collection_policy','payment_receipt','debt_release')),
  title text not null,
  content text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document_type, version)
);

create unique index organization_legal_templates_one_draft
on public.organization_legal_templates (organization_id, document_type)
where status = 'draft';

create unique index organization_legal_templates_one_published
on public.organization_legal_templates (organization_id, document_type)
where status = 'published';

alter table public.organization_legal_templates enable row level security;
alter table public.organization_legal_templates force row level security;
create policy legal_templates_tenant_read on public.organization_legal_templates
for select to authenticated using (organization_id = private.current_organization_id());
grant select on public.organization_legal_templates to authenticated;

create or replace function public.initialize_legal_templates()
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid := private.current_organization_id(); v_user uuid := auth.uid();
begin
  if v_org is null or not (private.has_role('organization_owner') or private.has_role('organization_admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into public.organization_legal_templates(organization_id,document_type,title,content,created_by,updated_by)
  values
    (v_org,'credit_contract','Contrato de crédito','CONTRATO DE CRÉDITO\n\nEntre {{organization_name}} y {{customer_name}}, identidad {{customer_dni}}, se acuerda el financiamiento del equipo {{device_description}} por {{financed_amount}}, sujeto al calendario de pagos aceptado por las partes.\n\nAgregue aquí las obligaciones, garantías, mora, jurisdicción y demás condiciones revisadas por su asesor legal.',v_user,v_user),
    (v_org,'promissory_note','Pagaré','PAGARÉ\n\nYo, {{customer_name}}, identidad {{customer_dni}}, prometo pagar a {{organization_name}} la suma de {{financed_amount}} conforme al calendario de {{installment_count}} cuotas, más los cargos expresamente pactados.\n\nComplete el lugar de pago, vencimiento, intereses y cláusulas exigidas por la legislación aplicable.',v_user,v_user),
    (v_org,'privacy_policy','Política de privacidad','POLÍTICA DE PRIVACIDAD\n\n{{organization_name}} tratará los datos del cliente únicamente para evaluación, formalización, administración y cobranza del crédito, conforme al consentimiento otorgado y la normativa aplicable.',v_user,v_user),
    (v_org,'collection_policy','Política de cobranza','POLÍTICA DE COBRANZA\n\nLa organización realizará recordatorios y gestiones de cobro por medios autorizados, manteniendo trazabilidad, trato respetuoso y apego a la normativa aplicable.',v_user,v_user),
    (v_org,'payment_receipt','Recibo de pago','Se certifica la recepción de {{payment_amount}} correspondiente al crédito de {{customer_name}}. Saldo posterior: {{remaining_balance}}.',v_user,v_user),
    (v_org,'debt_release','Finiquito y paz y salvo','Se hace constar que {{customer_name}}, identidad {{customer_dni}}, canceló la totalidad del crédito y mantiene saldo {{remaining_balance}}.',v_user,v_user)
  on conflict do nothing;
end $$;

create or replace function public.save_legal_template(p_document_type text,p_title text,p_content text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid := private.current_organization_id(); v_user uuid := auth.uid();
begin
  if not (private.has_role('organization_owner') or private.has_role('organization_admin')) then raise exception 'No autorizado' using errcode='42501'; end if;
  if length(btrim(p_title)) < 3 or length(btrim(p_content)) < 30 then raise exception 'El título o contenido es demasiado corto'; end if;
  update public.organization_legal_templates set title=btrim(p_title),content=btrim(p_content),updated_by=v_user,updated_at=now()
  where organization_id=v_org and document_type=p_document_type and status='draft';
  if not found then
    insert into public.organization_legal_templates(organization_id,document_type,title,content,version,created_by,updated_by)
    select v_org,p_document_type,btrim(p_title),btrim(p_content),coalesce(max(version),0)+1,v_user,v_user
    from public.organization_legal_templates where organization_id=v_org and document_type=p_document_type;
  end if;
end $$;

create or replace function public.publish_legal_template(p_document_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid := private.current_organization_id(); v_user uuid := auth.uid(); v_draft public.organization_legal_templates%rowtype;
begin
  if not private.has_role('organization_owner') then raise exception 'Solo el propietario puede publicar documentos' using errcode='42501'; end if;
  select * into v_draft from public.organization_legal_templates where organization_id=v_org and document_type=p_document_type and status='draft' for update;
  if not found then raise exception 'No existe un borrador'; end if;
  update public.organization_legal_templates set status='archived',updated_at=now(),updated_by=v_user where organization_id=v_org and document_type=p_document_type and status='published';
  update public.organization_legal_templates set status='published',published_at=now(),updated_at=now(),updated_by=v_user where id=v_draft.id;
  insert into public.organization_legal_templates(organization_id,document_type,title,content,version,created_by,updated_by)
  values(v_org,v_draft.document_type,v_draft.title,v_draft.content,v_draft.version+1,v_user,v_user);
end $$;

create or replace function public.platform_dashboard_summary()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_operator() then raise exception 'No autorizado' using errcode='42501'; end if;
  return jsonb_build_object(
    'organizations',(select count(*) from public.organizations),
    'trials',(select count(*) from public.organization_subscriptions where status='trialing'),
    'active_subscriptions',(select count(*) from public.organization_subscriptions where status='active'),
    'pending_payments',(select count(*) from public.subscription_payment_requests where status in ('reported','under_review')),
    'confirmed_revenue',(select coalesce(sum(expected_amount),0) from public.subscription_payment_requests where status='confirmed'),
    'bank_accounts',(select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]'::jsonb) from public.platform_bank_accounts a where status='active')
  );
end $$;

create or replace function public.upsert_platform_bank_account(p_bank_name text,p_account_name text,p_account_number text,p_account_type text,p_currency text,p_instructions text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.is_platform_operator() then raise exception 'No autorizado' using errcode='42501'; end if;
  if p_account_type not in ('checking','savings') or p_currency not in ('HNL','USD') then raise exception 'Datos bancarios inválidos'; end if;
  insert into public.platform_bank_accounts(bank_name,account_name,account_number,account_type,currency,instructions)
  values(btrim(p_bank_name),btrim(p_account_name),btrim(p_account_number),p_account_type,p_currency,nullif(btrim(p_instructions),'')) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.initialize_legal_templates() from public,anon;
revoke all on function public.save_legal_template(text,text,text) from public,anon;
revoke all on function public.publish_legal_template(text) from public,anon;
revoke all on function public.platform_dashboard_summary() from public,anon;
revoke all on function public.upsert_platform_bank_account(text,text,text,text,text,text) from public,anon;
grant execute on function public.initialize_legal_templates(),public.save_legal_template(text,text,text),public.publish_legal_template(text),public.platform_dashboard_summary(),public.upsert_platform_bank_account(text,text,text,text,text,text) to authenticated;
