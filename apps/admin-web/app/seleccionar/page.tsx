import { cookies } from "next/headers";
import Link from "next/link";
import {
  ALL_BRANCHES_CONTEXT,
  BRANCH_CONTEXT_COOKIE,
  hasGlobalScope,
} from "@/lib/branch-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { selectBranchContext } from "./actions";

interface BranchOption {
  readonly id: string;
  readonly name: string;
}

const relation = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;

const relationName = (value: unknown) =>
  relation(value as { name?: string } | { name?: string }[] | null)?.name;

export default async function SelectContext({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: assigned }, { data: access }] = await Promise.all([
    supabase
      .from("profile_roles")
      .select("roles(name)")
      .eq("profile_id", user?.id ?? ""),
    supabase
      .from("user_branch_access")
      .select("branch_id,branches(id,name)")
      .eq("profile_id", user?.id ?? ""),
  ]);
  const roles = new Set(
    (assigned ?? [])
      .map((row) => relationName(row.roles))
      .filter((name): name is string => Boolean(name)),
  );
  const global = hasGlobalScope(roles);
  let branches: readonly BranchOption[] = (access ?? [])
    .map((row) => relation(row.branches))
    .filter((branch): branch is BranchOption => Boolean(branch?.id));
  if (global) {
    const { data } = await supabase
      .from("branches")
      .select("id,name")
      .eq("status", "active")
      .order("name");
    branches = data ?? [];
  }

  const cookieStore = await cookies();
  const saved = cookieStore.get(BRANCH_CONTEXT_COOKIE)?.value;
  const savedBranchExists = branches.some((branch) => branch.id === saved);
  const selected =
    global && saved === ALL_BRANCHES_CONTEXT
      ? ALL_BRANCHES_CONTEXT
      : savedBranchExists
        ? saved
        : global
          ? ALL_BRANCHES_CONTEXT
          : branches[0]?.id;

  return (
    <main className="login" id="main-content">
      <form action={selectBranchContext} className="login-card">
        <div className="logo">
          Credi<span>Cel</span>
        </div>
        <h1>Elige tu vista</h1>
        <p className="muted">
          Solo aparecen las tiendas autorizadas para tu usuario.
        </p>
        {query.error && (
          <div className="error" role="alert">
            No tienes acceso al alcance seleccionado.
          </div>
        )}
        {branches.length > 0 || global ? (
          <>
            <div className="field">
              <label htmlFor="branch_context">Punto de venta</label>
              <select
                defaultValue={selected}
                id="branch_context"
                name="branch_context"
                required
              >
                {global && (
                  <option value={ALL_BRANCHES_CONTEXT}>
                    Toda la organización
                  </option>
                )}
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="button wide" type="submit">
              Usar esta vista
            </button>
          </>
        ) : (
          <div className="error" role="alert">
            Tu usuario todavía no tiene una tienda autorizada.
          </div>
        )}
        <Link className="forgot" href="/">
          Volver al inicio
        </Link>
      </form>
    </main>
  );
}
