import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { addPlatformBankAccount, setOrganizationAccess } from "./actions";

type Bank = { id:string; bank_name:string; account_name:string; account_number:string; account_type:string; currency:string };
type Summary = { organizations:number; trials:number; active_subscriptions:number; pending_payments:number; confirmed_revenue:number; bank_accounts:Bank[] };
type Organization = { organization_id:string; organization_name:string; organization_status:string; subscription_status:string|null; plan_name:string|null; trial_ends_at:string|null; current_period_ends_at:string|null; customers:number; branches:number };
const money = new Intl.NumberFormat("es-HN", { style:"currency", currency:"HNL" });
const date = new Intl.DateTimeFormat("es-HN", { dateStyle:"medium", timeZone:"America/Tegucigalpa" });
const subscriptionLabels:Record<string,string> = { trialing:"Prueba", active:"Activa", past_due:"Pago vencido", grace_period:"Período de gracia", suspended:"Suspendida", cancelled:"Cancelada", expired:"Vencida" };

export default async function PlatformOperations({ searchParams }:{ readonly searchParams:Promise<{error?:string;created?:string;updated?:string}> }) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{data:summary,error},{data:organizationData,error:organizationError}] = await Promise.all([
    supabase.rpc("platform_dashboard_summary"),
    supabase.rpc("list_platform_organizations"),
  ]);
  if (error) redirect("/?denied=1");
  const values = summary as Summary;
  const organizations = (organizationData ?? []) as Organization[];
  return <PlatformShell>
    <header className="platform-header"><div><span className="eyebrow">Cuenta maestra CrediCel</span><h1>Control de la plataforma</h1><p>Supervisa organizaciones, suscripciones e ingresos sin entrar en ninguna tienda.</p></div></header>
    {query.error && <div className="error" role="alert">{query.error}</div>}
    {query.created && <div className="notice" role="status">Cuenta receptora agregada.</div>}
    {query.updated && <div className="notice" role="status">Acceso de la organización actualizado y registrado en auditoría.</div>}
    <section className="platform-metrics" aria-label="Resumen de la plataforma">
      <article><span>Organizaciones</span><strong>{values.organizations}</strong></article>
      <article><span>Pruebas activas</span><strong>{values.trials}</strong></article>
      <article><span>Planes activos</span><strong>{values.active_subscriptions}</strong></article>
      <article><span>Pagos por revisar</span><strong>{values.pending_payments}</strong></article>
      <article><span>Ingresos confirmados</span><strong>{money.format(Number(values.confirmed_revenue))}</strong></article>
    </section>
    <section className="platform-columns">
      <article className="card form-card"><div className="form-title"><div><h2>Pagos pendientes</h2><p className="muted">Comprueba cada transferencia antes de activar un plan.</p></div><Link className="button" href="/operacion/suscripciones">Revisar pagos</Link></div></article>
      <article className="card platform-organizations">
        <div className="form-title"><div><h2>Organizaciones</h2><p className="muted">Estado comercial y uso actual de cada cliente.</p></div></div>
        {organizationError ? <div className="error">No fue posible cargar las organizaciones.</div> : organizations.length === 0 ? <div className="empty"><strong>Aún no hay organizaciones</strong><span>Las nuevas cuentas aparecerán aquí.</span></div> : <div className="organization-list">{organizations.map((organization) => {
          const suspended = organization.subscription_status === "suspended";
          const expiration = organization.subscription_status === "trialing" ? organization.trial_ends_at : organization.current_period_ends_at;
          return <details className="organization-row" key={organization.organization_id}>
            <summary><span><strong>{organization.organization_name}</strong><small>{organization.plan_name ?? "Sin plan"} · {organization.customers} clientes · {organization.branches} tiendas</small></span><span className={`badge ${suspended ? "danger" : "success"}`}>{subscriptionLabels[organization.subscription_status ?? ""] ?? "Sin suscripción"}</span></summary>
            <div className="organization-detail"><div><small>Vigencia</small><strong>{expiration ? date.format(new Date(expiration)) : "Sin fecha"}</strong></div><form action={setOrganizationAccess}><input name="organization_id" type="hidden" value={organization.organization_id}/><input name="access_action" type="hidden" value={suspended ? "reactivated" : "suspended"}/><label>Motivo de la acción<input name="reason" minLength={5} maxLength={500} placeholder={suspended ? "Ej.: pago confirmado y acceso restablecido" : "Ej.: verificación administrativa pendiente"} required/></label><button className={`button ${suspended ? "" : "danger"}`} type="submit">{suspended ? "Reactivar acceso" : "Suspender acceso"}</button></form></div>
          </details>;
        })}</div>}
      </article>
      <article className="card form-card"><div className="form-title"><div><h2>Cuentas donde recibes pagos</h2><p className="muted">Se muestran a los propietarios cuando compran un plan.</p></div></div><div className="bank-grid">{values.bank_accounts.map(account => <div className="bank-card" key={account.id}><strong>{account.bank_name}</strong><span>{account.account_name}</span><b>{account.account_number}</b><small>{account.account_type === "checking" ? "Cheques" : "Ahorros"} · {account.currency}</small></div>)}</div><form action={addPlatformBankAccount} className="form platform-bank-form"><div className="field"><label>Banco</label><input name="bank_name" required/></div><div className="field"><label>Nombre de la cuenta</label><input name="account_name" required/></div><div className="field"><label>Número de cuenta</label><input name="account_number" required/></div><div className="field"><label>Tipo</label><select name="account_type"><option value="savings">Ahorros</option><option value="checking">Cheques</option></select></div><div className="field"><label>Moneda</label><select name="currency"><option>HNL</option><option>USD</option></select></div><div className="field"><label>Instrucciones para el cliente</label><input name="instructions" placeholder="Ej.: incluir nombre de la organización"/></div><div className="form-actions"><button className="button">Agregar cuenta receptora</button></div></form></article>
    </section>
  </PlatformShell>;
}
