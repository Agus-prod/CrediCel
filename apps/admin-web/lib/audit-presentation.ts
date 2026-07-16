type AuditAction = "insert" | "update" | "delete" | string;

type EntityDefinition = {
  readonly article: "el" | "la";
  readonly label: string;
};

export type AuditChange = {
  readonly field: string;
  readonly previous: string | null;
  readonly current: string | null;
};

export type AuditPresentation = {
  readonly actionLabel: string;
  readonly changes: readonly AuditChange[];
  readonly entityLabel: string;
  readonly title: string;
  readonly tone: "success" | "warning" | "danger" | "neutral";
};

const entityDefinitions: Readonly<Record<string, EntityDefinition>> = {
  organizations: { article: "la", label: "organización" },
  business_units: { article: "la", label: "unidad comercial" },
  branches: { article: "la", label: "tienda" },
  profiles: { article: "el", label: "usuario" },
  user_organization_memberships: { article: "el", label: "acceso del usuario" },
  organization_user_roles: { article: "el", label: "rol del usuario" },
  customers: { article: "el", label: "cliente" },
  customer_addresses: { article: "la", label: "dirección del cliente" },
  customer_employment: { article: "el", label: "empleo del cliente" },
  customer_references: { article: "la", label: "referencia personal" },
  customer_consents: { article: "el", label: "consentimiento" },
  customer_documents: { article: "el", label: "documento del expediente" },
  credit_applications: { article: "la", label: "solicitud de crédito" },
  credit_application_profiles: { article: "el", label: "perfil financiero" },
  credit_application_decisions: { article: "la", label: "decisión de crédito" },
  credit_risk_assessments: { article: "la", label: "evaluación de crédito" },
  credit_policies: { article: "la", label: "política de crédito" },
  credit_accounts: { article: "el", label: "crédito" },
  credit_installments: { article: "la", label: "cuota" },
  credit_contracts: { article: "el", label: "contrato" },
  product_brands: { article: "la", label: "marca" },
  product_models: { article: "el", label: "modelo" },
  inventory_units: { article: "el", label: "dispositivo" },
  inventory_unit_movements: {
    article: "el",
    label: "movimiento de inventario",
  },
  inventory_transfers: { article: "el", label: "traslado" },
  inventory_transfer_items: { article: "el", label: "dispositivo trasladado" },
  transfer_reports: { article: "el", label: "reporte de pago" },
  transfer_report_files: { article: "el", label: "comprobante de pago" },
  payment_applications: { article: "la", label: "aplicación del pago" },
  cash_transactions: { article: "el", label: "movimiento de caja" },
  collection_actions: { article: "la", label: "gestión de cobranza" },
  organization_subscriptions: { article: "la", label: "suscripción" },
  team_invitations: { article: "la", label: "invitación al equipo" },
  configuration_versions: { article: "la", label: "versión de configuración" },
  configuration_values: { article: "el", label: "parámetro de configuración" },
  rule_sets: { article: "el", label: "conjunto de reglas" },
  business_rules: { article: "la", label: "regla de negocio" },
  rule_conditions: { article: "la", label: "condición de la regla" },
  rule_actions: { article: "la", label: "acción de la regla" },
  rule_execution_logs: { article: "la", label: "evaluación de reglas" },
  device_enrollments: { article: "la", label: "protección del dispositivo" },
  device_commands: { article: "la", label: "orden del dispositivo" },
};

const fieldLabels: Readonly<Record<string, string>> = {
  name: "Nombre",
  full_name: "Nombre completo",
  commercial_name: "Nombre comercial",
  first_name: "Nombres",
  last_name: "Apellidos",
  code: "Código",
  status: "Estado",
  version: "Versión",
  email: "Correo",
  phone: "Teléfono",
  national_id: "DNI",
  role_name: "Rol",
  address: "Dirección",
  branch_type: "Tipo de tienda",
  requested_price: "Precio solicitado",
  proposed_down_payment: "Prima propuesta",
  proposed_term: "Plazo propuesto",
  approved_amount: "Monto aprobado",
  approved_down_payment: "Prima aprobada",
  approved_term: "Plazo aprobado",
  monthly_income: "Ingreso mensual",
  monthly_expenses: "Gastos mensuales",
  employment_months: "Antigüedad laboral",
  employer_name: "Empresa donde trabaja",
  position: "Puesto",
  decision_type: "Decisión",
  recommendation: "Recomendación",
  reason: "Motivo",
  notes: "Notas",
  document_type: "Documento",
  review_status: "Revisión",
  imei_1: "IMEI principal",
  imei_2: "IMEI secundario",
  serial_number: "Número de serie",
  cash_price: "Precio de contado",
  cost: "Costo",
  color: "Color",
  storage_capacity: "Almacenamiento",
  ram_capacity: "Memoria RAM",
  condition: "Condición",
  reference_number: "Referencia bancaria",
  origin_bank: "Banco de origen",
  amount: "Monto",
  transferred_on: "Fecha de transferencia",
  due_date: "Fecha de vencimiento",
  paid_at: "Fecha de pago",
  key: "Parámetro",
  value: "Valor",
  effective_from: "Vigente desde",
  effective_to: "Vigente hasta",
  published_at: "Fecha de publicación",
  priority: "Prioridad",
  action_type: "Tipo de gestión",
  promised_date: "Fecha prometida",
  command: "Orden",
};

const translatedValues: Readonly<Record<string, string>> = {
  active: "Activo",
  inactive: "Inactivo",
  draft: "Borrador",
  published: "Publicado",
  pending: "Pendiente",
  under_review: "En revisión",
  needs_info: "Información pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  conditional: "Condicionado",
  activated: "Activado",
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
  financed_active: "Financiado",
  requested: "Solicitado",
  in_transit: "En tránsito",
  received: "Recibido",
  discrepancy: "Con diferencia",
  cancelled: "Cancelado",
  delinquent: "En mora",
  paid: "Pagado",
  partial: "Pago parcial",
  duplicate_suspected: "Posible duplicado",
  accepted: "Aceptado",
  revoked: "Revocado",
  trialing: "Prueba gratuita",
  expired: "Vencido",
  organization_owner: "Propietario",
  organization_admin: "Administrador",
  branch_manager: "Gerente de tienda",
  salesperson: "Vendedor",
  credit_analyst: "Analista de crédito",
  credit_manager: "Responsable de crédito",
  cashier: "Caja",
  inventory_manager: "Inventario",
  collections_agent: "Cobranza",
  auditor: "Auditor",
  dni_front: "Identidad — frente",
  dni_back: "Identidad — reverso",
  selfie: "Fotografía del cliente",
  address_proof: "Comprobante de domicilio",
};

const hiddenFields = new Set([
  "id",
  "organization_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "metadata",
  "storage_path",
  "checksum",
  "access_token",
  "token",
  "password_hash",
]);

const priorityFields = [
  "name",
  "full_name",
  "commercial_name",
  "first_name",
  "last_name",
  "code",
  "status",
  "email",
  "role_name",
  "reference_number",
  "origin_bank",
  "amount",
  "requested_price",
  "proposed_down_payment",
  "proposed_term",
  "decision_type",
  "recommendation",
  "document_type",
  "review_status",
  "imei_1",
  "key",
  "value",
  "version",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function humanizeIdentifier(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Dato";
}

function isVisibleField(field: string): boolean {
  return (
    !hiddenFields.has(field) &&
    (field === "national_id" || !field.endsWith("_id"))
  );
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(parsed);
}

function formatObject(value: Record<string, unknown>, depth: number): string {
  if (depth > 1) return "Detalle registrado";

  const entries = Object.entries(value)
    .filter(([field, nested]) => isVisibleField(field) && nested !== null)
    .slice(0, 4);

  if (entries.length === 0) return "Detalle registrado";

  return entries
    .map(
      ([field, nested]) =>
        `${fieldLabels[field] ?? humanizeIdentifier(field)}: ${formatValue(field, nested, depth + 1)}`,
    )
    .join(" · ");
}

function formatValue(field: string, value: unknown, depth = 0): string {
  if (value === null || value === undefined || value === "") return "Sin valor";
  if (typeof value === "boolean") return value ? "Sí" : "No";

  if (typeof value === "number") {
    if (
      field === "proposed_term" ||
      field === "approved_term" ||
      field === "employment_months"
    ) {
      return `${value} ${value === 1 ? "mes" : "meses"}`;
    }

    if (
      /(amount|price|cost|income|expenses|payment|balance|down_payment)/.test(
        field,
      )
    ) {
      return new Intl.NumberFormat("es-HN", {
        style: "currency",
        currency: "HNL",
      }).format(value);
    }

    return new Intl.NumberFormat("es-HN", { maximumFractionDigits: 4 }).format(
      value,
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "Sin elementos";
    if (
      value.every((item) =>
        ["string", "number", "boolean"].includes(typeof item),
      )
    ) {
      return value
        .slice(0, 4)
        .map((item) => formatValue(field, item, depth + 1))
        .join(", ");
    }
    return `${value.length} ${value.length === 1 ? "elemento" : "elementos"}`;
  }

  if (typeof value === "object")
    return formatObject(value as Record<string, unknown>, depth);

  const text = String(value);
  if (/(^|_)(dni|national_id)$/.test(field)) {
    const digits = text.replace(/\D/g, "");
    return digits.length >= 5
      ? `••••••••${digits.slice(-5)}`
      : "Información protegida";
  }
  if (/(^|_)phone$/.test(field)) {
    const digits = text.replace(/\D/g, "");
    return digits.length >= 4
      ? `••••${digits.slice(-4)}`
      : "Información protegida";
  }
  if (field === "email") {
    const [local, domain] = text.split("@");
    return local && domain
      ? `${local.slice(0, 1)}•••@${domain}`
      : "Información protegida";
  }
  if (field === "address" || field === "current_address") {
    return "Información protegida";
  }
  const translated = translatedValues[text.toLowerCase()];
  if (translated) return translated;

  if (/(date|_at$|_on$|effective_)/.test(field)) {
    return formatDate(text) ?? text;
  }

  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function displaySubject(values: Record<string, unknown>): string | null {
  const firstName =
    typeof values.first_name === "string" ? values.first_name.trim() : "";
  const lastName =
    typeof values.last_name === "string" ? values.last_name.trim() : "";
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();

  for (const field of [
    "name",
    "full_name",
    "commercial_name",
    "code",
    "reference_number",
    "imei_1",
  ]) {
    const value = values[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function orderedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const fields = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ].filter(isVisibleField);
  return fields.sort((left, right) => {
    const leftPriority = priorityFields.indexOf(left);
    const rightPriority = priorityFields.indexOf(right);
    const normalizedLeft =
      leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
    const normalizedRight =
      rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;
    return normalizedLeft - normalizedRight || left.localeCompare(right, "es");
  });
}

function buildChanges(
  action: AuditAction,
  beforeValue: unknown,
  afterValue: unknown,
): readonly AuditChange[] {
  const before = asRecord(beforeValue);
  const after = asRecord(afterValue);

  return orderedFields(before, after)
    .filter((field) => {
      if (action === "update") return !valuesMatch(before[field], after[field]);
      const value = action === "delete" ? before[field] : after[field];
      return value !== null && value !== undefined && value !== "";
    })
    .slice(0, 8)
    .map((field) => ({
      field: fieldLabels[field] ?? humanizeIdentifier(field),
      previous:
        action === "insert" || before[field] === undefined
          ? null
          : formatValue(field, before[field]),
      current:
        action === "delete" || after[field] === undefined
          ? null
          : formatValue(field, after[field]),
    }));
}

export function presentAuditEvent(input: {
  readonly action: AuditAction;
  readonly afterValues: unknown;
  readonly beforeValues: unknown;
  readonly entityType: string;
}): AuditPresentation {
  const definition = entityDefinitions[input.entityType] ?? {
    article: "el" as const,
    label: humanizeIdentifier(input.entityType).toLowerCase(),
  };
  const currentValues = asRecord(input.afterValues);
  const previousValues = asRecord(input.beforeValues);
  const subject = displaySubject(
    Object.keys(currentValues).length ? currentValues : previousValues,
  );

  const action =
    input.action === "insert"
      ? { label: "Creación", tone: "success" as const, verb: "Se creó" }
      : input.action === "update"
        ? {
            label: "Actualización",
            tone: "warning" as const,
            verb: "Se actualizó",
          }
        : input.action === "delete"
          ? {
              label: "Eliminación",
              tone: "danger" as const,
              verb: "Se eliminó",
            }
          : {
              label: "Cambio",
              tone: "neutral" as const,
              verb: "Se registró un cambio en",
            };

  return {
    actionLabel: action.label,
    changes: buildChanges(input.action, input.beforeValues, input.afterValues),
    entityLabel: definition.label,
    title: `${action.verb} ${definition.article} ${definition.label}${subject ? ` “${subject}”` : ""}`,
    tone: action.tone,
  };
}
