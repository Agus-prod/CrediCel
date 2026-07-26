"use server";

import { redirect } from "next/navigation";
import { completePendingOrganizationOnboarding } from "@/lib/organization-onboarding.server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) redirect("/login?error=1");
  if (data.user) {
    await completePendingOrganizationOnboarding(supabase, data.user);
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
