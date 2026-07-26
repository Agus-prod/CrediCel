-- Keep an information request open until the seller uploads the exact
-- document type requested by the analyst. Text-only replies remain visible in
-- the conversation but do not return the application to the review queue.

alter table public.customer_documents
  add column if not exists application_id uuid;

update public.customer_documents as document
set application_id = application.id
from public.credit_applications as application
where document.application_id is null
  and document.metadata ->> 'application_id'
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  and application.id = (document.metadata ->> 'application_id')::uuid
  and application.organization_id = document.organization_id
  and application.customer_id = document.customer_id;

alter table public.customer_documents
  add constraint customer_documents_application_tenant_fk
  foreign key (organization_id, application_id)
  references public.credit_applications (organization_id, id);

create index customer_documents_application_idx
  on public.customer_documents (organization_id, application_id, created_at desc)
  where application_id is not null;

create or replace function private.resume_application_review_after_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_document_type text;
  v_request_created_at timestamptz;
  v_attached_document_type text;
begin
  if new.message_type <> 'response'
    or new.visibility <> 'shared'
    or new.attachment_document_id is null
    or new.requested_document_type is null then
    return new;
  end if;

  select note.requested_document_type, note.created_at
  into v_requested_document_type, v_request_created_at
  from public.credit_application_notes as note
  where note.application_id = new.application_id
    and note.organization_id = new.organization_id
    and note.visibility = 'shared'
    and note.message_type = 'information_request'
    and note.requested_document_type is not null
  order by note.created_at desc, note.id desc
  limit 1;

  if v_requested_document_type is distinct from new.requested_document_type then
    return new;
  end if;

  select coalesce(
    nullif(document.metadata ->> 'requested_document_type', ''),
    document.document_type::text
  )
  into v_attached_document_type
  from public.customer_documents as document
  join public.credit_applications as application
    on application.id = new.application_id
   and application.organization_id = new.organization_id
   and application.customer_id = document.customer_id
  where document.id = new.attachment_document_id
    and document.organization_id = new.organization_id
    and document.application_id = new.application_id
    and document.created_at >= v_request_created_at
    and document.storage_path like
      new.organization_id::text || '/' || document.customer_id::text || '/%'
    and exists (
      select 1
      from storage.objects as object
      where object.bucket_id = 'customer-documents'
        and object.name = document.storage_path
        and object.created_at >= v_request_created_at
    );

  if v_attached_document_type is distinct from v_requested_document_type then
    return new;
  end if;

  update public.credit_applications
  set
    status = 'under_review',
    updated_at = now()
  where id = new.application_id
    and organization_id = new.organization_id
    and created_by = new.author_id
    and status = 'additional_information_required';

  if found then
    insert into public.credit_application_status_history (
      organization_id,
      application_id,
      status,
      actor_id,
      reason
    )
    values (
      new.organization_id,
      new.application_id,
      'under_review',
      new.author_id,
      'Documento solicitado enviado por el vendedor'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.resume_application_review_after_response()
from public, anon, authenticated;

-- The pre-credit conversation is restricted to its seller, the branch credit
-- team and organization-level oversight. Cashiers and collections staff may
-- read later payment data, but not this private origination exchange.
create or replace function private.can_read_application_conversation(
  p_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.credit_applications as application
    where application.id = p_application_id
      and application.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          private.has_permission('applications.review')
          and private.has_branch_access(application.branch_id)
        )
        or (
          application.created_by = (select auth.uid())
          and private.has_permission('applications.create')
        )
      )
  )
$$;

revoke all on function private.can_read_application_conversation(uuid)
from public, anon;
grant execute on function private.can_read_application_conversation(uuid)
to authenticated;

drop policy if exists customer_documents_scoped_read
on public.customer_documents;

create policy customer_documents_scoped_read
on public.customer_documents
for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    (
      application_id is not null
      and private.can_read_application_conversation(application_id)
    )
    or (
      application_id is null
      and private.can_read_customer(customer_id)
    )
  )
);

drop policy if exists customer_documents_metadata_insert
on public.customer_documents;

create policy customer_documents_metadata_insert
on public.customer_documents
for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and private.has_permission('customers.write')
  and private.can_read_customer(customer_id)
  and storage_path like organization_id::text || '/' || customer_id::text || '/%'
  and (
    application_id is null
    or exists (
      select 1
      from public.credit_applications as application
      where application.id = customer_documents.application_id
        and application.organization_id = customer_documents.organization_id
        and application.customer_id = customer_documents.customer_id
        and private.can_read_application_conversation(application.id)
    )
  )
);

drop policy if exists customer_document_objects_read
on storage.objects;

create policy customer_document_objects_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and exists (
    select 1
    from public.customer_documents as document
    where document.storage_path = storage.objects.name
      and document.organization_id = private.current_organization_id()
      and (
        (
          document.application_id is not null
          and private.can_read_application_conversation(document.application_id)
        )
        or (
          document.application_id is null
          and private.can_read_customer(document.customer_id)
        )
      )
  )
);

drop policy if exists application_notes_scoped_read
on public.credit_application_notes;

create policy application_notes_scoped_read
on public.credit_application_notes
for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    (
      visibility = 'shared'
      and private.can_read_application_conversation(application_id)
    )
    or (
      visibility = 'internal'
      and private.can_review_application(application_id)
    )
  )
);

-- A store manager can also perform the store's credit analysis, as required
-- by the operating model. Access remains restricted by branch.
create or replace function private.seed_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.role_permissions (role_id, permission_id)
  select new.id, permission.id
  from public.permissions as permission
  where
    new.name in ('super_admin', 'organization_admin')
    or (
      new.name = 'credit_manager'
      and permission.code in ('organization.full_access', 'applications.review', 'customers.write')
    )
    or (
      new.name = 'credit_analyst'
      and permission.code in ('organization.full_access', 'applications.review')
    )
    or (
      new.name = 'branch_manager'
      and permission.code in (
        'customers.write',
        'inventory.write',
        'applications.create',
        'applications.review',
        'transfers.dispatch',
        'transfers.receive'
      )
    )
    or (
      new.name = 'salesperson'
      and permission.code in ('customers.write', 'applications.create')
    )
    or (new.name = 'cashier' and permission.code = 'payments.validate')
    or (
      new.name = 'inventory_manager'
      and permission.code in ('inventory.write', 'transfers.dispatch', 'transfers.receive')
    )
    or (
      new.name = 'auditor'
      and permission.code in ('organization.full_access', 'audit.read')
    );

  return new;
end;
$$;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code = 'applications.review'
where role.name = 'branch_manager'
on conflict do nothing;

create or replace function private.guard_closed_seller_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.credit_applications%rowtype;
begin
  if new.message_type not in ('message', 'response') then
    return new;
  end if;

  select *
  into v_application
  from public.credit_applications
  where id = new.application_id
    and organization_id = new.organization_id;

  if v_application.created_by = new.author_id
    and v_application.status in (
      'approved',
      'rejected',
      'contract_pending',
      'signed',
      'activated',
      'cancelled'
    ) then
    raise exception 'La conversación de esta solicitud ya está cerrada';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_closed_seller_conversation()
from public, anon, authenticated;

create trigger credit_application_notes_closed_case_guard
before insert on public.credit_application_notes
for each row execute function private.guard_closed_seller_conversation();
