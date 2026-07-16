import { requireAnyRole } from "@/lib/authz";

export default async function CustomersLayout({ children }: { readonly children: React.ReactNode }) {
  await requireAnyRole(["salesperson", "branch_manager", "credit_analyst", "credit_manager", "organization_admin", "organization_owner", "super_admin", "auditor"]);
  return children;
}
