import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { addDevice } from "./actions";

const relName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;

const labels: Readonly<Record<string, string>> = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
  transfer_pending: "En traslado",
  in_transit: "En tránsito",
  delinquent: "En mora",
};

const inputs = [
  ["brand", "Marca", true],
  ["model", "Modelo", true],
  ["imei_1", "IMEI principal", true],
  ["imei_2", "IMEI secundario", false],
  ["serial", "Número de serie", false],
  ["color", "Color", false],
  ["storage", "Almacenamiento", false],
  ["ram", "Memoria RAM", false],
] as const;

export default async function Inventory({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: assigned }, { data: branchAccess }] =
    await Promise.all([
      supabase
        .from("inventory_units")
        .select(
          "id,imei_1,color,storage_capacity,ram_capacity,cash_price,status,mdm_compatible,product_brands(name),product_models(name),branches(name)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("profile_roles")
        .select("roles(name)")
        .eq("profile_id", user?.id ?? ""),
      supabase
        .from("user_branch_access")
        .select("branch_id,branches(name)")
        .eq("profile_id", user?.id ?? "")
        .order("branch_id"),
    ]);

  const roles = new Set(
    (assigned ?? []).map((row) => relName(row.roles)).filter(Boolean),
  );
  const canWrite = [
    "inventory_manager",
    "branch_manager",
    "organization_admin",
    "organization_owner",
    "super_admin",
  ].some((role) => roles.has(role));
  const salesOnly = roles.has("salesperson") && !canWrite;
  const visibleDevices = salesOnly
    ? (data ?? []).filter((device) => device.status === "available")
    : (data ?? []);
  const branches =
    branchAccess?.map((row) => ({
      id: row.branch_id,
      name: relName(row.branches) ?? "Tienda",
    })) ?? [];
  const assignedBranch = branches.length === 1 ? branches[0] : null;

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Inventario</div>
            <h1>Dispositivos</h1>
            <p className="muted">
              Equipos por IMEI, tienda, precio y compatibilidad con protección.
            </p>
          </div>
        </div>

        {query.error ? <div className="error">{query.error}</div> : null}
        {query.created ? (
          <div className="notice">Dispositivo agregado al inventario.</div>
        ) : null}

        {visibleDevices.length > 0 ? (
          <div className="inventory-grid">
            {visibleDevices.map((device) => {
              const brand = relName(device.product_brands);
              const model = relName(device.product_models);
              const status = String(device.status);
              return (
                <article className="card device-card" key={device.id}>
                  <div className="application-head">
                    <div>
                      <span className="eyebrow">
                        {relName(device.branches) ?? "Tienda"}
                      </span>
                      <h2>
                        {[brand, model].filter(Boolean).join(" ") ||
                          "Dispositivo"}
                      </h2>
                    </div>
                    <span
                      className={`badge ${
                        status === "available"
                          ? "success"
                          : status === "delinquent"
                            ? "danger"
                            : "warning"
                      }`}
                    >
                      {labels[status] ?? status}
                    </span>
                  </div>
                  <div className="device-meta">
                    <span>IMEI {device.imei_1}</span>
                    <span>
                      {[device.color, device.storage_capacity, device.ram_capacity]
                        .filter(Boolean)
                        .join(" · ") || "Sin variantes registradas"}
                    </span>
                    <strong>
                      {new Intl.NumberFormat("es-HN", {
                        style: "currency",
                        currency: "HNL",
                      }).format(Number(device.cash_price))}
                    </strong>
                  </div>
                  <p className="muted">
                    {device.mdm_compatible
                      ? "Compatible con CrediCel Protect"
                      : "Sin protección remota"}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state">
            <h2>No hay dispositivos para mostrar</h2>
            <p className="muted">
              Cuando ingresen equipos disponibles en tu tienda aparecerán aquí.
            </p>
          </div>
        )}

        {canWrite ? (
          <div className="card form-card section">
            <div className="form-title">
              <div>
                <h2>Registrar dispositivo</h2>
                <p className="muted">
                  Escanea o escribe el IMEI exactamente como aparece en el
                  equipo.
                </p>
              </div>
            </div>
            <form action={addDevice} className="form">
              {assignedBranch ? (
                <div className="field readonly-field">
                  <label htmlFor="branch_id_display">Tienda asignada</label>
                  <input
                    id="branch_id_display"
                    readOnly
                    value={assignedBranch.name}
                  />
                  <input
                    name="branch_id"
                    type="hidden"
                    value={assignedBranch.id}
                  />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="branch_id">Tienda</label>
                  <select id="branch_id" name="branch_id" required>
                    <option value="">Seleccionar</option>
                    {branches.map((branch) => (
                      <option value={branch.id} key={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {inputs.map(([name, label, required]) => (
                <div className="field" key={name}>
                  <label htmlFor={name}>{label}</label>
                  <input id={name} name={name} required={required} />
                </div>
              ))}
              <div className="field">
                <label htmlFor="cost">Costo</label>
                <input
                  id="cost"
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cash_price">Precio de venta</label>
                <input
                  id="cash_price"
                  name="cash_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <label className="consent">
                <input name="mdm_compatible" type="checkbox" /> Compatible con
                CrediCel Protect
              </label>
              <div className="form-actions">
                <button className="button" type="submit">
                  Guardar dispositivo
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
