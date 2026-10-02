import {json,fail,bodyJson,boundedBody,guardAdminMutation,slugify,text,arr,productAdmin,settings} from '../../../server/http.js';
import {requireAdmin} from '../../../server/auth.js';
import {calculateQuote,DEFAULT_COSTS,licenseAllowed} from '../../../server/pricing.js';
import {lookupModel} from '../../../server/makerworld.js';
import {normalizeSale} from '../../../server/sales.js';
const number=(v,name,min=0,max=1e7)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Object.assign(new Error(`${name} inválido`),{status:400});return n};
const cents=(v,name)=>Math.round(number(v,name)*100);
const isUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}};
const mediaUrl=v=>/^\/media\/products\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$/.test(v)||isUrl(v);
const link=v=>v&&isUrl(v)?text(v,1000):'';
const costConfig=v=>{
 if(!v||typeof v!=='object'||Array.isArray(v))throw Object.assign(new Error('Custos devem ser objeto JSON'),{status:400});
 const out={};for(const [key,value] of Object.entries(v)){if(!Object.hasOwn(DEFAULT_COSTS,key))throw Object.assign(new Error(`Custo desconhecido: ${key}`),{status:400});out[key]=number(value,key)}
 calculateQuote({grams:1,hours:1},{...DEFAULT_COSTS,...out});return out;
};
function normalizeProduct(v){
 const name=text(v.name,140);if(!name)throw Object.assign(new Error('Nome do produto é obrigatório'),{status:400});
 const slug=slugify(v.slug||name);if(!slug)throw Object.assign(new Error('Slug inválido'),{status:400});
 const images=(Array.isArray(v.images)?v.images:[]).filter(x=>typeof x==='string'&&mediaUrl(x)).slice(0,12);
 const videos=(Array.isArray(v.videos)?v.videos:[]).filter(x=>typeof x==='string'&&mediaUrl(x)).slice(0,5);
 const source=link(v.sourceUrl),status=['draft','published','archived'].includes(v.status)?v.status:'draft';
 const licenseStatus=['pending','approved','rejected','own_design'].includes(v.licenseStatus)?v.licenseStatus:'pending';
 const licenseReference=text(v.licenseReference,500);
 if(status==='published'){
  if(!licenseAllowed(licenseStatus,licenseReference,source))throw Object.assign(new Error('Antes de publicar: registre licença comercial ou indique design próprio sem link externo.'),{status:400});
  if(images.length<1)throw Object.assign(new Error('Adicione ao menos uma foto sua do produto antes de publicar'),{status:400});
  if(number(v.price,'Preço')<=0)throw Object.assign(new Error('Preço positivo é obrigatório'),{status:400});
 }
 return {slug,name,description:text(v.description,8000),category:text(v.category||'Decoração',70),price_cents:cents(v.price??0,'Preço'),stock:Math.floor(number(v.stock??0,'Estoque',0,100000)),status,source_url:source,profile_id:text(v.profileId,30),designer:text(v.designer,140),license_status:licenseStatus,license_reference:licenseReference,images_json:JSON.stringify(images),videos_json:JSON.stringify(videos),shopee_url:link(v.shopee),featured:v.featured?1:0,material:text(v.material||'PETG',30),grams:number(v.grams??0,'Gramas'),print_hours:number(v.hours??0,'Horas'),labor_minutes:number(v.laborMinutes??10,'Trabalho manual'),packaging_cents:cents(v.packaging??1.2,'Embalagem'),extras_cents:cents(v.extras??0,'Insumos'),price_config_json:JSON.stringify(costConfig(v.priceConfig||{}))};
}
function normalizePost(v){const title=text(v.title,180),slug=slugify(v.slug||title);if(!slug||!title)throw Object.assign(new Error('Título e slug obrigatórios'),{status:400});return{title,slug,excerpt:text(v.excerpt,350),body:text(v.body,50000),cover_url:mediaUrl(v.cover)?text(v.cover,1000):'',tags_json:JSON.stringify(Array.isArray(v.tags)?v.tags.map(x=>text(x,40)).slice(0,8):[]),status:v.status==='published'?'published':'draft'};}
const dbReady=env=>env.DB?null:json({error:'Configure o D1 no Cloudflare antes de usar o painel.'},503);
const errorUnique=e=>String(e?.message||'').toLowerCase().includes('unique constraint');
async function updateProduct(db,id,v){let p=normalizeProduct(v);const old=await db.prepare('SELECT id,stock FROM products WHERE id=?').bind(id).first();if(!old)return json({error:'Produto não encontrado'},404);
 const cols=Object.keys(p);const query=`UPDATE products SET ${cols.map(x=>`${x}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock=?`;
 const stmts=[db.prepare(query).bind(...Object.values(p),id,old.stock)];const delta=p.stock-old.stock;
 if(delta)stmts.push(db.prepare('INSERT INTO inventory_log(id,product_id,delta,reason) SELECT ?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,delta,'Ajuste no cadastro'));
 const result=await db.batch(stmts);
 if(result[0].meta.changes!==1)return json({error:'Estoque alterado por outra operação: atualize a lista e tente novamente'},409);
 return json({ok:true,id});}
export async function onRequest(context){const auth=await requireAdmin(context);if(auth.error)return auth.error;
 const {request,env}=context;const rejected=guardAdminMutation(request);if(rejected)return rejected;let path=new URL(request.url).pathname.replace(/^\/api\/admin\/?/,'').split('/').filter(Boolean);const method=request.method;
 try{
  if(path[0]==='me'&&method==='GET')return json({email:auth.user.email});
  if(path[0]==='lookup'&&method==='POST'){const b=await bodyJson(request);return json(await lookupModel(String(b.url||'')));}
  if(path[0]==='quote'&&method==='POST'){const b=await bodyJson(request);return json(calculateQuote(b.input||{},b.costs||{}));}
  const missing=dbReady(env);if(missing)return missing;const db=env.DB;
  if(path[0]==='settings'){
   if(method==='GET'){return json({settings:await settings(db)});}
   if(method==='PUT'){const b=await bodyJson(request);const keys=['brand','tagline','shopee_url','whatsapp','instagram','tiktok','youtube','default_costs'];const statements=[];for(const k of keys){if(b[k]===undefined)continue;let value=k==='default_costs'?JSON.stringify({...DEFAULT_COSTS,...costConfig(b[k])}):text(b[k],500);if(k.endsWith('_url')||['instagram','tiktok','youtube'].includes(k)){if(value&&!isUrl(value))throw Object.assign(new Error(`URL inválida: ${k}`),{status:400})}statements.push(db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,value));}if(statements.length)await db.batch(statements);return json({ok:true});}
  }
  if(path[0]==='products'){
   if(method==='GET'){const q=await db.prepare('SELECT * FROM products ORDER BY updated_at DESC LIMIT 300').all();return json({products:q.results.map(productAdmin)});}
   if(method==='POST'){const p=normalizeProduct(await bodyJson(request));const id=crypto.randomUUID();const fields=['id',...Object.keys(p)];const insert=db.prepare(`INSERT INTO products(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`).bind(id,...Object.values(p));const writes=[insert];if(p.stock)writes.push(db.prepare('INSERT INTO inventory_log(id,product_id,delta,reason) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,p.stock,'Estoque inicial'));await db.batch(writes);return json({ok:true,id},201);}
   if(path[1]&&method==='PUT')return await updateProduct(db,path[1],await bodyJson(request));
   if(path[1]&&method==='DELETE'){await db.prepare("UPDATE products SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(path[1]).run();return json({ok:true});}
  }
  if(path[0]==='quotes'){
   if(method==='GET'){const q=await db.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 60').all();return json({quotes:q.results.map(x=>({id:x.id,title:x.title,sourceUrl:x.source_url,input:JSON.parse(x.input_json),costs:JSON.parse(x.costs_json),result:JSON.parse(x.result_json),createdAt:x.created_at}))});}
   if(method==='POST'){
    const b=await bodyJson(request),title=text(b.title||'Orçamento',140),sourceUrl=link(b.sourceUrl);
    const costs={...DEFAULT_COSTS,...costConfig(b.costs||{})},q=calculateQuote(b.input||{},costs),id=crypto.randomUUID();
    await db.prepare('INSERT INTO quotes(id,title,source_url,input_json,costs_json,result_json) VALUES(?,?,?,?,?,?)').bind(id,title,sourceUrl,JSON.stringify(b.input),JSON.stringify(costs),JSON.stringify(q)).run();
    return json({id,quote:q},201);
   }
  }
  if(path[0]==='sales'){
   if(method==='GET'){
    const q=await db.prepare('SELECT s.*,p.name as product_name FROM sales s JOIN products p ON p.id=s.product_id ORDER BY s.sold_at DESC,s.created_at DESC LIMIT 500').all();
    return json({sales:q.results.map(x=>({id:x.id,channel:x.channel,externalOrder:x.external_order,productId:x.product_id,productName:x.product_name,quantity:x.quantity,gross:x.gross_cents/100,fee:x.fee_cents/100,shipping:x.seller_shipping_cents/100,other:x.other_cents/100,unitCost:x.unit_cost_cents/100,contribution:x.contribution_cents/100,soldAt:x.sold_at,note:x.note}))});
   }
   if(method==='POST'){
    const b=await bodyJson(request),product=await db.prepare('SELECT * FROM products WHERE id=?').bind(text(b.productId,80)).first();
    if(!product)return json({error:'Produto não encontrado'},404);
    if(product.status==='archived')return json({error:'Produto arquivado: reative antes de lançar vendas'},409);
    const current=await settings(db);let defaults={};try{defaults=JSON.parse(current.default_costs||'{}')}catch{}
    const sale=normalizeSale(b,product,defaults);
    if(product.stock<sale.quantity)return json({error:'Estoque insuficiente; registre a produção antes da venda'},409);
    const id=crypto.randomUUID(),fields=['id',...Object.keys(sale)];
    // D1 batch é transacional. O trigger na migration 0002 impede estoque negativo sob concorrência.
    await db.batch([
     db.prepare(`INSERT INTO sales(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`).bind(id,...Object.values(sale)),
     db.prepare('UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(sale.quantity,product.id),
     db.prepare('INSERT INTO inventory_log(id,product_id,delta,reason) VALUES(?,?,?,?)').bind(crypto.randomUUID(),product.id,-sale.quantity,`Venda ${sale.channel}${sale.external_order?' #'+sale.external_order:''}`)
    ]);
    return json({ok:true,id,contribution:sale.contribution_cents/100},201);
   }
  }
  if(path[0]==='analytics'&&method==='GET'){
   const q=await db.prepare('SELECT COUNT(*) orders_count,COALESCE(SUM(quantity),0) units,COALESCE(SUM(gross_cents),0) gross_cents,COALESCE(SUM(fee_cents),0) fee_cents,COALESCE(SUM(seller_shipping_cents+other_cents),0) extra_cents,COALESCE(SUM(unit_cost_cents*quantity),0) production_cents,COALESCE(SUM(contribution_cents),0) contribution_cents FROM sales').first();
   const months=await db.prepare("SELECT substr(sold_at,1,7) month,COUNT(*) orders_count,SUM(gross_cents) gross_cents,SUM(contribution_cents) contribution_cents FROM sales GROUP BY substr(sold_at,1,7) ORDER BY month DESC LIMIT 12").all();
   return json({summary:{orders:q.orders_count,units:q.units,gross:q.gross_cents/100,fees:q.fee_cents/100,extra:q.extra_cents/100,production:q.production_cents/100,contribution:q.contribution_cents/100},months:months.results.map(x=>({month:x.month,orders:x.orders_count,gross:x.gross_cents/100,contribution:x.contribution_cents/100}))});
  }
  if(path[0]==='inventory'){
   if(method==='GET'){const q=await db.prepare('SELECT l.id,l.product_id,p.name,l.delta,l.reason,l.created_at FROM inventory_log l JOIN products p ON p.id=l.product_id ORDER BY l.created_at DESC LIMIT 100').all();return json({history:q.results});}
   if(method==='POST'){const b=await bodyJson(request);const id=text(b.productId,70),delta=Number(b.delta);if(!Number.isInteger(delta)||!delta||Math.abs(delta)>100000)throw Object.assign(new Error('Informe um ajuste inteiro diferente de zero'),{status:400});const product=await db.prepare('SELECT stock FROM products WHERE id=?').bind(id).first();if(!product)return json({error:'Produto não encontrado'},404);if(product.stock+delta<0)return json({error:'Estoque insuficiente'},409);const result=await db.batch([db.prepare('UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock=? AND stock+?>=0').bind(delta,id,product.stock,delta),db.prepare('INSERT INTO inventory_log(id,product_id,delta,reason) SELECT ?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,delta,text(b.reason||'Ajuste manual',150))]);if(result[0].meta.changes!==1)return json({error:'Estoque mudou durante o ajuste; recarregue e tente novamente'},409);return json({ok:true,stock:product.stock+delta});}
  }
  if(path[0]==='blog'){
   if(method==='GET'){const q=await db.prepare('SELECT * FROM posts ORDER BY updated_at DESC LIMIT 200').all();return json({posts:q.results.map(p=>({id:p.id,slug:p.slug,title:p.title,excerpt:p.excerpt,body:p.body,cover:p.cover_url,tags:arr(p.tags_json),status:p.status,publishedAt:p.published_at}))});}
   if(method==='POST'){const p=normalizePost(await bodyJson(request));const id=crypto.randomUUID();await db.prepare('INSERT INTO posts(id,title,slug,excerpt,body,cover_url,tags_json,status,published_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,p.title,p.slug,p.excerpt,p.body,p.cover_url,p.tags_json,p.status,p.status==='published'?new Date().toISOString():null).run();return json({ok:true,id},201);}
   if(path[1]&&method==='PUT'){const p=normalizePost(await bodyJson(request));await db.prepare("UPDATE posts SET title=?,slug=?,excerpt=?,body=?,cover_url=?,tags_json=?,status=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(p.title,p.slug,p.excerpt,p.body,p.cover_url,p.tags_json,p.status,p.status,path[1]).run();return json({ok:true});}
   if(path[1]&&method==='DELETE'){await db.prepare('DELETE FROM posts WHERE id=?').bind(path[1]).run();return json({ok:true});}
  }
  if(path[0]==='media'&&method==='POST'){
   if(!env.MEDIA)return json({error:'Configure o R2 MEDIA para enviar arquivos.'},503);
   const maxFile=20*1024*1024;const formLimit=maxFile+128*1024;
   const bytes=await boundedBody(request,formLimit);
   const sanitized=new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')},body:bytes});
   let form;try{form=await sanitized.formData()}catch{throw Object.assign(new Error('Multipart inválido'),{status:400})}const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')return json({error:'Arquivo obrigatório'},400);
   if(file.size>maxFile)return json({error:'Arquivo acima do limite de 20MB'},413);
   const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};let ext=types[file.type];if(!ext)return json({error:'Envie JPEG, PNG, WebP, MP4 ou WebM'},415);
   const b=new Uint8Array(await file.arrayBuffer()),head=[...b.slice(0,12)];let valid=ext==='jpg'?head[0]===255&&head[1]===216:ext==='png'?head.slice(0,4).join(',')==='137,80,78,71':ext==='webp'?new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP':ext==='mp4'?new TextDecoder().decode(b.slice(4,8))==='ftyp':ext==='webm'?head.slice(0,4).join(',')==='26,69,223,163':false;
   if(!valid)return json({error:'Assinatura do arquivo não corresponde ao formato'},415);
   const key=`products/${crypto.randomUUID()}.${ext}`;await env.MEDIA.put(key,b,{httpMetadata:{contentType:file.type},customMetadata:{uploadedBy:auth.user.email}});return json({url:`/media/${key}`,bytes:file.size},201);
  }
  return json({error:'Rota não encontrada'},404);
 }catch(e){if(String(e.message).includes('invalid_published_product'))return json({error:'Produto publicado sem preço, foto ou licença válida'},400);if(String(e.message).includes('invalid_sale_totals'))return json({error:'Valores financeiros inconsistentes'},400);if(errorUnique(e))return json({error:path[0]==='sales'?'Pedido já registrado para este produto; não duplique a venda.':'Slug já cadastrado; use outro nome ou endereço'},409);if(/insufficient_stock|CHECK constraint failed:.*stock/i.test(String(e.message)))return json({error:'Estoque insuficiente'},409);return fail(e)}
}
