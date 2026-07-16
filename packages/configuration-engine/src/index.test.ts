import { describe, expect, it } from "vitest";
import {
  AmbiguousConfigurationError,
  ConfigurationReferenceNotSupportedError,
  InvalidConfigurationValueError,
  resolveConfiguration,
  type Candidate,
} from "./index.js";

const now = new Date("2026-01-01T00:00:00Z");
const base: Candidate = {
  id: "global",
  key: "down_payment",
  value: 20,
  valueType: "number",
  scopeType: "organization",
  scopeId: "org",
  priority: 1,
  version: 1,
  versionId: "v1",
  versionStatus: "active",
  effectiveFrom: new Date("2025-01-01"),
  effectiveUntil: null,
  status: "active",
};
const context = {
  key: "down_payment",
  at: now,
  scopes: {
    organization: ["org"],
    brand: ["apple"],
    price_range: ["iphone-high"],
  },
  facts: { brand: "Apple", model: "iPhone 15", price: 30000 },
} as const;

describe("resolveConfiguration", () => {
  it("elige la regla más prioritaria y explica todas las evaluadas", () => {
    const apple: Candidate = {
      ...base,
      id: "apple",
      value: 30,
      scopeType: "brand",
      scopeId: "apple",
      priority: 10,
    };
    const result = resolveConfiguration([base, apple], context);
    expect(result.value).toBe(30);
    expect(result.evaluatedRules).toHaveLength(2);
    expect(result.explanation).toContain("brand");
  });

  it("usa precedencia canónica y no la especificidad proporcionada", () => {
    const brand: Candidate = {
      ...base,
      id: "brand",
      value: 30,
      scopeType: "brand",
      scopeId: "apple",
      priority: 10,
      specificity: 999,
    };
    const range: Candidate = {
      ...base,
      id: "range",
      value: 35,
      scopeType: "price_range",
      scopeId: "iphone-high",
      priority: 10,
      specificity: 0,
      scopeAttributes: {
        brand: "Apple",
        model: "iPhone 15",
        price: { min: 25000 },
      },
    };
    expect(resolveConfiguration([base, brand, range], context).value).toBe(35);
  });

  it("descarta un ámbito compuesto cuando no cumplen sus atributos", () => {
    const range: Candidate = {
      ...base,
      id: "range",
      value: 35,
      scopeType: "price_range",
      scopeId: "iphone-high",
      priority: 10,
      scopeAttributes: { price: { min: 35000 } },
    };
    expect(resolveConfiguration([base, range], context).value).toBe(20);
  });

  it("rechaza empates ambiguos", () => {
    expect(() =>
      resolveConfiguration([base, { ...base, id: "other" }], context),
    ).toThrow(AmbiguousConfigurationError);
  });

  it("valida el tipo declarado", () => {
    expect(() =>
      resolveConfiguration([{ ...base, value: "20" }], context),
    ).toThrow(InvalidConfigurationValueError);
  });

  it("rechaza referencias para que no puedan existir ciclos", () => {
    expect(() =>
      resolveConfiguration(
        [{ ...base, valueType: "json", value: { $ref: "other.key" } }],
        context,
      ),
    ).toThrow(ConfigurationReferenceNotSupportedError);
  });
});
