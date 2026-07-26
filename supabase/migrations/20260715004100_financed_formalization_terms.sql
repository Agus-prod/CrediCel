create or replace function public.formalize_credit(
  p_application_id uuid,
  p_signature_name text,
  p_payment_method text,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.credit_applications%rowtype;
  v_customer public.customers%rowtype;
  v_account uuid;
  v_contract uuid;
  v_number text;
  v_principal numeric(14, 2);
  v_admin_fee_percentage numeric := 3;
  v_admin_fee numeric(14, 2);
  v_financed_subtotal numeric(14, 2);
  v_monthly_rate_percentage numeric := 3.5;
  v_monthly_rate numeric;
  v_factor numeric;
  v_installment numeric(14, 2);
  v_last_installment numeric(14, 2);
  v_total_financed numeric(14, 2);
  v_interest_amount numeric(14, 2);
  v_interest_config jsonb;
begin
  select *
  into v_app
  from public.credit_applications
  where id = p_application_id
    and organization_id = private.current_organization_id()
  for update;

  if not found
    or not (
      private.has_role('cashier')
      or private.has_role('branch_manager')
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
    )
    or not (
      private.has_branch_access(v_app.branch_id)
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
    ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_app.status <> 'approved' then
    raise exception 'Solo se formalizan solicitudes aprobadas';
  end if;

  if nullif(trim(p_signature_name), '') is null
    or p_payment_method not in ('cash', 'card', 'transfer', 'other') then
    raise exception 'Firma o forma de pago inválida';
  end if;

  begin
    v_interest_config := public.resolve_configuration('credit.interest_rate');
    v_monthly_rate_percentage :=
      coalesce((v_interest_config ->> 'value')::numeric, v_monthly_rate_percentage);
  exception
    when others then
      v_monthly_rate_percentage := 3.5;
  end;

  select *
  into v_customer
  from public.customers
  where id = v_app.customer_id
    and organization_id = v_app.organization_id;

  v_principal := round(v_app.requested_price - v_app.proposed_down_payment, 2);
  v_admin_fee := round(v_principal * (v_admin_fee_percentage / 100), 2);
  v_financed_subtotal := round(v_principal + v_admin_fee, 2);
  v_monthly_rate := v_monthly_rate_percentage / 100;

  if v_monthly_rate <= 0 then
    v_installment := round(v_financed_subtotal / v_app.proposed_term, 2);
  else
    v_factor := power(1 + v_monthly_rate, v_app.proposed_term);
    v_installment := round((v_financed_subtotal * v_monthly_rate * v_factor) / (v_factor - 1), 2);
  end if;

  v_total_financed := round(v_installment * v_app.proposed_term, 2);
  v_interest_amount := round(v_total_financed - v_financed_subtotal, 2);
  v_last_installment := round(v_total_financed - (v_installment * (v_app.proposed_term - 1)), 2);
  v_number := 'CC-' || to_char(current_date, 'YYYYMM') || '-' || upper(substr(replace(v_app.id::text, '-', ''), 1, 8));

  insert into public.credit_contracts (
    organization_id,
    application_id,
    contract_number,
    accepted_by_customer,
    accepted_at,
    signature_name,
    terms_snapshot,
    created_by
  )
  values (
    v_app.organization_id,
    v_app.id,
    v_number,
    true,
    now(),
    trim(p_signature_name),
    jsonb_build_object(
      'customer', v_customer.first_name || ' ' || v_customer.last_name,
      'dni', v_customer.normalized_dni,
      'price', v_app.requested_price,
      'down_payment', v_app.proposed_down_payment,
      'principal', v_principal,
      'administrative_fee_percentage', v_admin_fee_percentage,
      'administrative_fee', v_admin_fee,
      'financed_subtotal', v_financed_subtotal,
      'monthly_interest_rate', v_monthly_rate_percentage,
      'annual_effective_rate', round((power(1 + v_monthly_rate, 12) - 1) * 100, 2),
      'term', v_app.proposed_term,
      'installment', v_installment,
      'last_installment', v_last_installment,
      'interest_amount', v_interest_amount,
      'total_financed_to_pay', v_total_financed,
      'total_customer_pays', round(v_app.proposed_down_payment + v_total_financed, 2)
    ),
    auth.uid()
  )
  returning id into v_contract;

  insert into public.credit_accounts (
    organization_id,
    application_id,
    customer_id,
    principal,
    down_payment,
    term,
    installment_amount,
    outstanding_balance,
    status
  )
  values (
    v_app.organization_id,
    v_app.id,
    v_app.customer_id,
    v_financed_subtotal,
    v_app.proposed_down_payment,
    v_app.proposed_term,
    v_installment,
    v_total_financed,
    'active'
  )
  returning id into v_account;

  insert into public.credit_installments (
    organization_id,
    account_id,
    installment_number,
    due_date,
    amount,
    status
  )
  select
    v_app.organization_id,
    v_account,
    n,
    (current_date + (n || ' month')::interval)::date,
    case when n = v_app.proposed_term then v_last_installment else v_installment end,
    'pending'
  from generate_series(1, v_app.proposed_term) as n;

  insert into public.cash_transactions (
    organization_id,
    branch_id,
    application_id,
    account_id,
    transaction_type,
    amount,
    payment_method,
    reference,
    received_by
  )
  values (
    v_app.organization_id,
    v_app.branch_id,
    v_app.id,
    v_account,
    'down_payment',
    v_app.proposed_down_payment,
    p_payment_method,
    nullif(trim(p_reference), ''),
    auth.uid()
  );

  update public.credit_applications
  set status = 'activated', updated_at = now()
  where id = v_app.id
    and organization_id = v_app.organization_id;

  update public.inventory_units
  set status = 'sold', updated_at = now()
  where id = v_app.inventory_unit_id
    and organization_id = v_app.organization_id
    and status = 'reserved';

  insert into public.credit_application_status_history (
    organization_id,
    application_id,
    status,
    actor_id,
    reason
  )
  values (
    v_app.organization_id,
    v_app.id,
    'activated',
    auth.uid(),
    'Contrato aceptado, prima recibida y dispositivo entregado'
  );

  insert into public.customer_portal_access (organization_id, customer_id)
  values (v_app.organization_id, v_app.customer_id)
  on conflict do nothing;

  return jsonb_build_object(
    'contract_id', v_contract,
    'account_id', v_account,
    'contract_number', v_number,
    'installment', v_installment,
    'total_financed_to_pay', v_total_financed
  );
end;
$$;

revoke all on function public.formalize_credit(uuid, text, text, text) from public, anon;
grant execute on function public.formalize_credit(uuid, text, text, text) to authenticated;
