-- Bidirectional, auditable collaboration on a credit application.
-- Existing application notes become the append-only conversation timeline.

alter table public.credit_application_notes
  add column message_type text not null default 'message',
  add column requested_document_type text,
  add column attachment_document_id uuid,
  add column decision_id uuid,
  add column author_display_name text,
  add column author_role text;

-- Existing values were never constrained. Unknown legacy values stay private
-- instead of being exposed accidentally when the shared timeline is enabled.
update public.credit_application_notes
set visibility = 'internal'
where visibility not in ('internal', 'shared');

alter table public.credit_application_notes
  add constraint credit_application_notes_visibility_chk
    check (visibility in ('internal', 'shared')),
  add constraint credit_application_notes_message_type_chk
    check (message_type in ('message', 'information_request', 'response', 'decision', 'internal_note')),
  add constraint credit_application_notes_note_length_chk
    check (length(btrim(note)) between 1 and 4000) not valid,
  add constraint credit_application_notes_requested_document_length_chk
    check (
      requested_document_type is null
      or length(btrim(requested_document_type)) between 1 and 100
    ) not valid,
  add constraint credit_application_notes_decision_message_chk
    check (
      decision_id is null
      or message_type in ('decision', 'information_request')
    );

-- Composite keys keep optional links inside the application tenant.
alter table public.customer_documents
  add constraint tenant_customer_documents_org_id_key
  unique (organization_id, id);

alter table public.credit_decisions
  add constraint tenant_credit_decisions_org_app_id_key
  unique (organization_id, application_id, id);

alter table public.credit_application_notes
  add constraint credit_application_notes_attachment_tenant_fk
    foreign key (organization_id, attachment_document_id)
    references public.customer_documents (organization_id, id)
    not valid,
  add constraint credit_application_notes_decision_tenant_fk
    foreign key (organization_id, application_id, decision_id)
    references public.credit_decisions (organization_id, application_id, id)
    not valid;

create or replace function private.profile_primary_role(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select role.name
      from public.profile_roles as profile_role
      join public.roles as role on role.id = profile_role.role_id
      where profile_role.profile_id = p_profile_id
      order by
        case role.name
          when 'organization_owner' then 1
          when 'super_admin' then 2
          when 'organization_admin' then 3
          when 'credit_manager' then 4
          when 'credit_analyst' then 5
          when 'branch_manager' then 6
          when 'salesperson' then 7
          when 'cashier' then 8
          when 'inventory_manager' then 9
          when 'collections_agent' then 10
          when 'auditor' then 11
          else 100
        end,
        role.name
      limit 1
    ),
    'unknown'
  )
$$;

create or replace function private.requested_document_from_conditions(p_conditions jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_conditions jsonb;
  v_document_type text;
begin
  v_conditions := case
    when jsonb_typeof(p_conditions) = 'array' then p_conditions
    else '[]'::jsonb
  end;

  select nullif(
    btrim(coalesce(item ->> 'requested_document_type', item ->> 'document_type', '')),
    ''
  )
  into v_document_type
  from jsonb_array_elements(v_conditions) as item
  where nullif(
    btrim(coalesce(item ->> 'requested_document_type', item ->> 'document_type', '')),
    ''
  ) is not null
  limit 1;

  if v_document_type is null and exists (
    select 1
    from jsonb_array_elements(v_conditions) as item
    where item ->> 'type' = 'additional_document'
  ) then
    v_document_type := 'other';
  end if;

  return nullif(left(v_document_type, 100), '');
end;
$$;

revoke all on function private.profile_primary_role(uuid) from public, anon, authenticated;
revoke all on function private.requested_document_from_conditions(jsonb) from public, anon, authenticated;

-- Snapshot the author's public identity so historical messages do not change
-- when a member is renamed or receives a different role later.
update public.credit_application_notes as note
set
  author_display_name = coalesce(nullif(btrim(profile.full_name), ''), 'Usuario'),
  author_role = private.profile_primary_role(note.author_id)
from public.profiles as profile
where profile.id = note.author_id;

update public.credit_application_notes
set
  author_display_name = coalesce(nullif(btrim(author_display_name), ''), 'Usuario'),
  author_role = coalesce(nullif(btrim(author_role), ''), 'unknown');

alter table public.credit_application_notes
  alter column author_display_name set not null,
  alter column author_role set not null;

-- Every historical decision receives exactly one shared timeline entry.
insert into public.credit_application_notes (
  organization_id,
  application_id,
  note,
  visibility,
  author_id,
  message_type,
  requested_document_type,
  decision_id,
  author_display_name,
  author_role,
  created_at
)
select
  decision.organization_id,
  decision.application_id,
  coalesce(nullif(left(btrim(decision.reason), 4000), ''), 'Decisión registrada'),
  'shared',
  decision.decided_by,
  case
    when decision.decision = 'additional_information_required' then 'information_request'
    else 'decision'
  end,
  case
    when decision.decision = 'additional_information_required'
      then private.requested_document_from_conditions(decision.conditions)
    else null
  end,
  decision.id,
  coalesce(nullif(btrim(profile.full_name), ''), 'Usuario'),
  private.profile_primary_role(decision.decided_by),
  decision.created_at
from public.credit_decisions as decision
join public.profiles as profile on profile.id = decision.decided_by
where not exists (
  select 1
  from public.credit_application_notes as note
  where note.decision_id = decision.id
);

create unique index credit_application_notes_one_per_decision
  on public.credit_application_notes (decision_id)
  where decision_id is not null;

create index credit_application_notes_thread_idx
  on public.credit_application_notes (
    organization_id,
    application_id,
    created_at,
    id
  );

create index credit_application_notes_attachment_idx
  on public.credit_application_notes (attachment_document_id)
  where attachment_document_id is not null;

create index credit_application_notes_requested_document_idx
  on public.credit_application_notes (
    organization_id,
    application_id,
    requested_document_type,
    created_at
  )
  where requested_document_type is not null;

create or replace function private.can_review_application(p_application_id uuid)
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
        (
          private.has_permission('applications.review')
          and private.has_branch_access(application.branch_id)
        )
        or private.has_role('auditor')
      )
  )
$$;

revoke all on function private.can_review_application(uuid) from public, anon;
grant execute on function private.can_review_application(uuid) to authenticated;

drop policy if exists application_notes_scoped_read on public.credit_application_notes;

create policy application_notes_scoped_read
on public.credit_application_notes
for select to authenticated
using (
  organization_id = private.current_organization_id()
  and private.can_read_application(application_id)
  and (
    visibility = 'shared'
    or private.can_review_application(application_id)
  )
);

-- Conversation writes are RPC-only. In particular, a seller can never spoof
-- another author or create an internal analyst note.
revoke insert, update, delete, truncate
on public.credit_application_notes
from public, anon, authenticated;

grant select on public.credit_application_notes to authenticated;

create or replace function private.guard_credit_application_note_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  new.note := btrim(new.note);
  new.requested_document_type := nullif(btrim(new.requested_document_type), '');
  new.author_display_name := btrim(new.author_display_name);
  new.author_role := btrim(new.author_role);

  select application.customer_id
  into v_customer_id
  from public.credit_applications as application
  where application.id = new.application_id
    and application.organization_id = new.organization_id;

  if not found then
    raise exception 'La solicitud no pertenece a la organización del mensaje'
      using errcode = '23503';
  end if;

  if new.attachment_document_id is not null and not exists (
    select 1
    from public.customer_documents as document
    where document.id = new.attachment_document_id
      and document.organization_id = new.organization_id
      and document.customer_id = v_customer_id
  ) then
    raise exception 'El documento adjunto no pertenece al expediente de esta solicitud'
      using errcode = '23503';
  end if;

  if new.decision_id is not null and not exists (
    select 1
    from public.credit_decisions as decision
    where decision.id = new.decision_id
      and decision.organization_id = new.organization_id
      and decision.application_id = new.application_id
  ) then
    raise exception 'La decisión no pertenece a esta solicitud'
      using errcode = '23503';
  end if;

  if nullif(new.author_display_name, '') is null
    or nullif(new.author_role, '') is null then
    raise exception 'El mensaje requiere la identidad visible de su autor';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_credit_application_note_links()
from public, anon, authenticated;

create trigger credit_application_notes_links_guard
before insert on public.credit_application_notes
for each row execute function private.guard_credit_application_note_links();

create or replace function public.send_credit_application_message(
  p_application_id uuid,
  p_note text,
  p_message_type text default 'message',
  p_requested_document_type text default null,
  p_attachment_document_id uuid default null,
  p_visibility text default 'shared'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.credit_applications%rowtype;
  v_author_display_name text;
  v_author_role text;
  v_message_type text;
  v_note text;
  v_requested_document_type text;
  v_visibility text;
  v_can_review boolean;
  v_is_creator boolean;
  v_message_id uuid;
begin
  v_note := btrim(coalesce(p_note, ''));
  v_message_type := lower(btrim(coalesce(p_message_type, 'message')));
  v_requested_document_type := nullif(btrim(p_requested_document_type), '');
  v_visibility := lower(btrim(coalesce(p_visibility, 'shared')));

  if length(v_note) < 1 or length(v_note) > 4000 then
    raise exception 'El mensaje debe contener entre 1 y 4000 caracteres';
  end if;

  if v_message_type not in ('message', 'information_request', 'response', 'internal_note') then
    raise exception 'Tipo de mensaje inválido';
  end if;

  if v_visibility not in ('internal', 'shared') then
    raise exception 'Visibilidad de mensaje inválida';
  end if;

  if v_requested_document_type is not null
    and length(v_requested_document_type) > 100 then
    raise exception 'El tipo de documento solicitado es demasiado largo';
  end if;

  if v_requested_document_type is not null
    and v_message_type not in ('information_request', 'response') then
    raise exception 'El documento solicitado solo aplica a solicitudes de información o respuestas';
  end if;

  select *
  into v_application
  from public.credit_applications
  where id = p_application_id
    and organization_id = private.current_organization_id();

  if not found then
    raise exception 'Solicitud no encontrada' using errcode = '42501';
  end if;

  if v_application.status = 'cancelled' then
    raise exception 'La conversación de una solicitud cancelada está cerrada';
  end if;

  v_can_review := private.has_permission('applications.review')
    and private.has_branch_access(v_application.branch_id);
  v_is_creator := v_application.created_by = auth.uid()
    and private.has_permission('applications.create');

  if not v_can_review and not v_is_creator then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_message_type = 'internal_note' and not v_can_review then
    raise exception 'Solo el equipo de crédito puede crear notas internas'
      using errcode = '42501';
  end if;

  if v_message_type = 'information_request' then
    if not v_can_review then
      raise exception 'Solo el equipo de crédito puede solicitar información'
        using errcode = '42501';
    end if;

    if v_application.status <> 'additional_information_required' then
      raise exception 'Registra primero la decisión de solicitar información';
    end if;
  end if;

  if v_message_type = 'internal_note' and v_visibility <> 'internal' then
    raise exception 'Las notas internas deben conservar visibilidad interna';
  end if;

  if v_message_type <> 'internal_note' and v_visibility = 'internal' and not v_can_review then
    raise exception 'El vendedor solo puede enviar mensajes compartidos'
      using errcode = '42501';
  end if;

  if v_is_creator and not v_can_review
    and v_message_type not in ('message', 'response') then
    raise exception 'El vendedor solo puede enviar mensajes y respuestas'
      using errcode = '42501';
  end if;

  if p_attachment_document_id is not null and not exists (
    select 1
    from public.customer_documents as document
    where document.id = p_attachment_document_id
      and document.organization_id = v_application.organization_id
      and document.customer_id = v_application.customer_id
  ) then
    raise exception 'El documento adjunto no pertenece al expediente de esta solicitud'
      using errcode = '23503';
  end if;

  select profile.full_name
  into v_author_display_name
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.organization_id = v_application.organization_id
    and profile.status = 'active';

  if not found then
    raise exception 'Perfil no autorizado' using errcode = '42501';
  end if;

  v_author_role := private.profile_primary_role(auth.uid());

  insert into public.credit_application_notes (
    organization_id,
    application_id,
    note,
    visibility,
    author_id,
    message_type,
    requested_document_type,
    attachment_document_id,
    author_display_name,
    author_role
  )
  values (
    v_application.organization_id,
    v_application.id,
    v_note,
    v_visibility,
    auth.uid(),
    v_message_type,
    v_requested_document_type,
    p_attachment_document_id,
    v_author_display_name,
    v_author_role
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_credit_application_message(
  uuid,
  text,
  text,
  text,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.send_credit_application_message(
  uuid,
  text,
  text,
  text,
  uuid,
  text
) to authenticated;

-- Decisions remain transactional and now publish their customer-facing reason
-- into the shared conversation at the same time.
create or replace function public.decide_credit_application(
  p_application_id uuid,
  p_decision text,
  p_reason text,
  p_conditions jsonb default '[]'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.credit_applications%rowtype;
  v_status public.credit_application_status;
  v_conditions jsonb;
  v_decision_id uuid;
  v_author_display_name text;
  v_author_role text;
  v_reason text;
  v_requested_document_type text;
begin
  v_reason := btrim(coalesce(p_reason, ''));
  v_conditions := coalesce(p_conditions, '[]'::jsonb);

  select *
  into v_application
  from public.credit_applications
  where id = p_application_id
    and organization_id = private.current_organization_id()
  for update;

  if not found
    or not private.has_permission('applications.review')
    or not private.has_branch_access(v_application.branch_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_application.status not in (
    'submitted',
    'under_review',
    'additional_information_required',
    'preapproved'
  ) then
    raise exception 'La solicitud no admite una decisión en su estado actual';
  end if;

  v_status := case p_decision
    when 'approved' then 'approved'::public.credit_application_status
    when 'rejected' then 'rejected'::public.credit_application_status
    when 'preapproved' then 'preapproved'::public.credit_application_status
    when 'additional_information_required'
      then 'additional_information_required'::public.credit_application_status
    else null
  end;

  if v_status is null or length(v_reason) < 1 or length(v_reason) > 4000 then
    raise exception 'Decisión o motivo inválido';
  end if;

  if jsonb_typeof(v_conditions) <> 'array' then
    raise exception 'Las condiciones de la decisión deben ser una lista';
  end if;

  select profile.full_name
  into v_author_display_name
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.organization_id = v_application.organization_id
    and profile.status = 'active';

  if not found then
    raise exception 'Perfil no autorizado' using errcode = '42501';
  end if;

  v_author_role := private.profile_primary_role(auth.uid());
  v_requested_document_type := case
    when p_decision = 'additional_information_required'
      then private.requested_document_from_conditions(v_conditions)
    else null
  end;

  insert into public.credit_decisions (
    organization_id,
    application_id,
    decision,
    reason,
    conditions,
    decided_by
  )
  values (
    v_application.organization_id,
    v_application.id,
    p_decision,
    v_reason,
    v_conditions,
    auth.uid()
  )
  returning id into v_decision_id;

  insert into public.credit_application_notes (
    organization_id,
    application_id,
    note,
    visibility,
    author_id,
    message_type,
    requested_document_type,
    decision_id,
    author_display_name,
    author_role
  )
  values (
    v_application.organization_id,
    v_application.id,
    v_reason,
    'shared',
    auth.uid(),
    case
      when p_decision = 'additional_information_required' then 'information_request'
      else 'decision'
    end,
    v_requested_document_type,
    v_decision_id,
    v_author_display_name,
    v_author_role
  );

  update public.credit_applications
  set
    status = v_status,
    assigned_analyst_id = auth.uid(),
    updated_at = now()
  where id = v_application.id;

  insert into public.credit_application_status_history (
    organization_id,
    application_id,
    status,
    actor_id,
    reason
  )
  values (
    v_application.organization_id,
    v_application.id,
    v_status,
    auth.uid(),
    v_reason
  );

  if v_status = 'rejected' and v_application.inventory_unit_id is not null then
    update public.inventory_units
    set
      status = 'available',
      updated_at = now()
    where id = v_application.inventory_unit_id
      and status = 'reserved';
  end if;
end;
$$;

revoke all on function public.decide_credit_application(uuid, text, text, jsonb)
from public, anon;

grant execute on function public.decide_credit_application(uuid, text, text, jsonb)
to authenticated;

-- Messages are append-only business records. Every future insert is also
-- copied into the immutable audit trail.
create trigger credit_application_notes_immutable
before update or delete on public.credit_application_notes
for each row execute function private.block_mutation();

create trigger audit_credit_application_notes
after insert or update or delete on public.credit_application_notes
for each row execute function private.write_audit_log();

-- Publish inserts when Realtime is available; RLS still controls subscribers.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'credit_application_notes'
  ) then
    alter publication supabase_realtime add table public.credit_application_notes;
  end if;
end;
$$;
