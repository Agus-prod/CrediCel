import { describe, expect, it } from "vitest";
import { PendingFinancialEngine } from "./index.js";

describe("PendingFinancialEngine", () => {
  it("declara explícitamente que el cálculo definitivo no está implementado", async () => {
    const result = await new PendingFinancialEngine().quote({
      configurationVersionId: "version-1",
      priceMinor: 2_500_000n,
      downPaymentMinor: 500_000n,
      termMonths: 12,
    });
    expect(result).toEqual({ status: "not_implemented" });
  });
});
