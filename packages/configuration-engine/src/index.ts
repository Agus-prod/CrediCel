export type ConfigurationValue = string | number | boolean | Readonly<Record<string,unknown>>;
export type ScopeType = "organization"|"business_unit"|"branch"|"customer_type"|"category"|"brand"|"model"|"price_range"|"credit_product"|"campaign";
export interface Candidate { readonly id: string; readonly key: string; readonly value: ConfigurationValue; readonly scopeType: ScopeType; readonly scopeId: string; readonly priority: number; readonly specificity: number; readonly version: number; readonly versionId: string; readonly effectiveFrom: Date; readonly effectiveUntil: Date | null; readonly status: "draft"|"active"|"retired"; }
export interface ResolveContext { readonly key: string; readonly at: Date; readonly scopes: Readonly<Partial<Record<ScopeType,readonly string[]>>>; }
export interface Evaluation { readonly candidateId: string; readonly eligible: boolean; readonly reason: string; }
export interface Resolution { readonly value: ConfigurationValue; readonly appliedRule: Candidate; readonly evaluatedRules: readonly Evaluation[]; readonly explanation: string; readonly configurationVersionId: string; }
export class AmbiguousConfigurationError extends Error {}
export function resolveConfiguration(candidates: readonly Candidate[], context: ResolveContext): Resolution {
  const evaluatedRules = candidates.filter((candidate)=>candidate.key===context.key).map((candidate)=>{ const scopeMatches=context.scopes[candidate.scopeType]?.includes(candidate.scopeId) ?? false; const dateMatches=candidate.effectiveFrom<=context.at && (candidate.effectiveUntil===null || context.at<candidate.effectiveUntil); const eligible=candidate.status==="active"&&scopeMatches&&dateMatches; return {candidateId:candidate.id,eligible,reason:eligible?"Coincide en ámbito, vigencia y estado":"No coincide en ámbito, vigencia o estado"}; });
  const eligible=candidates.filter((candidate)=>evaluatedRules.some((evaluation)=>evaluation.candidateId===candidate.id&&evaluation.eligible)).sort((a,b)=>b.priority-a.priority||b.specificity-a.specificity||b.version-a.version||a.id.localeCompare(b.id));
  const winner=eligible[0]; if (!winner) throw new Error(`No active configuration found for ${context.key}`);
  const competing=eligible[1]; if (competing&&competing.priority===winner.priority&&competing.specificity===winner.specificity&&competing.version===winner.version) throw new AmbiguousConfigurationError(`Ambiguous configuration for ${context.key}: ${winner.id}, ${competing.id}`);
  return {value:winner.value,appliedRule:winner,evaluatedRules,explanation:`Se aplicó ${winner.id} por prioridad ${winner.priority}, especificidad ${winner.specificity} y versión ${winner.version}.`,configurationVersionId:winner.versionId};
}
