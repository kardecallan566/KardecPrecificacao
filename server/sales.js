import {calculateQuote,DEFAULT_COSTS} from './pricing.js';
const money=(value,label)=>{const n=Number(value);if(!Number.isFinite(n)||n<0||n>1e7)throw Object.assign(new Error(`${label}: informe valor válido`),{status:400});return Math.round((n+Number.EPSILON)*100)};
const clean=(s,max=160)=>String(s??'').trim().slice(0,max);
export function estimateUnitCost(product,configured={}){
 const grams=Number(product.grams),hours=Number(product.print_hours);
 if(!(grams>0&&hours>0))return null;
 const saved=JSON.parse(product.price_config_json||'{}');
 const costs={...DEFAULT_COSTS,...configured,...saved};
 const q=calculateQuote({grams,hours,units:1,laborMinutes:product.labor_minutes,packaging:product.packaging_cents/100,extras:product.extras_cents/100},costs);
 return q.costs.production;
}
export function normalizeSale(data,product,defaults={}){
 const channel=['shopee','whatsapp','site','other'].includes(data.channel)?data.channel:'shopee';
 const quantity=Number(data.quantity);
 if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Object.assign(new Error('Quantidade precisa ser inteiro positivo'),{status:400});
 const gross=money(data.gross,'Valor bruto'),fee=money(data.fee??0,'Taxas'),shipping=money(data.shipping??0,'Frete pago pelo vendedor'),other=money(data.other??0,'Outros custos');
 if(gross<=0)throw Object.assign(new Error('Informe o valor bruto da venda'),{status:400});
 let unitCost;
 if(data.unitCost!==undefined&&data.unitCost!==null&&data.unitCost!=='')unitCost=money(data.unitCost,'Custo unitário confirmado');
 else{const estimated=estimateUnitCost(product,defaults);if(estimated===null)throw Object.assign(new Error('Produto sem peso/tempo: informe custo unitário confirmado'),{status:400});unitCost=money(estimated,'Custo unitário');}
 const soldAt=clean(data.soldAt,10)||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(soldAt)||Number.isNaN(Date.parse(soldAt))||new Date(soldAt+'T00:00:00Z').toISOString().slice(0,10)!==soldAt)throw Object.assign(new Error('Data da venda inválida'),{status:400});
 const contribution=gross-fee-shipping-other-unitCost*quantity;
 return {channel,external_order:clean(data.externalOrder,100)||null,product_id:product.id,quantity,gross_cents:gross,fee_cents:fee,seller_shipping_cents:shipping,other_cents:other,unit_cost_cents:unitCost,contribution_cents:contribution,sold_at:soldAt,note:clean(data.note,300)};
}
