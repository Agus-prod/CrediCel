"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function reviewSubscriptionTransfer(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approve", "reject"].includes(decision)) {
    redirect("/operacion/suscripciones?error=Solicitud+inválida");
  }
  if (decision === "reject" && notes.length < 3) {
    redirect("/operacion/suscripciones?error=Indica+el+motivo+del+rechazo");
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("confirm_subscription_transfer", {
    p_request_id: requestId,
    p_approve: decision === "approve",
    p_notes: notes || null,
  });
  if (error) redirect(`/operacion/suscripciones?error=${encodeURIComponent(error.message)}`);
  redirect(`/operacion/suscripciones?reviewed=${decision}`);
}
