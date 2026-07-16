import { describe, expect, it } from "vitest";
import { resolveCustomerPortalUrl } from "./customer-portal-url";

describe("resolveCustomerPortalUrl", () => {
  it("crea un enlace absoluto con el token", () => {
    expect(
      resolveCustomerPortalUrl(
        "11111111-1111-1111-1111-111111111111",
        "http://192.168.1.50:3002",
      ),
    ).toBe(
      "http://192.168.1.50:3002/?token=11111111-1111-1111-1111-111111111111",
    );
  });

  it("rechaza protocolos no web", () => {
    expect(() =>
      resolveCustomerPortalUrl("token", "javascript:alert(1)"),
    ).toThrow(/HTTP o HTTPS/);
  });
});
