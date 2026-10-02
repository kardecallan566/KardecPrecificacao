import {json} from './http.js';
const cache=new Map();
function decode64(s){const binary=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,c=>c.charCodeAt(0));}
function parsePart(s){return JSON.parse(new TextDecoder().decode(decode64(s)));}
export async function verifyAdmin(request,env){
 const reqUrl=new URL(request.url);
 const local=reqUrl.hostname==='localhost'||reqUrl.hostname==='127.0.0.1';
 const devToken=request.headers.get('X-Local-Admin-Token');
 if(local&&env.LOCAL_DEV==='true'&&env.LOCAL_DEV_TOKEN&&devToken===env.LOCAL_DEV_TOKEN)return {email:'local-admin',local:true};
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD||!env.ADMIN_EMAIL||token.length>12000)return null;
 const parts=token.split('.');if(parts.length!==3)return null;
 let head,payload;try{head=parsePart(parts[0]);payload=parsePart(parts[1]);}catch{return null;}
 const domain=String(env.CF_ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//,'').replace(/\/$/,'');
 const iss=`https://${domain}`;const now=Math.floor(Date.now()/1000);
 if(head.alg!=='RS256'||(typeof head.kid!=='string'||!head.kid||head.kid.length>256)||payload.iss!==iss||!Array.isArray(payload.aud)||!payload.aud.includes(env.CF_ACCESS_AUD)||payload.type!=='app'||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60||payload.iat>payload.exp||(payload.nbf!==undefined&&(!Number.isFinite(payload.nbf)||payload.nbf>now+60))||typeof payload.email!=='string'||payload.email.trim().toLowerCase()!==String(env.ADMIN_EMAIL).trim().toLowerCase())return null;
 try{
   let jwks=cache.get(domain);if(!jwks||jwks.until<Date.now()){
     const response=await fetch(`${iss}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(4500)});
     if(!response.ok)return null;jwks={keys:(await response.json()).keys,until:Date.now()+300000};cache.set(domain,jwks);
   }
   const jwk=jwks.keys.find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk)return null;
   const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
   const message=new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
   if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(parts[2]),message))return null;
   return {email:payload.email};
 }catch{return null;}
}
export async function requireAdmin(context){const user=await verifyAdmin(context.request,context.env);if(!user)return {error:json({error:'Acesso administrativo negado. Configure Cloudflare Access e use sua conta autorizada.'},401)};return {user};}
