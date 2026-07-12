export type Json = string | number | boolean | null | { readonly [key: string]: Json | undefined } | readonly Json[];
export interface Database { public: { Tables: Record<string,{ Row: Record<string,Json>; Insert: Record<string,Json>; Update: Record<string,Json> }>; Views: Record<string,never>; Functions: Record<string,never>; Enums: Record<string,never>; CompositeTypes: Record<string,never> } }
