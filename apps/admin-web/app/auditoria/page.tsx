import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";

const actionLabels: Readonly<Record<string, string>> = { insert: "Creación", update: "Actualización", delete: "Eliminación" };
function actorName(value: unknown) { return Array.isArray(value) ? (value[0] as { full_name?: string } | undefined)?.full_name : (value as { full_name?: string } | null)?.full_name; }

export default async function AuditLog() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("audit_logs").select("id,entity_type,entity_id,action,before_values,after_values,metadata,created_at,profiles(full_name)").order("created_at", { ascending: false }).limit(100);

  return <AppShell><section className="section"><div className="toolbar"><div><div className="eyebrow">Seguridad</div><h1>Auditoría</h1><p className="muted">Historial inmutable generado por la base de datos. La aplicación no puede editarlo ni borrarlo.</p></div></div><div className="card records-card"><div className="form-title"><div><h2>Últimos eventos</h2><p className="muted">{data?.length ?? 0} registro(s)</p></div></div><div className="record-list">{(data ?? []).map((entry) => <details className="record" key={entry.id}><summary><strong>{actionLabels[entry.action] ?? entry.action} · {entry.entity_type}</strong><span>{actorName(entry.profiles) ?? "Proceso del sistema"} · {new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))}</span></summary><div><p className="muted">Entidad {entry.entity_id ?? "sin identificador"}</p><pre>{JSON.stringify({ antes: entry.before_values, despues: entry.after_values, metadatos: entry.metadata }, null, 2)}</pre></div></details>)}</div>{(data ?? []).length === 0 && <div className="empty"><strong>Sin eventos visibles</strong><span>Los nuevos cambios críticos aparecerán aquí automáticamente.</span></div>}</div></section></AppShell>;
}
