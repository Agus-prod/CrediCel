import { AppShell } from "@/components/app-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { addDevice } from "./actions";

const relName=(v:unknown)=>Array.isArray(v)?(v[0]as{name?:string}|undefined)?.name:(v as{name?:string}|null)?.name;
const labels:Readonly<Record<string,string>>={available:"Disponible",reserved:"Reservado",sold:"Vendido",transfer_pending:"En traslado",in_transit:"En tránsito",delinquent:"En mora"};
const inputs=[
  ["brand","Marca",true],["model","Modelo",true],["imei_1","IMEI principal",true],["imei_2","IMEI secundario",false],
  ["serial","Número de serie",false],["color","Color",false],["storage","Almacenamiento",false],["ram","Memoria RAM",false],
]as const;

export default async function Inventory({searchParams}:{readonly searchParams:Promise<{error?:string;created?:string}>}){
 const q=await searchParams;const s=await createServerSupabase();const[{data},{data:branches},{data:{user}}]=await Promise.all([
  s.from("inventory_units").select("id,imei_1,color,storage_capacity,ram_capacity,cash_price,status,mdm_compatible,product_brands(name),product_models(name),branches(name)").order("created_at",{ascending:false}).limit(100),
  s.from("branches").select("id,name").eq("status","active").order("name"),s.auth.getUser(),
 ]);
 const{data:assigned}=await s.from("profile_roles").select("roles(name)").eq("profile_id",user?.id??"");const roles=new Set((assigned??[]).map(r=>relName(r.roles)));const canWrite=["inventory_manager","branch_manager","organization_admin","organization_owner","super_admin"].some(r=>roles.has(r));
 return <AppShell><section className="section"><div className="toolbar"><div><div className="eyebrow">Inventario</div><h1>Dispositivos</h1><p className="muted">Control individual por IMEI, tienda y compatibilidad de protección.</p></div></div>{q.error&&<div className="error">{q.error}</div>}{q.created&&<div className="notice">Dispositivo agregado al inventario.</div>}<div className="inventory-grid">{(data??[]).map(d=><article className="card device-card"key={d.id}><div className="application-head"><div><span className="eyebrow">{relName(d.product_brands)} {relName(d.product_models)}</span><h2>{d.color} · {d.storage_capacity}</h2></div><span className={`badge ${d.status==="available"?"success":d.status==="delinquent"?"danger":"warning"}`}>{labels[d.status]??d.status}</span></div><p className="imei">IMEI {d.imei_1}</p><p className="muted">{relName(d.branches)} · L {d.cash_price} · {d.mdm_compatible?"Compatible con CrediCel Protect":"Sin protección remota"}</p></article>)}</div>{canWrite&&<div className="card form-card section"><div className="form-title"><div><h2>Registrar dispositivo</h2><p className="muted">Escanea o escribe el IMEI exactamente como aparece en el equipo.</p></div></div><form action={addDevice}className="form"><div className="field"><label htmlFor="branch_id">Tienda</label><select id="branch_id"name="branch_id"required><option value="">Seleccionar</option>{(branches??[]).map(b=><option value={b.id}key={b.id}>{b.name}</option>)}</select></div>{inputs.map(([name,label,required])=><div className="field"key={name}><label htmlFor={name}>{label}</label><input id={name}name={name}required={required}/></div>)}<div className="field"><label htmlFor="cost">Costo</label><input id="cost"name="cost"type="number"min="0"step="0.01"required/></div><div className="field"><label htmlFor="cash_price">Precio de venta</label><input id="cash_price"name="cash_price"type="number"min="0.01"step="0.01"required/></div><label className="consent"><input name="mdm_compatible"type="checkbox"/> Compatible con CrediCel Protect</label><div className="form-actions"><button className="button"type="submit">Guardar dispositivo</button></div></form></div>}</section></AppShell>;
}
