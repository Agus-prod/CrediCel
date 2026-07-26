"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPublicAppUrl } from "@/lib/public-url.server";

export async function registerOrganization(formData: FormData) {
  const supabase = await createServerSupabase();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("owner_name") ?? "");
  const callbackUrl = await getPublicAppUrl(
    "/auth/callback?onboarding=1&next=/",
  );
  const onboarding = {
    name: String(formData.get("name") ?? ""),
    commercial_name: String(formData.get("commercial_name") ?? ""),
    legal_name: String(formData.get("legal_name") ?? ""),
    owner_name: fullName,
    rtn: String(formData.get("rtn") ?? ""),
    branch_name: String(formData.get("branch_name") ?? ""),
    branch_code: String(formData.get("branch_code") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: { full_name: fullName, organization_onboarding: onboarding },
    },
  });
  if (error) redirect("/registro-organizacion?error=account");
  if (!data.session) redirect("/registro-organizacion?check_email=1");
  const { error: onboardingError } = await supabase.rpc(
    "create_organization_onboarding",
    {
      p_name: onboarding.name,
      p_commercial_name: onboarding.commercial_name,
      p_legal_name: onboarding.legal_name,
      p_owner_name: onboarding.owner_name,
      p_rtn: onboarding.rtn,
      p_branch_name: onboarding.branch_name,
      p_branch_code: onboarding.branch_code,
      p_address: onboarding.address,
      p_phone: onboarding.phone,
    },
  );
  if (onboardingError)
    redirect("/registro-organizacion?error=organization");
  redirect("/");
}
