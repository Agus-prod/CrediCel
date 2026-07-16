import { requireAnyRole } from "@/lib/authz";

export default async function BusinessUnitsLayout({ children }: { readonly children: React.ReactNode }) {
  await requireAnyRole(["organization_admin", "organization_owner", "super_admin"]);
  return children;
}
