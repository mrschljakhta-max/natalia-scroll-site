/**
 * N / A — ORIGAMI 3D / Three.js + GSAP ScrollTrigger
 * All paper vertices are mapped from ONE planar sheet per left/right half.
 * No pre-rendered animation or 2D triangles; geometric fold axes and normals
 * are updated in WebGL and remain reversible with scroll.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import {createPaperMaterialMaps} from "./paper-materials.js?v=11-pbr-paper";
import {createCinematicFinale} from "./cinematic-finale.js?v=43-ripple-waves";

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
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute("aria-hidden","true");
target.appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xf4ead5,0x24483f,1.64);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffe6bf,2.65);
key.position.set(3.5,5.6,6.5);scene.add(key);
const fill=new THREE.DirectionalLight(0xa6d2c3,1.35);fill.position.set(-5,-2,3);scene.add(fill);
const rim=new THREE.PointLight(0xfac9a0,12,13);rim.position.set(-3,3.5,2);scene.add(rim);

/* The paper substrate is shared, while each document's printed marks vary.
   A single immutable fiber map survives the document-to-origami transformation. */
const paperMaps=createPaperMaterialMaps(THREE,renderer,{
 mobile:matchMedia("(max-width: 670px)").matches
});
/* Editorial financial sheets: restrained detail, ink hierarchy, generous white space. */
const paperTexture=(variant=0)=>{
 const c=document.createElement("canvas");c.width=512;c.height=704;
 const g=c.getContext("2d");g.drawImage(paperMaps.albedoCanvas,0,0,512,704);
 // A restrained edge wash preserves the actual shared pulp fibers.
 const vg=g.createLinearGradient(0,0,512,704);
 vg.addColorStop(0,"rgba(255,254,245,.045)");
 vg.addColorStop(.72,"rgba(250,251,239,.005)");
 vg.addColorStop(1,"rgba(180,191,174,.085)");
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
// Actual generated papers: policy, charts, handwritten review, handwritten
// summary. Procedural originals stay visible until the WebP files load.
const DOCUMENT_IMAGE_FILES=Object.freeze([
 "accounting-policy.webp",
 "financial-charts.webp",
 "handwritten-review.webp",
 "handwritten-summary.webp"
]);
const textures=[0,1,2,3].map(paperTexture);
const documentImageStatus={loaded:0,failed:0,source:"generated-originals"};

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
 normalMap:paperMaps.normal,normalScale:new THREE.Vector2(.12,.12),
 roughnessMap:paperMaps.roughness,
 roughness:.96,metalness:0,clearcoat:.006,clearcoatRoughness:.98,
 transparent:false,opacity:1,depthWrite:true,polygonOffset:true,
 polygonOffsetFactor:-.4,polygonOffsetUnits:-.4
});
// Only printed financial ink fades during folding; REAL fibrous stock stays.
// This preserves the albedo, tangent-space normal, roughness and single mesh.
sheetMat.onBeforeCompile=(shader)=>{
 shader.uniforms.uInkToFiber={value:0};
 shader.uniforms.uPaperFiberMap={value:paperMaps.fiber};
 shader.fragmentShader=shader.fragmentShader.replace(
  'void main() {','uniform float uInkToFiber;\nuniform sampler2D uPaperFiberMap;\nvoid main() {');
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
  '#ifdef USE_MAP\nvec4 inkSample = texture2D(map,vMapUv);\nvec4 paperSubstrate = texture2D(uPaperFiberMap,vMapUv);\ninkSample.rgb = mix(inkSample.rgb,paperSubstrate.rgb,uInkToFiber);\ndiffuseColor *= inkSample;\n#endif');
 sheetMat.userData.shader=shader;
};
const sheetMesh=new THREE.Mesh(sheetGeo,sheetMat);
sheetMesh.castShadow=true;sheetMesh.receiveShadow=true;sailGroup.add(sheetMesh);
const halves=[{mesh:sheetMesh,geo:sheetGeo,original:new Float32Array(sheetGeo.attributes.position.array)}];
const neutral=new THREE.Color('#ede9dd');
const ivory=new THREE.Color('#e9e6da');
const forest=new THREE.Color('#739b85');
const jade=new THREE.Color('#b9d0bf');
const sand=new THREE.Color('#c18b68');
const paleCopper=new THREE.Color('#e7c19c');
const keelColor=new THREE.Color('#b4b9ac');
const edgeShadow=new THREE.Color('#789486');

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

/* Vector-exact crease ribbons. Each path is sampled from the SAME animated
   geometry as the paper, so edges never float independently of the sheet.
   Plane ribbons have real width in WebGL (LineBasicMaterial ignores lineWidth).
   No outline is drawn during document / triangle folding. */
const creaseRibbons=[];
function ribbonPath({name,from,to,color,width=.014,alpha=.8,begin=.93,finish=.985,kind='sail'}){
 const segments=30,arr=new Float32Array((segments+1)*2*3),idx=[];
 for(let i=0;i<segments;i++){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(arr,3));
 geometry.setIndex(idx);
 const material=new THREE.MeshBasicMaterial({
  color,transparent:true,opacity:0,depthTest:true,depthWrite:false,
  side:THREE.DoubleSide,toneMapped:false
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.frustumCulled=false;mesh.renderOrder=4;mesh.visible=false;
 sailGroup.add(mesh);
 creaseRibbons.push({name,mesh,segments,from,to,width,alpha,begin,finish,kind});
}
ribbonPath({name:'port-silhouette',from:[0,.346],to:[0,1],color:0x557c6c,width:.017,alpha:.87,begin:.90,finish:.963});
ribbonPath({name:'port-mast-fold',from:[.5,.346],to:[.5,1],color:0x607e6d,width:.013,alpha:.73,begin:.90,finish:.963});
ribbonPath({name:'port-inner-crease',from:[.22,.35],to:[.385,.93],color:0x7f9f8a,width:.012,alpha:.56,begin:.925,finish:.982});
ribbonPath({name:'starboard-silhouette',from:[1,.346],to:[1,1],color:0xa9795d,width:.017,alpha:.87,begin:.936,finish:.996});
ribbonPath({name:'starboard-mast-fold',from:[.5,.346],to:[.5,1],color:0x95735c,width:.011,alpha:.68,begin:.936,finish:.996});
ribbonPath({name:'starboard-inner-crease',from:[.78,.35],to:[.64,.90],color:0xc19b7c,width:.011,alpha:.56,begin:.942,finish:.996});
ribbonPath({name:'hull-upper-lip',from:[0,.335],to:[1,.335],color:0x6f9180,width:.019,alpha:.89,begin:.861,finish:.944,kind:'hull'});
ribbonPath({name:'hull-keel',from:[0,0],to:[1,0],color:0x89998d,width:.020,alpha:.82,begin:.866,finish:.941,kind:'hull'});
ribbonPath({name:'hull-central-fold',from:[.5,0],to:[.5,.335],color:0xb1a087,width:.012,alpha:.67,begin:.865,finish:.952,kind:'hull'});
ribbonPath({name:'hull-fold-left',from:[0,.12],to:[.5,.335],color:0x9aad9b,width:.012,alpha:.64,begin:.868,finish:.944,kind:'hull'});
ribbonPath({name:'hull-fold-right',from:[.5,.335],to:[1,.12],color:0xbda484,width:.012,alpha:.61,begin:.868,finish:.944,kind:'hull'});

/* Low-amplitude cinematic air-flex. It naturally fades BEFORE the hinge
   mechanics begin: no interference with physical folds or final boat shape. */
function paperFlex(u,v,p,time=0){
 const relax=1-smooth(.53,.645,p);
 if(relax<=0)return 0;
 const phase=reduce.matches?0:time*.56;
 const edge=Math.pow(Math.abs(2*u-1),2);
 return relax*(.016*Math.sin(v*7.8+phase)*(.24+.76*edge)
   +.009*Math.sin(u*6.4+v*3.9-phase*.73));
}
/* The selected document uses the SAME soft wind response as the other
   sheets, but is computed on the existing uninterrupted folding geometry.
   Every paper edge samples this same warp; it fades out before first hinge. */
function heroVortexWarp(u,v,p,time=0){
 // Hero = the SAME actual sheet that becomes the boat. A clearly visible
 // corner fold responds to wind, then unfolds before the origami handoff.
 const ambient=.74*(1-smooth(.35,.520,p));
 const gust=.20*smooth(.105,.22,p)*(1-smooth(.365,.485,p));
 const force=reduce.matches?0:ambient+gust;
 if(force<.00001)return [0,0,0];
 const x=W*(u-.5),z0=0;
 const twist=.43*force*(v-.5)*(.87+.13*Math.sin(time*.67+u*2));
 const twistX=x*(Math.cos(twist)-1);
 const twistZ=x*Math.sin(twist);
 // Top right corner folds on a slanted line, with a real XY silhouette
 // change, instead of only making an imperceptible Z displacement.
 const slope=.42;
 const nX=1/W,nY=slope/H,normalLength=Math.hypot(nX,nY);
 const signed=((u-.64)+slope*(v-.55))/normalLength;
 let dx=twistX,dy=0,dz=twistZ;
 if(signed>0){
  const foldAngle=.98*force*(.86+.14*Math.sin(time*.9+.8))*
    smooth(0,.11,signed);
  const retreat=signed*(1-Math.cos(foldAngle));
  dx-=retreat*nX/normalLength;
  dy-=retreat*nY/normalLength;
  dz+=signed*Math.sin(foldAngle);
 }
 const edge=Math.abs(u-.5)*2;
 dz+=force*.085*Math.pow(edge,2.15)*
   (.73+.27*Math.sin(time*.71+v*4));
 return [dx,dy,dz];
}
function positionFromUV(u,v,p,time=0){
 const x0=W*(u-.5),y0=H*(v-.5),folded=foldPoint(x0,y0,p),
       final=yachtPoint(x0,y0),morph=v<.34-.00001?smooth(.851,.925,p):
         u<=.5?smooth(.887,.961,p):smooth(.921,.998,p);
 const wind=heroVortexWarp(u,v,p,time);
 return [mix(folded[0],final[0],morph)+wind[0],
   mix(folded[1],final[1],morph)+wind[1],
   mix(folded[2],final[2],morph)+paperFlex(u,v,p,time)+wind[2]];
}
/* Physical paper edge strips. These are SIDE WALLS of the same deforming
   sheet, not a second sheet or a cross-faded boat model. Each strip follows
   the exact current UV surface, and avoids the intentionally split keel/sail
   boundary at v=.34 where those panels acquire independent boat positions.
   Sidewall thickness in scene units: .014 of 3.55-wide hero sheet. */
const edgeStock=[
 {name:"keel-bottom",from:[0,0],to:[1,0],inside:[0,.008],tint:0xb7af9e},
 {name:"keel-left",from:[0,0],to:[0,.335],inside:[.008,0],tint:0xaaa894},
 {name:"keel-right",from:[1,0],to:[1,.335],inside:[-.008,0],tint:0xbda78c},
 {name:"sage-left",from:[0,.346],to:[0,1],inside:[.008,0],tint:0x9fae9c},
 {name:"copper-right",from:[1,.346],to:[1,1],inside:[-.008,0],tint:0xb99b80},
 {name:"sage-top",from:[0,1],to:[.497,1],inside:[0,-.008],tint:0xa6b3a2},
 {name:"copper-top",from:[.503,1],to:[1,1],inside:[0,-.008],tint:0xb7a18c}
];
const paperEdges=edgeStock.map(spec=>{
 const segments=26,positions=new Float32Array((segments+1)*2*3),colors=new Float32Array(positions.length);
 const indices=[];
 for(let i=0;i<segments;i++){
  const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
 geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
 geo.setIndex(indices);
 const base=new THREE.Color(spec.tint);
 const top=base.clone().lerp(new THREE.Color(0xf1eee3),.39);
 const bottom=base.clone().multiplyScalar(.77);
 for(let i=0;i<=segments;i++){
  geo.attributes.color.setXYZ(i*2,top.r,top.g,top.b);
  geo.attributes.color.setXYZ(i*2+1,bottom.r,bottom.g,bottom.b);
 }
 const material=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.97,metalness:0,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,material);
 mesh.frustumCulled=false;
 mesh.renderOrder=2;
 sailGroup.add(mesh);
 return {...spec,segments,geo,mesh};
});
const edgeTangent=new THREE.Vector3(),edgeInward=new THREE.Vector3(),
 edgeNormal=new THREE.Vector3(),edgeVecA=new THREE.Vector3(),
 edgeVecB=new THREE.Vector3();
function updatePaperEdges(p,time){
 for(const r of paperEdges){
  const pos=r.geo.attributes.position;
  for(let i=0;i<=r.segments;i++){
   const u=i/r.segments;
   const uvX=mix(r.from[0],r.to[0],u);
   const uvY=mix(r.from[1],r.to[1],u);
   const pt=positionFromUV(uvX,uvY,p,time);
   const tangentStart=Math.max(0,u-.008);
   const tangentEnd=Math.min(1,u+.008);
   const a=positionFromUV(
     mix(r.from[0],r.to[0],tangentStart),
     mix(r.from[1],r.to[1],tangentStart),p,time);
   const b=positionFromUV(
     mix(r.from[0],r.to[0],tangentEnd),
     mix(r.from[1],r.to[1],tangentEnd),p,time);
   const inner=positionFromUV(
     clamp(uvX+r.inside[0]),clamp(uvY+r.inside[1]),p,time);
   edgeVecA.set(...a);edgeVecB.set(...b);
   edgeTangent.subVectors(edgeVecB,edgeVecA).normalize();
   edgeInward.set(inner[0]-pt[0],inner[1]-pt[1],inner[2]-pt[2]).normalize();
   edgeNormal.crossVectors(edgeTangent,edgeInward).normalize();
   // Winding is consistent over the original flat sheet, and this local
   // orientation tracks the surface as real hinges fold it in 3D.
   if(r.name==="keel-left"||r.name==="sage-left"||r.name==="sage-top"||
      r.name==="copper-top")edgeNormal.negate();
   const thickness=.014;
   pos.setXYZ(i*2,pt[0]+edgeNormal.x*.0025,
     pt[1]+edgeNormal.y*.0025,pt[2]+edgeNormal.z*.0025);
   pos.setXYZ(i*2+1,pt[0]-edgeNormal.x*thickness,
     pt[1]-edgeNormal.y*thickness,pt[2]-edgeNormal.z*thickness);
  }
  pos.needsUpdate=true;
  r.geo.computeVertexNormals();
  // Never allow stale bounds to cull dynamically deforming edge strips.
 }
}

function updateRibbons(p){
 for(const r of creaseRibbons){
  const a=smooth(r.begin,r.finish,p);
  r.mesh.visible=a>.006;
  if(!r.mesh.visible)continue;
  r.mesh.material.opacity=r.alpha*a;
  const attr=r.mesh.geometry.attributes.position;
  for(let i=0;i<=r.segments;i++){
   const t=i/r.segments,ta=Math.max(0,(i-.35)/r.segments),
     tb=Math.min(1,(i+.35)/r.segments);
   const point=(tt)=>positionFromUV(mix(r.from[0],r.to[0],tt),mix(r.from[1],r.to[1],tt),p);
   const pt=point(t),before=point(ta),after=point(tb);
   const dx=after[0]-before[0],dy=after[1]-before[1],l=Math.hypot(dx,dy)||1;
   // Lift the ink slightly toward the camera above the physical face.
   const lift=.038+(r.kind==='hull'?.012:0);
   const ex=-dy/l*r.width*.5,ey=dx/l*r.width*.5;
   attr.setXYZ(i*2,pt[0]+ex,pt[1]+ey,pt[2]+lift);
   attr.setXYZ(i*2+1,pt[0]-ex,pt[1]-ey,pt[2]+lift);
  }
  attr.needsUpdate=true;
 }
}
// Diffuse contact shadow over the sea, kept separate from folding geometry.
const shadowCanvas=document.createElement('canvas');
shadowCanvas.width=128;shadowCanvas.height=128;
const sc=shadowCanvas.getContext('2d');
const radial=sc.createRadialGradient(64,64,4,64,64,64);
radial.addColorStop(0,'rgba(19,55,52,.39)');
radial.addColorStop(.48,'rgba(23,60,54,.20)');
radial.addColorStop(1,'rgba(23,60,54,0)');
sc.fillStyle=radial;sc.fillRect(0,0,128,128);
const contactShadow=new THREE.Sprite(new THREE.SpriteMaterial({
 map:new THREE.CanvasTexture(shadowCanvas),color:0x355b52,
 transparent:true,opacity:0,depthWrite:false,depthTest:false
}));
contactShadow.scale.set(4.5,.68,1);
contactShadow.position.set(.04,-1.80,-.6);
contactShadow.renderOrder=1;
sailGroup.add(contactShadow);
/* A soft, lens-side photographic selection glow follows the SAME sheet.
   This is not duplicate geometry, and vanishes before folding. */
const haloCanvas=document.createElement("canvas");
haloCanvas.width=128;haloCanvas.height=128;
const hc=haloCanvas.getContext("2d");
const hg=hc.createRadialGradient(64,64,2,64,64,64);
hg.addColorStop(0,"rgba(255,246,217,.66)");
hg.addColorStop(.34,"rgba(248,232,202,.26)");
hg.addColorStop(1,"rgba(245,222,185,0)");
hc.fillStyle=hg;hc.fillRect(0,0,128,128);
const heroHalo=new THREE.Sprite(new THREE.SpriteMaterial({
 map:new THREE.CanvasTexture(haloCanvas),color:0xfff0d7,
 transparent:true,opacity:0,depthTest:true,depthWrite:false
}));
heroHalo.scale.set(5.1,6.9,1);
heroHalo.position.set(0,0,-.33);
heroHalo.visible=false;
sailGroup.add(heroHalo);


/* Continuous mirror-symmetric paper folding.
   The left/right corners share ONE exact isosceles triangle destination. */
/* Transform points around REAL 3D hinge axes. Every rotation can run forwards
   and backwards with scrolling; no opacity cut between folded forms. */
function hinge3D(point,ax,ay,az,bx,by,bz,angle){
 const ux=bx-ax,uy=by-ay,uz=bz-az,len=Math.hypot(ux,uy,uz)||1,
   vx=ux/len,vy=uy/len,vz=uz/len;
 const x=point[0]-ax,y=point[1]-ay,z=point[2]-az,
   c=Math.cos(angle),si=Math.sin(angle),
   dot=x*vx+y*vy+z*vz,crossX=vy*z-vz*y,
   crossY=vz*x-vx*z,crossZ=vx*y-vy*x;
 return [ax+x*c+crossX*si+vx*dot*(1-c),
         ay+y*c+crossY*si+vy*dot*(1-c),
         az+z*c+crossZ*si+vz*dot*(1-c)];
}
function foldPoint(x0,y0,p){
 const first=smooth(.563,.657,p);
 const angle=Math.PI*first;
 // First exact hinge along y=0; no brightness/opacity change.
 let P=[x0,y0<0?y0*Math.cos(angle):y0,
    y0<0?y0*Math.sin(angle)+.061*first:-.027*first];
 const b=H/2,a=W/2;
 // Two genuine diagonal crease hinges fold the left and right top corners.
 const left=smooth(.658,.732,p),right=smooth(.688,.757,p);
 const lineX=-a+(a/b)*Math.max(0,y0);
 if(y0>0&&x0<lineX){
  P=hinge3D(P,-a,0,0,0,b,0,-Math.PI*.94*left);
  P[2]+=.016*left; // paper thickness between overlapping triangular panels
 }
 if(y0>0&&x0>-lineX){
  P=hinge3D(P,a,0,0,0,b,0,Math.PI*.94*right);
  P[2]+=.042*right;
 }
 // Lock the corners into an exact isosceles triangle, keeping the movement
 // in the vertices rather than replacing or fading a separate shape.
 const settle=smooth(.739,.797,p);
 const v=clamp(Math.abs(y0)/b,0,.996);
 const target=[x0*(1-v),Math.abs(y0)-.055,
    (x0<0?.047:-.036)+.06*Math.sin(Math.PI*v)];
 P[0]=mix(P[0],target[0],settle);
 P[1]=mix(P[1],target[1],settle);
 P[2]=mix(P[2],target[2],settle);
 // Third physical hinge: fold the upper remaining paper lip towards the
 // interior. This stage is visible, not another triangle shape swap.
 const lip=smooth(.800,.853,p);
 if(y0<-(H*.37)){
  const pivotY=b*.73;
  P=hinge3D(P,-a,pivotY,.04,a,pivotY,.04,Math.PI*.68*lip);
 }
 // Final triangular pocket opens toward the viewer before the vessel rises.
 const pocket=smooth(.837,.901,p);
 P[2]+=.19*pocket*Math.sin(Math.PI*(x0/W+.5));
 P[1]-=.065*pocket;
 return P;
}
/* An elegant volumetric origami yacht formed by the very same sheet mesh.
   Patch boundaries duplicate coincident crease vertices, not entire objects.
   They can therefore rise independently without introducing a second sheet. */
function yachtPoint(x0,y0){
 const u=clamp(x0/W+.5),v=clamp(y0/H+.5);
 if(v<=.34+.00001){
  const h=clamp(v/.34),long=2*u-1;
  const width=(.68+.32*h)*(1-.09*Math.pow(Math.abs(long),6));
  return [long*2.13*width,
   -.73-.77*(1-h)*(1-.12*Math.pow(Math.abs(long),3)),
   .15+.59*(1-h)*(1-long*long)+.21*h*Math.sin(Math.PI*u)];
 }
 const height=(v-.34)/.66;
 const taper=Math.pow(Math.max(.003,1-height),.91);
 if(u<=.5){
  const side=(.5-u)*2;
  return [-.045-1.76*side*taper*(1+.045*Math.sin(Math.PI*height)),
   -.69+3.24*height,
   .11+.42*Math.sin(side*Math.PI)*taper+.12*Math.sin(height*Math.PI)];
 }
 const side=(u-.5)*2;
 return [.115+1.19*side*taper*(1+.025*Math.sin(Math.PI*height)),
  -.70+2.54*height,
  -.015+.31*Math.sin(side*Math.PI)*taper+.11*Math.sin(height*Math.PI)];
}
// Screenshot-approved cinematic shape: retain the smaller folded-paper hull,
// tall sage sail and short copper sail once the third chapter completes.
// Crucially, do NOT keep morphing toward yachtPoint() at scroll progress 1;
// that late morph produced the oversized, flat-looking "primitive" silhouette.
const FINAL_YACHT_POSE_PROGRESS=.965;
const yachtPoseProgress=p=>Math.min(p,FINAL_YACHT_POSE_PROGRESS);
let selectedPaperPose=null;
function updateSheet(p,time){
 // Physical geometry/colour/creases share ONE capped pose clock.
 // Stage transitions, scroll reversal, sea and resting bob use real p.
 const poseP=yachtPoseProgress(p);
 const {mesh,geo,original}=halves[0],pos=geo.attributes.position,col=geo.attributes.color;
 // Individual sculpting phases. The hull opens before either sail;
 // then large sail rotates out, followed by the smaller sail.
 const hull=smooth(.851,.925,poseP);
 const port=smooth(.887,.961,poseP);
 const starboard=smooth(.921,.998,poseP);
 const ink=smooth(.834,.974,poseP);
 // Ambient fold occlusion: darken actual hinge neighborhoods while in motion,
 // fade out before the boat's dedicated sculptural shading takes over.
 const foldOcclusion=1-smooth(.82,.93,poseP);
 const midFold=smooth(.565,.624,p)*foldOcclusion;
 const leftFold=smooth(.663,.718,p)*foldOcclusion;
 const rightFold=smooth(.694,.746,p)*foldOcclusion;
 if(sheetMat.userData.shader)sheetMat.userData.shader.uniforms.uInkToFiber.value=ink;
 for(let i=0;i<pos.count;i++){
  const index=i*3,x0=original[index],y0=original[index+1],
        uvx=clamp(x0/W+.5),uvy=clamp(y0/H+.5);
  const folded=foldPoint(x0,y0,poseP);
  const final=yachtPoint(x0,y0);
  const morph=uvy<.34-.00001?hull:uvx<=.5?port:starboard;
  const wind=heroVortexWarp(uvx,uvy,poseP,time);
  const x=mix(folded[0],final[0],morph)+wind[0],
        y=mix(folded[1],final[1],morph)+wind[1],
        z=mix(folded[2],final[2],morph)+paperFlex(uvx,uvy,poseP,time)+wind[2];
  pos.setXYZ(i,x,y,z);
  let c=neutral.clone();
  if(uvy<.34){
   // Under-rim occlusion, keel gradient, and split sage/copper hull facets.
   c.lerp(uvx<.5?jade:paleCopper,hull*.94);
   const keelDepth=1-clamp(uvy/.24);
   const foldedLip=1-clamp(Math.abs(uvy-.34)/.065);
   c.lerp(keelColor,hull*.24*keelDepth);
   c.multiplyScalar(1-hull*(.17*keelDepth+.075*foldedLip));
  }else if(uvx<=.5){
   // Large port sail: ivory inner face and deeper sage outer paper panel.
   c.lerp(jade,port*.62);
   c.lerp(forest,port*(.11+.53*(.5-uvx)*2));
   const foldShadow=1-clamp(Math.abs(uvx-.245)/.065);
   c.lerp(edgeShadow,foldShadow*port*.20);
  }else{
   // Starboard sail: distinctly warm copper, without flat white glare.
   c.lerp(paleCopper,starboard*.66);
   c.lerp(sand,starboard*(.17+.49*(uvx-.5)*2));
   const foldShadow=1-clamp(Math.abs(uvx-.77)/.065);
   c.multiplyScalar(1-starboard*.13*foldShadow);
  }
  // Fine pressure-darkened fold lines remain part of the SAME vertex color
  // field; no decals/second flat planes that could float during animation.
  if(foldOcclusion>.002){
   const mid=Math.exp(-Math.pow(y0/.105,2))*midFold;
   const lineX=-W/2+(W/H)*Math.max(0,y0);
   const dl=y0>0?Math.exp(-Math.pow((x0-lineX)/.13,2))*leftFold:0;
   const dr=y0>0?Math.exp(-Math.pow((x0+lineX)/.13,2))*rightFold:0;
   c.multiplyScalar(1-Math.min(.145,.082*mid+.089*dl+.083*dr));
  }
  col.setXYZ(i,c.r,c.g,c.b);
 }
 pos.needsUpdate=true;col.needsUpdate=true;
 geo.computeVertexNormals();geo.computeBoundingSphere();
 // Preserve the ORIGINAL continuous-sheet yacht at full scroll progress.
 // No substitute object, sprite, or photograph obscures its paper facets.
 if(sheetMat.transparent){
  sheetMat.transparent=false;
  sheetMat.depthWrite=true;
  sheetMat.needsUpdate=true;
 }
 mesh.visible=true;
 mesh.material.opacity=1;
 const mobile=width<670;
 const doc=docs[0];
 const pose=selectedPaperPose||{x:0,y:0,z:0,rx:0,ry:0,rz:0};
 const align=smooth(.448,.554,p);
 const settledX=mobile?0:1.8,settledY=mobile?-.74:-.19;
 sailGroup.position.set(
  mix(vortex.position.x+pose.x,settledX,align),
  mix(vortex.position.y+pose.y,settledY,align),
  mix(pose.z,0,align));
 const startScale=.94*doc.pw/W;
 const fullScale=.92;
 const heroFocus=smooth(.25,.385,p)*(1-smooth(.433,.559,p));
 // Lens push-in: still the original paper material/geometry and timeline.
 const targetScale=mix(startScale,fullScale,align)*(1+.16*heroFocus);
 sailGroup.scale.setScalar(targetScale);
 sailGroup.position.z+=.58*heroFocus;
 heroHalo.visible=heroFocus>.007;
 heroHalo.material.opacity=.19*heroFocus;
 sailGroup.rotation.set(
  mix(pose.rx,.016,align)+mix(0,-.09,smooth(.89,1,p)),
  mix(pose.ry,-.03,align)+mix(0,-.18,smooth(.90,1,p)),
  mix(pose.rz,-.012,align));
 const details=smooth(.888,.973,poseP);
 boatDetail.visible=details>.002;
 mast.scale.y=Math.max(.002,details);
 mast.position.y=-.71+1.575*details;
 detailMaterials.forEach(({mat,initial})=>mat.opacity=initial*details);
 updatePaperEdges(poseP,time);
 updateRibbons(poseP);
 // Keep crease ribbons on the original sail geometry.
 for(const edge of paperEdges)edge.mesh.visible=true;
 const seaContact=smooth(.951,.996,p);
 contactShadow.visible=seaContact>.008;
 contactShadow.material.opacity=.54*seaContact;
 contactShadow.position.y=-1.83+(reduce.matches?0:Math.sin(time*.79)*.012*seaContact);
 boatDetail.rotation.z=reduce.matches?0:Math.sin(time*.72)*.007*smooth(.973,1,p);
 boatDetail.position.y=reduce.matches?0:Math.sin(time*.79)*.014*smooth(.978,1,p);
}

/* Curated 3D documents — no ribbons, stretched paper, duplicate surfaces
   or extreme edge-on rotations over the hero headline. */
const vortex=new THREE.Group();scene.add(vortex);
const docs=[];
let seed=1317;
function rng(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
const VORTEX_COUNT=25,GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));
for(let i=0;i<VORTEX_COUNT;i++){
 const pw=.80+rng()*.31,ph=pw*1.36;
 // Subdivided real sheet, not a flat billboard: enough vertices for mild air flutter.
 const isCompact=matchMedia("(max-width: 670px)").matches;
 const g=new THREE.PlaneGeometry(pw,ph,isCompact?12:18,isCompact?16:24);
 const a=g.attributes.position;
 const bend=.007+rng()*.017;
 for(let j=0;j<a.count;j++){
  const x=a.getX(j),y=a.getY(j);
  const u=x/pw+.5,v=y/ph+.5;
  const mainBend=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*bend;
  const cornerLift=i%3===1
   ? .018*Math.pow(u,3)*Math.sin(v*Math.PI*.78)
   : i%3===2?.014*Math.sin(v*Math.PI*1.3)*(2*u-1):0;
  a.setZ(j,mainBend+cornerLift);
 }
 g.computeVertexNormals();
 // A narrow soft band on the actual crease receives its own vertex shading.
 // This affects PRINT and charts too; no extra fake crease stickers.
 const vertexTone=new Float32Array(a.count*3);
 vertexTone.fill(1);
 g.setAttribute("color",new THREE.BufferAttribute(vertexTone,3));
 const baseShape=new Float32Array(a.array);
 const material=new THREE.MeshStandardMaterial({
  map:textures[i%textures.length],side:THREE.DoubleSide,
  normalMap:paperMaps.normal,normalScale:new THREE.Vector2(.085,.085),
  roughnessMap:paperMaps.roughness,
  roughness:.96,metalness:0,vertexColors:true,
  transparent:true,opacity:1,depthWrite:true
 });
 const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;vortex.add(mesh);
 const theta=rng()*Math.PI*2;
 // Golden-angle staging produces layered editorial depth without a grid.
 // Positions are biased to the RIGHT so the headline remains clear.
 const layer=i%3,spiral=i*GOLDEN_ANGLE+.22;
 const radius=Math.sqrt(i/(VORTEX_COUNT-1));
 const initialX=i===0?2.7:2.78+Math.cos(spiral)*(.55+3.25*radius)+(rng()-.5)*.36;
 const initialY=i===0?.25:.12+Math.sin(spiral)*(.40+2.85*radius)+(rng()-.5)*.32;
 const initialZ=i===0?.85:(layer===0?-2.72:layer===1?.05:2.16)+(rng()-.5)*.75;
 material.color.setHex(layer===0?0xe5ede6:layer===2?0xfff6e8:0xffffff);
 docs.push({
  mesh,pw,ph,baseShape,shape:i%3,textureIndex:i%DOCUMENT_IMAGE_FILES.length,
  layer,focusTint:layer===0?.82:layer===1?.93:1,
  angle:theta,radius:1.0+rng()*3.2,orbit:.64+rng()*.34,
  order:rng(),x:initialX,y:initialY,z:initialZ,
  phase:rng()*6.28,tilt:(rng()-.5)*.36,spin:(rng()-.5)*.95,
  drift:rng()*Math.PI*2,tempo:.62+rng()*.90,
  // Seeded individual aerodynamic response: no Math.random per frame.
  stiffness:.56+rng()*.33,
  twistStrength:.65+rng()*.32,
  curlStrength:.12+rng()*.08,
  creaseStrength:1.22+rng()*.34,
  foldMode:i%4,
  creaseShift:(rng()-.5)*.26,
  creaseSlope:(rng()-.5)*1.25,
  dragBias:rng()*2-1,
  foldDirection:rng()<.5?-1:1,
  creasePhase:rng()*Math.PI*2
 });
}
/* Swap to the exact four image-generated paper scans after image decoding.
   One same hero mesh remains: printed marks dissolve to the PBR fiber map. */
const documentTextureLoader=new THREE.TextureLoader();
DOCUMENT_IMAGE_FILES.forEach((filename,index)=>{
 const url=new URL("../images/documents/"+filename,import.meta.url).href;
 documentTextureLoader.load(url,(loaded)=>{
  loaded.colorSpace=THREE.SRGBColorSpace;
  loaded.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  textures[index]=loaded;
  if(index===0){
   sheetMat.map=loaded;
   sheetMat.needsUpdate=true;
  }
  for(const doc of docs){
   if(doc.textureIndex!==index)continue;
   doc.mesh.material.map=loaded;
   doc.mesh.material.needsUpdate=true;
  }
  documentImageStatus.loaded++;
 },undefined,()=>{
  documentImageStatus.failed++;
  console.warn("Using generated-paper fallback:",filename);
 });
});
/* The camera follows one master page while supporting pages recede:
   three depth tiers, soft orbit banking and time-subtle drift. All scroll
   positions stay reversible and no additional master paper is rendered. */

/* VORTEX PAPER MICRO-PHYSICS — an inexpensive, deterministic elastic-sheet
   approximation. Paper is still a single, textured, double-sided mesh per
   document. Each vertex is recomputed FROM its immutable base coordinates,
   not from last frame: no accumulated drift, shear or irreversible bending.

   1) axial twist: a real rotation of each row about the long axis (X and Z);
   2) drag curl: edges and corners are drawn back by the moving air;
   3) transient fold impulse: a brief crease across the grain, then release.
   The active force is scroll-controlled and fades before page selection. */
const paperPhysicsStats={active:0,peakDisplacement:0};
function deformVortexPaper(d,p,timeMs,orbitSpeed=1){
 const m=d.mesh,geo=m.geometry;
 const pos=geo.attributes.position,colors=geo.attributes.color,base=d.baseShape;
 // The first frame used to receive only 0.16 wind — effectively invisible.
 // Paper now has a legible resting curl, then visibly folds in the vortex.
 // Zero deformation BEFORE the origami handoff at p=.53.
 const ambient=.79*(1-smooth(.375,.505,p));
 const storm=.50*smooth(.085,.22,p)*(1-smooth(.35,.485,p));
 const force=reduce.matches?0:Math.min(1.32,ambient+storm);
 const t=timeMs*.001;
 if(force<.0001){
  if(d.physicsDirty){
   pos.array.set(base);
   for(let k=0;k<colors.array.length;k++)colors.array[k]=1;
   pos.needsUpdate=true;colors.needsUpdate=true;
   geo.computeVertexNormals();
   d.physicsDirty=false;
  }
  return;
 }
 const flex=Math.min(1.08,force*(.90-.28*d.stiffness)*
   (.94+.12*Math.min(1.8,Math.abs(orbitSpeed))));
 const phase=t*(.64+d.tempo*.2)+d.creasePhase;
 const pulse=.78+.22*Math.sin(phase);
 const spin=t*(.52+d.tempo*.21)+d.phase;
 const wave=t*(.70+d.tempo*.23)+d.drift;
 const mode=d.foldMode;
 // Distances use real local sheet dimensions: the fold is a geometric
 // ROTATION of a paper flap around an oblique line on the sheet.
 const slope=d.creaseSlope;
 const nx0=1/d.pw,ny0=-slope/d.ph,norm=Math.hypot(nx0,ny0);
 const nx=nx0/norm,ny=ny0/norm;
 const creaseAngle=Math.min(1.23,flex*d.creaseStrength*
   (mode===0?.47:mode===2?.88:1.15)*pulse);
 let peak=0;
 for(let j=0;j<pos.count;j++){
  const k=j*3,x=base[k],y=base[k+1],z0=base[k+2];
  const u=x/d.pw+.5,v=y/d.ph+.5;
  const edge=Math.abs(2*u-1),tip=Math.abs(2*v-1);
  // Distributed twisting around a long axis. Unlike shifting only Z, X
  // contracts too — viewers SEE curved edges and asymmetric silhouettes.
  const twist=flex*d.twistStrength*(v-.5)*
    (.84+.16*Math.sin(spin+u*2.0));
  let xx=x*Math.cos(twist)-z0*Math.sin(twist);
  let zz=z0*Math.cos(twist)+x*Math.sin(twist);
  let yy=y;
  // Corner fold: rotate real paper coordinates around the crease. Different
  // sheets roll, twist, fold a flap, or fold a different corner.
  const signed=d.foldDirection*((u-.5)-d.creaseShift-slope*(v-.5))/norm;
  if(signed>0){
   const foldAmount=smooth(0,.075,signed);
   const a=creaseAngle*foldAmount;
   const retreat=signed*(1-Math.cos(a));
   xx-=d.foldDirection*nx*retreat;
   yy-=d.foldDirection*ny*retreat;
   zz+=signed*Math.sin(a)*(mode===2?-1:1);
  }
  // Curled free edges and corner tension independent of the main fold.
  zz+=flex*d.curlStrength*Math.pow(edge,2.1)*
     (.73+.27*Math.sin(wave+v*2.4+d.dragBias));
  zz+=flex*d.curlStrength*.55*Math.pow(tip*edge,1.75)*
     Math.sin(wave*.73+u*3.1);
  const bend=(v-.5)*(u-.5);
  yy+=flex*.034*bend*Math.sin(wave*.77);
  pos.setXYZ(j,xx,yy,zz);
  // Physical contact shading follows the crease and dims its turned flap,
  // making shape change readable even with subdued editorial lighting.
  const seam=Math.exp(-Math.pow(signed/.061,2));
  const shade=1-(.25*seam+.11*smooth(.02,.20,signed))*
    Math.min(1.0,flex*1.23)*(mode===0?.6:1);
  colors.setXYZ(j,shade,shade*.994,shade*.978);
  peak=Math.max(peak,Math.abs(xx-x),Math.abs(yy-y),Math.abs(zz-z0));
 }
 pos.needsUpdate=true;colors.needsUpdate=true;
 geo.computeVertexNormals();
 d.physicsDirty=true;
 paperPhysicsStats.active++;
 paperPhysicsStats.peakDisplacement=Math.max(paperPhysicsStats.peakDisplacement,peak);
}

function updateVortex(p,t){
 const pull=smooth(.115,.315,p),shrink=smooth(.390,.510,p);
 const assemble=smooth(.440,.530,p),focus=smooth(.265,.405,p);
 const mobile=width<670,baseTime=reduce.matches?0:t*.00008;
 const breath=reduce.matches?0:t*.00024;
 vortex.position.set(mobile?0:1.25,mobile?-.44:0,0);
 const targetX=mobile?.12:.55,targetY=mobile?-.36:-.19;
 paperPhysicsStats.active=0;
 paperPhysicsStats.peakDisplacement=0;
 for(let idx=0;idx<docs.length;idx++){
  const d=docs[idx],m=d.mesh,angle=d.angle+(p-.12)*14*d.orbit+baseTime*d.tempo;
  const radius=d.radius*(1-shrink*.87);
  const driftX=Math.sin(breath*d.tempo+d.drift)*.11;
  const driftY=Math.cos(breath*.77+d.phase)*.095;
  const stageX=mobile?d.x*.44-.33:d.x;
  const stageY=mobile?d.y*.62-.35:d.y;
  const depth=mobile?d.z*.48:d.z;
  let x=mix(stageX+driftX,Math.cos(angle)*radius*.83,pull),
      y=mix(stageY+driftY,Math.sin(angle)*radius*.77,pull),
      z=mix(depth,Math.sin(angle*1.1+d.phase)*radius*.28+d.layer*1.17-1.17,pull);
  const bank=Math.sin(angle*1.3+d.drift)*.115;
  let rx=mix(d.tilt+bank*.4,Math.sin(angle)*.29,pull),
      ry=mix(d.spin*.30,Math.cos(angle)*.35,pull),
      rz=mix(d.spin*.28+bank,angle*.12,pull);
  if(idx===0){
   // selected document lives ONLY inside the unchanged sheetMesh.
   x=mix(x,targetX,assemble);y=mix(y,targetY,assemble);z=mix(z,.35,assemble);
   rx=mix(rx,.016,assemble);ry=mix(ry,-.03,assemble);
   rz=mix(rz,-.012,assemble);
   selectedPaperPose={x,y,z,rx,ry,rz};
   m.visible=false;
  }else{
   const recession=smooth(.295,.465,p)*(1-assemble);
   x=mix(x,targetX+(.45+.88*d.order)*Math.cos(d.phase),assemble);
   y=mix(y,targetY+(.40+.83*d.order)*Math.sin(d.phase),assemble);
   z=mix(z,-1.0-d.order*.40,assemble)-recession*(1.2+d.order*.72);
   const baseSize=(.87+.20*d.order)*(d.layer===0?.82:d.layer===2?1.19:1);
   m.scale.setScalar(baseSize*(1-.27*shrink)*mix(1,.70,recession));
   m.material.opacity=(1-smooth(.447,.513,p))*d.focusTint*mix(1,.70,focus);
   m.visible=p<.514&&(!mobile||idx<18);
   m.position.set(x,y,z);
   m.rotation.set(rx,ry,rz);
   if(m.visible){
    // A paper's speed through the spiral sets how strongly it responds.
    const orbitSpeed=14*d.orbit*d.radius*(1-shrink*.87);
    deformVortexPaper(d,p,t,orbitSpeed*.1);
   }else{
    d.physicsDirty=false;
   }
  }
 }
}

// Only chapter four receives a volumetric sea and a separate matte paper boat.
// The earlier document physics, folds and GSAP timeline are never replaced.
const seaLight=new THREE.PointLight(0xffe4b2,3.5,11);
seaLight.position.set(4,-2,2);scene.add(seaLight);
const finale=createCinematicFinale(THREE,{scene,paperMaps,reduce,
 mobile:matchMedia("(max-width: 670px)").matches
});
function renderCinematicLayers(p,t){
 renderer.clear(true,true,true);
 renderer.render(scene,camera);
}

// Independent real-time buoyancy; scroll controls the morph only.
// A critically damped spring follows the SAME GPU wave sampled on the CPU.
let boatRise=0,boatRiseVelocity=0,boatRoll=0,boatPitch=0,boatFrameTime=0;
let pointerX=0,pointerY=0,lookX=0,lookY=0;
let lastWorldTime=0;
const raycaster=new THREE.Raycaster();
const touchPoint=new THREE.Vector2();
const surfacePlane=new THREE.Plane(new THREE.Vector3(0,1,0),1.79);
const rayHit=new THREE.Vector3();
let pressStart=null;
function registerSeaInteraction(){
 function setPointer(e){
  const r=stage.getBoundingClientRect();
  pointerX=clamp(((e.clientX-r.left)/Math.max(r.width,1)-0.5)*2,-1,1);
  pointerY=clamp(((e.clientY-r.top)/Math.max(r.height,1)-0.5)*2,-1,1);
 }
 function eligible(e){
  return progress>.895 &&
   !reduce.matches &&
   !e.target.closest('a,button,input,select,textarea,[role="button"]');
 }
 stage.addEventListener("pointermove",e=>{
  if(e.pointerType!=="mouse"&&e.pointerType!=="pen")return;
  if(progress>.87)setPointer(e);
 },{passive:true});
 stage.addEventListener("pointerleave",()=>{pointerX=0;pointerY=0},{passive:true});
 stage.addEventListener("pointerdown",e=>{
  if(!eligible(e))return;
  pressStart={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};
 },{passive:true});
 stage.addEventListener("pointercancel",()=>{pressStart=null},{passive:true});
 stage.addEventListener("pointerup",e=>{
  const down=pressStart;pressStart=null;
  if(!down||down.id!==e.pointerId||!eligible(e))return;
  if(Math.hypot(down.x-e.clientX,down.y-e.clientY)>14||
     performance.now()-down.t>850)return; // a scroll gesture, not a tap
  const rect=stage.getBoundingClientRect();
  const nx=(e.clientX-rect.left)/Math.max(rect.width,1);
  const ny=(e.clientY-rect.top)/Math.max(rect.height,1);
  if(ny<.54||nx<0||nx>1||ny>1)return; // sky, outside stage
  touchPoint.set(nx*2-1,1-ny*2);
  raycaster.setFromCamera(touchPoint,camera);
  if(raycaster.ray.intersectPlane(surfacePlane,rayHit)){
   finale.addRipple(rayHit.x,rayHit.z,lastWorldTime,1);
   window.__oceanLastTap={x:+rayHit.x.toFixed(3),z:+rayHit.z.toFixed(3),
      at:lastWorldTime,screenX:nx,screenY:ny};
  }
 },{passive:true});
 // Keyboard and assistive-technology alternative, invisible unless focused.
 const tapButton=document.getElementById('oceanTapButton');
 if(tapButton)tapButton.addEventListener('click',()=>{
  if(progress>.895)finale.addRipple(width<670?0:1.8,-1.4,lastWorldTime,.85);
 });
}

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
 lastWorldTime=time;
 updateVortex(p,time*1000);
 updateSheet(p,time);
 // Slight parallax makes the folding object read as 3D, but never hides the folds.
 const lensFocus=smooth(.25,.385,p)*(1-smooth(.433,.559,p));
 // Very small inertial mouse parallax, only after the boat appears.
 const dtLook=boatFrameTime?Math.min(.05,Math.max(0,time-boatFrameTime)):1/60;
 const pointerK=1-Math.exp(-dtLook*2.4);
 lookX+=(pointerX-lookX)*pointerK;
 lookY+=(pointerY-lookY)*pointerK;
 const parallax=reduce.matches?0:smooth(.895,.985,p)*(1-smooth(.948,1,p));
 const exit=smooth(.949,1,p);
 // True virtual camera drift to the right on the way to the wheel.
 // Pointer offsets stay small enough to preserve the approved composition.
 const travel=exit*3.05;
 camera.position.x=mix(-.10,.14,smooth(.58,.94,p))+lookX*.075*parallax+travel;
 camera.position.y=mix(.13,.62,smooth(.76,1,p))-lookY*.038*parallax;
 camera.position.z=(mobile?12.9:13.8)-lensFocus*(mobile?.28:.52);
 camera.lookAt(travel*.84+lookX*.023*parallax,
   mix(0,.76,smooth(.78,1,p))-lookY*.012*parallax,0);
 // Scroll determines whether the paper is a completed sailboat.
 // Physical time determines what it does AFTER the wheel is released.
 // updateSheet() resets the base pose every tick; these offsets never drift.
 const afloat=reduce.matches?0:smooth(.933,.989,p);
 const dt=boatFrameTime?Math.min(.05,Math.max(0,time-boatFrameTime)):1/60;
 boatFrameTime=time;
 const sample=finale.sampleSurface(mobile?0:1.8,0,time);
 const desiredRise=sample.height*1.12;
 // Damped suspension: no abrupt snapping at wave crests or scroll pauses.
 const spring=11.5,damping=7.6;
 boatRiseVelocity+=(desiredRise-boatRise)*spring*dt;
 boatRiseVelocity*=Math.exp(-damping*dt);
 boatRise+=boatRiseVelocity*dt;
 const waveEase=1-Math.exp(-dt*3.7);
 // Limit storm-like impulse; a paper sailboat can never flip.
 boatRoll+=(clamp(-sample.dx*.18,-.065,.065)-boatRoll)*waveEase;
 boatPitch+=(clamp(sample.dz*.17,-.055,.055)-boatPitch)*waveEase;
 sailGroup.position.y+=boatRise*afloat;
 sailGroup.rotation.z+=boatRoll*afloat;
 sailGroup.rotation.x+=boatPitch*afloat;
 // A minuscule, genuinely time-driven paper flutter, not more bobbing.
 sailGroup.rotation.y+=(reduce.matches?0:Math.sin(time*.41)*.006*afloat);
 finale.update(p,time,{mobile});
 window.__livingOceanV42={
   mode:'real-time-Three.js',progress:+p.toFixed(4),realTimeSeconds:+time.toFixed(2),
   waterHeight:+sample.height.toFixed(4),boatBob:+(boatRise*afloat).toFixed(4),
   boatRollDegrees:+(boatRoll*afloat*180/Math.PI).toFixed(3),
   boatPitchDegrees:+(boatPitch*afloat*180/Math.PI).toFixed(3),
   oceanContinuesWhenScrollStops:true,videoUsed:false,
   cursorParallax:true,interactionRipples:true,
   rightwardTransition:true,lastRipple:window.__oceanLastTap||null
 };
 renderCinematicLayers(p,time);
 // Reveal WebGL only after its first real render (never display a blank canvas).
 if(!window.__origami3DReady){
  if(typeof window.__activateWebGL==="function")window.__activateWebGL();
  else{window.__natalia3d=true;window.__origami3DReady=true;}
 }
 window.__origami3DProgress=p;
 window.__origami3DPoseProgress=yachtPoseProgress(p);
}
try{
 resize();renderCinematicLayers(0,0);
 const initialPosition=clamp(-journey.getBoundingClientRect().top/Math.max(1,journey.offsetHeight-innerHeight));
 progress=initialPosition;
 const scrub={p:initialPosition};
 GS.to(scrub,{p:1,ease:"none",scrollTrigger:{
  trigger:journey,start:"top top",end:"bottom bottom",scrub:0.65,
  invalidateOnRefresh:true,onUpdate:()=>{}
 },onUpdate(){progress=scrub.p}});
 GS.ticker.add(tick);
 registerSeaInteraction();
 document.addEventListener("visibilitychange",()=>{active=!document.hidden;if(active)resize()});
 window.addEventListener("resize",resize,{passive:true});
 renderer.domElement.addEventListener("webglcontextlost",()=>{
  window.__origami3DReady=false;window.__natalia3d=false;
  document.documentElement.classList.remove("webgl-ready");
  target.style.display="none";
  window.__enableCanvasFallback?.("webgl-context-lost");
},{passive:true});
 window.__origami3DSilhouetteProbe=()=>{
  const a=sheetGeo.attributes.position;
  const at=i=>[a.getX(i),a.getY(i),a.getZ(i)].map(n=>Math.round(n*100000)/100000);
  return {scrollProgress:progress,poseProgress:yachtPoseProgress(progress),
   samples:[0,.17,.34,.51,.68,.85,1].map(r=>at(Math.min(a.count-1,Math.floor(r*(a.count-1)))))};
 };
  window.__origami3DDiagnostics={engine:"Three.js WebGL",controller:"GSAP ScrollTrigger",sheetMeshes:halves.length,sheetVertices:halves.reduce((n,o)=>n+o.geo.attributes.position.count,0),vortexMeshes:docs.length,boatFacets:8,sailFacets:4,geometryVersion:"v8-sculpted-contours",oneContinuousSheet:true,contourPaths:creaseRibbons.length,contactShadow:true,seaShader:"v43-gpu-cpu-interactive-ripple-world",atmosphericSky:true,paperPBR:"v11-cotton-stock",paperMaps:["albedo","normal","roughness"],paperMapResolution:paperMaps.dimensions,physicalPaperEdges:paperEdges.length,edgeThickness:.014,airFlex:"reversible-pre-fold",documentImages:documentImageStatus,documentTypes:DOCUMENT_IMAGE_FILES.length,paperPhysics:"v16-visible-paper-flaps",finalScene:"v20-approved-yacht-shape-locked",waveVertices:finale.waveVertices,finale:finale.diagnostics,finalPoseProgress:FINAL_YACHT_POSE_PROGRESS,paperPhysicsStats,heroWind:true,vortexDirection:"v14-cinematic-parallax",depthTiers:3,focusOnSameSheet:true,vortexDocumentCount:VORTEX_COUNT};
}catch(err){
 window.__origami3DReady=false;window.__natalia3d=false;
 target.style.display="none";
 window.__enableCanvasFallback?.("webgl-init-error");
 console.error("3D scene init failed; fallback to Canvas",err);
}
