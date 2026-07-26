-- A seller response returns an information request to the analyst queue.
-- The transition is automatic only for the salesperson who created the case.

create or replace function private.resume_application_review_after_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.message_type <> 'response' or new.visibility <> 'shared' then
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
      'Información adicional enviada por el vendedor'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.resume_application_review_after_response()
from public, anon, authenticated;

create trigger credit_application_response_resumes_review
after insert on public.credit_application_notes
for each row execute function private.resume_application_review_after_response();

-- Migration 037 was initially deployed with incorrectly encoded exception
-- messages. Keep the validation logic and replace the stored definitions with
-- their canonical UTF-8 text.
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
