# Verificacion de identidad y selfie

## Decision tecnica

CrediCel debe tratar el escaneo de identidad y la selfie como verificacion de identidad, no como una simple carga de archivos. Para el MVP queda activo un flujo local:

- Camara trasera con marco de identidad, recorte al rectangulo y autocaptura cuando el documento esta estable, iluminado y enfocado.
- Lectura local de respaldo con `BarcodeDetector` y `tesseract.js`.
- Camara frontal con ovalo de rostro y autocaptura cuando el navegador soporta `FaceDetector`.
- Confirmacion manual antes de enviar para no confiar ciegamente en OCR.

Para produccion se recomienda activar un proveedor dedicado:

1. Regula Document Reader SDK/Web API para documento.
   - Soporta flujo web, deteccion automatica de tipo de documento, control de calidad, OCR y autenticidad.
   - Tiene despliegue cloud, on-premise y Docker, util para SaaS multi-organizacion.
   - La pagina oficial indica base de plantillas amplia, web SDK/API y prueba de 30 dias.

2. Microblink BlinkID como alternativa para documento.
   - BlinkID extrae datos de documentos de identidad como SDK o API.
   - En SDK local, la extraccion ocurre en el dispositivo; en API, se envia la imagen a un servicio Docker propio.
   - Requiere licencia por dominio/plataforma.

3. Amazon Rekognition Face Liveness para prueba de vida.
   - El flujo oficial usa un video selfie guiado y devuelve resultado/confianza con APIs de sesion.
   - Requiere AWS, permisos `CreateFaceLivenessSession` y `GetFaceLivenessSessionResults`, y componente web de Amplify UI.

## Variables esperadas

Cuando se compre/active proveedor, mantener secretos solo en servidor:

```env
IDENTITY_DOCUMENT_PROVIDER=regula
REGULA_API_URL=
REGULA_API_TOKEN=

FACE_LIVENESS_PROVIDER=aws-rekognition
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REKOGNITION_LIVENESS_THRESHOLD=90
```

## Reglas de seguridad

- No guardar claves de proveedores en el cliente.
- No loguear imagenes, texto OCR completo ni selfies.
- Guardar solo el documento necesario en el bucket privado y auditar quien lo ve.
- Marcar campos leidos automaticamente para revision humana.
- Si el OCR o liveness falla, permitir captura manual pero dejar la solicitud como revision documental pendiente.
- En moviles, usar HTTPS. `http://192.168.x.x` puede bloquear camara en vivo; `localhost` funciona en desktop, pero celular debe entrar por HTTPS o tunel seguro.

## Fuentes oficiales revisadas

- Microblink BlinkID docs: https://docs.microblink.com/blinkid
- Microblink Capture Browser SDK: https://github.com/BlinkID/capture-browser
- Regula Document Reader Web API: https://api.regulaforensics.com/
- AWS Amplify Face Liveness: https://ui.docs.amplify.aws/react/connected-components/liveness
- AWS Rekognition Face Liveness APIs: https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness-calling-apis.html
- AWS Rekognition requisitos de usuario: https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness-requirements.html
