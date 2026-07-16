import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";
import { submitCreditApplication } from "./actions";
const configurationResolutionSchema = z.object({ value: z.number() });
const resolvedNumber = (value: unknown) => {
  const parsed = configurationResolutionSchema.safeParse(value);
  return parsed.success ? parsed.data.value : null;
};
const relatedName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;
const Field = ({
  name,
  label,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) => (
  <div className="field">
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} type={type} required={required} />
  </div>
);
export default async function NewSale({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: access },
    { data: inventory },
    { data: maximumTermData },
    { data: minimumDownPaymentData },
  ] = await Promise.all([
    supabase
      .from("user_branch_access")
      .select("branch_id,branches(name)")
      .eq("profile_id", user?.id ?? ""),
    supabase
      .from("inventory_units")
      .select(
        "id,imei_1,color,storage_capacity,cash_price,product_models(name),product_brands(name)",
      )
      .eq("status", "available")
      .order("created_at"),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.maximum_term_months",
    }),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.minimum_down_payment_percentage",
    }),
  ]);
  const maximumTerm = resolvedNumber(maximumTermData);
  const minimumDownPayment = resolvedNumber(minimumDownPaymentData);
  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Venta financiada</div>
            <h1>Nueva solicitud de crédito</h1>
            <p className="muted">
              Captura el expediente completo sin salir del proceso de venta.
            </p>
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <form action={submitCreditApplication} className="workspace-stack">
          <div className="card form-card">
            <div className="form-title">
              <div>
                <h2>1. Identidad</h2>
                <p className="muted">Datos personales del solicitante.</p>
              </div>
              <span className="step">Paso 1 de 5</span>
            </div>
            <div className="form">
              <Field name="dni" label="DNI" />
              <Field
                name="birth_date"
                label="Fecha de nacimiento"
                type="date"
              />
              <Field name="first_name" label="Nombres" />
              <Field name="last_name" label="Apellidos" />
              <Field name="phone" label="Teléfono" type="tel" />
              <Field
                name="email"
                label="Correo"
                type="email"
                required={false}
              />
              <div className="field">
                <label htmlFor="marital_status">Estado civil</label>
                <select id="marital_status" name="marital_status" required>
                  <option value="single">Soltero(a)</option>
                  <option value="married">Casado(a)</option>
                  <option value="union">Unión libre</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <Field name="dependents" label="Dependientes" type="number" />
            </div>
          </div>
          <div className="card form-card">
            <div className="form-title">
              <div>
                <h2>2. Domicilio e ingresos</h2>
                <p className="muted">
                  Información para evaluar capacidad de pago.
                </p>
              </div>
              <span className="step">Paso 2 de 5</span>
            </div>
            <div className="form">
              <Field name="current_address" label="Dirección actual" />
              <div className="field">
                <label htmlFor="housing_type">Vivienda</label>
                <select id="housing_type" name="housing_type" required>
                  <option value="owned">Propia</option>
                  <option value="rented">Alquilada</option>
                  <option value="family">Familiar</option>
                </select>
              </div>
              <Field
                name="employer_name"
                label="Empresa o actividad económica"
              />
              <Field name="job_title" label="Cargo u oficio" required={false} />
              <Field
                name="employment_months"
                label="Antigüedad laboral (meses)"
                type="number"
              />
              <Field
                name="monthly_income"
                label="Ingreso mensual"
                type="number"
              />
              <Field
                name="monthly_expenses"
                label="Gastos mensuales"
                type="number"
              />
            </div>
          </div>
          <div className="card form-card">
            <div className="form-title">
              <div>
                <h2>3. Referencias</h2>
                <p className="muted">Dos contactos personales verificables.</p>
              </div>
              <span className="step">Paso 3 de 5</span>
            </div>
            <div className="form">
              <Field name="reference_one_name" label="Referencia 1 · nombre" />
              <Field
                name="reference_one_phone"
                label="Referencia 1 · teléfono"
                type="tel"
              />
              <Field
                name="reference_one_relationship"
                label="Referencia 1 · relación"
              />
              <Field name="reference_two_name" label="Referencia 2 · nombre" />
              <Field
                name="reference_two_phone"
                label="Referencia 2 · teléfono"
                type="tel"
              />
              <Field
                name="reference_two_relationship"
                label="Referencia 2 · relación"
              />
            </div>
          </div>
          <div className="card form-card">
            <div className="form-title">
              <div>
                <h2>4. Documentos</h2>
                <p className="muted">
                  En móvil puedes usar directamente la cámara.
                </p>
              </div>
              <span className="step">Paso 4 de 5</span>
            </div>
            <div className="form">
              {[
                ["dni_front", "DNI frontal"],
                ["dni_back", "DNI posterior"],
                ["selfie", "Selfie del cliente"],
                ["address_proof", "Comprobante de domicilio"],
              ].map(([name, label]) => (
                <div className="field" key={name}>
                  <label htmlFor={name}>{label}</label>
                  <input
                    accept="image/jpeg,image/png,application/pdf"
                    capture={name === "selfie" ? "user" : "environment"}
                    id={name}
                    name={name}
                    type="file"
                    required
                  />
                  <small className="field-help">
                    JPG, PNG o PDF. Máximo 7 MB.
                  </small>
                </div>
              ))}
            </div>
          </div>
          <div className="card form-card">
            <div className="form-title">
              <div>
                <h2>5. Dispositivo y condiciones</h2>
                <p className="muted">
                  Confirma el financiamiento antes de enviar.
                </p>
              </div>
              <span className="step">Paso 5 de 5</span>
            </div>
            <div className="form">
              <div className="field">
                <label htmlFor="branch_id">Tienda</label>
                <select id="branch_id" name="branch_id" required>
                  <option value="">Selecciona una tienda</option>
                  {(access ?? []).map((row) => (
                    <option value={row.branch_id} key={row.branch_id}>
                      {relatedName(row.branches)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inventory_unit_id">
                  Dispositivo disponible
                </label>
                <select
                  id="inventory_unit_id"
                  name="inventory_unit_id"
                  required
                >
                  <option value="">Selecciona un dispositivo</option>
                  {(inventory ?? []).map((unit) => (
                    <option value={unit.id} key={unit.id}>
                      {unit.imei_1} · {relatedName(unit.product_brands)}{" "}
                      {relatedName(unit.product_models)} · L {unit.cash_price}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                name="requested_price"
                label="Precio financiado"
                type="number"
              />
              <Field
                name="down_payment"
                label="Prima propuesta"
                type="number"
              />
              <div className="field">
                <label htmlFor="term">Plazo propuesto (meses)</label>
                <input
                  disabled={maximumTerm === null}
                  id="term"
                  max={maximumTerm ?? undefined}
                  min={1}
                  name="term"
                  required
                  type="number"
                />
                <small className="field-help">
                  {maximumTerm === null
                    ? "No existe una configuración de crédito vigente."
                    : `Máximo vigente: ${maximumTerm} meses.`}
                </small>
              </div>
              <div className="notice" role="note">
                {minimumDownPayment === null
                  ? "La prima será validada por la configuración vigente al enviar."
                  : `Prima mínima vigente: ${minimumDownPayment}% del precio solicitado.`}
              </div>
              <label className="consent">
                <input
                  name="consent_data_processing"
                  type="checkbox"
                  required
                />{" "}
                El cliente autoriza el tratamiento de sus datos.
              </label>
              <label className="consent">
                <input name="consent_credit_review" type="checkbox" required />{" "}
                El cliente autoriza la evaluación crediticia.
              </label>
              <div className="form-actions">
                <button
                  className="button"
                  disabled={maximumTerm === null}
                  type="submit"
                >
                  Enviar a análisis
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
