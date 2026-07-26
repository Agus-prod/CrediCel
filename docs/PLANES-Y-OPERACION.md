# Planes, prueba y operación comercial

## Oferta inicial

| Plan | Mensual | Anual | Tiendas | Usuarios | Clientes | Solicitudes/mes |
|---|---:|---:|---:|---:|---:|---:|
| Pequeño | L 1,499 | L 14,990 | 1 | 6 | 250 | 150 |
| Mediano | L 3,499 | L 34,990 | 5 | 25 | 1,500 | 750 |
| Grande | L 7,999 | L 79,990 | 15 | 75 | 5,000 | 2,500 |

La anualidad cobra diez mensualidades. La prueba dura 14 días y admite como máximo 50 clientes, una tienda, cinco usuarios y 50 solicitudes. Al vencer, el acceso operativo queda bloqueado, pero los datos no se eliminan; la pantalla de suscripción sigue disponible para reportar un pago.

## Criterio de precios

La referencia inicial considera infraestructura compartida desde aproximadamente USD 65 mensuales antes de impuestos, soporte y trabajo operativo: Supabase Pro desde USD 25, Vercel Pro desde USD 20 y Resend Pro desde USD 20. Esta cifra es una hipótesis de planeación, no un costo garantizado; se debe revisar mensualmente con consumo real, tipo de cambio, impuestos, almacenamiento, respaldos, mensajería y horas de soporte.

Fuentes oficiales: [Supabase](https://supabase.com/pricing), [Vercel](https://vercel.com/pricing) y [Resend](https://resend.com/pricing?volume=50000).

## Pago por transferencia

Solo el propietario de la organización puede reportar una transferencia. El servidor obtiene el precio desde el plan elegido, evita referencias duplicadas y registra el pago como pendiente. Una credencial de servicio verifica el abono y activa el período mensual o anual; ningún usuario normal puede aprobar su propio pago.

Antes de producción se debe reemplazar la cuenta bancaria demostrativa del `seed.sql` por la cuenta real, definir quién conciliará los abonos y guardar el comprobante conforme a la política contable de la empresa.

## Seguridad multiempresa

Las filas de negocio, configuración, suscripción y pagos están protegidas por organización mediante RLS. Los dueños y administradores pueden gestionar la configuración versionada de su organización y sus tiendas; no pueden consultar ni modificar datos de otra organización. Mantener siempre las pruebas de aislamiento como condición de despliegue.

## Conciliación interna

La ruta `/operacion/suscripciones` muestra la cola global de transferencias únicamente a operadores de plataforma. Confirmar activa el plan y rechazar exige una explicación. Ambas decisiones registran operador, fecha, acción y nota en una bitácora inmutable.

El alta de un operador es deliberadamente administrativa y no se puede hacer desde una organización. Después de crear su usuario en Auth, un administrador de la plataforma debe registrar su UUID con una credencial de servicio:

```sql
insert into public.platform_operators (user_id, display_name)
values ('UUID-DEL-USUARIO', 'Nombre del operador');
```

Existe una cola idempotente de recordatorios a 7, 3 y 1 día, además del vencimiento. En producción se debe programar una llamada diaria a `enqueue_subscription_expiry_notifications` con la credencial `service_role`; el proveedor de correo o WhatsApp consume los registros pendientes y actualiza su estado.

## Siguiente fase operativa

- Conectar la cola ya creada con el proveedor definitivo de correo o WhatsApp y supervisar fallos/reintentos.
- Medición de costo por organización, tasa de conversión y uso de límites para ajustar precios después de los primeros clientes.
- Facturación fiscal, términos de servicio, política de privacidad y procedimiento de respaldo/restauración probado.
