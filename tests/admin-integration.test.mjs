import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as admin} from '../functions/api/admin/[[path]].js';
import {onRequestGet as publicProducts} from '../functions/api/products.js';

function memoryD1(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync('migrations/0001_init.sql','utf8'));
 sql.exec(readFileSync('migrations/0002_sales_quotes.sql','utf8'));
 sql.exec(readFileSync('migrations/0003_security.sql','utf8'));
 sql.exec(readFileSync('migrations/0004_customers_tasks.sql','utf8'));
 const wrap=(s,args=[])=>({
   bind:(...values)=>wrap(s,values),
   first:async()=>s.get(...args)||null,
   all:async()=>({results:s.all(...args)}),
   run:async()=>({meta:{changes:s.run(...args).changes}})
 });
 return {prepare:sqlText=>wrap(sql.prepare(sqlText)),batch:async statements=>{
  sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}
 },close:()=>sql.close()};
}
function request(path,method='GET',body){const headers={'X-Local-Admin-Token':'test-local-token','X-Zynutz-Admin':'1'};if(body!==undefined)headers['Content-Type']='application/json';return new Request('http://localhost:8788/api/admin/'+path,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});}
const env=db=>({DB:db,LOCAL_DEV:'true',LOCAL_DEV_TOKEN:'test-local-token'});
async function call(db,path,method='GET',body){const r=await admin({request:request(path,method,body),env:env(db)});return {status:r.status,data:await r.json()};}

test('fluxo administrativo completo: catálogo, orçamento, venda, estoque, relatórios e blog',async()=>{
 const db=memoryD1();try{
  let p=await call(db,'products','POST',{name:'Fantasma autoral com LED',status:'published',licenseStatus:'own_design',images:['https://example.org/foto-propria.jpg'],stock:3,grams:52,hours:2.5,price:39.9,packaging:1.2,extras:3,priceConfig:{filamentKg:80}});
  assert.equal(p.status,201);const id=p.data.id;
  let pub=await publicProducts({env:env(db),request:new Request('http://localhost/api/products')});assert.equal((await pub.json()).products.length,1);
  const quote=await call(db,'quotes','POST',{title:'Halloween',input:{grams:52,hours:2.5},costs:{marketplacePercent:20}});assert.equal(quote.status,201);
  assert.equal((await call(db,'quotes')).data.quotes.length,1);
  const first=await call(db,'sales','POST',{productId:id,channel:'shopee',externalOrder:'ORDER-123',quantity:2,gross:79.8,fee:17,shipping:5});assert.equal(first.status,201);assert.equal((await call(db,'products')).data.products[0].stock,1);
  const duplicate=await call(db,'sales','POST',{productId:id,channel:'shopee',externalOrder:'ORDER-123',quantity:1,gross:39.9});assert.equal(duplicate.status,409);
  const insufficient=await call(db,'sales','POST',{productId:id,quantity:2,gross:79.8});assert.equal(insufficient.status,409);
  const analytics=(await call(db,'analytics')).data;assert.equal(analytics.summary.orders,1);assert.equal(analytics.summary.units,2);assert.equal(analytics.summary.gross,79.8);
  assert.equal((await call(db,'sales')).data.sales.length,1);
  assert.equal((await call(db,'inventory')).data.history.length,2);
  const blog=await call(db,'blog','POST',{title:'Halloween seguro com velas LED',status:'published',body:'Apenas LED, sem chama.',cover:'/media/products/12345678-1234-1234-1234-123456789abc.png'});assert.equal(blog.status,201);assert.equal((await call(db,'blog')).data.posts[0].cover,'/media/products/12345678-1234-1234-1234-123456789abc.png');
  const denied=await admin({request:new Request('https://example.pages.dev/api/admin/sales'),env:{DB:db}});assert.equal(denied.status,401);
 }finally{db.close();}
});


test('clientes e tarefas: CRUD seguro e contexto da IA',async()=>{
 const db=memoryD1();try{
  const customer=await call(db,'customers','POST',{name:'Cliente de teste',phone:'61999990000',email:'cliente@example.com',notes:'Preferência PETG'});
  assert.equal(customer.status,201);
  const list=await call(db,'customers');assert.equal(list.data.customers.length,1);assert.equal(list.data.customers[0].name,'Cliente de teste');
  const badEmail=await call(db,'customers','POST',{name:'Inválido',email:'não-é-email'});assert.equal(badEmail.status,400);
  const task=await call(db,'tasks','POST',{title:'Preparar lote PETG',priority:'high',dueDate:'2026-11-15'});
  assert.equal(task.status,201);
  const tasks=await call(db,'tasks');assert.equal(tasks.data.tasks.length,1);assert.equal(tasks.data.tasks[0].priority,'high');
  const invalidDate=await call(db,'tasks','POST',{title:'Data inválida',dueDate:'2026-99-99'});assert.equal(invalidDate.status,400);
  const done=await call(db,'tasks/'+task.data.id,'PUT',{title:'Preparar lote PETG',status:'done',priority:'high'});
  assert.equal(done.status,200);assert.equal((await call(db,'tasks')).data.tasks[0].status,'done');
  const context=await call(db,'assistant');assert.equal(context.status,200);assert.equal(context.data.tasks.length,0);
  const archived=await call(db,'customers/'+customer.data.id,'DELETE');assert.equal(archived.status,200);
  assert.equal((await call(db,'customers')).data.customers[0].status,'inactive');
 }finally{db.close();}
});
