import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import {
  ALL_BRANCHES_CONTEXT,
  BRANCH_CONTEXT_COOKIE,
  hasGlobalScope,
} from "@/lib/branch-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { completePendingOrganizationOnboarding } from "@/lib/organization-onboarding.server";
import { canAccessAnyRole } from "@/lib/role-access";
import { MobileNavigation, NavigationLinks } from "./mobile-navigation";

type NavItem = readonly [string, string, readonly string[]];
const items: readonly NavItem[] = [
  ["/", "Inicio", ["all"]],
  ["/ventas", "Nueva venta", ["salesperson", "branch_manager"]],
  ["/mis-ventas", "Mis solicitudes", ["salesperson", "branch_manager"]],
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
  ["/clientes", "Mi cartera", ["salesperson"]],
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
  [
    "/solicitudes",
    "Solicitudes",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  ["/solicitudes", "Mesa de análisis", ["credit_analyst", "credit_manager"]],
  ["/solicitudes", "Solicitudes de la tienda", ["branch_manager"]],
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
  ["/inventario", "Dispositivos disponibles", ["salesperson"]],
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
    "/documentos-legales",
    "Documentos y políticas",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
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
  scopeOverride,
}: {
  readonly children: React.ReactNode;
  readonly scopeOverride?: {
    readonly eyebrow: string;
    readonly label: string;
  };
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: profile },
    { data: assigned },
    { data: branchAccess },
    { data: isPlatformOperator },
  ] = user
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
        supabase.rpc("is_platform_operator"),
      ])
    : [{ data: null }, { data: [] }, { data: [] }, { data: false }];
  if (user && !profile) {
    const recovery = await completePendingOrganizationOnboarding(
      supabase,
      user,
    );
    if (recovery.completed) redirect("/seleccionar");
  }
  const roles = new Set(
    (assigned ?? [])
      .map((row) => relationName(row.roles))
      .filter((value): value is string => Boolean(value)),
  );
  const visible = items
    .filter(
      ([, , allowed]) =>
        allowed.includes("all") || canAccessAnyRole(roles, allowed),
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
  const visibleScopeLabel = scopeOverride?.label ?? scopeLabel;
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
          <div className="brand-lockup">
            <div className="logo">
              Credi<span>Cel</span>
            </div>
            <small>Crédito en movimiento</small>
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
        {isPlatformOperator ? (
          <Link className="platform-entry" href="/operacion">
            Cuenta maestra CrediCel
          </Link>
        ) : null}
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
            <span className="system-status">
              <i /> Operación protegida
            </span>
          </div>
          {scopeOverride ? (
            <div className="scope-chip scope-chip-static">
              <small>{scopeOverride.eyebrow}</small>
              <strong>{visibleScopeLabel}</strong>
            </div>
          ) : (
            <Link
              aria-label={`Cambiar vista. Vista actual: ${visibleScopeLabel}`}
              className="scope-chip"
              href="/seleccionar"
            >
              <small>Vista actual</small>
              <strong>{visibleScopeLabel}</strong>
            </Link>
          )}
        </header>
        <div className="content-enter">{children}</div>
        <footer>
          <span>
            Desarrollado por <strong>CrediCel</strong> · Tecnología que impulsa
            oportunidades
          </span>
          <span className="footer-security">
            <ShieldCheck aria-hidden="true" size={14} /> Acceso protegido
          </span>
        </footer>
      </main>
    </div>
  );
}
