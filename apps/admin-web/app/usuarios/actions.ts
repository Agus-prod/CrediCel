"use server";

import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";
import { isInvitableRole, roleRequiresBranch } from "@/lib/team-access";

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

export async function inviteMember(formData: FormData) {
  const email = field(formData, "email");
  const fullName = field(formData, "full_name");
  const roleName = field(formData, "role_name");
  const branchId = field(formData, "branch_id");

  if (!email || !fullName || !isInvitableRole(roleName)) {
    redirect(
      `/usuarios?error=${encodeURIComponent("Completa el nombre, correo y un rol válido.")}`,
    );
  }
  if (roleRequiresBranch(roleName) && !branchId) {
    redirect(
      `/usuarios?error=${encodeURIComponent("Selecciona una tienda para este rol.")}`,
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_team_invitation", {
    p_email: email,
    p_full_name: fullName,
    p_role_name: roleName,
    p_branch_id: branchId || undefined,
  });
  if (error) redirect(`/usuarios?error=${encodeURIComponent(error.message)}`);
  redirect(`/usuarios?token=${data}`);
}

export async function assignMemberBranch(formData: FormData) {
  const profileId = field(formData, "profile_id");
  const branchId = field(formData, "branch_id");
  if (!profileId || !branchId) {
    redirect(
      `/usuarios?error=${encodeURIComponent("Selecciona un integrante y una tienda válidos.")}`,
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_member_branch_access", {
    p_branch_id: branchId,
    p_profile_id: profileId,
  });
  if (error) redirect(`/usuarios?error=${encodeURIComponent(error.message)}`);
  redirect("/usuarios?updated=1");
}
