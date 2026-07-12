export type Scalar = string | number | boolean;
export type Operator = "equals"|"not_equals"|"greater_than"|"greater_than_or_equal"|"less_than"|"less_than_or_equal"|"in"|"not_in"|"between";
export type ActionType = "set_minimum_down_payment"|"set_maximum_term"|"set_interest_rate"|"require_document"|"require_supervisor_approval"|"reject_application"|"add_warning";
export interface Condition { readonly field: string; readonly operator: Operator; readonly value: Scalar | readonly Scalar[]; }
export interface Action { readonly type: ActionType; readonly value: Scalar; }
export interface Rule { readonly id: string; readonly name: string; readonly priority: number; readonly conditions: readonly Condition[]; readonly actions: readonly Action[]; readonly enabled: boolean; }
export interface RuleEvaluation { readonly ruleId: string; readonly matched: boolean; readonly conditionResults: readonly boolean[]; }
export interface RuleResult { readonly actions: readonly Action[]; readonly evaluations: readonly RuleEvaluation[]; readonly explanation: string; }
function compare(actual: Scalar | undefined, condition: Condition): boolean {
  if (actual === undefined) return false;
  const expected = condition.value;
  switch (condition.operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "greater_than": return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "greater_than_or_equal": return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "less_than": return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "less_than_or_equal": return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in": return Array.isArray(expected) && expected.includes(actual);
    case "not_in": return Array.isArray(expected) && !expected.includes(actual);
    case "between": return typeof actual === "number" && Array.isArray(expected) && expected.length === 2 && typeof expected[0] === "number" && typeof expected[1] === "number" && actual >= expected[0] && actual <= expected[1];
  }
}
export function executeRules(rules: readonly Rule[], facts: Readonly<Record<string,Scalar>>): RuleResult {
  const ordered = [...rules].filter((rule) => rule.enabled).sort((a,b) => b.priority-a.priority || a.id.localeCompare(b.id));
  const evaluations = ordered.map((rule) => { const conditionResults = rule.conditions.map((condition) => compare(facts[condition.field], condition)); return { ruleId: rule.id, matched: conditionResults.every(Boolean), conditionResults }; });
  const matched = new Set(evaluations.filter((item) => item.matched).map((item) => item.ruleId));
  const actions = ordered.filter((rule) => matched.has(rule.id)).flatMap((rule) => rule.actions);
  return { actions, evaluations, explanation: `${matched.size} de ${ordered.length} reglas aplicadas en orden de prioridad.` };
}
