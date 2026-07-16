import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { approveTransfer, createTransfer, dispatchTransfer, receiveTransfer } from "./actions";

const labels: Readonly<Record<string, string>> = {
  requested: "Solicitado",
  approved: "Aprobado",
  preparing: "En preparación",
  dispatched: "Despachado",
  in_transit: "En tránsito",
  received: "Recibido",
  received_with_discrepancy: "Recibido con discrepancia",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  lost: "Extraviado",
};

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

export default async function Transfers({ searchParams }: { readonly searchParams: Promise<{ error?: string; created?: string; updated?: string }> }) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: branches }, { data: inventory }, { data: transfers }, { data: units }, { data: assignedRoles }] = await Promise.all([
    supabase.from("branches").select("id,name,business_unit_id,business_units(commercial_name)").eq("status", "active").order("name"),
    supabase.from("inventory_units").select("id,imei_1,color,storage_capacity,current_branch_id,branches(name),business_units(commercial_name),product_models(name)").eq("status", "available"),
    supabase.from("inventory_transfers").select("id,status,created_at,transfer_ownership,origin:branches!inventory_transfers_origin_branch_id_fkey(name),destination:branches!inventory_transfers_destination_branch_id_fkey(name),destination_owner:business_units!inventory_transfers_destination_owner_business_unit_id_fkey(commercial_name),inventory_transfer_items(inventory_units(imei_1))").order("created_at", { ascending: false }).limit(20),
    supabase.from("business_units").select("id,commercial_name").eq("status", "active").order("commercial_name"),
    supabase.from("profile_roles").select("roles(name)").eq("profile_id", user?.id ?? ""),
  ]);
  const roles = new Set((assignedRoles ?? []).map((row) => relation<{ name: string }>(row.roles)?.name).filter(Boolean));
  const canTransferOwnership = ["organization_owner", "organization_admin", "super_admin"].some((role) => roles.has(role));

  return <AppShell><section className="section">
    <div className="toolbar"><div><div className="eyebrow">Inventario</div><h1>Traslados entre tiendas</h1><p className="muted">Flujo controlado por solicitud, aprobación y doble validación de IMEI dentro de la misma organización.</p></div></div>
    {query.error && <div className="error" role="alert">{query.error}</div>}
    {(query.created || query.updated) && <div className="notice" role="status">El traslado fue actualizado correctamente.</div>}
    <div className="card form-card"><div className="form-title"><div><h2>Solicitar traslado</h2><p className="muted">La ubicación física y la propiedad económica son conceptos independientes.</p></div></div>
      <form action={createTransfer} className="form">
        <div className="field"><label htmlFor="origin">Tienda de origen</label><select id="origin" name="origin" required><option value="">Seleccionar</option>{(branches ?? []).map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></div>
        <div className="field"><label htmlFor="destination">Tienda de destino</label><select id="destination" name="destination" required><option value="">Seleccionar</option>{(branches ?? []).map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></div>
        <div className="field"><label htmlFor="transfer_ownership">Tipo de movimiento</label><select id="transfer_ownership" name="transfer_ownership"><option value="false">Solo traslado físico</option>{canTransferOwnership && <option value="true">Traslado y transferencia de propiedad</option>}</select></div>
        {canTransferOwnership && <div className="field"><label htmlFor="destination_owner_business_unit_id">Unidad propietaria de destino</label><select id="destination_owner_business_unit_id" name="destination_owner_business_unit_id"><option value="">No cambia la propiedad</option>{(units ?? []).map((unit) => <option value={unit.id} key={unit.id}>{unit.commercial_name}</option>)}</select><small className="muted">Solo se usa cuando el tipo incluye transferencia de propiedad.</small></div>}
        <div className="field transfer-items"><label>Dispositivos disponibles</label><div className="check-grid">{(inventory ?? []).map((item) => {
          const model = relation<{ name?: string }>(item.product_models);
          const branch = relation<{ name?: string }>(item.branches);
          const owner = relation<{ commercial_name?: string }>(item.business_units);
          return <label className="check-item" key={item.id}><input type="checkbox" name="inventory_ids" value={item.id} /><span><strong>{item.imei_1}</strong><small>{model?.name} · {branch?.name} · propietario {owner?.commercial_name}</small></span></label>;
        })}</div></div>
        <div className="form-actions"><button className="button" type="submit">Solicitar traslado</button></div>
      </form>
    </div>
    <div className="workspace-stack section">{(transfers ?? []).map((transfer) => {
      const origin = relation<{ name?: string }>(transfer.origin);
      const destination = relation<{ name?: string }>(transfer.destination);
      const destinationOwner = relation<{ commercial_name?: string }>(transfer.destination_owner);
      const hasDiscrepancy = transfer.status.includes("discrepancy");
      return <article className="card transfer-card" key={transfer.id}><div><span className="eyebrow">Traslado {transfer.id.slice(0, 8).toUpperCase()}</span><h2>{origin?.name} → {destination?.name}</h2><p className="muted">{transfer.transfer_ownership ? `Con cambio de propietario a ${destinationOwner?.commercial_name ?? "unidad seleccionada"}` : "Movimiento físico; conserva propietario"}</p><span className={`badge ${hasDiscrepancy || transfer.status === "rejected" ? "danger" : transfer.status === "received" ? "success" : "warning"}`}>{labels[transfer.status] ?? transfer.status}</span></div>
        {transfer.status === "requested" && <form action={approveTransfer} className="inline-action"><input type="hidden" name="transfer_id" value={transfer.id} /><button className="button" type="submit">Aprobar en origen</button></form>}
        {["approved", "preparing"].includes(transfer.status) && <form action={dispatchTransfer} className="inline-action"><input type="hidden" name="transfer_id" value={transfer.id} /><label className="sr-only" htmlFor={`dispatch-${transfer.id}`}>IMEI de salida</label><input id={`dispatch-${transfer.id}`} name="imeis" inputMode="numeric" placeholder="Escanea los IMEI separados por espacio" required /><button className="button" type="submit">Despachar</button></form>}
        {["in_transit", "received_with_discrepancy"].includes(transfer.status) && <form action={receiveTransfer} className="inline-action"><input type="hidden" name="transfer_id" value={transfer.id} /><label className="sr-only" htmlFor={`receive-${transfer.id}`}>IMEI recibido</label><input id={`receive-${transfer.id}`} name="imeis" inputMode="numeric" placeholder="Escanea los IMEI recibidos" required /><button className="button" type="submit">{hasDiscrepancy ? "Reintentar recepción" : "Recibir"}</button></form>}
      </article>;
    })}</div>
  </section></AppShell>;
}
