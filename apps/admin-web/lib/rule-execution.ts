import {
  actionTypeSchema,
  executeRules,
  operatorSchema,
  scalarSchema,
  type Rule,
  type RuleResult,
  type Scalar,
} from "@credicel/business-rules";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const applicationIdSchema = z.string().uuid();

const databaseRuleSetSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  business_rules: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      priority: z.number().int(),
      enabled: z.boolean(),
      rule_conditions: z.array(
        z.object({
          field: z.string().min(1),
          operator: operatorSchema,
          operand: z.union([scalarSchema, z.array(scalarSchema)]),
          position: z.number().int().positive(),
        }),
      ),
      rule_actions: z.array(
        z.object({
          action_type: actionTypeSchema,
          value: scalarSchema,
          position: z.number().int().positive(),
        }),
      ),
    }),
  ),
});

export interface ApplicationRuleExecution {
  readonly ruleSetId: string;
  readonly version: number;
  readonly result: RuleResult;
}

export async function executeAndRecordApplicationRules(
  supabase: SupabaseClient,
  applicationId: string,
  inputFacts: Readonly<Record<string, Scalar>>,
): Promise<ApplicationRuleExecution | null> {
  const validatedApplicationId = applicationIdSchema.parse(applicationId);
  const { data, error } = await supabase
    .from("rule_sets")
    .select(
      "id,version,business_rules(id,name,priority,enabled,rule_conditions(field,operator,operand,position),rule_actions(action_type,value,position))",
    )
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar el conjunto de reglas: ${error.message}`,
    );
  }
  if (!data) return null;

  const ruleSet = databaseRuleSetSchema.parse(data);
  const rules: Rule[] = ruleSet.business_rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    enabled: rule.enabled,
    conditions: [...rule.rule_conditions]
      .sort((left, right) => left.position - right.position)
      .map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.operand,
      })),
    actions: [...rule.rule_actions]
      .sort((left, right) => left.position - right.position)
      .map((action) => ({
        type: action.action_type,
        value: action.value,
      })) as Rule["actions"],
  }));
  const result = executeRules(rules, inputFacts);
  const { error: recordError } = await supabase.rpc("record_rule_execution", {
    p_rule_set_id: ruleSet.id,
    p_subject_type: "credit_application",
    p_subject_id: validatedApplicationId,
    p_inputs: inputFacts,
    p_evaluations: result.evaluations,
    p_result: {
      recommendation_only: result.recommendationOnly,
      recommendations: result.recommendations,
      conflicts: result.conflicts,
      applied_rule_ids: result.appliedRuleIds,
      explanation: result.explanation,
    },
  });

  if (recordError) {
    throw new Error(
      `No se pudo auditar la ejecución de reglas: ${recordError.message}`,
    );
  }

  return { ruleSetId: ruleSet.id, version: ruleSet.version, result };
}
