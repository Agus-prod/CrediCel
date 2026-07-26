import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Smartphone,
} from "lucide-react";

import {
  ApplicationConversation,
  requestedDocumentLabels,
  type ApplicationConversationMessage,
} from "@/components/application-conversation";
import { ApplicationConversationLive } from "@/components/application-conversation-live";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { replyToApplication } from "./actions";

const statusLabels: Readonly<Record<string, string>> = {
  submitted: "Enviada a análisis",
  under_review: "En revisión",
  additional_information_required: "Requiere información",
  preapproved: "Aprobación condicionada",
  approved: "Aprobada",
  rejected: "Rechazada",
  contract_pending: "Contrato pendiente",
  signed: "Contrato firmado",
  activated: "Crédito activo",
  cancelled: "Cancelada",
};

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function statusTone(status: string) {
  if (status === "rejected" || status === "cancelled") return "danger";
  if (
    [
      "submitted",
      "under_review",
      "additional_information_required",
      "preapproved",
    ].includes(status)
  ) {
    return "warning";
  }
  return "success";
}

export default async function MySales({
  searchParams,
}: {
  readonly searchParams: Promise<{
    created?: string;
    error?: string;
    replied?: string;
    solicitud?: string;
    warning?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("credit_applications")
    .select(
      "id,status,requested_price,proposed_down_payment,proposed_term,created_at,customers(first_name,last_name,normalized_dni,phone),inventory_units(imei_1,product_models(name)),branches(name)",
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const applications = data ?? [];
  const applicationIds = applications.map((application) => application.id);
  const { data: noteRows } = applicationIds.length
    ? await supabase
        .from("credit_application_notes")
        .select(
          "id,application_id,note,message_type,requested_document_type,attachment_document_id,author_id,author_display_name,author_role,created_at",
        )
        .eq("visibility", "shared")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const attachmentIds = (noteRows ?? [])
    .map((note) => note.attachment_document_id)
    .filter((id): id is string => Boolean(id));
  const { data: documentRows } = attachmentIds.length
    ? await supabase
        .from("customer_documents")
        .select("id,storage_path,document_type,metadata")
        .in("id", attachmentIds)
    : { data: [] };
  const { data: signedDocuments } = documentRows?.length
    ? await supabase.storage.from("customer-documents").createSignedUrls(
        documentRows.map((document) => document.storage_path),
        10 * 60,
      )
    : { data: [] };

  const signedUrlByPath = new Map(
    (signedDocuments ?? [])
      .filter((document) => document.signedUrl)
      .map((document) => [document.path, document.signedUrl] as const),
  );
  const documentById = new Map(
    (documentRows ?? []).map((document) => [document.id, document] as const),
  );
  const messagesByApplication = new Map<
    string,
    ApplicationConversationMessage[]
  >();

  for (const note of noteRows ?? []) {
    const document = note.attachment_document_id
      ? documentById.get(note.attachment_document_id)
      : null;
    const attachmentType =
      note.requested_document_type ||
      (document?.metadata &&
      typeof document.metadata === "object" &&
      !Array.isArray(document.metadata)
        ? String(document.metadata.requested_document_type ?? "")
        : "") ||
      document?.document_type;
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

  const selectedApplication =
    applications.find((application) => application.id === query.solicitud) ??
    null;

  return (
    <AppShell>
      <ApplicationConversationLive />
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Seguimiento de ventas</div>
            <h1>
              {selectedApplication ? "Detalle de solicitud" : "Mis solicitudes"}
            </h1>
            <p className="muted">
              {selectedApplication
                ? "Revisa el caso, responde al analista y carga lo solicitado."
                : "Consulta el estado de cada solicitud sin saturar la pantalla."}
            </p>
          </div>
        </div>

        {query.created ? (
          <div className="notice" role="status">
            <CheckCircle2 aria-hidden="true" size={17} /> Solicitud{" "}
            {query.created.slice(0, 8).toUpperCase()} enviada correctamente.
          </div>
        ) : null}
        {query.replied ? (
          <div className="notice" role="status">
            Tu respuesta quedó enviada al analista.
          </div>
        ) : null}
        {query.warning ? (
          <div className="error" role="alert">
            {query.warning}
          </div>
        ) : null}
        {query.error ? (
          <div className="error" role="alert">
            {query.error}
          </div>
        ) : null}

        {selectedApplication ? (
          (() => {
            const application = selectedApplication;
            const customer = relation(application.customers);
            const branch = relation(application.branches);
            const inventory = relation(application.inventory_units);
            const model = relation(inventory?.product_models ?? null);
            const messages = messagesByApplication.get(application.id) ?? [];
            const latestRequest = [...messages]
              .reverse()
              .find(
                (message) =>
                  message.messageType === "information_request" &&
                  message.requestedDocumentType,
              )?.requestedDocumentType;

            return (
              <article
                className="card seller-sale-card seller-sale-detail"
                id={`application-${application.id}`}
              >
                <div className="detail-navigation">
                  <Link className="button secondary compact" href="/mis-ventas">
                    <ArrowLeft aria-hidden="true" size={16} />
                    Volver
                  </Link>
                </div>
                <div className="application-head">
                  <div>
                    <span className="eyebrow">
                      Solicitud {application.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h2>
                      {customer?.first_name} {customer?.last_name}
                    </h2>
                    <p className="muted">
                      {branch?.name} · DNI {customer?.normalized_dni} ·{" "}
                      {customer?.phone}
                    </p>
                  </div>
                  <span className={`badge ${statusTone(application.status)}`}>
                    {statusLabels[application.status] ?? application.status}
                  </span>
                </div>

                {application.status === "additional_information_required" ? (
                  <div className="seller-sale-alert">
                    <AlertCircle aria-hidden="true" size={18} />
                    El analista espera tu respuesta antes de continuar.
                  </div>
                ) : null}

                <div className="decision-summary">
                  <div>
                    <small>Dispositivo</small>
                    <strong>
                      <Smartphone aria-hidden="true" size={14} />{" "}
                      {model?.name ?? inventory?.imei_1 ?? "Por asignar"}
                    </strong>
                  </div>
                  <div>
                    <small>Precio</small>
                    <strong>L {application.requested_price}</strong>
                  </div>
                  <div>
                    <small>Prima</small>
                    <strong>L {application.proposed_down_payment}</strong>
                  </div>
                  <div>
                    <small>Plazo</small>
                    <strong>{application.proposed_term} meses</strong>
                  </div>
                </div>

                <ApplicationConversation
                  action={replyToApplication}
                  applicationId={application.id}
                  canCompose={[
                    "submitted",
                    "under_review",
                    "additional_information_required",
                    "preapproved",
                  ].includes(application.status)}
                  currentUserId={user.id}
                  latestRequestedDocumentType={
                    application.status === "additional_information_required"
                      ? (latestRequest ?? null)
                      : null
                  }
                  messages={messages}
                  mode="seller"
                />
              </article>
            );
          })()
        ) : applications.length ? (
          <div className="seller-sales-list">
            {applications.map((application) => {
              const customer = relation(application.customers);
              const messages = messagesByApplication.get(application.id) ?? [];
              const requiresResponse =
                application.status === "additional_information_required" ||
                messages.some(
                  (message) => message.messageType === "information_request",
                );

              return (
                <article
                  className="card seller-sale-card seller-sale-list-card"
                  id={`application-${application.id}`}
                  key={application.id}
                >
                  <div className="seller-sale-compact">
                    <div>
                      <span className="eyebrow">
                        Solicitud {application.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h2>
                        {customer?.first_name} {customer?.last_name}
                      </h2>
                      {requiresResponse ? (
                        <p className="seller-sale-mini-alert">
                          Requiere respuesta del vendedor
                        </p>
                      ) : null}
                    </div>
                    <span className={`badge ${statusTone(application.status)}`}>
                      {statusLabels[application.status] ?? application.status}
                    </span>
                  </div>
                  <Link
                    className="button compact seller-sale-detail-button"
                    href={`/mis-ventas?solicitud=${application.id}`}
                  >
                    <Eye aria-hidden="true" size={16} />
                    Ver detalle
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">✓</div>
            <strong>Aún no tienes solicitudes</strong>
            <span>Cuando envíes una venta financiada aparecerá aquí.</span>
          </div>
        )}
      </section>
    </AppShell>
  );
}
