"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/public-url.server";
export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const s = await createServerSupabase();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const callbackUrl = await getPublicAppUrl(
      `/aceptar-invitacion?token=${encodeURIComponent(token)}`,
    );
    const { data, error } = await s.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });
    if (error)
      redirect(
        `/aceptar-invitacion?token=${token}&error=${encodeURIComponent(error.message)}`,
      );
    if (!data.session) redirect(`/aceptar-invitacion?token=${token}&sent=1`);
  }
  const { error } = await s.rpc("accept_team_invitation", { p_token: token });
  if (error)
    redirect(
      `/aceptar-invitacion?token=${token}&error=${encodeURIComponent(error.message)}`,
    );
  redirect("/");
}
