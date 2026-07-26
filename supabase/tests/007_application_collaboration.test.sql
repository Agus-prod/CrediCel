begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

select has_column(
  'public',
  'credit_application_notes',
  'message_type',
  'application notes identify each conversation event'
);
select has_column(
  'public',
  'credit_application_notes',
  'requested_document_type',
  'information requests identify the requested document'
);
select has_column(
  'public',
  'credit_application_notes',
  'attachment_document_id',
  'responses can reference an uploaded customer document'
);
select has_column(
  'public',
  'credit_application_notes',
  'decision_id',
  'decision messages retain their transactional source'
);
select has_column(
  'public',
  'credit_application_notes',
  'author_display_name',
  'message author names are historical snapshots'
);
select has_column(
  'public',
  'credit_application_notes',
  'author_role',
  'message author roles are historical snapshots'
);
select has_function(
  'public',
  'send_credit_application_message',
  array['uuid', 'text', 'text', 'text', 'uuid', 'text'],
  'application conversation writes use a controlled RPC'
);
select has_index(
  'public',
  'credit_application_notes',
  'credit_application_notes_one_per_decision',
  'a decision can appear only once in the conversation'
);
select has_trigger(
  'public',
  'credit_application_notes',
  'audit_credit_application_notes',
  'conversation events enter the database audit trail'
);
select has_trigger(
  'public',
  'credit_application_notes',
  'credit_application_notes_immutable',
  'conversation events are append-only'
);

select is(
  (
    select count(*)::bigint
    from public.credit_decisions as decision
    left join public.credit_application_notes as note
      on note.decision_id = decision.id
    where note.id is null
  ),
  0::bigint,
  'all decisions that predate the collaboration timeline are backfilled'
);

insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000001', 'collaboration-seller@credicel.test'),
  ('97000000-0000-4000-8000-000000000002', 'collaboration-analyst@credicel.test'),
  ('97000000-0000-4000-8000-000000000003', 'collaboration-other@credicel.test'),
  ('97000000-0000-4000-8000-000000000004', 'collaboration-cashier@credicel.test'),
  ('97000000-0000-4000-8000-000000000005', 'collaboration-collections@credicel.test');

insert into public.organizations (id, name, commercial_name)
values (
  '97000000-0000-4000-8000-000000000010',
  'Application Collaboration Test',
  'Collaboration Test'
);

insert into public.business_units (
  id,
  organization_id,
  legal_name,
  commercial_name,
  owner_name,
  rtn
)
values (
  '97000000-0000-4000-8000-000000000011',
  '97000000-0000-4000-8000-000000000010',
  'Application Collaboration Test, S. de R.L.',
  'Collaboration Test',
  'Test Owner',
  '08019000000701'
);

select ok(
  exists (
    select 1
    from public.roles as role
    join public.role_permissions as role_permission
      on role_permission.role_id = role.id
    join public.permissions as permission
      on permission.id = role_permission.permission_id
    where role.organization_id = '97000000-0000-4000-8000-000000000010'
      and role.name = 'branch_manager'
      and permission.code = 'applications.review'
  ),
  'a branch manager can also perform credit analysis for the assigned store'
);

insert into public.branches (
  id,
  organization_id,
  business_unit_id,
  name,
  code,
  branch_type,
  address
)
values (
  '97000000-0000-4000-8000-000000000012',
  '97000000-0000-4000-8000-000000000010',
  '97000000-0000-4000-8000-000000000011',
  'Collaboration Branch',
  'COLLAB-TEST',
  'store',
  'Test address'
);

insert into public.profiles (id, organization_id, full_name) values
  (
    '97000000-0000-4000-8000-000000000001',
    '97000000-0000-4000-8000-000000000010',
    'Vendedora Prueba'
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    '97000000-0000-4000-8000-000000000010',
    'Analista Prueba'
  ),
  (
    '97000000-0000-4000-8000-000000000003',
    '97000000-0000-4000-8000-000000000010',
    'Otro Vendedor'
  ),
  (
    '97000000-0000-4000-8000-000000000004',
    '97000000-0000-4000-8000-000000000010',
    'Cajera Prueba'
  ),
  (
    '97000000-0000-4000-8000-000000000005',
    '97000000-0000-4000-8000-000000000010',
    'Cobranza Prueba'
  );

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000001', id
from public.roles
where organization_id = '97000000-0000-4000-8000-000000000010'
  and name = 'salesperson';

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000002', id
from public.roles
where organization_id = '97000000-0000-4000-8000-000000000010'
  and name = 'credit_analyst';

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000003', id
from public.roles
where organization_id = '97000000-0000-4000-8000-000000000010'
  and name = 'salesperson';

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000004', id
from public.roles
where organization_id = '97000000-0000-4000-8000-000000000010'
  and name = 'cashier';

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000005', id
from public.roles
where organization_id = '97000000-0000-4000-8000-000000000010'
  and name = 'collections_agent';

insert into public.user_branch_access (profile_id, branch_id) values
  (
    '97000000-0000-4000-8000-000000000001',
    '97000000-0000-4000-8000-000000000012'
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    '97000000-0000-4000-8000-000000000012'
  ),
  (
    '97000000-0000-4000-8000-000000000003',
    '97000000-0000-4000-8000-000000000012'
  ),
  (
    '97000000-0000-4000-8000-000000000004',
    '97000000-0000-4000-8000-000000000012'
  ),
  (
    '97000000-0000-4000-8000-000000000005',
    '97000000-0000-4000-8000-000000000012'
  );

insert into public.customers (
  id,
  organization_id,
  normalized_dni,
  first_name,
  last_name,
  phone,
  created_by
)
values
  (
    '97000000-0000-4000-8000-000000000020',
    '97000000-0000-4000-8000-000000000010',
    '0801199000701',
    'Cliente',
    'Solicitud',
    '99997001',
    '97000000-0000-4000-8000-000000000001'
  ),
  (
    '97000000-0000-4000-8000-000000000021',
    '97000000-0000-4000-8000-000000000010',
    '0801199000702',
    'Cliente',
    'Ajeno',
    '99997002',
    '97000000-0000-4000-8000-000000000003'
  );

insert into public.credit_applications (
  id,
  organization_id,
  branch_id,
  business_unit_id,
  customer_id,
  requested_price,
  proposed_down_payment,
  proposed_term,
  status,
  created_by
)
values (
  '97000000-0000-4000-8000-000000000030',
  '97000000-0000-4000-8000-000000000010',
  '97000000-0000-4000-8000-000000000012',
  '97000000-0000-4000-8000-000000000011',
  '97000000-0000-4000-8000-000000000020',
  1000,
  200,
  12,
  'submitted',
  '97000000-0000-4000-8000-000000000001'
);

insert into public.customer_documents (
  id,
  organization_id,
  customer_id,
  application_id,
  document_type,
  storage_path,
  metadata
)
values
  (
    '97000000-0000-4000-8000-000000000040',
    '97000000-0000-4000-8000-000000000010',
    '97000000-0000-4000-8000-000000000020',
    '97000000-0000-4000-8000-000000000030',
    'other',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000041/income-proof.pdf',
    '{"requested_document_type":"income_proof"}'::jsonb
  ),
  (
    '97000000-0000-4000-8000-000000000042',
    '97000000-0000-4000-8000-000000000010',
    '97000000-0000-4000-8000-000000000021',
    null,
    'other',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000021/97000000-0000-4000-8000-000000000043/other-proof.pdf',
    '{}'::jsonb
  ),
  (
    '97000000-0000-4000-8000-000000000044',
    '97000000-0000-4000-8000-000000000010',
    '97000000-0000-4000-8000-000000000020',
    '97000000-0000-4000-8000-000000000030',
    'address_proof',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000045/address-proof.pdf',
    '{}'::jsonb
  ),
  (
    '97000000-0000-4000-8000-000000000046',
    '97000000-0000-4000-8000-000000000010',
    '97000000-0000-4000-8000-000000000020',
    '97000000-0000-4000-8000-000000000030',
    'other',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000047/old-income-proof.pdf',
    '{"application_id":"97000000-0000-4000-8000-000000000030","requested_document_type":"income_proof"}'::jsonb
  );

set local role authenticated;
set local request.jwt.claim.sub = '97000000-0000-4000-8000-000000000002';

select lives_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'La evaluación interna requiere confirmar los ingresos.',
      'internal_note',
      null,
      null,
      'internal'
    )
  $$,
  'the assigned branch analyst can add an internal note'
);

select lives_ok(
  $$
    select public.decide_credit_application(
      '97000000-0000-4000-8000-000000000030',
      'additional_information_required',
      'Falta un comprobante reciente de ingresos.',
      '[{"type":"additional_document","document_type":"income_proof"}]'::jsonb
    )
  $$,
  'requesting information creates the decision and shared message atomically'
);

select results_eq(
  $$
    select
      note.message_type || ':' ||
      note.visibility || ':' ||
      note.requested_document_type || ':' ||
      note.author_display_name || ':' ||
      note.author_role || ':' ||
      (note.decision_id is not null)::text
    from public.credit_application_notes as note
    where note.application_id = '97000000-0000-4000-8000-000000000030'
      and note.message_type = 'information_request'
  $$,
  array['information_request:shared:income_proof:Analista Prueba:credit_analyst:true'::text],
  'the shared request preserves document, author and decision context'
);

select results_eq(
  $$
    select status::text
    from public.credit_applications
    where id = '97000000-0000-4000-8000-000000000030'
  $$,
  array['additional_information_required'::text],
  'the application enters information-required state'
);

reset role;

insert into storage.objects (bucket_id, name, owner, created_at)
values
  (
    'customer-documents',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000041/income-proof.pdf',
    '97000000-0000-4000-8000-000000000001',
    now()
  ),
  (
    'customer-documents',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000045/address-proof.pdf',
    '97000000-0000-4000-8000-000000000001',
    now()
  ),
  (
    'customer-documents',
    '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000047/old-income-proof.pdf',
    '97000000-0000-4000-8000-000000000001',
    now() - interval '1 day'
  );

update public.customer_documents
set metadata = metadata || jsonb_build_object(
  'application_id',
  '97000000-0000-4000-8000-000000000030'
)
where id in (
  '97000000-0000-4000-8000-000000000040',
  '97000000-0000-4000-8000-000000000044'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    insert into public.credit_application_notes (
      organization_id,
      application_id,
      note,
      author_id,
      author_display_name,
      author_role
    ) values (
      '97000000-0000-4000-8000-000000000010',
      '97000000-0000-4000-8000-000000000030',
      'Mensaje directo no permitido',
      '97000000-0000-4000-8000-000000000001',
      'Vendedora Prueba',
      'salesperson'
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot bypass the messaging RPC'
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[1::bigint],
  'the seller sees the shared request but not the internal analyst note'
);

select throws_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Intento de nota interna',
      'internal_note',
      null,
      null,
      'internal'
    )
  $$,
  '42501',
  null,
  'a seller cannot create internal notes'
);

select throws_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Adjunto de otro expediente',
      'response',
      'income_proof',
      '97000000-0000-4000-8000-000000000042',
      'shared'
    )
  $$,
  '23503',
  null,
  'an attachment from another customer cannot be linked to the application'
);

select lives_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Todavía estoy consiguiendo el comprobante solicitado.',
      'response',
      'income_proof',
      null,
      'shared'
    )
  $$,
  'the seller can answer with context before the document is ready'
);

select results_eq(
  $$
    select status::text
    from public.credit_applications
    where id = '97000000-0000-4000-8000-000000000030'
  $$,
  array['additional_information_required'::text],
  'a text-only response keeps the information request open'
);

select lives_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Adjunto un comprobante de domicilio.',
      'response',
      'address_proof',
      '97000000-0000-4000-8000-000000000044',
      'shared'
    )
  $$,
  'the seller can attach a different document without losing the message'
);

select results_eq(
  $$
    select status::text
    from public.credit_applications
    where id = '97000000-0000-4000-8000-000000000030'
  $$,
  array['additional_information_required'::text],
  'a different attachment type keeps the requested document pending'
);

select lives_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Intento reutilizar un comprobante anterior.',
      'response',
      'income_proof',
      '97000000-0000-4000-8000-000000000046',
      'shared'
    )
  $$,
  'an older document can remain in the conversation as context'
);

select results_eq(
  $$
    select status::text
    from public.credit_applications
    where id = '97000000-0000-4000-8000-000000000030'
  $$,
  array['additional_information_required'::text],
  'an attachment older than the information request cannot satisfy it'
);

select lives_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Adjunto el comprobante de ingresos solicitado.',
      'response',
      'income_proof',
      '97000000-0000-4000-8000-000000000040',
      'shared'
    )
  $$,
  'the application creator can answer and attach the requested document'
);

select results_eq(
  $$
    select status::text
    from public.credit_applications
    where id = '97000000-0000-4000-8000-000000000030'
  $$,
  array['under_review'::text],
  'the seller response returns the application to the analyst review queue'
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[5::bigint],
  'the seller sees the complete shared exchange'
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
      and message_type = 'response'
      and author_display_name = 'Vendedora Prueba'
      and author_role = 'salesperson'
      and attachment_document_id = '97000000-0000-4000-8000-000000000040'
  $$,
  array[1::bigint],
  'the seller response retains its author snapshot and attachment'
);

reset role;

update public.credit_applications
set status = 'rejected'
where id = '97000000-0000-4000-8000-000000000030';

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Intento posterior al cierre.',
      'response',
      null,
      null,
      'shared'
    )
  $$,
  'P0001',
  'La conversación de esta solicitud ya está cerrada',
  'the seller cannot continue writing after a final decision'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000003',
  true
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'another seller cannot read a conversation outside their own portfolio'
);

select results_eq(
  $$
    select count(*)
    from public.customer_documents
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'another seller cannot read documents from this application'
);

select results_eq(
  $$
    select count(*)
    from storage.objects
    where bucket_id = 'customer-documents'
      and name = '97000000-0000-4000-8000-000000000010/97000000-0000-4000-8000-000000000020/97000000-0000-4000-8000-000000000041/income-proof.pdf'
  $$,
  array[0::bigint],
  'another seller cannot read the application file directly from storage'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000004',
  true
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'a cashier cannot read the private pre-credit conversation'
);

select results_eq(
  $$
    select count(*)
    from public.customer_documents
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'a cashier cannot read private pre-credit attachments'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000005',
  true
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'collections staff cannot read the private pre-credit conversation'
);

select results_eq(
  $$
    select count(*)
    from public.customer_documents
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[0::bigint],
  'collections staff cannot read private pre-credit attachments'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  $$
    select public.send_credit_application_message(
      '97000000-0000-4000-8000-000000000030',
      'Intento fuera de cartera',
      'message',
      null,
      null,
      'shared'
    )
  $$,
  '42501',
  null,
  'another seller cannot write to a conversation outside their portfolio'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);

select results_eq(
  $$
    select count(*)
    from public.credit_application_notes
    where application_id = '97000000-0000-4000-8000-000000000030'
  $$,
  array[6::bigint],
  'the analyst sees internal and shared conversation events'
);

reset role;

select ok(
  exists (
    select 1
    from public.audit_logs
    where organization_id = '97000000-0000-4000-8000-000000000010'
      and entity_type = 'credit_application_notes'
      and entity_id in (
        select id
        from public.credit_application_notes
        where application_id = '97000000-0000-4000-8000-000000000030'
      )
      and action = 'insert'
  ),
  'new messages are recorded in the immutable audit trail'
);

select throws_ok(
  $$
    update public.credit_application_notes
    set note = 'Mensaje alterado'
    where id = (
      select id
      from public.credit_application_notes
      where application_id = '97000000-0000-4000-8000-000000000030'
      order by created_at
      limit 1
    )
  $$,
  '42501',
  null,
  'conversation records cannot be edited after publication'
);

select * from finish();
rollback;
