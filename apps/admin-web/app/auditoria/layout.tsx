import { requireAnyRole } from "@/lib/authz";

export default async function AuditLayout({ children }: { readonly children: React.ReactNode }) {
  const { roles, supabase } = await requireAnyRole(["auditor", "organization_owner", "super_admin"]);
  if (!roles.includes("super_admin")) {
    const { data: enabled } = await supabase.rpc("has_subscription_feature", { p_feature: "advanced_audit" });
    if (!enabled) {
      const { redirect } = await import("next/navigation");
      redirect("/suscripcion?error=La+auditoría+avanzada+requiere+el+plan+Negocio+o+Red");
    }
  }
  return children;
}
