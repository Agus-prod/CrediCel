"use server";
import {redirect} from "next/navigation";
import {createServerSupabase} from "@/lib/supabase/server";
import {getPublicAppUrl} from "@/lib/public-url.server";
const PLATFORM_OWNER_EMAIL="augustocolindres1@gmail.com";
export async function registerPlatformOwner(formData:FormData){const email=String(formData.get("email")??"").trim().toLowerCase();const password=String(formData.get("password")??"");const fullName=String(formData.get("full_name")??"").trim();if(email!==PLATFORM_OWNER_EMAIL||password.length<10||fullName.length<3)redirect("/registro-plataforma?error=validation");const supabase=await createServerSupabase();const callback=await getPublicAppUrl("/auth/callback?next=/operacion");const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callback,data:{full_name:fullName,platform_owner:true}}});if(error)redirect(`/registro-plataforma?error=${encodeURIComponent(error.message)}`);if(!data.session)redirect("/registro-plataforma?check_email=1");redirect("/operacion")}
