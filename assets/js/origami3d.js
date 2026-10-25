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

/* Editorial financial sheets: restrained detail, ink hierarchy, generous white space. */
const paperTexture=(variant=0)=>{
 const c=document.createElement("canvas");c.width=512;c.height=704;
 const g=c.getContext("2d");g.fillStyle="#f9f7ef";g.fillRect(0,0,512,704);
 // Narrow paper edge, fine recycled paper grain and gentle corner shading.
 const vg=g.createLinearGradient(0,0,512,704);
 vg.addColorStop(0,"#fffdf8");vg.addColorStop(.72,"#f8f6ed");vg.addColorStop(1,"#e7ece2");
 g.fillStyle=vg;g.fillRect(0,0,512,704);
 g.strokeStyle="#c4d4c6";g.lineWidth=1.5;g.strokeRect(17,17,478,669);
 g.fillStyle="#315b4b";g.font="bold 22px Arial";g.fillText("N / A",39,62);
 g.fillStyle="#678b7a";g.font="12px Arial";g.fillText(["ACCOUNTING REPORT","FINANCIAL SUMMARY","DOCUMENT REGISTER","RECONCILIATION"][variant%4],134,59);
 g.fillStyle="#b78d6e";g.fillRect(39,84,55,3);
 g.fillStyle="#a5b6a9";g.fillRect(104,84,365,2);
 g.fillStyle="#3d6f5b";g.font="bold 15px Arial";
 g.fillText(["FINANCIAL OVERVIEW","PERIOD REPORT","ACCOUNT STATUS","SUMMARY"][variant%4],39,127);
 g.fillStyle="#8ca398";g.font="12px Arial";g.fillText("N / A  •  PRIVATE CLIENT DOCUMENT",39,149);
 const x=39,y=193;
 if(variant%4===0){
  for(let i=0;i<9;i++){let yy=y+i*40;g.fillStyle=i%2?"#f0f3eb":"#e8ede4";g.fillRect(x,yy,431,34);
    g.fillStyle="#8ba497";g.fillRect(x+15,yy+13,110+(i%3)*28,3);g.fillRect(x+290,yy+13,96,3)}
 } else if(variant%4===1){
  for(let i=0;i<10;i++){g.fillStyle=i%2?"#b3c6b7":"#99b3a1";g.fillRect(x,y+i*34,310+(i%3)*40,2);}
  g.strokeStyle="#6a957b";g.lineWidth=4;g.beginPath();
  for(let i=0;i<9;i++){let px=x+20+i*50,py=616-27*i-40*Math.sin(i*.7);i?g.lineTo(px,py):g.moveTo(px,py)}
  g.stroke();
 } else if(variant%4===2){
  for(let i=0;i<6;i++){g.fillStyle=i%2?"#d4e0d3":"#e7ece3";g.fillRect(x,y+i*63,431,53);
    g.fillStyle="#9baf9e";g.fillRect(x+14,y+i*63+18,188+(i%2)*59,3);g.fillRect(x+324,y+i*63+18,76,3)}
 }else{
  for(let i=0;i<7;i++){const yy=y+i*55;g.fillStyle="#a2b8a9";g.fillRect(x,yy,405-(i%3)*24,2);
    g.fillStyle=i%3===0?"#c6d8c5":"#e2eade";g.fillRect(x,yy+9,260+(i%3)*55,19);}
 }
 g.strokeStyle="#bccdbc";g.lineWidth=1;g.beginPath();g.moveTo(39,663);g.lineTo(469,663);g.stroke();
 g.fillStyle="#a0b2a4";g.font="11px Arial";g.fillText("NATALIIA & ANNA",39,685);g.fillText("CONFIDENTIAL",372,685);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 return tex;
};
const textures=[0,1,2,3].map(paperTexture);
const texture=textures[0];

/* One intact document mesh: prevents the duplicated two-column paper bug.
   A central vertex line is deliberately retained for clean symmetric folds. */
const sailGroup=new THREE.Group();scene.add(sailGroup);
const sheetGeo=new THREE.PlaneGeometry(W,H,36,54);
const sheetMat=new THREE.MeshStandardMaterial({
 map:texture,vertexColors:true,side:THREE.DoubleSide,
 roughness:.83,metalness:0,transparent:true,opacity:1,depthWrite:true
});
sheetGeo.setAttribute("color",new THREE.BufferAttribute(
 new Float32Array(sheetGeo.attributes.position.count*3),3));
const sheetMesh=new THREE.Mesh(sheetGeo,sheetMat);
sheetMesh.castShadow=true;sheetMesh.receiveShadow=true;sailGroup.add(sheetMesh);
const halves=[{mesh:sheetMesh,geo:sheetGeo,original:new Float32Array(sheetGeo.attributes.position.array)}];
const leftShade=new THREE.Color("#b1c8b4"),rightShade=new THREE.Color("#d9ae8a"),neutral=new THREE.Color("#f8f6e9");
const creaseMat=new THREE.LineBasicMaterial({color:0x9ab6a2,transparent:true,opacity:.38});
const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(-W/2,-H/2,.015),new THREE.Vector3(W/2,-H/2,.015),
 new THREE.Vector3(W/2,H/2,.015),new THREE.Vector3(-W/2,H/2,.015)
]),creaseMat);sailGroup.add(outline);

/* Final vessel is constructed out of shaded 3D folded paper facets.
   No texture is stretched into one gigantic triangular sail. */
const boatGroup=new THREE.Group();sailGroup.add(boatGroup);
const hullGroup=new THREE.Group();boatGroup.add(hullGroup);
const portSail=new THREE.Group(),starboardSail=new THREE.Group();
boatGroup.add(portSail,starboardSail);

function vec(x,y,z){return new THREE.Vector3(x,y,z)}
function addFacet(parent,points,color,roughness=.78){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(
    points.flatMap(v=>v.toArray()),3));
 geo.setIndex(points.length===3?[0,1,2]:
   points.length===4?[0,1,2,0,2,3]:[]);
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
    color,roughness,metalness:0,side:THREE.DoubleSide,flatShading:true,
    transparent:true,opacity:1,depthWrite:true
 }));
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function addCrease(parent,points,color=0xe4e8d8,opacity=.65){
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
 new THREE.LineBasicMaterial({color,transparent:true,opacity}));
 parent.add(line);return line;
}
const HULL={
 l:vec(-1.83,-.88,-.10),ls:vec(-1.14,-.98,.31),center:vec(0,-.80,.54),
 r:vec(1.83,-.88,-.10),rs:vec(1.14,-.98,.31),
 keel:vec(0,-1.57,.66),back:vec(0,-.91,-.33)
};
addFacet(hullGroup,[HULL.l,HULL.ls,HULL.keel],0xc7d9c9);
addFacet(hullGroup,[HULL.ls,HULL.center,HULL.keel],0xe3e9d9);
addFacet(hullGroup,[HULL.center,HULL.rs,HULL.keel],0xf3e9d3);
addFacet(hullGroup,[HULL.rs,HULL.r,HULL.keel],0xc49c7e);
addFacet(hullGroup,[HULL.l,HULL.center,HULL.ls],0xf8f7e9);
addFacet(hullGroup,[HULL.center,HULL.r,HULL.rs],0xd5b396);
addFacet(hullGroup,[HULL.l,HULL.back,HULL.center],0x779788);
addFacet(hullGroup,[HULL.center,HULL.back,HULL.r],0xb19a79);
addCrease(hullGroup,[HULL.l,HULL.ls,HULL.keel,HULL.rs,HULL.r],0xf5f3e3,.72);
addCrease(hullGroup,[HULL.ls,HULL.center,HULL.rs],0xc5e3cb,.74);
addCrease(hullGroup,[HULL.l,HULL.back,HULL.r],0x507468,.58);

// The sail groups pivot at the mast. Their physical planes have two
// facets apiece, with a pronounced ridge in Z, like high-end origami.
const lm=vec(-.06,-.64,.18),lt=vec(-.06,2.22,.04),
      le=vec(-1.57,-.61,.01),lk=vec(-.74,-.57,.38);
addFacet(portSail,[lm,lt,lk],0xe0ead9);
addFacet(portSail,[lt,le,lk],0x92b69f);
addCrease(portSail,[lt,lk,lm],0xfcfae8,.87);
addCrease(portSail,[lt,le,lm],0xf1f5e7,.61);
const rm=vec(.12,-.64,.15),rt=vec(.12,1.76,.015),
      re=vec(1.24,-.58,-.02),rk=vec(.64,-.60,.40);
addFacet(starboardSail,[rm,rt,rk],0xf6e3c8);
addFacet(starboardSail,[rt,re,rk],0xc58f68);
addCrease(starboardSail,[rt,rk,rm],0xfff1dd,.87);
addCrease(starboardSail,[rt,re,rm],0xf9e6cb,.64);
const vesselMaterials=[];
boatGroup.traverse(o=>{if(o.isMesh&&o.material)vesselMaterials.push(o.material)});
const vesselCreases=[];
boatGroup.traverse(o=>{if(o.isLine)vesselCreases.push(o.material)});


/* Continuous mirror-symmetric paper folding.
   The left/right corners share ONE exact isosceles triangle destination. */
function mapFold(x0,y0,p){
 const hinge=smooth(.552,.646,p);
 const a=Math.PI*hinge;
 const yy=y0<0?y0*Math.cos(a):y0;
 let zz=y0<0?y0*Math.sin(a):0;
 // On the folded document each half is exactly mirrored about x=0.
 const v=clamp(Math.abs(y0)/(H*.5),0,1);
 const sx=x0<0?-1:1;
 const triangleX=x0*(1-v);
 const fold=sx<0?smooth(.649,.719,p):smooth(.680,.750,p);
 const xx=mix(x0,triangleX,fold);
 zz+=sx*.012*fold+.12*Math.sin(v*Math.PI)*(1-v)*fold;
 // A measured lift on the triangle creates a pocket before the vessel opens.
 const pocket=smooth(.754,.832,p);
 zz+=pocket*(.18+.14*(1-v))*Math.sin(Math.PI*(x0/W+.5));
 return [xx,yy-pocket*.10,zz];
}
function updateSheet(p){
 const reveal=smooth(.516,.563,p);
 const hullTransition=smooth(.833,.912,p);
 const sheetFade=1-smooth(.848,.936,p);
 const materialFade=reveal*sheetFade;
 const {mesh,geo,original}=halves[0];
 const pos=geo.attributes.position,col=geo.attributes.color;
 const tone=smooth(.69,.83,p);
 for(let i=0;i<pos.count;i++){
  const a=i*3,x0=original[a],y0=original[a+1];
  const b=mapFold(x0,y0,p);
  const tucked=[b[0]*.78,-.94+b[1]*.14,.30+Math.abs(b[0])*.025];
  pos.setXYZ(i,mix(b[0],tucked[0],hullTransition),
    mix(b[1],tucked[1],hullTransition),mix(b[2],tucked[2],hullTransition));
  const q=x0<0?leftShade:rightShade;
  const blend=tone*.38;
  col.setXYZ(i,mix(neutral.r,q.r,blend),mix(neutral.g,q.g,blend),
    mix(neutral.b,q.b,blend));
 }
 pos.needsUpdate=true;col.needsUpdate=true;geo.computeVertexNormals();
 mesh.material.opacity=materialFade;
 mesh.visible=p>.512&&materialFade>.003;
 outline.material.opacity=.38*(1-smooth(.545,.638,p));
 outline.visible=p<.64;
 sailGroup.rotation.set(mix(.035,-.10,smooth(.84,.98,p)),
    mix(-.07,-.18,smooth(.84,.98,p)),mix(-.023,.007,smooth(.84,.98,p)));
 sailGroup.scale.setScalar(.92);
 // Hull expands from the same folded document while two sails open around
 // physical vertical crease axes with different timings.
 const hull=smooth(.806,.887,p),
       port=smooth(.844,.942,p),
       star=smooth(.872,.972,p),
       depart=smooth(.918,1,p);
 boatGroup.visible=p>.803;
 hullGroup.scale.set(mix(.52,1,hull),mix(.13,1,hull),mix(.64,1,hull));
 portSail.scale.x=Math.max(.003,Math.sin(port*Math.PI/2));
 portSail.rotation.y=mix(-1.31,-.14,port);
 portSail.rotation.z=mix(-.09,0,port);
 starboardSail.scale.x=Math.max(.003,Math.sin(star*Math.PI/2));
 starboardSail.rotation.y=mix(1.31,.12,star);
 starboardSail.rotation.z=mix(.07,0,star);
 boatGroup.position.set(.23*depart,-.17*depart,0);
 boatGroup.rotation.y=-.035*depart;
 hullGroup.visible=hull>.002;
 portSail.visible=port>.002;starboardSail.visible=star>.002;
 // A separate fold facet now casts the correct spatial shadow in Three.js.
 for(const m of vesselMaterials)m.opacity=hull;
 for(const m of vesselCreases)m.opacity=hull*.72;
}


// Each document is a physically situated, flexed plane in three-dimensional space.
/* Curated 3D documents — no ribbons, stretched paper, duplicate surfaces
   or extreme edge-on rotations over the hero headline. */
const vortex=new THREE.Group();scene.add(vortex);
const docs=[];
let seed=1317;
function rng(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<25;i++){
 const pw=.80+rng()*.31,ph=pw*1.36;
 const g=new THREE.PlaneGeometry(pw,ph,2,3);
 const a=g.attributes.position;
 const bend=.007+rng()*.017;
 for(let j=0;j<a.count;j++){
  const x=a.getX(j),y=a.getY(j);
  a.setZ(j,Math.sin((x/pw+.5)*Math.PI)*Math.sin((y/ph+.5)*Math.PI)*bend);
 }
 g.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
  map:textures[i%textures.length],side:THREE.DoubleSide,
  roughness:.86,metalness:0,transparent:true,opacity:1,depthWrite:true
 });
 const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;vortex.add(mesh);
 const theta=rng()*Math.PI*2;
 docs.push({
  mesh,angle:theta,radius:1.0+rng()*3.3,orbit:.67+rng()*.30,
  order:rng(),x:-.55+rng()*7.5,y:-2.9+rng()*6.15,z:-1.6+rng()*2.9,
  phase:rng()*6.28,tilt:(rng()-.5)*.36,spin:(rng()-.5)*.95
 });
}
function updateVortex(p,t){
 const pull=smooth(.115,.319,p),shrink=smooth(.395,.554,p),gone=smooth(.490,.582,p);
 const mobile=innerWidth<670;
 const time=reduce.matches?0:t*.00008;
 for(const d of docs){
  const a=d.angle+(p-.12)*14.0*d.orbit+time;
  const radius=d.radius*(1-shrink*.84);
  const tx=Math.cos(a)*radius*.83,ty=Math.sin(a)*radius*.77;
  const tz=Math.sin(a*1.1+d.phase)*radius*.31;
  const m=d.mesh;
  m.position.set(mix(d.x,tx,pull),mix(d.y,ty,pull),mix(d.z,tz,pull));
  const twist=smooth(.16,.39,p);
  m.rotation.set(mix(d.tilt,Math.sin(a)*.33,twist),
    mix(d.spin*.35,Math.cos(a)*.44,twist),
    mix(d.spin,a*.13,twist));
  m.scale.setScalar((.88+.19*d.order)*(1-shrink*.35));
  m.material.opacity=(1-gone)*(.88+.12*d.order);
  m.visible=p<.584;
 }
 vortex.position.set(mobile?0:1.30,mobile?-.4:0,0);
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
 window.__origami3DDiagnostics={engine:"Three.js WebGL",controller:"GSAP ScrollTrigger",sheetMeshes:halves.length,sheetVertices:halves.reduce((n,o)=>n+o.geo.attributes.position.count,0),vortexMeshes:docs.length,boatFacets:8,sailFacets:4,geometryVersion:"v5-symmetric"};
}catch(err){window.__natalia3d=false;target.style.display="none";console.error("3D scene init failed; fallback to Canvas",err)}
