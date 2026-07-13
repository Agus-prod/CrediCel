"use client";
import Link from "next/link";
import {usePathname}from"next/navigation";
import{useEffect,useState}from"react";
import{logout}from"@/app/login/actions";
export interface MobileNavItem{readonly href:string;readonly label:string}
export function MobileNavigation({items}:{readonly items:readonly MobileNavItem[]}){const pathname=usePathname();const[open,setOpen]=useState(false);useEffect(()=>setOpen(false),[pathname]);return <><button aria-expanded={open}aria-label="Abrir menú"className="menu-button"onClick={()=>setOpen(v=>!v)}type="button"><span/><span/><span/></button>{open&&<button aria-label="Cerrar menú"className="nav-backdrop"onClick={()=>setOpen(false)}type="button"/>}<div className={`mobile-drawer ${open?"is-open":""}`}><div className="mobile-drawer-head"><strong>Menú</strong><button aria-label="Cerrar menú"onClick={()=>setOpen(false)}type="button">×</button></div><nav aria-label="Navegación móvil">{items.map(item=><Link className={pathname===item.href?"navlink active":"navlink"}href={item.href}key={`${item.href}-${item.label}`}>{item.label}</Link>)}</nav><form action={logout}><button className="mobile-logout"type="submit">Cerrar sesión</button></form></div></>}
