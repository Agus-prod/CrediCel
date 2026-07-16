import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";

function related<T>(value: unknown): T | null { return Array.isArray(value) ? (value[0] as T | undefined) ?? null : (value as T | null) ?? null; }
const statuses = ["preapproved", "approved", "contract_pending", "signed", "device_setup_pending", "ready_for_delivery", "activated"];

export default async function Credits() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("credit_applications").select("id,status,requested_price,proposed_down_payment,proposed_term,created_at,customers(first_name,last_name,normalized_dni),branches(name)").in("status", statuses).order("created_at", { ascending: false }).limit(100);

  return <AppShell><section className="section"><div className="toolbar"><div><div className="eyebrow">Seguimiento</div><h1>Créditos aprobados</h1><p className="muted">Vista de solicitudes aprobadas y activadas. El cálculo financiero definitivo permanece desacoplado.</p></div></div><div className="card records-card"><div className="form-title"><div><h2>Operaciones</h2><p className="muted">{data?.length ?? 0} registro(s)</p></div></div><div className="record-list">{(data ?? []).map((application) => {
    const customer = related<{ first_name?: string; last_name?: string; normalized_dni?: string }>(application.customers);
    const branch = related<{ name?: string }>(application.branches);
    return <div className="record" key={application.id}><div><strong>{customer?.first_name} {customer?.last_name}</strong><span>DNI {customer?.normalized_dni} · {branch?.name} · L {application.requested_price} · {application.proposed_term} meses</span></div><span className={`badge ${application.status === "activated" ? "success" : "warning"}`}>{application.status === "activated" ? "Activado" : "Aprobación en proceso"}</span></div>;
  })}</div></div></section></AppShell>;
}
