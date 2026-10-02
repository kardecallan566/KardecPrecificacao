import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote} from '../server/pricing.js';
import {normalizeSale,estimateUnitCost} from '../server/sales.js';

const product={id:'p1',grams:50,print_hours:2,labor_minutes:20,packaging_cents:120,extras_cents:200,price_config_json:JSON.stringify({filamentKg:80,marketplacePercent:20,marketplaceFixed:4.5})};
test('orçamento de lote calcula a contribuição total por hora de impressora',()=>{
 const q=calculateQuote({grams:100,hours:4,units:2,laborMinutes:20},{targetMarginPercent:20});
 assert.ok(Math.abs(q.printerHourly-q.contribution*2/4)<=0.02);
});
test('peso e duração zero não geram preço artificialmente baixo',()=>{
 assert.throws(()=>calculateQuote({grams:0,hours:2}),/peso e tempo/i);
 assert.throws(()=>calculateQuote({grams:50,hours:0}),/peso e tempo/i);
});
test('custo do produto usa os custos persistidos ao invés de premissas alteradas depois',()=>{
 const a=estimateUnitCost(product,{filamentKg:200});
 const b=estimateUnitCost(product,{filamentKg:1000});
 assert.equal(a,b);
 assert.ok(a>4);
});
test('pedido preserva custo unitário, taxas, frete e contribuição em centavos',()=>{
 const s=normalizeSale({quantity:2,gross:90,fee:15.42,shipping:8,other:2,externalOrder:'1234'},product);
 assert.equal(s.gross_cents,9000);
 assert.equal(s.fee_cents,1542);
 assert.equal(s.seller_shipping_cents,800);
 assert.equal(s.contribution_cents,9000-1542-800-200-s.unit_cost_cents*2);
 assert.equal(s.external_order,'1234');
});
test('entrada de vendas rejeita valores inválidos sem alterar o custo',()=>{
 assert.throws(()=>normalizeSale({quantity:0,gross:20},product),/quantidade/i);
 assert.throws(()=>normalizeSale({quantity:1,gross:20,fee:-2},product),/taxas/i);
 assert.throws(()=>normalizeSale({quantity:1,gross:0},product),/valor bruto/i);
 assert.throws(()=>normalizeSale({quantity:1,gross:15}, {...product,grams:0}),/informe custo unitário/i);
 assert.equal(normalizeSale({quantity:1,gross:15,unitCost:2.2},{...product,grams:0}).unit_cost_cents,220);
 assert.throws(()=>normalizeSale({quantity:1,gross:15,soldAt:'2026-02-31'},product),/data da venda/i);
});

test('importação preenche peso/tempo apenas de perfil de impressão correspondente',async()=>{
 const {lookupModel}=await import('../server/makerworld.js');
 const response=async()=>({ok:true,text:async()=>JSON.stringify({data:{title:'Fantasma Halloween',license:'BY-NC',instances:[{profileId:'999',weight:300,prediction:12000},{profileId:'1958439',title:'A1 PETG',weight:47.5,prediction:5400}]}})});
 const r=await lookupModel('https://makerworld.com/pt/models/1833809-halloween-ghost-led-tea-light-melting-candle#profileId-1958439',response);
 assert.equal(r.grams,47.5);assert.equal(r.hours,1.5);assert.equal(r.licenseStatus,'pending');
 const missing=await lookupModel('https://makerworld.com/pt/models/1833809-halloween-ghost-led-tea-light-melting-candle#profileId-1234',response);
 assert.equal(missing.grams,null);assert.equal(missing.hours,null);
});
