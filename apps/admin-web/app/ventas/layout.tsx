import { requireAnyRole } from "@/lib/authz";
export default async function SalesLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  await requireAnyRole(["salesperson", "branch_manager", "organization_owner"]);
  return children;
}
