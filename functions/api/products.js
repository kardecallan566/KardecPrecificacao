import {json,fail,productPublic} from '../../server/http.js';
export async function onRequestGet({env,request}){try{
 if(!env.DB)return json({error:'Banco de dados não configurado',products:[]},503);
 const url=new URL(request.url);const slug=url.searchParams.get('slug');
 if(slug){const p=await env.DB.prepare("SELECT * FROM products WHERE slug=? AND status='published'").bind(slug).first();return p?json({product:productPublic(p)}):json({error:'Produto não encontrado'},404);}
 const rows=await env.DB.prepare("SELECT * FROM products WHERE status='published' ORDER BY featured DESC,updated_at DESC LIMIT 100").all();
 return json({products:rows.results.map(productPublic)});
}catch(e){return fail(e)}}
