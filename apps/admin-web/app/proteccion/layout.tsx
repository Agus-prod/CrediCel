import { requireAnyRole } from "@/lib/authz";

export default async function DeviceProtectionLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  await requireAnyRole([
    "inventory_manager",
    "branch_manager",
    "credit_manager",
    "collections_agent",
    "organization_admin",
    "organization_owner",
    "super_admin",
  ]);
  return children;
}
