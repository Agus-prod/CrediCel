"use server";

import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  ADMIN_UPLOAD_MIME_TYPES,
  MAX_CUSTOMER_DOCUMENT_BYTES,
  validateUpload,
} from "@/lib/uploads";

const primaryDocumentTypes = new Set([
  "dni_front",
  "dni_back",
  "selfie",
  "address_proof",
]);

function salesRedirect(
  applicationId: string,
  key: "error" | "replied",
  value: string,
): never {
  const query = `${key}=${encodeURIComponent(value)}`;
  redirect(`/mis-ventas?${query}#application-${applicationId}`);
}

export async function replyToApplication(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const requestedDocumentType = String(
    formData.get("requested_document_type") ?? "",
  );
  const writtenMessage = String(formData.get("message") ?? "").trim();
  const attachment = formData.get("attachment");
  const hasAttachment = attachment instanceof File && attachment.size > 0;

  if (!applicationId) redirect("/mis-ventas");
  if (!writtenMessage && !hasAttachment) {
    salesRedirect(
      applicationId,
      "error",
      "Escribe una respuesta o adjunta el documento solicitado.",
    );
  }
  if (hasAttachment && !requestedDocumentType) {
    salesRedirect(
      applicationId,
      "error",
      "Indica qué tipo de documento estás adjuntando.",
    );
  }

  const uploadError = validateUpload(attachment, {
    required: false,
    maxBytes: MAX_CUSTOMER_DOCUMENT_BYTES,
    allowedMimeTypes: ADMIN_UPLOAD_MIME_TYPES,
  });
  if (uploadError) salesRedirect(applicationId, "error", uploadError);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: application, error: applicationError } = await supabase
    .from("credit_applications")
    .select("id,organization_id,customer_id")
    .eq("id", applicationId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (applicationError || !application) {
    salesRedirect(applicationId, "error", "No tienes acceso a esta solicitud.");
  }

  let attachmentDocumentId: string | null = null;
  if (hasAttachment && attachment instanceof File) {
    const extension =
      attachment.type === "application/pdf"
        ? "pdf"
        : attachment.type === "image/png"
          ? "png"
          : "jpg";
    const path = `${application.organization_id}/${application.customer_id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
    const { error: storageError } = await supabase.storage
      .from("customer-documents")
      .upload(path, attachment, {
        contentType: attachment.type,
        upsert: false,
      });
    if (storageError) {
      salesRedirect(
        applicationId,
        "error",
        "No se pudo cargar el archivo. Inténtalo nuevamente.",
      );
    }

    const storedDocumentType = primaryDocumentTypes.has(requestedDocumentType)
      ? requestedDocumentType
      : "other";
    const { data: document, error: documentError } = await supabase
      .from("customer_documents")
      .insert({
        application_id: applicationId,
        organization_id: application.organization_id,
        customer_id: application.customer_id,
        document_type: storedDocumentType,
        storage_path: path,
        metadata: {
          application_id: applicationId,
          requested_document_type: requestedDocumentType,
          uploaded_from: "application_conversation",
        },
      })
      .select("id")
      .single();
    if (documentError || !document) {
      salesRedirect(
        applicationId,
        "error",
        "El archivo subió, pero no pudo vincularse al expediente.",
      );
    }
    attachmentDocumentId = document.id;
  }

  const message =
    writtenMessage || "Adjunté el documento solicitado para su revisión.";
  const { error } = await supabase.rpc("send_credit_application_message", {
    p_application_id: applicationId,
    p_attachment_document_id: attachmentDocumentId,
    p_note: message,
    p_message_type: "response",
    p_requested_document_type: requestedDocumentType || undefined,
  });
  if (error) salesRedirect(applicationId, "error", error.message);

  if (attachmentDocumentId) {
    await supabase.rpc("refresh_credit_assessment", {
      p_application_id: applicationId,
    });
  }
  salesRedirect(applicationId, "replied", applicationId);
}
