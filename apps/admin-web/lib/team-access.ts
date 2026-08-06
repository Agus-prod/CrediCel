export const INVITABLE_ROLE_NAMES = [
  "organization_admin",
  "branch_manager",
  "credit_analyst",
  "credit_manager",
  "salesperson",
  "cashier",
  "inventory_manager",
  "collections_agent",
  "auditor",
] as const;

const INVITABLE_ROLES = new Set<string>(INVITABLE_ROLE_NAMES);
const ORGANIZATION_SCOPED_ROLES = new Set([
  "organization_owner",
  "organization_admin",
  "auditor",
  "super_admin",
]);

export function isInvitableRole(roleName: string): boolean {
  return INVITABLE_ROLES.has(roleName);
}

export function roleRequiresBranch(roleName: string): boolean {
  return Boolean(roleName) && !ORGANIZATION_SCOPED_ROLES.has(roleName);
}
