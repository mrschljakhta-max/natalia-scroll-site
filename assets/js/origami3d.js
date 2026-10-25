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
 // No printed document frame: the paper itself is the only outline.
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

/* ONE REAL WEBGL SHEET throughout the entire story.
   The sheet starts as the selected document inside the vortex, unfolds
   through physical hinges, then its own vertices become the yacht.
   Three UV atlas patches share the same Mesh/material/texture; split
   seam vertices allow the two sail tips to have independent heights. */
const sailGroup=new THREE.Group();scene.add(sailGroup);
const buildPaperGeometry=()=>{
 const positions=[],uvs=[],indices=[],add=(u0,u1,v0,v1,nx,ny)=>{
  const first=positions.length/3;
  for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
   const u=mix(u0,u1,ix/nx),v=mix(v0,v1,iy/ny);
   positions.push(W*(u-.5),H*(v-.5),0);uvs.push(u,v);
  }
  for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
   const i=first+iy*(nx+1)+ix;
   indices.push(i,i+1,i+nx+2,i,i+nx+2,i+nx+1);
  }
 };
 add(0,1,0,.34,36,18);     // V-folded paper keel
 add(0,.5,.34,1,18,36);    // large sage sail
 add(.5,1,.34,1,18,36);    // smaller copper sail
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(positions.length),3));
 g.setIndex(indices);g.computeVertexNormals();return g;
};
const sheetGeo=buildPaperGeometry();
const sheetMat=new THREE.MeshPhysicalMaterial({
 map:textures[0],vertexColors:true,side:THREE.DoubleSide,
 roughness:.83,metalness:0,clearcoat:.06,clearcoatRoughness:.88,
 transparent:false,opacity:1,depthWrite:true,polygonOffset:true,
 polygonOffsetFactor:-.4,polygonOffsetUnits:-.4
});
// Original financial text softens while the same fibers fold into sails.
// Shader only blends the *ink*, never the sheet's geometry or transparency.
sheetMat.onBeforeCompile=(shader)=>{
 shader.uniforms.uInkToFiber={value:0};
 shader.fragmentShader=shader.fragmentShader.replace(
  'void main() {','uniform float uInkToFiber;\nvoid main() {');
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
  '#ifdef USE_MAP\nvec4 inkSample = texture2D(map,vMapUv);\ninkSample.rgb = mix(inkSample.rgb,vec3(1.0),uInkToFiber);\ndiffuseColor *= inkSample;\n#endif');
 sheetMat.userData.shader=shader;
};
const sheetMesh=new THREE.Mesh(sheetGeo,sheetMat);
sheetMesh.castShadow=true;sheetMesh.receiveShadow=true;sailGroup.add(sheetMesh);
const halves=[{mesh:sheetMesh,geo:sheetGeo,original:new Float32Array(sheetGeo.attributes.position.array)}];
const neutral=new THREE.Color('#f8f5e9');
const ivory=new THREE.Color('#f7f5e9');
const forest=new THREE.Color('#85ad97');
const jade=new THREE.Color('#e1eadd');
const sand=new THREE.Color('#d49f75');
const paleCopper=new THREE.Color('#f8e1c1');

// Slim physical crease details appear only when they exist on the same sail.
const boatDetail=new THREE.Group();sailGroup.add(boatDetail);
const detailMaterials=[];
const makeLine=(pts,color,alpha=1)=>{
 const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:alpha,depthTest:true,depthWrite:false});
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(
  pts.map(p=>new THREE.Vector3(...p))),material);
 boatDetail.add(line);detailMaterials.push({mat:material,initial:alpha});
 return line;
};
// Origami-mast is folded paper tubing, not a separate glossy metal pole.
const mastMaterial=new THREE.MeshStandardMaterial({color:0xc5d7c5,roughness:.88,side:THREE.DoubleSide});
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.024,.038,3.15,5,1),mastMaterial);
mast.position.set(.05,.79,.025);mast.castShadow=true;boatDetail.add(mast);
makeLine([[-1.91,-.82,.14],[0,-1.47,.75],[1.89,-.82,.14]],0xfdf9e9,.64);
makeLine([[-1.91,-.82,.14],[0,-.76,.58],[1.89,-.82,.14]],0x9eb4a0,.50);
makeLine([[-.02,-.67,.36],[-.69,-.67,.42],[-1.58,-.67,.16]],0xeaf5e5,.62);
makeLine([[.13,-.67,.33],[.56,-.67,.43],[1.25,-.67,.10]],0xfff0d9,.58);
// Scroll state can be inspected for QA without revealing implementation/UI internals.
const dev={sheetMesh,boatDetail};

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
