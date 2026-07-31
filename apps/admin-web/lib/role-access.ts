const OWNER_IMPLIED_ROLES = new Set([
  "organization_admin",
  "branch_manager",
  "credit_analyst",
  "credit_manager",
  "salesperson",
  "cashier",
  "inventory_manager",
  "collections_agent",
  "auditor",
]);

export function canAccessAnyRole(
  assignedRoles: ReadonlySet<string> | readonly string[],
  allowedRoles: readonly string[],
): boolean {
  const assigned =
    assignedRoles instanceof Set ? assignedRoles : new Set(assignedRoles);

  if (allowedRoles.some((role) => assigned.has(role))) return true;

  return (
    assigned.has("organization_owner") &&
    allowedRoles.some((role) => OWNER_IMPLIED_ROLES.has(role))
  );
}
