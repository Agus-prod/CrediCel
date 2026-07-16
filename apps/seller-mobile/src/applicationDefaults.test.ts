import { describe, expect, it } from "vitest";
import { automaticFinancingValues } from "./applicationDefaults";

describe("automaticFinancingValues", () => {
  it("fills price, configured minimum down payment and maximum valid term", () => {
    expect(automaticFinancingValues(21_490, 10, 24)).toEqual({
      requestedPrice: "21490",
      downPayment: "2149",
      term: "24",
    });
  });

  it("rounds a fractional minimum down payment up to the next cent", () => {
    expect(automaticFinancingValues(999.99, 12.5, 18)).toEqual({
      requestedPrice: "999.99",
      downPayment: "125",
      term: "18",
    });
  });

  it("leaves policy values empty when there is no active configuration", () => {
    expect(automaticFinancingValues(15_000, null, null)).toEqual({
      requestedPrice: "15000",
      downPayment: "",
      term: "",
    });
  });
});
