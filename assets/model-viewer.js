const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const readText=async file=>new TextDecoder().decode(await file.arrayBuffer());
function parseSTL(buffer){
 const view=new DataView(buffer),vertices=[],faces=[];
 const count=buffer.byteLength>=84?view.getUint32(80,true):0;
 if(count>0&&84+count*50<=buffer.byteLength){
  let o=84;for(let i=0;i<count;i++,o+=50){const ids=[];for(let j=0;j<3;j++){const id=vertices.length;vertices.push([view.getFloat32(o+12+j*12,true),view.getFloat32(o+16+j*12,true),view.getFloat32(o+20+j*12,true)]);ids.push(id)}faces.push(ids)}
  return {vertices,faces};
 }
 const text=new TextDecoder().decode(buffer);const re=/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;let m,tri=[];
 while((m=re.exec(text))){tri.push(vertices.length);vertices.push([+m[1],+m[2],+m[3]]);if(tri.length===3){faces.push(tri);tri=[]}}
 return {vertices,faces};
}
function parseOBJ(text){
 const vertices=[],faces=[];
 for(const line of text.split(/\r?\n/)){const p=line.trim().split(/\s+/);if(p[0]==='v'&&p.length>=4)vertices.push(p.slice(1,4).map(Number));else if(p[0]==='f'&&p.length>=4){const ids=p.slice(1).map(x=>{const n=Number(x.split('/')[0]);return n<0?vertices.length+n:n-1});for(let i=1;i<ids.length-1;i++)faces.push([ids[0],ids[i],ids[i+1]])}}
 return {vertices,faces};
}
async function parse3MF(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break}}
 if(eocd<0)throw Error('Arquivo 3MF inválido.');
 const total=view.getUint16(eocd+10,true),cdOffset=view.getUint32(eocd+16,true);let p=cdOffset,xml='';
 for(let i=0;i<total;i++){
  if(view.getUint32(p,true)!==0x02014b50)break;
  const method=view.getUint16(p+10,true),size=view.getUint32(p+20,true),nameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true),local=view.getUint32(p+42,true);
  const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLen));
  if(name.endsWith('.model')){
   const ln=view.getUint16(local+26,true),le=view.getUint16(local+28,true),start=local+30+ln+le,raw=bytes.slice(start,start+size);
   let data=raw;if(method===8){if(!('DecompressionStream'in window))throw Error('Seu navegador não oferece suporte à descompactação de 3MF. Exporte o modelo como STL.');data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())}
   xml=new TextDecoder().decode(data);break;
  }
  p+=46+nameLen+extra+comment;
 }
 if(!xml)throw Error('Não encontrei a malha 3D dentro do 3MF.');
 const vertices=[...xml.matchAll(/<vertex\s+[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*z="([^"]+)"[^>]*\/>/g)].map(m=>[+m[1],+m[2],+m[3]]);
 const faces=[...xml.matchAll(/<triangle\s+[^>]*v1="(\d+)"[^>]*v2="(\d+)"[^>]*v3="(\d+)"[^>]*\/>/g)].map(m=>[+m[1],+m[2],+m[3]]);
 if(!vertices.length||!faces.length)throw Error('A malha deste 3MF não pôde ser interpretada.');
 return {vertices,faces};
}
export async function mountModelViewer(root,file){
 root.innerHTML='<div class="model-viewer-loading">Preparando visualização 3D…</div>';
 try{
  const ext=file.name.split('.').pop().toLowerCase(),buffer=await file.arrayBuffer();
  const mesh=ext==='stl'?parseSTL(buffer):ext==='obj'?parseOBJ(new TextDecoder().decode(buffer)):ext==='3mf'?await parse3MF(buffer):null;
  if(!mesh)throw Error('Formato não suportado. Use STL, OBJ ou 3MF.');
  if(!mesh.vertices.length||!mesh.faces.length)throw Error('Não encontrei triângulos no arquivo.');
  const bounds=mesh.vertices.reduce((b,v)=>{for(let k=0;k<3;k++){b.min[k]=Math.min(b.min[k],v[k]);b.max[k]=Math.max(b.max[k],v[k])}return b},{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});const min=bounds.min,max=bounds.max;
  const center=min.map((v,k)=>(v+max[k])/2),span=Math.max(...max.map((v,k)=>v-min[k]))||1;
  const verts=mesh.vertices.map(v=>v.map((n,k)=>(n-center[k])/span));
  const faces=mesh.faces.filter(f=>f.every(i=>verts[i]));
  root.innerHTML='<div class="model-viewer-toolbar"><span>PRÉ-VISUALIZAÇÃO 3D · '+file.name.replace(/[&<>"]/g,'')+'</span><div><button type="button" data-model-reset>Centralizar</button><button type="button" data-model-rotate>Girar: ligado</button></div></div><canvas class="model-viewer-canvas" aria-label="Modelo 3D interativo"></canvas><p class="model-viewer-hint">Arraste para girar · Role para aproximar · Toque e arraste no celular</p>';
  const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');let yaw=.65,pitch=-.38,zoom=1.8,drag=null,auto=true,last=0,raf=0;
  function draw(t=0){
   const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#f4f2ec';ctx.fillRect(0,0,w,h);
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),scale=Math.min(w,h)*.72*zoom;
   const projected=verts.map(v=>{const x=v[0]*cy-v[2]*sy,z=v[0]*sy+v[2]*cy,y=v[1]*cp-z*sp,zz=v[1]*sp+z*cp;return [w/2+x*scale,h/2-y*scale,zz]});
   const sorted=faces.map(f=>{const a=projected[f[0]],b=projected[f[1]],c=projected[f[2]],z=(a[2]+b[2]+c[2])/3;const ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-a[0],vy=c[1]-a[1],area=ux*vy-uy*vx;const ab=verts[f[1]].map((n,k)=>n-verts[f[0]][k]),ac=verts[f[2]].map((n,k)=>n-verts[f[0]][k]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...normal)||1,light=clamp(.48+.52*Math.abs((normal[0]*.35+normal[1]*.8+normal[2]*.45)/len),.35,1);return {a,b,c,z,light}}).filter(Boolean).sort((a,b)=>b.z-a.z);
   for(const f of sorted){ctx.beginPath();ctx.moveTo(f.a[0],f.a[1]);ctx.lineTo(f.b[0],f.b[1]);ctx.lineTo(f.c[0],f.c[1]);ctx.closePath();const shade=Math.round(112+f.light*105);ctx.fillStyle='rgb('+shade+','+Math.round(shade*.72)+','+Math.round(shade*.53)+')';ctx.fill();ctx.strokeStyle='rgba(75,65,55,.18)';ctx.lineWidth=.45;ctx.stroke()}
   ctx.strokeStyle='#d4d0c6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.12,h*.82);ctx.lineTo(w*.88,h*.82);ctx.stroke();
   if(auto&&!drag){if(!last)last=t;yaw+=(t-last)*.00022;last=t}raf=requestAnimationFrame(draw);
  }
  const resize=new ResizeObserver(()=>{if(!raf)raf=requestAnimationFrame(draw)});resize.observe(canvas);
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);auto=false;root.querySelector('[data-model-rotate]').textContent='Girar: desligado'});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag[0],dy=e.clientY-drag[1];yaw+=dx*.009;pitch=clamp(pitch+dy*.009,-1.45,1.45);drag=[e.clientX,e.clientY]});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.55,5)},{passive:false});
  root.querySelector('[data-model-reset]').addEventListener('click',()=>{yaw=.65;pitch=-.38;zoom=1.8;auto=true;root.querySelector('[data-model-rotate]').textContent='Girar: ligado'});
  root.querySelector('[data-model-rotate]').addEventListener('click',e=>{auto=!auto;e.currentTarget.textContent='Girar: '+(auto?'ligado':'desligado');last=0});
  draw();
  return ()=>{cancelAnimationFrame(raf);resize.disconnect()};
 }catch(error){root.innerHTML='<div class="model-viewer-error">'+String(error.message||error).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</div>';throw error}
}
