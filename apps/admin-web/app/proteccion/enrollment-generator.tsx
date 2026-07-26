"use client";

import { useMemo, useState } from "react";

export type EnrollmentOption = {
  readonly accountId: string;
  readonly inventoryUnitId: string;
  readonly customerName: string;
  readonly imei: string;
  readonly serialNumber: string | null;
  readonly accountStatus: string;
};

type GeneratedEnrollment = {
  readonly enrollmentId: string;
  readonly qrDataUrl: string;
  readonly expirationTimestamp: string;
  readonly oneTimeOnly: true;
};

export function EnrollmentGenerator({
  options,
  selectedAccountId,
}: {
  readonly options: readonly EnrollmentOption[];
  readonly selectedAccountId?: string | undefined;
}) {
  const initial = options.some((option) => option.accountId === selectedAccountId)
    ? selectedAccountId
    : options[0]?.accountId;
  const [accountId, setAccountId] = useState(initial ?? "");
  const [durationHours, setDurationHours] = useState<1 | 8 | 24>(8);
  const [result, setResult] = useState<GeneratedEnrollment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = useMemo(
    () => options.find((option) => option.accountId === accountId),
    [accountId, options],
  );

  async function generate() {
    if (!selected || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/mdm/enrollment-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selected.accountId,
          inventoryUnitId: selected.inventoryUnitId,
          durationHours,
        }),
      });
      const payload = (await response.json()) as GeneratedEnrollment & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "No se pudo generar el QR");
      setResult(payload);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo generar el QR",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card form-card mdm-enrollment-card">
      <div className="form-title">
        <div>
          <h2>Generar QR de enrolamiento</h2>
          <p className="muted">
            Código real de Android Enterprise, de un solo uso y vinculado al
            crédito seleccionado.
          </p>
        </div>
      </div>
      {options.length ? (
        <div className="form">
          <div className="field">
            <label htmlFor="mdm-account">Crédito y dispositivo</label>
            <select
              id="mdm-account"
              onChange={(event) => {
                setAccountId(event.target.value);
                setResult(null);
              }}
              value={accountId}
            >
              {options.map((option) => (
                <option key={option.accountId} value={option.accountId}>
                  {option.customerName} · IMEI {option.imei}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mdm-duration">Vigencia del QR</label>
            <select
              id="mdm-duration"
              onChange={(event) => {
                setDurationHours(Number(event.target.value) as 1 | 8 | 24);
                setResult(null);
              }}
              value={durationHours}
            >
              <option value={1}>1 hora</option>
              <option value={8}>8 horas</option>
              <option value={24}>24 horas</option>
            </select>
          </div>
          {selected && (
            <div className="mdm-device-summary">
              <span>Cliente: {selected.customerName}</span>
              <span>IMEI: {selected.imei}</span>
              <span>Serial: {selected.serialNumber || "No registrado"}</span>
              <span>Crédito: {selected.accountStatus}</span>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button
              className="button"
              disabled={loading}
              onClick={generate}
              type="button"
            >
              {loading ? "Generando de forma segura…" : "Generar QR MDM"}
            </button>
          </div>
        </div>
      ) : (
        <div className="notice">
          No hay créditos activos con un dispositivo compatible asignado.
        </div>
      )}
      {result && selected && (
        <div className="mdm-qr-result" aria-live="polite">
          <div>
            <span className="badge success">Listo para un dispositivo</span>
            <h3>Escanea durante la configuración inicial</h3>
            <p className="muted">
              Vence el {new Date(result.expirationTimestamp).toLocaleString("es-HN")}.
              Después del primer uso dejará de funcionar.
            </p>
            <ol>
              <li>Restablece el Android de prueba a estado de fábrica.</li>
              <li>Toca seis veces la pantalla de bienvenida.</li>
              <li>Conéctalo a Wi-Fi y escanea este QR.</li>
              <li>Comprueba que muestre “CrediCel Protect”.</li>
            </ol>
            <a
              className="button secondary-button"
              download={`credicel-mdm-${selected.imei}.png`}
              href={result.qrDataUrl}
            >
              Descargar QR
            </a>
          </div>
          {/* The data URL stays in memory and is never placed in a query string. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`QR MDM de un solo uso para el IMEI ${selected.imei}`}
            className="mdm-qr-image"
            src={result.qrDataUrl}
          />
        </div>
      )}
    </div>
  );
}
