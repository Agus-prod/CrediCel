"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPublicAppUrl } from "@/lib/public-url.server";
export async function requestReset(formData: FormData) {
  const supabase = await createServerSupabase();
  const callbackUrl = await getPublicAppUrl("/nueva-contrasena");
  await supabase.auth.resetPasswordForEmail(
    String(formData.get("email") ?? ""),
    { redirectTo: callbackUrl },
  );
  redirect("/recuperar-contrasena?sent=1");
}
