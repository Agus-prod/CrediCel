alter table public.document_delivery_outbox drop constraint if exists document_delivery_outbox_status_check;
alter table public.document_delivery_outbox add constraint document_delivery_outbox_status_check check(status in('pending','processing','sent','failed','cancelled'));
alter table public.document_delivery_outbox
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists provider_message_id text,
  add column if not exists processing_started_at timestamptz;
create unique index if not exists document_delivery_outbox_unique_recipient on public.document_delivery_outbox(contract_id,channel,recipient);
create index if not exists document_delivery_outbox_pending_idx on public.document_delivery_outbox(status,next_attempt_at) where status in('pending','failed');

create or replace function private.enqueue_signed_contract_notifications()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_email text;v_phone text;
begin
  if new.signature_evidence_hash is null or old.signature_evidence_hash is not null then return new;end if;
  select lower(nullif(btrim(customer.email),'')),regexp_replace(customer.phone,'[^0-9]','','g') into v_email,v_phone
  from public.credit_applications application join public.customers customer on customer.id=application.customer_id
  where application.id=new.application_id;
  if v_email is not null then insert into public.document_delivery_outbox(organization_id,contract_id,recipient,channel) values(new.organization_id,new.id,v_email,'email') on conflict do nothing;end if;
  if length(v_phone)=8 then v_phone:='+504'||v_phone;elsif left(v_phone,3)='504' then v_phone:='+'||v_phone;end if;
  if v_phone ~ '^\+504[0-9]{8}$' then
    insert into public.document_delivery_outbox(organization_id,contract_id,recipient,channel) values(new.organization_id,new.id,v_phone,'sms') on conflict do nothing;
    insert into public.document_delivery_outbox(organization_id,contract_id,recipient,channel) values(new.organization_id,new.id,v_phone,'whatsapp') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists enqueue_signed_contract_notifications on public.credit_contracts;
create trigger enqueue_signed_contract_notifications after update of signature_evidence_hash on public.credit_contracts for each row execute function private.enqueue_signed_contract_notifications();

create or replace function public.claim_document_deliveries(p_limit integer default 20)
returns table(id uuid,recipient text,channel text,contract_number text,verification_code uuid,organization_name text)
language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'No autorizado' using errcode='42501';end if;
  return query with claimed as (
    select delivery.id from public.document_delivery_outbox delivery
    where (delivery.status in('pending','failed') and delivery.next_attempt_at<=now()) or (delivery.status='processing' and delivery.processing_started_at<now()-interval '15 minutes')
    order by delivery.created_at for update skip locked limit least(greatest(p_limit,1),100)
  ), updated as (
    update public.document_delivery_outbox delivery set status='processing',processing_started_at=now(),attempts=attempts+1
    from claimed where delivery.id=claimed.id returning delivery.*
  ) select updated.id,updated.recipient,updated.channel,contract.contract_number,contract.verification_code,organization.commercial_name
  from updated join public.credit_contracts contract on contract.id=updated.contract_id join public.organizations organization on organization.id=updated.organization_id;
end $$;

create or replace function public.complete_document_delivery(p_id uuid,p_success boolean,p_provider_message_id text default null,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'No autorizado' using errcode='42501';end if;
  update public.document_delivery_outbox set status=case when p_success then 'sent' else 'failed' end,
    sent_at=case when p_success then now() else null end,provider_message_id=nullif(p_provider_message_id,''),
    last_error=case when p_success then null else left(coalesce(p_error,'Error del proveedor'),1000) end,
    next_attempt_at=case when p_success then next_attempt_at else now()+least(interval '6 hours',interval '5 minutes'*power(2,greatest(attempts-1,0))) end,
    processing_started_at=null where id=p_id;
end $$;
revoke all on function public.claim_document_deliveries(integer),public.complete_document_delivery(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_document_deliveries(integer),public.complete_document_delivery(uuid,boolean,text,text) to service_role;
