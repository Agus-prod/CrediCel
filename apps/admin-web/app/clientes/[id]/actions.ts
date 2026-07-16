"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const customerIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export async function issuePortalLink(formData: FormData) {
  const parsed = customerIdSchema.safeParse(formData.get("customer_id"));
  if (!parsed.success) redirect("/clientes?error=Cliente%20inválido");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("issue_customer_portal_link", {
    p_customer_id: parsed.data,
    p_rotate: formData.get("rotate") === "true",
  });
  if (error || typeof data !== "string") {
    redirect(
      `/clientes/${parsed.data}?error=${encodeURIComponent(error?.message ?? "No se pudo emitir el acceso al portal.")}`,
    );
  }

  redirect(`/clientes/${parsed.data}?portal_token=${encodeURIComponent(data)}`);
}
