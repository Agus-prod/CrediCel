import { AppShell } from "@/components/app-shell";
import { getPublicAppUrl } from "@/lib/public-url.server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isInvitableRole, roleRequiresBranch } from "@/lib/team-access";
import { assignMemberBranch } from "./actions";
import { InviteMemberForm } from "./invite-member-form";

const roleLabels: Readonly<Record<string, string>> = {
  organization_owner: "Propietario",
  organization_admin: "Administrador",
  branch_manager: "Gerente",
  credit_analyst: "Analista de crédito",
  credit_manager: "Jefe de crédito",
  salesperson: "Vendedor",
  cashier: "Caja",
  inventory_manager: "Inventario",
  collections_agent: "Cobranza",
  auditor: "Auditor",
};

function relation<T>(value: unknown): T | null {
  return Array.isArray(value) ? ((value[0] as T | undefined) ?? null) : (value as T | null);
}

export default async function Users({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    token?: string;
    updated?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const invitationUrl = query.token
    ? await getPublicAppUrl(
        `/aceptar-invitacion?token=${encodeURIComponent(query.token)}`,
      )
    : null;
  const [{ data: users }, { data: branches }, { data: roles }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,status,profile_roles(roles(name)),user_branch_access(branches(id,name))",
        )
        .order("full_name"),
      supabase
        .from("branches")
        .select("id,name")
        .eq("status", "active")
        .order("name"),
      supabase.from("roles").select("name").in("name", Object.keys(roleLabels)),
    ]);

  const branchOptions = (branches ?? []).map((branch) => ({
    id: branch.id,
    label: branch.name,
  }));
  const roleOptions = (roles ?? [])
    .filter((role) => isInvitableRole(role.name))
    .map((role) => ({
      name: role.name,
      label: roleLabels[role.name] ?? role.name,
    }));

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Seguridad</div>
            <h1>Equipo y accesos</h1>
            <p className="muted">
              Invita personas y limita su trabajo por rol y tienda.
            </p>
          </div>
        </div>
        {query.error ? (
          <div className="error" role="alert">
            {query.error}
          </div>
        ) : null}
        {query.updated ? (
          <div className="notice" role="status">
            La tienda del integrante se actualizó correctamente.
          </div>
        ) : null}
        {invitationUrl ? (
          <div className="notice invite-result" role="status">
            <strong>Invitación creada.</strong>
            <span>Comparte este enlace con la persona:</span>
            <code>{invitationUrl}</code>
          </div>
        ) : null}
        <div className="workspace-stack">
          {(users ?? []).map((user) => {
            const roleNames = (user.profile_roles ?? [])
              .map(
                (row) => relation<{ name?: string }>(row.roles)?.name ?? "",
              )
              .filter(Boolean);
            const assignedBranches = (user.user_branch_access ?? [])
              .map((row) =>
                relation<{ id?: string; name?: string }>(row.branches),
              )
              .filter(
                (branch): branch is { id: string; name: string } =>
                  Boolean(branch?.id && branch.name),
              );
            const needsBranch = roleNames.some(roleRequiresBranch);

            return (
              <article className="card team-card" key={user.id}>
                <div>
                  <h2>{user.full_name}</h2>
                  <p className="muted">
                    {roleNames
                      .map((role) => roleLabels[role] ?? role)
                      .join(" · ") || "Sin rol asignado"}
                  </p>
                </div>
                <div className="team-access">
                  <div>
                    {assignedBranches.map((branch) => (
                      <span className="step" key={branch.id}>
                        {branch.name}
                      </span>
                    ))}
                    {!assignedBranches.length ? (
                      <span
                        className={
                          needsBranch ? "step team-access-warning" : "step"
                        }
                      >
                        {needsBranch
                          ? "Sin tienda asignada"
                          : "Acceso organizacional"}
                      </span>
                    ) : null}
                  </div>
                  {needsBranch ? (
                    <form action={assignMemberBranch} className="team-branch-form">
                      <input name="profile_id" type="hidden" value={user.id} />
                      <label>
                        <span>
                          {assignedBranches.length
                            ? "Cambiar tienda"
                            : "Asignar tienda"}
                        </span>
                        <select
                          defaultValue={assignedBranches[0]?.id ?? ""}
                          name="branch_id"
                          required
                        >
                          <option value="">Seleccionar</option>
                          {branchOptions.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="button secondary compact" type="submit">
                        Guardar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        <div className="card form-card section">
          <div className="form-title">
            <div>
              <h2>Invitar integrante</h2>
              <p className="muted">
                El enlace vence en siete días y solo funciona con el correo
                indicado.
              </p>
            </div>
          </div>
          <InviteMemberForm branches={branchOptions} roles={roleOptions} />
        </div>
      </section>
    </AppShell>
  );
}
