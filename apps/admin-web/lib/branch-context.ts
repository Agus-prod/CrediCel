export const BRANCH_CONTEXT_COOKIE = "credicel_branch_context";
export const ALL_BRANCHES_CONTEXT = "all";

const globalScopeRoles = new Set([
  "organization_owner",
  "organization_admin",
  "credit_manager",
  "auditor",
  "super_admin",
]);

export function hasGlobalScope(roles: ReadonlySet<string>): boolean {
  return [...roles].some((role) => globalScopeRoles.has(role));
}
