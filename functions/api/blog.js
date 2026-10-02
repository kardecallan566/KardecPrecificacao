import {json,fail,postPublic} from '../../server/http.js';
export async function onRequestGet({env,request}){try{
 if(!env.DB)return json({posts:[],error:'Banco de dados não configurado'},503);
 const slug=new URL(request.url).searchParams.get('slug');
 if(slug){const p=await env.DB.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").bind(slug).first();return p?json({post:postPublic(p)}):json({error:'Artigo não encontrado'},404);}
 const rows=await env.DB.prepare("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 80").all();return json({posts:rows.results.map(postPublic)});
}catch(e){return fail(e)}}
