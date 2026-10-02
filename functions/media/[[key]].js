export async function onRequestGet({env,params}){
 if(!env.MEDIA)return new Response('Mídia indisponível',{status:503});
 const key=Array.isArray(params.key)?params.key.join('/'):String(params.key||'');
 if(!/^products\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$/.test(key))return new Response('Não encontrado',{status:404});
 const file=await env.MEDIA.get(key);if(!file)return new Response('Não encontrado',{status:404});
 const headers=new Headers();file.writeHttpMetadata(headers);headers.set('Cache-Control','public,max-age=86400,immutable');headers.set('X-Content-Type-Options','nosniff');return new Response(file.body,{headers,etag:file.httpEtag});
}
