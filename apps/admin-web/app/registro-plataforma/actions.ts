"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/public-url.server";

const PLATFORM_OWNER_EMAIL = "augustocolindres1@gmail.com";
const callbackUrl = () => getPublicAppUrl("/auth/callback?next=/operacion");
const errorPath = (message: string) =>
  `/registro-plataforma?error=${encodeURIComponent(message)}`;

export async function registerPlatformOwner(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (email !== PLATFORM_OWNER_EMAIL || password.length < 10 || fullName.length < 3) {
    redirect(errorPath("Revisa el nombre, correo y contraseña."));
  }
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await callbackUrl(),
      data: { full_name: fullName, platform_owner: true },
    },
  });
  if (error) redirect(errorPath(error.message));
  if (!data.session) redirect("/registro-plataforma?check_email=1");
  redirect("/operacion");
}

export async function resendPlatformConfirmation() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: PLATFORM_OWNER_EMAIL,
    options: { emailRedirectTo: await callbackUrl() },
  });
  if (error) redirect(errorPath(error.message));
  redirect("/registro-plataforma?check_email=1&resent=1");
}
