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

 // No second boat geometry here: the sheet in origami3d.js remains
 // the only vessel in every scene, including the fourth one.
 function update(p,time,{mobile:small=false}={}){
  const reveal=smooth(.82,.955,p);
  u.uTime.value=reduce.matches?0:time;
  u.uReveal.value=reveal;
  // Keep ripples centred under the original two-sail yacht.
  u.uBoat.value.set(small?0:1.8,0);
  u.uSunX.value=small?1.45:5.0;
  water.visible=reveal>.003;
 }
 return {
  update,sea:water,
  waveVertices:waterGeometry.attributes.position.count,
  diagnostics:{
   geometry:"world-space PlaneGeometry",waveFamilies:4,wake:true,
   normals:"analytic finite difference",
   boat:"original continuous paper yacht (unchanged)",
   scrollReversible:true
  }
 };
}
