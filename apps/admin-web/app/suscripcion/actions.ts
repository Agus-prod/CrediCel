"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function reportSubscriptionTransfer(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  const billingCycle = String(formData.get("billing_cycle") ?? "monthly");
  const originBank = String(formData.get("origin_bank") ?? "").trim();
  const reference = String(formData.get("reference_number") ?? "").trim();
  const transferredOn = String(formData.get("transferred_on") ?? "");
  if (!plan || !["monthly", "annual"].includes(billingCycle)) redirect("/suscripcion?error=Selecciona+un+plan+y+ciclo+válidos");
  if (originBank.length < 2 || reference.length < 3 || !transferredOn) redirect("/suscripcion?error=Completa+los+datos+de+la+transferencia");
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("report_subscription_transfer", {
    p_plan_code: plan,
    p_billing_cycle: billingCycle,
    p_origin_bank: originBank,
    p_reference_number: reference,
    p_transferred_on: transferredOn,
  });
  if (error) redirect(`/suscripcion?error=${encodeURIComponent(error.message)}`);
  redirect("/suscripcion?reported=1");
}
