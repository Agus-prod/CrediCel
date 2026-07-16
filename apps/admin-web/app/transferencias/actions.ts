"use server";

import { inventoryTransferSchema, transferScanSchema } from "@credicel/validation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

const scanPayload = (formData: FormData) => transferScanSchema.safeParse({
  transferId: String(formData.get("transfer_id") ?? ""),
  imeis: String(formData.get("imeis") ?? "").split(/[,\s]+/).filter(Boolean),
});

export async function createTransfer(formData: FormData) {
  const ownerId = String(formData.get("destination_owner_business_unit_id") ?? "").trim();
  const parsed = inventoryTransferSchema.safeParse({
    origin: String(formData.get("origin") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    inventoryIds: formData.getAll("inventory_ids").map(String),
    transferOwnership: String(formData.get("transfer_ownership") ?? "false") === "true",
    destinationOwnerBusinessUnitId: ownerId || null,
  });

  if (!parsed.success) {
    redirect(`/transferencias?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_inventory_transfer", {
    p_origin: parsed.data.origin,
    p_destination: parsed.data.destination,
    p_inventory_ids: parsed.data.inventoryIds,
    p_transfer_ownership: parsed.data.transferOwnership,
    p_destination_owner_business_unit_id: parsed.data.destinationOwnerBusinessUnitId,
  });

  if (error) redirect(`/transferencias?error=${encodeURIComponent(error.message)}`);
  redirect(`/transferencias?created=${data}`);
}

export async function approveTransfer(formData: FormData) {
  const transferId = String(formData.get("transfer_id") ?? "");
  const parsed = transferScanSchema.shape.transferId.safeParse(transferId);
  if (!parsed.success) redirect("/transferencias?error=Traslado%20inválido");

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("approve_inventory_transfer", { p_transfer_id: parsed.data });
  if (error) redirect(`/transferencias?error=${encodeURIComponent(error.message)}`);
  redirect("/transferencias?updated=1");
}

export async function dispatchTransfer(formData: FormData) {
  const parsed = scanPayload(formData);
  if (!parsed.success) redirect(`/transferencias?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Escaneo inválido")}`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("dispatch_inventory_transfer", { p_transfer_id: parsed.data.transferId, p_scanned_imeis: parsed.data.imeis });
  if (error) redirect(`/transferencias?error=${encodeURIComponent(error.message)}`);
  redirect("/transferencias?updated=1");
}

export async function receiveTransfer(formData: FormData) {
  const parsed = scanPayload(formData);
  if (!parsed.success) redirect(`/transferencias?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Escaneo inválido")}`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("receive_inventory_transfer", { p_transfer_id: parsed.data.transferId, p_scanned_imeis: parsed.data.imeis });
  if (error) redirect(`/transferencias?error=${encodeURIComponent(error.message)}`);
  redirect("/transferencias?updated=1");
}
