import * as Crypto from "expo-crypto";
import type { ImagePickerAsset } from "expo-image-picker";
import { getSupabase } from "../lib/supabase";
import {
  one,
  type ApplicationForm,
  type BranchOption,
  type CapturedDocuments,
  type DocumentType,
  type InventoryDevice,
  type Relation,
} from "../types";

const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png"]);

interface RawBranchAccess {
  readonly branches: Relation<{ readonly id: string; readonly name: string }>;
}

interface RawInventoryDevice {
  readonly id: string;
  readonly current_branch_id: string;
  readonly imei_1: string;
  readonly color: string | null;
  readonly storage_capacity: string | null;
  readonly cash_price: number;
  readonly product_brands: Relation<{ readonly name: string }>;
  readonly product_models: Relation<{ readonly name: string }>;
  readonly branches: Relation<{ readonly name: string }>;
}

export interface ApplicationOptions {
  readonly branches: readonly BranchOption[];
  readonly devices: readonly InventoryDevice[];
  readonly maximumTerm: number | null;
  readonly minimumDownPaymentPercentage: number | null;
}

export interface PendingApplication {
  readonly id: string;
  readonly organizationId: string;
  readonly customerId: string;
}

export async function loadApplicationOptions(
  userId: string,
): Promise<ApplicationOptions> {
  const supabase = getSupabase();
  const [
    { data: access, error: accessError },
    { data: inventory, error: inventoryError },
    { data: maximumTermData },
    { data: minimumDownPaymentData },
  ] = await Promise.all([
    supabase
      .from("user_branch_access")
      .select("branches(id,name)")
      .eq("profile_id", userId),
    supabase
      .from("inventory_units")
      .select(
        "id,current_branch_id,imei_1,color,storage_capacity,cash_price,product_brands(name),product_models(name),branches(name)",
      )
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.maximum_term_months",
    }),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.minimum_down_payment_percentage",
    }),
  ]);
  if (accessError)
    throw new Error("No se pudieron cargar tus tiendas autorizadas.");
  if (inventoryError)
    throw new Error("No se pudo cargar el inventario disponible.");

  const branchRows = (access ?? []) as unknown as readonly RawBranchAccess[];
  const inventoryRows = (inventory ??
    []) as unknown as readonly RawInventoryDevice[];
  const resolvedNumber = (value: unknown): number | null => {
    if (!value || typeof value !== "object" || !("value" in value)) return null;
    const resolved = value.value;
    return typeof resolved === "number" && Number.isFinite(resolved)
      ? resolved
      : null;
  };
  return {
    branches: branchRows.flatMap((row) => {
      const branch = one(row.branches);
      return branch ? [{ id: branch.id, name: branch.name }] : [];
    }),
    devices: inventoryRows.map((row) => ({
      id: row.id,
      branchId: row.current_branch_id,
      imei: row.imei_1,
      brand: one(row.product_brands)?.name ?? "Marca",
      model: one(row.product_models)?.name ?? "Modelo",
      color: row.color ?? "Sin color",
      storage: row.storage_capacity ?? "",
      cashPrice: Number(row.cash_price),
      branch: one(row.branches)?.name ?? "Tienda autorizada",
    })),
    maximumTerm: resolvedNumber(maximumTermData),
    minimumDownPaymentPercentage: resolvedNumber(minimumDownPaymentData),
  };
}

export async function createApplication(
  form: ApplicationForm,
): Promise<PendingApplication> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "submit_complete_credit_application",
    {
      p_branch_id: form.branchId,
      p_inventory_unit_id: form.inventoryUnitId,
      p_dni: form.dni,
      p_first_name: form.firstName.trim(),
      p_last_name: form.lastName.trim(),
      p_phone: form.phone,
      p_email: form.email.trim(),
      p_requested_price: Number(form.requestedPrice),
      p_down_payment: Number(form.downPayment),
      p_term: Number(form.term),
      p_birth_date: form.birthDate,
      p_marital_status: form.maritalStatus,
      p_dependents: Number(form.dependents),
      p_current_address: form.currentAddress.trim(),
      p_housing_type: form.housingType,
      p_employer_name: form.employerName.trim(),
      p_job_title: form.jobTitle.trim(),
      p_monthly_income: Number(form.monthlyIncome),
      p_monthly_expenses: Number(form.monthlyExpenses),
      p_employment_months: Number(form.employmentMonths),
      p_reference_one_name: form.referenceOneName.trim(),
      p_reference_one_phone: form.referenceOnePhone,
      p_reference_one_relationship: form.referenceOneRelationship.trim(),
      p_reference_two_name: form.referenceTwoName.trim(),
      p_reference_two_phone: form.referenceTwoPhone,
      p_reference_two_relationship: form.referenceTwoRelationship.trim(),
      p_consent_data_processing: form.consentDataProcessing,
      p_consent_credit_review: form.consentCreditReview,
    },
  );
  if (error || typeof data !== "string") {
    throw new Error(error?.message ?? "No fue posible crear la solicitud.");
  }
  const { data: application, error: applicationError } = await supabase
    .from("credit_applications")
    .select("id,organization_id,customer_id")
    .eq("id", data)
    .single();
  if (applicationError || !application) {
    throw new Error(
      "La solicitud se creó, pero no se pudo preparar su expediente.",
    );
  }
  return {
    id: application.id,
    organizationId: application.organization_id,
    customerId: application.customer_id,
  };
}

function documentMimeType(asset: ImagePickerAsset): "image/jpeg" | "image/png" {
  const mimeType = asset.mimeType?.toLowerCase() ?? "image/jpeg";
  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error("Las fotografías deben estar en formato JPG o PNG.");
  }
  return mimeType as "image/jpeg" | "image/png";
}

async function bytesForAsset(asset: ImagePickerAsset): Promise<ArrayBuffer> {
  if (asset.fileSize && asset.fileSize > MAX_DOCUMENT_BYTES) {
    throw new Error("Cada fotografía debe pesar menos de 7 MB.");
  }
  const response = await fetch(asset.uri);
  if (!response.ok)
    throw new Error("No se pudo leer una fotografía capturada.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Cada fotografía debe pesar menos de 7 MB.");
  }
  return bytes;
}

export async function uploadApplicationDocuments(
  application: PendingApplication,
  documents: CapturedDocuments,
): Promise<void> {
  const supabase = getSupabase();
  const documentTypes = Object.keys(documents) as DocumentType[];
  const { data: existing, error: existingError } = await supabase
    .from("customer_documents")
    .select("document_type")
    .eq("customer_id", application.customerId)
    .in("document_type", documentTypes);
  if (existingError)
    throw new Error("No se pudo verificar el expediente existente.");
  const existingTypes = new Set(
    (existing ?? []).map((document) => String(document.document_type)),
  );

  for (const documentType of documentTypes) {
    if (existingTypes.has(documentType)) continue;
    const asset = documents[documentType];
    if (!asset) throw new Error("Captura los cuatro documentos requeridos.");
    const mimeType = documentMimeType(asset);
    const bytes = await bytesForAsset(asset);
    const extension = mimeType === "image/png" ? "png" : "jpg";
    const path = `${application.organizationId}/${application.customerId}/${Crypto.randomUUID()}/${Crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("customer-documents")
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError)
      throw new Error(`No se pudo cargar el documento ${documentType}.`);
    const { error: recordError } = await supabase
      .from("customer_documents")
      .insert({
        organization_id: application.organizationId,
        customer_id: application.customerId,
        document_type: documentType,
        storage_path: path,
      });
    if (recordError)
      throw new Error(`No se pudo registrar el documento ${documentType}.`);
  }
}

export async function refreshAssessment(applicationId: string): Promise<void> {
  const { error } = await getSupabase().rpc("refresh_credit_assessment", {
    p_application_id: applicationId,
  });
  if (error)
    throw new Error(
      "El expediente se envió, pero la evaluación quedó pendiente.",
    );
}
