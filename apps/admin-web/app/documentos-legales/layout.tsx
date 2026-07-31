import { requireAnyRole } from "@/lib/authz";
export default async function Layout({children}:{readonly children:React.ReactNode}){await requireAnyRole(["organization_owner","organization_admin","super_admin"]);return children;}
