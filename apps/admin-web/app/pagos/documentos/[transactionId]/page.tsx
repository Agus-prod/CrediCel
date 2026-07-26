import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

const relation = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;
const money = (value: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(value);
const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export default async function PaymentDocuments({
  params,
}: {
  readonly params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const supabase = await createServerSupabase();
  const { data: transaction } = await supabase
    .from("cash_transactions")
    .select(
      "id,organization_id,account_id,application_id,amount,payment_method,reference,created_at,profiles(full_name)",
    )
    .eq("id", transactionId)
    .eq("transaction_type", "installment")
    .maybeSingle();
  if (!transaction?.account_id) notFound();

  const [{ data: account }, { data: settlement }, { data: organization }] =
    await Promise.all([
      supabase
        .from("credit_accounts")
        .select(
          "id,principal,down_payment,term,installment_amount,outstanding_balance,status,customers(first_name,last_name,normalized_dni),credit_installments(installment_number,due_date,amount,paid_amount,status),credit_applications(branches(name))",
        )
        .eq("id", transaction.account_id)
        .single(),
      supabase
        .from("debt_settlements")
        .select("id,settlement_number,previous_balance,paid_amount,final_balance,issued_at,snapshot")
        .eq("transaction_id", transaction.id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("name,commercial_name")
        .eq("id", transaction.organization_id)
        .single(),
    ]);
  if (!account) notFound();

  const customer = relation(account.customers);
  const application = relation(account.credit_applications);
  const branch = relation(application?.branches ?? null);
  const cashier = relation(transaction.profiles);
  const receiptNumber = `REC-${new Date(transaction.created_at)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${transaction.id.slice(0, 8).toUpperCase()}`;
  const installments = [...(account.credit_installments ?? [])].sort(
    (a, b) => a.installment_number - b.installment_number,
  );

  return (
    <main className="payment-documents">
      <div className="document-actions no-print">
        <Link className="button secondary" href="/pagos">Volver a Caja</Link>
        <PrintButton />
      </div>

      <article className="payment-paper">
        <header className="payment-document-header">
          <div className="logo">Credi<span>Cel</span></div>
          <div><strong>{organization?.commercial_name ?? organization?.name}</strong><span>{branch?.name ?? "Caja"}</span></div>
        </header>
        <div className="payment-document-title">
          <span>Comprobante oficial</span><h1>Recibo de pago</h1><strong>{receiptNumber}</strong>
        </div>
        <dl className="payment-document-summary">
          <div><dt>Cliente</dt><dd>{customer?.first_name} {customer?.last_name}</dd></div>
          <div><dt>Identidad</dt><dd>{customer?.normalized_dni}</dd></div>
          <div><dt>Fecha</dt><dd>{new Date(transaction.created_at).toLocaleString("es-HN")}</dd></div>
          <div><dt>Forma de pago</dt><dd>{paymentLabels[transaction.payment_method] ?? transaction.payment_method}</dd></div>
          <div><dt>Monto recibido</dt><dd>{money(Number(transaction.amount))}</dd></div>
          <div><dt>Saldo después del pago</dt><dd>{money(Number(account.outstanding_balance))}</dd></div>
          <div><dt>Referencia</dt><dd>{transaction.reference || "Sin referencia"}</dd></div>
          <div><dt>Recibido por</dt><dd>{cashier?.full_name ?? "Caja CrediCel"}</dd></div>
        </dl>
        <p className="payment-document-note">
          Este pago fue aplicado a las obligaciones más antiguas del crédito. Conserva este recibo como respaldo de la operación.
        </p>
        <div className="document-signatures"><div>Firma y sello de caja</div><div>Firma del cliente</div></div>
      </article>

      {settlement ? (
        <article className="payment-paper settlement-paper">
          <header className="payment-document-header">
            <div className="logo">Credi<span>Cel</span></div>
            <div><strong>{organization?.commercial_name ?? organization?.name}</strong><span>Documento de liberación</span></div>
          </header>
          <div className="payment-document-title">
            <span>Cancelación definitiva</span><h1>Finiquito y paz y salvo</h1><strong>{settlement.settlement_number}</strong>
          </div>
          <p className="settlement-lead">
            Por este medio se hace constar que <strong>{customer?.first_name} {customer?.last_name}</strong>, identidad <strong>{customer?.normalized_dni}</strong>, canceló totalmente las obligaciones correspondientes al crédito registrado en CrediCel.
          </p>
          <dl className="payment-document-summary">
            <div><dt>Capital original</dt><dd>{money(Number(account.principal))}</dd></div>
            <div><dt>Prima registrada</dt><dd>{money(Number(account.down_payment))}</dd></div>
            <div><dt>Saldo antes de cancelar</dt><dd>{money(Number(settlement.previous_balance))}</dd></div>
            <div><dt>Pago de cancelación</dt><dd>{money(Number(settlement.paid_amount))}</dd></div>
            <div><dt>Saldo final</dt><dd>{money(Number(settlement.final_balance))}</dd></div>
            <div><dt>Estado del crédito</dt><dd>Cancelado</dd></div>
          </dl>
          <p className="payment-document-note">
            A la fecha de emisión no existe saldo pendiente en este crédito. Este documento se emite como constancia de cancelación, sujeto a la verificación de autenticidad en los registros de la organización.
          </p>
          <div className="document-signatures"><div>Representante autorizado</div><div>Cliente</div></div>
        </article>
      ) : null}

      <article className="payment-paper amortization-paper">
        <header className="payment-document-header">
          <div className="logo">Credi<span>Cel</span></div>
          <div><strong>Estado del crédito</strong><span>Tabla de cuotas actualizada</span></div>
        </header>
        <div className="payment-document-title">
          <span>Detalle de aplicación</span><h1>Estado final de cuotas</h1>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cuota</th><th>Vencimiento</th><th>Valor</th><th>Pagado</th><th>Estado</th></tr></thead>
            <tbody>{installments.map((installment) => (
              <tr key={installment.installment_number}>
                <td>{installment.installment_number}</td><td>{installment.due_date}</td>
                <td>{money(Number(installment.amount))}</td><td>{money(Number(installment.paid_amount))}</td>
                <td>{installment.status === "paid" ? "Pagada" : installment.status}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </article>
    </main>
  );
}
