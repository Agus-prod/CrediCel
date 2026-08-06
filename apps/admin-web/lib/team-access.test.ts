import { describe, expect, it } from "vitest";

import { isInvitableRole, roleRequiresBranch } from "./team-access";

describe("team access", () => {
  it("requires a store for operational roles", () => {
    expect(roleRequiresBranch("salesperson")).toBe(true);
    expect(roleRequiresBranch("branch_manager")).toBe(true);
    expect(roleRequiresBranch("cashier")).toBe(true);
  });

  it("keeps administrative roles organization-scoped", () => {
    expect(roleRequiresBranch("organization_owner")).toBe(false);
    expect(roleRequiresBranch("organization_admin")).toBe(false);
    expect(roleRequiresBranch("auditor")).toBe(false);
  });

  it("rejects roles that cannot be invited", () => {
    expect(isInvitableRole("salesperson")).toBe(true);
    expect(isInvitableRole("organization_owner")).toBe(false);
    expect(isInvitableRole("super_admin")).toBe(false);
  });
});
