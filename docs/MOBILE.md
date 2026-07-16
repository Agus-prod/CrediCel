# Pruebas en dispositivos móviles

## Panel web y portal

El teléfono y la computadora deben estar en la misma red. Obtenga la dirección IPv4 de la computadora con `ipconfig` y sustituya `192.168.1.50` en los ejemplos.

Configure el panel en `apps/admin-web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_APP_URL=http://192.168.1.50:3001
NEXT_PUBLIC_CUSTOMER_PORTAL_URL=http://192.168.1.50:3002
```

Configure el portal en `apps/customer-portal/.env.local` con las mismas variables públicas de Supabase. Inicie ambos servicios escuchando en la red:

```bash
pnpm --filter @credicel/admin-web exec next dev --turbopack -p 3001 -H 0.0.0.0
pnpm --filter @credicel/customer-portal exec next dev --turbopack -p 3002 -H 0.0.0.0
```

Abra desde el teléfono:

- Panel: `http://192.168.1.50:3001`
- Portal: `http://192.168.1.50:3002/?token=<token-real-del-cliente>`

No existe un token de demostración. El portal rechaza tokens vacíos o con formato inválido. Windows puede solicitar permiso de firewall la primera vez que se expongan los puertos.

## App Expo para vendedores

Cree `apps/seller-mobile/.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Use exclusivamente la clave pública `anon`. Nunca coloque `service_role` en una aplicación web o móvil. Para un teléfono real se recomienda un proyecto Supabase accesible por HTTPS; `127.0.0.1` y `localhost` apuntan al propio teléfono.

Instale Expo Go en el teléfono y ejecute:

```bash
pnpm --filter @credicel/seller-mobile dev
```

Escanee el código QR desde Expo Go. Si la red bloquea el modo LAN, ejecute `pnpm --filter @credicel/seller-mobile dev --tunnel`.

La app conserva la sesión de forma segura para el entorno Expo, respeta las políticas RLS de Supabase y ofrece inventario disponible, cartera propia y creación de solicitudes. El expediente requiere frente y reverso de identidad, selfie y comprobante de domicilio. Cada imagen móvil admite JPEG o PNG hasta 7 MB.

## Comprobaciones

```bash
pnpm --filter @credicel/seller-mobile lint
pnpm --filter @credicel/seller-mobile typecheck
pnpm --filter @credicel/seller-mobile test
pnpm --filter @credicel/admin-web test
pnpm --filter @credicel/customer-portal test
```

En producción, publique el panel y el portal con HTTPS y establezca `NEXT_PUBLIC_APP_URL` en el dominio definitivo.
