"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ALL_BRANCHES_CONTEXT,
  BRANCH_CONTEXT_COOKIE,
  hasGlobalScope,
} from "@/lib/branch-context";
import { createServerSupabase } from "@/lib/supabase/server";

const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;

export async function selectBranchContext(formData: FormData) {
  const requested = String(formData.get("branch_context") ?? "");
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assigned } = await supabase
    .from("profile_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  const roles = new Set(
    (assigned ?? [])
      .map((row) => relationName(row.roles))
      .filter((name): name is string => Boolean(name)),
  );
  const global = hasGlobalScope(roles);

  if (requested === ALL_BRANCHES_CONTEXT) {
    if (!global) redirect("/seleccionar?error=scope");
  } else if (global) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", requested)
      .eq("status", "active")
      .maybeSingle();
    if (!branch) redirect("/seleccionar?error=branch");
  } else {
    const { data: access } = await supabase
      .from("user_branch_access")
      .select("branch_id")
      .eq("profile_id", user.id)
      .eq("branch_id", requested)
      .maybeSingle();
    if (!access) redirect("/seleccionar?error=branch");
  }

  const cookieStore = await cookies();
  cookieStore.set(BRANCH_CONTEXT_COOKIE, requested, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  redirect("/");
}
