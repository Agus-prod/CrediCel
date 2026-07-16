import {
  resolveConfiguration,
  type ConfigurationValue,
  type ResolveContext,
  type Resolution,
  type ScopeType,
  type ValueType,
} from "@credicel/configuration-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const scopeTypeSchema = z.enum([
  "organization",
  "business_unit",
  "branch",
  "customer_type",
  "category",
  "brand",
  "model",
  "price_range",
  "credit_product",
  "campaign",
]);
const valueTypeSchema = z.enum(["string", "number", "boolean", "json"]);
const candidateRowSchema = z.object({
  id: z.string().uuid(),
  value: z.unknown(),
  priority: z.number().int(),
  effective_from: z.string().datetime({ offset: true }),
  effective_until: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(["draft", "active", "retired"]),
  configuration_definitions: z.object({
    key: z.string(),
    value_type: valueTypeSchema,
  }),
  configuration_scopes: z.object({
    scope_type: scopeTypeSchema,
    scope_id: z.string().uuid(),
    attributes: z.record(z.string(), z.unknown()),
  }),
  configuration_versions: z.object({
    id: z.string().uuid(),
    version: z.number().int(),
    status: z.enum(["draft", "active", "retired"]),
  }),
});

function asConfigurationValue(value: unknown): ConfigurationValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (Array.isArray(value)) return value.map(asConfigurationValue);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        asConfigurationValue(item),
      ]),
    );
  throw new Error(
    "La base devolvió un valor de configuración no serializable.",
  );
}

export async function resolveStoredConfiguration(
  supabase: SupabaseClient,
  context: ResolveContext,
): Promise<Resolution> {
  const { data, error } = await supabase
    .from("configuration_values")
    .select(
      "id,value,priority,effective_from,effective_until,status,configuration_definitions(key,value_type),configuration_scopes(scope_type,scope_id,attributes),configuration_versions(id,version,status)",
    )
    .eq("status", "active");
  if (error)
    throw new Error(`No se pudo cargar la configuración: ${error.message}`);

  const rows = candidateRowSchema.array().parse(data ?? []);
  return resolveConfiguration(
    rows.map((row) => ({
      id: row.id,
      key: row.configuration_definitions.key,
      value: asConfigurationValue(row.value),
      valueType: row.configuration_definitions.value_type as ValueType,
      scopeType: row.configuration_scopes.scope_type as ScopeType,
      scopeId: row.configuration_scopes.scope_id,
      scopeAttributes: Object.fromEntries(
        Object.entries(row.configuration_scopes.attributes).map(
          ([key, value]) => [key, asConfigurationValue(value)],
        ),
      ),
      priority: row.priority,
      version: row.configuration_versions.version,
      versionId: row.configuration_versions.id,
      versionStatus: row.configuration_versions.status,
      effectiveFrom: new Date(row.effective_from),
      effectiveUntil: row.effective_until
        ? new Date(row.effective_until)
        : null,
      status: row.status,
    })),
    context,
  );
}
