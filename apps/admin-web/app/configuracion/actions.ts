"use server";

import { configurationDraftSchema } from "@credicel/validation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

const configurationKeys = {
  minimumDownPaymentPercentage: "credit.minimum_down_payment_percentage",
  maximumTermMonths: "credit.maximum_term_months",
  maximumPaymentIncomePercentage: "credit.maximum_payment_income_percentage",
  minimumEmploymentMonths: "credit.minimum_employment_months",
  requireGuarantorBelowScore: "credit.require_guarantor_below_score",
} as const;

function parseDraft(formData: FormData) {
  return configurationDraftSchema.safeParse({
    versionId: formData.get("version_id"),
    minimumDownPaymentPercentage: formData.get(
      "minimum_down_payment_percentage",
    ),
    maximumTermMonths: formData.get("maximum_term_months"),
    maximumPaymentIncomePercentage: formData.get(
      "maximum_payment_income_percentage",
    ),
    minimumEmploymentMonths: formData.get("minimum_employment_months"),
    requireGuarantorBelowScore: formData.get("require_guarantor_below_score"),
    effectiveFrom: formData.get("effective_from"),
    effectiveUntil: formData.get("effective_until"),
  });
}

function configurationError(message: string): never {
  redirect(`/configuracion?error=${encodeURIComponent(message)}`);
}

async function persistDraft(formData: FormData) {
  const parsed = parseDraft(formData);

  if (!parsed.success) {
    configurationError(
      parsed.error.issues[0]?.message ?? "Revise los valores del borrador",
    );
  }

  const input = parsed.data;
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("save_configuration_draft", {
    p_version_id: input.versionId,
    p_values: {
      [configurationKeys.minimumDownPaymentPercentage]:
        input.minimumDownPaymentPercentage,
      [configurationKeys.maximumTermMonths]: input.maximumTermMonths,
      [configurationKeys.maximumPaymentIncomePercentage]:
        input.maximumPaymentIncomePercentage,
      [configurationKeys.minimumEmploymentMonths]:
        input.minimumEmploymentMonths,
      [configurationKeys.requireGuarantorBelowScore]:
        input.requireGuarantorBelowScore,
    },
    p_effective_from: `${input.effectiveFrom}T00:00:00Z`,
    p_effective_until:
      input.effectiveUntil === null
        ? null
        : `${input.effectiveUntil}T00:00:00Z`,
  });

  if (error) {
    configurationError(error.message);
  }

  return { supabase, versionId: input.versionId };
}

export async function saveConfigurationDraft(formData: FormData) {
  await persistDraft(formData);
  redirect("/configuracion?saved=1");
}

export async function publishConfigurationDraft(formData: FormData) {
  const { supabase, versionId } = await persistDraft(formData);
  const { error } = await supabase.rpc("publish_configuration_draft", {
    p_version_id: versionId,
  });

  if (error) {
    configurationError(error.message);
  }

  redirect("/configuracion?published=1");
}
