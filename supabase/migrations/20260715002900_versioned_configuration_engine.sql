-- Versioned, auditable organization configuration.
-- Financial values are only policy inputs in this phase; no final quote is calculated here.

insert into public.configuration_definitions (
  key,
  description,
  value_type,
  allowed_scope_types
)
values
  (
    'credit.minimum_down_payment_percentage',
    'Porcentaje mínimo de prima',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  ),
  (
    'credit.maximum_term_months',
    'Plazo máximo en meses',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  ),
  (
    'credit.maximum_payment_income_percentage',
    'Porcentaje máximo de cuota sobre ingreso',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  ),
  (
    'credit.minimum_employment_months',
    'Antigüedad laboral mínima en meses',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  ),
  (
    'credit.require_guarantor_below_score',
    'Puntuación por debajo de la cual se solicita aval',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  ),
  (
    'credit.interest_rate',
    'Tasa de interés reservada para el futuro motor financiero',
    'number',
    array['organization', 'business_unit', 'branch', 'customer_type', 'category', 'brand', 'model', 'price_range', 'credit_product', 'campaign']
  )
on conflict (key) do update
set
  description = excluded.description,
  value_type = excluded.value_type,
  allowed_scope_types = excluded.allowed_scope_types;

create unique index if not exists configuration_versions_one_active_per_organization
  on public.configuration_versions (organization_id)
  where status = 'active';

create unique index if not exists configuration_versions_one_draft_per_organization
  on public.configuration_versions (organization_id)
  where status = 'draft';

create unique index if not exists configuration_values_one_rule_per_version
  on public.configuration_values (version_id, definition_id, scope_id);

create or replace function private.required_organization_configuration_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'credit.minimum_down_payment_percentage',
    'credit.maximum_term_months',
    'credit.maximum_payment_income_percentage',
    'credit.minimum_employment_months',
    'credit.require_guarantor_below_score'
  ]::text[];
$$;

create or replace function private.can_manage_configuration()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_permission('configuration.manage')
    or private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or private.has_role('credit_manager');
$$;

create or replace function private.validate_configuration_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition public.configuration_definitions%rowtype;
  v_scope public.configuration_scopes%rowtype;
  v_version public.configuration_versions%rowtype;
begin
  select *
  into v_definition
  from public.configuration_definitions
  where id = new.definition_id;

  select *
  into v_scope
  from public.configuration_scopes
  where id = new.scope_id;

  select *
  into v_version
  from public.configuration_versions
  where id = new.version_id;

  if v_definition.id is null or v_scope.id is null or v_version.id is null then
    raise exception 'La definición, el ámbito o la versión no existe';
  end if;

  if new.organization_id <> v_scope.organization_id
    or new.organization_id <> v_version.organization_id then
    raise exception 'La configuración mezcla organizaciones' using errcode = '23514';
  end if;

  if not (v_scope.scope_type = any(v_definition.allowed_scope_types)) then
    raise exception 'El ámbito no está permitido para la definición %', v_definition.key
      using errcode = '23514';
  end if;

  if v_definition.value_type = 'number' and jsonb_typeof(new.value) <> 'number' then
    raise exception 'La definición % requiere un número', v_definition.key using errcode = '23514';
  elsif v_definition.value_type = 'string' and jsonb_typeof(new.value) <> 'string' then
    raise exception 'La definición % requiere texto', v_definition.key using errcode = '23514';
  elsif v_definition.value_type = 'boolean' and jsonb_typeof(new.value) <> 'boolean' then
    raise exception 'La definición % requiere un booleano', v_definition.key using errcode = '23514';
  end if;

  if new.status <> v_version.status then
    raise exception 'El estado del valor debe coincidir con el de su versión' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists configuration_values_validate on public.configuration_values;
create trigger configuration_values_validate
before insert or update on public.configuration_values
for each row execute function private.validate_configuration_value();

create or replace function private.write_configuration_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.configuration_values%rowtype;
  v_actor uuid;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;

  select id
  into v_actor
  from public.profiles
  where id = auth.uid();

  insert into public.configuration_audit_logs (
    organization_id,
    configuration_value_id,
    actor_id,
    action,
    before_value,
    after_value
  )
  values (
    v_row.organization_id,
    case when tg_op = 'DELETE' then null else v_row.id end,
    v_actor,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists configuration_values_audit on public.configuration_values;
create trigger configuration_values_audit
after insert or update or delete on public.configuration_values
for each row execute function private.write_configuration_audit_log();

create or replace function private.create_configuration_draft(
  p_organization_id uuid,
  p_source_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft_id uuid;
  v_next_version integer;
begin
  select id
  into v_draft_id
  from public.configuration_versions
  where organization_id = p_organization_id
    and status = 'draft';

  if v_draft_id is not null then
    return v_draft_id;
  end if;

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.configuration_versions
  where organization_id = p_organization_id;

  insert into public.configuration_versions (
    organization_id,
    version,
    status
  )
  values (
    p_organization_id,
    v_next_version,
    'draft'
  )
  returning id into v_draft_id;

  insert into public.configuration_values (
    organization_id,
    definition_id,
    scope_id,
    version_id,
    value,
    priority,
    effective_from,
    effective_until,
    status
  )
  select
    value.organization_id,
    value.definition_id,
    value.scope_id,
    v_draft_id,
    value.value,
    value.priority,
    greatest(value.effective_from, now()),
    null,
    'draft'
  from public.configuration_values as value
  where value.version_id = p_source_version_id
    and value.definition_id in (
      select definition.id
      from public.configuration_definitions as definition
      where definition.key = any(private.required_organization_configuration_keys())
    );

  return v_draft_id;
end;
$$;

create or replace function private.ensure_organization_configuration(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope_id uuid;
  v_active_id uuid;
  v_next_version integer;
  v_minimum_down_payment numeric := 10;
  v_maximum_term integer := 24;
  v_maximum_payment_income numeric := 30;
  v_minimum_employment integer := 3;
  v_guarantor_score integer := 50;
begin
  if not exists (
    select 1
    from public.organizations
    where id = p_organization_id
  ) then
    raise exception 'La organización no existe';
  end if;

  select
    policy.min_down_payment_ratio * 100,
    policy.max_term,
    policy.max_payment_income_ratio * 100,
    policy.min_employment_months,
    policy.require_guarantor_below_score
  into
    v_minimum_down_payment,
    v_maximum_term,
    v_maximum_payment_income,
    v_minimum_employment,
    v_guarantor_score
  from public.credit_policies as policy
  where policy.organization_id = p_organization_id;

  v_minimum_down_payment := coalesce(v_minimum_down_payment, 10);
  v_maximum_term := coalesce(v_maximum_term, 24);
  v_maximum_payment_income := coalesce(v_maximum_payment_income, 30);
  v_minimum_employment := coalesce(v_minimum_employment, 3);
  v_guarantor_score := coalesce(v_guarantor_score, 50);

  insert into public.configuration_scopes (
    organization_id,
    scope_type,
    scope_id,
    attributes
  )
  values (
    p_organization_id,
    'organization',
    p_organization_id,
    jsonb_build_object('organization_id', p_organization_id)
  )
  on conflict (organization_id, scope_type, scope_id) do update
  set attributes = excluded.attributes
  returning id into v_scope_id;

  select id
  into v_active_id
  from public.configuration_versions
  where organization_id = p_organization_id
    and status = 'active';

  if v_active_id is null then
    select coalesce(max(version), 0) + 1
    into v_next_version
    from public.configuration_versions
    where organization_id = p_organization_id;

    insert into public.configuration_versions (
      organization_id,
      version,
      status,
      published_at
    )
    values (
      p_organization_id,
      v_next_version,
      'active',
      now()
    )
    returning id into v_active_id;
  end if;

  insert into public.configuration_values (
    organization_id,
    definition_id,
    scope_id,
    version_id,
    value,
    priority,
    effective_from,
    effective_until,
    status
  )
  select
    p_organization_id,
    definition.id,
    v_scope_id,
    v_active_id,
    seed.value,
    0,
    now(),
    null,
    'active'
  from (
    values
      ('credit.minimum_down_payment_percentage', to_jsonb(v_minimum_down_payment)),
      ('credit.maximum_term_months', to_jsonb(v_maximum_term)),
      ('credit.maximum_payment_income_percentage', to_jsonb(v_maximum_payment_income)),
      ('credit.minimum_employment_months', to_jsonb(v_minimum_employment)),
      ('credit.require_guarantor_below_score', to_jsonb(v_guarantor_score))
  ) as seed(key, value)
  join public.configuration_definitions as definition
    on definition.key = seed.key
  on conflict (version_id, definition_id, scope_id) do nothing;

  perform private.create_configuration_draft(p_organization_id, v_active_id);
end;
$$;

create or replace function private.bootstrap_organization_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_organization_configuration(new.id);
  return new;
end;
$$;

drop trigger if exists zz_organization_configuration_bootstrap on public.organizations;
create trigger zz_organization_configuration_bootstrap
after insert on public.organizations
for each row execute function private.bootstrap_organization_configuration();

select private.ensure_organization_configuration(organization.id)
from public.organizations as organization;

create or replace function private.configuration_version_payload(
  p_version_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', version.id,
    'version', version.version,
    'status', version.status,
    'published_at', version.published_at,
    'effective_from', min(value.effective_from),
    'effective_until', min(value.effective_until),
    'values', jsonb_object_agg(definition.key, value.value order by definition.key)
  )
  from public.configuration_versions as version
  join public.configuration_values as value
    on value.version_id = version.id
  join public.configuration_definitions as definition
    on definition.id = value.definition_id
  where version.id = p_version_id
  group by version.id;
$$;

create or replace function public.get_configuration_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_active_id uuid;
  v_draft_id uuid;
begin
  if v_organization_id is null or not private.can_manage_configuration() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select id
  into v_active_id
  from public.configuration_versions
  where organization_id = v_organization_id
    and status = 'active';

  select id
  into v_draft_id
  from public.configuration_versions
  where organization_id = v_organization_id
    and status = 'draft';

  return jsonb_build_object(
    'active', private.configuration_version_payload(v_active_id),
    'draft', private.configuration_version_payload(v_draft_id)
  );
end;
$$;

create or replace function public.resolve_configuration(
  p_key text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_matches integer;
  v_rule record;
begin
  if v_organization_id is null then
    raise exception 'Autenticación requerida' using errcode = '42501';
  end if;

  select count(*)
  into v_matches
  from public.configuration_values as value
  join public.configuration_versions as version
    on version.id = value.version_id
  join public.configuration_definitions as definition
    on definition.id = value.definition_id
  join public.configuration_scopes as scope
    on scope.id = value.scope_id
  where value.organization_id = v_organization_id
    and version.organization_id = v_organization_id
    and version.status = 'active'
    and value.status = 'active'
    and definition.key = p_key
    and scope.scope_type = 'organization'
    and scope.scope_id = v_organization_id
    and value.effective_from <= p_at
    and (value.effective_until is null or p_at < value.effective_until);

  if v_matches = 0 then
    raise exception 'No existe una configuración vigente para %', p_key;
  elsif v_matches > 1 then
    raise exception 'Configuración ambigua para %', p_key using errcode = '21000';
  end if;

  select
    value.id as value_id,
    value.value,
    value.priority,
    value.effective_from,
    value.effective_until,
    version.id as version_id,
    version.version,
    scope.id as scope_id
  into v_rule
  from public.configuration_values as value
  join public.configuration_versions as version
    on version.id = value.version_id
  join public.configuration_definitions as definition
    on definition.id = value.definition_id
  join public.configuration_scopes as scope
    on scope.id = value.scope_id
  where value.organization_id = v_organization_id
    and version.status = 'active'
    and value.status = 'active'
    and definition.key = p_key
    and scope.scope_type = 'organization'
    and scope.scope_id = v_organization_id
    and value.effective_from <= p_at
    and (value.effective_until is null or p_at < value.effective_until);

  return jsonb_build_object(
    'value', v_rule.value,
    'applied_rule', jsonb_build_object(
      'configuration_value_id', v_rule.value_id,
      'scope_type', 'organization',
      'scope_id', v_rule.scope_id,
      'priority', v_rule.priority,
      'effective_from', v_rule.effective_from,
      'effective_until', v_rule.effective_until
    ),
    'evaluated_rules', jsonb_build_array(jsonb_build_object(
      'configuration_value_id', v_rule.value_id,
      'eligible', true,
      'reason', 'Coincide en organización, estado y vigencia'
    )),
    'explanation', format(
      'Se aplicó la versión %s con ámbito organizacional.',
      v_rule.version
    ),
    'configuration_version_id', v_rule.version_id,
    'configuration_version', v_rule.version
  );
end;
$$;

comment on function public.resolve_configuration(text, timestamptz) is
  'Phase-one resolver for the organization scope. The schema reserves broader scope types, but multi-scope precedence must be added before publishing non-organization values.';

create or replace function public.save_configuration_draft(
  p_version_id uuid,
  p_values jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_scope_id uuid;
  v_unknown_key text;
  v_minimum_down_payment numeric;
  v_maximum_term integer;
  v_maximum_payment_income numeric;
  v_minimum_employment integer;
  v_guarantor_score integer;
begin
  if v_organization_id is null or not private.can_manage_configuration() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform 1
  from public.configuration_versions
  where id = p_version_id
    and organization_id = v_organization_id
    and status = 'draft'
  for update;

  if not found then
    raise exception 'El borrador no existe o ya fue publicado';
  end if;

  if jsonb_typeof(p_values) <> 'object'
    or not (p_values ?& private.required_organization_configuration_keys()) then
    raise exception 'El borrador no contiene todas las claves requeridas';
  end if;

  select entry.key
  into v_unknown_key
  from jsonb_object_keys(p_values) as entry(key)
  where not (entry.key = any(private.required_organization_configuration_keys()))
  limit 1;

  if v_unknown_key is not null then
    raise exception 'Clave de configuración no permitida: %', v_unknown_key;
  end if;

  if p_effective_from is null
    or (p_effective_until is not null and p_effective_until <= p_effective_from) then
    raise exception 'La vigencia del borrador es inválida';
  end if;

  begin
    v_minimum_down_payment := (p_values ->> 'credit.minimum_down_payment_percentage')::numeric;
    v_maximum_term := (p_values ->> 'credit.maximum_term_months')::integer;
    v_maximum_payment_income := (p_values ->> 'credit.maximum_payment_income_percentage')::numeric;
    v_minimum_employment := (p_values ->> 'credit.minimum_employment_months')::integer;
    v_guarantor_score := (p_values ->> 'credit.require_guarantor_below_score')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Los valores de configuración deben ser numéricos';
  end;

  if v_minimum_down_payment < 0 or v_minimum_down_payment > 90
    or v_maximum_term < 1 or v_maximum_term > 120
    or v_maximum_payment_income < 1 or v_maximum_payment_income > 100
    or v_minimum_employment < 0 or v_minimum_employment > 600
    or v_guarantor_score < 0 or v_guarantor_score > 100 then
    raise exception 'Uno o más valores están fuera del rango permitido';
  end if;

  select id
  into v_scope_id
  from public.configuration_scopes
  where organization_id = v_organization_id
    and scope_type = 'organization'
    and scope_id = v_organization_id;

  update public.configuration_values as value
  set
    value = p_values -> definition.key,
    effective_from = p_effective_from,
    effective_until = p_effective_until
  from public.configuration_definitions as definition
  where value.version_id = p_version_id
    and value.definition_id = definition.id
    and value.scope_id = v_scope_id
    and definition.key = any(private.required_organization_configuration_keys());

  if not found then
    raise exception 'El borrador no contiene valores editables';
  end if;

  return private.configuration_version_payload(p_version_id);
end;
$$;

create or replace function public.publish_configuration_draft(
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.current_organization_id();
  v_current_active_id uuid;
  v_effective_from timestamptz;
  v_effective_until timestamptz;
  v_required_count integer;
begin
  if v_organization_id is null or not private.can_manage_configuration() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform 1
  from public.organizations
  where id = v_organization_id
  for update;

  perform 1
  from public.configuration_versions
  where id = p_version_id
    and organization_id = v_organization_id
    and status = 'draft'
  for update;

  if not found then
    raise exception 'El borrador no existe o ya fue publicado';
  end if;

  select
    count(*),
    min(value.effective_from),
    min(value.effective_until)
  into
    v_required_count,
    v_effective_from,
    v_effective_until
  from public.configuration_values as value
  join public.configuration_definitions as definition
    on definition.id = value.definition_id
  where value.version_id = p_version_id
    and value.status = 'draft'
    and definition.key = any(private.required_organization_configuration_keys());

  if v_required_count <> cardinality(private.required_organization_configuration_keys()) then
    raise exception 'El borrador está incompleto';
  end if;

  if exists (
    select 1
    from public.configuration_values as value
    join public.configuration_definitions as definition
      on definition.id = value.definition_id
    where value.version_id = p_version_id
      and definition.key = any(private.required_organization_configuration_keys())
      and (
        value.effective_from <> v_effective_from
        or value.effective_until is distinct from v_effective_until
      )
  ) then
    raise exception 'Todos los valores del borrador deben compartir vigencia';
  end if;

  if v_effective_from > now()
    or (v_effective_until is not null and v_effective_until <= now()) then
    raise exception 'La versión publicada debe estar vigente en este momento';
  end if;

  select id
  into v_current_active_id
  from public.configuration_versions
  where organization_id = v_organization_id
    and status = 'active'
  for update;

  if v_current_active_id is not null then
    update public.configuration_versions
    set status = 'retired'
    where id = v_current_active_id;

    update public.configuration_values
    set
      status = 'retired',
      effective_until = case
        when effective_from < now() then least(coalesce(effective_until, now()), now())
        else effective_from + interval '1 microsecond'
      end
    where version_id = v_current_active_id;
  end if;

  update public.configuration_versions
  set
    status = 'active',
    published_by = auth.uid(),
    published_at = now()
  where id = p_version_id;

  update public.configuration_values
  set status = 'active'
  where version_id = p_version_id;

  perform private.create_configuration_draft(v_organization_id, p_version_id);

  return public.get_configuration_state();
end;
$$;

create or replace function private.enforce_credit_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_minimum_down_payment numeric;
  v_maximum_term integer;
begin
  select
    version.id,
    max((value.value #>> '{}')::numeric) filter (
      where definition.key = 'credit.minimum_down_payment_percentage'
    ),
    max((value.value #>> '{}')::integer) filter (
      where definition.key = 'credit.maximum_term_months'
    )
  into
    v_version_id,
    v_minimum_down_payment,
    v_maximum_term
  from public.configuration_versions as version
  join public.configuration_values as value
    on value.version_id = version.id
  join public.configuration_definitions as definition
    on definition.id = value.definition_id
  join public.configuration_scopes as scope
    on scope.id = value.scope_id
  where version.organization_id = new.organization_id
    and version.status = 'active'
    and value.status = 'active'
    and scope.scope_type = 'organization'
    and scope.scope_id = new.organization_id
    and value.effective_from <= now()
    and (value.effective_until is null or now() < value.effective_until)
  group by version.id, version.version;

  if v_version_id is null
    or v_minimum_down_payment is null
    or v_maximum_term is null then
    raise exception 'La organización no tiene una configuración de crédito vigente';
  end if;

  if new.requested_price <= 0
    or new.proposed_down_payment < 0
    or new.proposed_down_payment >= new.requested_price
    or (new.proposed_down_payment * 100 / new.requested_price) < v_minimum_down_payment
    or new.proposed_term < 1
    or new.proposed_term > v_maximum_term then
    raise exception 'Las condiciones exceden la configuración de crédito vigente';
  end if;

  new.configuration_version_id := v_version_id;
  return new;
end;
$$;

drop trigger if exists credit_application_policy on public.credit_applications;
create trigger credit_application_policy
before insert on public.credit_applications
for each row execute function private.enforce_credit_policy();

create or replace function public.submit_credit_application(
  p_branch_id uuid,
  p_inventory_unit_id uuid,
  p_dni text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_requested_price numeric,
  p_down_payment numeric,
  p_term integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_unit uuid;
  v_customer uuid;
  v_application uuid;
  v_inventory public.inventory_units%rowtype;
begin
  v_org := private.current_organization_id();

  if v_org is null
    or not private.has_permission('applications.create')
    or not private.has_branch_access(p_branch_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if not private.subscription_allows('applications_monthly') then
    raise exception 'El plan alcanzó el límite mensual de solicitudes';
  end if;

  if nullif(trim(p_dni), '') is null
    or nullif(trim(p_first_name), '') is null
    or nullif(trim(p_last_name), '') is null
    or nullif(trim(p_phone), '') is null then
    raise exception 'Complete los datos obligatorios del cliente';
  end if;

  if p_requested_price <= 0
    or p_down_payment < 0
    or p_down_payment >= p_requested_price
    or p_term < 1 then
    raise exception 'Condiciones de crédito inválidas';
  end if;

  select *
  into v_inventory
  from public.inventory_units
  where id = p_inventory_unit_id
    and organization_id = v_org
    and current_branch_id = p_branch_id
    and status = 'available'
  for update;

  if not found then
    raise exception 'El dispositivo ya no está disponible';
  end if;

  select business_unit_id
  into v_unit
  from public.branches
  where id = p_branch_id
    and organization_id = v_org;

  insert into public.customers (
    organization_id,
    normalized_dni,
    first_name,
    last_name,
    phone,
    email,
    created_by
  )
  values (
    v_org,
    regexp_replace(p_dni, '[^0-9]', '', 'g'),
    trim(p_first_name),
    trim(p_last_name),
    trim(p_phone),
    nullif(trim(p_email), ''),
    auth.uid()
  )
  on conflict (organization_id, normalized_dni) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    email = coalesce(excluded.email, public.customers.email),
    updated_at = now()
  returning id into v_customer;

  insert into public.customer_assignments (
    organization_id,
    customer_id,
    salesperson_id,
    branch_id
  )
  values (
    v_org,
    v_customer,
    auth.uid(),
    p_branch_id
  )
  on conflict do nothing;

  insert into public.credit_applications (
    organization_id,
    branch_id,
    business_unit_id,
    customer_id,
    inventory_unit_id,
    requested_price,
    proposed_down_payment,
    proposed_term,
    status,
    created_by
  )
  values (
    v_org,
    p_branch_id,
    v_unit,
    v_customer,
    p_inventory_unit_id,
    p_requested_price,
    p_down_payment,
    p_term,
    'submitted',
    auth.uid()
  )
  returning id into v_application;

  insert into public.credit_application_items (
    organization_id,
    application_id,
    inventory_unit_id,
    description,
    price
  )
  values (
    v_org,
    v_application,
    p_inventory_unit_id,
    'Dispositivo IMEI ' || v_inventory.imei_1,
    p_requested_price
  );

  insert into public.credit_application_status_history (
    organization_id,
    application_id,
    status,
    actor_id,
    reason
  )
  values (
    v_org,
    v_application,
    'submitted',
    auth.uid(),
    'Solicitud enviada por vendedor'
  );

  update public.inventory_units
  set
    status = 'reserved',
    updated_at = now()
  where id = p_inventory_unit_id;

  insert into public.subscription_usage (
    organization_id,
    metric,
    period_start,
    period_end,
    used
  )
  values (
    v_org,
    'applications_monthly',
    date_trunc('month', current_date)::date,
    (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date,
    1
  )
  on conflict (organization_id, metric, period_start) do update
  set used = public.subscription_usage.used + 1;

  return v_application;
end;
$$;

drop policy if exists config_write on public.configuration_values;

revoke insert, update, delete, truncate
  on public.configuration_versions,
     public.configuration_scopes,
     public.configuration_values,
     public.configuration_audit_logs
  from anon, authenticated;

grant select
  on public.configuration_definitions,
     public.configuration_versions,
     public.configuration_scopes,
     public.configuration_values,
     public.configuration_audit_logs
  to authenticated;

revoke all on function public.get_configuration_state() from public, anon;
revoke all on function public.resolve_configuration(text, timestamptz) from public, anon;
revoke all on function public.save_configuration_draft(uuid, jsonb, timestamptz, timestamptz) from public, anon;
revoke all on function public.publish_configuration_draft(uuid) from public, anon;
revoke execute on function public.update_credit_policy(numeric, integer, numeric, integer, integer) from authenticated;

grant execute on function public.get_configuration_state() to authenticated;
grant execute on function public.resolve_configuration(text, timestamptz) to authenticated;
grant execute on function public.save_configuration_draft(uuid, jsonb, timestamptz, timestamptz) to authenticated;
grant execute on function public.publish_configuration_draft(uuid) to authenticated;

revoke all on function private.required_organization_configuration_keys() from public, anon, authenticated;
revoke all on function private.can_manage_configuration() from public, anon, authenticated;
revoke all on function private.create_configuration_draft(uuid, uuid) from public, anon, authenticated;
revoke all on function private.ensure_organization_configuration(uuid) from public, anon, authenticated;
revoke all on function private.configuration_version_payload(uuid) from public, anon, authenticated;
