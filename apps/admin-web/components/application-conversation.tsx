import {
  Camera,
  FileCheck2,
  MessageCircle,
  Paperclip,
  Send,
} from "lucide-react";

export type ApplicationConversationMessage = {
  readonly attachmentName?: string | null;
  readonly attachmentUrl?: string | null;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly createdAt: string;
  readonly id: string;
  readonly messageType: string;
  readonly note: string;
  readonly requestedDocumentType?: string | null;
};

export const requestedDocumentLabels: Readonly<Record<string, string>> = {
  dni_front: "Frente de la identidad",
  dni_back: "Reverso de la identidad",
  selfie: "Selfie de verificación",
  address_proof: "Comprobante de domicilio",
  income_proof: "Constancia de ingresos",
  bank_statement: "Estado de cuenta",
  guarantor: "Documentación del aval",
  other: "Otro documento",
};

const messageTypeLabels: Readonly<Record<string, string>> = {
  decision: "Decisión",
  information_request: "Información solicitada",
  message: "Mensaje",
  response: "Respuesta del vendedor",
  seller_response: "Respuesta del vendedor",
};

const roleLabels: Readonly<Record<string, string>> = {
  organization_owner: "Propietario",
  organization_admin: "Administrador",
  branch_manager: "Gerente de tienda",
  credit_manager: "Jefe de crédito",
  credit_analyst: "Analista de crédito",
  salesperson: "Vendedor",
  auditor: "Auditor",
};

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Tegucigalpa",
});

export function ApplicationConversation({
  action,
  applicationId,
  canCompose = true,
  currentUserId,
  latestRequestedDocumentType,
  messages,
  mode,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  applicationId: string;
  canCompose?: boolean | undefined;
  currentUserId: string;
  latestRequestedDocumentType?: string | null;
  messages: readonly ApplicationConversationMessage[];
  mode: "analyst" | "seller";
}>) {
  const isSeller = mode === "seller";
  const requestedLabel = latestRequestedDocumentType
    ? (requestedDocumentLabels[latestRequestedDocumentType] ??
      latestRequestedDocumentType)
    : null;

  return (
    <section
      aria-labelledby={`conversation-title-${applicationId}`}
      className="application-conversation"
    >
      <header className="conversation-heading">
        <div className="conversation-heading-icon">
          <MessageCircle aria-hidden="true" size={21} />
        </div>
        <div>
          <span>Comunicación del caso</span>
          <h3 id={`conversation-title-${applicationId}`}>
            Analista y vendedor
          </h3>
          <p>Todo lo solicitado y respondido queda dentro de esta solicitud.</p>
        </div>
        <span className="conversation-count">
          {messages.length} {messages.length === 1 ? "mensaje" : "mensajes"}
        </span>
      </header>

      {isSeller && requestedLabel ? (
        <div className="conversation-request-alert" role="status">
          <FileCheck2 aria-hidden="true" size={19} />
          <div>
            <strong>El analista solicita: {requestedLabel}</strong>
            <span>
              Responde en este hilo y adjunta una foto o PDF si corresponde.
            </span>
          </div>
        </div>
      ) : null}

      {messages.length ? (
        <ol
          className="conversation-thread"
          aria-label="Mensajes de la solicitud"
        >
          {messages.map((message) => {
            const mine = message.authorId === currentUserId;
            const documentLabel = message.requestedDocumentType
              ? (requestedDocumentLabels[message.requestedDocumentType] ??
                message.requestedDocumentType)
              : null;
            return (
              <li className={mine ? "mine" : ""} key={message.id}>
                <article className="conversation-message">
                  <div className="conversation-message-meta">
                    <strong>{mine ? "Tú" : message.authorName}</strong>
                    <span>
                      {roleLabels[message.authorRole] ?? message.authorRole}
                    </span>
                    <time dateTime={message.createdAt}>
                      {dateFormatter.format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <span className={`conversation-kind ${message.messageType}`}>
                    {messageTypeLabels[message.messageType] ?? "Mensaje"}
                  </span>
                  <p>{message.note}</p>
                  {documentLabel ? (
                    <div className="conversation-document-request">
                      <FileCheck2 aria-hidden="true" size={16} />
                      Documento solicitado: <strong>{documentLabel}</strong>
                    </div>
                  ) : null}
                  {message.attachmentUrl ? (
                    <a
                      className="conversation-attachment"
                      href={message.attachmentUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Paperclip aria-hidden="true" size={16} />
                      {message.attachmentName || "Abrir documento adjunto"}
                    </a>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="conversation-empty">
          <MessageCircle aria-hidden="true" size={20} />
          <span>Aún no hay mensajes en esta solicitud.</span>
        </div>
      )}

      {canCompose ? (
        <form
          action={action}
          className="conversation-composer"
          encType={isSeller ? "multipart/form-data" : undefined}
        >
          <input name="application_id" type="hidden" value={applicationId} />
          <div className="field conversation-textarea">
            <label htmlFor={`conversation-message-${applicationId}`}>
              {isSeller ? "Responder al analista" : "Escribir al vendedor"}
            </label>
            <textarea
              id={`conversation-message-${applicationId}`}
              name="message"
              placeholder={
                isSeller
                  ? "Ejemplo: Ya adjunté el comprobante solicitado."
                  : "Escribe una indicación o aclaración para el vendedor."
              }
              required={!isSeller}
              rows={3}
            />
          </div>

          {isSeller ? (
            <div className="conversation-upload-fields">
              <div className="field">
                <label htmlFor={`document-type-${applicationId}`}>
                  Tipo de documento
                </label>
                <select
                  defaultValue={latestRequestedDocumentType ?? ""}
                  id={`document-type-${applicationId}`}
                  name="requested_document_type"
                >
                  <option value="">Sin archivo en esta respuesta</option>
                  {Object.entries(requestedDocumentLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <label className="conversation-file-picker">
                <Camera aria-hidden="true" size={20} />
                <span>
                  <strong>Tomar foto o adjuntar archivo</strong>
                  <small>JPG, PNG o PDF · máximo 7 MB</small>
                </span>
                <input
                  accept="image/jpeg,image/png,application/pdf"
                  capture="environment"
                  name="attachment"
                  type="file"
                />
              </label>
            </div>
          ) : null}

          <button className="button conversation-send" type="submit">
            <Send aria-hidden="true" size={17} />
            {isSeller ? "Enviar respuesta" : "Enviar mensaje"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
