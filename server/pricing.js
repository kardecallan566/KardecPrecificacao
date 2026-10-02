// Motor determinístico em centavos e decimais: mesmo algoritmo no browser e Cloudflare.
export const DEFAULT_COSTS = Object.freeze({filamentKg:80,energyKwh:1.10,printerWatts:120,packaging:1.20,machineHourly:1.50,laborHourly:20,laborMinutes:10,wastePercent:5,failurePercent:5,marketplacePercent:20,marketplaceFixed:4.50,taxPercent:0,targetMarginPercent:25,adsPerSale:0,extras:0});
const positive = (v,name,max=1e7)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)throw new Error(`${name}: informe um número válido`);return n;};
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
export function calculateQuote(input,overrides={}){
 const c={...DEFAULT_COSTS,...overrides};
 const grams=positive(input.grams,'Peso em gramas',1e6), hours=positive(input.hours,'Horas de impressão',1e4);
 const units=positive(input.units||1,'Unidades por impressão',10000);
 if(!Number.isInteger(units)||units<1)throw new Error('Unidades deve ser inteiro positivo');
 if(grams<=0||hours<=0)throw new Error('Informe peso e tempo de impressão maiores que zero');
 const g=grams/units,h=hours/units;
 for(const [k,v] of Object.entries(c)) c[k]=positive(v,k);
 if(c.wastePercent>=100||c.failurePercent>=100||c.marketplacePercent+c.taxPercent>=100)throw new Error('Percentuais de custo ou taxa inválidos');
 const material=g/1000*c.filamentKg*(1+c.wastePercent/100);
 const energy=h*c.printerWatts/1000*c.energyKwh;
 const failure=(material+energy)*c.failurePercent/(100-c.failurePercent);
 const machine=h*c.machineHourly;
 const labor=(Number(input.laborMinutes??c.laborMinutes)/60)*c.laborHourly/units;
 const packing=Number(input.packaging??c.packaging);
 const extras=(Number(input.extras??c.extras))/units;
 const ads=c.adsPerSale;
 for(const [k,v] of Object.entries({labor,packing,extras}))positive(v,k);
 const production=material+energy+failure+machine+labor+packing+extras+ads;
 const fixed=c.marketplaceFixed;
 const rate=(c.marketplacePercent+c.taxPercent)/100;
 const margin=c.targetMarginPercent/100;
 const breakEven=(production+fixed)/(1-rate);
 if(1-rate-margin<=0) throw new Error('Margem desejada + taxas precisam ser menores que 100%');
 const suggested=(production+fixed)/(1-rate-margin);
 const price=Number(input.salePrice)>0?positive(input.salePrice,'Preço de venda'):Math.ceil(suggested*10)/10;
 const marketplace=price*c.marketplacePercent/100+fixed;
 const taxes=price*c.taxPercent/100;
 const contribution=price-marketplace-taxes-production;
 return {input:{grams,hours,units},costs:{material:round2(material),energy:round2(energy),failures:round2(failure),machine:round2(machine),labor:round2(labor),packaging:round2(packing),extras:round2(extras),ads:round2(ads),production:round2(production),marketplace:round2(marketplace),taxes:round2(taxes)},breakEven:round2(breakEven),suggested:round2(suggested),salePrice:round2(price),contribution:round2(contribution),netMarginPercent:price?round2(contribution/price*100):0,printerHourly:hours>0?round2(contribution*units/hours):0,assumptions: price>=80?'Estimativa: valores acima de R$ 79,99 podem ter outra tarifa fixa; confira sua faixa Shopee, tributos e custos reais.':'Estimativa: taxas editáveis; confira sua faixa Shopee, tributos e custos reais.'};
}
export function parseMakerworldUrl(text){
 let url;try{url=new URL(text)}catch{throw new Error('Cole uma URL válida do MakerWorld');}
 if(!['makerworld.com','www.makerworld.com'].includes(url.hostname)||url.protocol!=='https:') throw new Error('Apenas links HTTPS do MakerWorld são aceitos');
 const match=url.pathname.match(/\/models\/(\d+)(?:-([^/?#]+))?/);
 if(!match)throw new Error('Link sem ID de modelo MakerWorld');
 const slug=(match[2]||'modelo').replace(/[-_]+/g,' ').replace(/\b\p{L}/gu,s=>s.toUpperCase());
 const fragment=new URLSearchParams(url.hash.replace(/^#/,''));const fragmentId=url.hash.match(/profileId[-=](\d+)/i);
 return {modelId:match[1],profileId:fragment.get('profileId')||fragmentId?.[1]||url.searchParams.get('profileId')||'',title:slug,sourceUrl:`https://makerworld.com/en/models/${match[1]}`};
}
export function licenseAllowed(status,reference,sourceUrl){return status==='own_design'&&!sourceUrl || status==='approved'&&typeof reference==='string'&&reference.trim().length>=8;}
