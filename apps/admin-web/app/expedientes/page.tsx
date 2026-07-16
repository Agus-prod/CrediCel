import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";

const requiredDocuments = new Set(["dni_front", "dni_back", "selfie", "address_proof"]);

export default async function Dossiers() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("customers").select("id,first_name,last_name,normalized_dni,phone,customer_documents(document_type)").order("created_at", { ascending: false }).limit(100);

  return <AppShell><section className="section"><div className="toolbar"><div><div className="eyebrow">Crédito</div><h1>Expedientes</h1><p className="muted">Expediente único por DNI dentro de la organización, disponible según el alcance autorizado.</p></div></div><div className="card records-card"><div className="form-title"><div><h2>Revisión documental</h2><p className="muted">{data?.length ?? 0} cliente(s)</p></div></div><div className="record-list">{(data ?? []).map((customer) => {
    const types = new Set((customer.customer_documents ?? []).map((document) => document.document_type));
    const complete = [...requiredDocuments].every((type) => types.has(type));
    return <Link className="record" href={`/clientes/${customer.id}`} key={customer.id}><div><strong>{customer.first_name} {customer.last_name}</strong><span>DNI {customer.normalized_dni} · {customer.phone} · {types.size} documento(s)</span></div><span className={`badge ${complete ? "success" : "warning"}`}>{complete ? "Completo" : "Documentos pendientes"}</span></Link>;
  })}</div></div></section></AppShell>;
}
