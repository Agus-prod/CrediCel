import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
type CookieWrite = {
  readonly name: string;
  readonly value: string;
  readonly options: CookieOptions;
};

const routeRoles: readonly (readonly [string, readonly string[]])[] = [
  [
    "/organizacion",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  ["/unidades", ["organization_admin", "organization_owner", "super_admin"]],
  ["/usuarios", ["organization_admin", "organization_owner", "super_admin"]],
  [
    "/configuracion",
    ["organization_admin", "organization_owner", "super_admin"],
  ],
  [
    "/proteccion",
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
  ["/auditoria", ["auditor", "organization_owner", "super_admin"]],
];

const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values: CookieWrite[]) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const publicPath = [
    "/login",
    "/registro-organizacion",
    "/recuperar-contrasena",
    "/nueva-contrasena",
    "/aceptar-invitacion",
  ].some((path) => request.nextUrl.pathname.startsWith(path));
  if (!user && !publicPath) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    return NextResponse.redirect(target);
  }
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const target = request.nextUrl.clone();
    target.pathname = "/";
    return NextResponse.redirect(target);
  }
  const routeRule = routeRoles.find(
    ([prefix]) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(`${prefix}/`),
  );
  if (user && routeRule) {
    const { data: assigned, error } = await supabase
      .from("profile_roles")
      .select("roles(name)")
      .eq("profile_id", user.id);
    const roles = new Set(
      (assigned ?? []).map((row) => relationName(row.roles)).filter(Boolean),
    );
    if (error || !routeRule[1].some((role) => roles.has(role))) {
      const target = request.nextUrl.clone();
      target.pathname = "/";
      target.search = "?denied=1";
      return NextResponse.redirect(target);
    }
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|registro-organizacion).*)",
  ],
};
