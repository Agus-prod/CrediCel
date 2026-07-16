const required = [
  { type: "dni_front", label: "DNI frontal" },
  { type: "dni_back", label: "DNI posterior" },
  { type: "selfie", label: "Selfie de verificación" },
  { type: "address_proof", label: "Comprobante de domicilio" },
] as const;
export function DocumentChecklist({
  documents,
}: {
  readonly documents: readonly {
    readonly document_type: string;
    readonly signed_url: string | null;
  }[];
}) {
  return (
    <section
      aria-labelledby="document-review-title"
      className="document-review"
    >
      <strong id="document-review-title">Verificación documental</strong>
      <ul>
        {required.map((requiredDocument) => {
          const received = documents.find(
            (document) => document.document_type === requiredDocument.type,
          );
          return (
            <li
              className={received ? "document-ok" : "document-missing"}
              key={requiredDocument.type}
            >
              <span>
                {received ? "✓" : "!"} {requiredDocument.label} ·{" "}
                {received ? "Recibido" : "Falta"}
              </span>
              {received?.signed_url ? (
                <a
                  aria-label={`Abrir ${requiredDocument.label}`}
                  href={received.signed_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Revisar
                </a>
              ) : received ? (
                <em>Enlace no disponible</em>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
