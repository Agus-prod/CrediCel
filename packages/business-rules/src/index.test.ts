import { describe, expect, it } from "vitest";
import { executeRules, type Operator, type Rule } from "./index.js";

const rule = (overrides: Partial<Rule> & Pick<Rule, "id">): Rule => ({
  id: overrides.id,
  name: overrides.name ?? overrides.id,
  priority: overrides.priority ?? 1,
  enabled: overrides.enabled ?? true,
  conditions: overrides.conditions ?? [
    { field: "price", operator: "greater_than", value: 100 },
  ],
  actions: overrides.actions ?? [{ type: "add_warning", value: overrides.id }],
});

describe("executeRules", () => {
  it("evalúa todos los operadores sin código dinámico", () => {
    const cases: readonly [Operator, number | readonly number[], boolean][] = [
      ["equals", 10, true],
      ["not_equals", 11, true],
      ["greater_than", 9, true],
      ["greater_than_or_equal", 10, true],
      ["less_than", 11, true],
      ["less_than_or_equal", 10, true],
      ["in", [8, 10], true],
      ["not_in", [8, 9], true],
      ["between", [9, 11], true],
    ];

    for (const [operator, value, expected] of cases) {
      const result = executeRules(
        [
          rule({
            id: operator,
            conditions: [{ field: "score", operator, value }],
          }),
        ],
        { score: 10 },
      );
      expect(result.evaluations[0]?.matched).toBe(expected);
    }
  });

  it("conserva recomendaciones acumulativas en orden de prioridad", () => {
    const result = executeRules(
      [
        rule({
          id: "base",
          priority: 1,
          actions: [{ type: "add_warning", value: "base" }],
        }),
        rule({
          id: "priority",
          priority: 10,
          conditions: [{ field: "brand", operator: "equals", value: "Apple" }],
          actions: [{ type: "require_document", value: "income_proof" }],
        }),
      ],
      { price: 25_000, brand: "Apple" },
    );

    expect(result.recommendations).toEqual([
      { type: "require_document", value: "income_proof" },
      { type: "add_warning", value: "base" },
    ]);
    expect(result.appliedRuleIds).toEqual(["priority", "base"]);
  });

  it("elige el setter recomendado por la regla de mayor prioridad", () => {
    const result = executeRules(
      [
        rule({
          id: "global",
          priority: 1,
          actions: [{ type: "set_minimum_down_payment", value: 20 }],
        }),
        rule({
          id: "high-value",
          priority: 20,
          actions: [{ type: "set_minimum_down_payment", value: 35 }],
        }),
      ],
      { price: 25_000 },
    );

    expect(result.recommendations).toEqual([
      { type: "set_minimum_down_payment", value: 35 },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it("resuelve un empate conflictivo de forma conservadora y auditable", () => {
    const result = executeRules(
      [
        rule({
          id: "a",
          priority: 10,
          actions: [{ type: "set_maximum_term", value: 12 }],
        }),
        rule({
          id: "b",
          priority: 10,
          actions: [{ type: "set_maximum_term", value: 18 }],
        }),
      ],
      { price: 25_000 },
    );

    expect(result.conflicts).toEqual([
      expect.objectContaining({
        actionType: "set_maximum_term",
        priority: 10,
        ruleIds: ["a", "b"],
        values: [12, 18],
      }),
    ]);
    expect(result.recommendations).not.toContainEqual(
      expect.objectContaining({ type: "set_maximum_term" }),
    );
    expect(result.recommendations).toContainEqual({
      type: "require_supervisor_approval",
      value: true,
    });
    expect(result.recommendations).toContainEqual(
      expect.objectContaining({ type: "add_warning" }),
    );
  });

  it("deduplica setters idénticos con la misma prioridad", () => {
    const result = executeRules(
      [
        rule({
          id: "a",
          priority: 10,
          actions: [{ type: "set_interest_rate", value: 18 }],
        }),
        rule({
          id: "b",
          priority: 10,
          actions: [{ type: "set_interest_rate", value: 18 }],
        }),
      ],
      { price: 25_000 },
    );

    expect(result.conflicts).toEqual([]);
    expect(result.recommendations).toEqual([
      { type: "set_interest_rate", value: 18 },
    ]);
  });

  it("rechaza reglas semánticamente inválidas y ids duplicados", () => {
    expect(() =>
      executeRules(
        [
          {
            ...rule({ id: "invalid" }),
            actions: [{ type: "require_supervisor_approval", value: false }],
          } as unknown as Rule,
        ],
        { price: 25_000 },
      ),
    ).toThrow();

    expect(() =>
      executeRules([rule({ id: "duplicate" }), rule({ id: "duplicate" })], {
        price: 25_000,
      }),
    ).toThrow();
  });

  it("solo devuelve recomendaciones, incluso cuando sugiere rechazar", () => {
    const result = executeRules(
      [
        rule({
          id: "risk",
          actions: [{ type: "reject_application", value: true }],
        }),
      ],
      { price: 25_000 },
    );

    expect(result.recommendationOnly).toBe(true);
    expect(result.recommendations).toEqual([
      { type: "reject_application", value: true },
    ]);
    expect(result).not.toHaveProperty("approved");
    expect(result).not.toHaveProperty("decision");
    expect(result).not.toHaveProperty("actions");
  });
});
