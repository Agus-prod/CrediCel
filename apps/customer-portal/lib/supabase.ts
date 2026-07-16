import type { Database } from "@credicel/database-types";
import { createClient } from "@supabase/supabase-js";
export function createPortalSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuración incompleta");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
