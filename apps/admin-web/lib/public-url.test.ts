import { describe, expect, it } from "vitest";
import { resolvePublicAppUrl } from "./public-url";

describe("resolvePublicAppUrl", () => {
  it("prioriza la URL pública configurada", () => {
    expect(
      resolvePublicAppUrl(
        "/aceptar-invitacion?token=abc",
        "https://app.credicel.hn/base",
        "http://192.168.1.20:3001",
      ),
    ).toBe("https://app.credicel.hn/aceptar-invitacion?token=abc");
  });

  it("usa el origen de la petición como respaldo para pruebas LAN", () => {
    expect(
      resolvePublicAppUrl(
        "/nueva-contrasena",
        undefined,
        "http://192.168.1.20:3001",
      ),
    ).toBe("http://192.168.1.20:3001/nueva-contrasena");
  });

  it("rechaza protocolos no web", () => {
    expect(() => resolvePublicAppUrl("/", "javascript:alert(1)")).toThrowError(
      "HTTP o HTTPS",
    );
  });
});
