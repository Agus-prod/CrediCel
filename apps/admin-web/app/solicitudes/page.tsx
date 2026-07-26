import { AppShell } from "@/components/app-shell";
import {
  ApplicationConversation,
  requestedDocumentLabels,
  type ApplicationConversationMessage,
} from "@/components/application-conversation";
import { ApplicationConversationLive } from "@/components/application-conversation-live";
import { createServerSupabase } from "@/lib/supabase/server";
import { actionSchema } from "@credicel/business-rules";
import { z } from "zod";
import {
  decideApplication,
  formalizeApplication,
  sendApplicationMessage,
} from "./actions";
import { DocumentChecklist } from "./document-checklist";
const labels: Readonly<Record<string, string>> = {
  submitted: "Enviada",
  under_review: "En revisión",
  additional_information_required: "Información requerida",
  preapproved: "Condicionada",
  approved: "Aprobada",
  rejected: "Rechazada",
  activated: "Crédito activo",
};
const recommendations: Readonly<Record<string, string>> = {
  approve: "Recomienda aprobar",
  manual_review: "Revisión manual",
  condition: "Recomienda condicionar",
  reject: "Recomienda rechazar",
};
const ruleResultSchema = z.object({
  recommendation_only: z.literal(true),
  recommendations: z.array(actionSchema),
  conflicts: z.array(z.object({ explanation: z.string() })),
  explanation: z.string(),
});
const ruleActionLabels: Readonly<Record<string, string>> = {
  set_minimum_down_payment: "Prima mínima sugerida",
  set_maximum_term: "Plazo máximo sugerido",
  set_interest_rate: "Tasa sugerida para revisión",
  require_document: "Documento requerido",
  require_supervisor_approval: "Revisión de supervisor requerida",
  reject_application: "Regla recomienda rechazo",
  add_warning: "Advertencia",
};
const relation = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;
const relatedName = (value: unknown) =>
  relation(value as { name?: string } | { name?: string }[] | null)?.name;
export default async function Applications({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    updated?: string;
    formalized?: string;
    messaged?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, { data: assigned }] = await Promise.all([
    supabase
      .from("credit_applications")
      .select(
        "id,status,requested_price,proposed_down_payment,proposed_term,customers(first_name,last_name,normalized_dni,phone,customer_documents(id,application_id,document_type,storage_path,metadata,created_at)),inventory_units(imei_1),branches(name),credit_application_profiles(monthly_income,monthly_expenses,employment_months,current_address,employer_name),credit_risk_assessments(score,recommendation,disposable_income,payment_to_income_ratio,factors,created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("profile_roles")
      .select("roles(name)")
      .eq("profile_id", user?.id ?? ""),
  ]);
  const applicationIds = (data ?? []).map((application) => application.id);
  const [{ data: executionRows }, { data: noteRows }] = applicationIds.length
    ? await Promise.all([
        supabase
          .from("rule_execution_logs")
          .select("subject_id,result,created_at")
          .eq("subject_type", "credit_application")
          .in("subject_id", applicationIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("credit_application_notes")
          .select(
            "id,application_id,note,message_type,requested_document_type,attachment_document_id,author_id,author_display_name,author_role,created_at",
          )
          .eq("visibility", "shared")
          .in("application_id", applicationIds)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];
  const ruleResultByApplication = new Map<
    string,
    z.infer<typeof ruleResultSchema>
  >();
  for (const execution of executionRows ?? []) {
    if (
      !execution.subject_id ||
      ruleResultByApplication.has(execution.subject_id)
    )
      continue;
    const parsed = ruleResultSchema.safeParse(execution.result);
    if (parsed.success)
      ruleResultByApplication.set(execution.subject_id, parsed.data);
  }
  const documentPaths = (data ?? []).flatMap((application) => {
    const customer = relation(application.customers);
    return (customer?.customer_documents ?? []).map(
      (document) => document.storage_path,
    );
  });
  const { data: signedDocuments } = documentPaths.length
    ? await supabase.storage
        .from("customer-documents")
        .createSignedUrls(documentPaths, 5 * 60)
    : { data: [] };
  const signedUrlByPath = new Map(
    (signedDocuments ?? [])
      .filter((document) => document.signedUrl)
      .map((document) => [document.path, document.signedUrl] as const),
  );
  const allCustomerDocuments = (data ?? []).flatMap((application) => {
    const customer = relation(application.customers);
    return customer?.customer_documents ?? [];
  });
  const documentById = new Map(
    allCustomerDocuments.map((document) => [document.id, document] as const),
  );
  const messagesByApplication = new Map<
    string,
    ApplicationConversationMessage[]
  >();
  for (const note of noteRows ?? []) {
    const document = note.attachment_document_id
      ? documentById.get(note.attachment_document_id)
      : null;
    const metadataType =
      document?.metadata &&
      typeof document.metadata === "object" &&
      !Array.isArray(document.metadata)
        ? String(document.metadata.requested_document_type ?? "")
        : "";
    const attachmentType =
      note.requested_document_type || metadataType || document?.document_type;
    const messages = messagesByApplication.get(note.application_id) ?? [];
    messages.push({
      id: note.id,
      authorId: note.author_id,
      authorName: note.author_display_name || "Equipo CrediCel",
      authorRole: note.author_role || "Equipo CrediCel",
      createdAt: note.created_at,
      messageType: note.message_type,
      note: note.note,
      requestedDocumentType: note.requested_document_type,
      attachmentUrl: document
        ? (signedUrlByPath.get(document.storage_path) ?? null)
        : null,
      attachmentName: attachmentType
        ? (requestedDocumentLabels[attachmentType] ?? "Documento adjunto")
        : null,
    });
    messagesByApplication.set(note.application_id, messages);
  }
  const roles = new Set(
    (assigned ?? []).map((row) => relatedName(row.roles)).filter(Boolean),
  );
  const canDecide =
    roles.has("credit_analyst") ||
    roles.has("credit_manager") ||
    roles.has("branch_manager");
  const canFormalize =
    roles.has("cashier") ||
    roles.has("branch_manager") ||
    roles.has("organization_owner") ||
    roles.has("organization_admin");
  return (
    <AppShell>
      <ApplicationConversationLive />
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Crédito</div>
            <h1>Gestión de solicitudes</h1>
            <p className="muted">
              Expediente, evaluación explicable, decisión y formalización.
            </p>
          </div>
        </div>
        {query.error && (
          <div className="error" role="alert">
            {query.error}
          </div>
        )}
        {query.updated && (
          <div className="notice" role="status">
            La decisión fue registrada correctamente.
          </div>
        )}
        {query.formalized && (
          <div className="notice" role="status">
            Crédito formalizado: prima recibida, contrato aceptado y cuotas
            generadas.
          </div>
        )}
        {query.messaged && (
          <div className="notice" role="status">
            El mensaje fue enviado al vendedor.
          </div>
        )}
        <div className="workspace-stack">
          {(data ?? []).map((app) => {
            const customer = relation(app.customers);
            const device = relation(app.inventory_units);
            const branch = relation(app.branches);
            const profile = relation(app.credit_application_profiles);
            const risk = [...(app.credit_risk_assessments ?? [])].sort((a, b) =>
              String(b.created_at).localeCompare(String(a.created_at)),
            )[0];
            const ruleResult = ruleResultByApplication.get(app.id);
            const conversation = messagesByApplication.get(app.id) ?? [];
            const actionable = [
              "submitted",
              "under_review",
              "additional_information_required",
              "preapproved",
            ].includes(app.status);
            return (
              <article
                className="card application-card"
                id={`application-${app.id}`}
                key={app.id}
              >
                <div className="application-head">
                  <div>
                    <span className="eyebrow">
                      Solicitud {app.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h2>
                      {customer?.first_name} {customer?.last_name}
                    </h2>
                    <p className="muted">
                      DNI {customer?.normalized_dni} · {customer?.phone} ·{" "}
                      {branch?.name}
                    </p>
                  </div>
                  <span
                    className={`badge ${app.status === "rejected" ? "danger" : actionable ? "warning" : "success"}`}
                  >
                    {labels[app.status] ?? app.status}
                  </span>
                </div>
                {risk && (
                  <section className="risk-panel">
                    <div
                      className={`risk-score ${risk.score < 45 ? "danger" : risk.score < 75 ? "warning" : "success"}`}
                    >
                      <strong>{risk.score}</strong>
                      <span>de 100</span>
                    </div>
                    <div>
                      <h3>
                        {recommendations[risk.recommendation] ??
                          risk.recommendation}
                      </h3>
                      <p>
                        Ingreso disponible L{" "}
                        {Number(risk.disposable_income).toFixed(2)} ·
                        cuota/ingreso{" "}
                        {(Number(risk.payment_to_income_ratio) * 100).toFixed(
                          1,
                        )}
                        %
                      </p>
                      <ul>
                        {(risk.factors as string[]).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
                {ruleResult && (
                  <section className="rule-recommendations" role="note">
                    <div>
                      <span className="eyebrow">Motor de reglas</span>
                      <h3>Recomendaciones para decisión humana</h3>
                      <p className="muted">{ruleResult.explanation}</p>
                    </div>
                    {ruleResult.recommendations.length > 0 ? (
                      <ul>
                        {ruleResult.recommendations.map((item) => (
                          <li key={`${item.type}-${String(item.value)}`}>
                            <strong>
                              {ruleActionLabels[item.type] ?? item.type}:
                            </strong>{" "}
                            {item.value === true ? "Sí" : String(item.value)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sin recomendaciones adicionales.</p>
                    )}
                    {ruleResult.conflicts.map((conflict) => (
                      <div className="error" key={conflict.explanation}>
                        {conflict.explanation} Requiere revisión manual.
                      </div>
                    ))}
                  </section>
                )}
                {profile && (
                  <div className="applicant-profile">
                    <div>
                      <small>Ingreso</small>
                      <strong>L {profile.monthly_income}</strong>
                    </div>
                    <div>
                      <small>Gastos</small>
                      <strong>L {profile.monthly_expenses}</strong>
                    </div>
                    <div>
                      <small>Empleo</small>
                      <strong>
                        {profile.employer_name} · {profile.employment_months}{" "}
                        meses
                      </strong>
                    </div>
                    <div>
                      <small>Domicilio</small>
                      <strong>{profile.current_address}</strong>
                    </div>
                  </div>
                )}
                <DocumentChecklist
                  documents={(customer?.customer_documents ?? [])
                    .filter(
                      (document) =>
                        !document.application_id ||
                        document.application_id === app.id,
                    )
                    .map((document) => ({
                      created_at: document.created_at,
                      document_type: document.document_type,
                      signed_url:
                        signedUrlByPath.get(document.storage_path) ?? null,
                    }))}
                />
                <div className="decision-summary">
                  <div>
                    <small>Dispositivo</small>
                    <strong>{device?.imei_1 ?? "Sin asignar"}</strong>
                  </div>
                  <div>
                    <small>Precio</small>
                    <strong>L {app.requested_price}</strong>
                  </div>
                  <div>
                    <small>Prima</small>
                    <strong>L {app.proposed_down_payment}</strong>
                  </div>
                  <div>
                    <small>Plazo</small>
                    <strong>{app.proposed_term} meses</strong>
                  </div>
                </div>
                <ApplicationConversation
                  action={sendApplicationMessage}
                  applicationId={app.id}
                  canCompose={canDecide && actionable}
                  currentUserId={user?.id ?? ""}
                  messages={conversation}
                  mode="analyst"
                />
                {actionable && canDecide && (
                  <form
                    action={decideApplication}
                    className="decision-form analyst-decision-form"
                  >
                    <input type="hidden" name="application_id" value={app.id} />
                    <div className="field">
                      <label htmlFor={`decision-${app.id}`}>Decisión</label>
                      <select
                        id={`decision-${app.id}`}
                        name="decision"
                        required
                      >
                        <option value="">Seleccionar</option>
                        <option value="approved">Aprobar</option>
                        <option value="rejected">Rechazar</option>
                        <option value="additional_information_required">
                          Solicitar información
                        </option>
                        <option value="preapproved">Condicionar</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`condition-${app.id}`}>Condición</label>
                      <select id={`condition-${app.id}`} name="condition">
                        <option value="">Sin condición</option>
                        <option value="higher_down_payment">Mayor prima</option>
                        <option value="guarantor">Aval solidario</option>
                        <option value="additional_document">
                          Documento adicional
                        </option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`requested-document-${app.id}`}>
                        Documento solicitado
                      </label>
                      <select
                        id={`requested-document-${app.id}`}
                        name="requested_document_type"
                      >
                        <option value="">No aplica</option>
                        {Object.entries(requestedDocumentLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div className="field condition-detail">
                      <label htmlFor={`condition-detail-${app.id}`}>
                        Monto o requisito de la condición
                      </label>
                      <input
                        id={`condition-detail-${app.id}`}
                        name="condition_detail"
                        placeholder="Ej.: prima de L 8,000 o requisitos del aval"
                      />
                    </div>
                    <div className="field decision-reason">
                      <label htmlFor={`reason-${app.id}`}>
                        Motivo y observaciones
                      </label>
                      <textarea
                        id={`reason-${app.id}`}
                        name="reason"
                        placeholder="Explica claramente qué falta o el motivo de la decisión."
                        required
                        rows={3}
                      />
                    </div>
                    <button className="button" type="submit">
                      Registrar y notificar
                    </button>
                  </form>
                )}
                {app.status === "approved" && canFormalize && (
                  <form
                    action={formalizeApplication}
                    className="decision-form formalization-form"
                  >
                    <input type="hidden" name="application_id" value={app.id} />
                    <div className="field decision-reason">
                      <label htmlFor={`signature-${app.id}`}>
                        Aceptación y firma del cliente
                      </label>
                      <input
                        id={`signature-${app.id}`}
                        name="signature_name"
                        placeholder="Nombre completo como firma"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`method-${app.id}`}>Pago de prima</label>
                      <select
                        id={`method-${app.id}`}
                        name="payment_method"
                        required
                      >
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`reference-${app.id}`}>Referencia</label>
                      <input id={`reference-${app.id}`} name="reference" />
                    </div>
                    <button className="button" type="submit">
                      Cobrar prima y entregar
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
