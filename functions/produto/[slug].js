import {esc,arr,settings,htmlResponse} from '../../server/http.js';
import {shell,bodyText} from '../../server/render.js';
export async function onRequestGet({env,params,request}){
 if(!env.DB)return new Response('Loja em configuração',{status:503});
 const p=await env.DB.prepare("SELECT * FROM products WHERE slug=? AND status='published'").bind(params.slug).first();
 if(!p)return new Response('Produto não encontrado',{status:404});
 const s=await settings(env.DB),link=p.shopee_url||s.shopee_url;
 const photos=arr(p.images_json),videos=arr(p.videos_json),ready=p.stock>0;
 const whatsapp=String(s.whatsapp||'').replace(/\D/g,'');
 const message=encodeURIComponent(`Olá! Tenho interesse no produto ${p.name}. Pode me informar a disponibilidade e o prazo?`);
 const whatsappUrl=whatsapp?`https://wa.me/${whatsapp}?text=${message}`:'';
 const gallery=`<div class="detail-gallery"><div class="detail-image">${photos[0]?`<img src="${esc(photos[0])}" alt="${esc(p.name)}">`:'<span class="giant-icon">✳</span>'}</div>${photos.length>1?`<div class="detail-thumbs">${photos.map((x,i)=>`<button class="detail-thumb ${i===0?'active':''}" type="button" data-photo="${i}" aria-label="Ver imagem ${i+1}"><img loading="lazy" src="${esc(x)}" alt="${esc(p.name)}"></button>`).join('')}</div>`:''}${videos.length?`<div class="detail-videos">${videos.map(x=>/\.(mp4|webm)(\?|$)/i.test(x)?`<video controls preload="metadata" src="${esc(x)}"></video>`:`<a href="${esc(x)}" rel="noopener noreferrer" target="_blank">Assistir vídeo do produto ↗</a>`).join('')}</div>`:''}</div>`;
 const availability=ready?'<span class="detail-availability ready">● Disponível para pronta entrega</span>':'<span class="detail-availability consult">● Consulte disponibilidade e prazo de produção</span>';
 const actions=ready&&link?`<a class="button primary" href="${esc(link)}" rel="noopener noreferrer" target="_blank">Comprar na Shopee ↗</a>`:whatsappUrl?`<a class="button primary" href="${esc(whatsappUrl)}" rel="noopener noreferrer" target="_blank">Consultar pelo WhatsApp ↗</a>`:'';
 const body=`<a class="detail-back" href="/#catalogo">← Voltar ao catálogo</a><div class="detail-grid">${gallery}<div><p class="eyebrow">${esc(p.category||'COLEÇÃO KLG')} · FEITO EM 3D</p><h1>${esc(p.name)}</h1><p class="detail-subtitle">Uma peça criativa para colecionar, presentear ou deixar seu espaço com mais personalidade.</p><p class="price">R$ ${(p.price_cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>${availability}<div class="detail-description">${bodyText(p.description||'Peça produzida em impressão 3D. Consulte detalhes de acabamento, cores e personalização.')}</div><div class="detail-benefits"><span>✦ Produção cuidadosa</span><span>✦ Personalização sob consulta</span></div><div class="detail-actions">${actions}</div>${!ready?'<p class="muted">Este item não está marcado como pronta entrega. Fale com a gente para confirmar se é possível produzir uma nova unidade.</p>':''}</div></div>`;
 const url=new URL(request.url);
 return htmlResponse(shell({title:p.name,bodyClass:'detail-page',extraCss:'/assets/product.css',description:(p.description||'Produto de impressão 3D da Kardlottgeek.').slice(0,155),body,canonical:`${url.origin}/produto/${p.slug}`,image:photos[0]||''})).then(async res=>{const html=await res.text();return new Response(html.replace('</body>', '<script type="module" src="/assets/product.js"></script></body>'),{status:res.status,headers:res.headers});});
}
