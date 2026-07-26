# CrediCel Protect: arquitectura MDM para Android

## Estado de Google Cloud

- Proyecto de desarrollo: `credicel-mdm-dev-2026`.
- Android Management API: habilitada.
- Cuenta de servicio: `credicel-mdm-worker@credicel-mdm-dev-2026.iam.gserviceaccount.com`.
- Rol mínimo asignado: `roles/androidmanagement.user`.
- No se generó una llave JSON de larga duración. En producción se debe usar identidad del servicio o Workload Identity; las credenciales nunca entran al repositorio.
- Android Enterprise registrado y empresa permanente creada en Google: `enterprises/LC048k2chs` (`CrediCel Protect`).
- Pendiente externo: confirmar la cuota inicial de dispositivos con un enrolamiento de laboratorio y reactivar/vincular facturación únicamente si Google la exige para continuar o antes de producción.

## Decisión técnica

El IMEI identifica el equipo de inventario, pero por sí solo no permite que una aplicación normal bloquee Android. El teléfono debe enrolarse durante la preparación como dispositivo administrado y quedar vinculado al IMEI registrado en CrediCel.

La primera versión debe enfocarse en Android con **Android Management API** y Android Device Policy, utilizando modo `fully_managed` para equipos financiados. Google admite enrolamiento por QR en equipos nuevos o restablecidos, DPC identifier y zero-touch para equipos adquiridos mediante revendedores compatibles.

Referencias oficiales:

- [Enrolar y aprovisionar un dispositivo](https://developers.google.com/android/management/provision-device)
- [Enviar comandos al dispositivo](https://developers.google.com/android/management/reference/rest/v1/enterprises.devices/issueCommand)
- [Modo de tarea bloqueada](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode)

## Flujo propuesto

1. Inventario registra IMEI, modelo y compatibilidad MDM.
2. La tienda crea el enrolamiento desde CrediCel.
3. El backend crea un token/QR de Android Enterprise para una política `fully_managed`.
4. El teléfono nuevo o restablecido escanea el QR durante la configuración inicial.
5. El webhook o sincronizador recibe el nombre del dispositivo MDM y lo registra mediante `register_android_mdm_device`.

## Integración disponible en CrediCel

- Al formalizar y activar un crédito, el panel redirige a **Protección de equipos** con el crédito recién creado seleccionado.
- `POST /api/mdm/enrollment-tokens` valida la sesión, organización, crédito e IMEI mediante RLS y funciones de base de datos.
- El servidor crea en Google un token de enrolamiento de un solo uso para administración completa y convierte el payload en QR sin enviarlo a terceros.
- El QR secreto solo se devuelve en memoria al navegador autenticado, nunca se coloca en la URL ni se guarda en la base de datos.
- La base conserva únicamente nombre de recurso, creación y vencimiento del token para auditoría.
- Los QR pueden durar 1, 8 o 24 horas y se descargan como PNG para preparar el dispositivo físico.

### Identidad al publicar en la web

El runtime web debe ejecutarse con la cuenta de servicio `credicel-mdm-worker` como identidad de Google Cloud y con `GOOGLE_MDM_USE_IMPERSONATION=false`. Si se usa otra identidad, debe concedérsele permiso para suplantar esa cuenta y activar `GOOGLE_MDM_USE_IMPERSONATION=true`. No se deben descargar ni desplegar claves JSON.
6. El servidor compara el IMEI reportado por el proveedor con el IMEI del inventario; si no coincide, rechaza el vínculo.
7. Cobranza solicita bloquear o desbloquear. CrediCel valida mora, permisos y organización antes de poner la orden en cola.
8. Un worker con credencial de servicio reclama la orden, llama a Android Management API y registra el resultado.
9. Toda orden conserva usuario, motivo, intentos, fecha y respuesta del proveedor.
10. Al terminar de pagar, se ejecuta `release` y se entrega el equipo sin administración, siguiendo un proceso irreversible confirmado.

## Reglas de seguridad

- Nunca incluir credenciales de Google o `service_role` en la app móvil.
- Nunca permitir que un teléfono marque su propia orden como ejecutada mediante una llamada anónima.
- Bloquear solamente cuentas formalmente en mora y conservar motivo/auditoría.
- Separar `lock` de `wipe`: borrar datos no debe formar parte del flujo normal de cobranza.
- Mostrar al cliente en contrato y pantalla qué control existe, cuándo se usa y cómo solicitar desbloqueo.
- El desbloqueo debe tener prioridad y reintentos cuando el equipo recupere conectividad.
- Probar por marca/modelo; algunas capacidades y telemetría dependen del fabricante y versión de Android.

## Fases

### Fase 1 — laboratorio

- Confirmar la cuota inicial de Android Management API enrolando un único dispositivo de laboratorio.
- Crear proyecto Google Cloud y una empresa de prueba.
- Probar dos o tres modelos reales vendidos por CrediCel.
- Implementar worker de enrolamiento, comandos y sincronización de cumplimiento.

### Fase 2 — piloto controlado

- 10–20 dispositivos internos o clientes con consentimiento explícito.
- Medir enrolamiento, órdenes sin conexión, tiempo de bloqueo/desbloqueo y restablecimientos.
- Crear soporte de emergencia y liberación final.

### Fase 3 — producción

- Zero-touch donde el distribuidor lo permita.
- Monitoreo, alertas, rotación de credenciales y tablero de cumplimiento.
- Revisión legal y contractual específica para Honduras antes de activar bloqueo por cobranza.
