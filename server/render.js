import {esc} from './http.js';
export function shell({title,description,body,canonical='',image=''}){
 const metaImage=image?`<meta property="og:image" content="${esc(image)}">`:'';
 const link=canonical?`<link rel="canonical" href="${esc(canonical)}">`:'';
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Zynutz 3D</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${metaImage}${link}<link rel="stylesheet" href="/assets/style.css"></head><body><header class="top"><a class="logo" href="/">✳ ZYNUTZ<span>3D</span></a><nav><a href="/#catalogo">Produtos</a><a href="/#blog">Blog</a><a href="/admin/">Painel</a></nav></header><main class="detail-page">${body}</main><footer class="foot">Zynutz 3D · Produtos produzidos sob demanda</footer></body></html>`;
}
export function bodyText(s){return String(s).split(/\n\n+/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');}
