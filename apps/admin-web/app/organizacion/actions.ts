"use server";

import { branchSchema } from "@credicel/validation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function addBranch(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const parsed = branchSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    businessUnitId: String(formData.get("business_unit_id") ?? ""),
    branchType: "store",
    address: String(formData.get("address") ?? "").trim(),
    phone: phone || null,
  });

  if (!parsed.success) {
    redirect(`/organizacion?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_branch", {
    p_business_unit_id: parsed.data.businessUnitId,
    p_name: parsed.data.name,
    p_code: parsed.data.code,
    p_address: parsed.data.address,
    p_phone: parsed.data.phone,
  });

  if (error) {
    redirect(`/organizacion?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/organizacion?created=1");
}
