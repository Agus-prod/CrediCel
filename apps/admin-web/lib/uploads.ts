export const ADMIN_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export const MAX_CUSTOMER_DOCUMENT_BYTES = 7 * 1024 * 1024;

export interface UploadValidationOptions {
  readonly required?: boolean;
  readonly maxBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

export function validateUpload(
  value: FormDataEntryValue | null,
  options: UploadValidationOptions,
): string | null {
  if (!(value instanceof File) || value.size === 0) {
    return options.required ? "Selecciona el archivo requerido." : null;
  }

  if (!options.allowedMimeTypes.includes(value.type)) {
    return "El archivo debe ser JPG, PNG o PDF.";
  }

  if (value.size > options.maxBytes) {
    const limitMb = Math.floor(options.maxBytes / 1024 / 1024);
    return `El archivo supera el límite de ${limitMb} MB.`;
  }

  return null;
}
