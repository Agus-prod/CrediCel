import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
const url=process.env.SUPABASE_URL?.replace(/\/$/,"");const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
const headers={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
const bucketsResponse=await fetch(`${url}/storage/v1/bucket`,{headers});if(!bucketsResponse.ok)throw new Error(`No se pudieron listar buckets: ${bucketsResponse.status}`);const buckets=await bucketsResponse.json();
async function list(bucket,prefix=""){const response=await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,{method:"POST",headers,body:JSON.stringify({prefix,limit:1000,offset:0,sortBy:{column:"name",order:"asc"}})});if(!response.ok)throw new Error(`No se pudo listar ${bucket}/${prefix}`);return response.json()}
async function walk(bucket,prefix=""){for(const object of await list(bucket,prefix)){const path=prefix?`${prefix}/${object.name}`:object.name;if(object.id===null){await walk(bucket,path);continue}const response=await fetch(`${url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,{headers});if(!response.ok)throw new Error(`No se pudo descargar ${bucket}/${path}`);const target=join("storage",bucket,...path.split("/"));await mkdir(dirname(target),{recursive:true});await writeFile(target,Buffer.from(await response.arrayBuffer()))}}
for(const bucket of buckets)await walk(bucket.id);
