import { requireAnyRole } from "@/lib/authz";

export default async function InventoryLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  await requireAnyRole([
    "salesperson",
    "inventory_manager",
    "branch_manager",
    "organization_admin",
    "organization_owner",
    "super_admin",
  ]);
  return children;
}
