drop policy if exists customer_write on public.customers;
drop policy if exists customers_scoped_read on public.customers;
drop policy if exists customer_assignments_read on public.customer_assignments;
drop policy if exists customer_related_write_addresses on public.customer_addresses;
drop policy if exists customer_related_write_employment on public.customer_employment;
drop policy if exists customer_related_write_references on public.customer_references;
drop policy if exists customer_related_write_documents on public.customer_documents;
drop policy if exists tenant_read_customer_addresses on public.customer_addresses;
drop policy if exists tenant_read_customer_employment on public.customer_employment;
drop policy if exists tenant_read_customer_references on public.customer_references;
drop policy if exists tenant_read_customer_documents on public.customer_documents;
drop policy if exists tenant_read_customer_consents on public.customer_consents;
drop policy if exists tenant_read_customer_timeline_events on public.customer_timeline_events;

create policy customers_scoped_read on public.customers for select to authenticated using(organization_id=private.current_organization_id() and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('credit_manager')or exists(select 1 from public.customer_assignments ca where ca.customer_id=customers.id and ca.ended_at is null and(case when private.has_role('salesperson')then ca.salesperson_id=auth.uid() when private.has_role('branch_manager')or private.has_role('credit_analyst')then private.has_branch_access(ca.branch_id)else false end))));
create policy customers_create on public.customers for insert to authenticated with check(organization_id=private.current_organization_id()and private.has_permission('customers.write')and created_by=auth.uid());
create policy customers_scoped_update on public.customers for update to authenticated using(organization_id=private.current_organization_id()and(private.has_role('organization_owner')or private.has_role('organization_admin')or private.has_role('branch_manager')or exists(select 1 from public.customer_assignments ca where ca.customer_id=customers.id and ca.salesperson_id=auth.uid()and ca.ended_at is null)))with check(organization_id=private.current_organization_id());
create policy customer_assignments_read on public.customer_assignments for select to authenticated using(organization_id=private.current_organization_id()and(case when private.has_role('salesperson')then salesperson_id=auth.uid() when private.has_role('organization_owner')or private.has_role('organization_admin')then true else private.has_branch_access(branch_id)end));

create policy customer_addresses_scoped on public.customer_addresses for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_employment_scoped on public.customer_employment for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_references_scoped on public.customer_references for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_documents_scoped on public.customer_documents for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_consents_scoped on public.customer_consents for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_timeline_scoped on public.customer_timeline_events for select to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_addresses_write on public.customer_addresses for all to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id))with check(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_employment_write on public.customer_employment for all to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id))with check(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_references_write on public.customer_references for all to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id))with check(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
create policy customer_documents_write on public.customer_documents for all to authenticated using(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id))with check(organization_id=private.current_organization_id()and exists(select 1 from public.customers c where c.id=customer_id));
