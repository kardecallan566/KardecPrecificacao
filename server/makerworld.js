import {parseMakerworldUrl} from './pricing.js';
export function interpretLicense(value){let s=String(value||'').toLowerCase();if(!s)return {status:'pending',note:'Licença não verificada; não publique sem autorização comercial.'};if(s.includes('standard')||s.includes('nc')||s.includes('non-commercial'))return {status:'pending',note:`Licença ${value}: venda NÃO autorizada por padrão. Peça licença comercial.`};return {status:'pending',note:`Licença detectada (${value}). Confirme as condições e documente a autorização comercial.`};}
function finitePositive(v,max){const n=Number(v);return Number.isFinite(n)&&n>0&&n<max?n:null;}
export function extractPrintEstimate(instance){
 if(!instance||typeof instance!=='object')return {grams:null,hours:null};
 // Os campos só são aceitos para o perfil explicitamente selecionado.
 const grams=finitePositive(instance.weight??instance.filamentWeight??instance.totalWeight,1000000);
 const seconds=finitePositive(instance.prediction??instance.printTime,3600*10000);
 return {grams,hours:seconds?Number((seconds/3600).toFixed(3)):null};
}
export async function lookupModel(link,fetchImpl=fetch){
 const base=parseMakerworldUrl(link);const result={...base,designer:'',license:'Não verificada',licenseStatus:'pending',grams:null,hours:null,imageUrl:'',note:'Confira licença, gramas e tempo no Bambu Studio. Nenhum valor será inventado.'};
 try{
   const res=await fetchImpl(`https://api.bambulab.com/v1/design-service/design/${base.modelId}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(6500)});
   if(!res.ok)return result;
   const raw=await res.text();if(raw.length>350000)return result;
   const payload=JSON.parse(raw);const m=payload?.data||payload;
   if(!m||typeof m!=='object')return result;
   const profile=Array.isArray(m.instances)?m.instances.find(p=>String(p.profileId||p.id)===base.profileId):null;
   result.title=String(m.title||base.title).slice(0,140);result.designer=String(m.designCreator?.name||m.designCreator?.handle||'').slice(0,100);
   result.license=String(m.license||'Não verificada');result.note=interpretLicense(m.license).note;
   // Não copiar imagens de terceiros para a loja sem autorização. Impressão: pesar e conferir no slicer.
   result.profileName=String(profile?.title||'').slice(0,140);
   const estimate=extractPrintEstimate(profile);
   if(estimate.grams!==null)result.grams=estimate.grams;
   if(estimate.hours!==null)result.hours=estimate.hours;
   if(result.grams!==null||result.hours!==null)result.note+=' Valores extraídos de metadados do perfil; confirme no Bambu Studio e selecione sua impressora/material.';
   return result;
 }catch{return result;}
}
