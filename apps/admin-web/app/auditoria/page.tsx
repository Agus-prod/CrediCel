import {
  ArrowRight,
  ChevronDown,
  Clock3,
  FileCheck2,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { presentAuditEvent } from "@/lib/audit-presentation";
import { createServerSupabase } from "@/lib/supabase/server";

function actorName(value: unknown) {
  return Array.isArray(value)
    ? (value[0] as { full_name?: string } | undefined)?.full_name
    : (value as { full_name?: string } | null)?.full_name;
}

function EventIcon({ action }: Readonly<{ action: string }>) {
  if (action === "insert") return <Plus aria-hidden="true" size={18} />;
  if (action === "update") return <PencilLine aria-hidden="true" size={17} />;
  if (action === "delete") return <Trash2 aria-hidden="true" size={17} />;
  return <FileCheck2 aria-hidden="true" size={17} />;
}

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AuditLog() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id,entity_type,action,before_values,after_values,created_at,profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const events = data ?? [];
  const counts = {
    insert: events.filter((entry) => entry.action === "insert").length,
    update: events.filter((entry) => entry.action === "update").length,
    delete: events.filter((entry) => entry.action === "delete").length,
  };

  return (
    <AppShell
      scopeOverride={{
        eyebrow: "Alcance del historial",
        label: "Toda mi organización",
      }}
    >
      <section className="section audit-page">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Seguridad y control</div>
            <h1>Historial de actividad</h1>
            <p className="muted">
              Consulta quién realizó cada cambio y qué información fue
              modificada.
            </p>
          </div>
          <div className="audit-trust-chip">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>
              <small>Registro protegido</small>
              <strong>No se puede alterar</strong>
            </span>
          </div>
        </div>

        <div className="audit-summary-grid" aria-label="Resumen de actividad">
          <article className="audit-summary-card success">
            <Plus aria-hidden="true" size={18} />
            <span>Creaciones</span>
            <strong>{counts.insert}</strong>
          </article>
          <article className="audit-summary-card warning">
            <PencilLine aria-hidden="true" size={17} />
            <span>Actualizaciones</span>
            <strong>{counts.update}</strong>
          </article>
          <article className="audit-summary-card danger">
            <Trash2 aria-hidden="true" size={17} />
            <span>Eliminaciones</span>
            <strong>{counts.delete}</strong>
          </article>
        </div>

        {error ? (
          <div className="error">
            No fue posible cargar el historial. Intenta nuevamente.
          </div>
        ) : null}

        <div className="card audit-card">
          <div className="audit-card-heading">
            <div>
              <h2>Actividad reciente</h2>
              <p className="muted">
                {events.length === 100
                  ? "Mostrando los 100 eventos más recientes"
                  : `${events.length} ${events.length === 1 ? "evento encontrado" : "eventos encontrados"}`}
              </p>
            </div>
            <span>Más reciente primero</span>
          </div>

          <div className="audit-list">
            {events.map((entry) => {
              const presentation = presentAuditEvent({
                action: entry.action,
                entityType: entry.entity_type,
                beforeValues: entry.before_values,
                afterValues: entry.after_values,
              });
              const actor = actorName(entry.profiles);

              return (
                <details
                  className={`audit-event ${presentation.tone}`}
                  key={entry.id}
                >
                  <summary>
                    <span className="audit-event-icon">
                      <EventIcon action={entry.action} />
                    </span>
                    <span className="audit-event-main">
                      <span
                        className={`audit-action-badge ${presentation.tone}`}
                      >
                        {presentation.actionLabel}
                      </span>
                      <strong>{presentation.title}</strong>
                      <span className="audit-event-meta">
                        <span>
                          <UserRound aria-hidden="true" size={14} />
                          {actor ?? "Proceso automático"}
                        </span>
                        <span>
                          <Clock3 aria-hidden="true" size={14} />
                          {dateFormatter.format(new Date(entry.created_at))}
                        </span>
                      </span>
                    </span>
                    <span className="audit-open-label">
                      Ver detalle
                      <ChevronDown aria-hidden="true" size={17} />
                    </span>
                  </summary>

                  <div className="audit-event-body">
                    <h3>Cambios registrados</h3>
                    {presentation.changes.length > 0 ? (
                      <div className="audit-change-list">
                        {presentation.changes.map((change) => (
                          <div className="audit-change-row" key={change.field}>
                            <span>{change.field}</span>
                            <div>
                              {change.previous ? (
                                <span className="audit-old-value">
                                  {change.previous}
                                </span>
                              ) : null}
                              {change.previous && change.current ? (
                                <ArrowRight aria-hidden="true" size={15} />
                              ) : null}
                              {change.current ? (
                                <strong>{change.current}</strong>
                              ) : (
                                <em>Eliminado</em>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="audit-no-visible-change">
                        El evento no modificó información visible para el
                        usuario.
                      </p>
                    )}
                    <p className="audit-integrity-note">
                      <ShieldCheck aria-hidden="true" size={15} />
                      El detalle completo permanece resguardado para control y
                      respaldo.
                    </p>
                  </div>
                </details>
              );
            })}
          </div>

          {events.length === 0 && !error ? (
            <div className="empty">
              <ShieldCheck aria-hidden="true" size={26} />
              <strong>Sin actividad registrada</strong>
              <span>
                Los nuevos cambios importantes aparecerán aquí automáticamente.
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
