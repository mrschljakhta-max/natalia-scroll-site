/**
 * N / A — ORIGAMI 3D / Three.js + GSAP ScrollTrigger
 * All paper vertices are mapped from ONE planar sheet per left/right half.
 * No pre-rendered animation or 2D triangles; geometric fold axes and normals
 * are updated in WebGL and remain reversible with scroll.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const stage=document.getElementById("stage");
const journey=document.getElementById("experience");
const target=document.getElementById("origami3d");
const reduce=matchMedia("(prefers-reduced-motion: reduce)");
const GS=window.gsap, ST=window.ScrollTrigger;
if(!stage||!journey||!target||!GS||!ST) throw new Error("3D prerequisites unavailable; retaining Canvas fallback");
GS.registerPlugin(ST);

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const W=3.55,H=4.90;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.1,70);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.setClearColor(0x12232a,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.24;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute("aria-hidden","true");
target.appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xf4ead5,0x24483f,2.15);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffe6bf,3.8);
key.position.set(3.5,5.6,6.5);scene.add(key);
const fill=new THREE.DirectionalLight(0xa6d2c3,2.0);fill.position.set(-5,-2,3);scene.add(fill);
const rim=new THREE.PointLight(0xfac9a0,22,13);rim.position.set(-3,3.5,2);scene.add(rim);

const paperTexture=()=>{
 const c=document.createElement("canvas");c.width=512;c.height=768;
 const g=c.getContext("2d");g.fillStyle="#f8f5eb";g.fillRect(0,0,512,768);
 g.strokeStyle="#c9d2c9";g.lineWidth=1;
 for(let i=0;i<42;i++) {let y=18+i*19;g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke()}
 g.fillStyle="#3e7360";g.font="bold 27px Georgia";g.fillText("N / A   ACCOUNTING",36,74);
 g.fillStyle="#85a796";g.fillRect(36,94,438,5);
 for(let j=0;j<15;j++){g.fillStyle=j%3===0?"#849d8e":"#b4c5b8";g.fillRect(35,141+j*31,310+(j%4)*28,3)}
 g.strokeStyle="#7b9c8c";g.lineWidth=5;g.beginPath();
 [0,1,2,3,4,5,6,7].forEach((n)=>{const x=65+n*54,y=675-Math.sin(n*.75)*33-n*5;n?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
};
const texture=paperTexture();
const sailGroup=new THREE.Group();scene.add(sailGroup);
const halves=[];
const leftShade=new THREE.Color("#acc7b3"),rightShade=new THREE.Color("#d7a27b"),neutral=new THREE.Color("#f7f2e6");
const segmentsX=22,segmentsY=52;
for(let side=0;side<2;side++){
 const geo=new THREE.PlaneGeometry(W/2,H,segmentsX,segmentsY);
 geo.translate((side===0?-1:1)*W/4,0,0);
 const mat=new THREE.MeshStandardMaterial({map:texture,vertexColors:true,side:THREE.DoubleSide,roughness:.76,metalness:0,transparent:true,opacity:1,depthWrite:true});
 const mesh=new THREE.Mesh(geo,mat);
 mesh.castShadow=true;mesh.receiveShadow=true;
 geo.setAttribute("color",new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3),3));
 const original=new Float32Array(geo.attributes.position.array);
 sailGroup.add(mesh);halves.push({mesh,geo,original,side});
}
// A coarse sheet edge provides a convincing dark paper thickness in perspective.
const edgeMaterial=new THREE.LineBasicMaterial({color:0xb8c6b5,transparent:true,opacity:.65});
const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(-W/2,-H/2,0),new THREE.Vector3(W/2,-H/2,0),
 new THREE.Vector3(W/2,H/2,0),new THREE.Vector3(-W/2,H/2,0)
]),edgeMaterial);sailGroup.add(edge);

function rotateAxis(point,ax,ay,bx,by,theta){
 const vx=bx-ax,vy=by-ay,len=Math.hypot(vx,vy);
 const ux=vx/len,uy=vy/len;
 let x=point[0]-ax,y=point[1]-ay,z=point[2];
 const cs=Math.cos(theta),sn=Math.sin(theta),dot=ux*x+uy*y;
 const rx=x*cs+uy*z*sn+ux*dot*(1-cs);
 const ry=y*cs-ux*z*sn+uy*dot*(1-cs);
 const rz=z*cs+(ux*y-uy*x)*sn;
 return [rx+ax,ry+ay,rz];
}
function mapFold(x0,y0,prog,side){
 // A genuine 180-degree hinge along the page middle line.
 const half=smooth(.552,.646,prog);
 let x=x0,y=y0,z=(side===0?-.008:.008);
 if(y0<0){const a=Math.PI*half;y=y0*Math.cos(a);z+=y0*Math.sin(a)}
 // Two opposed oblique corner fold axes. Each panel has its own pivot line.
 const left=smooth(.650,.714,prog);
 const right=smooth(.701,.762,prog);
 if(x0<0&&y>0){
  const cross=(W/2)*(y)-(H/2)*(x+W/2);
  if(cross>0){
    const p=rotateAxis([x,y,z],-W/2,0,0,H/2,-2.47*left);
    [x,y,z]=p;
  }
 }
 if(x0>0&&y>0){
  const cross=(-W/2)*(y)-(H/2)*(x-W/2);
  if(cross<0){
    const p=rotateAxis([x,y,z],W/2,0,0,H/2,2.47*right);
    [x,y,z]=p;
  }
 }
 // Open the central pocket and bring the paper into volume.
 const pocket=smooth(.762,.838,prog);
 z+=pocket*.42*Math.sin((x0/W+.5)*Math.PI);
 y-=pocket*.12;
 x*=1-pocket*.09;
 return [x,y,z];
}
function mapSail(x0,y0,side){
 // The same original sheet vertices form two sails and a folded 3D hull.
 const v=(y0+H/2)/H, u=(x0+W/2)/W;
 if(v<.365){
  const hullDepth=(.365-v)/.365;
  return [x0*1.11, -.98-hullDepth*.72,
     .22*Math.sin(Math.PI*u)+.21*hullDepth+Math.abs(x0)*.07];
 }
 const height=(v-.365)/.635;
 if(side===0){
   const xn=(x0+W/2)/(W/2);
   return [-1.64*(1-height)*(1-xn)-.075*(1-height),
     -.98+height*3.42, .23*Math.sin(Math.PI*xn)*(1-height)+.13*height];
 }
 const xn=x0/(W/2);
 return [.10+1.37*xn*(1-height),
   -.98+height*2.57, -.20*Math.sin(Math.PI*xn)*(1-height)-.10*height];
}
function updateSheet(p){
 const morph=smooth(.802,.945,p);
 const reveal=smooth(.518,.560,p)*(1-smooth(.968,1,p)*.16);
 const inkFade=1-smooth(.72,.91,p);
 for(const {mesh,geo,original,side} of halves){
  const pos=geo.attributes.position,col=geo.attributes.color;
  for(let i=0;i<pos.count;i++){
   const a=i*3,x0=original[a],y0=original[a+1];
   const flat=mapFold(x0,y0,p,side),boat=mapSail(x0,y0,side);
   pos.setXYZ(i,mix(flat[0],boat[0],morph),mix(flat[1],boat[1],morph),
     mix(flat[2],boat[2],morph));
   const c=neutral.clone().lerp(side===0?leftShade:rightShade,morph*.92);
   col.setXYZ(i,c.r,c.g,c.b);
  }
  pos.needsUpdate=true;col.needsUpdate=true;
  geo.computeVertexNormals();
  mesh.material.opacity=reveal;
  mesh.material.map=inkFade>.14?texture:null;
  mesh.material.roughness=.76-morph*.14;
  mesh.visible=p>.515;
 }
 // Paper outline disappears while the sides fold, but geometry persists.
 edge.material.opacity=.65*(1-smooth(.552,.7,p));
 edge.visible=p<.7;
 sailGroup.rotation.y=mix(-.12,-.24,smooth(.82,.98,p));
 sailGroup.rotation.x=mix(.045,-.13,morph);
 sailGroup.rotation.z=mix(-.03,.012,morph);
 sailGroup.scale.setScalar(mix(.90,.96,morph));
}
// Each document is a physically situated, flexed plane in three-dimensional space.
const vortex=new THREE.Group();scene.add(vortex);
const docs=[];
let seed=1317;
function rng(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<35;i++){
 const pw=.66+rng()*.24,ph=pw*1.36,g=new THREE.PlaneGeometry(pw,ph,4,6);
 const a=g.attributes.position;
 const bend=.03+rng()*.085;
 for(let k=0;k<a.count;k++){
  const x=a.getX(k),y=a.getY(k);
  a.setZ(k,Math.sin((x/pw+.5)*Math.PI)*Math.cos((y/ph+.5)*Math.PI)*bend);
 }
 g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.86,transparent:true,opacity:1,depthWrite:false}));
 m.castShadow=true;vortex.add(m);
 docs.push({mesh:m,angle:rng()*Math.PI*2,radius:1.25+rng()*4.0,orbit:rng()*.6+.7,order:rng(),x:(rng()-.5)*14,y:(rng()-.5)*8,z:(rng()-.5)*5,phase:rng()*6.28});
}
function updateVortex(p,t){
 const pull=smooth(.105,.31,p),shrink=smooth(.40,.555,p),gone=smooth(.49,.575,p);
 const mobile=innerWidth<670;
 const time=reduce.matches?0:t*.00010;
 for(const d of docs){
  const a=d.angle+(p-.12)*19*d.orbit+time;
  const radius=d.radius*(1-shrink*.84);
  const px=Math.cos(a)*radius*.88,py=Math.sin(a)*radius*.71;
  const pz=Math.sin(a*1.15+d.phase)*radius*.47;
  const m=d.mesh;
  m.position.set(mix(d.x,px,pull),mix(d.y,py,pull),mix(d.z,pz,pull));
  m.rotation.set(mix(d.phase,Math.sin(a)*.5,pull),mix(d.angle,Math.cos(a)*.8,pull),a*.3);
  m.scale.setScalar((.83+.25*d.order)*(1-shrink*.40));
  m.material.opacity=(1-gone)*(.73+.27*d.order);
  m.visible=p<.58;
 }
 vortex.position.set(mobile?0:1.45,mobile?-.4:0,0);
}
// Decorative physical line creases follow rendered camera lighting (not fake triangles).
const seaLight=new THREE.PointLight(0xffe4b2,3.5,11);seaLight.position.set(4,-2,2);scene.add(seaLight);

let width=0,height=0,progress=0,previous=0,active=true;
function resize(){
 const rect=stage.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
 if(w===width&&h===height)return;
 width=w;height=h;renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.position.set(0,0,w<670?12.9:13.8);
 camera.lookAt(0,0,0);camera.updateProjectionMatrix();
}
function tick(time){
 if(!active)return;
 resize();
 const p=clamp(progress);
 const mobile=width<670;
 sailGroup.position.set(mobile?0:1.8,mobile?-.74:-.19,0);
 sailGroup.visible=p>.512;
 updateSheet(p);
 updateVortex(p,time*1000);
 // Slight parallax makes the folding object read as 3D, but never hides the folds.
 camera.position.x=mix(-.10,.14,smooth(.58,.94,p));
 camera.position.y=mix(.13,-.15,smooth(.76,1,p));
 camera.lookAt(0,0,0);
 renderer.render(scene,camera);
 window.__origami3DProgress=p;
}
try{
 resize();renderer.render(scene,camera);
 const scrub={p:0};
 GS.to(scrub,{p:1,ease:"none",scrollTrigger:{
  trigger:journey,start:"top top",end:"bottom bottom",scrub:0.65,
  invalidateOnRefresh:true,onUpdate:()=>{}
 },onUpdate(){progress=scrub.p}});
 GS.ticker.add(tick);
 document.addEventListener("visibilitychange",()=>{active=!document.hidden;if(active)resize()});
 window.addEventListener("resize",resize,{passive:true});
 renderer.domElement.addEventListener("webglcontextlost",()=>{window.__natalia3d=false;target.style.display="none"},{passive:true});
 window.__natalia3d=true;window.__origami3DReady=true;
 window.__origami3DDiagnostics={engine:"Three.js WebGL",controller:"GSAP ScrollTrigger",sheetMeshes:halves.length,sheetVertices:halves.reduce((n,o)=>n+o.geo.attributes.position.count,0),vortexMeshes:docs.length};
}catch(err){window.__natalia3d=false;target.style.display="none";console.error("3D scene init failed; fallback to Canvas",err)}
