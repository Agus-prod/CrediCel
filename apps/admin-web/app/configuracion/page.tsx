import { configurationStateSchema } from "@credicel/validation";
import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import type { z } from "zod";
import { publishConfigurationDraft, saveConfigurationDraft } from "./actions";

type ConfigurationState = z.infer<typeof configurationStateSchema>;
type ConfigurationVersion = NonNullable<ConfigurationState["active"]>;

const keys = {
  minimumDownPayment: "credit.minimum_down_payment_percentage",
  maximumTerm: "credit.maximum_term_months",
  maximumPaymentIncome: "credit.maximum_payment_income_percentage",
  minimumEmployment: "credit.minimum_employment_months",
  guarantorScore: "credit.require_guarantor_below_score",
} as const;

function dateInputValue(value: string | null): string {
  return value?.slice(0, 10) ?? "";
}

function readableDate(value: string | null): string {
  if (value === null) return "Sin fecha final";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(date);
}

function valueOf(
  version: ConfigurationVersion,
  key: keyof ConfigurationVersion["values"],
): number {
  return version.values[key];
}

export default async function Configuration({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    saved?: string;
    published?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("get_configuration_state");
  const parsed = configurationStateSchema.safeParse(data);
  const today = new Date().toISOString().slice(0, 10);

  if (
    error ||
    !parsed.success ||
    parsed.data.active === null ||
    parsed.data.draft === null
  ) {
    return (
      <AppShell>
        <section className="section">
          <div className="toolbar">
            <div>
              <div className="eyebrow">Política versionada</div>
              <h1>Configuración de crédito</h1>
            </div>
          </div>
          <div className="error">
            {error?.message ??
              "No fue posible cargar una versión activa y su borrador."}
          </div>
        </section>
      </AppShell>
    );
  }

  const { active, draft } = parsed.data;

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Política versionada</div>
            <h1>Configuración de crédito</h1>
            <p className="muted">
              Los cambios se preparan en un borrador auditable y solo afectan
              solicitudes nuevas después de publicarse.
            </p>
          </div>
        </div>

        {query.error && <div className="error">{query.error}</div>}
        {query.saved && (
          <div className="notice">
            Borrador guardado sin modificar la versión vigente.
          </div>
        )}
        {query.published && (
          <div className="notice">
            Nueva versión publicada y asociada a futuras solicitudes.
          </div>
        )}

        <article className="card form-card">
          <div className="form-title">
            <div>
              <div className="eyebrow">Versión vigente</div>
              <h2>Versión {active.version}</h2>
              <p className="muted">
                Desde {readableDate(active.effective_from)} ·{" "}
                {readableDate(active.effective_until)}
              </p>
            </div>
            <span className="badge success">Publicada</span>
          </div>
          <div className="decision-summary">
            <div>
              <small>Prima mínima</small>
              <strong>{valueOf(active, keys.minimumDownPayment)}%</strong>
            </div>
            <div>
              <small>Plazo máximo</small>
              <strong>{valueOf(active, keys.maximumTerm)} meses</strong>
            </div>
            <div>
              <small>Cuota / ingreso</small>
              <strong>{valueOf(active, keys.maximumPaymentIncome)}%</strong>
            </div>
            <div>
              <small>Empleo mínimo</small>
              <strong>{valueOf(active, keys.minimumEmployment)} meses</strong>
            </div>
          </div>
        </article>

        <article className="card form-card section">
          <div className="form-title">
            <div>
              <div className="eyebrow">Borrador editable</div>
              <h2>Versión {draft.version}</h2>
              <p className="muted">
                Guardar conserva el borrador; publicar reemplaza atómicamente la
                versión activa.
              </p>
            </div>
            <span className="badge warning">Borrador</span>
          </div>

          <form action={saveConfigurationDraft} className="form">
            <input name="version_id" type="hidden" value={draft.id} />

            <div className="field">
              <label htmlFor="minimum_down_payment_percentage">
                Prima mínima (%)
              </label>
              <input
                defaultValue={valueOf(draft, keys.minimumDownPayment)}
                id="minimum_down_payment_percentage"
                max="90"
                min="0"
                name="minimum_down_payment_percentage"
                required
                step="0.01"
                type="number"
              />
            </div>

            <div className="field">
              <label htmlFor="maximum_term_months">Plazo máximo (meses)</label>
              <input
                defaultValue={valueOf(draft, keys.maximumTerm)}
                id="maximum_term_months"
                max="120"
                min="1"
                name="maximum_term_months"
                required
                step="1"
                type="number"
              />
            </div>

            <div className="field">
              <label htmlFor="maximum_payment_income_percentage">
                Cuota máxima sobre ingreso (%)
              </label>
              <input
                defaultValue={valueOf(draft, keys.maximumPaymentIncome)}
                id="maximum_payment_income_percentage"
                max="100"
                min="1"
                name="maximum_payment_income_percentage"
                required
                step="0.01"
                type="number"
              />
            </div>

            <div className="field">
              <label htmlFor="minimum_employment_months">
                Antigüedad laboral mínima (meses)
              </label>
              <input
                defaultValue={valueOf(draft, keys.minimumEmployment)}
                id="minimum_employment_months"
                max="600"
                min="0"
                name="minimum_employment_months"
                required
                step="1"
                type="number"
              />
            </div>

            <div className="field">
              <label htmlFor="require_guarantor_below_score">
                Solicitar aval debajo de puntuación
              </label>
              <input
                defaultValue={valueOf(draft, keys.guarantorScore)}
                id="require_guarantor_below_score"
                max="100"
                min="0"
                name="require_guarantor_below_score"
                required
                step="1"
                type="number"
              />
            </div>

            <div className="field">
              <label htmlFor="effective_from">Vigente desde</label>
              <input
                defaultValue={dateInputValue(draft.effective_from)}
                id="effective_from"
                max={today}
                name="effective_from"
                required
                type="date"
              />
            </div>

            <div className="field">
              <label htmlFor="effective_until">Vigente hasta (opcional)</label>
              <input
                defaultValue={dateInputValue(draft.effective_until)}
                id="effective_until"
                name="effective_until"
                type="date"
              />
            </div>

            <p className="muted">
              Esta fase registra políticas y su versión. No calcula intereses ni
              una cuota financiera definitiva.
            </p>

            <div className="form-actions">
              <button className="button secondary" type="submit">
                Guardar borrador
              </button>
              <button
                className="button"
                formAction={publishConfigurationDraft}
                type="submit"
              >
                Guardar y publicar
              </button>
            </div>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
