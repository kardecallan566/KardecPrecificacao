import {json,fail,settings} from '../../server/http.js';
export async function onRequestGet({env}){try{if(!env.DB)return json({error:'Banco não configurado'},503);const s=await settings(env.DB);return json({brand:s.brand,tagline:s.tagline,shopee_url:s.shopee_url,whatsapp:s.whatsapp,instagram:s.instagram,tiktok:s.tiktok,youtube:s.youtube});}catch(e){return fail(e)}}
