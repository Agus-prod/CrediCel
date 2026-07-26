import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { reviewSubscriptionTransfer } from "./actions";

type Transfer = {
  id: string; organization_name: string; plan_name: string; billing_cycle: string;
  expected_amount: number; origin_bank: string; reference_number: string;
  transferred_on: string; reported_at: string; status: string;
};
const money = new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" });
const date = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short" });

export default async function SubscriptionOperations({ searchParams }: {
  readonly searchParams: Promise<{ error?: string; reviewed?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const { data: allowed } = await supabase.rpc("is_platform_operator");
  if (!allowed) redirect("/?denied=1");
  const { data, error } = await supabase.rpc("list_subscription_transfers_for_review");
  const transfers = (data ?? []) as Transfer[];
  return <main className="operations-page"><header className="operations-header"><div><span className="eyebrow">Operación interna</span><h1>Conciliación de suscripciones</h1><p>Confirma únicamente después de comprobar el abono en el banco.</p></div><Link className="button secondary" href="/">Volver al sistema</Link></header>
    {query.error && <div className="error">{query.error}</div>}
    {query.reviewed && <div className="notice">Transferencia procesada y registrada en auditoría.</div>}
    {error && <div className="error">{error.message}</div>}
    <section className="operations-list">{transfers.length === 0 ? <div className="card empty-state"><h2>Sin pagos pendientes</h2><p className="muted">Las nuevas transferencias aparecerán aquí.</p></div> : transfers.map((transfer) => <article className="card operation-card" key={transfer.id}>
      <div className="application-head"><div><span className="eyebrow">{transfer.organization_name}</span><h2>{transfer.plan_name} · {transfer.billing_cycle === "annual" ? "Anual" : "Mensual"}</h2></div><strong>{money.format(Number(transfer.expected_amount))}</strong></div>
      <div className="decision-summary"><div><small>Banco</small><strong>{transfer.origin_bank}</strong></div><div><small>Referencia</small><strong>{transfer.reference_number}</strong></div><div><small>Fecha transferida</small><strong>{transfer.transferred_on}</strong></div><div><small>Reportada</small><strong>{date.format(new Date(transfer.reported_at))}</strong></div></div>
      <form action={reviewSubscriptionTransfer} className="operation-review"><input name="request_id" type="hidden" value={transfer.id}/><div className="field"><label htmlFor={`notes-${transfer.id}`}>Nota de revisión</label><input id={`notes-${transfer.id}`} name="notes" placeholder="Obligatoria para rechazar"/></div><div className="form-actions"><button className="button danger" name="decision" value="reject">Rechazar</button><button className="button" name="decision" value="approve">Confirmar abono y activar</button></div></form>
    </article>)}</section>
  </main>;
}
