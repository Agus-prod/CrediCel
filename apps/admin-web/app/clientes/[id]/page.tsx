import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { resolveCustomerPortalUrl } from "@/lib/customer-portal-url";
import { createServerSupabase } from "@/lib/supabase/server";
import { issuePortalLink } from "./actions";

const documentLabels: Readonly<Record<string, string>> = {
  dni_front: "DNI frontal",
  dni_back: "DNI posterior",
  selfie: "Selfie",
  address_proof: "Comprobante de domicilio",
  other: "Otro documento",
};
const statusLabels: Readonly<Record<string, string>> = {
  draft: "Borrador",
  documents_pending: "Documentos pendientes",
  submitted: "Enviada",
  under_review: "En revisión",
  additional_information_required: "Información adicional",
  preapproved: "Condicionada",
  approved: "Aprobada",
  rejected: "Rechazada",
  activated: "Activada",
  cancelled: "Cancelada",
};

export default async function CustomerDossier({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ error?: string; portal_token?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: customer }, { data: applications }] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id,first_name,last_name,normalized_dni,phone,email,customer_type,created_at,customer_addresses(id,address_type,address,proof_type,proof_holder_name,holder_relationship),customer_employment(id,employer_name,position,monthly_income,started_on),customer_references(id,name,relationship,phone),customer_documents(id,document_type,storage_path,created_at),customer_consents(id,consent_type,version,granted,created_at),customer_timeline_events(id,event_type,description,created_at)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("credit_applications")
      .select(
        "id,status,requested_price,proposed_down_payment,proposed_term,created_at,branches(name)",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!customer) notFound();

  const documents = await Promise.all(
    (customer.customer_documents ?? []).map(async (document) => {
      const { data } = await supabase.storage
        .from("customer-documents")
        .createSignedUrl(document.storage_path, 300);
      return { ...document, signedUrl: data?.signedUrl ?? null };
    }),
  );
  let portalUrl: string | null = null;
  if (query.portal_token) {
    try {
      portalUrl = resolveCustomerPortalUrl(
        query.portal_token,
        process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL,
      );
    } catch {
      portalUrl = null;
    }
  }

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Expediente único</div>
            <h1>
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="muted">
              DNI {customer.normalized_dni} · {customer.phone} ·{" "}
              {customer.email || "Sin correo"}
            </p>
          </div>
          <Link className="button secondary" href="/clientes">
            Volver
          </Link>
        </div>
        {query.error && (
          <div className="error" role="alert">
            {query.error}
          </div>
        )}
        <article className="card portal-access-card">
          <div>
            <span className="eyebrow">Portal del cliente</span>
            <h2>Acceso seguro para pagos</h2>
            <p className="muted">
              Emite un enlace individual. El token no se guarda en el navegador
              del personal ni se muestra a usuarios no autorizados.
            </p>
          </div>
          {portalUrl ? (
            <a
              className="button"
              href={portalUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir portal del cliente
            </a>
          ) : (
            <form action={issuePortalLink}>
              <input name="customer_id" type="hidden" value={customer.id} />
              <button className="button" type="submit">
                Generar acceso al portal
              </button>
            </form>
          )}
          {portalUrl && (
            <form action={issuePortalLink}>
              <input name="customer_id" type="hidden" value={customer.id} />
              <input name="rotate" type="hidden" value="true" />
              <button className="button secondary" type="submit">
                Revocar y emitir otro enlace
              </button>
            </form>
          )}
        </article>
        <div className="grid">
          <article className="card">
            <span className="muted">Tipo de cliente</span>
            <h2>{customer.customer_type}</h2>
          </article>
          <article className="card">
            <span className="muted">Documentos</span>
            <h2>{documents.length}</h2>
          </article>
          <article className="card">
            <span className="muted">Solicitudes</span>
            <h2>{applications?.length ?? 0}</h2>
          </article>
          <article className="card">
            <span className="muted">Consentimientos</span>
            <h2>
              {customer.customer_consents?.filter((item) => item.granted)
                .length ?? 0}
            </h2>
          </article>
        </div>
        <div className="workspace-stack section">
          <article className="card">
            <h2>Documentos privados</h2>
            <p className="muted">Los enlaces expiran en cinco minutos.</p>
            <div className="record-list">
              {documents.map((document) => (
                <div className="record" key={document.id}>
                  <div>
                    <strong>
                      {documentLabels[document.document_type] ??
                        document.document_type}
                    </strong>
                    <span>
                      Cargado{" "}
                      {new Intl.DateTimeFormat("es-HN", {
                        dateStyle: "medium",
                      }).format(new Date(document.created_at))}
                    </span>
                  </div>
                  {document.signedUrl ? (
                    <a
                      className="button secondary"
                      href={document.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Revisar
                    </a>
                  ) : (
                    <span className="badge danger">Sin acceso</span>
                  )}
                </div>
              ))}
            </div>
            {documents.length === 0 && (
              <div className="empty">
                <strong>Sin documentos</strong>
                <span>
                  Los documentos se incorporan desde el flujo de solicitud.
                </span>
              </div>
            )}
          </article>
          <article className="card">
            <h2>Domicilios</h2>
            <div className="record-list">
              {(customer.customer_addresses ?? []).map((address) => (
                <div className="record" key={address.id}>
                  <div>
                    <strong>{address.address}</strong>
                    <span>
                      {address.address_type} · comprobante{" "}
                      {address.proof_type ?? "sin especificar"}
                    </span>
                    {address.proof_holder_name && (
                      <span>
                        Titular {address.proof_holder_name} · relación{" "}
                        {address.holder_relationship || "no indicada"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <h2>Empleo e ingresos declarados</h2>
            <div className="record-list">
              {(customer.customer_employment ?? []).map((employment) => (
                <div className="record" key={employment.id}>
                  <div>
                    <strong>{employment.employer_name}</strong>
                    <span>
                      {employment.position || "Cargo no indicado"} · ingreso L{" "}
                      {Number(employment.monthly_income ?? 0).toLocaleString(
                        "es-HN",
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <h2>Referencias</h2>
            <div className="record-list">
              {(customer.customer_references ?? []).map((reference) => (
                <div className="record" key={reference.id}>
                  <div>
                    <strong>{reference.name}</strong>
                    <span>
                      {reference.relationship} · {reference.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <h2>Solicitudes</h2>
            <div className="record-list">
              {(applications ?? []).map((application) => (
                <div className="record" key={application.id}>
                  <div>
                    <strong>
                      Solicitud {application.id.slice(0, 8).toUpperCase()}
                    </strong>
                    <span>
                      L {application.requested_price} · prima L{" "}
                      {application.proposed_down_payment} ·{" "}
                      {application.proposed_term} meses
                    </span>
                  </div>
                  <span
                    className={`badge ${application.status === "rejected" ? "danger" : ["approved", "activated"].includes(application.status) ? "success" : "warning"}`}
                  >
                    {statusLabels[application.status] ?? application.status}
                  </span>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <h2>Historial</h2>
            <div className="record-list">
              {(customer.customer_timeline_events ?? []).map((event) => (
                <div className="record" key={event.id}>
                  <div>
                    <strong>{event.description}</strong>
                    <span>
                      {event.event_type} ·{" "}
                      {new Intl.DateTimeFormat("es-HN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(event.created_at))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
