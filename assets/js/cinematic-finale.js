/** Scene 04: reflected geometric ocean, shared CPU/GPU waves and bounded tap impulses. */
export function createCinematicFinale(THREE,{scene,renderer,camera,stage,reduce,mobile=false}){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const seaLevel=-1.79;
 const waveBands=[
  {ax:.94,az:.34,k:1.42,speed:.52,amplitude:.066,phase:.1},
  {ax:-.66,az:.75,k:2.67,speed:.68,amplitude:.032,phase:1.9},
  {ax:.26,az:.96,k:5.83,speed:.87,amplitude:.014,phase:4.1},
  {ax:-.93,az:.37,k:11.37,speed:1.24,amplitude:.0058,phase:2.4},
  {ax:.73,az:-.68,k:22.1,speed:1.49,amplitude:.0025,phase:.8}
 ];
 let clock=0,lastReveal=0,boatX=1.8,boatZ=0,head=0,reflectionFrame=0;
 const impulses=Array.from({length:4},()=>new THREE.Vector4(0,0,-100,0));
 const pointer={x:0,y:0},pointerTarget={x:0,y:0};let lastTime=0;
 const reflection=new THREE.WebGLRenderTarget(mobile?256:768,mobile?256:512,{depthBuffer:true});
 const reflectedCamera=new THREE.PerspectiveCamera();
 const reflectionMatrix=new THREE.Matrix4();
 const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 const uniforms={
  uTime:{value:0},uReveal:{value:0},uBoat:{value:new THREE.Vector2(1.8,0)},
  uRipples:{value:impulses},uReflection:{value:reflection.texture},
  uReflectionMatrix:{value:reflectionMatrix},uSun:{value:new THREE.Vector3(.45,.25,-.86).normalize()}
 };
 const waveFunction=`
 uniform float uTime;
 uniform vec2 uBoat;
 uniform vec4 uRipples[4];
 float waves(vec2 p){
  float t=uTime;
  float h=sin(dot(p,vec2(.94,.34))*1.42-t*.52+.1)*.066;
  h+=sin(dot(p,vec2(-.66,.75))*2.67-t*.68+1.9)*.032;
  h+=sin(dot(p,vec2(.26,.96))*5.83-t*.87+4.1)*.014;
  h+=sin(dot(p,vec2(-.93,.37))*11.37-t*1.24+2.4)*.0058;
  h+=sin(dot(p,vec2(.73,-.68))*22.1-t*1.49+.8)*.0025;
  for(int i=0;i<4;i++){
   float age=t-uRipples[i].z;
   if(age<0.||age>=8.)continue;
   float d=length(p-uRipples[i].xy);
   float ring=d-age*1.65;
   h+=uRipples[i].w*sin(ring*7.5)*exp(-ring*ring*1.2)*exp(-age*.48);
  }
  return h;
 }
 `;
 const vertexShader=`
 precision highp float;
 ${waveFunction}
 uniform mat4 uReflectionMatrix;
 varying vec3 vWorld;
 varying vec4 vMirror;
 void main(){
  vec4 p=modelMatrix*vec4(position,1.);
  p.y+=waves(p.xz);
  vWorld=p.xyz;
  vMirror=uReflectionMatrix*vec4(p.x,${seaLevel.toFixed(2)},p.z,1.);
  gl_Position=projectionMatrix*viewMatrix*p;
 }`;
 const fragmentShader=`
 precision highp float;
 ${waveFunction}
 uniform float uReveal;
 uniform vec3 uSun;
 uniform sampler2D uReflection;
 varying vec3 vWorld;
 varying vec4 vMirror;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
 }
 void main(){
  vec2 q=vWorld.xz;
  float e=.026;
  vec2 slope=vec2(waves(q+vec2(e,0.))-waves(q-vec2(e,0.)),waves(q+vec2(0.,e))-waves(q-vec2(0.,e)))/(2.*e);
  float farAway=smoothstep(15.,130.,length(cameraPosition-vWorld));
  vec2 detail=vec2(noise(q*14.+uTime*.18),noise(q*19.-uTime*.15))-.5;
  slope+=detail*.043*(1.-farAway);
  vec3 N=normalize(vec3(-slope.x,1.,-slope.y));
  vec3 V=normalize(cameraPosition-vWorld);
  float nv=max(dot(N,V),0.);
  float fresnel=.035+.965*pow(1.-nv,5.);
  vec3 R=reflect(-V,N);
  float skyUp=smoothstep(-.06,.65,R.y);
  vec3 sky=mix(vec3(.77,.73,.59),vec3(.34,.59,.65),skyUp);
  float sun=pow(max(dot(R,uSun),0.),200.);
  float glow=pow(max(dot(R,uSun),0.),32.);
  sky+=vec3(1.,.74,.38)*(sun*2.5+glow*.11);
  float deep=noise(q*.37+vec2(uTime*.035,0.));
  vec3 base=mix(vec3(.024,.19,.21),vec3(.065,.36,.37),deep*.63+.18);
  vec3 color=mix(base,sky,clamp(.19+fresnel*.73,.0,.96));
  vec3 H=normalize(V+uSun);
  float glint=pow(max(dot(N,H),0.),260.);
  color+=vec3(1.,.80,.48)*glint*.65;
  vec2 uv=vMirror.xy/vMirror.w+slope*.009;
  vec4 reflected=texture2D(uReflection,clamp(uv,.001,.999));
  float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  color=mix(color,reflected.rgb,reflected.a*valid*(.36+.33*fresnel));
  vec2 atBoat=(q-uBoat)*vec2(.62,1.48);
  float d=length(atBoat);
  float wake=pow(.5+.5*sin(d*13.-uTime*1.4),12.)*exp(-pow((d-1.25)/.6,2.));
  color+=vec3(.75,.88,.80)*wake*.055;
  vec3 haze=vec3(.61,.73,.70);
  color=mix(color,haze,farAway*.70);
  gl_FragColor=vec4(color,uReveal);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 const geometry=new THREE.PlaneGeometry(190,200,mobile?100:210,mobile?100:210);
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,
  transparent:true,depthWrite:true,side:THREE.DoubleSide});
 const ocean=new THREE.Mesh(geometry,material);
 ocean.rotation.x=-Math.PI/2;ocean.position.set(0,seaLevel,-65);
 ocean.frustumCulled=false;ocean.visible=false;scene.add(ocean);
 function rippleHeight(x,z,time){
  let h=0;
  for(const p of impulses){
   const age=time-p.z;
   if(age<0||age>8)continue;
   const r=Math.hypot(x-p.x,z-p.y)-age*1.65;
   h+=p.w*Math.sin(r*7.5)*Math.exp(-r*r*1.2)*Math.exp(-age*.48);
  }
  return h;
 }
 function sampleSurface(x,z,time){
  let height=0,dx=0,dz=0;
  for(const b of waveBands){
   const a=(x*b.ax+z*b.az)*b.k-time*b.speed+b.phase;
   height+=b.amplitude*Math.sin(a);
   dx+=b.amplitude*Math.cos(a)*b.k*b.ax;
   dz+=b.amplitude*Math.cos(a)*b.k*b.az;
  }
  const e=.026;
  height+=rippleHeight(x,z,time);
  dx+=(rippleHeight(x+e,z,time)-rippleHeight(x-e,z,time))/(2*e);
  dz+=(rippleHeight(x,z+e,time)-rippleHeight(x,z-e,time))/(2*e);
  return {height,dx,dz};
 }
 function addRipple(x,z){
  if(reduce.matches||lastReveal<.95||!Number.isFinite(x)||!Number.isFinite(z))return;
  impulses[head].set(x,z,clock,.11);head=(head+1)%impulses.length;
  window.__oceanLastTap={x:+x.toFixed(3),z:+z.toFixed(3),at:clock};
  stage.dataset.rippleCount=String(Number(stage.dataset.rippleCount||0)+1);
 }
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-seaLevel);
 const hit=new THREE.Vector3();let down=null;
 stage.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||reduce.matches)return;
  const r=stage.getBoundingClientRect();
  pointerTarget.x=clamp((event.clientX-r.left)/r.width*2-1,-1,1);
  pointerTarget.y=clamp(1-(event.clientY-r.top)/r.height*2,-1,1);
 },{passive:true});
 stage.addEventListener('pointerleave',()=>{pointerTarget.x=pointerTarget.y=0;down=null;});
 stage.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY,id:event.pointerId,at:performance.now()};},{passive:true});
 stage.addEventListener('pointercancel',()=>{down=null;},{passive:true});
 stage.addEventListener('pointerup',event=>{
  const start=down;down=null;
  if(!start||start.id!==event.pointerId||performance.now()-start.at>850||Math.hypot(start.x-event.clientX,start.y-event.clientY)>9)return;
  if(event.target.closest('button,a')||window.NAStory?.travel>.02)return;
  const r=stage.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),camera);
  if(ray.ray.intersectPlane(plane,hit)&&Math.abs(hit.x)<32&&hit.z<16&&hit.z>-35)addRipple(hit.x,hit.z);
 },{passive:true});
 window.addEventListener('ocean-ripple',()=>addRipple(boatX-1.7,boatZ+1));
 const oldColor=new THREE.Color(),look=new THREE.Vector3(),reflectedLook=new THREE.Vector3();
 function renderReflection(){
  if(!ocean.visible||reflectionFrame++%2)return;
  camera.updateMatrixWorld();
  reflectedCamera.copy(camera);
  reflectedCamera.position.set(camera.position.x,2*seaLevel-camera.position.y,camera.position.z);
  camera.getWorldDirection(look);look.add(camera.position);
  reflectedLook.set(look.x,2*seaLevel-look.y,look.z);
  reflectedCamera.up.set(0,-1,0);reflectedCamera.lookAt(reflectedLook);
  reflectedCamera.updateMatrixWorld();reflectedCamera.updateProjectionMatrix();
  reflectionMatrix.copy(bias).multiply(reflectedCamera.projectionMatrix).multiply(reflectedCamera.matrixWorldInverse);
  const oldTarget=renderer.getRenderTarget();
  renderer.getClearColor(oldColor);const oldAlpha=renderer.getClearAlpha();
  const oldShadow=renderer.shadowMap.autoUpdate;
  ocean.visible=false;renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(reflection);renderer.setClearColor(0x000000,0);renderer.clear();
  renderer.render(scene,reflectedCamera);
  renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);
  renderer.shadowMap.autoUpdate=oldShadow;ocean.visible=true;
 }
 function update(progress,time,options={}){
  const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
  const ease=1-Math.exp(-dt*3.2);
  pointer.x=reduce.matches?0:pointer.x+(pointerTarget.x-pointer.x)*ease;
  pointer.y=reduce.matches?0:pointer.y+(pointerTarget.y-pointer.y)*ease;
  clock=reduce.matches?0:time;
  boatX=options.boatX??1.8;boatZ=options.boatZ??0;
  lastReveal=smooth(.82,.975,progress);
  uniforms.uTime.value=clock;uniforms.uReveal.value=lastReveal;
  uniforms.uBoat.value.set(boatX,boatZ);
  ocean.visible=lastReveal>.001;
 }
 return {update,sea:ocean,sampleSurface,renderReflection,pointer,
  waveVertices:geometry.attributes.position.count,get reveal(){return lastReveal;},
  diagnostics:{version:44,engine:'real-time reflected GPU ocean',timeIndependentOfScroll:true,
   waveFamilies:waveBands.length,waterMesh:true,planarReflection:true,touchRipples:true,
   sameWaveEquationForBoat:true,reduceMotionSupported:true}};
}
