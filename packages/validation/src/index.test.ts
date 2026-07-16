import { describe, expect, it } from "vitest";
import {
  businessUnitSchema,
  configurationDraftSchema,
  configurationStateSchema,
  inventoryTransferSchema,
  normalizedDni,
  transferScanSchema,
} from "./index";

describe("validaciones de dominio", () => {
  it("normaliza el DNI antes de validarlo", () => {
    expect(normalizedDni.parse("0801-1999-12345")).toBe("0801199912345");
  });

  it("exige un RTN hondureño de 14 dígitos", () => {
    expect(
      businessUnitSchema.safeParse({
        legalName: "Celulares, S.A.",
        commercialName: "Centro",
        ownerName: "Ana López",
        rtn: "0801-1999-123456",
      }).success,
    ).toBe(true);
    expect(
      businessUnitSchema.safeParse({
        legalName: "Celulares, S.A.",
        commercialName: "Centro",
        ownerName: "Ana López",
        rtn: "123",
      }).success,
    ).toBe(false);
  });

  it("rechaza un traslado hacia la misma tienda", () => {
    const branchId = "11111111-1111-4111-8111-111111111111";
    expect(
      inventoryTransferSchema.safeParse({
        origin: branchId,
        destination: branchId,
        inventoryIds: ["22222222-2222-4222-8222-222222222222"],
        transferOwnership: false,
        destinationOwnerBusinessUnitId: null,
      }).success,
    ).toBe(false);
  });

  it("exige propietario destino al transferir propiedad", () => {
    expect(
      inventoryTransferSchema.safeParse({
        origin: "11111111-1111-4111-8111-111111111111",
        destination: "22222222-2222-4222-8222-222222222222",
        inventoryIds: ["33333333-3333-4333-8333-333333333333"],
        transferOwnership: true,
        destinationOwnerBusinessUnitId: null,
      }).success,
    ).toBe(false);
  });

  it("solo acepta escaneos con IMEI válido", () => {
    expect(
      transferScanSchema.safeParse({
        transferId: "11111111-1111-4111-8111-111111111111",
        imeis: ["353456789012345"],
      }).success,
    ).toBe(true);
    expect(
      transferScanSchema.safeParse({
        transferId: "11111111-1111-4111-8111-111111111111",
        imeis: ["IMEI-INVALIDO"],
      }).success,
    ).toBe(false);
  });

  it("valida rangos y vigencia del borrador de configuración", () => {
    const valid = {
      versionId: "11111111-1111-4111-8111-111111111111",
      minimumDownPaymentPercentage: "20",
      maximumTermMonths: "24",
      maximumPaymentIncomePercentage: "30",
      minimumEmploymentMonths: "6",
      requireGuarantorBelowScore: "50",
      effectiveFrom: "2026-07-15",
      effectiveUntil: "2027-07-15",
    };

    expect(configurationDraftSchema.safeParse(valid).success).toBe(true);
    expect(
      configurationDraftSchema.safeParse({ ...valid, maximumTermMonths: "0" })
        .success,
    ).toBe(false);
    expect(
      configurationDraftSchema.safeParse({
        ...valid,
        effectiveUntil: "2026-07-14",
      }).success,
    ).toBe(false);
  });

  it("valida la respuesta tipada del estado versionado", () => {
    const version = {
      id: "11111111-1111-4111-8111-111111111111",
      version: 2,
      status: "draft",
      published_at: null,
      effective_from: "2026-07-15T00:00:00+00:00",
      effective_until: null,
      values: {
        "credit.minimum_down_payment_percentage": 20,
        "credit.maximum_term_months": 24,
        "credit.maximum_payment_income_percentage": 30,
        "credit.minimum_employment_months": 6,
        "credit.require_guarantor_below_score": 50,
      },
    };

    expect(
      configurationStateSchema.safeParse({ active: null, draft: version })
        .success,
    ).toBe(true);
    expect(
      configurationStateSchema.safeParse({
        active: null,
        draft: { ...version, version: 0 },
      }).success,
    ).toBe(false);
  });
});
