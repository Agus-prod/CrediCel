import { cookies } from "next/headers";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import {
  ALL_BRANCHES_CONTEXT,
  BRANCH_CONTEXT_COOKIE,
  hasGlobalScope,
} from "@/lib/branch-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { MobileNavigation, NavigationLinks } from "./mobile-navigation";

type NavItem = readonly [string, string, readonly string[]];
const items: readonly NavItem[] = [
  ["/", "Inicio", ["all"]],
  ["/ventas", "Nueva venta", ["salesperson", "branch_manager"]],
  ["/mis-ventas", "Mis ventas", ["salesperson"]],
  ["/clientes", "Mi cartera", ["salesperson"]],
  [
    "/clientes",
    "Clientes",
    [
      "branch_manager",
      "credit_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  [
    "/expedientes",
    "Expedientes",
    [
      "branch_manager",
      "credit_analyst",
      "credit_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
      "auditor",
    ],
  ],
  ["/solicitudes", "Mesa de análisis", ["credit_analyst", "credit_manager"]],
  ["/solicitudes", "Solicitudes de la tienda", ["branch_manager"]],
  [
    "/solicitudes",
    "Solicitudes",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  [
    "/creditos",
    "Créditos",
    [
      "branch_manager",
      "credit_manager",
      "collections_agent",
      "organization_admin",
      "organization_owner",
      "super_admin",
      "auditor",
    ],
  ],
  ["/inventario", "Dispositivos disponibles", ["salesperson"]],
  [
    "/inventario",
    "Dispositivos",
    [
      "inventory_manager",
      "branch_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  [
    "/transferencias",
    "Traslados",
    [
      "inventory_manager",
      "branch_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  [
    "/pagos",
    "Caja y pagos",
    [
      "cashier",
      "branch_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  [
    "/cobranza",
    "Cobranza",
    [
      "collections_agent",
      "credit_manager",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  [
    "/proteccion",
    "Protección de equipos",
    [
      "inventory_manager",
      "branch_manager",
      "credit_manager",
      "collections_agent",
      "organization_admin",
      "organization_owner",
      "super_admin",
    ],
  ],
  ["/reportes", "Reportes", ["organization_owner"]],
  [
    "/organizacion",
    "Tiendas",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  [
    "/unidades",
    "Unidades propietarias",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  [
    "/usuarios",
    "Equipo y accesos",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  ["/suscripcion", "Plan y suscripción", ["organization_owner"]],
  [
    "/configuracion",
    "Configuración",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  ["/auditoria", "Auditoría", ["auditor", "organization_owner", "super_admin"]],
];
const roleLabels: Readonly<Record<string, string>> = {
  organization_owner: "Propietario",
  organization_admin: "Administrador",
  branch_manager: "Gerente de tienda",
  credit_analyst: "Analista de crédito",
  credit_manager: "Jefe de crédito",
  salesperson: "Vendedor",
  cashier: "Caja",
  inventory_manager: "Inventario",
  collections_agent: "Cobranza",
  auditor: "Auditor",
  super_admin: "Superadministrador",
};
const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;

export async function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: assigned }, { data: branchAccess }] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("profile_roles")
          .select("roles(name)")
          .eq("profile_id", user.id),
        supabase
          .from("user_branch_access")
          .select("branches(id,name)")
          .eq("profile_id", user.id),
      ])
    : [{ data: null }, { data: [] }, { data: [] }];
  const roles = new Set(
    (assigned ?? [])
      .map((row) => relationName(row.roles))
      .filter((value): value is string => Boolean(value)),
  );
  const visible = items
    .filter(
      ([, , allowed]) =>
        allowed.includes("all") || allowed.some((role) => roles.has(role)),
    )
    .filter(
      (item, index, all) =>
        all.findIndex(([href]) => href === item[0]) === index,
    );
  const navigation = visible.map(([href, label]) => ({ href, label }));
  const globalScope = hasGlobalScope(roles);
  const cookieStore = await cookies();
  const savedContext = cookieStore.get(BRANCH_CONTEXT_COOKIE)?.value;
  const accessibleBranches = (branchAccess ?? [])
    .map((row) =>
      Array.isArray(row.branches) ? row.branches[0] : row.branches,
    )
    .filter((branch): branch is { id: string; name: string } =>
      Boolean(branch?.id && branch.name),
    );
  let selectedBranchName = accessibleBranches.find(
    (branch) => branch.id === savedContext,
  )?.name;
  if (globalScope && savedContext && savedContext !== ALL_BRANCHES_CONTEXT) {
    const { data: selectedBranch } = await supabase
      .from("branches")
      .select("name")
      .eq("id", savedContext)
      .eq("status", "active")
      .maybeSingle();
    selectedBranchName = selectedBranch?.name;
  }
  const scopeLabel = selectedBranchName
    ? selectedBranchName
    : globalScope
      ? "Toda mi organización"
      : accessibleBranches.length > 1
        ? "Mis tiendas autorizadas"
        : accessibleBranches[0]?.name || "Sin tienda asignada";
  const roleSummary =
    [...roles].map((role) => roleLabels[role] ?? role).join(" · ") ||
    "Sin rol asignado";
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <aside className="sidebar">
        <div className="sidebar-heading">
          <div className="logo">
            Credi<span>Cel</span>
          </div>
          <MobileNavigation items={navigation} />
        </div>
        <div className="user-chip">
          <div className="avatar">{profile?.full_name?.slice(0, 1) ?? "C"}</div>
          <div>
            <strong>{profile?.full_name ?? "Equipo CrediCel"}</strong>
            <small>{roleSummary}</small>
          </div>
        </div>
        <NavigationLinks items={navigation} label="Navegación principal" />
        <form action={logout}>
          <button className="logout" type="submit">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="main" id="main-content" tabIndex={-1}>
        <header className="top">
          <div>
            <div className="eyebrow">Centro de operaciones</div>
            <div className="brand-title">CrediCel</div>
          </div>
          <Link
            aria-label={`Cambiar vista. Vista actual: ${scopeLabel}`}
            className="scope-chip"
            href="/seleccionar"
          >
            <small>Vista actual</small>
            <strong>{scopeLabel}</strong>
          </Link>
        </header>
        <div className="content-enter">{children}</div>
        <footer>
          Desarrollado por <strong>CrediCel</strong> · Tecnología que impulsa
          oportunidades
        </footer>
      </main>
    </div>
  );
}
