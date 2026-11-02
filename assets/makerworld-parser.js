const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'");
const textOf=s=>decode(String(s||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
export function extractMakerWorldTooltip(html){
 if(typeof html!=='string'||!html.trim())throw new Error('Cole o HTML do tooltip do perfil MakerWorld.');
 if(html.length>500000)throw new Error('O trecho HTML é muito grande. Copie somente o tooltip do perfil.');
 const weightTag=html.match(/<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bweight-text\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i);
 const weightText=textOf(weightTag?.[1]||'');
 const gramsMatch=weightText.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
 const profile=html.match(/<div\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bprofile_detail\b[^"']*["'])[^>]*>([\s\S]*?)(?=<div\b[^>]*\bclass\s*=\s*["'][^"']*\bfilaments_detail\b|<hr\b|$)/i);
 const profileText=textOf(profile?.[1]||'');
 const timeMatch=profileText.match(/(\d+(?:[.,]\d+)?)\s*h(?:\s*(\d+(?:[.,]\d+)?)\s*min)?\b/i)||profileText.match(/(\d+)\s*min\b/i);
 let hours=null;
 if(timeMatch){if(timeMatch.length>2&&timeMatch[2]!==undefined)hours=Number(timeMatch[1].replace(',','.'))+Number(timeMatch[2].replace(',','.'))/60;else if(/min/i.test(timeMatch[0])&&!/h/i.test(timeMatch[0]))hours=Number(timeMatch[1])/60;else hours=Number(timeMatch[1].replace(',','.'));}
 const grams=gramsMatch?Number(gramsMatch[1].replace(',','.')):null;
 if(!(grams>0)&&!(hours>0))throw new Error('Não encontrei peso (g) nem tempo (h) nesse HTML. Copie o tooltip completo do perfil selecionado.');
 return {grams:grams>0?grams:null,hours:hours>0?Number(hours.toFixed(4)):null,material:(html.match(/class=["'][^"']*\bmaterial-text\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1]?textOf((html.match(/class=["'][^"']*\bmaterial-text\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1]):'',profileText};
}
