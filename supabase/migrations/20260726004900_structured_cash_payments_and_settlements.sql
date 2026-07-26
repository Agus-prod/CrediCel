create table public.debt_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  account_id uuid not null references public.credit_accounts(id),
  transaction_id uuid not null unique references public.cash_transactions(id),
  settlement_number text not null,
  previous_balance numeric(14,2) not null check (previous_balance > 0),
  paid_amount numeric(14,2) not null check (paid_amount > 0),
  final_balance numeric(14,2) not null default 0 check (final_balance = 0),
  snapshot jsonb not null default '{}'::jsonb,
  issued_by uuid not null references public.profiles(id),
  issued_at timestamptz not null default now(),
  unique (organization_id, settlement_number),
  unique (account_id)
);

alter table public.debt_settlements enable row level security;
alter table public.debt_settlements force row level security;

create policy debt_settlements_scoped_read
on public.debt_settlements for select to authenticated
using (
  organization_id = private.current_organization_id()
  and private.can_read_account(account_id)
);

grant select on public.debt_settlements to authenticated;

create or replace function public.record_structured_cash_payment(
  p_account_id uuid,
  p_payment_mode text,
  p_installment_count integer,
  p_payment_method text,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.credit_accounts%rowtype;
  v_application public.credit_applications%rowtype;
  v_customer public.customers%rowtype;
  v_installment public.credit_installments%rowtype;
  v_amount numeric(14,2) := 0;
  v_remaining numeric(14,2);
  v_transaction_id uuid;
  v_settlement_id uuid;
  v_settlement_number text;
  v_paid_installments integer := 0;
  v_has_overdue boolean;
begin
  if p_payment_mode not in ('single', 'multiple', 'payoff')
    or p_payment_method not in ('cash', 'card', 'transfer', 'other') then
    raise exception 'Tipo o forma de pago inválida';
  end if;
  if p_payment_mode = 'multiple'
    and (p_installment_count is null or p_installment_count < 2) then
    raise exception 'Selecciona al menos dos cuotas';
  end if;

  select * into v_account from public.credit_accounts
  where id = p_account_id
    and organization_id = private.current_organization_id()
    and status in ('active', 'delinquent')
  for update;

  select * into v_application from public.credit_applications
  where id = v_account.application_id;

  if not found
    or not (
      private.has_role('cashier')
      or private.has_role('branch_manager')
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
    )
    or not (
      private.has_branch_access(v_application.branch_id)
      or private.has_role('organization_owner')
      or private.has_role('organization_admin')
    ) then
    raise exception 'Pago no autorizado o crédito no disponible';
  end if;

  if p_payment_mode = 'payoff' then
    v_amount := v_account.outstanding_balance;
  else
    select coalesce(sum(pending.remaining), 0), count(*)
    into v_amount, v_paid_installments
    from (
      select installment.amount - installment.paid_amount as remaining
      from public.credit_installments as installment
      where installment.account_id = v_account.id
        and installment.status in ('pending', 'partial', 'overdue')
      order by installment.installment_number
      limit case when p_payment_mode = 'single' then 1 else p_installment_count end
    ) as pending;
  end if;

  v_amount := least(v_amount, v_account.outstanding_balance);
  if v_amount <= 0 then raise exception 'El crédito no tiene saldo pendiente'; end if;

  insert into public.cash_transactions (
    organization_id, branch_id, application_id, account_id,
    transaction_type, amount, payment_method, reference, received_by
  ) values (
    v_account.organization_id, v_application.branch_id, v_application.id,
    v_account.id, 'installment', v_amount, p_payment_method,
    nullif(btrim(p_reference), ''), auth.uid()
  ) returning id into v_transaction_id;

  v_remaining := v_amount;
  for v_installment in
    select * from public.credit_installments
    where account_id = v_account.id
      and status in ('pending', 'partial', 'overdue')
    order by installment_number
    for update
  loop
    exit when v_remaining <= 0;
    update public.credit_installments
    set
      paid_amount = least(amount, paid_amount + v_remaining),
      status = case
        when paid_amount + v_remaining >= amount then 'paid'
        when due_date < current_date then 'overdue'
        else 'partial'
      end
    where id = v_installment.id;
    v_remaining := greatest(
      0,
      v_remaining - (v_installment.amount - v_installment.paid_amount)
    );
  end loop;

  select exists (
    select 1 from public.credit_installments
    where account_id = v_account.id
      and due_date < current_date
      and status <> 'paid'
  ) into v_has_overdue;

  update public.credit_accounts
  set
    outstanding_balance = greatest(0, outstanding_balance - v_amount),
    status = case
      when outstanding_balance - v_amount <= 0 then 'paid'
      when v_has_overdue then 'delinquent'
      else 'active'
    end
  where id = v_account.id;

  if v_account.outstanding_balance - v_amount <= 0 then
    select * into v_customer from public.customers where id = v_account.customer_id;
    v_settlement_number := 'FIN-' || to_char(current_date, 'YYYYMMDD') || '-'
      || upper(substr(replace(v_transaction_id::text, '-', ''), 1, 8));
    insert into public.debt_settlements (
      organization_id, account_id, transaction_id, settlement_number,
      previous_balance, paid_amount, snapshot, issued_by
    ) values (
      v_account.organization_id, v_account.id, v_transaction_id,
      v_settlement_number, v_account.outstanding_balance, v_amount,
      jsonb_build_object(
        'customer_name', v_customer.first_name || ' ' || v_customer.last_name,
        'customer_dni', v_customer.normalized_dni,
        'principal', v_account.principal,
        'down_payment', v_account.down_payment,
        'term', v_account.term,
        'settled_at', now()
      ),
      auth.uid()
    ) returning id into v_settlement_id;
  end if;

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'amount', v_amount,
    'payment_mode', p_payment_mode,
    'installment_count', case
      when p_payment_mode = 'single' then 1
      when p_payment_mode = 'multiple' then v_paid_installments
      else null
    end,
    'settled', v_settlement_id is not null,
    'settlement_id', v_settlement_id
  );
end;
$$;

revoke all on function public.record_structured_cash_payment(uuid,text,integer,text,text)
from public, anon;
grant execute on function public.record_structured_cash_payment(uuid,text,integer,text,text)
to authenticated;
