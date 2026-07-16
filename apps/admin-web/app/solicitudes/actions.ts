"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
export async function decideApplication(formData: FormData) {
  const supabase = await createServerSupabase();
  const condition = String(formData.get("condition") ?? "");
  const { error } = await supabase.rpc("decide_credit_application", {
    p_application_id: String(formData.get("application_id") ?? ""),
    p_decision: String(formData.get("decision") ?? ""),
    p_reason: String(formData.get("reason") ?? ""),
    p_conditions: condition ? [{ type: condition }] : [],
  });
  if (error)
    redirect(`/solicitudes?error=${encodeURIComponent(error.message)}`);
  redirect("/solicitudes?updated=1");
}
export async function formalizeApplication(formData: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("formalize_credit", {
    p_application_id: String(formData.get("application_id") ?? ""),
    p_signature_name: String(formData.get("signature_name") ?? ""),
    p_payment_method: String(formData.get("payment_method") ?? ""),
    p_reference: String(formData.get("reference") ?? ""),
  });
  if (error)
    redirect(`/solicitudes?error=${encodeURIComponent(error.message)}`);
  redirect("/solicitudes?formalized=1");
}
