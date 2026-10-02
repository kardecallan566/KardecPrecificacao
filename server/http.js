export const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...headers}});
export function fail(e){const msg=e instanceof Error?e.message:'Erro';const code=e?.status||(/required|inválid|obrigatório|não autoriza|limite|Incompleto|insuficiente/i.test(msg)?400:500);return json({error:code===500?'Falha ao processar solicitação':msg},code);}
const requestError=(message,status)=>Object.assign(new Error(message),{status});
export async function boundedBody(req,max=64000){
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>max))throw requestError('Envio excede o limite',413);
 if(!req.body)return new Uint8Array();
 const reader=req.body.getReader(),parts=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
   if(total>max){await reader.cancel();throw requestError('Envio excede o limite',413)}parts.push(value);
  }
 }finally{reader.releaseLock()}
 const out=new Uint8Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.byteLength}return out;
}
export async function bodyJson(req,max=64000){
 if(!/^application\/json(?:\s*;|\s*$)/i.test(req.headers.get('content-type')||''))throw requestError('Envie JSON com Content-Type application/json',415);
 const bytes=await boundedBody(req,max);let parsed;
 try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw requestError('JSON inválido',400)}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw requestError('Envie um objeto JSON',400);
 return parsed;
}
export function guardAdminMutation(req){
 if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return null;
 if(req.headers.get('X-Zynutz-Admin')!=='1')return json({error:'Cabeçalho de segurança ausente'},403);
 const url=new URL(req.url),origin=req.headers.get('origin');
 if(origin&&origin!==url.origin)return json({error:'Origem não permitida'},403);
 const site=req.headers.get('sec-fetch-site');
 if(site&&!['same-origin','none'].includes(site))return json({error:'Requisição entre sites bloqueada'},403);
 const contentType=req.headers.get('content-type')||'';
 const isUpload=url.pathname.replace(/\/$/,'')==='/api/admin/media'&&req.method==='POST';
 if(isUpload?!/^multipart\/form-data\s*;\s*boundary=/i.test(contentType):!/^application\/json(?:\s*;|\s*$)/i.test(contentType))
  return json({error:'Tipo de conteúdo não permitido'},415);
 return null;
}
export const HTML_SECURITY_HEADERS=Object.freeze({
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; media-src 'self' https:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
});
export function htmlResponse(body,cache='public,max-age=180'){
 return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':cache,...HTML_SECURITY_HEADERS}});
}
export const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
export const text=(s,max=10000)=>String(s??'').trim().slice(0,max);
export const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const arr=s=>{try{return JSON.parse(s||'[]')}catch{return []}};
export const settings=async db=>Object.fromEntries((await db.prepare('SELECT key,value FROM settings').all()).results.map(r=>[r.key,r.value]));
export const productPublic=p=>({id:p.id,slug:p.slug,name:p.name,description:p.description,category:p.category,price:p.price_cents/100,stock:p.stock,images:arr(p.images_json),videos:arr(p.videos_json),shopee:p.shopee_url,featured:!!p.featured});
export const productAdmin=p=>({...productPublic(p),status:p.status,sourceUrl:p.source_url,profileId:p.profile_id,designer:p.designer,licenseStatus:p.license_status,licenseReference:p.license_reference,material:p.material,grams:p.grams,hours:p.print_hours,laborMinutes:p.labor_minutes,packaging:p.packaging_cents/100,extras:p.extras_cents/100,priceConfig:JSON.parse(p.price_config_json||'{}')});
export const postPublic=p=>({id:p.id,slug:p.slug,title:p.title,excerpt:p.excerpt,body:p.body,cover:p.cover_url,tags:arr(p.tags_json),publishedAt:p.published_at});
