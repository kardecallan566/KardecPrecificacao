import test from 'node:test';import assert from 'node:assert/strict';
import {onRequest as admin} from '../functions/api/admin/[[path]].js';
import {onRequestGet as products} from '../functions/api/products.js';

test('rotas administrativas negam solicitação sem JWT autenticado',async()=>{
 const request=new Request('https://exemplo.pages.dev/api/admin/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{grams:100,hours:2}})});
 const res=await admin({request,env:{}});assert.equal(res.status,401);
});
test('modo local exige localhost e token explícito',async()=>{
 const payload=JSON.stringify({input:{grams:100,hours:2},costs:{marketplacePercent:20}});
 const opts={method:'POST',headers:{'Content-Type':'application/json','X-Local-Admin-Token':'correto','X-Zynutz-Admin':'1'},body:payload};
 const env={LOCAL_DEV:'true',LOCAL_DEV_TOKEN:'correto'};
 assert.equal((await admin({request:new Request('https://zynutz.pages.dev/api/admin/quote',opts),env})).status,401);
 const good=await admin({request:new Request('http://localhost:8788/api/admin/quote',opts),env});assert.equal(good.status,200);assert.ok((await good.json()).suggested>0);
});
test('catálogo vazio falha fechado sem banco configurado',async()=>{const res=await products({env:{},request:new Request('https://loja.pages.dev/api/products')});assert.equal(res.status,503);});
