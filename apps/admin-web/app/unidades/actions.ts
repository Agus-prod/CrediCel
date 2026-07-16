"use server";

import { businessUnitSchema } from "@credicel/validation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function addBusinessUnit(formData: FormData) {
  const parsed = businessUnitSchema.safeParse({
    legalName: String(formData.get("legal_name") ?? ""),
    commercialName: String(formData.get("commercial_name") ?? ""),
    ownerName: String(formData.get("owner_name") ?? ""),
    rtn: String(formData.get("rtn") ?? ""),
  });

  if (!parsed.success) {
    redirect(`/unidades?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_business_unit", {
    p_legal_name: parsed.data.legalName,
    p_commercial_name: parsed.data.commercialName,
    p_owner_name: parsed.data.ownerName,
    p_rtn: parsed.data.rtn,
  });

  if (error) {
    redirect(`/unidades?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/unidades?created=1");
}
