import { describe, expect, it } from "vitest";

import { calculateApplicationDefaults } from "./application-defaults";

describe("calculateApplicationDefaults", () => {
  it("genera precio, prima redondeada hacia arriba y plazo configurado", () => {
    expect(calculateApplicationDefaults(21_490, 10, 24)).toEqual({
      price: 21_490,
      downPayment: 2_149,
      term: 24,
    });
  });

  it("nunca deja una prima fraccionaria por debajo del porcentaje", () => {
    expect(calculateApplicationDefaults(19_999.99, 12.5, 18).downPayment).toBe(
      2_500,
    );
  });
});
