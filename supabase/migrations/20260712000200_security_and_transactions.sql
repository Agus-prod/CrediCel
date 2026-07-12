create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.current_organization_id() returns uuid language sql stable security definer set search_path='' as $$ select organization_id from public.profiles where id=(select auth.uid()) and status='active' $$;
create function private.has_permission(permission_code text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profile_roles pr join public.role_permissions rp on rp.role_id=pr.role_id join public.permissions p on p.id=rp.permission_id where pr.profile_id=(select auth.uid()) and p.code=permission_code) $$;
create function private.has_branch_access(branch uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.user_branch_access uba where uba.profile_id=(select auth.uid()) and uba.branch_id=branch) or private.has_permission('organization.full_access') $$;
grant usage on schema private to authenticated;
grant execute on function private.current_organization_id(),private.has_permission(text),private.has_branch_access(uuid) to authenticated;

do $$ declare t text; begin foreach t in array array['organizations','business_units','branches','profiles','roles','permissions','role_permissions','profile_roles','user_branch_access','configuration_definitions','configuration_versions','configuration_scopes','configuration_values','configuration_audit_logs','rule_sets','business_rules','rule_conditions','rule_actions','rule_execution_logs','customers','customer_addresses','customer_employment','customer_references','customer_documents','customer_consents','customer_timeline_events','product_brands','product_models','inventory_units','inventory_unit_movements','inventory_transfers','inventory_transfer_items','inventory_transfer_events','inventory_transfer_discrepancies','credit_applications','credit_application_items','credit_application_status_history','credit_application_notes','credit_application_assignments','credit_decisions','bank_accounts','transfer_reports','transfer_report_files','transfer_validation_events','audit_logs'] loop execute format('alter table public.%I enable row level security',t); execute format('alter table public.%I force row level security',t); end loop; end $$;

create policy organization_select on organizations for select to authenticated using(id=private.current_organization_id());
create policy profile_self_or_org on profiles for select to authenticated using(id=(select auth.uid()) or (organization_id=private.current_organization_id() and private.has_permission('users.read')));
create policy profile_admin_write on profiles for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('users.manage')) with check(organization_id=private.current_organization_id() and private.has_permission('users.manage'));
create policy permission_catalog_read on permissions for select to authenticated using(true);
create policy configuration_definitions_read on configuration_definitions for select to authenticated using(true);

do $$ declare t text; begin foreach t in array array['business_units','branches','roles','user_branch_access','configuration_versions','configuration_scopes','configuration_values','configuration_audit_logs','rule_sets','business_rules','rule_conditions','rule_actions','rule_execution_logs','customers','customer_addresses','customer_employment','customer_references','customer_documents','customer_consents','customer_timeline_events','product_brands','product_models','inventory_units','inventory_unit_movements','inventory_transfers','inventory_transfer_items','inventory_transfer_events','inventory_transfer_discrepancies','credit_applications','credit_application_items','credit_application_status_history','credit_application_notes','credit_application_assignments','credit_decisions','bank_accounts','transfer_reports','transfer_report_files','transfer_validation_events'] loop execute format('create policy %I on public.%I for select to authenticated using (organization_id=private.current_organization_id())','tenant_read_'||t,t); end loop; end $$;

create policy branch_write on branches for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('branches.manage')) with check(organization_id=private.current_organization_id() and private.has_permission('branches.manage'));
create policy unit_write on business_units for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('business_units.manage')) with check(organization_id=private.current_organization_id() and private.has_permission('business_units.manage'));
create policy customer_write on customers for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('customers.write')) with check(organization_id=private.current_organization_id() and private.has_permission('customers.write'));
create policy inventory_write on inventory_units for insert to authenticated with check(organization_id=private.current_organization_id() and private.has_branch_access(current_branch_id) and private.has_permission('inventory.write'));
create policy application_write on credit_applications for insert to authenticated with check(organization_id=private.current_organization_id() and private.has_branch_access(branch_id) and private.has_permission('applications.create'));
create policy transfer_report_create on transfer_reports for insert to authenticated with check(organization_id=private.current_organization_id());
create policy config_write on configuration_values for all to authenticated using(organization_id=private.current_organization_id() and private.has_permission('configuration.manage')) with check(organization_id=private.current_organization_id() and private.has_permission('configuration.manage'));
create policy audit_read on audit_logs for select to authenticated using(organization_id=private.current_organization_id() and private.has_permission('audit.read'));

create function private.block_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'immutable audit record' using errcode='42501'; end $$;
create trigger audit_logs_immutable before update or delete on audit_logs for each row execute function private.block_mutation();
create trigger configuration_audit_immutable before update or delete on configuration_audit_logs for each row execute function private.block_mutation();

create function public.dispatch_inventory_transfer(p_transfer_id uuid,p_scanned_imeis text[]) returns void language plpgsql security definer set search_path='' as $$
declare v_transfer public.inventory_transfers%rowtype; v_expected integer; v_scanned integer;
begin
 select * into v_transfer from public.inventory_transfers where id=p_transfer_id for update;
 if not found or v_transfer.organization_id<>private.current_organization_id() then raise exception 'transfer not found'; end if;
 if not private.has_branch_access(v_transfer.origin_branch_id) or not private.has_permission('transfers.dispatch') then raise exception 'forbidden' using errcode='42501'; end if;
 if v_transfer.status not in ('approved','preparing') then raise exception 'invalid transfer state: %',v_transfer.status; end if;
 select count(*) into v_expected from public.inventory_transfer_items where transfer_id=p_transfer_id;
 select count(distinct iu.id) into v_scanned from public.inventory_transfer_items ti join public.inventory_units iu on iu.id=ti.inventory_unit_id where ti.transfer_id=p_transfer_id and iu.imei_1=any(p_scanned_imeis) and iu.current_branch_id=v_transfer.origin_branch_id and iu.status in ('available','transfer_pending');
 if v_expected=0 or v_expected<>v_scanned or cardinality(p_scanned_imeis)<>v_expected then raise exception 'IMEI scan mismatch'; end if;
 update public.inventory_units iu set status='in_transit',updated_at=now() from public.inventory_transfer_items ti where ti.transfer_id=p_transfer_id and ti.inventory_unit_id=iu.id;
 update public.inventory_transfer_items set origin_scanned_at=now() where transfer_id=p_transfer_id;
 update public.inventory_transfers set status='in_transit',dispatched_by=auth.uid(),updated_at=now() where id=p_transfer_id;
 insert into public.inventory_transfer_events(organization_id,transfer_id,event_type,actor_id) values(v_transfer.organization_id,p_transfer_id,'dispatched',auth.uid());
 insert into public.inventory_unit_movements(organization_id,inventory_unit_id,from_branch_id,to_branch_id,movement_type,reference_type,reference_id,actor_id) select v_transfer.organization_id,inventory_unit_id,v_transfer.origin_branch_id,v_transfer.destination_branch_id,'dispatch','inventory_transfer',p_transfer_id,auth.uid() from public.inventory_transfer_items where transfer_id=p_transfer_id;
end $$;

create function public.receive_inventory_transfer(p_transfer_id uuid,p_scanned_imeis text[]) returns void language plpgsql security definer set search_path='' as $$
declare v_transfer public.inventory_transfers%rowtype; v_expected integer; v_scanned integer;
begin
 select * into v_transfer from public.inventory_transfers where id=p_transfer_id for update;
 if not found or v_transfer.organization_id<>private.current_organization_id() then raise exception 'transfer not found'; end if;
 if not private.has_branch_access(v_transfer.destination_branch_id) or not private.has_permission('transfers.receive') then raise exception 'forbidden' using errcode='42501'; end if;
 if v_transfer.status<>'in_transit' then raise exception 'invalid transfer state: %',v_transfer.status; end if;
 select count(*) into v_expected from public.inventory_transfer_items where transfer_id=p_transfer_id;
 select count(distinct iu.id) into v_scanned from public.inventory_transfer_items ti join public.inventory_units iu on iu.id=ti.inventory_unit_id where ti.transfer_id=p_transfer_id and iu.imei_1=any(p_scanned_imeis) and iu.status='in_transit';
 if v_expected=0 or v_expected<>v_scanned or cardinality(p_scanned_imeis)<>v_expected then insert into public.inventory_transfer_discrepancies(organization_id,transfer_id,scanned_imei,description) values(v_transfer.organization_id,p_transfer_id,array_to_string(p_scanned_imeis,','),'IMEI scan mismatch'); update public.inventory_transfers set status='received_with_discrepancy',updated_at=now() where id=p_transfer_id; return; end if;
 if v_transfer.transfer_ownership and not private.has_permission('transfers.change_owner') then raise exception 'ownership transfer requires administrative permission' using errcode='42501'; end if;
 perform set_config('app.inventory_movement','allowed',true);
 update public.inventory_units iu set current_branch_id=v_transfer.destination_branch_id,owner_business_unit_id=case when v_transfer.transfer_ownership then v_transfer.destination_owner_business_unit_id else iu.owner_business_unit_id end,status='available',updated_at=now() from public.inventory_transfer_items ti where ti.transfer_id=p_transfer_id and ti.inventory_unit_id=iu.id;
 update public.inventory_transfer_items set destination_scanned_at=now() where transfer_id=p_transfer_id;
 update public.inventory_transfers set status='received',received_by=auth.uid(),updated_at=now() where id=p_transfer_id;
 insert into public.inventory_transfer_events(organization_id,transfer_id,event_type,actor_id) values(v_transfer.organization_id,p_transfer_id,'received',auth.uid());
 insert into public.inventory_unit_movements(organization_id,inventory_unit_id,from_branch_id,to_branch_id,movement_type,reference_type,reference_id,actor_id) select v_transfer.organization_id,inventory_unit_id,v_transfer.origin_branch_id,v_transfer.destination_branch_id,'receipt','inventory_transfer',p_transfer_id,auth.uid() from public.inventory_transfer_items where transfer_id=p_transfer_id;
end $$;
revoke all on function public.dispatch_inventory_transfer(uuid,text[]),public.receive_inventory_transfer(uuid,text[]) from public,anon;
grant execute on function public.dispatch_inventory_transfer(uuid,text[]),public.receive_inventory_transfer(uuid,text[]) to authenticated;

create function private.prevent_unsafe_inventory_sale() returns trigger language plpgsql set search_path='' as $$ begin if new.status in ('sold_cash','financed_active') and old.status<>'available' then raise exception 'inventory unit cannot be sold from status %',old.status; end if; if new.current_branch_id is distinct from old.current_branch_id and current_setting('app.inventory_movement',true) is distinct from 'allowed' then raise exception 'inventory location must change through a transactional movement'; end if; return new; end $$;
create trigger inventory_state_guard before update on inventory_units for each row execute function private.prevent_unsafe_inventory_sale();
