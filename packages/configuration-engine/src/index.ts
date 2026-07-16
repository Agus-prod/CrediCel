export type JsonPrimitive = string | number | boolean | null;
export type ConfigurationValue =
  | JsonPrimitive
  | readonly ConfigurationValue[]
  | Readonly<{ [key: string]: ConfigurationValue }>;
export type ValueType = "string" | "number" | "boolean" | "json";
export type ScopeType =
  | "organization"
  | "business_unit"
  | "branch"
  | "customer_type"
  | "category"
  | "brand"
  | "model"
  | "price_range"
  | "credit_product"
  | "campaign";
export type ScopeFact = string | number | boolean | readonly string[];

export const scopePrecedence: Readonly<Record<ScopeType, number>> = {
  organization: 0,
  business_unit: 10,
  branch: 20,
  customer_type: 30,
  category: 40,
  brand: 50,
  model: 60,
  price_range: 70,
  credit_product: 80,
  campaign: 90,
};

export interface Candidate {
  readonly id: string;
  readonly key: string;
  readonly value: ConfigurationValue;
  readonly valueType?: ValueType;
  readonly scopeType: ScopeType;
  readonly scopeId: string;
  readonly scopeAttributes?: Readonly<Record<string, ConfigurationValue>>;
  readonly priority: number;
  /** @deprecated La especificidad se calcula por scopeType para impedir precedencias manipulables. */
  readonly specificity?: number;
  readonly version: number;
  readonly versionId: string;
  readonly versionStatus?: "draft" | "active" | "retired";
  readonly effectiveFrom: Date;
  readonly effectiveUntil: Date | null;
  readonly status: "draft" | "active" | "retired";
}

export interface ResolveContext {
  readonly key: string;
  readonly at: Date;
  readonly scopes: Readonly<Partial<Record<ScopeType, readonly string[]>>>;
  readonly facts?: Readonly<Record<string, ScopeFact>>;
}

export interface Evaluation {
  readonly candidateId: string;
  readonly eligible: boolean;
  readonly reason: string;
}
export interface Resolution {
  readonly value: ConfigurationValue;
  readonly appliedRule: Candidate;
  readonly evaluatedRules: readonly Evaluation[];
  readonly explanation: string;
  readonly configurationVersionId: string;
}
export class AmbiguousConfigurationError extends Error {}
export class InvalidConfigurationValueError extends Error {}
export class ConfigurationReferenceNotSupportedError extends Error {}

function hasReference(value: ConfigurationValue): boolean {
  if (Array.isArray(value)) return value.some(hasReference);
  if (typeof value === "object" && value !== null) {
    if ("$ref" in value) return true;
    return Object.values(value).some(hasReference);
  }
  return false;
}

function valueMatchesType(
  value: ConfigurationValue,
  valueType: ValueType | undefined,
): boolean {
  if (!valueType || valueType === "json") return true;
  return typeof value === valueType;
}

function attributeMatches(
  expected: ConfigurationValue,
  actual: ScopeFact | undefined,
): boolean {
  if (actual === undefined) return false;
  if (Array.isArray(expected))
    return Array.isArray(actual)
      ? actual.some((item) => expected.includes(item))
      : expected.includes(actual);
  if (
    typeof expected === "object" &&
    expected !== null &&
    typeof actual === "number"
  ) {
    const minimum =
      "min" in expected && typeof expected.min === "number"
        ? expected.min
        : Number.NEGATIVE_INFINITY;
    const maximum =
      "max" in expected && typeof expected.max === "number"
        ? expected.max
        : Number.POSITIVE_INFINITY;
    return actual >= minimum && actual <= maximum;
  }
  if (Array.isArray(actual)) return actual.includes(String(expected));
  return actual === expected;
}

function scopeMatches(candidate: Candidate, context: ResolveContext): boolean {
  const explicitMatch =
    context.scopes[candidate.scopeType]?.includes(candidate.scopeId) ?? false;
  const attributes = candidate.scopeAttributes ?? {};
  const entries = Object.entries(attributes);
  if (entries.length === 0) return explicitMatch;
  return (
    explicitMatch &&
    entries.every(([key, expected]) =>
      attributeMatches(expected, context.facts?.[key]),
    )
  );
}

function sameRank(left: Candidate, right: Candidate): boolean {
  return (
    left.priority === right.priority &&
    scopePrecedence[left.scopeType] === scopePrecedence[right.scopeType] &&
    left.version === right.version
  );
}

export function resolveConfiguration(
  candidates: readonly Candidate[],
  context: ResolveContext,
): Resolution {
  const relevant = candidates.filter(
    (candidate) => candidate.key === context.key,
  );
  for (const candidate of relevant) {
    if (!valueMatchesType(candidate.value, candidate.valueType))
      throw new InvalidConfigurationValueError(
        `El valor ${candidate.id} no coincide con ${candidate.valueType}.`,
      );
    if (hasReference(candidate.value))
      throw new ConfigurationReferenceNotSupportedError(
        `La configuración ${candidate.id} contiene una referencia. Las referencias se rechazan para que no existan ciclos.`,
      );
  }

  const evaluatedRules = relevant.map((candidate) => {
    const candidateScopeMatches = scopeMatches(candidate, context);
    const dateMatches =
      candidate.effectiveFrom <= context.at &&
      (candidate.effectiveUntil === null ||
        context.at < candidate.effectiveUntil);
    const stateMatches =
      candidate.status === "active" &&
      (candidate.versionStatus === undefined ||
        candidate.versionStatus === "active");
    const eligible = candidateScopeMatches && dateMatches && stateMatches;
    const reason = eligible
      ? "Coincide en ámbito, atributos, vigencia y estado de versión."
      : [
          !candidateScopeMatches && "ámbito o atributos",
          !dateMatches && "vigencia",
          !stateMatches && "estado",
        ]
          .filter(Boolean)
          .join(", ") + " no coincide.";
    return { candidateId: candidate.id, eligible, reason };
  });
  const eligible = relevant
    .filter((candidate) =>
      evaluatedRules.some(
        (evaluation) =>
          evaluation.candidateId === candidate.id && evaluation.eligible,
      ),
    )
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        scopePrecedence[right.scopeType] - scopePrecedence[left.scopeType] ||
        right.version - left.version ||
        left.id.localeCompare(right.id),
    );
  const winner = eligible[0];
  if (!winner)
    throw new Error(`No existe configuración activa para ${context.key}.`);
  const competing = eligible[1];
  if (competing && sameRank(competing, winner))
    throw new AmbiguousConfigurationError(
      `Configuración ambigua para ${context.key}: ${winner.id}, ${competing.id}.`,
    );

  return {
    value: winner.value,
    appliedRule: winner,
    evaluatedRules,
    explanation: `Se aplicó ${winner.id}: prioridad ${winner.priority}, precedencia ${scopePrecedence[winner.scopeType]} (${winner.scopeType}) y versión ${winner.version}.`,
    configurationVersionId: winner.versionId,
  };
}
