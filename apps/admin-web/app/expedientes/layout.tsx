import { requireAnyRole } from "@/lib/authz";

export default async function DossiersLayout({ children }: { readonly children: React.ReactNode }) {
  await requireAnyRole(["credit_analyst", "credit_manager", "branch_manager", "organization_admin", "organization_owner", "super_admin", "auditor"]);
  return children;
}
