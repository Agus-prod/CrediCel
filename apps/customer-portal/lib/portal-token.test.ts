import { describe, expect, it } from "vitest";
import { parsePortalToken } from "./portal-token";

describe("parsePortalToken", () => {
  it("acepta un token UUID", () => {
    expect(parsePortalToken("11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("no crea un token demo cuando falta", () => {
    expect(parsePortalToken(undefined)).toBeNull();
  });

  it("rechaza valores arbitrarios", () => {
    expect(parsePortalToken("demo")).toBeNull();
  });
});
