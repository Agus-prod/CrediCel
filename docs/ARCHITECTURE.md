# Arquitectura CrediCel

## Principios

CrediCel es un monorepo modular con aplicaciones delgadas y reglas compartidas. PostgreSQL es la autoridad para aislamiento, transacciones de inventario y auditoría. El navegador usa exclusivamente la clave pública de Supabase; nunca `service_role`.

La propiedad económica (`business_units`) y la ubicación física (`branches`) son dimensiones independientes. Cada tabla sensible incluye `organization_id`, todas tienen RLS forzado y los permisos se evalúan en funciones privadas con `search_path` vacío.

## Capas

1. `apps/*`: experiencias de administrador, cliente, vendedor y reserva Android.
2. `packages/domain`, `validation`, `ui`, `config`: contratos compartidos sin acceso a infraestructura.
3. `configuration-engine` y `business-rules`: evaluación determinista, explicable y sin `eval`.
4. Supabase: Auth, PostgreSQL, Storage privado, RLS, auditoría y RPC transaccionales.

## Límites de seguridad

- RLS se fuerza incluso para propietarios de tabla.
- Las funciones `security definer` fijan `search_path` y revalidan organización, punto y permiso.
- Los documentos viven en buckets privados con prefijos `organization/customer/random/random` y se leen mediante URL firmada breve.
- `audit_logs` y `configuration_audit_logs` rechazan actualizaciones y eliminaciones.
- Cambiar ubicación de inventario fuera del RPC transaccional es rechazado por trigger.

## Diagrama textual

```text
organizations
 ├─ business_units ─┬─ branches
 │                  └─ inventory_units(owner) ─ product_models ─ product_brands
 ├─ profiles ─ profile_roles ─ roles ─ role_permissions ─ permissions
 │          └─ user_branch_access ─ branches
 ├─ customers ─┬─ addresses / employment / references
 │             ├─ documents / consents / timeline
 │             └─ credit_applications ─ decisions / notes / assignments / history
 ├─ inventory_transfers ─ transfer_items ─ inventory_units
 │                      ├─ transfer_events
 │                      └─ discrepancies
 ├─ configuration_versions ─ configuration_values
 │                          └─ configuration_scopes / definitions
 ├─ rule_sets ─ business_rules ─ conditions / actions ─ execution_logs
 └─ bank_accounts ─ transfer_reports ─ files / validation_events
```

## Flujos transaccionales

Despacho bloquea la transferencia, valida todos los IMEI y estados, marca cada unidad `in_transit` y escribe eventos/movimientos en una sola transacción. Recepción aplica el mismo bloqueo; un IMEI distinto genera discrepancia y no mueve el equipo. Una recepción válida cambia ubicación y, con permiso adicional, propietario.

## Configuración versionada

Cada organización conserva una versión publicada y un borrador editable. Los valores del borrador comparten vigencia, se validan con Zod y PostgreSQL, y únicamente las RPC de configuración pueden guardarlos o publicarlos. Publicar retira la versión anterior, activa la nueva de forma transaccional, registra auditoría y crea el siguiente borrador. Las solicitudes nuevas guardan `configuration_version_id` como evidencia de la política aplicada.

El RPC SQL utilizado por el formulario transaccional resuelve la política organizacional publicada. El servicio tipado de `packages/configuration-engine` resuelve organización, unidad propietaria, punto, tipo de cliente, categoría, marca, modelo, rango de precio, producto y campaña con contexto compuesto, precedencia canónica y rechazo de ambigüedades. La interfaz administrativa de esta fase publica la base organizacional; los ámbitos especializados se habilitarán en esa interfaz de forma progresiva sin cambiar el contrato del motor.
