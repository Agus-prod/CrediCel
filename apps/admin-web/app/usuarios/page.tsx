import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/public-url.server";
import { inviteMember } from "./actions";
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
const relName = (v: unknown) =>
  Array.isArray(v)
    ? (v[0] as { name?: string } | undefined)?.name
    : (v as { name?: string } | null)?.name;
export default async function Users({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const q = await searchParams;
  const s = await createServerSupabase();
  const invitationUrl = q.token
    ? await getPublicAppUrl(
        `/aceptar-invitacion?token=${encodeURIComponent(q.token)}`,
      )
    : null;
  const [{ data: users }, { data: branches }, { data: roles }] =
    await Promise.all([
      s
        .from("profiles")
        .select(
          "id,full_name,status,profile_roles(roles(name)),user_branch_access(branches(name))",
        )
        .order("full_name"),
      s.from("branches").select("id,name").eq("status", "active").order("name"),
      s.from("roles").select("name").in("name", Object.keys(roleLabels)),
    ]);
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
        {q.error && (
          <div className="error" role="alert">
            {q.error}
          </div>
        )}
        {invitationUrl && (
          <div className="notice invite-result" role="status">
            <strong>Invitación creada.</strong>
            <span>Comparte este enlace con la persona:</span>
            <code>{invitationUrl}</code>
          </div>
        )}
        <div className="workspace-stack">
          {(users ?? []).map((u) => {
            const roleRows = u.profile_roles ?? [];
            const branchRows = u.user_branch_access ?? [];
            return (
              <article className="card team-card" key={u.id}>
                <div>
                  <h2>{u.full_name}</h2>
                  <p className="muted">
                    {roleRows
                      .map(
                        (r) =>
                          roleLabels[relName(r.roles) ?? ""] ??
                          relName(r.roles),
                      )
                      .join(" · ")}
                  </p>
                </div>
                <div>
                  {branchRows.map((b) => (
                    <span className="step" key={relName(b.branches)}>
                      {relName(b.branches)}
                    </span>
                  ))}
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
          <form action={inviteMember} className="form">
            <div className="field">
              <label htmlFor="full_name">Nombre completo</label>
              <input id="full_name" name="full_name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="role_name">Rol</label>
              <select id="role_name" name="role_name" required>
                <option value="">Seleccionar</option>
                {(roles ?? [])
                  .filter((r) => r.name !== "organization_owner")
                  .map((r) => (
                    <option value={r.name} key={r.name}>
                      {roleLabels[r.name] ?? r.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="branch_id">Tienda</label>
              <select id="branch_id" name="branch_id">
                <option value="">Acceso organizacional</option>
                {(branches ?? []).map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="button" type="submit">
                Crear invitación
              </button>
            </div>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
