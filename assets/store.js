const $=s=>document.querySelector(s);
const state={products:[],posts:[],category:'Todos',availability:'all',query:''};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const safeUrl=x=>{try{const u=new URL(x,location.origin);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
async function fetchJson(path){const r=await fetch(path);if(!r.ok)throw Error('Ainda não foi possível carregar.');return r.json()}
function render(){
 const cats=['Todos',...new Set(state.products.map(x=>x.category).filter(Boolean))];
 $('#categoryFilters').innerHTML=cats.map(c=>`<button class="chip ${c===state.category?'active':''}" data-cat="${escape(c)}">${escape(c==='Todos'?'Todas as categorias':c)}</button>`).join('');
 document.querySelectorAll('[data-availability]').forEach(b=>b.classList.toggle('active',b.dataset.availability===state.availability));
 const items=state.products.filter(p=>(state.category==='Todos'||p.category===state.category)&&(state.availability==='all'||(state.availability==='stock'?p.stock>0:p.stock<=0))&&`${p.name} ${p.category}`.toLowerCase().includes(state.query));
 $('#catalogGrid').innerHTML=items.length?items.map(p=>{
  const ready=p.stock>0;
  return `<article class="product-card"><a class="product-photo" href="/produto/${encodeURIComponent(p.slug)}" aria-label="Ver ${escape(p.name)}">${p.images?.length?`<img loading="lazy" src="${escape(safeUrl(p.images[0]))}" alt="${escape(p.name)}">`:'<span class="no-photo">✳</span>'}${p.featured?'<span class="pill">DESTAQUE</span>':''}<span class="availability-pill ${ready?'ready':'consult'}">${ready?'PRONTA ENTREGA':'CONSULTE DISPONIBILIDADE'}</span></a><div class="product-body"><span class="product-category">${escape(p.category)}</span><h3>${escape(p.name)}</h3><div class="product-price"><b>${fmt(p.price)}</b><a title="Ver detalhes" aria-label="Ver detalhes de ${escape(p.name)}" href="/produto/${encodeURIComponent(p.slug)}">↗</a></div><a class="product-detail-link" href="/produto/${encodeURIComponent(p.slug)}">Ver detalhes do produto <span>↗</span></a></div></article>`;
 }).join(''):'<div class="empty-state"><b>Nenhum produto encontrado com esses filtros.</b><br>Experimente outra categoria ou consulte a disponibilidade com a gente.</div>';
}
$('#categoryFilters').addEventListener('click',e=>{const c=e.target.closest('[data-cat]');if(c){state.category=c.dataset.cat;render();}});
$('#availabilityFilters').addEventListener('click',e=>{const b=e.target.closest('[data-availability]');if(b){state.availability=b.dataset.availability;render();}});
$('#catalogSearch').addEventListener('input',e=>{state.query=e.target.value.toLowerCase().trim();render()});
async function init(){
 try{
  const s=await fetchJson('/api/settings');
  document.title=`${s.brand||'Kardlottgeek'} · Impressão 3D`;
  for(const id of ['navShopee','heroShopee','featureShopee','ctaShopee']){const el=document.getElementById(id);if(el&&s.shopee_url&&safeUrl(s.shopee_url)!=='#')el.href=safeUrl(s.shopee_url);}
  const socials=['instagram','tiktok','youtube'].filter(x=>s[x]);if(s.whatsapp)socials.push('whatsapp');
  $('#socialLinks').innerHTML=socials.map(k=>`<a rel="noopener noreferrer" target="_blank" href="${escape(k==='whatsapp'?`https://wa.me/${String(s.whatsapp).replace(/\D/g,'')}`:safeUrl(s[k]))}">${escape(k.toUpperCase())} ↗</a>`).join('');
 }catch{}
 try{const r=await fetchJson('/api/products');state.products=r.products||[];render();}
 catch{$('#catalogGrid').innerHTML='<div class="empty-state">Catálogo em configuração. Volte em breve para conhecer nossos produtos.</div>';}
 try{
  const r=await fetchJson('/api/blog');const ps=r.posts||[];
  $('#blogGrid').innerHTML=ps.length?ps.map(p=>`<article class="blog-card"><a href="/blog/${encodeURIComponent(p.slug)}"><div class="blog-thumb">${p.cover?`<img loading="lazy" src="${escape(safeUrl(p.cover))}" alt="${escape(p.title)}">`:'✳'}</div><div class="blog-body"><span class="product-category">DICAS & IDEIAS</span><h3>${escape(p.title)}</h3><p>${escape(p.excerpt)}</p><span class="text-link">Continuar lendo ↗</span></div></a></article>`).join(''):'<div class="empty-state">Em breve: dicas, novidades e bastidores da impressão 3D.</div>';
 }catch{$('#blogGrid').innerHTML='<div class="empty-state">Conteúdo em preparação.</div>';}
}
init();
