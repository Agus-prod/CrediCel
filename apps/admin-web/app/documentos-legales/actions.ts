"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
const value = (form: FormData, key: string) => String(form.get(key) ?? "");
export async function initializeTemplates() { const s=await createServerSupabase(); const {error}=await s.rpc("initialize_legal_templates"); redirect(error?`/documentos-legales?error=${encodeURIComponent(error.message)}`:"/documentos-legales?ready=1"); }
export async function saveTemplate(form: FormData) { const s=await createServerSupabase(); const {error}=await s.rpc("save_legal_template",{p_document_type:value(form,"document_type"),p_title:value(form,"title"),p_content:value(form,"content")}); redirect(error?`/documentos-legales?error=${encodeURIComponent(error.message)}`:"/documentos-legales?saved=1"); }
export async function publishTemplate(form: FormData) { const s=await createServerSupabase(); const {error}=await s.rpc("publish_legal_template",{p_document_type:value(form,"document_type")}); redirect(error?`/documentos-legales?error=${encodeURIComponent(error.message)}`:"/documentos-legales?published=1"); }
