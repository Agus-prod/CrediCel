"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function validatePayment(formData: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("validate_customer_payment", {
    p_report_id: String(formData.get("report_id") ?? ""),
    p_approve: String(formData.get("decision")) === "approve",
    p_notes: String(formData.get("notes") ?? ""),
  });
  if (error) redirect(`/pagos?error=${encodeURIComponent(error.message)}`);
  redirect("/pagos?updated=1");
}

export async function recordCashPayment(formData: FormData) {
  const supabase = await createServerSupabase();
  const mode = String(formData.get("payment_mode") ?? "single");
  const { data, error } = await supabase.rpc(
    "record_structured_cash_payment",
    {
      p_account_id: String(formData.get("account_id") ?? ""),
      p_payment_mode: mode,
      p_installment_count:
        mode === "multiple"
          ? Number(formData.get("installment_count") ?? 0)
          : null,
      p_payment_method: String(formData.get("payment_method") ?? "cash"),
      p_reference: String(formData.get("reference") ?? ""),
    },
  );
  if (error) redirect(`/pagos?error=${encodeURIComponent(error.message)}`);
  const result = data as { transaction_id?: string } | null;
  if (!result?.transaction_id) redirect("/pagos?error=No+se+generó+el+recibo");
  redirect(`/pagos/documentos/${result.transaction_id}`);
}
