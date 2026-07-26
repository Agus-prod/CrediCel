import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

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

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const onboardingRequested =
    request.nextUrl.searchParams.get("onboarding") === "1";
  const supabase = await createServerSupabase();

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?confirmation_error=1", request.url),
    );
  }
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL("/login?confirmation_error=1", request.url),
    );
  }

  if (onboardingRequested) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const metadata = user?.user_metadata
      ?.organization_onboarding as OnboardingMetadata | undefined;
    if (!metadata) {
      return NextResponse.redirect(
        new URL("/registro-organizacion?error=organization", request.url),
      );
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
    if (error) {
      return NextResponse.redirect(
        new URL("/registro-organizacion?error=organization", request.url),
      );
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
