import "react-native-url-polyfill/auto";

import type { Database } from "@credicel/database-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
let client: SupabaseClient<Database> | null = null;

export function getConfigurationError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY antes de iniciar la aplicación.";
  }
  return null;
}

export function getSupabase(): SupabaseClient<Database> {
  const configurationError = getConfigurationError();
  if (configurationError) throw new Error(configurationError);
  client ??= createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return client;
}
