import { describe, expect, it } from "vitest";

import { canAccessAnyRole } from "./role-access";

describe("canAccessAnyRole", () => {
  it("lets an organization owner perform operational work", () => {
    expect(
      canAccessAnyRole(new Set(["organization_owner"]), ["salesperson"]),
    ).toBe(true);
    expect(
      canAccessAnyRole(new Set(["organization_owner"]), ["cashier"]),
    ).toBe(true);
  });

  it("does not turn an organization owner into a platform super admin", () => {
    expect(
      canAccessAnyRole(new Set(["organization_owner"]), ["super_admin"]),
    ).toBe(false);
  });

  it("keeps regular roles scoped to their assigned responsibilities", () => {
    expect(canAccessAnyRole(["salesperson"], ["salesperson"])).toBe(true);
    expect(canAccessAnyRole(["salesperson"], ["cashier"])).toBe(false);
  });
});
