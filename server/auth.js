import {json} from './http.js';

const SESSION_COOKIE='klg_admin_session';
const SESSION_SECONDS=8*60*60;
const encoder=new TextEncoder();
const toBase64Url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const fromBase64Url=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));

async function signingKey(secret){
 const material=await crypto.subtle.digest('SHA-256',encoder.encode(secret));
 return crypto.subtle.importKey('raw',material,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function sign(payload,secret){
 const data=toBase64Url(encoder.encode(JSON.stringify(payload)));
 const signature=await crypto.subtle.sign('HMAC',await signingKey(secret),encoder.encode(data));
 return data+'.'+toBase64Url(signature);
}
function cookieValue(request){
 const raw=request.headers.get('Cookie')||'';
 const item=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='));
 return item?item.slice(SESSION_COOKIE.length+1):'';
}
export function clearAdminCookie(){
 return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
export async function createAdminSession(env){
 if(!env.ADMIN_PASSWORD||String(env.ADMIN_PASSWORD).length<12)throw new Error('Configure ADMIN_PASSWORD com pelo menos 12 caracteres no Cloudflare.');
 const now=Math.floor(Date.now()/1000);
 const token=await sign({sub:'klg-admin',email:String(env.ADMIN_EMAIL||'Administrador'),iat:now,exp:now+SESSION_SECONDS},env.ADMIN_PASSWORD);
 return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}
export async function verifyAdmin(request,env){
 const url=new URL(request.url),local=url.hostname==='localhost'||url.hostname==='127.0.0.1';
 const devToken=request.headers.get('X-Local-Admin-Token');
 if(local&&env.LOCAL_DEV==='true'&&env.LOCAL_DEV_TOKEN&&devToken===env.LOCAL_DEV_TOKEN)return {email:'local-admin',local:true};
 if(!env.ADMIN_PASSWORD)return null;
 const token=cookieValue(request);
 if(!token||token.length>2048)return null;
 const [data,signature,...extra]=token.split('.');
 if(!data||!signature||extra.length)return null;
 try{
  const key=await signingKey(env.ADMIN_PASSWORD);
  if(!await crypto.subtle.verify('HMAC',key,fromBase64Url(signature),encoder.encode(data)))return null;
  const payload=JSON.parse(new TextDecoder().decode(fromBase64Url(data)));
  const now=Math.floor(Date.now()/1000);
  if(payload.sub!=='klg-admin'||typeof payload.email!=='string'||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60||payload.exp-payload.iat>SESSION_SECONDS)return null;
  return {email:payload.email};
 }catch{return null;}
}
export async function requireAdmin(context){
 const user=await verifyAdmin(context.request,context.env);
 if(!user)return {error:json({error:'Sessão expirada. Entre novamente com sua senha administrativa.'},401)};
 return {user};
}
export async function handleAdminAuth(request,env,path){
 const method=request.method;
 if(path==='login'&&method==='POST'){
  const password=String((await (await import('./http.js')).bodyJson(request)).password||'');
  const configured=String(env.ADMIN_PASSWORD||'');
  if(!configured)return json({error:'A senha administrativa ainda não foi configurada no Cloudflare (ADMIN_PASSWORD).'},503);
  const suppliedHash=await crypto.subtle.digest('SHA-256',encoder.encode(password));
  const expectedHash=await crypto.subtle.digest('SHA-256',encoder.encode(configured));
  const a=new Uint8Array(suppliedHash),b=new Uint8Array(expectedHash);
  let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  if(!password||diff!==0)return json({error:'Senha incorreta.'},401);
  return json({ok:true,email:String(env.ADMIN_EMAIL||'Administrador')},200,{'Set-Cookie':await createAdminSession(env)});
 }
 if(path==='logout'&&method==='POST')return json({ok:true},200,{'Set-Cookie':clearAdminCookie()});
 return null;
}
