"use server";
import {redirect} from "next/navigation";
import {createServerSupabase} from "@/lib/supabase/server";
const v=(f:FormData,k:string)=>String(f.get(k)??"");
export async function addPlatformBankAccount(form:FormData){const s=await createServerSupabase();const{error}=await s.rpc("upsert_platform_bank_account",{p_bank_name:v(form,"bank_name"),p_account_name:v(form,"account_name"),p_account_number:v(form,"account_number"),p_account_type:v(form,"account_type"),p_currency:v(form,"currency"),p_instructions:v(form,"instructions")});redirect(error?`/operacion?error=${encodeURIComponent(error.message)}`:"/operacion?created=1")}
