create policy profile_roles_self_read on public.profile_roles for select to authenticated using(profile_id=auth.uid());
create policy roles_tenant_read on public.roles for select to authenticated using(organization_id=private.current_organization_id());
create policy role_permissions_assigned_read on public.role_permissions for select to authenticated using(exists(select 1 from public.profile_roles pr where pr.profile_id=auth.uid() and pr.role_id=role_permissions.role_id));
create policy branch_access_self_read on public.user_branch_access for select to authenticated using(profile_id=auth.uid());

create policy customer_related_write_addresses on public.customer_addresses for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('customers.write')) with check(organization_id=private.current_organization_id() and private.has_permission('customers.write'));
create policy customer_related_write_employment on public.customer_employment for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('customers.write')) with check(organization_id=private.current_organization_id() and private.has_permission('customers.write'));
create policy customer_related_write_references on public.customer_references for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('customers.write')) with check(organization_id=private.current_organization_id() and private.has_permission('customers.write'));
create policy customer_related_write_documents on public.customer_documents for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('customers.write')) with check(organization_id=private.current_organization_id() and private.has_permission('customers.write'));
create policy transfer_create on public.inventory_transfers for insert to authenticated with check(organization_id=private.current_organization_id() and private.has_branch_access(origin_branch_id) and private.has_permission('inventory.write'));
create policy transfer_item_create on public.inventory_transfer_items for insert to authenticated with check(organization_id=private.current_organization_id() and private.has_permission('inventory.write'));

create or replace function public.dashboard_metrics() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
 'pending_applications',(select count(*) from public.credit_applications where organization_id=private.current_organization_id() and status in ('submitted','under_review')),
 'available_inventory',(select count(*) from public.inventory_units where organization_id=private.current_organization_id() and status='available'),
 'transfers_in_transit',(select count(*) from public.inventory_transfers where organization_id=private.current_organization_id() and status='in_transit'),
 'payments_pending',(select count(*) from public.transfer_reports where organization_id=private.current_organization_id() and status in ('reported','under_review'))
) $$;
grant execute on function public.dashboard_metrics() to authenticated;
