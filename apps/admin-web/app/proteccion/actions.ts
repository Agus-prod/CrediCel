"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function sendDeviceCommand(formData: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("queue_device_command", {
    p_enrollment_id: String(formData.get("enrollment_id") ?? ""),
    p_command: String(formData.get("command") ?? ""),
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error)
    redirect(`/proteccion?error=${encodeURIComponent(error.message)}`);
  redirect("/proteccion?queued=1");
}
