insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('customer-documents','customer-documents',false,20971520,array['image/jpeg','image/png','application/pdf']),('transfer-receipts','transfer-receipts',false,10485760,array['image/jpeg','image/png','application/pdf']) on conflict(id) do update set public=false;
create policy customer_document_objects_read on storage.objects for select to authenticated using(bucket_id='customer-documents' and (storage.foldername(name))[1]=private.current_organization_id()::text);
create policy customer_document_objects_insert on storage.objects for insert to authenticated with check(bucket_id='customer-documents' and (storage.foldername(name))[1]=private.current_organization_id()::text and private.has_permission('customers.write'));
create policy receipt_objects_read on storage.objects for select to authenticated using(bucket_id='transfer-receipts' and (storage.foldername(name))[1]=private.current_organization_id()::text);
create policy receipt_objects_insert on storage.objects for insert to authenticated with check(bucket_id='transfer-receipts' and (storage.foldername(name))[1]=private.current_organization_id()::text);
insert into public.permissions(code,description) values
('organization.full_access','Acceso completo a la organización'),('branches.manage','Administrar puntos'),('business_units.manage','Administrar unidades propietarias'),('users.read','Consultar usuarios'),('users.manage','Administrar usuarios'),('customers.write','Crear y actualizar expedientes'),('inventory.write','Registrar inventario'),('applications.create','Crear solicitudes'),('applications.review','Analizar solicitudes'),('transfers.dispatch','Despachar transferencias'),('transfers.receive','Recibir transferencias'),('transfers.change_owner','Cambiar propietario económico'),('payments.validate','Validar pagos'),('configuration.manage','Gestionar configuración'),('audit.read','Consultar auditoría') on conflict(code) do nothing;

-- Los roles viven por organización; este trigger asigna el catálogo inicial de permisos
-- cuando el seed o el onboarding crea un rol conocido.
create function private.seed_role_permissions() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.role_permissions(role_id,permission_id)
 select new.id,p.id from public.permissions p where
 new.name in ('super_admin','organization_admin') or
 (new.name='credit_manager' and p.code in ('organization.full_access','applications.review','customers.write')) or
 (new.name='credit_analyst' and p.code in ('organization.full_access','applications.review')) or
 (new.name='branch_manager' and p.code in ('customers.write','inventory.write','applications.create','transfers.dispatch','transfers.receive')) or
 (new.name='salesperson' and p.code in ('customers.write','applications.create')) or
 (new.name='cashier' and p.code='payments.validate') or
 (new.name='inventory_manager' and p.code in ('inventory.write','transfers.dispatch','transfers.receive')) or
 (new.name='auditor' and p.code in ('organization.full_access','audit.read'));
 return new;
end $$;
create trigger roles_seed_permissions after insert on public.roles for each row execute function private.seed_role_permissions();
