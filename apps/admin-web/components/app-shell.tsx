import Link from "next/link";
import { logout } from "@/app/login/actions";
import { createServerSupabase } from "@/lib/supabase/server";

const items = [
  ["/", "Dashboard", ["all"]], ["/clientes", "Clientes", ["salesperson", "branch_manager", "credit_analyst", "credit_manager", "organization_admin", "super_admin"]],
  ["/expedientes", "Expedientes", ["salesperson", "credit_analyst", "credit_manager", "organization_admin", "super_admin"]], ["/solicitudes", "Solicitudes", ["salesperson", "credit_analyst", "credit_manager", "branch_manager", "organization_admin", "super_admin"]],
  ["/creditos", "Créditos", ["credit_analyst", "credit_manager", "collections_agent", "organization_admin", "super_admin"]], ["/inventario", "Inventario", ["inventory_manager", "branch_manager", "salesperson", "organization_admin", "super_admin"]],
  ["/transferencias", "Transferencias", ["inventory_manager", "branch_manager", "organization_admin", "super_admin"]], ["/pagos", "Pagos", ["cashier", "credit_manager", "organization_admin", "super_admin"]],
  ["/cobranza", "Cobranza", ["collections_agent", "credit_manager", "organization_admin", "super_admin"]], ["/organizacion", "Organización", ["organization_admin", "super_admin"]],
  ["/usuarios", "Usuarios y accesos", ["organization_admin", "super_admin"]], ["/configuracion", "Configuración", ["organization_admin", "super_admin"]], ["/auditoria", "Auditoría", ["auditor", "organization_admin", "super_admin"]],
] as const;

export async function AppShell({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name").eq("id", user.id).single() : { data: null };
  const { data: assigned } = user ? await supabase.from("profile_roles").select("roles(name)").eq("profile_id", user.id) : { data: [] };
  const relation = assigned?.[0]?.roles;
  const role = relation?.[0]?.name ?? "salesperson";
  const visible = items.filter(([, , roles]) => (roles as readonly string[]).includes("all") || (roles as readonly string[]).includes(role));
  return <div className="shell"><aside className="sidebar"><div className="logo">Credi<span>Cel</span></div><div className="user-chip"><div className="avatar">{profile?.full_name?.slice(0, 1) ?? "C"}</div><div><strong>{profile?.full_name ?? "Equipo CrediCel"}</strong><small>{role.replaceAll("_", " ")}</small></div></div><nav>{visible.map(([href, label]) => <Link className="navlink" href={href} key={href}>{label}</Link>)}</nav><form action={logout}><button className="logout" type="submit">Cerrar sesión</button></form></aside><main className="main"><header className="top"><div><div className="eyebrow">Centro de operaciones</div><h1>CrediCel</h1></div><select className="context" aria-label="Punto de venta"><option>Toda la organización</option><option>Centro Tegucigalpa</option><option>Comayagüela</option></select></header><div className="content-enter">{children}</div><footer>Desarrollado por <strong>CrediCel</strong> · Tecnología que impulsa oportunidades</footer></main></div>;
}
