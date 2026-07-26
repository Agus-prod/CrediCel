alter table public.credit_contracts
  add column if not exists legal_documents_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists verification_code uuid not null default gen_random_uuid(),
  add column if not exists bundle_generated_at timestamptz;
create unique index if not exists credit_contracts_verification_code_unique on public.credit_contracts(verification_code);

create table public.document_delivery_outbox(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  contract_id uuid not null references public.credit_contracts(id),
  recipient text not null,
  channel text not null check(channel in('email','sms','whatsapp')),
  status text not null default 'pending' check(status in('pending','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),sent_at timestamptz
);
alter table public.document_delivery_outbox enable row level security;
alter table public.document_delivery_outbox force row level security;
create policy document_delivery_outbox_tenant_read on public.document_delivery_outbox for select to authenticated using(organization_id=private.current_organization_id());
grant select on public.document_delivery_outbox to authenticated;

create or replace function public.formalize_signed_credit(p_application_id uuid,p_signature_name text,p_signature_data text,p_consent_text text,p_payment_method text,p_reference text,p_signer_ip text default null,p_signer_user_agent text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;v_contract uuid;v_hash text;v_org uuid;v_customer_email text;v_legal jsonb;
begin
  if p_signature_data is null or p_signature_data!~'^data:image/png;base64,' or length(p_signature_data)<200 or length(p_signature_data)>350000 then raise exception 'La firma dibujada es inválida';end if;
  if length(btrim(coalesce(p_consent_text,'')))<20 then raise exception 'Debes registrar el consentimiento';end if;
  select application.organization_id,customer.email into v_org,v_customer_email from public.credit_applications application join public.customers customer on customer.id=application.customer_id where application.id=p_application_id and application.organization_id=private.current_organization_id();
  select coalesce(jsonb_object_agg(template.document_type,jsonb_build_object('title',template.title,'content',template.content,'version',template.version,'published_at',template.published_at)),'{}'::jsonb) into v_legal from public.organization_legal_templates template where template.organization_id=v_org and template.status='published';
  if not (v_legal ? 'credit_contract') or not (v_legal ? 'promissory_note') then raise exception 'Publica el contrato y el pagaré antes de activar el crédito';end if;
  v_result:=public.formalize_credit(p_application_id,p_signature_name,p_payment_method,p_reference);v_contract:=(v_result->>'contract_id')::uuid;
  v_hash:=encode(extensions.digest(convert_to(p_signature_data||p_consent_text||v_legal::text||now()::text,'UTF8'),'sha256'),'hex');
  update public.credit_contracts set signature_data=p_signature_data,consent_text=btrim(p_consent_text),signature_evidence_hash=v_hash,signer_ip=nullif(btrim(p_signer_ip),''),signer_user_agent=nullif(left(btrim(p_signer_user_agent),500),''),legal_documents_snapshot=v_legal,bundle_generated_at=now() where id=v_contract;
  if nullif(btrim(v_customer_email),'') is not null then insert into public.document_delivery_outbox(organization_id,contract_id,recipient,channel) values(v_org,v_contract,lower(btrim(v_customer_email)),'email');end if;
  return v_result||jsonb_build_object('signature_evidence_hash',v_hash,'document_delivery_queued',nullif(btrim(v_customer_email),'') is not null);
end $$;

create or replace function public.verify_credit_document(p_verification_code uuid)
returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('valid',true,'contract_number',contract.contract_number,'accepted_at',contract.accepted_at,'bundle_generated_at',contract.bundle_generated_at,'organization',organization.commercial_name,'evidence_hash',contract.signature_evidence_hash)
from public.credit_contracts contract join public.organizations organization on organization.id=contract.organization_id where contract.verification_code=p_verification_code;
$$;
revoke all on function public.verify_credit_document(uuid) from public;
grant execute on function public.verify_credit_document(uuid) to anon,authenticated;
