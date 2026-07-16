import { describe, expect, it } from "vitest";
import { pendingContractTemplate } from "./index.js";

describe("contrato pendiente", () => {
  it("reserva el contrato sin fingir una plantilla final", () => {
    expect(pendingContractTemplate).toEqual({
      key: "credit-contract",
      version: 0,
      requiredVariables: [],
    });
  });
});
