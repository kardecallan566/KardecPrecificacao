export const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function fail(e){const msg=e instanceof Error?e.message:'Erro';const code=e?.status||(/required|inválid|obrigatório|não autoriza|limite|Incompleto|insuficiente/i.test(msg)?400:500);return json({error:code===500?'Falha ao processar solicitação':msg},code);}
export async function bodyJson(req,max=64000){const len=Number(req.headers.get('content-length')||0);if(len>max)throw Object.assign(new Error('Envio excede o limite'),{status:413});const t=await req.text();if(t.length>max)throw Object.assign(new Error('Envio excede o limite'),{status:413});try{return JSON.parse(t)}catch{throw Object.assign(new Error('JSON inválido'),{status:400})}}
export const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
export const text=(s,max=10000)=>String(s??'').trim().slice(0,max);
export const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const arr=s=>{try{return JSON.parse(s||'[]')}catch{return []}};
export const settings=async db=>Object.fromEntries((await db.prepare('SELECT key,value FROM settings').all()).results.map(r=>[r.key,r.value]));
export const productPublic=p=>({id:p.id,slug:p.slug,name:p.name,description:p.description,category:p.category,price:p.price_cents/100,stock:p.stock,images:arr(p.images_json),videos:arr(p.videos_json),shopee:p.shopee_url,featured:!!p.featured});
export const productAdmin=p=>({...productPublic(p),status:p.status,sourceUrl:p.source_url,profileId:p.profile_id,designer:p.designer,licenseStatus:p.license_status,licenseReference:p.license_reference,material:p.material,grams:p.grams,hours:p.print_hours,laborMinutes:p.labor_minutes,packaging:p.packaging_cents/100,extras:p.extras_cents/100,priceConfig:JSON.parse(p.price_config_json||'{}')});
export const postPublic=p=>({id:p.id,slug:p.slug,title:p.title,excerpt:p.excerpt,body:p.body,cover:p.cover_url,tags:arr(p.tags_json),publishedAt:p.published_at});
