import { describe, expect, it } from "vitest";
import { MAX_RECEIPT_BYTES, validateReceipt } from "./uploads";

describe("validateReceipt", () => {
  it("acepta comprobantes permitidos", () => {
    const receipt = new File(["imagen"], "pago.jpg", { type: "image/jpeg" });
    expect(validateReceipt(receipt)).toBeNull();
  });

  it("rechaza contenido ejecutable", () => {
    const receipt = new File(["alert(1)"], "pago.html", {
      type: "text/html",
    });
    expect(validateReceipt(receipt)).toContain("JPG, PNG o PDF");
  });

  it("rechaza comprobantes demasiado grandes", () => {
    const receipt = new File(
      [new Uint8Array(MAX_RECEIPT_BYTES + 1)],
      "pago.png",
      { type: "image/png" },
    );
    expect(validateReceipt(receipt)).toContain("9 MB");
  });
});
