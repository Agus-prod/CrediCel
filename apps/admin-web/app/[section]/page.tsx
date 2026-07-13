import { AppShell } from "@/components/app-shell";
import { SectionWorkspace, type WorkspaceRecord } from "@/components/section-workspace";
import { createServerSupabase } from "@/lib/supabase/server";

const titles: Readonly<Record<string, string>> = { clientes: "Clientes", expedientes: "Expedientes", solicitudes: "Bandeja central de solicitudes", creditos: "Créditos", inventario: "Inventario por IMEI", transferencias: "Transferencias", pagos: "Pagos por transferencia", cobranza: "Cobranza", organizacion: "Unidades propietarias y puntos", usuarios: "Usuarios y accesos", configuracion: "Configuraciones generales", auditoria: "Auditoría" };

async function loadRecords(section: string): Promise<readonly WorkspaceRecord[]> {
  const supabase = await createServerSupabase();
  if (section === "clientes") { const { data } = await supabase.from("customers").select("id,first_name,last_name,normalized_dni,phone").order("created_at", { ascending: false }).limit(20); return (data ?? []).map((item) => ({ id: item.id, title: `${item.first_name} ${item.last_name}`, detail: `DNI ${item.normalized_dni} · ${item.phone}`, status: "Expediente activo" })); }
  if (section === "inventario") { const { data } = await supabase.from("inventory_units").select("id,imei_1,serial_number,color,storage_capacity,status,cash_price").order("created_at", { ascending: false }).limit(20); return (data ?? []).map((item) => ({ id: item.id, title: `IMEI ${item.imei_1}`, detail: `${item.color ?? "Sin color"} · ${item.storage_capacity ?? ""} · L ${item.cash_price}`, status: item.status })); }
  if (section === "solicitudes" || section === "creditos") { const { data } = await supabase.from("credit_applications").select("id,status,requested_price,proposed_down_payment,proposed_term").order("created_at", { ascending: false }).limit(20); return (data ?? []).map((item) => ({ id: item.id, title: `Solicitud ${item.id.slice(0, 8).toUpperCase()}`, detail: `L ${item.requested_price} · Prima L ${item.proposed_down_payment} · ${item.proposed_term} meses`, status: item.status })); }
  if (section === "organizacion") { const { data } = await supabase.from("branches").select("id,name,code,address,status").order("name").limit(20); return (data ?? []).map((item) => ({ id: item.id, title: item.name, detail: `${item.code} · ${item.address}`, status: item.status })); }
  if (section === "usuarios") { const { data } = await supabase.from("profiles").select("id,full_name,status").order("full_name").limit(30); return (data ?? []).map((item) => ({ id: item.id, title: item.full_name, detail: "Usuario de la organización", status: item.status })); }
  return [];
}

export default async function Section({ params }: { readonly params: Promise<{ section: string }> }) { const { section } = await params; const title = titles[section] ?? "Módulo"; const records = await loadRecords(section); return <AppShell><section className="section"><div className="toolbar"><div><div className="eyebrow">Gestión</div><h1>{title}</h1><p className="muted">Consulta y administra la información de {title.toLowerCase()}.</p></div></div><SectionWorkspace section={section} records={records} /></section></AppShell>; }
