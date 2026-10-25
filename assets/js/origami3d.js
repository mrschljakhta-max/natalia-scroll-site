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
 roughness:.92,metalness:0,clearcoat:.02,clearcoatRoughness:.97,
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
ribbonPath({name:'port-silhouette',from:[0,.34],to:[0,1],color:0x557c6c,width:.017,alpha:.87,begin:.90,finish:.963});
ribbonPath({name:'port-mast-fold',from:[.5,.34],to:[.5,1],color:0x607e6d,width:.013,alpha:.73,begin:.90,finish:.963});
ribbonPath({name:'port-inner-crease',from:[.22,.35],to:[.385,.93],color:0x7f9f8a,width:.012,alpha:.56,begin:.925,finish:.982});
ribbonPath({name:'starboard-silhouette',from:[1,.34],to:[1,1],color:0xa9795d,width:.017,alpha:.87,begin:.936,finish:.996});
ribbonPath({name:'starboard-mast-fold',from:[.5,.34],to:[.5,1],color:0x95735c,width:.011,alpha:.68,begin:.936,finish:.996});
ribbonPath({name:'starboard-inner-crease',from:[.78,.35],to:[.64,.90],color:0xc19b7c,width:.011,alpha:.56,begin:.942,finish:.996});
ribbonPath({name:'hull-upper-lip',from:[0,.34],to:[1,.34],color:0x6f9180,width:.019,alpha:.89,begin:.861,finish:.944,kind:'hull'});
ribbonPath({name:'hull-keel',from:[0,0],to:[1,0],color:0x89998d,width:.020,alpha:.82,begin:.866,finish:.941,kind:'hull'});
ribbonPath({name:'hull-central-fold',from:[.5,0],to:[.5,.34],color:0xb1a087,width:.012,alpha:.67,begin:.865,finish:.952,kind:'hull'});
ribbonPath({name:'hull-fold-left',from:[0,.12],to:[.5,.34],color:0x9aad9b,width:.012,alpha:.64,begin:.868,finish:.944,kind:'hull'});
ribbonPath({name:'hull-fold-right',from:[.5,.34],to:[1,.12],color:0xbda484,width:.012,alpha:.61,begin:.868,finish:.944,kind:'hull'});

function positionFromUV(u,v,p){
 const x0=W*(u-.5),y0=H*(v-.5),folded=foldPoint(x0,y0,p),
       final=yachtPoint(x0,y0),morph=v<.34-.00001?smooth(.851,.925,p):
         u<=.5?smooth(.887,.961,p):smooth(.921,.998,p);
 return [mix(folded[0],final[0],morph),mix(folded[1],final[1],morph),
    mix(folded[2],final[2],morph)];
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
let selectedPaperPose=null;
function updateSheet(p,time){
 const {mesh,geo,original}=halves[0],pos=geo.attributes.position,col=geo.attributes.color;
 // Individual sculpting phases. The hull opens before either sail;
 // then large sail rotates out, followed by the smaller sail.
 const hull=smooth(.851,.925,p);
 const port=smooth(.887,.961,p);
 const starboard=smooth(.921,.998,p);
 const ink=smooth(.834,.974,p);
 if(sheetMat.userData.shader)sheetMat.userData.shader.uniforms.uInkToFiber.value=ink;
 for(let i=0;i<pos.count;i++){
  const index=i*3,x0=original[index],y0=original[index+1],
        uvx=clamp(x0/W+.5),uvy=clamp(y0/H+.5);
  const folded=foldPoint(x0,y0,p);
  const final=yachtPoint(x0,y0);
  const morph=uvy<.34-.00001?hull:uvx<=.5?port:starboard;
  const x=mix(folded[0],final[0],morph),
        y=mix(folded[1],final[1],morph),
        z=mix(folded[2],final[2],morph);
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
  col.setXYZ(i,c.r,c.g,c.b);
 }
 pos.needsUpdate=true;col.needsUpdate=true;
 geo.computeVertexNormals();geo.computeBoundingSphere();
 // Never fade the sheet out; it becomes the boat through its own vertices.
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
 const targetScale=mix(startScale,fullScale,align);
 sailGroup.scale.setScalar(targetScale);
 sailGroup.rotation.set(
  mix(pose.rx,.016,align)+mix(0,-.09,smooth(.89,1,p)),
  mix(pose.ry,-.03,align)+mix(0,-.18,smooth(.90,1,p)),
  mix(pose.rz,-.012,align));
 const details=smooth(.888,.973,p);
 boatDetail.visible=details>.002;
 mast.scale.y=Math.max(.002,details);
 mast.position.y=-.71+1.575*details;
 detailMaterials.forEach(({mat,initial})=>mat.opacity=initial*details);
 updateRibbons(p);
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
 const mobile=innerWidth<670,time=reduce.matches?0:t*.00008;
 vortex.position.set(mobile?0:1.30,mobile?-.4:0,0);
 const targetX=mobile?0:.50,targetY=mobile?-.34:-.19;
 for(let idx=0;idx<docs.length;idx++){
  const d=docs[idx],m=d.mesh,angle=d.angle+(p-.12)*14*d.orbit+time;
  const radius=d.radius*(1-shrink*.87);
  let x=mix(d.x,Math.cos(angle)*radius*.83,pull),
      y=mix(d.y,Math.sin(angle)*radius*.77,pull),
      z=mix(d.z,Math.sin(angle*1.1+d.phase)*radius*.29,pull),
      rx=mix(d.tilt,Math.sin(angle)*.30,pull),
      ry=mix(d.spin*.30,Math.cos(angle)*.37,pull),
      rz=mix(d.spin,angle*.12,pull);
  if(idx===0){
   // This document is not rendered twice: the *single master sheet mesh*
   // occupies its precise pose from frame zero and grows to fill the scene.
   x=mix(x,targetX,assemble);y=mix(y,targetY,assemble);z=mix(z,0,assemble);
   rx=mix(rx,.016,assemble);ry=mix(ry,-.03,assemble);
   rz=mix(rz,-.012,assemble);
   selectedPaperPose={x,y,z,rx,ry,rz};
   m.visible=false;
  }else{
   x=mix(x,targetX+(.35+.75*d.order)*Math.cos(d.phase),assemble);
   y=mix(y,targetY+(.35+.75*d.order)*Math.sin(d.phase),assemble);
   z=mix(z,-.6-d.order*.35,assemble);
   m.scale.setScalar((.88+.19*d.order)*(1-.34*shrink));
   m.material.opacity=(1-smooth(.447,.513,p))*(.88+.12*d.order);
   m.visible=p<.514;
   m.position.set(x,y,z);
   m.rotation.set(rx,ry,rz);
  }
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
 updateVortex(p,time*1000);
 updateSheet(p,time);
 // Slight parallax makes the folding object read as 3D, but never hides the folds.
 camera.position.x=mix(-.10,.14,smooth(.58,.94,p));
 camera.position.y=mix(.13,-.15,smooth(.76,1,p));
 camera.lookAt(0,0,0);
 // At rest, the one-paper yacht and its crease details move together.
 const afloat=smooth(.970,1,p);
 sailGroup.rotation.z+=(reduce.matches?0:Math.sin(time*.63)*.010*afloat);
 sailGroup.position.y+=(reduce.matches?0:Math.sin(time*.81)*.016*afloat);
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
 window.__origami3DDiagnostics={engine:"Three.js WebGL",controller:"GSAP ScrollTrigger",sheetMeshes:halves.length,sheetVertices:halves.reduce((n,o)=>n+o.geo.attributes.position.count,0),vortexMeshes:docs.length,boatFacets:8,sailFacets:4,geometryVersion:"v8-sculpted-contours",oneContinuousSheet:true,contourPaths:creaseRibbons.length,contactShadow:true};
}catch(err){
 window.__origami3DReady=false;window.__natalia3d=false;
 target.style.display="none";
 window.__enableCanvasFallback?.("webgl-init-error");
 console.error("3D scene init failed; fallback to Canvas",err);
}
