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

/* V6 / Atelier origami yacht. A recognisable folded-paper sculpture, with a
   long double-keel hull, soft asymmetric sails, crease-lines and rim-light.
   Contrasting surfaces remain legible against both sea and green studio. */
const boatGroup=new THREE.Group();sailGroup.add(boatGroup);
const hullGroup=new THREE.Group();boatGroup.add(hullGroup);
const portSail=new THREE.Group(),starboardSail=new THREE.Group();
boatGroup.add(portSail,starboardSail);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const mat=(color,opts={})=>new THREE.MeshPhysicalMaterial({
 color,roughness:.77,metalness:0,side:THREE.DoubleSide,
 clearcoat:.12,clearcoatRoughness:.79,flatShading:true,
 transparent:true,opacity:1,depthWrite:true,
 ...opts
});
function facet(parent,ps,color){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(ps.flatMap(v=>v.toArray()),3));
 g.setIndex(ps.length===4?[0,1,2,0,2,3]:[0,1,2]);
 g.computeVertexNormals();const o=new THREE.Mesh(g,mat(color));
 o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function seam(parent,ps,color=0xdde8d6,alpha=.82){
 let curve=new THREE.BufferGeometry().setFromPoints(ps);
 const line=new THREE.Line(curve,new THREE.LineBasicMaterial({
  color,transparent:true,opacity:alpha,depthWrite:false,depthTest:true
 }));
 parent.add(line);return line;
}
// Origami hull: tapered stern/bow, an open upper fold, and a genuine V keel.
// All front/back planes have different Z so they do not z-fight.
const P={
 stern:V(-1.92,-.79,-.08),L:V(-1.30,-.91,.22),
 aft:V(-.75,-.95,.30),C:V(-.06,-.78,.55),
 fore:V(.83,-.88,.31),R:V(1.43,-.83,.21),
 bow:V(1.94,-.70,-.14),depth:V(.05,-1.40,.81),
 back:V(-.06,-.94,-.37),front:V(.13,-1.04,.64)
};
facet(hullGroup,[P.stern,P.L,P.aft],0xe2eadd);
facet(hullGroup,[P.stern,P.aft,P.depth],0xb4cbb8);
facet(hullGroup,[P.aft,P.C,P.depth],0xeaf0df);
facet(hullGroup,[P.C,P.fore,P.depth],0xf6e9d4);
facet(hullGroup,[P.fore,P.bow,P.depth],0xc79c79);
facet(hullGroup,[P.fore,P.R,P.bow],0xe4c4a2);
facet(hullGroup,[P.stern,P.back,P.C],0x88a996);
facet(hullGroup,[P.C,P.back,P.bow],0x997f69);
facet(hullGroup,[P.stern,P.L,P.C],0xf4f5e8);
facet(hullGroup,[P.C,P.R,P.bow],0xf3e1c4);
facet(hullGroup,[P.L,P.front,P.C],0xd7e5d4);
facet(hullGroup,[P.C,P.front,P.R],0xf7edda);
seam(hullGroup,[P.stern,P.L,P.aft,P.C,P.fore,P.R,P.bow],0xffffff,.84);
seam(hullGroup,[P.aft,P.depth,P.fore],0x779e86,.75);
seam(hullGroup,[P.stern,P.back,P.bow],0x63877c,.66);
seam(hullGroup,[P.L,P.front,P.R],0xe1eddc,.64);
seam(hullGroup,[P.depth,P.front],0xfdf6e9,.57);

// A narrow folded paper mast and a subtle shadow behind the sails.
facet(boatGroup,[V(-.047,-.77,-.06),V(.055,-.77,-.06),
 V(.043,2.63,-.05),V(-.035,2.63,-.05)],0x9db8a4);
seam(boatGroup,[V(.016,-.76,.015),V(.011,2.60,.015)],0xfaf7e9,.75);

// Sail surfaces are lofted in 3D. Vertical bands form an origami "ridge",
// subtly curved in silhouette with a continuous, never-flashing mesh.
function loftSail(parent,{
 height,width,direction,baseY=-.70,mastX=.04,
 colorInner,colorOuter,colorRidge
}){
 const rows=18,cols=3;
 const pts=[],colors=[],ids=[];
 const ci=new THREE.Color(colorInner),co=new THREE.Color(colorOuter),
       cr=new THREE.Color(colorRidge);
 function getPoint(u,v){
  const y=baseY+height*v;
  const spread=Math.pow(Math.max(.004,1-v),.88);
  const outer=direction*width*spread*(1+.065*Math.sin(Math.PI*v));
  const xx=mastX+outer*u+(u===0?0:direction*.025*Math.sin(Math.PI*v));
  const z=-.025+.34*Math.sin(Math.PI*u)*spread
       +.09*Math.sin(Math.PI*v)*(1-u)
       +(u===1?-.10*spread:0);
  return [xx,y,z];
 }
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const u=i/cols,v=j/rows;
  const [x,y,z]=getPoint(u,v);pts.push(x,y,z);
  const cc=ci.clone().lerp(co,u*.64).lerp(cr,Math.sin(Math.PI*u)*.17);
  // Lower and outer regions pick up richer ink for visual weight.
  cc.multiplyScalar(1-.085*(1-v)*u);
  colors.push(cc.r,cc.g,cc.b);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const n=j*(cols+1)+i;ids.push(n,n+1,n+cols+2,n,n+cols+2,n+cols+1);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(ids);geo.computeVertexNormals();
 const surface=new THREE.Mesh(geo,mat(0xffffff,{
  vertexColors:true,flatShading:false,roughness:.86,clearcoat:.06
 }));
 surface.castShadow=true;surface.receiveShadow=true;parent.add(surface);
 const pt=(u,v)=>{const a=getPoint(u,v);return V(...a)};
 // Raised creases, not drawn lines. Their slight Z-lift avoids surface flicker.
 for(const u of [0,.333,1]){
  let ps=[];for(let j=0;j<=rows;j++){
   const p=pt(u,j/rows);p.z+=.014;ps.push(p);
  }
  seam(parent,ps,u===1?(direction<0?0x759986:0xa87e62):0xfffcf0,u===1?.66:.82);
 }
 const accent=[pt(1,0),pt(.5,.07),pt(0,1)];for(const pt0 of accent)pt0.z+=.025;
 seam(parent,accent,0xffffff,.28);
 return surface;
}
loftSail(portSail,{
 height:3.22,width:1.63,direction:-1,
 colorInner:0xfff9e9,colorOuter:0x8ab39b,colorRidge:0xd9e6d5
});
loftSail(starboardSail,{
 height:2.53,width:1.14,direction:1,mastX:.12,baseY:-.71,
 colorInner:0xf8e8cc,colorOuter:0xb57e59,colorRidge:0xf1d1ac
});
// Thin paper folds near the foot of each sail tie it into the hull.
facet(portSail,[V(-.03,-.70,.08),V(-.81,-.71,.27),V(-1.30,-.70,-.13)],0xc7dbcb);
facet(starboardSail,[V(.12,-.72,.08),V(.75,-.70,.19),V(1.12,-.69,-.12)],0xe9cba9);
const vesselMaterials=[],vesselCreases=[];
boatGroup.traverse(o=>{
 if(o.isMesh&&o.material)vesselMaterials.push(o.material);
 if(o.isLine&&o.material)vesselCreases.push(o.material);
});

/* Continuous mirror-symmetric paper folding.
   The left/right corners share ONE exact isosceles triangle destination. */
function mapFold(x0,y0,p){
 // A single 3D sheet moves through the hinge, not an instant shape swap.
 const hinge=smooth(.575,.666,p),angle=Math.PI*hinge;
 const yy=y0<0?y0*Math.cos(angle):y0;
 // Give folded paper layers real separation in Z. This removes self-occlusion
 // and the depth-buffer "blinking" seen in the triangle's lower edge.
 let zz=(y0<0?y0*Math.sin(angle)+.066*hinge:-.024*hinge);
 const v=clamp(Math.abs(y0)/(H*.5),0,.995);
 const fold=x0<0?smooth(.658,.724,p):smooth(.689,.750,p);
 const xx=mix(x0,x0*(1-v),fold);
 zz+=.020*fold+.10*Math.sin(v*Math.PI)*(1-v)*fold;
 const pocket=smooth(.754,.834,p);
 zz+=pocket*(.16+.10*(1-v))*Math.sin(Math.PI*(x0/W+.5));
 return [xx,yy-pocket*.08,zz];
}
function updateSheet(p){
 const reveal=smooth(.552,.575,p);
 const tuck=smooth(.843,.885,p);
 const sheetFade=1-smooth(.858,.900,p);
 const {mesh,geo,original}=halves[0];
 const pos=geo.attributes.position,col=geo.attributes.color;
 const tone=smooth(.69,.83,p);
 for(let i=0;i<pos.count;i++){
  const a=i*3,x0=original[a],y0=original[a+1];
  const b=mapFold(x0,y0,p);
  // Do not collapse the triangle to a line during the vessel hand-off.
  const remap=[b[0]*.90,b[1]*.91-.16,b[2]+.21];
  pos.setXYZ(i,mix(b[0],remap[0],tuck),
    mix(b[1],remap[1],tuck),mix(b[2],remap[2],tuck));
  const q=x0<0?leftShade:rightShade;
  const blend=tone*.35;
  col.setXYZ(i,mix(neutral.r,q.r,blend),mix(neutral.g,q.g,blend),
    mix(neutral.b,q.b,blend));
 }
 pos.needsUpdate=true;col.needsUpdate=true;geo.computeVertexNormals();
 mesh.material.opacity=reveal*sheetFade;
 mesh.material.polygonOffset=true;
 mesh.material.polygonOffsetFactor=-1.2;
 mesh.material.polygonOffsetUnits=-1.2;
 mesh.visible=p>.551&&mesh.material.opacity>.003;
 // No giant empty rectangular "ghost frame" before the paper appears.
 outline.material.opacity=.23*smooth(.570,.582,p)*(1-smooth(.611,.637,p));
 outline.visible=p>.570&&p<.638;
 const sailTurn=smooth(.85,.99,p);
 sailGroup.rotation.set(mix(.016,-.08,sailTurn),
   mix(-.03,-.19,sailTurn),mix(-.012,.004,sailTurn));
 sailGroup.scale.setScalar(.92);

 const hull=smooth(.854,.925,p),
       port=smooth(.887,.955,p),
       star=smooth(.918,.982,p),
       depart=smooth(.946,1,p);
 boatGroup.visible=p>.852;
 hullGroup.scale.set(mix(.62,1,hull),mix(.20,1,hull),mix(.84,1,hull));
 // Pivoting sail panels around their creases—not inserting a final triangle.
 portSail.scale.x=Math.max(.002,Math.sin(port*Math.PI/2));
 portSail.rotation.y=mix(-1.42,-.04,port);
 portSail.rotation.z=mix(-.08,0,port);
 starboardSail.scale.x=Math.max(.002,Math.sin(star*Math.PI/2));
 starboardSail.rotation.y=mix(1.42,.06,star);
 starboardSail.rotation.z=mix(.09,0,star);
 boatGroup.position.set(.24*depart,-.14*depart,.27*(1-depart));
 boatGroup.rotation.y=-.06*depart;
 hullGroup.visible=hull>.002;
 portSail.visible=port>.002;starboardSail.visible=star>.002;
 // Separate sailor-shaped surfaces have smooth cross-fade from the paper.
 for(const m of vesselMaterials)m.opacity=hull;
 for(const m of vesselCreases)m.opacity=hull*.83;
}

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
  mesh,pw,ph,angle:theta,radius:1.0+rng()*3.3,orbit:.67+rng()*.30,
  order:rng(),x:-.55+rng()*7.5,y:-2.9+rng()*6.15,z:-1.6+rng()*2.9,
  phase:rng()*6.28,tilt:(rng()-.5)*.36,spin:(rng()-.5)*.95
 });
}
function updateVortex(p,t){
 const pull=smooth(.115,.315,p),shrink=smooth(.390,.510,p);
 const assemble=smooth(.440,.530,p);
 const mobile=innerWidth<670, time=reduce.matches?0:t*.00008;
 vortex.position.set(mobile?0:1.30,mobile?-.4:0,0);
 // First document will become the single sheet of the folding animation.
 const targetX=mobile?0:.50,targetY=mobile?-.34:-.19;
 for(let idx=0;idx<docs.length;idx++){
  const d=docs[idx],m=d.mesh;
  const angle=d.angle+(p-.12)*14*d.orbit+time;
  const radius=d.radius*(1-shrink*.87);
  let x=mix(d.x,Math.cos(angle)*radius*.83,pull);
  let y=mix(d.y,Math.sin(angle)*radius*.77,pull);
  let z=mix(d.z,Math.sin(angle*1.1+d.phase)*radius*.29,pull);
  let rotX=mix(d.tilt,Math.sin(angle)*.30,pull),
      rotY=mix(d.spin*.30,Math.cos(angle)*.37,pull),
      rotZ=mix(d.spin,angle*.12,pull);
  const focus=idx===0;
  // All secondary papers form an ordered swarm, then disappear BEFORE the
  // focused sheet enlarges. No translucent white pile-overlaps.
  if(focus){
   x=mix(x,targetX,assemble);y=mix(y,targetY,assemble);
   z=mix(z,0,assemble);
   rotX=mix(rotX,.016,assemble);
   rotY=mix(rotY,-.03,assemble);
   rotZ=mix(rotZ,-.012,assemble);
   m.scale.set(mix(.95,W/d.pw*.92,assemble),
     mix(.95,H/d.ph*.92,assemble),1);
   m.material.opacity=1-smooth(.537,.553,p);
   m.visible=p<.553;
  }else{
   x=mix(x,targetX+(.35+.75*d.order)*Math.cos(d.phase),assemble);
   y=mix(y,targetY+(.35+.75*d.order)*Math.sin(d.phase),assemble);
   z=mix(z,-.6-d.order*.35,assemble);
   m.scale.setScalar((.88+.19*d.order)*(1-.34*shrink));
   // Fully gone by 0.513, leaving the hero sheet alone.
   m.material.opacity=(1-smooth(.447,.513,p))*(.88+.12*d.order);
   m.visible=p<.514;
  }
  m.position.set(x,y,z);m.rotation.set(rotX,rotY,rotZ);
 }
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
 // At rest the sculpture floats with a barely perceptible paper-boat roll.
 const afloat=smooth(.954,1,p);
 boatGroup.rotation.z=reduce.matches?0:Math.sin(time*.63)*.011*afloat;
 boatGroup.position.y-=reduce.matches?0:Math.sin(time*.81)*.012*afloat;
 renderer.render(scene,camera);
 // Reveal WebGL only after its first real render (never display a blank canvas).
 if(!window.__origami3DReady){
  if(typeof window.__activateWebGL==="function")window.__activateWebGL();
  else{window.__natalia3d=true;window.__origami3DReady=true;}
 }
 window.__origami3DProgress=p;
}
try{
 resize();renderer.render(scene,camera);
 const initialPosition=clamp(-journey.getBoundingClientRect().top/Math.max(1,journey.offsetHeight-innerHeight));
 progress=initialPosition;
 const scrub={p:initialPosition};
 GS.to(scrub,{p:1,ease:"none",scrollTrigger:{
  trigger:journey,start:"top top",end:"bottom bottom",scrub:0.65,
  invalidateOnRefresh:true,onUpdate:()=>{}
 },onUpdate(){progress=scrub.p}});
 GS.ticker.add(tick);
 document.addEventListener("visibilitychange",()=>{active=!document.hidden;if(active)resize()});
 window.addEventListener("resize",resize,{passive:true});
 renderer.domElement.addEventListener("webglcontextlost",()=>{
  window.__origami3DReady=false;window.__natalia3d=false;
  document.documentElement.classList.remove("webgl-ready");
  target.style.display="none";
  window.__enableCanvasFallback?.("webgl-context-lost");
},{passive:true});
 window.__origami3DDiagnostics={engine:"Three.js WebGL",controller:"GSAP ScrollTrigger",sheetMeshes:halves.length,sheetVertices:halves.reduce((n,o)=>n+o.geo.attributes.position.count,0),vortexMeshes:docs.length,boatFacets:8,sailFacets:4,geometryVersion:"v5-symmetric"};
}catch(err){
 window.__origami3DReady=false;window.__natalia3d=false;
 target.style.display="none";
 window.__enableCanvasFallback?.("webgl-init-error");
 console.error("3D scene init failed; fallback to Canvas",err);
}
