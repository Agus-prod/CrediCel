import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Customers({ searchParams }: { readonly searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("customers").select("id,first_name,last_name,normalized_dni,phone,email,created_at").order("created_at", { ascending: false }).limit(100);
  const normalizedSearch = q.trim().toLocaleLowerCase("es-HN");
  const customers = (data ?? []).filter((customer) => !normalizedSearch || `${customer.first_name} ${customer.last_name} ${customer.normalized_dni} ${customer.phone}`.toLocaleLowerCase("es-HN").includes(normalizedSearch));

  return <AppShell><section className="section">
    <div className="toolbar"><div><div className="eyebrow">Clientes</div><h1>{normalizedSearch ? "Resultados de búsqueda" : "Cartera de clientes"}</h1><p className="muted">El acceso se limita por organización, rol, tiendas autorizadas y vendedor responsable.</p></div></div>
    <form className="card form" action="/clientes"><div className="field"><label htmlFor="q">Buscar por nombre, DNI o teléfono</label><input id="q" name="q" defaultValue={q} /></div><div className="form-actions"><button className="button" type="submit">Buscar</button>{normalizedSearch && <Link className="button secondary" href="/clientes">Limpiar</Link>}</div></form>
    <div className="card records-card section"><div className="form-title"><div><h2>Clientes visibles</h2><p className="muted">{customers.length} expediente(s)</p></div></div><div className="record-list">{customers.map((customer) => <Link className="record" href={`/clientes/${customer.id}`} key={customer.id}><div><strong>{customer.first_name} {customer.last_name}</strong><span>DNI {customer.normalized_dni} · {customer.phone}{customer.email ? ` · ${customer.email}` : ""}</span></div><span className="badge success">Abrir expediente</span></Link>)}</div>{customers.length === 0 && <div className="empty"><div className="empty-icon">0</div><strong>Sin coincidencias</strong><span>Prueba con otro nombre, DNI o teléfono.</span></div>}</div>
  </section></AppShell>;
}
