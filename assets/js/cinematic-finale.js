/**
 * NATALIA & ANNA — Scene 04 / Living Ocean v42.
 * Real-time procedural Three.js water, physically motivated waves and glints.
 *
 * Two clocks are deliberately independent:
 *   progress = reversible paper -> ocean state from GSAP ScrollTrigger
 *   time     = real seconds from GSAP ticker, always advancing while visible
 * The scene stays alive when the user's mouse wheel stops.
 *
 * No video textures, video playback, or static image patchwork.
 * One and the same paper geometry from origami3d.js forms the sailboat.
 */
export function createCinematicFinale(THREE,{scene,paperMaps,reduce,mobile=false}){
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const RGB=hex=>new THREE.Vector3(
   parseInt(hex.slice(1,3),16)/255,
   parseInt(hex.slice(3,5),16)/255,
   parseInt(hex.slice(5,7),16)/255
 );
 const seaLevel=-1.79;

 // Calm, multi-directional ocean. The same formula is evaluated on GPU and
 // on CPU under the paper vessel, preventing the boat from rocking out of
 // phase with the surface supporting it.
 const waveBands=[
  {ax:.60, az:.24, k:1.30, speed:.39, amplitude:.078, phase:0},
  {ax:-.42,az:.88, k:2.30, speed:-.53,amplitude:.037, phase:.73},
  {ax:.88, az:.46, k:5.80, speed:.77, amplitude:.011, phase:1.52},
  {ax:-.75,az:.66,k:12.20,speed:-1.06,amplitude:.0045,phase:2.30}
 ];
 function sampleSurface(x,z,time){
  if(reduce.matches)return {height:0,dx:0,dz:0};
  let height=0,dx=0,dz=0;
  for(const b of waveBands){
   const angle=(x*b.ax+z*b.az)*b.k-time*b.speed+b.phase;
   const sn=Math.sin(angle),cs=Math.cos(angle);
   height+=b.amplitude*sn;
   dx+=b.amplitude*cs*b.k*b.ax;
   dz+=b.amplitude*cs*b.k*b.az;
  }
  // Motion-free geometric wake is only a subtle optical accent. Boat bob
  // is sampled from swells, not from its own generated wake.
  return {height,dx,dz};
 }
 const shaderCommon=[
 "uniform float uTime;",
 "uniform vec2 uBoat;",
 "float waves(vec2 p){",
 " float t=uTime;",
 " float a=sin(dot(p,vec2(.60,.24))*1.30-t*.39)*.078;",
 " float b=sin(dot(p,vec2(-.42,.88))*2.30+t*.53+.73)*.037;",
 " float c=sin(dot(p,vec2(.88,.46))*5.80-t*.77+1.52)*.011;",
 " float d=sin(dot(p,vec2(-.75,.66))*12.20+t*1.06+2.30)*.0045;",
 " float r=length((p-uBoat)*vec2(1.0,1.15));",
 " float wake=sin(r*7.4-t*1.22)*exp(-r*1.72)*.007;",
 " return a+b+c+d+wake;",
 "}"
 ].join("\n");
 const u={
  uTime:{value:0},
  uReveal:{value:0},
  uMood:{value:0},
  uBoat:{value:new THREE.Vector2(1.8,0)},
  uSunX:{value:5.2},
  uDeep:{value:RGB("#0B4655")},
  uMid:{value:RGB("#146D80")},
  uNear:{value:RGB("#218C99")},
  uHorizon:{value:RGB("#70B7B8")},
  uFoam:{value:RGB("#DDF3E7")},
  uGold:{value:RGB("#FFE1A1")}
 };
 const vertexShader=[
 "precision highp float;",
 shaderCommon,
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
 shaderCommon,
 "uniform float uReveal;",
 "uniform float uMood;",
 "uniform float uSunX;",
 "uniform vec3 uDeep;",
 "uniform vec3 uMid;",
 "uniform vec3 uNear;",
 "uniform vec3 uHorizon;",
 "uniform vec3 uFoam;",
 "uniform vec3 uGold;",
 "varying vec3 vWorld;",
 "varying float vDistance;",
 "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
 "void main(){",
 " vec2 q=vWorld.xz;",
 " float e=.075;",
 " vec3 N=normalize(vec3(",
 "  -(waves(q+vec2(e,0.0))-waves(q-vec2(e,0.0)))/(2.0*e),",
 "  1.0,",
 "  -(waves(q+vec2(0.0,e))-waves(q-vec2(0.0,e)))/(2.0*e)));",
 " vec3 V=normalize(cameraPosition-vWorld);",
 " vec3 L=normalize(vec3(.45,.68,-.55));",
 " float nv=clamp(dot(N,V),0.0,1.0);",
 " float fresnel=pow(1.0-nv,3.5);",
 " float distanceFade=smoothstep(4.0,55.0,vDistance);",
 " vec3 color=mix(uDeep,uMid,smoothstep(2.0,17.0,vDistance));",
 " color=mix(color,uHorizon,distanceFade*.78);",
 " color=mix(color,uNear,(1.0-distanceFade)*.19);",
 " color+=uHorizon*fresnel*.15;",
 " float crest=waves(q);",
 " float slope=length(vec2(dFdx(vWorld.y),dFdy(vWorld.y)));",
 " color+=uFoam*smoothstep(.08,.24,slope)*.11;",
 " // The golden sun glitters as hundreds of tiny changing reflections,",
 " // tightly limited to the right third. Not an artificial glowing pipe.",
 " vec3 H=normalize(L+V);",
 " float spec=pow(max(dot(N,H),0.0),165.0);",
 " float spark=pow(max(dot(N,H),0.0),440.0);",
 " float pathWidth=1.05+max(-q.y,0.0)*.030;",
 " float sunPath=exp(-pow((q.x-uSunX)/pathWidth,2.0));",
 " float ripples=.65+.35*sin(q.x*7.2+q.y*9.4+uTime*.56);",
 " ripples*=.70+.30*sin(q.x*15.3-q.y*5.1-uTime*.62);",
 " float grain=hash(floor(q*24.0+uTime*.15));",
 " float flecks=step(.91,grain)*(0.3+0.7*abs(ripples));",
 " float goldGain=mix(.68,1.18,uMood);",
 " color+=uGold*sunPath*goldGain*(spec*.58+spark*.80+flecks*spec*.20);",
 " // A naturally spreading, subtle white wake around the paper hull.",
 " vec2 local=(q-uBoat)*vec2(1.0,1.25);",
 " float d=length(local);",
 " float bow=exp(-abs(local.x)*3.0)*exp(-abs(local.y)*1.1);",
 " float wake=pow(.5+.5*sin(d*10.0-uTime*1.15),6.0)",
 "            *exp(-d*1.45)*smoothstep(.08,.38,d);",
 " color+=uFoam*(wake*.16+bow*.040);",
 " float horizonFog=1.0-smoothstep(33.0,76.0,vDistance);",
 " float alpha=mix(.94,.995,fresnel)*horizonFog*uReveal;",
 " gl_FragColor=vec4(clamp(color,0.0,1.0),alpha);",
 "}"
 ].join("\n");

 // Geometry moves in world space in the shader; no baked-frame playback.
 const grid=mobile?86:160;
 const geometry=new THREE.PlaneGeometry(110,130,grid,mobile?86:160);
 const material=new THREE.ShaderMaterial({
  uniforms:u,vertexShader,fragmentShader,
  transparent:true,depthWrite:false,depthTest:true,
  side:THREE.DoubleSide,toneMapped:false
 });
 const ocean=new THREE.Mesh(geometry,material);
 ocean.rotation.x=-Math.PI/2;
 ocean.position.set(0,seaLevel,-30);
 ocean.frustumCulled=false;
 ocean.renderOrder=0;
 ocean.visible=false;
 scene.add(ocean);

 // Decorative tiny foam patches at the hull are shader-computed. No extra
 // mesh copies of the boat, avoiding geometry discontinuity on chapter 03→04.
 let lastReveal=0;
 function update(progress,realTime,{mobile:small=false}={}){
  const reveal=smooth(.810,.965,progress);
  const mood=smooth(.82,1.0,progress);
  u.uTime.value=reduce.matches?0:realTime;
  u.uReveal.value=reveal;
  u.uMood.value=mood;
  u.uBoat.value.set(small?0:1.8,0);
  u.uSunX.value=small?1.35:5.2;
  ocean.visible=reveal>.001;
  lastReveal=reveal;
 }
 return {
  update,sea:ocean,sampleSurface,
  waveVertices:geometry.attributes.position.count,
  get reveal(){return lastReveal;},
  diagnostics:{
   version:42,engine:"real-time GPU ocean",
   timeIndependentOfScroll:true,scrollControlsRevealOnly:true,
   waveFamilies:4,waterMesh:true,goldSpecular:true,wake:true,
   boat:"one continuous origami sheet, no 2.5D stand-in",
   geometry:"world-space subdivided plane, vertex displacement",
   shader:"analytic multi-band wave normals / moving sun highlights",
   reduceMotionSupported:true
  }
 };
}
