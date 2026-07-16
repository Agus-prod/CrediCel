"use server";
import { redirect } from "next/navigation";
import { executeAndRecordApplicationRules } from "@/lib/rule-execution";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  ADMIN_UPLOAD_MIME_TYPES,
  MAX_CUSTOMER_DOCUMENT_BYTES,
  validateUpload,
} from "@/lib/uploads";
const text = (f: FormData, n: string) => String(f.get(n) ?? "");
const number = (f: FormData, n: string) => Number(f.get(n) ?? 0);
const requiredDocuments = [
  "dni_front",
  "dni_back",
  "selfie",
  "address_proof",
] as const;
export async function submitCreditApplication(formData: FormData) {
  for (const documentType of requiredDocuments) {
    const validationError = validateUpload(formData.get(documentType), {
      required: true,
      maxBytes: MAX_CUSTOMER_DOCUMENT_BYTES,
      allowedMimeTypes: ADMIN_UPLOAD_MIME_TYPES,
    });
    if (validationError) {
      redirect(`/ventas?error=${encodeURIComponent(validationError)}`);
    }
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc(
    "submit_complete_credit_application",
    {
      p_branch_id: text(formData, "branch_id"),
      p_inventory_unit_id: text(formData, "inventory_unit_id"),
      p_dni: text(formData, "dni"),
      p_first_name: text(formData, "first_name"),
      p_last_name: text(formData, "last_name"),
      p_phone: text(formData, "phone"),
      p_email: text(formData, "email"),
      p_requested_price: number(formData, "requested_price"),
      p_down_payment: number(formData, "down_payment"),
      p_term: number(formData, "term"),
      p_birth_date: text(formData, "birth_date"),
      p_marital_status: text(formData, "marital_status"),
      p_dependents: number(formData, "dependents"),
      p_current_address: text(formData, "current_address"),
      p_housing_type: text(formData, "housing_type"),
      p_employer_name: text(formData, "employer_name"),
      p_job_title: text(formData, "job_title"),
      p_monthly_income: number(formData, "monthly_income"),
      p_monthly_expenses: number(formData, "monthly_expenses"),
      p_employment_months: number(formData, "employment_months"),
      p_reference_one_name: text(formData, "reference_one_name"),
      p_reference_one_phone: text(formData, "reference_one_phone"),
      p_reference_one_relationship: text(
        formData,
        "reference_one_relationship",
      ),
      p_reference_two_name: text(formData, "reference_two_name"),
      p_reference_two_phone: text(formData, "reference_two_phone"),
      p_reference_two_relationship: text(
        formData,
        "reference_two_relationship",
      ),
      p_consent_data_processing:
        formData.get("consent_data_processing") === "on",
      p_consent_credit_review: formData.get("consent_credit_review") === "on",
    },
  );
  if (error) redirect(`/ventas?error=${encodeURIComponent(error.message)}`);
  const { data: application } = await supabase
    .from("credit_applications")
    .select("customer_id,organization_id")
    .eq("id", String(data))
    .single();
  if (application) {
    for (const documentType of requiredDocuments) {
      const file = formData.get(documentType);
      if (!(file instanceof File)) continue;
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${application.organization_id}/${application.customer_id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        redirect(
          `/ventas?error=${encodeURIComponent(`La solicitud fue creada, pero no se pudo cargar ${documentType}. Reintenta desde el expediente.`)}`,
        );
      }
      const { error: documentError } = await supabase
        .from("customer_documents")
        .insert({
          organization_id: application.organization_id,
          customer_id: application.customer_id,
          document_type: documentType,
          storage_path: path,
        });
      if (documentError) {
        redirect(
          `/ventas?error=${encodeURIComponent("La solicitud fue creada, pero no se pudo registrar uno de sus documentos.")}`,
        );
      }
    }
  }
  const { error: assessmentError } = await supabase.rpc(
    "refresh_credit_assessment",
    {
      p_application_id: String(data),
    },
  );
  if (assessmentError) {
    redirect(
      `/mis-ventas?created=${data}&warning=${encodeURIComponent("La solicitud fue enviada, pero la evaluación preliminar quedó pendiente.")}`,
    );
  }

  try {
    await executeAndRecordApplicationRules(supabase, String(data), {
      requested_price: number(formData, "requested_price"),
      proposed_down_payment: number(formData, "down_payment"),
      proposed_down_payment_percentage:
        (number(formData, "down_payment") * 100) /
        number(formData, "requested_price"),
      proposed_term: number(formData, "term"),
      monthly_income: number(formData, "monthly_income"),
      monthly_expenses: number(formData, "monthly_expenses"),
      disposable_income:
        number(formData, "monthly_income") -
        number(formData, "monthly_expenses"),
      employment_months: number(formData, "employment_months"),
    });
  } catch {
    redirect(
      `/mis-ventas?created=${data}&warning=${encodeURIComponent("La solicitud fue enviada; las recomendaciones de reglas deberán reintentarse desde análisis.")}`,
    );
  }
  redirect(`/mis-ventas?created=${data}`);
}
