-- Tenant-safe relationships, scoped access and resilient inventory transfers.
-- Composite foreign keys are NOT VALID deliberately: they protect every new
-- mutation while allowing existing installations to audit legacy rows first.

-- PostgreSQL requires an exact unique key on every composite FK target. These
-- UNIQUE constraints are safe on legacy data because every id is already a
-- primary key: adding organization_id cannot introduce a duplicate pair.
do $$
declare
  v_target record;
begin
  for v_target in
    select *
    from (values
      ('business_units', 'tenant_business_units_org_id_key'),
      ('branches', 'tenant_branches_org_id_key'),
      ('profiles', 'tenant_profiles_org_id_key'),
      ('roles', 'tenant_roles_org_id_key'),
      ('configuration_versions', 'tenant_configuration_versions_org_id_key'),
      ('configuration_scopes', 'tenant_configuration_scopes_org_id_key'),
      ('configuration_values', 'tenant_configuration_values_org_id_key'),
      ('rule_sets', 'tenant_rule_sets_org_id_key'),
      ('business_rules', 'tenant_business_rules_org_id_key'),
      ('customers', 'tenant_customers_org_id_key'),
      ('product_brands', 'tenant_product_brands_org_id_key'),
      ('product_models', 'tenant_product_models_org_id_key'),
      ('inventory_units', 'tenant_inventory_units_org_id_key'),
      ('inventory_transfers', 'tenant_inventory_transfers_org_id_key'),
      ('credit_applications', 'tenant_credit_applications_org_id_key'),
      ('bank_accounts', 'tenant_bank_accounts_org_id_key'),
      ('transfer_reports', 'tenant_transfer_reports_org_id_key'),
      ('credit_accounts', 'tenant_credit_accounts_org_id_key'),
      ('device_enrollments', 'tenant_device_enrollments_org_id_key')
    ) as targets(table_name, constraint_name)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conrelid = format('public.%I', v_target.table_name)::regclass
        and conname = v_target.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (organization_id, id)',
        v_target.table_name,
        v_target.constraint_name
      );
    end if;
  end loop;
end;
$$;

-- Every row carrying organization_id must agree with its tenant-owned parents.
do $$
declare
  v_fk record;
begin
  for v_fk in
    select *
    from (values
      ('branches', 'organization_id, business_unit_id', 'business_units', 'organization_id, id', 'branches_business_unit_tenant_fk'),
      ('configuration_values', 'organization_id, scope_id', 'configuration_scopes', 'organization_id, id', 'configuration_values_scope_tenant_fk'),
      ('configuration_values', 'organization_id, version_id', 'configuration_versions', 'organization_id, id', 'configuration_values_version_tenant_fk'),
      ('configuration_versions', 'organization_id, published_by', 'profiles', 'organization_id, id', 'configuration_versions_publisher_tenant_fk'),
      ('configuration_audit_logs', 'organization_id, configuration_value_id', 'configuration_values', 'organization_id, id', 'configuration_audit_value_tenant_fk'),
      ('configuration_audit_logs', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'configuration_audit_actor_tenant_fk'),
      ('business_rules', 'organization_id, rule_set_id', 'rule_sets', 'organization_id, id', 'business_rules_set_tenant_fk'),
      ('rule_conditions', 'organization_id, rule_id', 'business_rules', 'organization_id, id', 'rule_conditions_rule_tenant_fk'),
      ('rule_actions', 'organization_id, rule_id', 'business_rules', 'organization_id, id', 'rule_actions_rule_tenant_fk'),
      ('rule_execution_logs', 'organization_id, rule_set_id', 'rule_sets', 'organization_id, id', 'rule_execution_set_tenant_fk'),
      ('rule_execution_logs', 'organization_id, executed_by', 'profiles', 'organization_id, id', 'rule_execution_actor_tenant_fk'),
      ('customers', 'organization_id, created_by', 'profiles', 'organization_id, id', 'customers_creator_tenant_fk'),
      ('customer_addresses', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_addresses_customer_tenant_fk'),
      ('customer_employment', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_employment_customer_tenant_fk'),
      ('customer_references', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_references_customer_tenant_fk'),
      ('customer_documents', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_documents_customer_tenant_fk'),
      ('customer_consents', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_consents_customer_tenant_fk'),
      ('customer_timeline_events', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_timeline_customer_tenant_fk'),
      ('customer_timeline_events', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'customer_timeline_actor_tenant_fk'),
      ('customer_assignments', 'organization_id, customer_id', 'customers', 'organization_id, id', 'customer_assignments_customer_tenant_fk'),
      ('customer_assignments', 'organization_id, salesperson_id', 'profiles', 'organization_id, id', 'customer_assignments_salesperson_tenant_fk'),
      ('customer_assignments', 'organization_id, branch_id', 'branches', 'organization_id, id', 'customer_assignments_branch_tenant_fk'),
      ('product_models', 'organization_id, brand_id', 'product_brands', 'organization_id, id', 'product_models_brand_tenant_fk'),
      ('inventory_units', 'organization_id, owner_business_unit_id', 'business_units', 'organization_id, id', 'inventory_units_owner_tenant_fk'),
      ('inventory_units', 'organization_id, current_branch_id', 'branches', 'organization_id, id', 'inventory_units_branch_tenant_fk'),
      ('inventory_units', 'organization_id, brand_id', 'product_brands', 'organization_id, id', 'inventory_units_brand_tenant_fk'),
      ('inventory_units', 'organization_id, model_id', 'product_models', 'organization_id, id', 'inventory_units_model_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, inventory_unit_id', 'inventory_units', 'organization_id, id', 'inventory_movements_unit_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, from_branch_id', 'branches', 'organization_id, id', 'inventory_movements_from_branch_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, to_branch_id', 'branches', 'organization_id, id', 'inventory_movements_to_branch_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, from_owner_business_unit_id', 'business_units', 'organization_id, id', 'inventory_movements_from_owner_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, to_owner_business_unit_id', 'business_units', 'organization_id, id', 'inventory_movements_to_owner_tenant_fk'),
      ('inventory_unit_movements', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'inventory_movements_actor_tenant_fk'),
      ('inventory_transfers', 'organization_id, origin_branch_id', 'branches', 'organization_id, id', 'inventory_transfers_origin_tenant_fk'),
      ('inventory_transfers', 'organization_id, destination_branch_id', 'branches', 'organization_id, id', 'inventory_transfers_destination_tenant_fk'),
      ('inventory_transfers', 'organization_id, destination_owner_business_unit_id', 'business_units', 'organization_id, id', 'inventory_transfers_owner_tenant_fk'),
      ('inventory_transfers', 'organization_id, requested_by', 'profiles', 'organization_id, id', 'inventory_transfers_requester_tenant_fk'),
      ('inventory_transfers', 'organization_id, approved_by', 'profiles', 'organization_id, id', 'inventory_transfers_approver_tenant_fk'),
      ('inventory_transfers', 'organization_id, dispatched_by', 'profiles', 'organization_id, id', 'inventory_transfers_dispatcher_tenant_fk'),
      ('inventory_transfers', 'organization_id, received_by', 'profiles', 'organization_id, id', 'inventory_transfers_receiver_tenant_fk'),
      ('inventory_transfer_items', 'organization_id, transfer_id', 'inventory_transfers', 'organization_id, id', 'inventory_transfer_items_transfer_tenant_fk'),
      ('inventory_transfer_items', 'organization_id, inventory_unit_id', 'inventory_units', 'organization_id, id', 'inventory_transfer_items_unit_tenant_fk'),
      ('inventory_transfer_events', 'organization_id, transfer_id', 'inventory_transfers', 'organization_id, id', 'inventory_transfer_events_transfer_tenant_fk'),
      ('inventory_transfer_events', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'inventory_transfer_events_actor_tenant_fk'),
      ('inventory_transfer_discrepancies', 'organization_id, transfer_id', 'inventory_transfers', 'organization_id, id', 'inventory_discrepancies_transfer_tenant_fk'),
      ('inventory_transfer_discrepancies', 'organization_id, expected_inventory_unit_id', 'inventory_units', 'organization_id, id', 'inventory_discrepancies_unit_tenant_fk'),
      ('credit_applications', 'organization_id, branch_id', 'branches', 'organization_id, id', 'credit_applications_branch_tenant_fk'),
      ('credit_applications', 'organization_id, business_unit_id', 'business_units', 'organization_id, id', 'credit_applications_unit_tenant_fk'),
      ('credit_applications', 'organization_id, customer_id', 'customers', 'organization_id, id', 'credit_applications_customer_tenant_fk'),
      ('credit_applications', 'organization_id, assigned_analyst_id', 'profiles', 'organization_id, id', 'credit_applications_analyst_tenant_fk'),
      ('credit_applications', 'organization_id, inventory_unit_id', 'inventory_units', 'organization_id, id', 'credit_applications_inventory_tenant_fk'),
      ('credit_applications', 'organization_id, configuration_version_id', 'configuration_versions', 'organization_id, id', 'credit_applications_config_tenant_fk'),
      ('credit_applications', 'organization_id, created_by', 'profiles', 'organization_id, id', 'credit_applications_creator_tenant_fk'),
      ('credit_application_items', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_application_items_app_tenant_fk'),
      ('credit_application_items', 'organization_id, inventory_unit_id', 'inventory_units', 'organization_id, id', 'credit_application_items_unit_tenant_fk'),
      ('credit_application_status_history', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_status_history_app_tenant_fk'),
      ('credit_application_status_history', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'credit_status_history_actor_tenant_fk'),
      ('credit_application_notes', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_notes_app_tenant_fk'),
      ('credit_application_notes', 'organization_id, author_id', 'profiles', 'organization_id, id', 'credit_notes_author_tenant_fk'),
      ('credit_application_assignments', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_assignments_app_tenant_fk'),
      ('credit_application_assignments', 'organization_id, analyst_id', 'profiles', 'organization_id, id', 'credit_assignments_analyst_tenant_fk'),
      ('credit_application_assignments', 'organization_id, assigned_by', 'profiles', 'organization_id, id', 'credit_assignments_assigner_tenant_fk'),
      ('credit_decisions', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_decisions_app_tenant_fk'),
      ('credit_decisions', 'organization_id, decided_by', 'profiles', 'organization_id, id', 'credit_decisions_actor_tenant_fk'),
      ('credit_application_profiles', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_profiles_app_tenant_fk'),
      ('credit_risk_assessments', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_assessments_app_tenant_fk'),
      ('credit_risk_assessments', 'organization_id, calculated_by', 'profiles', 'organization_id, id', 'credit_assessments_actor_tenant_fk'),
      ('bank_accounts', 'organization_id, business_unit_id', 'business_units', 'organization_id, id', 'bank_accounts_unit_tenant_fk'),
      ('transfer_reports', 'organization_id, customer_id', 'customers', 'organization_id, id', 'transfer_reports_customer_tenant_fk'),
      ('transfer_reports', 'organization_id, credit_application_id', 'credit_applications', 'organization_id, id', 'transfer_reports_application_tenant_fk'),
      ('transfer_reports', 'organization_id, bank_account_id', 'bank_accounts', 'organization_id, id', 'transfer_reports_bank_tenant_fk'),
      ('transfer_report_files', 'organization_id, transfer_report_id', 'transfer_reports', 'organization_id, id', 'transfer_report_files_report_tenant_fk'),
      ('transfer_validation_events', 'organization_id, transfer_report_id', 'transfer_reports', 'organization_id, id', 'transfer_validation_report_tenant_fk'),
      ('transfer_validation_events', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'transfer_validation_actor_tenant_fk'),
      ('credit_accounts', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_accounts_application_tenant_fk'),
      ('credit_accounts', 'organization_id, customer_id', 'customers', 'organization_id, id', 'credit_accounts_customer_tenant_fk'),
      ('credit_installments', 'organization_id, account_id', 'credit_accounts', 'organization_id, id', 'credit_installments_account_tenant_fk'),
      ('customer_portal_access', 'organization_id, customer_id', 'customers', 'organization_id, id', 'portal_access_customer_tenant_fk'),
      ('payment_applications', 'organization_id, transfer_report_id', 'transfer_reports', 'organization_id, id', 'payment_applications_report_tenant_fk'),
      ('payment_applications', 'organization_id, account_id', 'credit_accounts', 'organization_id, id', 'payment_applications_account_tenant_fk'),
      ('payment_applications', 'organization_id, applied_by', 'profiles', 'organization_id, id', 'payment_applications_actor_tenant_fk'),
      ('collection_actions', 'organization_id, account_id', 'credit_accounts', 'organization_id, id', 'collection_actions_account_tenant_fk'),
      ('collection_actions', 'organization_id, actor_id', 'profiles', 'organization_id, id', 'collection_actions_actor_tenant_fk'),
      ('credit_contracts', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'credit_contracts_application_tenant_fk'),
      ('credit_contracts', 'organization_id, created_by', 'profiles', 'organization_id, id', 'credit_contracts_creator_tenant_fk'),
      ('cash_transactions', 'organization_id, branch_id', 'branches', 'organization_id, id', 'cash_transactions_branch_tenant_fk'),
      ('cash_transactions', 'organization_id, application_id', 'credit_applications', 'organization_id, id', 'cash_transactions_application_tenant_fk'),
      ('cash_transactions', 'organization_id, account_id', 'credit_accounts', 'organization_id, id', 'cash_transactions_account_tenant_fk'),
      ('cash_transactions', 'organization_id, received_by', 'profiles', 'organization_id, id', 'cash_transactions_receiver_tenant_fk'),
      ('team_invitations', 'organization_id, branch_id', 'branches', 'organization_id, id', 'team_invitations_branch_tenant_fk'),
      ('team_invitations', 'organization_id, invited_by', 'profiles', 'organization_id, id', 'team_invitations_inviter_tenant_fk'),
      ('device_enrollments', 'organization_id, inventory_unit_id', 'inventory_units', 'organization_id, id', 'device_enrollments_inventory_tenant_fk'),
      ('device_enrollments', 'organization_id, account_id', 'credit_accounts', 'organization_id, id', 'device_enrollments_account_tenant_fk'),
      ('device_enrollments', 'organization_id, created_by', 'profiles', 'organization_id, id', 'device_enrollments_creator_tenant_fk'),
      ('device_commands', 'organization_id, enrollment_id', 'device_enrollments', 'organization_id, id', 'device_commands_enrollment_tenant_fk'),
      ('device_commands', 'organization_id, requested_by', 'profiles', 'organization_id, id', 'device_commands_requester_tenant_fk'),
      ('credit_policies', 'organization_id, updated_by', 'profiles', 'organization_id, id', 'credit_policies_actor_tenant_fk'),
      ('audit_logs', 'organization_id, branch_id', 'branches', 'organization_id, id', 'audit_logs_branch_tenant_fk'),
      ('audit_logs', 'organization_id, user_id', 'profiles', 'organization_id, id', 'audit_logs_user_tenant_fk')
    ) as relations(child_table, child_columns, parent_table, parent_columns, constraint_name)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conrelid = format('public.%I', v_fk.child_table)::regclass
        and conname = v_fk.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%s) references public.%I (%s) not valid',
        v_fk.child_table,
        v_fk.constraint_name,
        v_fk.child_columns,
        v_fk.parent_table,
        v_fk.parent_columns
      );
    end if;
  end loop;
end;
$$;

-- Domain checks are also NOT VALID so legacy anomalies can be reported and
-- repaired explicitly; PostgreSQL still enforces them for every new row.
alter table public.customers
  add constraint customers_normalized_dni_format_chk
  check (normalized_dni ~ '^[0-9]{13}$') not valid;

alter table public.inventory_units
  add constraint inventory_units_imei_1_format_chk
    check (imei_1 ~ '^[0-9]{14,16}$') not valid,
  add constraint inventory_units_imei_2_format_chk
    check (imei_2 is null or imei_2 ~ '^[0-9]{14,16}$') not valid,
  add constraint inventory_units_distinct_imeis_chk
    check (imei_2 is null or imei_1 <> imei_2) not valid;

alter table public.inventory_transfers
  add constraint inventory_transfers_owner_semantics_chk
  check (
    (transfer_ownership and destination_owner_business_unit_id is not null)
    or (not transfer_ownership and destination_owner_business_unit_id is null)
  ) not valid;

alter table public.credit_applications
  add constraint credit_applications_amounts_chk
    check (
      requested_price > 0
      and proposed_down_payment >= 0
      and proposed_down_payment < requested_price
    ) not valid,
  add constraint credit_applications_positive_term_chk
    check (proposed_term > 0) not valid;

alter table public.credit_accounts
  add constraint credit_accounts_amounts_chk
    check (
      principal > 0
      and down_payment >= 0
      and down_payment <= principal
      and term > 0
      and installment_amount > 0
      and outstanding_balance >= 0
    ) not valid;

alter table public.credit_installments
  add constraint credit_installments_amounts_chk
    check (
      installment_number > 0
      and amount > 0
      and paid_amount >= 0
      and paid_amount <= amount
    ) not valid;

alter table public.payment_applications
  add constraint payment_applications_positive_amount_chk
  check (amount > 0) not valid;

alter table public.transfer_reports
  add constraint transfer_reports_reference_present_chk
  check (nullif(trim(reference_number), '') is not null) not valid;

-- Separate unique constraints on imei_1/imei_2 do not stop an identifier from
-- appearing in the other column. Deterministic advisory locks close that race.
create or replace function private.guard_cross_column_imei()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identifier text;
begin
  if new.imei_1 !~ '^[0-9]{14,16}$'
    or (new.imei_2 is not null and new.imei_2 !~ '^[0-9]{14,16}$')
    or new.imei_1 = new.imei_2 then
    raise exception 'Formato o combinación de IMEI inválida' using errcode = '23514';
  end if;

  for v_identifier in
    select distinct identifier
    from unnest(array[new.imei_1, new.imei_2]) as identifier
    where identifier is not null
    order by identifier
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(new.organization_id::text || ':' || v_identifier, 0)
    );

    if exists (
      select 1
      from public.inventory_units as inventory
      where inventory.organization_id = new.organization_id
        and inventory.id <> new.id
        and v_identifier in (inventory.imei_1, inventory.imei_2)
    ) then
      raise exception 'IMEI already assigned within the organization'
        using errcode = '23505';
    end if;
  end loop;

  return new;
end;
$$;

create trigger inventory_units_cross_column_imei
before insert or update of organization_id, imei_1, imei_2
on public.inventory_units
for each row execute function private.guard_cross_column_imei();

-- Join tables without organization_id receive equivalent tenant guards.
create or replace function private.guard_profile_role_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_organization_id uuid;
  v_role_organization_id uuid;
begin
  select organization_id
  into v_profile_organization_id
  from public.profiles
  where id = new.profile_id;

  select organization_id
  into v_role_organization_id
  from public.roles
  where id = new.role_id;

  if v_profile_organization_id is null
    or v_role_organization_id is null
    or v_profile_organization_id <> v_role_organization_id then
    raise exception 'El perfil y el rol deben pertenecer a la misma organización'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger profile_roles_same_tenant
before insert or update of profile_id, role_id
on public.profile_roles
for each row execute function private.guard_profile_role_membership();

create or replace function private.guard_profile_branch_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_organization_id uuid;
  v_branch_organization_id uuid;
begin
  select organization_id
  into v_profile_organization_id
  from public.profiles
  where id = new.profile_id;

  select organization_id
  into v_branch_organization_id
  from public.branches
  where id = new.branch_id;

  if v_profile_organization_id is null
    or v_branch_organization_id is null
    or v_profile_organization_id <> v_branch_organization_id then
    raise exception 'El perfil y el punto deben pertenecer a la misma organización'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger user_branch_access_same_tenant
before insert or update of profile_id, branch_id
on public.user_branch_access
for each row execute function private.guard_profile_branch_membership();

-- Every organization receives the complete role catalog, including future
-- organizations created through onboarding rather than the development seed.
create or replace function private.ensure_organization_roles(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.roles (organization_id, name, description, is_system)
  select p_organization_id, role_name, role_description, true
  from (values
    ('organization_owner', 'Propietario de la organización'),
    ('super_admin', 'Administración total'),
    ('organization_admin', 'Administración organizacional'),
    ('credit_manager', 'Gerencia de crédito'),
    ('credit_analyst', 'Análisis de crédito'),
    ('branch_manager', 'Gerencia de punto'),
    ('salesperson', 'Ventas'),
    ('cashier', 'Caja'),
    ('inventory_manager', 'Inventario'),
    ('collections_agent', 'Cobranza'),
    ('auditor', 'Auditoría de solo lectura')
  ) as role_catalog(role_name, role_description)
  on conflict (organization_id, name) do update
  set
    description = excluded.description,
    is_system = true;

  -- The legacy role trigger granted organization.full_access to credit roles.
  -- Credit staff are branch-scoped, so remove that inherited permission.
  delete from public.role_permissions as role_permission
  using public.roles as role, public.permissions as permission
  where role_permission.role_id = role.id
    and role_permission.permission_id = permission.id
    and role.organization_id = p_organization_id
    and role.name in ('credit_manager', 'credit_analyst')
    and permission.code = 'organization.full_access';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles as role
  cross join public.permissions as permission
  where role.organization_id = p_organization_id
    and (
      role.name in ('organization_owner', 'super_admin', 'organization_admin')
      or (role.name = 'credit_manager' and permission.code in ('applications.review', 'customers.write'))
      or (role.name = 'credit_analyst' and permission.code = 'applications.review')
      or (role.name = 'branch_manager' and permission.code in ('customers.write', 'inventory.write', 'applications.create', 'transfers.dispatch', 'transfers.receive'))
      or (role.name = 'salesperson' and permission.code in ('customers.write', 'applications.create'))
      or (role.name = 'cashier' and permission.code = 'payments.validate')
      or (role.name = 'inventory_manager' and permission.code in ('inventory.write', 'transfers.dispatch', 'transfers.receive'))
      or (role.name = 'auditor' and permission.code in ('organization.full_access', 'audit.read'))
    )
  on conflict do nothing;
end;
$$;

create or replace function private.bootstrap_organization_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_organization_roles(new.id);
  return new;
end;
$$;

create trigger zy_organization_roles_bootstrap
after insert on public.organizations
for each row execute function private.bootstrap_organization_roles();

do $$
declare
  v_organization_id uuid;
begin
  for v_organization_id in select id from public.organizations loop
    perform private.ensure_organization_roles(v_organization_id);
  end loop;
end;
$$;

create or replace function public.create_team_invitation(
  p_email text,
  p_full_name text,
  p_role_name text,
  p_branch_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_token uuid;
  v_role_id uuid;
  v_requires_branch boolean;
begin
  v_organization_id := private.current_organization_id();

  if v_organization_id is null
    or not (private.has_role('organization_owner') or private.has_role('organization_admin')) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if nullif(trim(p_email), '') is null
    or position('@' in trim(p_email)) <= 1
    or nullif(trim(p_full_name), '') is null then
    raise exception 'Correo y nombre son obligatorios';
  end if;

  if p_role_name not in (
    'organization_admin',
    'credit_manager',
    'credit_analyst',
    'branch_manager',
    'salesperson',
    'cashier',
    'inventory_manager',
    'collections_agent',
    'auditor'
  ) then
    raise exception 'Rol inválido';
  end if;

  select id
  into v_role_id
  from public.roles
  where organization_id = v_organization_id
    and name = p_role_name;

  if v_role_id is null then
    raise exception 'El rol no existe en esta organización';
  end if;

  v_requires_branch := p_role_name not in ('organization_admin', 'auditor');

  if v_requires_branch and p_branch_id is null then
    raise exception 'Seleccione un punto autorizado para este rol';
  end if;

  if p_branch_id is not null and not exists (
    select 1
    from public.branches
    where id = p_branch_id
      and organization_id = v_organization_id
      and status = 'active'
  ) then
    raise exception 'Seleccione un punto válido de la organización';
  end if;

  update public.team_invitations
  set expires_at = now()
  where organization_id = v_organization_id
    and lower(email) = lower(trim(p_email))
    and accepted_at is null
    and expires_at > now();

  insert into public.team_invitations (
    organization_id,
    email,
    full_name,
    role_name,
    branch_id,
    invited_by
  )
  values (
    v_organization_id,
    lower(trim(p_email)),
    trim(p_full_name),
    p_role_name,
    p_branch_id,
    auth.uid()
  )
  returning token into v_token;

  return v_token;
end;
$$;

create or replace function public.accept_team_invitation(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_role_id uuid;
  v_email text;
  v_requires_branch boolean;
begin
  select *
  into v_invitation
  from public.team_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitación inválida o vencida';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null or v_email <> lower(v_invitation.email) then
    raise exception 'La invitación pertenece a otro correo';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Este usuario ya pertenece a una organización';
  end if;

  select id
  into v_role_id
  from public.roles
  where organization_id = v_invitation.organization_id
    and name = v_invitation.role_name;

  if v_role_id is null then
    raise exception 'El rol de la invitación ya no existe';
  end if;

  v_requires_branch := v_invitation.role_name not in ('organization_admin', 'auditor');

  if v_requires_branch and v_invitation.branch_id is null then
    raise exception 'La invitación requiere un punto autorizado';
  end if;

  if v_invitation.branch_id is not null and not exists (
    select 1
    from public.branches
    where id = v_invitation.branch_id
      and organization_id = v_invitation.organization_id
      and status = 'active'
  ) then
    raise exception 'El punto de la invitación ya no está disponible';
  end if;

  insert into public.profiles (id, organization_id, full_name)
  values (auth.uid(), v_invitation.organization_id, v_invitation.full_name);

  insert into public.profile_roles (profile_id, role_id)
  values (auth.uid(), v_role_id);

  if v_invitation.branch_id is not null then
    insert into public.user_branch_access (profile_id, branch_id, can_manage)
    values (
      auth.uid(),
      v_invitation.branch_id,
      v_invitation.role_name = 'branch_manager'
    );
  end if;

  update public.team_invitations
  set accepted_at = now()
  where id = v_invitation.id;
end;
$$;

-- Security-definer predicates centralize branch-aware read decisions without
-- relying on a child table's broad organization-only policy.
create or replace function private.can_read_application(p_application_id uuid)
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
          private.has_role('salesperson')
          and application.created_by = (select auth.uid())
        )
        or (
          (
            private.has_role('credit_manager')
            or private.has_role('credit_analyst')
            or private.has_role('branch_manager')
            or private.has_role('cashier')
            or private.has_role('collections_agent')
          )
          and private.has_branch_access(application.branch_id)
        )
      )
  )
$$;

create or replace function private.can_read_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers as customer
    where customer.id = p_customer_id
      and customer.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or exists (
          select 1
          from public.customer_assignments as assignment
          where assignment.customer_id = customer.id
            and assignment.organization_id = customer.organization_id
            and assignment.ended_at is null
            and (
              (
                private.has_role('salesperson')
                and assignment.salesperson_id = (select auth.uid())
              )
              or (
                private.has_role('branch_manager')
                and private.has_branch_access(assignment.branch_id)
              )
            )
        )
        or exists (
          select 1
          from public.credit_applications as application
          where application.customer_id = customer.id
            and application.organization_id = customer.organization_id
            and (
              (
                private.has_role('salesperson')
                and application.created_by = (select auth.uid())
              )
              or (
                (
                  private.has_role('credit_manager')
                  or private.has_role('credit_analyst')
                  or private.has_role('branch_manager')
                  or private.has_role('cashier')
                  or private.has_role('collections_agent')
                )
                and private.has_branch_access(application.branch_id)
              )
            )
        )
      )
  )
$$;

create or replace function private.can_read_inventory(p_inventory_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inventory_units as inventory
    where inventory.id = p_inventory_unit_id
      and inventory.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          private.has_branch_access(inventory.current_branch_id)
          and (
            private.has_role('inventory_manager')
            or private.has_role('branch_manager')
            or private.has_role('credit_manager')
            or private.has_role('credit_analyst')
            or private.has_role('cashier')
            or (
              private.has_role('salesperson')
              and (
                inventory.status = 'available'
                or exists (
                  select 1
                  from public.credit_applications as application
                  where application.inventory_unit_id = inventory.id
                    and application.created_by = (select auth.uid())
                )
              )
            )
          )
        )
      )
  )
$$;

create or replace function private.can_read_transfer(p_transfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inventory_transfers as transfer
    where transfer.id = p_transfer_id
      and transfer.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          (private.has_role('inventory_manager') or private.has_role('branch_manager'))
          and (
            private.has_branch_access(transfer.origin_branch_id)
            or private.has_branch_access(transfer.destination_branch_id)
          )
        )
      )
  )
$$;

create or replace function private.can_read_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.credit_accounts as account
    join public.credit_applications as application
      on application.id = account.application_id
     and application.organization_id = account.organization_id
    where account.id = p_account_id
      and account.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          private.has_role('salesperson')
          and application.created_by = (select auth.uid())
        )
        or (
          (
            private.has_role('credit_manager')
            or private.has_role('credit_analyst')
            or private.has_role('branch_manager')
            or private.has_role('cashier')
            or private.has_role('collections_agent')
          )
          and private.has_branch_access(application.branch_id)
        )
      )
  )
$$;

create or replace function private.can_read_payment_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.transfer_reports as report
    left join public.credit_applications as application
      on application.id = report.credit_application_id
     and application.organization_id = report.organization_id
    where report.id = p_report_id
      and report.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          application.id is not null
          and private.has_branch_access(application.branch_id)
          and (
            private.has_role('cashier')
            or private.has_role('collections_agent')
            or private.has_role('branch_manager')
          )
        )
      )
  )
$$;

create or replace function private.can_read_bank_account(p_bank_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bank_accounts as bank_account
    where bank_account.id = p_bank_account_id
      and bank_account.organization_id = private.current_organization_id()
      and (
        private.has_role('organization_owner')
        or private.has_role('organization_admin')
        or private.has_role('auditor')
        or (
          (
            private.has_role('cashier')
            or private.has_role('collections_agent')
            or private.has_role('branch_manager')
          )
          and exists (
            select 1
            from public.branches as branch
            where branch.organization_id = bank_account.organization_id
              and branch.business_unit_id = bank_account.business_unit_id
              and private.has_branch_access(branch.id)
          )
        )
      )
  )
$$;

revoke all on function private.can_read_application(uuid) from public, anon;
revoke all on function private.can_read_customer(uuid) from public, anon;
revoke all on function private.can_read_inventory(uuid) from public, anon;
revoke all on function private.can_read_transfer(uuid) from public, anon;
revoke all on function private.can_read_account(uuid) from public, anon;
revoke all on function private.can_read_payment_report(uuid) from public, anon;
revoke all on function private.can_read_bank_account(uuid) from public, anon;

grant execute on function private.can_read_application(uuid) to authenticated;
grant execute on function private.can_read_customer(uuid) to authenticated;
grant execute on function private.can_read_inventory(uuid) to authenticated;
grant execute on function private.can_read_transfer(uuid) to authenticated;
grant execute on function private.can_read_account(uuid) to authenticated;
grant execute on function private.can_read_payment_report(uuid) to authenticated;
grant execute on function private.can_read_bank_account(uuid) to authenticated;

-- Mutations of core aggregates are RPC-only. Security-definer functions keep
-- working as their owner; PostgREST clients no longer bypass transaction logs.
revoke insert, update, delete, truncate on
  public.business_units,
  public.branches,
  public.profiles,
  public.roles,
  public.role_permissions,
  public.profile_roles,
  public.user_branch_access,
  public.customers,
  public.customer_addresses,
  public.customer_employment,
  public.customer_references,
  public.customer_consents,
  public.customer_timeline_events,
  public.customer_assignments,
  public.product_brands,
  public.product_models,
  public.inventory_units,
  public.inventory_unit_movements,
  public.inventory_transfers,
  public.inventory_transfer_items,
  public.inventory_transfer_events,
  public.inventory_transfer_discrepancies,
  public.credit_applications,
  public.credit_application_items,
  public.credit_application_status_history,
  public.credit_application_notes,
  public.credit_application_assignments,
  public.credit_decisions,
  public.credit_application_profiles,
  public.credit_risk_assessments,
  public.bank_accounts,
  public.transfer_reports,
  public.transfer_report_files,
  public.transfer_validation_events,
  public.credit_accounts,
  public.credit_installments,
  public.customer_portal_access,
  public.payment_applications,
  public.collection_actions,
  public.credit_contracts,
  public.cash_transactions,
  public.team_invitations,
  public.device_enrollments,
  public.device_commands,
  public.credit_policies
from anon, authenticated;

revoke update, delete, truncate on public.customer_documents from anon, authenticated;
grant insert on public.customer_documents to authenticated;

drop policy if exists profile_admin_write on public.profiles;
drop policy if exists branch_write on public.branches;
drop policy if exists unit_write on public.business_units;
drop policy if exists customer_write on public.customers;
drop policy if exists customers_create on public.customers;
drop policy if exists customers_scoped_update on public.customers;
drop policy if exists customer_assignments_manage on public.customer_assignments;
drop policy if exists customer_related_write_addresses on public.customer_addresses;
drop policy if exists customer_related_write_employment on public.customer_employment;
drop policy if exists customer_related_write_references on public.customer_references;
drop policy if exists customer_related_write_documents on public.customer_documents;
drop policy if exists customer_addresses_write on public.customer_addresses;
drop policy if exists customer_employment_write on public.customer_employment;
drop policy if exists customer_references_write on public.customer_references;
drop policy if exists customer_documents_write on public.customer_documents;
drop policy if exists inventory_write on public.inventory_units;
drop policy if exists application_write on public.credit_applications;
drop policy if exists applications_analyst_update on public.credit_applications;
drop policy if exists transfer_create on public.inventory_transfers;
drop policy if exists transfer_item_create on public.inventory_transfer_items;
drop policy if exists transfer_report_create on public.transfer_reports;

-- Organization and branch catalogs are no longer tenant-wide for every role.
drop policy if exists tenant_read_business_units on public.business_units;
drop policy if exists tenant_read_branches on public.branches;

create policy business_units_scoped_read
on public.business_units
for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or private.has_role('auditor')
    or exists (
      select 1
      from public.branches as branch
      where branch.business_unit_id = business_units.id
        and branch.organization_id = business_units.organization_id
        and private.has_branch_access(branch.id)
    )
  )
);

create policy branches_scoped_read
on public.branches
for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or private.has_role('auditor')
    or private.has_branch_access(id)
  )
);

drop policy if exists customers_scoped_read on public.customers;
create policy customers_scoped_read
on public.customers
for select to authenticated
using (private.can_read_customer(id));

drop policy if exists customer_addresses_scoped on public.customer_addresses;
drop policy if exists customer_employment_scoped on public.customer_employment;
drop policy if exists customer_references_scoped on public.customer_references;
drop policy if exists customer_documents_scoped on public.customer_documents;
drop policy if exists customer_consents_scoped on public.customer_consents;
drop policy if exists customer_timeline_scoped on public.customer_timeline_events;
drop policy if exists customer_assignments_read on public.customer_assignments;

create policy customer_addresses_scoped_read
on public.customer_addresses for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_employment_scoped_read
on public.customer_employment for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_references_scoped_read
on public.customer_references for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_documents_scoped_read
on public.customer_documents for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_documents_metadata_insert
on public.customer_documents for insert to authenticated
with check (
  organization_id = private.current_organization_id()
  and private.has_permission('customers.write')
  and private.can_read_customer(customer_id)
  and storage_path like organization_id::text || '/' || customer_id::text || '/%'
);

create policy customer_consents_scoped_read
on public.customer_consents for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_timeline_scoped_read
on public.customer_timeline_events for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_customer(customer_id));

create policy customer_assignments_scoped_read
on public.customer_assignments for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (salesperson_id = (select auth.uid()) or private.can_read_customer(customer_id))
);

drop policy if exists inventory_scoped_read on public.inventory_units;
drop policy if exists tenant_read_inventory_unit_movements on public.inventory_unit_movements;

create policy inventory_scoped_read
on public.inventory_units for select to authenticated
using (private.can_read_inventory(id));

create policy inventory_movements_scoped_read
on public.inventory_unit_movements for select to authenticated
using (
  organization_id = private.current_organization_id()
  and private.can_read_inventory(inventory_unit_id)
);

drop policy if exists transfers_scoped_read on public.inventory_transfers;
drop policy if exists tenant_read_inventory_transfer_items on public.inventory_transfer_items;
drop policy if exists tenant_read_inventory_transfer_events on public.inventory_transfer_events;
drop policy if exists tenant_read_inventory_transfer_discrepancies on public.inventory_transfer_discrepancies;

create policy transfers_scoped_read
on public.inventory_transfers for select to authenticated
using (private.can_read_transfer(id));

create policy transfer_items_scoped_read
on public.inventory_transfer_items for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_transfer(transfer_id));

create policy transfer_events_scoped_read
on public.inventory_transfer_events for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_transfer(transfer_id));

create policy transfer_discrepancies_scoped_read
on public.inventory_transfer_discrepancies for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_transfer(transfer_id));

drop policy if exists applications_scoped_read on public.credit_applications;
drop policy if exists tenant_read_credit_application_items on public.credit_application_items;
drop policy if exists tenant_read_credit_application_status_history on public.credit_application_status_history;
drop policy if exists tenant_read_credit_application_notes on public.credit_application_notes;
drop policy if exists tenant_read_credit_application_assignments on public.credit_application_assignments;
drop policy if exists tenant_read_credit_decisions on public.credit_decisions;
drop policy if exists application_profiles_read on public.credit_application_profiles;
drop policy if exists assessment_scoped_read on public.credit_risk_assessments;

create policy applications_scoped_read
on public.credit_applications for select to authenticated
using (private.can_read_application(id));

create policy application_items_scoped_read
on public.credit_application_items for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy application_history_scoped_read
on public.credit_application_status_history for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy application_notes_scoped_read
on public.credit_application_notes for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy application_assignments_scoped_read
on public.credit_application_assignments for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy credit_decisions_scoped_read
on public.credit_decisions for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy credit_profiles_scoped_read
on public.credit_application_profiles for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy credit_assessments_scoped_read
on public.credit_risk_assessments for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

drop policy if exists tenant_read_bank_accounts on public.bank_accounts;
drop policy if exists tenant_read_transfer_reports on public.transfer_reports;
drop policy if exists tenant_read_transfer_report_files on public.transfer_report_files;
drop policy if exists tenant_read_transfer_validation_events on public.transfer_validation_events;

create policy bank_accounts_scoped_read
on public.bank_accounts for select to authenticated
using (private.can_read_bank_account(id));

create policy transfer_reports_scoped_read
on public.transfer_reports for select to authenticated
using (private.can_read_payment_report(id));

create policy transfer_report_files_scoped_read
on public.transfer_report_files for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_payment_report(transfer_report_id));

create policy transfer_validation_scoped_read
on public.transfer_validation_events for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_payment_report(transfer_report_id));

drop policy if exists accounts_staff_read on public.credit_accounts;
drop policy if exists installments_staff_read on public.credit_installments;
drop policy if exists payment_applications_staff on public.payment_applications;
drop policy if exists collection_actions_read on public.collection_actions;
drop policy if exists contracts_scoped_read on public.credit_contracts;
drop policy if exists cash_scoped_read on public.cash_transactions;

create policy credit_accounts_scoped_read
on public.credit_accounts for select to authenticated
using (private.can_read_account(id));

create policy credit_installments_scoped_read
on public.credit_installments for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_account(account_id));

create policy payment_applications_scoped_read
on public.payment_applications for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_account(account_id));

create policy collection_actions_scoped_read
on public.collection_actions for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_account(account_id));

create policy credit_contracts_scoped_read
on public.credit_contracts for select to authenticated
using (organization_id = private.current_organization_id() and private.can_read_application(application_id));

create policy cash_transactions_scoped_read
on public.cash_transactions for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or private.has_role('auditor')
    or (
      (private.has_role('cashier') or private.has_role('branch_manager'))
      and private.has_branch_access(branch_id)
    )
  )
);

drop policy if exists enrollment_staff_read on public.device_enrollments;
drop policy if exists commands_staff_read on public.device_commands;

create policy device_enrollments_scoped_read
on public.device_enrollments for select to authenticated
using (
  organization_id = private.current_organization_id()
  and (
    private.has_role('organization_owner')
    or private.has_role('organization_admin')
    or private.has_role('auditor')
    or private.can_read_inventory(inventory_unit_id)
    or (account_id is not null and private.can_read_account(account_id))
  )
);

create policy device_commands_scoped_read
on public.device_commands for select to authenticated
using (
  organization_id = private.current_organization_id()
  and exists (
    select 1
    from public.device_enrollments as enrollment
    where enrollment.id = device_commands.enrollment_id
      and (
        private.can_read_inventory(enrollment.inventory_unit_id)
        or (enrollment.account_id is not null and private.can_read_account(enrollment.account_id))
      )
  )
);

-- Storage access follows the protected database row instead of only checking
-- the first folder. Portal uploads keep their token policy, while staff reads
-- require access to the associated customer or payment report.
drop policy if exists customer_document_objects_read on storage.objects;
drop policy if exists customer_document_objects_insert on storage.objects;
drop policy if exists receipt_objects_read on storage.objects;
drop policy if exists receipt_objects_insert on storage.objects;

create policy customer_document_objects_scoped_read
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-documents'
  and exists (
    select 1
    from public.customer_documents as document
    where document.storage_path = storage.objects.name
      and document.organization_id = private.current_organization_id()
      and private.can_read_customer(document.customer_id)
  )
);

create policy customer_document_objects_scoped_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-documents'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('customers.write')
  and exists (
    select 1
    from public.customers as customer
    where customer.organization_id = private.current_organization_id()
      and customer.id::text = (storage.foldername(name))[2]
      and private.can_read_customer(customer.id)
  )
);

create policy receipt_objects_scoped_read
on storage.objects for select to authenticated
using (
  bucket_id = 'transfer-receipts'
  and exists (
    select 1
    from public.transfer_report_files as report_file
    where report_file.storage_path = storage.objects.name
      and report_file.organization_id = private.current_organization_id()
      and private.can_read_payment_report(report_file.transfer_report_id)
  )
);

create policy receipt_objects_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'transfer-receipts'
  and (storage.foldername(name))[1] = private.current_organization_id()::text
  and private.has_permission('payments.validate')
);

-- A well-known portal token must never survive a production upgrade. Rotate it
-- instead of removing the customer's access so an authorized employee can issue
-- a fresh link without rebuilding the relationship.
update public.customer_portal_access
set access_token = gen_random_uuid()
where access_token = '11111111-1111-1111-1111-111111111111'::uuid;

create or replace function public.attach_customer_receipt(
  p_token uuid,
  p_report_id uuid,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access public.customer_portal_access%rowtype;
  v_report public.transfer_reports%rowtype;
begin
  select *
  into v_access
  from public.customer_portal_access
  where access_token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'Acceso inválido o vencido' using errcode = '42501';
  end if;

  select *
  into v_report
  from public.transfer_reports
  where id = p_report_id
    and organization_id = v_access.organization_id
    and customer_id = v_access.customer_id;

  if not found
    or p_storage_path not like p_token::text || '/' || p_report_id::text || '/%'
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'transfer-receipts'
        and name = p_storage_path
    ) then
    raise exception 'Comprobante inválido';
  end if;

  insert into public.transfer_report_files (
    organization_id,
    transfer_report_id,
    storage_path
  )
  values (
    v_report.organization_id,
    v_report.id,
    p_storage_path
  );
end;
$$;

revoke all on function public.attach_customer_receipt(uuid, uuid, text) from public;
grant execute on function public.attach_customer_receipt(uuid, uuid, text) to anon, authenticated;

-- A discrepancy is recoverable: the destination can rescan the same transfer.
-- The successful receipt resolves previous discrepancies and records both the
-- physical location and economic owner before and after the movement.
create or replace function public.receive_inventory_transfer(
  p_transfer_id uuid,
  p_scanned_imeis text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.inventory_transfers%rowtype;
  v_expected integer;
  v_ready integer;
  v_scanned integer;
  v_normalized_imeis text[];
  v_was_retry boolean;
  v_previous_movement_setting text;
begin
  select *
  into v_transfer
  from public.inventory_transfers
  where id = p_transfer_id
  for update;

  if not found
    or v_transfer.organization_id <> private.current_organization_id() then
    raise exception 'Traslado no encontrado';
  end if;

  if not private.has_branch_access(v_transfer.destination_branch_id)
    or not private.has_permission('transfers.receive') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_transfer.status not in ('in_transit', 'received_with_discrepancy') then
    raise exception 'Estado de traslado inválido: %', v_transfer.status;
  end if;

  v_was_retry := v_transfer.status = 'received_with_discrepancy';

  perform 1
  from public.inventory_units as inventory
  join public.inventory_transfer_items as transfer_item
    on transfer_item.inventory_unit_id = inventory.id
   and transfer_item.organization_id = inventory.organization_id
  where transfer_item.transfer_id = p_transfer_id
    and transfer_item.organization_id = v_transfer.organization_id
  order by inventory.id
  for update of inventory;

  select count(*)
  into v_expected
  from public.inventory_transfer_items
  where transfer_id = p_transfer_id
    and organization_id = v_transfer.organization_id;

  select count(*)
  into v_ready
  from public.inventory_transfer_items as transfer_item
  join public.inventory_units as inventory
    on inventory.id = transfer_item.inventory_unit_id
   and inventory.organization_id = transfer_item.organization_id
  where transfer_item.transfer_id = p_transfer_id
    and transfer_item.organization_id = v_transfer.organization_id
    and inventory.current_branch_id = v_transfer.origin_branch_id
    and inventory.status = 'in_transit';

  if v_expected = 0 or v_ready <> v_expected then
    raise exception 'El inventario del traslado no conserva un estado transaccional válido';
  end if;

  select coalesce(array_agg(normalized_imei order by normalized_imei), array[]::text[])
  into v_normalized_imeis
  from (
    select distinct regexp_replace(raw_imei, '[^0-9]', '', 'g') as normalized_imei
    from unnest(coalesce(p_scanned_imeis, array[]::text[])) as scanned(raw_imei)
  ) as normalized
  where normalized_imei <> '';

  select count(distinct inventory.id)
  into v_scanned
  from public.inventory_transfer_items as transfer_item
  join public.inventory_units as inventory
    on inventory.id = transfer_item.inventory_unit_id
   and inventory.organization_id = transfer_item.organization_id
  where transfer_item.transfer_id = p_transfer_id
    and transfer_item.organization_id = v_transfer.organization_id
    and (
      inventory.imei_1 = any(v_normalized_imeis)
      or inventory.imei_2 = any(v_normalized_imeis)
    );

  if cardinality(v_normalized_imeis) <> v_expected or v_scanned <> v_expected then
    insert into public.inventory_transfer_discrepancies (
      organization_id,
      transfer_id,
      scanned_imei,
      description
    )
    values (
      v_transfer.organization_id,
      p_transfer_id,
      array_to_string(v_normalized_imeis, ','),
      'IMEI scan mismatch'
    );

    update public.inventory_transfers
    set status = 'received_with_discrepancy', updated_at = now()
    where id = p_transfer_id;

    insert into public.inventory_transfer_events (
      organization_id,
      transfer_id,
      event_type,
      actor_id,
      metadata
    )
    values (
      v_transfer.organization_id,
      p_transfer_id,
      'receipt_discrepancy',
      auth.uid(),
      jsonb_build_object('scanned_imeis', v_normalized_imeis)
    );

    return;
  end if;

  if v_transfer.transfer_ownership then
    if not private.has_permission('transfers.change_owner')
      or v_transfer.destination_owner_business_unit_id is null
      or not exists (
        select 1
        from public.business_units
        where id = v_transfer.destination_owner_business_unit_id
          and organization_id = v_transfer.organization_id
          and status = 'active'
      ) then
      raise exception 'La recepción con cambio de propietario requiere permiso y una unidad válida'
        using errcode = '42501';
    end if;
  end if;

  insert into public.inventory_unit_movements (
    organization_id,
    inventory_unit_id,
    from_branch_id,
    to_branch_id,
    from_owner_business_unit_id,
    to_owner_business_unit_id,
    movement_type,
    reference_type,
    reference_id,
    actor_id
  )
  select
    inventory.organization_id,
    inventory.id,
    inventory.current_branch_id,
    v_transfer.destination_branch_id,
    inventory.owner_business_unit_id,
    case
      when v_transfer.transfer_ownership then v_transfer.destination_owner_business_unit_id
      else inventory.owner_business_unit_id
    end,
    'receipt',
    'inventory_transfer',
    p_transfer_id,
    auth.uid()
  from public.inventory_units as inventory
  join public.inventory_transfer_items as transfer_item
    on transfer_item.inventory_unit_id = inventory.id
   and transfer_item.organization_id = inventory.organization_id
  where transfer_item.transfer_id = p_transfer_id
    and transfer_item.organization_id = v_transfer.organization_id;

  v_previous_movement_setting := current_setting('app.inventory_movement', true);
  perform set_config('app.inventory_movement', 'allowed', true);

  update public.inventory_units as inventory
  set
    current_branch_id = v_transfer.destination_branch_id,
    owner_business_unit_id = case
      when v_transfer.transfer_ownership then v_transfer.destination_owner_business_unit_id
      else inventory.owner_business_unit_id
    end,
    status = 'available',
    updated_at = now()
  from public.inventory_transfer_items as transfer_item
  where transfer_item.transfer_id = p_transfer_id
    and transfer_item.organization_id = v_transfer.organization_id
    and transfer_item.inventory_unit_id = inventory.id
    and inventory.organization_id = v_transfer.organization_id
    and inventory.status = 'in_transit';

  if not found then
    raise exception 'No se actualizó el inventario esperado';
  end if;

  perform set_config(
    'app.inventory_movement',
    coalesce(v_previous_movement_setting, ''),
    true
  );

  update public.inventory_transfer_items
  set destination_scanned_at = now()
  where transfer_id = p_transfer_id
    and organization_id = v_transfer.organization_id;

  update public.inventory_transfer_discrepancies
  set resolved_at = coalesce(resolved_at, now())
  where transfer_id = p_transfer_id
    and organization_id = v_transfer.organization_id
    and resolved_at is null;

  update public.inventory_transfers
  set
    status = 'received',
    received_by = auth.uid(),
    updated_at = now()
  where id = p_transfer_id;

  insert into public.inventory_transfer_events (
    organization_id,
    transfer_id,
    event_type,
    actor_id,
    metadata
  )
  values (
    v_transfer.organization_id,
    p_transfer_id,
    'received',
    auth.uid(),
    jsonb_build_object('resolved_discrepancy', v_was_retry)
  );
end;
$$;

revoke all on function public.receive_inventory_transfer(uuid, text[]) from public, anon;
grant execute on function public.receive_inventory_transfer(uuid, text[]) to authenticated;

-- A suspected duplicate always requires an explicit human decision. Approval records
-- the confirmation transition before applying the payment in the same transaction.
create or replace function public.validate_customer_payment(
  p_report_id uuid,
  p_approve boolean,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.transfer_reports%rowtype;
  v_account public.credit_accounts%rowtype;
  v_installment public.credit_installments%rowtype;
  v_remaining numeric(14, 2);
  v_applied numeric(14, 2);
  v_has_overdue boolean;
  v_notes text;
begin
  select *
  into v_report
  from public.transfer_reports
  where id = p_report_id
    and organization_id = private.current_organization_id()
  for update;

  if not found
    or not private.has_permission('payments.validate')
    or not private.can_read_payment_report(v_report.id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_report.status not in ('reported', 'under_review', 'duplicate_suspected') then
    raise exception 'El reporte ya fue procesado';
  end if;

  if p_approve is null then
    raise exception 'La decisión de validación es obligatoria';
  end if;

  v_notes := nullif(trim(p_notes), '');

  if v_report.status = 'duplicate_suspected' and v_notes is null then
    raise exception 'La revisión de un posible duplicado requiere observaciones';
  end if;

  if not p_approve then
    update public.transfer_reports
    set status = 'rejected'
    where id = v_report.id
      and organization_id = v_report.organization_id;

    insert into public.transfer_validation_events (
      organization_id,
      transfer_report_id,
      from_status,
      to_status,
      actor_id,
      notes
    )
    values (
      v_report.organization_id,
      v_report.id,
      v_report.status,
      'rejected',
      auth.uid(),
      coalesce(v_notes, 'Pago rechazado durante la revisión')
    );

    return;
  end if;

  select account.*
  into v_account
  from public.credit_accounts as account
  where account.application_id = v_report.credit_application_id
    and account.customer_id = v_report.customer_id
    and account.organization_id = v_report.organization_id
    and account.status in ('active', 'delinquent')
  for update;

  if not found then
    raise exception 'No existe una cuenta de crédito activa para el reporte';
  end if;

  if v_report.amount > v_account.outstanding_balance then
    raise exception 'El pago reportado excede el saldo pendiente';
  end if;

  update public.transfer_reports
  set status = 'confirmed'
  where id = v_report.id
    and organization_id = v_report.organization_id;

  insert into public.transfer_validation_events (
    organization_id,
    transfer_report_id,
    from_status,
    to_status,
    actor_id,
    notes
  )
  values (
    v_report.organization_id,
    v_report.id,
    v_report.status,
    'confirmed',
    auth.uid(),
    coalesce(v_notes, 'Pago confirmado durante la revisión')
  );

  insert into public.payment_applications (
    organization_id,
    transfer_report_id,
    account_id,
    amount,
    applied_by
  )
  values (
    v_report.organization_id,
    v_report.id,
    v_account.id,
    v_report.amount,
    auth.uid()
  );

  v_remaining := v_report.amount;

  for v_installment in
    select installment.*
    from public.credit_installments as installment
    where installment.account_id = v_account.id
      and installment.organization_id = v_account.organization_id
      and installment.status in ('pending', 'partial', 'overdue')
    order by installment.installment_number
    for update
  loop
    exit when v_remaining <= 0;

    v_applied := least(
      v_remaining,
      v_installment.amount - v_installment.paid_amount
    );

    update public.credit_installments
    set
      paid_amount = v_installment.paid_amount + v_applied,
      status = case
        when v_installment.paid_amount + v_applied >= v_installment.amount then 'paid'
        when v_installment.due_date < current_date then 'overdue'
        else 'partial'
      end
    where id = v_installment.id
      and organization_id = v_account.organization_id;

    v_remaining := v_remaining - v_applied;
  end loop;

  if v_remaining <> 0 then
    raise exception 'El calendario de cuotas no permite aplicar el pago completo';
  end if;

  select exists (
    select 1
    from public.credit_installments
    where account_id = v_account.id
      and organization_id = v_account.organization_id
      and due_date < current_date
      and status <> 'paid'
  )
  into v_has_overdue;

  update public.credit_accounts
  set
    outstanding_balance = outstanding_balance - v_report.amount,
    status = case
      when outstanding_balance - v_report.amount = 0 then 'paid'
      when v_has_overdue then 'delinquent'
      else 'active'
    end
  where id = v_account.id
    and organization_id = v_account.organization_id;

  update public.transfer_reports
  set status = 'applied'
  where id = v_report.id
    and organization_id = v_report.organization_id;

  insert into public.transfer_validation_events (
    organization_id,
    transfer_report_id,
    from_status,
    to_status,
    actor_id,
    notes
  )
  values (
    v_report.organization_id,
    v_report.id,
    'confirmed',
    'applied',
    auth.uid(),
    coalesce(v_notes, 'Pago confirmado y aplicado')
  );
end;
$$;

revoke all on function public.validate_customer_payment(uuid, boolean, text) from public, anon;
grant execute on function public.validate_customer_payment(uuid, boolean, text) to authenticated;

revoke all on function private.guard_cross_column_imei() from public, anon, authenticated;
revoke all on function private.guard_profile_role_membership() from public, anon, authenticated;
revoke all on function private.guard_profile_branch_membership() from public, anon, authenticated;
revoke all on function private.ensure_organization_roles(uuid) from public, anon, authenticated;
revoke all on function private.bootstrap_organization_roles() from public, anon, authenticated;
