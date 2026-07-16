export const PORTAL_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export const MAX_RECEIPT_BYTES = 9 * 1024 * 1024;

export function validateReceipt(
  value: FormDataEntryValue | null,
): string | null {
  if (!(value instanceof File) || value.size === 0) {
    return "Adjunta el comprobante de la transferencia.";
  }
  if (
    !PORTAL_RECEIPT_MIME_TYPES.includes(
      value.type as (typeof PORTAL_RECEIPT_MIME_TYPES)[number],
    )
  ) {
    return "El comprobante debe ser JPG, PNG o PDF.";
  }
  if (value.size > MAX_RECEIPT_BYTES) {
    return "El comprobante supera el límite de 9 MB.";
  }
  return null;
}
