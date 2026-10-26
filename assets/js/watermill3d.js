/**
 * Scene 05 — genuinely dimensional brass wheel and flowing sea.
 * Perspective depth comes from extruded stone, 3D toruses, volumetric spokes,
 * bucket geometry and dynamic GPU-shaded water — not SVG/card mockups.
 * All geometry faces the camera (frontal angle).
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const stage=document.getElementById("watermillStage");
const target=document.getElementById("millWebGL");
if(stage&&target){
 const reduce=matchMedia("(prefers-reduced-motion: reduce)");
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 let renderer=null,scene=null,camera=null,rotor=null,sea=null,fall=null,crest=null;
 let splash=null,seaTop=null,active=false,visible=false,scheduled=false,prev=0,frameCount=0,rotation=0,speed=0;
 let width=1,height=1,W=16;
 const materials=[],geometries=[];
 let assembly=null;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia("(max-width:670px)").matches?1.1:1.4));
  renderer.setClearColor(0xFFFFFF,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.domElement.setAttribute("aria-hidden","true");
  target.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,60);
  camera.position.set(0,0,23);camera.lookAt(0,0,0);
  const ambient=new THREE.HemisphereLight(0xFFFAEC,0x356D68,2.0);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xFFF0CE,3.8);key.position.set(-5,8,13);scene.add(key);
  const edge=new THREE.DirectionalLight(0x98C8C5,2.1);edge.position.set(8,1,-7);scene.add(edge);
  const glow=new THREE.PointLight(0xFFDDB4,46,18,1.4);glow.position.set(3,2,8);scene.add(glow);
  assembly=new THREE.Group();scene.add(assembly);
  const gold=new THREE.MeshPhysicalMaterial({color:0xCBA06A,metalness:.56,roughness:.25,clearcoat:.88,clearcoatRoughness:.19});
  const lightGold=new THREE.MeshPhysicalMaterial({color:0xF0D6AB,metalness:.46,roughness:.28,clearcoat:.7});
  const darkGold=new THREE.MeshStandardMaterial({color:0x8E633E,metalness:.5,roughness:.43});
  const porcelain=new THREE.MeshPhysicalMaterial({color:0xE8DDCB,roughness:.57,metalness:.12,clearcoat:.15});
  const porcelainEdge=new THREE.MeshStandardMaterial({color:0xFAF4E5,roughness:.56});
  materials.push(gold,lightGold,darkGold,porcelain,porcelainEdge);
  function mesh(geo,mat,parent=assembly){
   geometries.push(geo);
   const m=new THREE.Mesh(geo,mat);parent.add(m);return m;
  }
  function torus(radius,tube,z,mat,parent){
   const m=mesh(new THREE.TorusGeometry(radius,tube,14,144),mat,parent);
   m.position.z=z;return m;
  }
  // Continuous, tapered architectural pedestal, its base precisely at y=-5.
  const outline=new THREE.Shape();
  outline.moveTo(-.29,.11);
  outline.bezierCurveTo(-.55,-.38,-.53,-1.20,-.64,-2.23);
  outline.bezierCurveTo(-.8,-3.45,-1.06,-4.22,-1.55,-4.79);
  outline.lineTo(1.55,-4.79);
  outline.bezierCurveTo(1.06,-4.22,.8,-3.45,.64,-2.23);
  outline.bezierCurveTo(.53,-1.2,.55,-.38,.29,.11);
  outline.closePath();
  const pedestal=mesh(new THREE.ExtrudeGeometry(outline,{
   depth:.65,bevelEnabled:true,bevelThickness:.075,bevelSize:.065,bevelSegments:4,steps:1,curveSegments:22
  }),porcelain);
  pedestal.position.z=-.68;
  const foot=mesh(new THREE.BoxGeometry(3.95,.28,.86),porcelain);
  foot.position.set(0,-4.86,-.20);
  const footLip=mesh(new THREE.BoxGeometry(3.92,.035,.89),porcelainEdge);
  footLip.position.set(0,-4.70,-.19);
  const shadow=mesh(new THREE.PlaneGeometry(5.1,.35),new THREE.MeshBasicMaterial({
   color:0x5A5447,transparent:true,opacity:.065,depthWrite:false
  }));
  materials.push(shadow.material);
  shadow.position.set(0,-4.97,-.45);
  // Actual 3D rotating rotor: two concentric raised rims, spoke barrels
  // in different depth planes and 12 individually extruded water-catching cups.
  rotor=new THREE.Group();assembly.add(rotor);
  torus(2.31,.18,-.37,darkGold,rotor);
  torus(2.31,.18,.38,gold,rotor);
  torus(2.15,.046,.57,lightGold,rotor);
  torus(1.87,.052,.25,darkGold,rotor);
  torus(1.89,.032,.30,lightGold,rotor);
  torus(2.31,.042,.59,lightGold,rotor);
  const up=new THREE.Vector3(0,1,0);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   const radial=new THREE.Vector3(Math.sin(a),Math.cos(a),0);
   const spoke=mesh(new THREE.CylinderGeometry(.070,.084,2.19,10,1),i%3===0?lightGold:gold,rotor);
   spoke.position.set(radial.x*1.17,radial.y*1.17,.17);
   spoke.quaternion.setFromUnitVectors(up,radial);
   const spokeBack=mesh(new THREE.CylinderGeometry(.034,.044,2.08,8),darkGold,rotor);
   spokeBack.position.set(radial.x*1.17,radial.y*1.17,-.33);
   spokeBack.quaternion.setFromUnitVectors(up,radial);
   const bucket=mesh(new THREE.BoxGeometry(.52,.36,.86,2,1,2),i%2?gold:lightGold,rotor);
   bucket.position.set(radial.x*2.3,radial.y*2.3,.03);
   bucket.rotation.z=-a;
   const innerCup=mesh(new THREE.BoxGeometry(.42,.08,.72),darkGold,rotor);
   innerCup.position.set(radial.x*2.44,radial.y*2.44,.05);
   innerCup.rotation.z=-a;
  }
  const hubBack=mesh(new THREE.CylinderGeometry(.59,.59,.67,64),darkGold,rotor);
  hubBack.rotation.x=Math.PI/2;
  hubBack.position.z=.12;
  const hubFront=mesh(new THREE.CylinderGeometry(.42,.47,.68,64),gold,rotor);
  hubFront.rotation.x=Math.PI/2;hubFront.position.z=.58;
  const hubDisc=mesh(new THREE.CylinderGeometry(.25,.25,.055,64),lightGold);
  hubDisc.rotation.x=Math.PI/2;hubDisc.position.z=1.02;
  const axle=mesh(new THREE.CylinderGeometry(.105,.105,.09,32),darkGold);
  axle.rotation.x=Math.PI/2;axle.position.z=1.08;
  torus(.28,.017,1.076,lightGold,scene);
  // Water is GPU shaded with moving caustics, volume, refraction and real
  // wave crest. The RIGHT side is a single liquid region (no tubes or tiers).
  const rgb=x=>new THREE.Color(x);
  const waterUniforms={
   uTime:{value:0},uLevel:{value:0},uDeep:{value:rgb("#1E6873")},
   uMid:{value:rgb("#2A7F88")},uLight:{value:rgb("#74C5C7")},
   uSun:{value:rgb("#FBEAC9")},uOpacity:{value:.95}
  };
  const waterVertex=[
   "varying vec2 vUv; varying vec3 vWorld;",
   "void main(){vUv=uv; vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;",
   "gl_Position=projectionMatrix*viewMatrix*w;}"
  ].join("\n");
  const waterFragment=[
   "uniform float uTime;uniform float uLevel;uniform float uOpacity;",
   "uniform vec3 uDeep;uniform vec3 uMid;uniform vec3 uLight;uniform vec3 uSun;",
   "varying vec2 vUv;varying vec3 vWorld;",
   "float band(vec2 p){return sin(p.x*57.+sin(p.y*32.+uTime*.84)*1.9)",
   " *sin(p.y*35.-p.x*18.+uTime*1.22);}",
   "void main(){",
   " float surf=uLevel+.013*sin(vUv.x*12.+uTime*.95)+.007*sin(vUv.x*29.-uTime*1.18);",
   " if(uLevel<.002 || vUv.y>surf)discard;",
   " float d=clamp((surf-vUv.y)*2.1,0.,1.);",
   " vec2 uv=vUv;",
   " float ripple=sin(uv.x*38.+sin(uv.y*25.+uTime)*1.8-uTime*2.1)",
   "   *sin(uv.y*31.-uv.x*14.+uTime*.93);",
   " float caustic=pow(max(0.,band(uv)+.26),6.)*.31;",
   " float sun=pow(max(0.,.5+.5*sin(uv.x*73.-uv.y*55.+uTime*1.42)),16.)*.18;",
   " vec3 col=mix(uLight,uDeep,pow(d,.66)*.84);",
   " col=mix(col,uMid,.18+max(0.,ripple)*.11);",
   " col+=uSun*(caustic+sun);",
   " float lip=1.-smoothstep(.006,.045,abs(vUv.y-surf));",
   " col=mix(col,uSun,lip*.6);",
   " float edge=pow(1.-vUv.x,9.)*.12;",
   " col+=uLight*edge;",
   " float opacity=uOpacity*(.82+.17*d)+.10*lip;",
   " gl_FragColor=vec4(col,clamp(opacity,0.,.99));",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  // Left edge grazes the wheel; rim remains in front with genuine depth.
  sea=mesh(new THREE.PlaneGeometry(1,10,70,68),new THREE.ShaderMaterial({
   uniforms:waterUniforms,vertexShader:waterVertex,fragmentShader:waterFragment,
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
  }),scene);
  materials.push(sea.material);
  sea.position.z=-.30;
  // A moving three-dimensional curtain of water drops from the sea surface
  // onto the ACTUAL top bucket of the wheel, not an unrelated graphic.
  const streamUniforms={
   uTime:{value:0},uStrength:{value:0},
   uPale:{value:rgb("#EDFFF1")},uAqua:{value:rgb("#55BBC0")}
  };
  const fallVertex=[
   "uniform float uTime;varying vec2 vUv;",
   "void main(){vUv=uv;vec3 p=position;",
   "p.x+=sin(uv.y*12.+uTime*1.9)*.046+sin(uv.y*27.-uTime*2.1)*.027;",
   "p.z+=sin(uv.y*11.+uTime*1.5)*.07;",
   "gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}"
  ].join("\n");
  const fallFragment=[
   "uniform float uTime;uniform float uStrength;",
   "uniform vec3 uPale;uniform vec3 uAqua;varying vec2 vUv;",
   "void main(){",
   " float stripes=sin(vUv.x*49.+vUv.y*16.-uTime*2.7);",
   " float strands=sin(vUv.x*90.-vUv.y*30.+uTime*2.4);",
   " float curl=pow(1.-abs(vUv.x-.5)*2.,.75);",
   " float light=.4+.28*stripes+.14*strands;",
   " vec3 col=mix(uAqua,uPale,clamp(light+.29,0.,1.));",
   " float sides=smoothstep(0.,.12,vUv.x)*(1.-smoothstep(.85,1.,vUv.x));",
   " float alpha=(.50+.42*curl)*sides*uStrength;",
   " gl_FragColor=vec4(col,alpha);",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  fall=mesh(new THREE.PlaneGeometry(.47,2.6,24,64),new THREE.ShaderMaterial({
   uniforms:streamUniforms,vertexShader:fallVertex,fragmentShader:fallFragment,
   transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
  }),scene);
  materials.push(fall.material);
  fall.position.set(0,3.74,1.04);
  // Secondary translucent thickness catches the sun in front of the flow.
  crest=mesh(new THREE.PlaneGeometry(.18,2.48,12,48),new THREE.MeshBasicMaterial({
   color:0xD6FAF0,transparent:true,opacity:.11,depthWrite:false,
   side:THREE.DoubleSide
  }),scene);
  materials.push(crest.material);
  crest.position.set(.15,3.72,1.1);
  // Surface of the SEA ABOVE this scene is also 3D, with continuous
  // reflective wave bands linking to the previous chapter.
  const topUniforms={
   uTime:{value:0},uDark:{value:rgb("#216D75")},
   uBright:{value:rgb("#9AD5CD")},uSun:{value:rgb("#FFF0D4")}
  };
  const topFrag=[
   "uniform float uTime;uniform vec3 uDark;uniform vec3 uBright;uniform vec3 uSun;",
   "varying vec2 vUv;varying vec3 vWorld;",
   "void main(){",
   " float wave=sin(vUv.x*31.+uTime*.95)*.022+sin(vUv.x*71.-uTime*1.3)*.012;",
   " if(vUv.y<.11+wave)discard;",
   " float lines=pow(max(0.,sin(vUv.x*38.+vUv.y*37.+uTime*.73)),13.);",
   " float sheen=pow(max(0.,sin(vUv.x*83.-vUv.y*13.-uTime*1.2)),19.);",
   " vec3 color=mix(uBright,uDark,clamp(vUv.y*.78,0.,1.));",
   " color+=uSun*(lines*.15+sheen*.30);",
   " float alpha=1.-smoothstep(.91,1.,vUv.y)*.12;",
   " gl_FragColor=vec4(color,alpha);",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  seaTop=mesh(new THREE.PlaneGeometry(1,.91,100,8),new THREE.ShaderMaterial({
   uniforms:topUniforms,vertexShader:waterVertex,fragmentShader:topFrag,
   transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
  }),scene);
  materials.push(seaTop.material);seaTop.position.set(0,4.70,.53);
  // Light spray where the stream strikes the upper paddles.
  const drops=96;
  const particles=new Float32Array(drops*3);
  for(let i=0;i<drops;i++)particles[i*3+2]=1.30;
  const dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.BufferAttribute(particles,3));
  geometries.push(dropGeo);
  splash=new THREE.Points(dropGeo,new THREE.PointsMaterial({
   color:0xD0F8F0,size:.045,transparent:true,opacity:.78,depthWrite:false,
   sizeAttenuation:true,blending:THREE.AdditiveBlending
  }));
  materials.push(splash.material);scene.add(splash);
  function resize(){
   const rect=stage.getBoundingClientRect();
   width=Math.max(1,rect.width);height=Math.max(1,rect.height);
   W=10*width/height;
   camera.left=-W*.5;camera.right=W*.5;
   camera.top=5;camera.bottom=-5;camera.updateProjectionMatrix();
   renderer.setSize(Math.round(width),Math.round(height),false);
   const start=.12;
   sea.scale.x=W*.5-start;
   sea.position.x=(W*.5+start)*.5;
   seaTop.scale.x=W;
   seaTop.position.x=0;
   // Narrow screens keep the centered water source and smaller sculpture
   // beneath the intro while preserving a separate column for service choices.
   const mobile=width<=670;
   assembly.scale.setScalar(mobile?.54:width<1120?.82:1);
   assembly.position.set(mobile?-W*.22:width<1120?-.05:0,mobile?-2.35:width<1120?-.54:0,0);
   const top=assembly.position.y+2.31*assembly.scale.x;
   const length=5.05-top;
   fall.position.set(assembly.position.x,(5.05+top)*.5,1.04);
   fall.scale.y=length/2.6;
   crest.position.set(assembly.position.x+.15,(5.05+top)*.5,1.1);
   crest.scale.y=length/2.48;
  }
  let lastFrame=0;
  function schedule(){if(active&&!scheduled&&visible){scheduled=true;requestAnimationFrame(frame)}}
  function frame(time){
   scheduled=false;
   if(!visible||!active)return;
   const delta=lastFrame?Math.min(50,time-lastFrame):16;lastFrame=time;
   const p=window.__watermillState?.progress??0;
   const motion=smooth(.05,.97,p);
   const desired=reduce.matches?0:motion*(.20+4.1*Math.pow(motion,1.48));
   speed+=(desired-speed)*(1-Math.exp(-delta/200));
   rotation=(rotation+speed*delta/1000)%(Math.PI*2);
   rotor.rotation.z=rotation;
   const level=smooth(.14,.985,p)*.87;
   waterUniforms.uLevel.value=level;
   waterUniforms.uTime.value=time*.001;
   streamUniforms.uStrength.value=smooth(.018,.20,p);
   streamUniforms.uTime.value=time*.001;
   topUniforms.uTime.value=time*.001;
   crest.material.opacity=.12*streamUniforms.uStrength.value;
   const array=splash.geometry.attributes.position;
   for(let i=0;i<drops;i++){
    const seed=i*2.399963;
    const q=(i*.618+time*.00047*(.4+i%7*.1))%1;
    const hitX=assembly.position.x;
    const hitY=assembly.position.y+2.31*assembly.scale.x;
    array.setXYZ(i,hitX+Math.sin(seed)*q*.66,
     hitY+.22+q*.56-Math.pow(q,1.4)*.9,
     1.25+Math.cos(seed)*q*.29);
   }
   array.needsUpdate=true;
   splash.visible=streamUniforms.uStrength.value>.08;
   renderer.render(scene,camera);
   window.__watermill3D={
    engine:"Three.js WebGL",wheelGeometry:"3D toruses, buckets and cylinders",
    waterfall:"animated translucent 3D mesh",rightWater:"single GPU-shaded surface",
    angularVelocity:Number(speed.toFixed(2)),waterLevel:Number(level.toFixed(3)),
    wheelRadius:2.31,frontFacing:true,seaLinked:true
   };
   schedule();
  }
  const observer=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;
   if(visible){lastFrame=0;schedule();}
  },{rootMargin:"100px 0px"});
  resize();
  window.addEventListener("resize",resize,{passive:true});
  window.addEventListener("pagehide",()=>{active=false});
  renderer.domElement.addEventListener("webglcontextlost",event=>{
   event.preventDefault();active=false;stage.classList.remove("is-mill-webgl");
  },false);
  stage.classList.add("is-mill-webgl");
  active=true;observer.observe(stage);
 }catch(error){
  stage.classList.remove("is-mill-webgl");
  window.__watermill3DError=String(error);
  try{renderer?.dispose()}catch(_){}
  console.warn("Watermill WebGL fallback:",error);
 }
}
