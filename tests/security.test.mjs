import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as admin} from '../functions/api/admin/[[path]].js';
import {onRequestGet as publicProducts} from '../functions/api/products.js';
import {onRequestGet as productPage} from '../functions/produto/[slug].js';
import {onRequestGet as blogPage} from '../functions/blog/[slug].js';
import {onRequestGet as media} from '../functions/media/[[key]].js';
import {verifyAdmin} from '../server/auth.js';
import {bodyJson} from '../server/http.js';

const localEnv={LOCAL_DEV:'true',LOCAL_DEV_TOKEN:'local-test-token'};
const endpoint='http://localhost:8788/api/admin/';
function req(path,method='POST',headers={},data={}){
 return new Request(endpoint+path,{method,headers:{'X-Local-Admin-Token':'local-test-token','X-Zynutz-Admin':'1','Content-Type':'application/json',...headers},body:method==='GET'?undefined:JSON.stringify(data)});
}
async function call(request,env=localEnv){return admin({request,env});}
function database(){
 const db=new DatabaseSync(':memory:');for(const f of ['0001_init.sql','0002_sales_quotes.sql','0003_security.sql'])db.exec(readFileSync('migrations/'+f,'utf8'));
 const stmt=(sql,bind=[])=>({bind:(...vals)=>stmt(sql,vals),first:async()=>db.prepare(sql).get(...bind)||null,all:async()=>({results:db.prepare(sql).all(...bind)}),run:async()=>({meta:{changes:db.prepare(sql).run(...bind).changes}})});
 return {db,api:{prepare:s=>stmt(s),batch:async ss=>{db.exec('BEGIN');try{let out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}}};
}

test('admin: rejeita CSRF, site externo, mídia incompatível e JSON de tipo errado',async()=>{
 const data={input:{grams:100,hours:2},costs:{marketplacePercent:20}};
 assert.equal((await call(req('quote','POST',{'X-Zynutz-Admin':''},data))).status,403);
 assert.equal((await call(req('quote','POST',{'Origin':'https://attacker.example'},data))).status,403);
 assert.equal((await call(req('quote','POST',{'Sec-Fetch-Site':'cross-site'},data))).status,403);
 assert.equal((await call(req('quote','POST',{'Sec-Fetch-Site':'same-site'},data))).status,403);
 assert.equal((await call(req('quote','POST',{'Content-Type':'text/plain'},data))).status,415);
 assert.equal((await call(req('quote','POST',{'Origin':'http://localhost:8788','Sec-Fetch-Site':'same-origin'},data))).status,200);
 assert.equal((await call(req('media','POST',{'Content-Type':'application/json'},data))).status,415);
});

test('JSON: rejeita corpo grande sem Content-Length e objetos inválidos',async()=>{
 const tooLarge=new Request(endpoint+'quote',{method:'POST',headers:{'Content-Type':'application/json'},body:new ReadableStream({start(ctrl){ctrl.enqueue(new TextEncoder().encode(JSON.stringify({x:'A'.repeat(70000)})));ctrl.close()}}),duplex:'half'});
 await assert.rejects(()=>bodyJson(tooLarge),e=>e.status===413);
 const primitive=new Request(endpoint+'quote',{method:'POST',headers:{'Content-Type':'application/json'},body:'null'});
 await assert.rejects(()=>bodyJson(primitive),e=>e.status===400);
});

test('upload: interrompe stream maior que 20 MB antes de gravar em R2',async()=>{
 let writes=0;const body=new ReadableStream({start(ctrl){ctrl.enqueue(new Uint8Array(20*1024*1024+128*1024+1));ctrl.close()}});
 const request=new Request(endpoint+'media',{method:'POST',headers:{'X-Local-Admin-Token':'local-test-token','X-Zynutz-Admin':'1','Content-Type':'multipart/form-data; boundary=SAFE'},body,duplex:'half'});
 const r=await call(request,{...localEnv,DB:{},MEDIA:{put:()=>{writes++}}});assert.equal(r.status,413);assert.equal(writes,0);
});

test('D1: bloqueia produto irregular, total de venda adulterado e estoque negativo',()=>{
 const {db}=database();try{
  assert.throws(()=>db.prepare("INSERT INTO products(id,slug,name,status,price_cents,license_status,images_json) VALUES('bad','bad','bad','published',0,'pending','[]')").run(),/invalid_published_product/);
  db.prepare("INSERT INTO products(id,slug,name,status,price_cents,license_status,images_json,stock) VALUES('p1','good','Bom','published',3990,'own_design',?,3)").run(JSON.stringify(['/media/products/12345678-1234-1234-1234-123456789abc.png']));
  assert.throws(()=>db.prepare("INSERT INTO sales(id,channel,product_id,quantity,gross_cents,fee_cents,seller_shipping_cents,other_cents,unit_cost_cents,contribution_cents,sold_at) VALUES('s1','shopee','p1',1,3990,500,0,0,1500,3990,'2026-10-02')").run(),/invalid_sale_totals/);
  assert.throws(()=>db.prepare("UPDATE products SET stock=-1 WHERE id='p1'").run(),/constraint failed/i);
  assert.equal(db.prepare("SELECT count(*) as n FROM sales").get().n,0);
  assert.equal(db.prepare("SELECT stock FROM products WHERE id='p1'").get().stock,3);
 }finally{db.close()}
});

test('páginas dinâmicas escapam HTML e enviam CSP própria',async()=>{
 const {db,api}=database();try{
  db.prepare("INSERT INTO products(id,slug,name,description,status,price_cents,license_status,images_json,stock) VALUES('p1','safe',? ,? ,'published',2000,'own_design',?,2)")
   .run('<script>alert(1)</script>','<img src=x onerror=alert(1)>',JSON.stringify(['/media/products/12345678-1234-1234-1234-123456789abc.png']));
  db.prepare("INSERT INTO posts(id,slug,title,body,status) VALUES('b1','news',?,?,'published')").run('<svg onload=alert(1)>','<script>evil()</script>');
  const p=await productPage({env:{DB:api},params:{slug:'safe'},request:new Request('https://store.example/produto/safe')});
  const b=await blogPage({env:{DB:api},params:{slug:'news'},request:new Request('https://store.example/blog/news')});
  for(const r of [p,b]){assert.equal(r.status,200);assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('X-Frame-Options'),'DENY');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');}
  assert.doesNotMatch(await p.text(),/<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(await b.text(),/<script>evil\(\)<\/script>/);
  const search=await publicProducts({env:{DB:api},request:new Request('https://store.example/api/products?slug=\'OR1=1')});assert.equal(search.status,404);
 }finally{db.close()}
});

test('mídia: rejeita caminhos não emitidos pelo servidor e não consulta R2',async()=>{
 let reads=0;const env={MEDIA:{get:async()=>{reads++}}};const r=await media({env,params:{key:['..','admin','secrets.txt']}});assert.equal(r.status,404);assert.equal(reads,0);
});

test('JWT Access: verifica assinatura, audience, issuer, email e not-before',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{assert.match(url,/unit-security\.cloudflareaccess\.com\/cdn-cgi\/access\/certs$/);return Response.json({keys:[jwk]})};
 const env={CF_ACCESS_TEAM_DOMAIN:'unit-security.cloudflareaccess.com',CF_ACCESS_AUD:'correct-app-aud',ADMIN_EMAIL:'admin@example.com'};
 const now=Math.floor(Date.now()/1000),claims={iss:'https://unit-security.cloudflareaccess.com',aud:['correct-app-aud'],type:'app',email:'admin@example.com',iat:now-30,nbf:now-30,exp:now+1800};
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const sign=async p=>{const head=enc({alg:'RS256',kid:'test-key',typ:'JWT'}),payload=enc(p);const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(head+'.'+payload));return head+'.'+payload+'.'+Buffer.from(signature).toString('base64url')};
 const check=token=>verifyAdmin(new Request('https://store.example/api/admin/me',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);
 try{
  const good=await sign(claims);assert.equal((await check(good))?.email,'admin@example.com');
  assert.equal(await check(await sign({...claims,nbf:now+600})),null);
  assert.equal(await check(await sign({...claims,aud:['other-app']})),null);
  assert.equal(await check(await sign({...claims,email:'attacker@example.com'})),null);
  assert.equal(await check(await sign({...claims,exp:now-10})),null);
  const tampered=good.split('.');tampered[1]=enc({...claims,email:'attacker@example.com'});assert.equal(await check(tampered.join('.')),null);
 }finally{globalThis.fetch=oldFetch}
});

test('configuração de custos: descarta chaves herdadas e valores fora do intervalo',async()=>{
 assert.equal((await call(req('quote','POST',{}, {input:{grams:100,hours:2},costs:{marketplacePercent:120}}))).status,400);
 const {db,api}=database();try{
  const payload=JSON.parse('{"default_costs":{"__proto__":9}}');
  const r=await call(req('settings','PUT',{},payload),{...localEnv,DB:api});assert.equal(r.status,400);
 }finally{db.close()}
});

test('upload válido grava em chave aleatória e mídia pública aceita apenas chaves seguras',async()=>{
 const saved=[];const photo=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'foto.png',{type:'image/png'});
 const form=new FormData();form.set('file',photo);
 const reqUpload=new Request(endpoint+'media',{method:'POST',headers:{'X-Local-Admin-Token':'local-test-token','X-Zynutz-Admin':'1'},body:form});
 const R2={put:async(key,body,opts)=>saved.push({key,body,opts}),get:async key=>saved.find(x=>x.key===key)?{body:new Uint8Array(saved[0].body),httpEtag:'"tag"',writeHttpMetadata:h=>h.set('Content-Type','image/png')}:null};
 const upload=await call(reqUpload,{...localEnv,DB:{},MEDIA:R2});assert.equal(upload.status,201);
 const data=await upload.json();assert.match(data.url,/^\/media\/products\/[a-f0-9-]{36}\.png$/);assert.equal(saved.length,1);
 const response=await media({env:{MEDIA:R2},params:{key:data.url.replace(/^\/media\//,'').split('/')}});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Content-Type'),'image/png');
});

test('produto e log do estoque são gravados na mesma transação',async()=>{
 const {db,api}=database();try{
  db.exec("CREATE TRIGGER abort_inventory BEFORE INSERT ON inventory_log BEGIN SELECT RAISE(ABORT,'simulated_storage_failure'); END;");
  const response=await call(req('products','POST',{}, {name:'Produto em teste',status:'draft',stock:3}),{...localEnv,DB:api});
  assert.equal(response.status,500);assert.equal(db.prepare('SELECT count(*) n FROM products').get().n,0);
 }finally{db.close()}
});

test('concorrência: edição e ajuste de estoque recusam escrita com saldo desatualizado',async()=>{
 const {db,api}=database();try{
  db.prepare("INSERT INTO products(id,slug,name,stock) VALUES('p1','p1','Um produto',5)").run();
  let intervene=true;
  const stale={...api,prepare(sql){
   const prepared=api.prepare(sql);
   if(intervene&&/^SELECT (id,stock|stock) FROM products WHERE id=\?/.test(sql)){
    return {...prepared,bind(...values){const bound=prepared.bind(...values);return {...bound,first:async()=>{
     const row=await bound.first();if(intervene){intervene=false;if(row.stock===5){db.prepare("UPDATE products SET stock=4 WHERE id='p1'").run();db.prepare("INSERT INTO inventory_log(id,product_id,delta,reason) VALUES('external','p1',-1,'Venda simultânea')").run()}else{db.prepare("UPDATE products SET stock=3 WHERE id='p1'").run();db.prepare("INSERT INTO inventory_log(id,product_id,delta,reason) VALUES('external2','p1',-1,'Venda simultânea 2')").run()}}return row;
    }}}};
   }
   return prepared;
  }};
  const product=await call(req('products/p1','PUT',{}, {name:'Novo nome',stock:7}),{...localEnv,DB:stale});
  assert.equal(product.status,409);
  assert.equal(db.prepare("SELECT stock FROM products WHERE id='p1'").get().stock,4);
  assert.equal(db.prepare('SELECT count(*) n FROM inventory_log').get().n,1);
  intervene=true;
  const inventory=await call(req('inventory','POST',{}, {productId:'p1',delta:2}),{...localEnv,DB:stale});
  assert.equal(inventory.status,409);
  assert.equal(db.prepare("SELECT stock FROM products WHERE id='p1'").get().stock,3);
  assert.equal(db.prepare('SELECT count(*) n FROM inventory_log').get().n,2);
 }finally{db.close()}
});
