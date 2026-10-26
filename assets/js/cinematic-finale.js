/**
 * Cinematic finale v18 — physical world-space sea and folded paper origami.
 * Deliberately separate from the original continuous document-fold sequence.
 * The new boat appears only AFTER the final fold, through a reversible dissolve.
 * All shaders use WebGL1-compatible GLSL, no device-specific extensions.
 */
export function createCinematicFinale(THREE,{scene,paperMaps,reduce,mobile=false}){
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const seaLevel=-1.79;
 const u={
  uTime:{value:0},uReveal:{value:0},
  uBoat:{value:new THREE.Vector2(1.8,.12)},
  uSunX:{value:5.0}
 };
 const common=[
  "uniform float uTime;",
  "uniform vec2 uBoat;",
  "float waves(vec2 p){",
  " float t=uTime;",
  " float a=sin(dot(p,vec2(.62,.19))*1.85-t*.81)*.085;",
  " float b=sin(dot(p,vec2(-.35,.94))*3.3+t*.93)*.047;",
  " float c=sin(dot(p,vec2(.86,.50))*7.6-t*1.26)*.019;",
  " float d=sin(dot(p,vec2(-.70,.71))*13.0+t*1.71)*.009;",
  " float r=distance(p,uBoat);",
  " float wake=sin(r*9.0-t*2.25)*exp(-r*1.15)*.027;",
  " return a+b+c+d+wake;",
  "}"
 ].join("\n");
 const vertexShader=[
  "precision highp float;",
  common,
  "varying vec3 vWorld;",
  "varying float vDistance;",
  "void main(){",
  " vec4 wp=modelMatrix*vec4(position,1.0);",
  " wp.y+=waves(wp.xz);",
  " vWorld=wp.xyz;",
  " vDistance=distance(cameraPosition,wp.xyz);",
  " gl_Position=projectionMatrix*viewMatrix*wp;",
  "}"
 ].join("\n");
 const fragmentShader=[
  "precision highp float;",
  common,
  "uniform float uReveal;",
  "uniform float uSunX;",
  "varying vec3 vWorld;",
  "varying float vDistance;",
  "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
  "void main(){",
  " vec2 q=vWorld.xz;",
  " float e=.095;",
  " vec3 N=normalize(vec3(",
  " -(waves(q+vec2(e,0.0))-waves(q-vec2(e,0.0)))/(2.0*e),",
  " 1.0,",
  " -(waves(q+vec2(0.0,e))-waves(q-vec2(0.0,e)))/(2.0*e)));",
  " vec3 V=normalize(cameraPosition-vWorld);",
  " vec3 L=normalize(vec3(.43,.78,-.46));",
  " float fresnel=pow(1.0-max(dot(N,V),0.0),3.0);",
  " float lambert=max(dot(N,L),0.0);",
  " float deep=clamp(vDistance/62.0,0.0,1.0);",
  " vec3 nearColor=vec3(.064,.28,.305);",
  " vec3 farColor=vec3(.33,.53,.49);",
  " vec3 color=mix(nearColor,farColor,smoothstep(4.0,66.0,vDistance));",
  " float crest=waves(q);",
  " color+=vec3(.09,.14,.12)*lambert*.43;",
  " color+=vec3(.07,.16,.16)*fresnel*.62;",
  " color+=vec3(.075,.10,.083)*crest;",
  " float spec=pow(max(dot(reflect(-L,N),V),0.0),84.0);",
  " float glitter=pow(max(dot(reflect(-L,N),V),0.0),270.0);",
  " float breakup=.60+.40*sin(q.x*3.4+q.y*8.9+uTime*.46);",
  " breakup*=.72+.28*sin(q.x*13.2-q.y*4.7-uTime*.75);",
  " float stripe=exp(-pow((q.x-uSunX)/(1.25+max(0.0,-q.y)*.09),2.0));",
  " color+=vec3(1.0,.76,.46)*(spec*.50+glitter*.65)*stripe*breakup;",
  " float ring=distance(q,uBoat);",
  " float wake=exp(-ring*1.65)*(0.5+0.5*sin(ring*13.5-uTime*2.25));",
  " color+=vec3(.16,.25,.23)*wake*.25;",
  " float horizonFog=1.0-smoothstep(38.0,80.0,vDistance);",
  " float opaque=mix(.84,.99,fresnel);",
  " opaque*=horizonFog;",
  " gl_FragColor=vec4(clamp(color,0.0,1.0),opaque*uReveal);",
  "}"
 ].join("\n");
 // A REAL world-space plane: each vertex changes height in the vertex shader.
 // Normals are evaluated from the same wave function per fragment.
 const grid=mobile?80:148;
 const waterGeometry=new THREE.PlaneGeometry(110,125,grid,mobile?76:148);
 const waterMaterial=new THREE.ShaderMaterial({
  uniforms:u,vertexShader,fragmentShader,
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
  toneMapped:false
 });
 const water=new THREE.Mesh(waterGeometry,waterMaterial);
 water.rotation.x=-Math.PI/2;
 water.position.set(0,seaLevel,-30);
 water.frustumCulled=false;
 water.visible=false;
 water.renderOrder=0;
 scene.add(water);

 // Distinct actual planes with folded paper thickness in the depth axis.
 // Their z coordinates differ; the entire silhouette is not a flat sprite.
 const boat=new THREE.Group();
 boat.visible=false;
 const fabrics=[
  [0xf6efdf,.94],  // warm stock
  [0xe9dcc8,.96],  // shaded reverse fold
  [0xf5e8d4,.94],
  [0xe2d5be,.97],
  [0xefe6d5,.95],
  [0xe7e1d1,.97]
 ].map(([color,roughness])=>new THREE.MeshStandardMaterial({
   color,roughness,metalness:0,side:THREE.DoubleSide,
   map:paperMaps.fiber,normalMap:paperMaps.normal,
   normalScale:new THREE.Vector2(.16,.16),
   polygonOffset:true,polygonOffsetFactor:-1
 }));
 const outline=new THREE.LineBasicMaterial({
  color:0x8f8473,transparent:true,opacity:.28,depthWrite:false
 });
 function paperPanel(points,material,crease=true){
  const contour=points.map(p=>new THREE.Vector2(p[0],p[1]));
  const faces=THREE.ShapeUtils.triangulateShape(contour,[]);
  const positions=[],uv=[];
  for(const face of faces){
   for(const ix of face){
    const p=points[ix];
    positions.push(p[0],p[1],p[2]);
    uv.push((p[0]+2.4)/4.8,(p[1]+1.0)/3.0);
   }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,fabrics[material]);
  mesh.castShadow=true;mesh.receiveShadow=true;
  boat.add(mesh);
  if(crease){
   const border=points.map(p=>new THREE.Vector3(p[0],p[1],p[2]+.014));
   border.push(border[0]);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(border),outline);
   boat.add(line);
  }
  return mesh;
 }
 // Back folded pockets and centre ridge provide readable volume in oblique light.
 paperPanel([[-2.12,.40,-.36],[-.48,.12,-.29],[.08,1.03,-.36],[-.22,-.36,-.23]],3);
 paperPanel([[.25,-.25,-.30],[.66,1.02,-.34],[2.07,.40,-.36],[.61,.04,-.27]],1);
 paperPanel([[-1.05,-.21,-.15],[.02,1.63,-.31],[.14,-.18,.07]],0);
 paperPanel([[.13,-.17,.08],[.02,1.63,-.31],[1.01,-.20,-.10]],2);
 // Hull — four bowed folds with distinct planes, never metallic/specular.
 paperPanel([[-2.20,.43,.12],[-.02,-.15,.37],[-.08,-.76,.37],[-1.67,-.66,.24]],0);
 paperPanel([[-.02,-.15,.37],[2.19,.41,.11],[1.65,-.67,.25],[-.08,-.76,.37]],4);
 paperPanel([[-1.67,-.66,.24],[-.08,-.76,.37],[.01,-.63,.11],[-1.76,-.53,-.03]],1);
 paperPanel([[-.08,-.76,.37],[1.65,-.67,.25],[1.75,-.53,-.04],[.01,-.63,.11]],5);
 // A few real paper fold marks, quiet enough not to resemble steel seams.
 const folds=[
  [[-2.17,.41,.16],[-.02,-.15,.395]],
  [[2.16,.40,.15],[-.02,-.15,.395]],
  [[-.02,-.15,.39],[-.08,-.73,.40]],
  [[.02,1.59,-.28],[.12,-.16,.11]]
 ];
 folds.forEach(path=>{
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(
   path.map(p=>new THREE.Vector3(...p))),outline);
  boat.add(line);
 });
 boat.scale.setScalar(.88);
 scene.add(boat);

 // Physical horizontal surface contact shadow; never a screen-locked ellipse.
 const shadowCanvas=document.createElement("canvas");
 shadowCanvas.width=128;shadowCanvas.height=128;
 const g=shadowCanvas.getContext("2d");
 const grd=g.createRadialGradient(64,64,6,64,64,64);
 grd.addColorStop(0,"rgba(21,57,54,.48)");
 grd.addColorStop(.45,"rgba(34,83,77,.21)");
 grd.addColorStop(1,"rgba(34,83,77,0)");
 g.fillStyle=grd;g.fillRect(0,0,128,128);
 const shadowMap=new THREE.CanvasTexture(shadowCanvas);
 const shadow=new THREE.Mesh(
  new THREE.PlaneGeometry(4.0,1.95),
  new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})
 );
 shadow.rotation.x=-Math.PI/2;
 shadow.position.y=seaLevel+.011;
 shadow.renderOrder=1;
 shadow.visible=false;
 scene.add(shadow);
 function heightAt(x,z,t){
  const dot=(a,b,c,d)=>a*c+b*d;
  return Math.sin(dot(x,z,.62,.19)*1.85-t*.81)*.085+
   Math.sin(dot(x,z,-.35,.94)*3.3+t*.93)*.047+
   Math.sin(dot(x,z,.86,.50)*7.6-t*1.26)*.019+
   Math.sin(dot(x,z,-.70,.71)*13.+t*1.71)*.009;
 }
 function update(p,time,{mobile:small=false}={}){
  const reveal=smooth(.82,.955,p);
  const appear=smooth(.958,.995,p);
  u.uTime.value=reduce.matches?0:time;
  u.uReveal.value=reveal;
  const x=small?0:2.35;
  const z=small?1.0:.2;
  u.uBoat.value.set(x,z);
  u.uSunX.value=small?1.45:5.0;
  water.visible=reveal>.003;
  boat.visible=appear>.002;
  shadow.visible=appear>.002;
  const t=reduce.matches?0:time;
  const bob=heightAt(x,z,t);
  const size=(small?.79:1.28)*(1-.06*(1-appear));
  boat.position.set(x,seaLevel+size*.74-.025+bob*.45,z);
  boat.rotation.set(
   reduce.matches?0:Math.sin(t*.84)*.012,
   (small?-.06:-.04),
   reduce.matches?0:Math.sin(t*.72+.2)*.018
  );
  boat.scale.setScalar(size);
  for(const mat of fabrics){
   mat.transparent=appear<.999;
   mat.opacity=appear;
   mat.depthWrite=appear>.98;
  }
  outline.opacity=.28*appear;
  shadow.position.set(x,seaLevel+.015,z);
  shadow.scale.set(small?.87:1.30,small?.9:1.13,1);
  shadow.material.opacity=.68*appear;
 }
 return {
  update,sea:water,boat,shadow,
  waveVertices:waterGeometry.attributes.position.count,
  diagnostics:{geometry:"world-space PlaneGeometry",waveFamilies:4,wake:true,
   normals:"analytic finite difference",boat:"layered physical paper facets",
   materials:"non-metallic fiber PBR",scrollReversible:true}
 };
}
