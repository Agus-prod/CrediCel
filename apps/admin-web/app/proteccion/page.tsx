import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendDeviceCommand } from "./actions";
import {
  EnrollmentGenerator,
  type EnrollmentOption,
} from "./enrollment-generator";

const relation = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

const statusLabels: Readonly<Record<string, string>> = {
  pending: "QR generado / pendiente",
  enrolled: "Protegido",
  locked: "Bloqueado",
  released: "Liberado",
  revoked: "Revocado",
};

const managementLabels: Readonly<Record<string, string>> = {
  fully_managed: "Administración completa",
  company_owned_personal: "Corporativo con uso personal",
  work_profile: "Perfil de trabajo",
};

type AccountRow = {
  id: string;
  status: string;
  customers: { first_name: string; last_name: string } | null;
  credit_applications: {
    inventory_unit_id: string | null;
    inventory_units: {
      id: string;
      imei_1: string;
      serial_number: string | null;
      mdm_compatible: boolean;
    } | null;
  } | null;
};

export default async function Protection({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    queued?: string;
    activated?: string;
    account_id?: string;
  }>;
}) {
  const query = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: enrollments }, { data: rawAccounts }] = await Promise.all([
    supabase
      .from("device_enrollments")
      .select(
        "id,status,last_seen_at,enrolled_at,management_mode,compliance_state,provider_enrollment_expires_at,last_error,inventory_units(imei_1,serial_number),credit_accounts(status,customers(first_name,last_name)),device_commands(id,command,status,requested_at)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("credit_accounts")
      .select(
        "id,status,customers(first_name,last_name),credit_applications(inventory_unit_id,inventory_units(id,imei_1,serial_number,mdm_compatible))",
      )
      .in("status", ["active", "delinquent"])
      .order("activated_at", { ascending: false }),
  ]);

  const options = ((rawAccounts ?? []) as unknown as AccountRow[]).flatMap(
    (account): EnrollmentOption[] => {
      const customer = relation(account.customers);
      const application = relation(account.credit_applications);
      const device = relation(application?.inventory_units ?? null);
      if (!customer || !device?.mdm_compatible) return [];
      return [
        {
          accountId: account.id,
          inventoryUnitId: device.id,
          customerName: `${customer.first_name} ${customer.last_name}`.trim(),
          imei: device.imei_1,
          serialNumber: device.serial_number,
          accountStatus: account.status === "delinquent" ? "En mora" : "Activo",
        },
      ];
    },
  );

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">CrediCel Protect</div>
            <h1>Protección de equipos</h1>
            <p className="muted">
              Genera QR de Android Enterprise y administra únicamente los
              dispositivos financiados de tu organización.
            </p>
          </div>
        </div>
        {query.error && <div className="error">{query.error}</div>}
        {query.queued && (
          <div className="notice">
            Orden colocada en la cola segura del dispositivo.
          </div>
        )}
        {query.activated && (
          <div className="notice">
            Crédito activado. Ya puedes generar el QR del dispositivo antes de
            entregarlo.
          </div>
        )}

        <EnrollmentGenerator
          options={options}
          selectedAccountId={query.account_id}
        />

        <div className="inventory-grid section">
          {(enrollments ?? []).map((enrollment) => {
            const device = relation(enrollment.inventory_units);
            const account = relation(enrollment.credit_accounts);
            const customer = relation(account?.customers ?? null);
            const commands = enrollment.device_commands ?? [];
            const latestCommand = [...commands].sort((left, right) =>
              right.requested_at.localeCompare(left.requested_at),
            )[0];
            return (
              <article className="card" key={enrollment.id}>
                <div className="application-head">
                  <div>
                    <span className="eyebrow">IMEI {device?.imei_1}</span>
                    <h2>
                      {customer
                        ? `${customer.first_name} ${customer.last_name}`
                        : "Sin crédito vinculado"}
                    </h2>
                  </div>
                  <span
                    className={`badge ${
                      enrollment.status === "locked"
                        ? "danger"
                        : enrollment.status === "pending"
                          ? "warning"
                          : "success"
                    }`}
                  >
                    {statusLabels[enrollment.status] ?? enrollment.status}
                  </span>
                </div>
                <div className="mdm-device-summary">
                  <span>
                    Modo: {managementLabels[enrollment.management_mode ?? ""] ?? "Pendiente"}
                  </span>
                  <span>
                    Cumplimiento: {enrollment.compliance_state ?? "unknown"}
                  </span>
                  <span>
                    Última conexión: {enrollment.last_seen_at ?? "Aún no conectado"}
                  </span>
                  {enrollment.status === "pending" &&
                    enrollment.provider_enrollment_expires_at && (
                      <span>
                        QR vence: {new Date(enrollment.provider_enrollment_expires_at).toLocaleString("es-HN")}
                      </span>
                    )}
                  {latestCommand && (
                    <span>
                      Última orden: {latestCommand.command} · {latestCommand.status}
                    </span>
                  )}
                </div>
                {enrollment.last_error && (
                  <div className="error">{enrollment.last_error}</div>
                )}
                <form action={sendDeviceCommand} className="command-form">
                  <input
                    name="enrollment_id"
                    type="hidden"
                    value={enrollment.id}
                  />
                  <select name="command" required>
                    <option value="show_payment_notice">
                      Mostrar recordatorio
                    </option>
                    <option value="sync_policy">Sincronizar política</option>
                    <option value="lock">Bloquear por mora</option>
                    <option value="unlock">Desbloquear</option>
                    <option value="release">Liberar al finalizar</option>
                  </select>
                  <input
                    name="reason"
                    placeholder="Motivo obligatorio"
                    required
                  />
                  <button
                    className="button"
                    disabled={!enrollment.enrolled_at}
                    type="submit"
                  >
                    Enviar orden
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
