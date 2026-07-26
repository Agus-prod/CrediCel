import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

type OnboardingMetadata = {
  name?: string;
  commercial_name?: string;
  legal_name?: string;
  owner_name?: string;
  rtn?: string;
  branch_name?: string;
  branch_code?: string;
  address?: string;
  phone?: string;
};

export async function completePendingOrganizationOnboarding(
  supabase: SupabaseClient,
  user: User,
) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile) return { completed: false, error: null };

  const metadata = user.user_metadata
    ?.organization_onboarding as OnboardingMetadata | undefined;
  if (!metadata) {
    return { completed: false, error: "missing_onboarding_metadata" };
  }
  const { error } = await supabase.rpc("create_organization_onboarding", {
    p_name: metadata.name ?? "",
    p_commercial_name: metadata.commercial_name ?? "",
    p_legal_name: metadata.legal_name ?? "",
    p_owner_name: metadata.owner_name ?? "",
    p_rtn: metadata.rtn ?? "",
    p_branch_name: metadata.branch_name ?? "",
    p_branch_code: metadata.branch_code ?? "",
    p_address: metadata.address ?? "",
    p_phone: metadata.phone ?? "",
  });
  return {
    completed: !error,
    error: error?.message ?? null,
  };
}
