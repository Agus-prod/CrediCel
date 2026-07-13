import{requireAnyRole}from"@/lib/authz";export default async function OwnerReportsLayout({children}:{readonly children:React.ReactNode}){await requireAnyRole(["organization_owner"]);return children}
