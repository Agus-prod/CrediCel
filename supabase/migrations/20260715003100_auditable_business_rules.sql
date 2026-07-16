-- Auditable, versioned business rules.
-- A rule execution can only emit recommendations; credit approval remains a
-- separate, explicitly human decision.

alter table public.rule_sets
  add constraint rule_sets_organization_name_version_key
    unique (organization_id, name, version),
  add constraint rule_sets_positive_version_chk
    check (version > 0);

create unique index rule_sets_one_active_per_organization
  on public.rule_sets (organization_id)
  where status = 'active';

create index rule_sets_active_lookup
  on public.rule_sets (organization_id, version desc)
  where status = 'active';

alter table public.rule_execution_logs
  add constraint rule_execution_logs_subject_chk
    check (subject_type = 'credit_application' and subject_id is not null),
  add constraint rule_execution_logs_inputs_chk
    check (jsonb_typeof(inputs) = 'object'),
  add constraint rule_execution_logs_evaluations_chk
    check (jsonb_typeof(evaluations) = 'array'),
  add constraint rule_execution_logs_result_chk
    check (
      jsonb_typeof(result) = 'object'
      and coalesce(result -> 'recommendation_only' = 'true'::jsonb, false)
      and coalesce(jsonb_typeof(result -> 'recommendations') = 'array', false)
      and coalesce(jsonb_typeof(result -> 'conflicts') = 'array', false)
      and coalesce(jsonb_typeof(result -> 'applied_rule_ids') = 'array', false)
      and coalesce(jsonb_typeof(result -> 'explanation') = 'string', false)
      and not (result ?| array[
        'actions',
        'decision',
        'status',
        'approved',
        'auto_approved'
      ])
    );

create or replace function private.is_rule_scalar(p_value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_typeof(p_value) in ('string', 'number', 'boolean')
$$;

create or replace function private.is_valid_rule_action_value(
  p_action_type text,
  p_value jsonb
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_action_type in (
      'set_minimum_down_payment',
      'set_interest_rate'
    ) then
      jsonb_typeof(p_value) = 'number'
      and (p_value #>> '{}')::numeric >= 0
    when p_action_type = 'set_maximum_term' then
      jsonb_typeof(p_value) = 'number'
      and (p_value #>> '{}')::numeric > 0
      and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when p_action_type in ('require_document', 'add_warning') then
      jsonb_typeof(p_value) = 'string'
      and nullif(btrim(p_value #>> '{}'), '') is not null
    when p_action_type in (
      'require_supervisor_approval',
      'reject_application'
    ) then
      p_value = 'true'::jsonb
    else false
  end
$$;

create or replace function private.is_valid_rule_recommendation(
  p_recommendation jsonb
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select
    jsonb_typeof(p_recommendation) = 'object'
    and jsonb_typeof(p_recommendation -> 'type') = 'string'
    and p_recommendation ? 'value'
    and not (p_recommendation ?| array[
      'decision',
      'status',
      'approved',
      'auto_approved'
    ])
    and private.is_valid_rule_action_value(
      p_recommendation ->> 'type',
      p_recommendation -> 'value'
    )
$$;

create or replace function private.validate_business_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(new.code), '') is null
    or nullif(btrim(new.name), '') is null then
    raise exception 'El código y el nombre de la regla son obligatorios';
  end if;

  new.code := btrim(new.code);
  new.name := btrim(new.name);
  return new;
end;
$$;

create or replace function private.validate_rule_condition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.field := btrim(new.field);

  if nullif(new.field, '') is null or new.position < 1 then
    raise exception 'Campo o posición de condición inválidos';
  end if;

  if new.operator in ('equals', 'not_equals') then
    if not private.is_rule_scalar(new.operand) then
      raise exception '% requiere un operando escalar', new.operator;
    end if;
  elsif new.operator in (
    'greater_than',
    'greater_than_or_equal',
    'less_than',
    'less_than_or_equal'
  ) then
    if jsonb_typeof(new.operand) is distinct from 'number' then
      raise exception '% requiere un operando numérico', new.operator;
    end if;
  elsif new.operator in ('in', 'not_in') then
    if jsonb_typeof(new.operand) is distinct from 'array'
      or jsonb_array_length(new.operand) = 0
      or exists (
        select 1
        from jsonb_array_elements(new.operand) as item(value)
        where not private.is_rule_scalar(item.value)
      ) then
      raise exception '% requiere una lista no vacía de escalares', new.operator;
    end if;
  elsif new.operator = 'between' then
    if jsonb_typeof(new.operand) is distinct from 'array'
      or jsonb_array_length(new.operand) <> 2
      or jsonb_typeof(new.operand -> 0) is distinct from 'number'
      or jsonb_typeof(new.operand -> 1) is distinct from 'number'
      or (new.operand ->> 0)::numeric > (new.operand ->> 1)::numeric then
      raise exception 'between requiere dos límites numéricos ordenados';
    end if;
  else
    raise exception 'Operador de condición no soportado: %', new.operator;
  end if;

  return new;
end;
$$;

create or replace function private.validate_rule_action()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position < 1
    or not private.is_valid_rule_action_value(new.action_type, new.value) then
    raise exception 'Acción de regla inválida: %', new.action_type;
  end if;

  return new;
end;
$$;

create or replace function private.guard_rule_set_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Un conjunto de reglas publicado es inmutable'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if old.status = 'draft' then
    return new;
  end if;

  if old.status = 'active'
    and new.status = 'retired'
    and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
    return new;
  end if;

  raise exception 'Un conjunto de reglas publicado es inmutable'
    using errcode = '42501';
end;
$$;

create or replace function private.guard_rule_definition_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_rule_set_id uuid;
  v_status text;
begin
  if tg_table_name = 'business_rules' then
    v_rule_set_id := (v_row ->> 'rule_set_id')::uuid;
  else
    select rule.rule_set_id
    into v_rule_set_id
    from public.business_rules as rule
    where rule.id = (v_row ->> 'rule_id')::uuid;
  end if;

  select rule_set.status
  into v_status
  from public.rule_sets as rule_set
  where rule_set.id = v_rule_set_id;

  if v_status is distinct from 'draft' then
    raise exception 'Las reglas publicadas son inmutables'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.validate_rule_execution_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subject_type <> 'credit_application'
    or new.subject_id is null
    or jsonb_typeof(new.inputs) is distinct from 'object'
    or jsonb_typeof(new.evaluations) is distinct from 'array'
    or jsonb_typeof(new.result) is distinct from 'object' then
    raise exception 'Ejecución de reglas inválida';
  end if;

  if new.result -> 'recommendation_only' is distinct from 'true'::jsonb
    or jsonb_typeof(new.result -> 'recommendations') is distinct from 'array'
    or jsonb_typeof(new.result -> 'conflicts') is distinct from 'array'
    or jsonb_typeof(new.result -> 'applied_rule_ids') is distinct from 'array'
    or jsonb_typeof(new.result -> 'explanation') is distinct from 'string'
    or new.result ?| array[
      'actions',
      'decision',
      'status',
      'approved',
      'auto_approved'
    ] then
    raise exception 'El resultado debe contener solamente recomendaciones';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.result -> 'recommendations') as item(value)
    where not private.is_valid_rule_recommendation(item.value)
  ) then
    raise exception 'El resultado contiene una recomendación inválida';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.evaluations) as evaluation(value)
    where jsonb_typeof(evaluation.value) is distinct from 'object'
      or jsonb_typeof(evaluation.value -> 'ruleId') is distinct from 'string'
      or jsonb_typeof(evaluation.value -> 'ruleName') is distinct from 'string'
      or jsonb_typeof(evaluation.value -> 'matched') is distinct from 'boolean'
      or jsonb_typeof(evaluation.value -> 'conditionResults') is distinct from 'array'
  ) then
    raise exception 'El detalle de evaluación es inválido';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.result -> 'applied_rule_ids') as rule_id(value)
    where jsonb_typeof(rule_id.value) is distinct from 'string'
  ) then
    raise exception 'Los identificadores de reglas aplicadas son inválidos';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.result -> 'conflicts') as conflict(value)
    where jsonb_typeof(conflict.value) is distinct from 'object'
      or jsonb_typeof(conflict.value -> 'actionType') is distinct from 'string'
      or jsonb_typeof(conflict.value -> 'priority') is distinct from 'number'
      or jsonb_typeof(conflict.value -> 'ruleIds') is distinct from 'array'
      or jsonb_typeof(conflict.value -> 'values') is distinct from 'array'
      or jsonb_typeof(conflict.value -> 'explanation') is distinct from 'string'
  ) then
    raise exception 'El detalle de conflictos es inválido';
  end if;

  return new;
end;
$$;

create trigger rule_sets_guard
before update or delete on public.rule_sets
for each row execute function private.guard_rule_set_mutation();

create trigger business_rules_editable
before insert or update or delete on public.business_rules
for each row execute function private.guard_rule_definition_mutation();

create trigger business_rules_validate
before insert or update on public.business_rules
for each row execute function private.validate_business_rule();

create trigger rule_conditions_editable
before insert or update or delete on public.rule_conditions
for each row execute function private.guard_rule_definition_mutation();

create trigger rule_conditions_validate
before insert or update on public.rule_conditions
for each row execute function private.validate_rule_condition();

create trigger rule_actions_editable
before insert or update or delete on public.rule_actions
for each row execute function private.guard_rule_definition_mutation();

create trigger rule_actions_validate
before insert or update on public.rule_actions
for each row execute function private.validate_rule_action();

create trigger rule_execution_logs_validate
before insert on public.rule_execution_logs
for each row execute function private.validate_rule_execution_log();

create trigger rule_execution_logs_immutable
before update or delete on public.rule_execution_logs
for each row execute function private.block_mutation();

-- The generic audit function records before/after JSON and the authenticated actor.
create trigger audit_rule_sets
after insert or update or delete on public.rule_sets
for each row execute function private.write_audit_log();

create trigger audit_rule_conditions
after insert or update or delete on public.rule_conditions
for each row execute function private.write_audit_log();

create trigger audit_rule_actions
after insert or update or delete on public.rule_actions
for each row execute function private.write_audit_log();

drop policy if exists rule_sets_manage on public.rule_sets;
drop policy if exists business_rules_manage on public.business_rules;
drop policy if exists rule_conditions_manage on public.rule_conditions;
drop policy if exists rule_actions_manage on public.rule_actions;

create policy rule_sets_insert_draft
  on public.rule_sets for insert to authenticated
  with check (
    rule_sets.organization_id = private.current_organization_id()
    and rule_sets.status = 'draft'
    and private.has_permission('configuration.manage')
  );

create policy rule_sets_update_draft
  on public.rule_sets for update to authenticated
  using (
    organization_id = private.current_organization_id()
    and status = 'draft'
    and private.has_permission('configuration.manage')
  )
  with check (
    organization_id = private.current_organization_id()
    and status = 'draft'
    and private.has_permission('configuration.manage')
  );

create policy rule_sets_delete_draft
  on public.rule_sets for delete to authenticated
  using (
    organization_id = private.current_organization_id()
    and status = 'draft'
    and private.has_permission('configuration.manage')
  );

create policy business_rules_insert_draft
  on public.business_rules for insert to authenticated
  with check (
    business_rules.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.rule_sets as rule_set
      where rule_set.id = business_rules.rule_set_id
        and rule_set.organization_id = business_rules.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy business_rules_update_draft
  on public.business_rules for update to authenticated
  using (
    business_rules.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.rule_sets as rule_set
      where rule_set.id = business_rules.rule_set_id
        and rule_set.organization_id = business_rules.organization_id
        and rule_set.status = 'draft'
    )
  )
  with check (
    business_rules.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.rule_sets as rule_set
      where rule_set.id = business_rules.rule_set_id
        and rule_set.organization_id = business_rules.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy business_rules_delete_draft
  on public.business_rules for delete to authenticated
  using (
    business_rules.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.rule_sets as rule_set
      where rule_set.id = business_rules.rule_set_id
        and rule_set.organization_id = business_rules.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_conditions_insert_draft
  on public.rule_conditions for insert to authenticated
  with check (
    rule_conditions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_conditions.rule_id
        and rule.organization_id = rule_conditions.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_conditions_update_draft
  on public.rule_conditions for update to authenticated
  using (
    rule_conditions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_conditions.rule_id
        and rule.organization_id = rule_conditions.organization_id
        and rule_set.status = 'draft'
    )
  )
  with check (
    rule_conditions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_conditions.rule_id
        and rule.organization_id = rule_conditions.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_conditions_delete_draft
  on public.rule_conditions for delete to authenticated
  using (
    rule_conditions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_conditions.rule_id
        and rule.organization_id = rule_conditions.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_actions_insert_draft
  on public.rule_actions for insert to authenticated
  with check (
    rule_actions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_actions.rule_id
        and rule.organization_id = rule_actions.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_actions_update_draft
  on public.rule_actions for update to authenticated
  using (
    rule_actions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_actions.rule_id
        and rule.organization_id = rule_actions.organization_id
        and rule_set.status = 'draft'
    )
  )
  with check (
    rule_actions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_actions.rule_id
        and rule.organization_id = rule_actions.organization_id
        and rule_set.status = 'draft'
    )
  );

create policy rule_actions_delete_draft
  on public.rule_actions for delete to authenticated
  using (
    rule_actions.organization_id = private.current_organization_id()
    and private.has_permission('configuration.manage')
    and exists (
      select 1
      from public.business_rules as rule
      join public.rule_sets as rule_set on rule_set.id = rule.rule_set_id
      where rule.id = rule_actions.rule_id
        and rule.organization_id = rule_actions.organization_id
        and rule_set.status = 'draft'
    )
  );

drop policy if exists tenant_read_rule_execution_logs
  on public.rule_execution_logs;

create policy rule_execution_logs_read
  on public.rule_execution_logs for select to authenticated
  using (
    organization_id = private.current_organization_id()
    and (
      private.has_permission('applications.review')
      or private.has_permission('configuration.manage')
      or private.has_permission('audit.read')
    )
  );

revoke insert, update, delete on table public.rule_execution_logs
  from anon, authenticated;

create or replace function public.publish_rule_set(p_rule_set_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_rule_set public.rule_sets%rowtype;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not private.has_permission('configuration.manage') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_organization_id::text, 0));

  select *
  into v_rule_set
  from public.rule_sets
  where id = p_rule_set_id
    and organization_id = v_organization_id
    and status = 'draft'
  for update;

  if not found then
    raise exception 'Borrador de reglas no encontrado';
  end if;

  if exists (
    select 1
    from public.business_rules as rule
    where rule.rule_set_id = v_rule_set.id
      and not exists (
        select 1
        from public.rule_actions as action
        where action.rule_id = rule.id
      )
  ) then
    raise exception 'Cada regla debe contener al menos una recomendación';
  end if;

  update public.rule_sets
  set status = 'retired'
  where organization_id = v_organization_id
    and status = 'active';

  update public.rule_sets
  set status = 'active'
  where id = v_rule_set.id;

  return v_rule_set.id;
end;
$$;

create or replace function public.record_rule_execution(
  p_rule_set_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_inputs jsonb,
  p_evaluations jsonb,
  p_result jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_log_id uuid;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not (
      private.has_permission('applications.create')
      or private.has_permission('applications.review')
      or private.has_permission('configuration.manage')
    ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.rule_sets
    where id = p_rule_set_id
      and organization_id = v_organization_id
      and status in ('active', 'retired')
  ) then
    raise exception 'Conjunto de reglas publicado no encontrado';
  end if;

  if p_subject_type is distinct from 'credit_application'
    or p_subject_id is null
    or not exists (
      select 1
      from public.credit_applications
      where id = p_subject_id
        and organization_id = v_organization_id
    ) then
    raise exception 'Solicitud de crédito no encontrada';
  end if;

  insert into public.rule_execution_logs (
    organization_id,
    rule_set_id,
    subject_type,
    subject_id,
    inputs,
    evaluations,
    result,
    executed_by
  )
  values (
    v_organization_id,
    p_rule_set_id,
    p_subject_type,
    p_subject_id,
    p_inputs,
    p_evaluations,
    p_result,
    auth.uid()
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.publish_rule_set(uuid) from public, anon;
grant execute on function public.publish_rule_set(uuid) to authenticated;

revoke all on function public.record_rule_execution(
  uuid,
  text,
  uuid,
  jsonb,
  jsonb,
  jsonb
) from public, anon;
grant execute on function public.record_rule_execution(
  uuid,
  text,
  uuid,
  jsonb,
  jsonb,
  jsonb
) to authenticated;

-- Existing and future organizations receive a neutral active baseline. It has
-- no financial thresholds: organization-specific rules must be authored in a
-- draft and published explicitly.
insert into public.rule_sets (organization_id, name, version, status)
select
  organization.id,
  'Evaluación inicial',
  coalesce((
    select max(existing.version) + 1
    from public.rule_sets as existing
    where existing.organization_id = organization.id
  ), 1),
  'active'
from public.organizations as organization
where not exists (
  select 1
  from public.rule_sets as active_set
  where active_set.organization_id = organization.id
    and active_set.status = 'active'
);

create or replace function private.create_default_rule_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rule_sets (organization_id, name, version, status)
  values (new.id, 'Evaluación inicial', 1, 'active');
  return new;
end;
$$;

create trigger organizations_default_rule_set
after insert on public.organizations
for each row execute function private.create_default_rule_set();
