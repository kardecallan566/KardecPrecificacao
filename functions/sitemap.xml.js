import {esc} from '../server/http.js';
export async function onRequestGet({env,request}){
 const origin=new URL(request.url).origin;
 let urls=['/'];
 if(env.DB){const [p,b]=await Promise.all([env.DB.prepare("SELECT slug FROM products WHERE status='published' LIMIT 1000").all(),env.DB.prepare("SELECT slug FROM posts WHERE status='published' LIMIT 1000").all()]);urls.push(...p.results.map(r=>`/produto/${encodeURIComponent(r.slug)}`),...b.results.map(r=>`/blog/${encodeURIComponent(r.slug)}`));}
 const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>`<url><loc>${esc(origin+x)}</loc></url>`).join('')+'</urlset>';
 return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=3600'}});
}
