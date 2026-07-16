import { requireAnyRole } from "@/lib/authz";

export default async function AuditLayout({ children }: { readonly children: React.ReactNode }) {
  await requireAnyRole(["auditor", "organization_owner", "super_admin"]);
  return children;
}
