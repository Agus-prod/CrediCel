create function private.has_role(role_name text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profile_roles pr join public.roles r on r.id=pr.role_id where pr.profile_id=auth.uid() and r.name=role_name and r.organization_id=private.current_organization_id()) $$;
grant execute on function private.has_role(text) to authenticated;

create table public.customer_assignments(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations,customer_id uuid not null references customers on delete cascade,salesperson_id uuid not null references profiles,branch_id uuid not null references branches,assigned_at timestamptz not null default now(),ended_at timestamptz,unique(customer_id,salesperson_id,branch_id));
alter table public.customer_assignments enable row level security;alter table public.customer_assignments force row level security;

drop policy if exists tenant_read_customers on customers;
drop policy if exists tenant_read_inventory_units on inventory_units;
drop policy if exists tenant_read_credit_applications on credit_applications;
drop policy if exists tenant_read_inventory_transfers on inventory_transfers;

create policy customers_scoped_read on customers for select to authenticated using(organization_id=private.current_organization_id() and (private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_role('credit_manager') or exists(select 1 from customer_assignments ca where ca.customer_id=customers.id and ca.ended_at is null and (ca.salesperson_id=auth.uid() or private.has_branch_access(ca.branch_id)))));
create policy customer_assignments_read on customer_assignments for select to authenticated using(organization_id=private.current_organization_id() and (salesperson_id=auth.uid() or private.has_branch_access(branch_id)));
create policy customer_assignments_manage on customer_assignments for all to authenticated using(organization_id=private.current_organization_id() and (private.has_role('branch_manager') or private.has_role('organization_owner') or private.has_role('organization_admin'))) with check(organization_id=private.current_organization_id() and private.has_branch_access(branch_id));

create policy inventory_scoped_read on inventory_units for select to authenticated using(organization_id=private.current_organization_id() and private.has_branch_access(current_branch_id) and (private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_role('branch_manager') or private.has_role('inventory_manager') or (private.has_role('salesperson') and status='available')));

create policy applications_scoped_read on credit_applications for select to authenticated using(organization_id=private.current_organization_id() and (private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_role('credit_manager') or (private.has_role('credit_analyst') and private.has_branch_access(branch_id)) or created_by=auth.uid() or (private.has_role('branch_manager') and private.has_branch_access(branch_id))));
create policy applications_analyst_update on credit_applications for update to authenticated using(organization_id=private.current_organization_id() and (private.has_role('credit_manager') or (private.has_role('credit_analyst') and private.has_branch_access(branch_id)))) with check(organization_id=private.current_organization_id());

create policy transfers_scoped_read on inventory_transfers for select to authenticated using(organization_id=private.current_organization_id() and (private.has_role('organization_owner') or private.has_role('organization_admin') or private.has_branch_access(origin_branch_id) or private.has_branch_access(destination_branch_id)));
create function private.validate_same_organization_transfer() returns trigger language plpgsql set search_path='' as $$ declare origin_org uuid;destination_org uuid;begin select organization_id into origin_org from public.branches where id=new.origin_branch_id;select organization_id into destination_org from public.branches where id=new.destination_branch_id;if origin_org is distinct from destination_org or origin_org is distinct from new.organization_id then raise exception 'El traslado solo puede realizarse entre tiendas de la misma organización';end if;return new;end $$;
create trigger inventory_transfers_same_org before insert or update on inventory_transfers for each row execute function private.validate_same_organization_transfer();

insert into customer_assignments(organization_id,customer_id,salesperson_id,branch_id) select organization_id,id,created_by,'30000000-0000-0000-0000-000000000001' from customers where created_by is not null on conflict do nothing;
