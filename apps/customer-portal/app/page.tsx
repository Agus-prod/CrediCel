import { createPortalSupabase } from "../lib/supabase";
import { parsePortalToken } from "../lib/portal-token";
import { reportPayment } from "./actions";
type Portal = {
  customer: { name: string };
  account: {
    id: string;
    status: string;
    principal: number;
    outstanding_balance: number;
    installment_amount: number;
    paid_installments: number;
    total_installments: number;
    next_due_date: string;
  };
  bank_accounts: {
    id: string;
    bank_name: string;
    account_name: string;
    masked_account_number: string;
  }[];
  reports: {
    id: string;
    amount: number;
    date: string;
    reference: string;
    status: string;
  }[];
};
const status: Readonly<Record<string, string>> = {
  active: "Crédito activo",
  delinquent: "Crédito en mora",
  paid: "Crédito pagado",
  reported: "En validación",
  under_review: "En revisión",
  rejected: "Rechazado",
  applied: "Aplicado",
};
export default async function Home({
  searchParams,
}: {
  readonly searchParams: Promise<{
    token?: string;
    reported?: string;
    error?: string;
  }>;
}) {
  const query = await searchParams;
  const token = parsePortalToken(query.token);
  if (!token)
    return (
      <main className="main" id="main-content">
        <section className="panel access-error" role="alert">
          <h1>Enlace no disponible</h1>
          <p>Solicita a tu tienda un nuevo enlace de acceso al portal.</p>
        </section>
      </main>
    );
  const supabase = createPortalSupabase();
  const { data, error } = await supabase.rpc("customer_portal_summary", {
    p_token: token,
  });
  const portal = data as Portal | null;
  if (error || !portal)
    return (
      <main className="main" id="main-content">
        <section className="panel access-error" role="alert">
          <h1>Enlace no disponible</h1>
          <p>Solicita a tu tienda un nuevo enlace de acceso al portal.</p>
        </section>
      </main>
    );
  const a = portal.account;
  const progress =
    a.total_installments > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((a.paid_installments / a.total_installments) * 100),
          ),
        )
      : 0;
  return (
    <main className="main" id="main-content">
      <section className="portal-hero">
        <div>
          <span>Hola, {portal.customer.name}</span>
          <h1>Tu crédito CrediCel</h1>
          <p>Consulta tu estado y reporta pagos de forma segura.</p>
        </div>
        <div
          className={`account-status ${a.status === "delinquent" ? "late-status" : ""}`}
        >
          <i />
          {status[a.status] ?? a.status}
        </div>
      </section>
      {query.reported && (
        <div className="success-message" role="status">
          Recibimos tu reporte y comprobante. Caja validará la transferencia.
        </div>
      )}
      {query.error && (
        <div className="portal-error" role="alert">
          {query.error}
        </div>
      )}
      <div className="summary">
        <article>
          <span>Próxima cuota</span>
          <strong>L {Number(a.installment_amount).toFixed(2)}</strong>
        </article>
        <article>
          <span>Fecha límite</span>
          <strong>{a.next_due_date ?? "Sin cuota pendiente"}</strong>
        </article>
        <article>
          <span>Saldo pendiente</span>
          <strong>L {Number(a.outstanding_balance).toFixed(2)}</strong>
        </article>
      </div>
      <div className="portal-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span>Estado del crédito</span>
              <h2>Plan de {a.total_installments} cuotas</h2>
            </div>
            <b className={a.status === "delinquent" ? "late" : "ok"}>
              {status[a.status] ?? a.status}
            </b>
          </div>
          <div
            aria-label="Progreso del plan de cuotas"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="progress"
            role="progressbar"
          >
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label">
            <span>{a.paid_installments} cuotas pagadas</span>
            <span>{a.total_installments - a.paid_installments} restantes</span>
          </div>
          <div className="reports">
            <h3>Reportes recientes</h3>
            {portal.reports.length === 0 ? (
              <p className="muted">Aún no has reportado pagos.</p>
            ) : (
              portal.reports.map((r) => (
                <div className="report-row" key={r.id}>
                  <span>
                    {r.date} · {r.reference}
                  </span>
                  <strong>
                    L {Number(r.amount).toFixed(2)} ·{" "}
                    {status[r.status] ?? r.status}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <span>Nuevo reporte</span>
              <h2>Reportar transferencia</h2>
            </div>
          </div>
          <form action={reportPayment} className="payment-form">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="account_id" value={a.id} />
            <label className="full">
              Cuenta receptora
              <select name="bank_account_id" required>
                <option value="">Seleccionar</option>
                {portal.bank_accounts.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.bank_name} · {b.account_name} · {b.masked_account_number}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Banco de origen
              <input name="origin_bank" placeholder="Ej. BAC" required />
            </label>
            <label>
              Monto transferido
              <input name="amount" type="number" min="1" step="0.01" required />
            </label>
            <label>
              Fecha
              <input name="date" type="date" required />
            </label>
            <label>
              Número de referencia
              <input name="reference" required />
            </label>
            <label className="full">
              Titular de la cuenta
              <input name="holder" required />
            </label>
            <label className="full upload">
              Comprobante
              <input
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                capture="environment"
                required
              />
            </label>
            <button type="submit">Enviar para validación</button>
          </form>
          <small>
            JPG, PNG o PDF, máximo 9 MB. El pago se aplicará después de ser
            confirmado por caja.
          </small>
        </section>
      </div>
      <footer>
        Desarrollado por <strong>CrediCel</strong> · Tu progreso, nuestra
        prioridad
      </footer>
    </main>
  );
}
