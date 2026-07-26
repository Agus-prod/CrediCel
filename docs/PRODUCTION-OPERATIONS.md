# Operación de producción

## Notificaciones

El sistema encola correo, SMS y WhatsApp al firmar un crédito. El procesador usa Resend y Twilio, reintenta fallos con espera exponencial y conserva estado, error e identificador del proveedor.

Configurar en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` y `TWILIO_WHATSAPP_FROM`. En Resend se debe verificar un dominio propio. En Twilio se debe habilitar un número SMS y un remitente WhatsApp aprobado.

Configurar en GitHub Actions el mismo `CRON_SECRET`. El flujo `Monitoreo y notificaciones` ejecuta salud y entregas cada diez minutos. Las credenciales nunca se guardan en Git.

## Pruebas E2E

La suite prueba escritorio e iPhone 13. Las rutas públicas corren sin secretos. Para probar cuentas reales, configurar pares `E2E_*_EMAIL` y `E2E_*_PASSWORD` para plataforma, propietario, gerente, analista, vendedor y caja. Estas cuentas deben ser exclusivas de pruebas y no contener datos reales.

## Respaldos

El flujo `Respaldo cifrado` exporta roles, esquema, datos y todos los objetos de Storage; cifra el paquete con AES-256 y lo conserva 30 días como artefacto privado. Requiere `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y una frase robusta en `BACKUP_ENCRYPTION_PASSPHRASE`.

Cada trimestre se debe realizar una restauración de ensayo en un proyecto aislado. Un respaldo sin prueba de restauración no se considera verificado.

## Firma electrónica

CrediCel conserva trazo, nombre, consentimiento, fecha, IP, navegador, instantánea de documentos, código de verificación y huella SHA-256. La URL `/verificar-documento` confirma la integridad técnica. La incorporación futura de un prestador de firma certificada se hará como adaptador y no invalidará evidencias anteriores.
