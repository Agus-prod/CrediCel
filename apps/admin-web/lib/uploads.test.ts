import { describe, expect, it } from "vitest";
import {
  ADMIN_UPLOAD_MIME_TYPES,
  MAX_CUSTOMER_DOCUMENT_BYTES,
  validateUpload,
} from "./uploads";

const options = {
  required: true,
  maxBytes: MAX_CUSTOMER_DOCUMENT_BYTES,
  allowedMimeTypes: ADMIN_UPLOAD_MIME_TYPES,
} as const;

describe("validateUpload", () => {
  it("acepta una imagen válida", () => {
    const file = new File([new Uint8Array(16)], "dni.jpg", {
      type: "image/jpeg",
    });
    expect(validateUpload(file, options)).toBeNull();
  });

  it("rechaza tipos no permitidos", () => {
    const file = new File(["contenido"], "archivo.svg", {
      type: "image/svg+xml",
    });
    expect(validateUpload(file, options)).toContain("JPG, PNG o PDF");
  });

  it("rechaza archivos que exceden el límite", () => {
    const file = new File(
      [new Uint8Array(MAX_CUSTOMER_DOCUMENT_BYTES + 1)],
      "grande.png",
      { type: "image/png" },
    );
    expect(validateUpload(file, options)).toContain("7 MB");
  });
});
