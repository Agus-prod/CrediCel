import { describe, expect, it } from "vitest";
import { initialApplicationForm } from "./types";
import { applicationSchema } from "./validation";

const valid = {
  ...initialApplicationForm,
  branchId: "10000000-0000-4000-8000-000000000001",
  inventoryUnitId: "20000000-0000-4000-8000-000000000001",
  dni: "0801199912345",
  firstName: "Ana",
  lastName: "López",
  phone: "99990000",
  requestedPrice: "15000",
  downPayment: "3000",
  term: "12",
  birthDate: "1995-05-10",
  currentAddress: "Barrio Centro",
  employerName: "Comercio propio",
  monthlyIncome: "18000",
  monthlyExpenses: "7000",
  employmentMonths: "24",
  referenceOneName: "María López",
  referenceOnePhone: "99991111",
  referenceOneRelationship: "Hermana",
  referenceTwoName: "José Pérez",
  referenceTwoPhone: "99992222",
  referenceTwoRelationship: "Amigo",
  consentDataProcessing: true,
  consentCreditReview: true,
} as const;

describe("applicationSchema", () => {
  it("acepta una solicitud completa", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("exige ambos consentimientos", () => {
    expect(
      applicationSchema.safeParse({
        ...valid,
        consentCreditReview: false,
      }).success,
    ).toBe(false);
  });

  it("rechaza gastos iguales o superiores al ingreso", () => {
    expect(
      applicationSchema.safeParse({
        ...valid,
        monthlyExpenses: valid.monthlyIncome,
      }).success,
    ).toBe(false);
  });
});
