// Motor determinístico em centavos e decimais: mesmo algoritmo no browser e Cloudflare.
export const DEFAULT_COSTS = Object.freeze({filamentKg:80,energyKwh:1.10,printerWatts:120,packaging:1.20,machineHourly:1.50,laborHourly:20,laborMinutes:10,wastePercent:5,failurePercent:5,shopeePercent:20,shopeeFixed:4.50,shopeeFreeShipping:0,mercadoLivrePercent:16,mercadoLivreFixed:6.00,mercadoLivreShipping:0,marketplacePercent:20,marketplaceFixed:4.50,taxPercent:0,targetMarginPercent:25,adsPerSale:0,extras:0});
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
 const margin=c.targetMarginPercent/100;
 const calc=(percent,fixedFn,extra=0)=>{const rate=(percent+c.taxPercent)/100;if(rate+margin>=1)throw new Error('Margem + taxas precisam ser menores que 100%');const feeFixed=price=>fixedFn(price);let price=(production+feeFixed(100)+extra)/(1-rate-margin);for(let i=0;i<12;i++)price=(production+feeFixed(price)+extra)/(1-rate-margin);const suggested=Math.ceil(price*100)/100;const actual=Number(input.salePrice)>0?positive(input.salePrice,'Preço informado'):suggested;const fixed=feeFixed(actual),fees=actual*percent/100+fixed+extra,taxes=actual*c.taxPercent/100,contribution=actual-fees-taxes-production;return{percent,fixed,extra,breakEven:round2((production+fixed+extra)/(1-rate)),suggested:round2(suggested),salePrice:round2(actual),fees:round2(fees),taxes:round2(taxes),contribution:round2(contribution),marginPercent:actual?round2(contribution/actual*100):0};};
 const shopee=calc(c.shopeePercent,price=>price<9?price/2:price<80?4.5:price<100?16:price<200?20:26,c.shopeeFreeShipping);
 const mercadoLivre=calc(c.mercadoLivrePercent,()=>c.mercadoLivreFixed,c.mercadoLivreShipping);
 const legacy=calc(c.marketplacePercent,()=>c.marketplaceFixed,0);
 return {input:{grams,hours,units},costs:{material:round2(material),energy:round2(energy),failures:round2(failure),machine:round2(machine),labor:round2(labor),packaging:round2(packing),extras:round2(extras),ads:round2(ads),production:round2(production)},platforms:{shopee,mercadoLivre},breakEven:legacy.breakEven,suggested:legacy.suggested,salePrice:legacy.salePrice,contribution:legacy.contribution,netMarginPercent:legacy.marginPercent,printerHourly:hours>0?round2(legacy.contribution*units/hours):0,assumptions:'Estimativas parametrizadas. Tarifas, frete, categoria, modalidade e regras variam por conta; confira o simulador oficial antes de publicar.'};
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
