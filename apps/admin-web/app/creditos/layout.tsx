import { requireAnyRole } from "@/lib/authz";

export default async function CreditsLayout({ children }: { readonly children: React.ReactNode }) {
  await requireAnyRole(["credit_manager", "branch_manager", "collections_agent", "organization_admin", "organization_owner", "super_admin", "auditor"]);
  return children;
}
