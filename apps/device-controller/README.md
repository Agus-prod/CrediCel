# CrediCel Protect — reservación técnica

Esta carpeta reserva la futura aplicación Android nativa en Kotlin para administración de dispositivos. No contiene bloqueo MDM ni comportamiento de Device Owner.

## Contrato previsto

- Aplicación Android nativa con módulos Gradle y Kotlin estricto.
- Inscripción autenticada y vinculada a `inventory_unit_id` y crédito activo.
- Comandos firmados, idempotentes, auditables y con expiración.
- Ninguna credencial administrativa embebida en el APK.
- El backend será la autoridad; el dispositivo nunca decidirá el estado financiero.

La selección de proveedor MDM, estrategia de aprovisionamiento, política de privacidad y proceso de recuperación siguen pendientes.
