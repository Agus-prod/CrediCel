import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { validatePayment } from "./actions";
import { PaymentCollector, type PaymentAccount } from "./payment-collector";

const relation = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;
const labels: Readonly<Record<string, string>> = {
  reported: "Reportado",
  under_review: "En revisión",
  confirmed: "Confirmado",
  rejected: "Rechazado",
  duplicate_suspected: "Posible duplicado",
  applied: "Aplicado",
  reversed: "Reversado",
};
const money = (value: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(value);

export default async function Payments({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: reports }, { data: accountRows }, { data: transactions }] =
    await Promise.all([
      supabase
        .from("transfer_reports")
        .select(
          "id,amount,transferred_on,origin_bank,reference_number,sender_account_holder,status,customers(first_name,last_name),bank_accounts(bank_name,masked_account_number)",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("credit_accounts")
        .select(
          "id,outstanding_balance,installment_amount,status,customers(first_name,last_name),credit_applications(branches(name)),credit_installments(installment_number,due_date,amount,paid_amount,status)",
        )
        .in("status", ["active", "delinquent"])
        .order("activated_at", { ascending: false }),
      supabase
        .from("cash_transactions")
        .select(
          "id,amount,payment_method,reference,created_at,credit_accounts(customers(first_name,last_name)),debt_settlements(settlement_number)",
        )
        .eq("transaction_type", "installment")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const accounts: PaymentAccount[] = (accountRows ?? []).map((row) => {
    const customer = relation(row.customers);
    const application = relation(row.credit_applications);
    const branch = relation(application?.branches ?? null);
    return {
      id: row.id,
      outstanding_balance: Number(row.outstanding_balance),
      installment_amount: Number(row.installment_amount),
      customerName: `${customer?.first_name ?? "Cliente"} ${customer?.last_name ?? ""}`.trim(),
      branchName: branch?.name ?? "Tienda",
      installments: (row.credit_installments ?? []).map((installment) => ({
        installment_number: installment.installment_number,
        due_date: installment.due_date,
        amount: Number(installment.amount),
        paid_amount: Number(installment.paid_amount),
        status: installment.status,
      })),
    };
  });

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Caja</div>
            <h1>Caja y pagos</h1>
            <p className="muted">
              Cobra cuotas exactas, anticipos programados o la cancelación total.
            </p>
          </div>
        </div>
        {query.error ? <div className="error">{query.error}</div> : null}
        {query.updated ? (
          <div className="notice">El pago reportado fue procesado correctamente.</div>
        ) : null}
        <PaymentCollector accounts={accounts} />

        <div className="workspace-stack section">
          <div className="toolbar">
            <div>
              <h2>Recibos y finiquitos recientes</h2>
              <p className="muted">Reimprime la documentación emitida en caja.</p>
            </div>
          </div>
          <div className="payment-history-grid">
            {(transactions ?? []).map((transaction) => {
              const account = relation(transaction.credit_accounts);
              const customer = relation(account?.customers ?? null);
              const settlement = relation(transaction.debt_settlements);
              return (
                <article className="card payment-history-card" key={transaction.id}>
                  <div>
                    <span className="eyebrow">
                      {settlement ? "Crédito cancelado" : "Pago de cuotas"}
                    </span>
                    <h3>
                      {customer?.first_name} {customer?.last_name}
                    </h3>
                    <p className="muted">
                      {money(Number(transaction.amount))} · {transaction.payment_method} ·{" "}
                      {new Date(transaction.created_at).toLocaleDateString("es-HN")}
                    </p>
                  </div>
                  <Link className="button secondary" href={`/pagos/documentos/${transaction.id}`}>
                    {settlement ? "Ver recibo y finiquito" : "Ver recibo"}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <div className="workspace-stack section">
          <h2>Pagos reportados</h2>
          {(reports ?? []).map((report) => {
            const customer = relation(report.customers);
            const bank = relation(report.bank_accounts);
            const open = ["reported", "under_review"].includes(report.status);
            return (
              <article className="card payment-card" key={report.id}>
                <div className="application-head">
                  <div>
                    <span className="eyebrow">Referencia {report.reference_number}</span>
                    <h2>{customer?.first_name} {customer?.last_name} · {money(Number(report.amount))}</h2>
                    <p className="muted">
                      {report.origin_bank} · {report.transferred_on} · destino {bank?.bank_name}{" "}
                      {bank?.masked_account_number}
                    </p>
                  </div>
                  <span className={`badge ${report.status === "rejected" ? "danger" : open ? "warning" : "success"}`}>
                    {labels[report.status] ?? report.status}
                  </span>
                </div>
                {open ? (
                  <form action={validatePayment} className="decision-form">
                    <input name="report_id" type="hidden" value={report.id} />
                    <div className="field">
                      <label htmlFor={`decision-${report.id}`}>Decisión</label>
                      <select id={`decision-${report.id}`} name="decision" required>
                        <option value="approve">Confirmar y aplicar</option>
                        <option value="reject">Rechazar</option>
                      </select>
                    </div>
                    <div className="field decision-reason">
                      <label htmlFor={`notes-${report.id}`}>Observaciones</label>
                      <input id={`notes-${report.id}`} name="notes" required />
                    </div>
                    <button className="button" type="submit">Procesar</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
