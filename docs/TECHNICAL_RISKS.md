# Riesgos técnicos

- Una configuración mal versionada puede alterar nuevas cotizaciones; publicación requiere doble control y pruebas de regresión.
- RLS depende de que todo dato sensible conserve `organization_id`; las migraciones nuevas deben incluir pruebas pgTAP.
- IMEI y serial pueden venir incompletos o duplicados del proveedor; la recepción debe rechazarlos antes de alta.
- La conectividad móvil intermitente exige una futura cola offline idempotente; no se implementó para evitar sincronización insegura prematura.
- MDM tiene implicaciones legales y riesgo de bloqueo indebido; permanece desacoplado.
- URLs firmadas reducen exposición, pero requieren expiraciones breves y auditoría de acceso en producción.
