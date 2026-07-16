import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { addBranch } from "./actions";

function relationName(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { commercial_name?: string } | undefined)?.commercial_name;
  return (value as { commercial_name?: string } | null)?.commercial_name;
}

export default async function Organization({ searchParams }: { readonly searchParams: Promise<{ error?: string; created?: string }> }) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: branches }, { data: businessUnits }] = await Promise.all([
    supabase.from("branches").select("id,name,code,address,phone,status,business_units(commercial_name)").order("name"),
    supabase.from("business_units").select("id,commercial_name").eq("status", "active").order("commercial_name"),
  ]);

  return <AppShell><section className="section">
    <div className="toolbar"><div><div className="eyebrow">Organización</div><h1>Tiendas</h1><p className="muted">Cada tienda conserva su ubicación operativa y se vincula a una unidad propietaria concreta.</p></div></div>
    {query.error && <div className="error">{query.error}</div>}
    {query.created && <div className="notice">Tienda creada correctamente.</div>}
    <div className="grid branch-grid">{(branches ?? []).map((branch) => <article className="card" key={branch.id}>
      <span className={`badge ${branch.status === "active" ? "success" : "danger"}`}>{branch.status === "active" ? "Activa" : "Inactiva"}</span>
      <h2>{branch.name}</h2><p className="muted">Código {branch.code} · Propietario {relationName(branch.business_units) ?? "Sin asignar"}</p><p>{branch.address}</p><small>{branch.phone || "Sin teléfono"}</small>
    </article>)}</div>
    <div className="card form-card section"><div className="form-title"><div><h2>Nueva tienda</h2><p className="muted">El límite depende del plan y la unidad propietaria se selecciona explícitamente.</p></div></div>
      {(businessUnits ?? []).length === 0 ? <div className="error">Primero crea una unidad propietaria.</div> : <form action={addBranch} className="form">
        <div className="field"><label htmlFor="business_unit_id">Unidad propietaria</label><select id="business_unit_id" name="business_unit_id" required><option value="">Seleccionar</option>{(businessUnits ?? []).map((unit) => <option value={unit.id} key={unit.id}>{unit.commercial_name}</option>)}</select></div>
        <div className="field"><label htmlFor="name">Nombre</label><input id="name" name="name" minLength={2} required /></div>
        <div className="field"><label htmlFor="code">Código</label><input id="code" name="code" pattern="[A-Za-z0-9-]{2,20}" required /></div>
        <div className="field"><label htmlFor="address">Dirección</label><input id="address" name="address" minLength={5} required /></div>
        <div className="field"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" /></div>
        <div className="form-actions"><button className="button" type="submit">Crear tienda</button></div>
      </form>}
    </div>
  </section></AppShell>;
}
