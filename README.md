# CrediCel

Plataforma multiestablecimiento para venta al contado y crédito de teléfonos, construida como proyecto completamente nuevo.

## Requisitos

- Node.js 20 o superior
- pnpm 10
- Docker Desktop
- Supabase CLI (puede ejecutarse con `pnpm dlx supabase`)

## Instalación

```bash
git clone <repositorio> credicel
cd credicel
pnpm install
copy .env.example .env.local
pnpm dlx supabase start
pnpm dlx supabase db reset
pnpm dev
```

Copie también las variables públicas a `apps/admin-web/.env.local` y `apps/customer-portal/.env.local`. Use únicamente la URL y clave `anon` mostradas por Supabase local. Nunca coloque `service_role` en una variable `NEXT_PUBLIC_*`.

## Aplicaciones

- `apps/admin-web`: operaciones administrativas en Next.js, puerto 3000.
- `apps/customer-portal`: autoservicio del cliente, puerto 3001.
- `apps/seller-mobile`: Expo/React Native para iOS y Android.
- `apps/device-controller`: contrato reservado para CrediCel Protect en Kotlin.

## Paquetes

- `database-types`, `domain`, `validation`, `business-rules`
- `configuration-engine`, `financial-engine`, `ui`, `config`
- `document-templates`

El motor financiero definitivo no está implementado: `PendingFinancialEngine` mantiene un contrato explícito sin generar cálculos aproximados.

## Comandos de calidad

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dlx supabase test db
```

## Base de datos

Las migraciones viven en `supabase/migrations`, el seed únicamente local en `supabase/seed.sql` y las pruebas pgTAP en `supabase/tests`. Despacho y recepción solo se ejecutan con los RPC `dispatch_inventory_transfer` y `receive_inventory_transfer`.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Decisiones pendientes](docs/PENDING_DECISIONS.md)
- [Riesgos técnicos](docs/TECHNICAL_RISKS.md)
