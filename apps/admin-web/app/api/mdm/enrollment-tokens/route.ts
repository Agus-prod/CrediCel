import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import {
  createAndroidEnrollmentToken,
  deleteAndroidEnrollmentToken,
} from "@/lib/android-management.server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  inventoryUnitId: z.uuid(),
  accountId: z.uuid(),
  durationHours: z.union([z.literal(1), z.literal(8), z.literal(24)]),
});

const noStoreHeaders = { "Cache-Control": "no-store, private" };

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Los datos para generar el QR no son válidos" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const { data, error } = await supabase.rpc("create_device_enrollment", {
    p_inventory_unit_id: parsed.data.inventoryUnitId,
    p_account_id: parsed.data.accountId,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const enrollmentId = (data as { enrollment_id?: string } | null)
    ?.enrollment_id;
  if (!enrollmentId) {
    return NextResponse.json(
      { error: "No se pudo preparar el enrolamiento" },
      { status: 500, headers: noStoreHeaders },
    );
  }

  let providerTokenName: string | null = null;
  try {
    const token = await createAndroidEnrollmentToken({
      enrollmentId,
      durationHours: parsed.data.durationHours,
    });
    providerTokenName = token.name;
    const { error: metadataError } = await supabase.rpc(
      "record_android_enrollment_token",
      {
        p_enrollment_id: enrollmentId,
        p_provider_token_name: token.name,
        p_expires_at: token.expirationTimestamp,
      },
    );
    if (metadataError) throw new Error(metadataError.message);

    const qrDataUrl = await QRCode.toDataURL(token.qrCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420,
    });
    return NextResponse.json(
      {
        enrollmentId,
        qrDataUrl,
        expirationTimestamp: token.expirationTimestamp,
        oneTimeOnly: true,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (providerTokenName) {
      await deleteAndroidEnrollmentToken(providerTokenName).catch(() => null);
    }
    const message =
      error instanceof Error ? error.message : "No se pudo generar el QR";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: noStoreHeaders },
    );
  }
}
