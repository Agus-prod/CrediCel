"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
export async function decideApplication(formData: FormData) {
  const supabase = await createServerSupabase();
  const decision = String(formData.get("decision") ?? "");
  const condition = String(formData.get("condition") ?? "");
  const conditionDetail = String(
    formData.get("condition_detail") ?? "",
  ).trim();
  const requestedDocumentType = String(
    formData.get("requested_document_type") ?? "",
  );
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision === "preapproved" && (!condition || !conditionDetail)) {
    redirect(
      `/solicitudes?error=${encodeURIComponent("Para condicionar, selecciona la condición e indica el monto o requisito exacto.")}`,
    );
  }
  if (
    decision === "preapproved" &&
    condition === "additional_document" &&
    !requestedDocumentType
  ) {
    redirect(
      `/solicitudes?error=${encodeURIComponent("Selecciona el documento requerido para esta condición.")}`,
    );
  }
  if (
    decision === "additional_information_required" &&
    !requestedDocumentType
  ) {
    redirect(
      `/solicitudes?error=${encodeURIComponent("Selecciona el documento que debe cargar el vendedor.")}`,
    );
  }

  const conditionLabels: Readonly<Record<string, string>> = {
    higher_down_payment: "Mayor prima",
    guarantor: "Aval solidario",
    additional_document: "Documento adicional",
  };
  const publishedReason =
    decision === "preapproved"
      ? `${reason}\n\nCondición: ${conditionLabels[condition] ?? condition}. ${conditionDetail}`
      : reason;
  const structuredConditions =
    decision === "preapproved"
      ? [
          {
            type: condition,
            detail: conditionDetail,
            requested_document_type:
              condition === "additional_document"
                ? requestedDocumentType || null
                : null,
          },
        ]
      : decision === "additional_information_required"
        ? [
            {
              type: "information_request",
              requested_document_type: requestedDocumentType,
            },
          ]
        : [];

  const { error } = await supabase.rpc("decide_credit_application", {
    p_application_id: String(formData.get("application_id") ?? ""),
    p_decision: decision,
    p_reason: publishedReason,
    p_conditions: structuredConditions,
  });
  if (error)
    redirect(`/solicitudes?error=${encodeURIComponent(error.message)}`);
  redirect("/solicitudes?updated=1");
}

export async function sendApplicationMessage(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!applicationId || !message) {
    redirect(
      `/solicitudes?error=${encodeURIComponent("Escribe el mensaje que deseas enviar.")}`,
    );
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("send_credit_application_message", {
    p_application_id: applicationId,
    p_attachment_document_id: undefined,
    p_note: message,
    p_message_type: "message",
    p_requested_document_type: undefined,
  });
  if (error)
    redirect(`/solicitudes?error=${encodeURIComponent(error.message)}`);
  redirect(`/solicitudes?messaged=1#application-${applicationId}`);
}
export async function formalizeApplication(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("formalize_credit", {
    p_application_id: String(formData.get("application_id") ?? ""),
    p_signature_name: String(formData.get("signature_name") ?? ""),
    p_payment_method: String(formData.get("payment_method") ?? ""),
    p_reference: String(formData.get("reference") ?? ""),
  });
  if (error)
    redirect(`/solicitudes?error=${encodeURIComponent(error.message)}`);
  const accountId = (data as { account_id?: string } | null)?.account_id;
  if (accountId) {
    redirect(
      `/proteccion?activated=1&account_id=${encodeURIComponent(accountId)}`,
    );
  }
  redirect("/solicitudes?formalized=1");
}
