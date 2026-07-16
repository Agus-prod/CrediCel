import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { CreditApplicationWizard } from "./credit-application-wizard";
import type {
  BranchOption,
  InventoryOption,
} from "./credit-application-wizard";

const configurationResolutionSchema = z.object({ value: z.number() });

function resolvedNumber(value: unknown) {
  const parsed = configurationResolutionSchema.safeParse(value);
  return parsed.success ? parsed.data.value : null;
}

function relatedName(value: unknown) {
  return Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;
}

export default async function NewSale({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: access },
    { data: inventory },
    { data: maximumTermData },
    { data: minimumDownPaymentData },
  ] = await Promise.all([
    supabase
      .from("user_branch_access")
      .select("branch_id,branches(name)")
      .eq("profile_id", user?.id ?? ""),
    supabase
      .from("inventory_units")
      .select(
        "id,current_branch_id,imei_1,color,storage_capacity,cash_price,product_models(name),product_brands(name)",
      )
      .eq("status", "available")
      .order("created_at"),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.maximum_term_months",
    }),
    supabase.rpc("resolve_configuration", {
      p_key: "credit.minimum_down_payment_percentage",
    }),
  ]);

  const branches: BranchOption[] = (access ?? []).map((row) => ({
    id: row.branch_id,
    name: relatedName(row.branches) ?? "Tienda",
  }));
  const inventoryOptions: InventoryOption[] = (inventory ?? []).map((unit) => ({
    id: unit.id,
    branchId: unit.current_branch_id,
    imei: unit.imei_1,
    cashPrice: Number(unit.cash_price),
    description: [
      relatedName(unit.product_brands),
      relatedName(unit.product_models),
      unit.color,
      unit.storage_capacity,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <AppShell>
      <section className="section">
        <div className="toolbar">
          <div>
            <div className="eyebrow">Venta financiada</div>
            <h1>Nueva solicitud de crédito</h1>
            <p className="muted">
              Inicia escaneando la identidad y avanza paso a paso.
            </p>
          </div>
        </div>
        <CreditApplicationWizard
          branches={branches}
          error={error}
          inventory={inventoryOptions}
          maximumTerm={resolvedNumber(maximumTermData)}
          minimumDownPaymentPercentage={resolvedNumber(minimumDownPaymentData)}
        />
      </section>
    </AppShell>
  );
}
