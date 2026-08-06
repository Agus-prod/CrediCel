import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { reportSubscriptionTransfer } from "./actions";

type Summary = {
  subscription: { status: string; days_remaining: number };
  plan: { code: string; name: string; limits: Record<string, number> };
  usage: Record<string, number>;
  pending_payment: null | {
    plan_name: string;
    amount: number;
    reference_number: string;
  };
};
type PlanLimits = Record<string, number> & { customers: number };

const metricLabels: Readonly<Record<string, string>> = {
  branches: "Tiendas",
  users: "Usuarios",
  customers: "Clientes",
  applications_monthly: "Solicitudes este mes",
};
const featureLabels: Readonly<Record<string, string>> = {
  credit: "Ventas y análisis de crédito",
  inventory: "Inventario y traslados",
  payments: "Pagos y cuotas",
  collections: "Cobranza",
  reports: "Reportes",
  advanced_audit: "Auditoría avanzada",
  priority_support: "Soporte prioritario",
  legal_templates: "Contratos y documentos personalizados",
};
const money = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  maximumFractionDigits: 0,
});
const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;

export default async function SubscriptionPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    expired?: string;
    plan?: string;
    reported?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: summaryData },
    { data: plans },
    { data: bankAccounts },
    { data: roles },
  ] = await Promise.all([
    supabase.rpc("subscription_summary"),
    supabase
      .from("subscription_plans")
      .select(
        "code,name,description,monthly_price,annual_price,limits,features",
      )
      .eq("status", "active")
      .neq("code", "trial")
      .order("monthly_price"),
    supabase
      .from("platform_bank_accounts")
      .select(
        "id,bank_name,account_name,account_number,account_type,currency,instructions",
      )
      .eq("status", "active"),
    user
      ? supabase
          .from("profile_roles")
          .select("roles(name)")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);
  const summary = summaryData as Summary | null;
  const isOwner = (roles ?? []).some(
    (row) => relationName(row.roles) === "organization_owner",
  );
  if (!summary)
    return (
      <AppShell>
        <div className="error">
          No se encontró una suscripción para esta organización.
        </div>
      </AppShell>
    );
  const locked = ["expired", "suspended", "cancelled"].includes(
    summary.subscription.status,
  );
  const requestedPlan = query.plan ?? "";
  const selectedPlan = (plans ?? []).find(
    (plan) => plan.code === requestedPlan,
  );

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Suscripción</div>
            <h1>Plan y uso</h1>
            <p className="muted">
              Controla capacidad, vigencia y pagos de tu organización.
            </p>
          </div>
        </div>
        {(query.expired || locked) && (
          <div className="subscription-lock">
            <div>
              <strong>Acceso operativo bloqueado</strong>
              <span>
                La prueba o el período pagado terminó. Tus datos permanecen
                seguros. El propietario debe reportar el pago de un plan para
                reactivar la organización.
              </span>
            </div>
            <form action={logout}>
              <button className="subscription-signout" type="submit">
                Cerrar sesión y usar otra cuenta
              </button>
            </form>
          </div>
        )}
        {query.error && <div className="error">{query.error}</div>}
        {query.reported && (
          <div className="notice">
            Transferencia reportada. Activaremos el plan después de verificarla.
          </div>
        )}
        {summary.pending_payment && (
          <div className="pending-payment">
            <div>
              <span className="eyebrow">Pago en revisión</span>
              <strong>
                {summary.pending_payment.plan_name} ·{" "}
                {money.format(summary.pending_payment.amount)}
              </strong>
              <small>
                Referencia {summary.pending_payment.reference_number}
              </small>
            </div>
            <span className="badge warning">Pendiente</span>
          </div>
        )}
        <div className="subscription-hero">
          <div>
            <span className="eyebrow">Plan actual</span>
            <h2>{summary.plan.name}</h2>
            <p>
              {summary.subscription.status === "trialing"
                ? `${summary.subscription.days_remaining} días restantes de prueba gratuita`
                : locked
                  ? "Período vencido"
                  : `${summary.subscription.days_remaining} días restantes del período`}
            </p>
          </div>
          <strong>
            {summary.subscription.status === "trialing"
              ? "Prueba de 14 días"
              : locked
                ? "Bloqueado"
                : "Plan activo"}
          </strong>
        </div>
        <div className="usage-grid">
          {Object.entries(summary.plan.limits).map(([metric, limit]) => {
            const used = summary.usage[metric] ?? 0;
            const percent = Math.min(100, Math.round((used / limit) * 100));
            return (
              <article className="card" key={metric}>
                <span className="muted">{metricLabels[metric] ?? metric}</span>
                <h2>
                  {used} <small>de {limit}</small>
                </h2>
                <div className="usage-bar">
                  <i style={{ width: `${percent}%` }} />
                </div>
                <small>{Math.max(0, limit - used)} disponibles</small>
              </article>
            );
          })}
        </div>
        <section className="section">
          <div className="toolbar">
            <div>
              <h2>Planes disponibles</h2>
              <p className="muted">
                El precio anual equivale a diez mensualidades.
              </p>
            </div>
          </div>
          <div className="plans-grid">
            {(plans ?? []).map((plan) => {
              const limits = plan.limits as PlanLimits;
              const features = plan.features as Record<string, boolean>;
              const expiredParam = query.expired ? "&expired=1" : "";
              return (
                <article
                  className={`card plan-card ${summary.plan.code === plan.code ? "selected-plan" : ""}`}
                  key={plan.code}
                >
                  <div>
                    <span className="eyebrow">
                      {summary.plan.code === plan.code && !locked
                        ? "Plan actual"
                        : "Disponible"}
                    </span>
                    <h2>{plan.name}</h2>
                    <p className="muted">{plan.description}</p>
                    <div className="plan-price">
                      {money.format(Number(plan.monthly_price))}
                      <small>/mes</small>
                    </div>
                    <small>
                      o {money.format(Number(plan.annual_price))} al año
                    </small>
                  </div>
                  <ul>
                    <li>{limits.customers.toLocaleString("es-HN")} clientes</li>
                    <li>
                      {limits.branches} tienda{limits.branches !== 1 ? "s" : ""}
                    </li>
                    <li>{limits.users} usuarios</li>
                    <li>{limits.applications_monthly} solicitudes mensuales</li>
                    {Object.entries(features)
                      .filter(([, enabled]) => enabled)
                      .map(([feature]) => (
                        <li key={feature}>
                          ✓ {featureLabels[feature] ?? feature}
                        </li>
                      ))}
                  </ul>
                  <a
                    className="button plan-action"
                    href={`/suscripcion?plan=${encodeURIComponent(plan.code)}${expiredParam}#comprar-plan`}
                  >
                    Elegir {plan.name}
                  </a>
                </article>
              );
            })}
          </div>
        </section>
        <section className="section subscription-payment" id="comprar-plan">
          <div>
            <span className="eyebrow">Pago por transferencia</span>
            <h2>
              {selectedPlan
                ? `Pagar plan ${selectedPlan.name}`
                : "Compra o renueva un plan"}
            </h2>
            <p className="muted">
              Transfiere el valor exacto y reporta la referencia. La activación
              ocurre después de verificar el abono.
            </p>
          </div>
          {(bankAccounts ?? []).length === 0 ? (
            <div className="error">
              La cuenta receptora aún no está configurada. Contacta al soporte.
            </div>
          ) : (
            <div className="bank-grid">
              {(bankAccounts ?? []).map((account) => (
                <article className="bank-card" key={account.id}>
                  <strong>{account.bank_name}</strong>
                  <span>{account.account_name}</span>
                  <b>{account.account_number}</b>
                  <small>
                    {account.account_type === "checking"
                      ? "Cuenta de cheques"
                      : "Cuenta de ahorros"}{" "}
                    · {account.currency}
                  </small>
                  {account.instructions && (
                    <small>{account.instructions}</small>
                  )}
                </article>
              ))}
            </div>
          )}
          {!isOwner ? (
            <div className="notice">
              Solo el propietario puede reportar la compra de un plan.
            </div>
          ) : summary.pending_payment ? (
            <div className="notice">Ya existe un pago en revisión.</div>
          ) : (
            (bankAccounts ?? []).length > 0 && (
              <form
                action={reportSubscriptionTransfer}
                className="form subscription-transfer-form"
              >
                <div className="field">
                  <label htmlFor="plan">Plan</label>
                  <select
                    defaultValue={selectedPlan?.code ?? ""}
                    id="plan"
                    name="plan"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {(plans ?? []).map((plan) => (
                      <option value={plan.code} key={plan.code}>
                        {plan.name} · {money.format(Number(plan.monthly_price))}
                        /mes
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="billing_cycle">Facturación</label>
                  <select id="billing_cycle" name="billing_cycle">
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual (2 meses gratis)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="origin_bank">Banco de origen</label>
                  <input
                    id="origin_bank"
                    name="origin_bank"
                    minLength={2}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="reference_number">Referencia</label>
                  <input
                    id="reference_number"
                    name="reference_number"
                    minLength={3}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="transferred_on">Fecha</label>
                  <input
                    id="transferred_on"
                    name="transferred_on"
                    type="date"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button className="button" type="submit">
                    Reportar transferencia
                  </button>
                </div>
              </form>
            )
          )}
        </section>
      </section>
    </AppShell>
  );
}
