import { z } from "zod";

export const scalarSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const operatorSchema = z.enum([
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "in",
  "not_in",
  "between",
]);

export const actionTypeSchema = z.enum([
  "set_minimum_down_payment",
  "set_maximum_term",
  "set_interest_rate",
  "require_document",
  "require_supervisor_approval",
  "reject_application",
  "add_warning",
]);

export type Scalar = z.infer<typeof scalarSchema>;
export type Operator = z.infer<typeof operatorSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;

const conditionValueSchema = z.union([scalarSchema, z.array(scalarSchema)]);

export const conditionSchema = z
  .object({
    field: z.string().trim().min(1),
    operator: operatorSchema,
    value: conditionValueSchema,
  })
  .superRefine((condition, context) => {
    const { operator, value } = condition;

    if (
      (operator === "equals" || operator === "not_equals") &&
      Array.isArray(value)
    ) {
      context.addIssue({
        code: "custom",
        message: `${operator} requiere un valor escalar.`,
        path: ["value"],
      });
    }

    if (
      [
        "greater_than",
        "greater_than_or_equal",
        "less_than",
        "less_than_or_equal",
      ].includes(operator) &&
      typeof value !== "number"
    ) {
      context.addIssue({
        code: "custom",
        message: `${operator} requiere un valor numérico.`,
        path: ["value"],
      });
    }

    if (
      (operator === "in" || operator === "not_in") &&
      (!Array.isArray(value) || value.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: `${operator} requiere una lista no vacía.`,
        path: ["value"],
      });
    }

    if (operator === "between") {
      const isValidRange =
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "number" &&
        typeof value[1] === "number" &&
        value[0] <= value[1];

      if (!isValidRange) {
        context.addIssue({
          code: "custom",
          message: "between requiere dos límites numéricos ordenados.",
          path: ["value"],
        });
      }
    }
  });

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set_minimum_down_payment"),
    value: z.number().finite().nonnegative(),
  }),
  z.object({
    type: z.literal("set_maximum_term"),
    value: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("set_interest_rate"),
    value: z.number().finite().nonnegative(),
  }),
  z.object({
    type: z.literal("require_document"),
    value: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("require_supervisor_approval"),
    value: z.literal(true),
  }),
  z.object({
    type: z.literal("reject_application"),
    value: z.literal(true),
  }),
  z.object({
    type: z.literal("add_warning"),
    value: z.string().trim().min(1),
  }),
]);

export const ruleSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  priority: z.number().int(),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1),
  enabled: z.boolean(),
});

export const ruleCollectionSchema = z
  .array(ruleSchema)
  .superRefine((rules, context) => {
    const identifiers = new Set<string>();

    for (const [index, rule] of rules.entries()) {
      if (identifiers.has(rule.id)) {
        context.addIssue({
          code: "custom",
          message: `El identificador de regla ${rule.id} está duplicado.`,
          path: [index, "id"],
        });
      }
      identifiers.add(rule.id);
    }
  });

export const factsSchema = z.record(z.string(), scalarSchema);

export interface Condition {
  readonly field: string;
  readonly operator: Operator;
  readonly value: Scalar | readonly Scalar[];
}

export type Action = z.infer<typeof actionSchema>;
export type Recommendation = Action;

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly conditions: readonly Condition[];
  readonly actions: readonly Action[];
  readonly enabled: boolean;
}

export interface RuleEvaluation {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly matched: boolean;
  readonly conditionResults: readonly boolean[];
}

export interface RuleConflict {
  readonly actionType:
    "set_minimum_down_payment" | "set_maximum_term" | "set_interest_rate";
  readonly priority: number;
  readonly ruleIds: readonly string[];
  readonly values: readonly number[];
  readonly explanation: string;
}

export interface RuleResult {
  readonly recommendationOnly: true;
  readonly recommendations: readonly Recommendation[];
  readonly evaluations: readonly RuleEvaluation[];
  readonly conflicts: readonly RuleConflict[];
  readonly appliedRuleIds: readonly string[];
  readonly explanation: string;
}

function compare(actual: Scalar | undefined, condition: Condition): boolean {
  if (actual === undefined) return false;

  const expected = condition.value;
  switch (condition.operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );
    case "greater_than_or_equal":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );
    case "less_than":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );
    case "less_than_or_equal":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);
    case "between":
      return (
        typeof actual === "number" &&
        Array.isArray(expected) &&
        expected.length === 2 &&
        typeof expected[0] === "number" &&
        typeof expected[1] === "number" &&
        actual >= expected[0] &&
        actual <= expected[1]
      );
  }
}

const exclusiveActionTypes = [
  "set_minimum_down_payment",
  "set_maximum_term",
  "set_interest_rate",
] as const;

type ExclusiveActionType = (typeof exclusiveActionTypes)[number];

const isExclusiveActionType = (
  actionType: ActionType,
): actionType is ExclusiveActionType =>
  exclusiveActionTypes.some((candidate) => candidate === actionType);

const sameValue = (left: Scalar, right: Scalar) => left === right;

function hasRecommendation(
  recommendations: readonly Recommendation[],
  candidate: Recommendation,
): boolean {
  return recommendations.some(
    (recommendation) =>
      recommendation.type === candidate.type &&
      sameValue(recommendation.value, candidate.value),
  );
}

export function executeRules(
  inputRules: readonly Rule[],
  inputFacts: Readonly<Record<string, Scalar>>,
): RuleResult {
  const rules = ruleCollectionSchema.parse(inputRules);
  const facts = factsSchema.parse(inputFacts);
  const orderedRules = rules
    .filter((rule) => rule.enabled)
    .sort(
      (left, right) =>
        right.priority - left.priority || left.id.localeCompare(right.id),
    );

  const evaluations = orderedRules.map((rule) => {
    const conditionResults = rule.conditions.map((condition) =>
      compare(facts[condition.field], condition),
    );
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: conditionResults.every(Boolean),
      conditionResults,
    };
  });

  const matchedRuleIds = new Set(
    evaluations
      .filter((evaluation) => evaluation.matched)
      .map((evaluation) => evaluation.ruleId),
  );
  const matchedRules = orderedRules.filter((rule) =>
    matchedRuleIds.has(rule.id),
  );
  const conflicts: RuleConflict[] = [];

  for (const actionType of exclusiveActionTypes) {
    const candidates = matchedRules.flatMap((rule) =>
      rule.actions
        .filter((action) => action.type === actionType)
        .map((action) => ({ action, rule })),
    );
    const highestPriority = candidates[0]?.rule.priority;
    if (highestPriority === undefined) continue;

    const highestPriorityCandidates = candidates.filter(
      (candidate) => candidate.rule.priority === highestPriority,
    );
    const distinctValues = [
      ...new Set(
        highestPriorityCandidates.map(({ action }) => {
          if (typeof action.value !== "number") {
            throw new TypeError(`${actionType} requiere un valor numérico.`);
          }
          return action.value;
        }),
      ),
    ];

    if (distinctValues.length > 1) {
      const ruleIds = highestPriorityCandidates.map(({ rule }) => rule.id);
      conflicts.push({
        actionType,
        priority: highestPriority,
        ruleIds,
        values: distinctValues,
        explanation: `Se omitió ${actionType}: las reglas ${ruleIds.join(", ")} recomiendan valores distintos con prioridad ${highestPriority}.`,
      });
    }
  }

  const conflictedActionTypes = new Set(
    conflicts.map((conflict) => conflict.actionType),
  );
  const selectedExclusiveTypes = new Set<ExclusiveActionType>();
  const recommendations: Recommendation[] = [];

  for (const rule of matchedRules) {
    for (const action of rule.actions) {
      if (isExclusiveActionType(action.type)) {
        if (
          conflictedActionTypes.has(action.type) ||
          selectedExclusiveTypes.has(action.type)
        ) {
          continue;
        }
        selectedExclusiveTypes.add(action.type);
      }

      if (!hasRecommendation(recommendations, action)) {
        recommendations.push(action);
      }
    }
  }

  if (conflicts.length > 0) {
    const supervisorReview: Recommendation = {
      type: "require_supervisor_approval",
      value: true,
    };
    if (!hasRecommendation(recommendations, supervisorReview)) {
      recommendations.push(supervisorReview);
    }

    for (const conflict of conflicts) {
      const warning: Recommendation = {
        type: "add_warning",
        value: `Conflicto de reglas en ${conflict.actionType}; se requiere revisión humana.`,
      };
      if (!hasRecommendation(recommendations, warning)) {
        recommendations.push(warning);
      }
    }
  }

  const appliedRuleIds = matchedRules.map((rule) => rule.id);
  const conflictExplanation =
    conflicts.length > 0
      ? ` Se detectaron ${conflicts.length} conflictos; sus recomendaciones se omitieron y se solicitó revisión humana.`
      : "";

  return {
    recommendationOnly: true,
    recommendations,
    evaluations,
    conflicts,
    appliedRuleIds,
    explanation:
      appliedRuleIds.length === 0
        ? `Ninguna de las ${orderedRules.length} reglas activas coincidió.`
        : `${appliedRuleIds.length} de ${orderedRules.length} reglas activas coincidieron. El resultado contiene recomendaciones y nunca una aprobación automática.${conflictExplanation}`,
  };
}
