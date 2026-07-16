import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { addBusinessUnit } from "./actions";

export default async function BusinessUnits({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: units }, { data: branches }] = await Promise.all([
    supabase.from("business_units").select("id,legal_name,commercial_name,owner_name,rtn,status").order("commercial_name"),
    supabase.from("branches").select("id,business_unit_id").eq("status", "active"),
  ]);
  const branchCount = new Map<string, number>();
  for (const branch of branches ?? []) {
    branchCount.set(branch.business_unit_id, (branchCount.get(branch.business_unit_id) ?? 0) + 1);
  }

  return <AppShell><section className="section">
    <div className="toolbar"><div><div className="eyebrow">Organización</div><h1>Unidades propietarias</h1><p className="muted">Entidades legales que conservan la propiedad económica del inventario, aunque el equipo esté físicamente en otra tienda.</p></div></div>
    {query.error && <div className="error">{query.error}</div>}
    {query.created && <div className="notice">Unidad propietaria creada correctamente.</div>}
    <div className="grid branch-grid">{(units ?? []).map((unit) => <article className="card" key={unit.id}>
      <span className={`badge ${unit.status === "active" ? "success" : "danger"}`}>{unit.status === "active" ? "Activa" : "Inactiva"}</span>
      <h2>{unit.commercial_name}</h2>
      <p>{unit.legal_name}</p>
      <p className="muted">RTN {unit.rtn} · Responsable {unit.owner_name}</p>
      <small>{branchCount.get(unit.id) ?? 0} tienda(s) vinculada(s)</small>
    </article>)}</div>
    <div className="card form-card section"><div className="form-title"><div><h2>Nueva unidad propietaria</h2><p className="muted">Esta información identifica al propietario económico. Una tienda se vincula explícitamente al crearla.</p></div></div>
      <form action={addBusinessUnit} className="form">
        <div className="field"><label htmlFor="legal_name">Razón social</label><input id="legal_name" name="legal_name" minLength={2} required /></div>
        <div className="field"><label htmlFor="commercial_name">Nombre comercial</label><input id="commercial_name" name="commercial_name" minLength={2} required /></div>
        <div className="field"><label htmlFor="owner_name">Propietario o responsable</label><input id="owner_name" name="owner_name" minLength={2} required /></div>
        <div className="field"><label htmlFor="rtn">RTN</label><input id="rtn" name="rtn" inputMode="numeric" pattern="[0-9 -]{14,20}" placeholder="08011999123456" required /></div>
        <div className="form-actions"><button className="button" type="submit">Crear unidad</button></div>
      </form>
    </div>
  </section></AppShell>;
}
