/** Scene 05: folded cotton-paper wheel, continuous flow and rising water. */
import * as THREE from "three";
import {createPaperMaterialMaps} from "./paper-materials.js?v=11-pbr-paper";

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
 let waterSurface3D=null,waterSurfaceBase=null;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia("(max-width:670px)").matches?1.1:1.4));
  renderer.setClearColor(0xFFFFFF,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.domElement.setAttribute("aria-hidden","true");
  target.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,60);
  camera.position.set(0,0,23);camera.lookAt(0,0,0);
  // Broad warm studio keys replace chrome-like lighting.
  const ambient=new THREE.HemisphereLight(0xF7F5EA,0x466C69,1.45);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xFFF0D7,2.65);key.position.set(-7,9,13);scene.add(key);
  const edge=new THREE.DirectionalLight(0xA9C9C2,1.45);edge.position.set(7,3,-6);scene.add(edge);
  const glow=new THREE.PointLight(0xF8DBB9,17,20,2);glow.position.set(4,5,7);scene.add(glow);
  assembly=new THREE.Group();scene.add(assembly);
  const paperMaps=createPaperMaterialMaps(THREE,renderer,{mobile:matchMedia("(max-width:670px)").matches});
  const paper=(color)=>new THREE.MeshStandardMaterial({color,map:paperMaps.fiber,
   normalMap:paperMaps.normal,normalScale:new THREE.Vector2(.13,.13),
   roughnessMap:paperMaps.roughness,roughness:.94,metalness:0,side:THREE.DoubleSide});
  const ivory=paper(0xf2ead8),sage=paper(0x9bb6a4),shade=paper(0x718f80),copper=paper(0xb38165);
  materials.push(ivory,sage,shade,copper);
  function mesh(geo,mat,parent=assembly){
   geometries.push(geo);
   const m=new THREE.Mesh(geo,mat);parent.add(m);return m;
  }
  // A twelve-sided folded annulus has distinct front, back and edge planes.
  // The same fibrous material as the paper boat is used for every surface.
  function ring(radius,thickness,z,material,parent){
   const shape=new THREE.Shape(),hole=new THREE.Path(),n=12;
   for(let i=0;i<=n;i++){
    const a=i*Math.PI*2/n, x=Math.sin(a)*radius,y=Math.cos(a)*radius;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    const ah=-a,hx=Math.sin(ah)*(radius-thickness),hy=Math.cos(ah)*(radius-thickness);
    if(i===0)hole.moveTo(hx,hy);else hole.lineTo(hx,hy);
   }
   shape.holes.push(hole);
   const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,steps:1}),material,parent);
   m.position.z=z;return m;
  }
  // A folded A-frame replaces the heavy mineral pedestal.
  const stand=new THREE.Shape();
  stand.moveTo(-.26,.25);stand.lineTo(-1.40,-4.79);stand.lineTo(1.40,-4.79);
  stand.lineTo(.26,.25);stand.closePath();
  const support=mesh(new THREE.ExtrudeGeometry(stand,{depth:.46,bevelEnabled:false}),ivory);
  support.position.z=-.65;
  const fold=new THREE.BufferGeometry();
  fold.setAttribute('position',new THREE.Float32BufferAttribute([0,.25,-.14,0,-4.79,.05,1.40,-4.79,-.14],3));
  fold.setAttribute('uv',new THREE.Float32BufferAttribute([.5,1,.5,0,1,0],2));fold.computeVertexNormals();
  mesh(fold,sage);
  const foot=mesh(new THREE.BoxGeometry(3.6,.16,.82),ivory);foot.position.set(0,-4.91,-.25);
  const footEdge=mesh(new THREE.BoxGeometry(3.55,.025,.85),sage);footEdge.position.set(0,-4.82,-.24);
  rotor=new THREE.Group();assembly.add(rotor);
  ring(2.43,.20,-.38,shade,rotor);
  ring(2.43,.20,.43,ivory,rotor);
  ring(2.21,.035,.49,sage,rotor);
  const PADDLE_COUNT=12;
  const up=new THREE.Vector3(0,1,0);
  for(let i=0;i<PADDLE_COUNT;i++){
   const a=i*Math.PI*2/PADDLE_COUNT,radial=new THREE.Vector3(Math.sin(a),Math.cos(a),0);
   const spoke=mesh(new THREE.BoxGeometry(.16,2.14,.20),i%3?sage:ivory,rotor);
   spoke.position.set(radial.x*1.20,radial.y*1.20,.08);
   spoke.quaternion.setFromUnitVectors(up,radial);
   const crease=mesh(new THREE.BoxGeometry(.025,2.14,.025),ivory,spoke);
   crease.position.set(-.038,0,.115);
   const cup=new THREE.Group();rotor.add(cup);
   cup.position.set(radial.x*2.32,radial.y*2.32,0);cup.rotation.z=-a;
   // Open trough: folded bottom and two flared lips, never a solid box.
   const points=[[-.30,-.13,-.39],[.30,-.13,-.39],[-.30,-.13,.39],[.30,-.13,.39],
    [-.35,.18,-.52],[.35,.18,-.52],[-.35,.18,.52],[.35,.18,.52]];
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
   geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,.3,1,.3,0,.7,1,.7,0,0,1,0,0,1,1,1],2));
   geo.setIndex([0,2,1,1,2,3,4,0,5,5,0,1,2,6,3,3,6,7]);geo.computeVertexNormals();
   mesh(geo,i%4===0?copper:ivory,cup);
  }
  const hub=mesh(new THREE.CylinderGeometry(.39,.45,.96,12),ivory,rotor);
  hub.rotation.x=Math.PI/2;hub.position.z=.12;
  const cap=mesh(new THREE.CylinderGeometry(.22,.22,.04,8),sage,rotor);
  cap.rotation.x=Math.PI/2;cap.position.z=.64;
  const pin=mesh(new THREE.CylinderGeometry(.065,.065,.055,6),copper);
  pin.rotation.x=Math.PI/2;pin.position.z=.68;
  const rgb=x=>new THREE.Color(x);
  const waterUniforms={
   uTime:{value:0},uLevel:{value:0},uDeep:{value:rgb("#1E6873")},
   uMid:{value:rgb("#2A7F88")},uLight:{value:rgb("#74C5C7")},
   uSun:{value:rgb("#FBEAC9")},uOpacity:{value:.95}
  };
  // Both the top sea and the rising ocean have physical wave displacement.
  // Edges catch light because actual vertices occupy different Z positions.
  const waterVertex=[
   "uniform float uTime;",
   "varying vec2 vUv; varying vec3 vWorld;",
   "void main(){",
   " vUv=uv;vec3 p=position;",
   " float v=sin(uv.x*13.1+uTime*.39)*sin(uv.y*4.7-uTime*.24);",
   " float ripple=sin(uv.x*33.7-uTime*.63+uv.y*8.3);",
   " p.z+=.075*v+.018*ripple+.20*pow(1.-uv.x,12.);",
   " p.y+=.014*sin(uv.x*18.7+uTime*.52);",
   " vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;",
   " gl_Position=projectionMatrix*viewMatrix*w;",
   "}"
  ].join("\n");
  // A layered body of water, not a repeating caustics screensaver.
  // Low-frequency refraction and soft irregular sun patches preserve its mass.
  const waterFragment=[
   "uniform float uTime;uniform float uLevel;uniform float uOpacity;",
   "uniform vec3 uDeep;uniform vec3 uMid;uniform vec3 uLight;uniform vec3 uSun;",
   "varying vec2 vUv;varying vec3 vWorld;",
   "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
   "float noise(vec2 p){vec2 i=floor(p),f=fract(p);",
   " f=f*f*(3.-2.*f);",
   " return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),",
   " mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}",
   "void main(){",
   " vec2 uv=vUv;float t=uTime;",
   " float swell=.0065*sin(uv.x*12.7+t*.62)+.0035*sin(uv.x*25.3-t*.53);",
   " float surf=uLevel+swell;",
   " if(uLevel<.002||uv.y>surf)discard;",
   " float depth=clamp((surf-uv.y)/max(surf,.12),0.,1.);",
   " float warp=noise(uv*vec2(3.8,4.9)+vec2(t*.11,-t*.075))-.5;",
   " vec2 f=uv*vec2(6.8,7.8)+vec2(warp*.7,warp*.9);",
   " float caustic=noise(f+vec2(t*.21,-t*.15));",
   " caustic=mix(caustic,noise(f*1.78-vec2(t*.07,t*.11)),.30);",
   " float broad=sin(uv.x*7.3+uv.y*6.9+t*.32+warp*.7);",
   " float shade=.018*broad+.032*(caustic-.5);",
   " // Transmitted daylight falls off inside the liquid with depth.",
   " float opticalDepth=1.-exp(-depth*2.8);",
   " vec3 col=mix(uLight,uDeep,opticalDepth*.83);",
   " col=mix(col,uMid,.10+max(0.,warp)*.12);",
   " float diffuse=.045*max(0.,caustic-.38)*max(.12,1.-depth);",
   " col+=uSun*(.012+diffuse);",
   " col+=uLight*(shade*.6);",
   " // Fresnel-style grazing reflections at the edges and waterline.",
   " float nX=.008*cos(uv.x*12.7+t*.62)+.006*cos(uv.x*25.3-t*.53);",
   " float edgeGrazing=pow(clamp(abs(nX)*10.+pow(1.-uv.x,5.),0.,1.),3.);",
   " col+=uSun*edgeGrazing*.12;",
   " float rim=1.-smoothstep(0.,.016,abs(uv.y-surf));",
   " col=mix(col,uLight+uSun*.10,rim*.42);",
   " col+=uSun*((1.-depth)*.045);",
   " float opacity=clamp(uOpacity*(.75+.19*opticalDepth)+rim*.10,0.,.96);",
   " gl_FragColor=vec4(col,opacity);",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  // Left edge grazes the wheel; rim remains in front with genuine depth.
  sea=mesh(new THREE.PlaneGeometry(1,10,100,80),new THREE.ShaderMaterial({
   uniforms:waterUniforms,vertexShader:waterVertex,fragmentShader:waterFragment,
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
  }),scene);
  materials.push(sea.material);
  sea.position.z=-.30;
  // The moving lip is a separate small, curved GPU surface in front of the
  // volume: a real 3D edge with shimmer, not a hard flat dividing line.
  const surfaceUniforms={uTime:waterUniforms.uTime,uLevel:waterUniforms.uLevel,
   uSun:waterUniforms.uSun,uLight:waterUniforms.uLight};
  const surfaceVertex=[
   "uniform float uTime; varying vec2 vUv;",
   "void main(){vUv=uv;vec3 p=position;",
   "p.y+=.035*sin(uv.x*12.7+uTime*.62)+.018*sin(uv.x*25.3-uTime*.53);",
   "p.z+=.08*sin(uv.x*10.5+uTime*.38)+.025*cos(uv.x*23.6-uTime*.71);",
   "gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}"
  ].join("\n");
  const surfaceFragment=[
   "uniform float uTime;uniform vec3 uSun;uniform vec3 uLight;",
   "varying vec2 vUv;",
   "void main(){",
   " float center=1.-abs(vUv.y-.5)*2.;",
   " float beam=.60+.24*sin(vUv.x*10.7+uTime*.57)+.16*sin(vUv.x*28.1-uTime*.34);",
   " vec3 col=mix(uLight,uSun,.16+.15*beam);",
   " gl_FragColor=vec4(col,pow(max(0.,center),2.2)*.24);",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  const surface=mesh(new THREE.PlaneGeometry(1,.17,128,8),new THREE.ShaderMaterial({
   uniforms:surfaceUniforms,vertexShader:surfaceVertex,fragmentShader:surfaceFragment,
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
  }),scene);
  materials.push(surface.material);
  surface.position.z=.26;
  // A real tilted surface plane defines the water's visible thickness at
  // the moving waterline. It refracts the background using a physically
  // based dielectric material rather than drawing all water as a flat mask.
  const sheetGeo=new THREE.PlaneGeometry(1,1.45,68,10);
  waterSurfaceBase=new Float32Array(sheetGeo.attributes.position.array);
  waterSurface3D=mesh(sheetGeo,new THREE.MeshPhysicalMaterial({
   color:0xA5D5D0,metalness:0,roughness:.16,
   ior:1.333,transmission:.27,thickness:.42,transparent:true,
   opacity:.48,depthWrite:false,side:THREE.DoubleSide,
   clearcoat:.25,clearcoatRoughness:.22,envMapIntensity:.48
  }),scene);
  materials.push(waterSurface3D.material);
  waterSurface3D.rotation.x=-1.12;
  waterSurface3D.position.z=.50;
  waterSurface3D.visible=false;
  // A moving three-dimensional curtain of water drops from the sea surface
  // onto the ACTUAL top bucket of the wheel, not an unrelated graphic.
  const streamUniforms={
   uTime:{value:0},uStrength:{value:0},uBend:{value:0},
   uPale:{value:rgb("#EDFFF1")},uAqua:{value:rgb("#55BBC0")}
  };
  // Waterfall glints are slow, irregular and edge-feathered; never parallel
  // fluorescent threads. The shader flows over a translucent 3D water core.
  const fallVertex=[
   "uniform float uTime;uniform float uBend;varying vec2 vUv;",
   "void main(){vUv=uv;vec3 p=position;",
   "float bend=.040*sin(uv.y*7.4+uTime*1.1)+.024*sin(uv.y*16.-uTime*1.7);",
   "p.x+=bend+.024*sin(uv.x*9.+uv.y*12.+uTime*1.2)+uBend*smoothstep(.58,1.10,p.y+1.3);",
   "p.z+=.045*cos(uv.y*8.-uTime*1.13);",
   "gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}"
  ].join("\n");
  const fallFragment=[
   "uniform float uTime;uniform float uStrength;",
   "uniform vec3 uPale;uniform vec3 uAqua;varying vec2 vUv;",
   "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
   "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
   "return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),",
   "mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}",
   "void main(){",
   " vec2 uv=vUv;float t=uTime;",
   " float distort=noise(uv*vec2(4.,9.)+vec2(t*.3,-t*.68));",
   " float curl=.5+.5*sin((uv.x+distort*.12)*10.5+uv.y*5.-t*.67);",
   " float droplets=noise(uv*vec2(9.,17.)+vec2(t*.26,-t*1.15));",
   " float light=.24+.25*curl+.22*droplets;",
   " vec3 col=mix(uAqua,uPale,clamp(light,0.,.9));",
   " float sides=smoothstep(0.,.16,uv.x)*(1.-smoothstep(.86,1.,uv.x));",
   " float center=1.-abs(uv.x-.5)*2.;",
   " float alpha=(.36+.25*center+.13*droplets)*sides*uStrength;",
   " gl_FragColor=vec4(col,clamp(alpha,0.,.75));",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  fall=mesh(new THREE.PlaneGeometry(.47,2.6,24,64),new THREE.ShaderMaterial({
   uniforms:streamUniforms,vertexShader:fallVertex,fragmentShader:fallFragment,
   transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
  }),scene);
  materials.push(fall.material);
  fall.position.set(0,3.74,1.04);
  // Slightly warped cylindrical volume behind the fluid skin. Reflections
  // travel over curved faces and convey thickness without pipes or machinery.
  const fallCoreGeometry=new THREE.CylinderGeometry(.155,.205,2.6,20,38,true);
  const corePos=fallCoreGeometry.attributes.position;
  for(let i=0;i<corePos.count;i++){
   const x=corePos.getX(i),y=corePos.getY(i),z=corePos.getZ(i);
   const turbulence=1+.085*Math.sin(y*5.3)+.044*Math.sin(y*13.7);
   corePos.setXYZ(i,x*turbulence+.035*Math.sin(y*3.4),y,z*turbulence);
  }
  fallCoreGeometry.computeVertexNormals();
  const waterCoreMaterial=new THREE.MeshPhysicalMaterial({
   color:0x8FC8C9,metalness:0,roughness:.095,transmission:.57,
   thickness:.44,transparent:true,opacity:.40,depthWrite:false,
   side:THREE.DoubleSide,clearcoat:.22,clearcoatRoughness:.12,
   envMapIntensity:.75,ior:1.333
  });
  materials.push(waterCoreMaterial);
  const waterCore=mesh(fallCoreGeometry,waterCoreMaterial,scene);
  waterCore.position.set(0,3.74,.86);
  // Secondary translucent thickness catches the sun in front of the flow.
  crest=mesh(new THREE.PlaneGeometry(.18,2.48,12,48),new THREE.MeshBasicMaterial({
   color:0xD6FAF0,transparent:true,opacity:.11,depthWrite:false,
   side:THREE.DoubleSide
  }),scene);
  materials.push(crest.material);
  crest.position.set(.15,3.72,1.1);
  const outletUniforms={...streamUniforms,uStrength:{value:.7},uBend:{value:0}};
  const outletGeometry=new THREE.PlaneGeometry(1,1,36,1);
  const outletUV=outletGeometry.attributes.uv;
  const outlet=mesh(outletGeometry,new THREE.ShaderMaterial({uniforms:outletUniforms,
   vertexShader:fallVertex,fragmentShader:fallFragment,transparent:true,
   side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),scene);
  materials.push(outlet.material);
  function updateOutlet(level){
   const scale=assembly.scale.x,startX=assembly.position.x+2.15*scale;
   const startY=assembly.position.y-.72*scale;
   const endX=Math.min(W*.46,startX+2.3),endY=Math.min(startY-.18,-5+10*level);
   const attr=outletGeometry.attributes.position;
   for(let i=0;i<attr.count;i++){
    const q=outletUV.getX(i),side=outletUV.getY(i)-.5;
    const x=THREE.MathUtils.lerp(startX,endX,q);
    const y=THREE.MathUtils.lerp(startY,endY,q)+Math.sin(q*Math.PI)*.26;
    attr.setXYZ(i,x,y+side*.16,1.10);
   }
   attr.needsUpdate=true;
   // At a full reservoir the same current continues beneath the surface.
   outlet.material.opacity=1;
   outletUniforms.uStrength.value=.64*(1-.65*smooth(.5,.87,level));
  }
  // Surface of the SEA ABOVE this scene is also 3D, with continuous
  // reflective wave bands linking to the previous chapter.
  const topUniforms={
   uTime:{value:0},uDark:{value:rgb("#216D75")},
   uBright:{value:rgb("#9AD5CD")},uSun:{value:rgb("#FFF0D4")}
  };
  // Sea inherited from scene 04: broad glints and moving wavelets,
  // avoiding the previous repeated diagonal-wireframe appearance.
  const topFrag=[
   "uniform float uTime;uniform vec3 uDark;uniform vec3 uBright;uniform vec3 uSun;",
   "varying vec2 vUv;varying vec3 vWorld;",
   "void main(){",
   " float t=uTime;vec2 uv=vUv;",
   " float wave=.014*sin(uv.x*18.3+t*.59)+.008*sin(uv.x*37.4-t*.76);",
   " if(uv.y<.13+wave)discard;",
   " float broad=.5+.5*sin(uv.x*16.5+sin(uv.y*10.7+t*.23)*.49+t*.59);",
   " float ripple=.5+.5*sin(uv.x*29.4-uv.y*8.3-t*.71);",
   " vec3 color=mix(uDark,uBright,clamp(.38+.30*(1.-uv.y)+.08*broad,0.,1.));",
   " float diffuseGlow=.018+.045*pow(broad,7.)*ripple;",
   " color+=uSun*diffuseGlow;",
   " gl_FragColor=vec4(color,.96);",
   " #include <colorspace_fragment>",
   "}"
  ].join("\n");
  seaTop=mesh(new THREE.PlaneGeometry(1,.91,100,8),new THREE.ShaderMaterial({
   uniforms:topUniforms,vertexShader:waterVertex,fragmentShader:topFrag,
   transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
  }),scene);
  materials.push(seaTop.material);seaTop.position.set(0,4.70,.53);
  // Light spray where the stream strikes the upper paddles.
  const drops=180;
  const particles=new Float32Array(drops*3);
  for(let i=0;i<drops;i++)particles[i*3+2]=1.30;
  const dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.BufferAttribute(particles,3));
  geometries.push(dropGeo);
  // A soft circular droplet sprite avoids square dots and bright CGI sparks.
  const dropCanvas=document.createElement("canvas");
  dropCanvas.width=dropCanvas.height=64;
  const dropCtx=dropCanvas.getContext("2d");
  const dropGradient=dropCtx.createRadialGradient(32,32,1,32,32,32);
  dropGradient.addColorStop(0,"rgba(255,255,255,.98)");
  dropGradient.addColorStop(.30,"rgba(255,255,255,.78)");
  dropGradient.addColorStop(.67,"rgba(255,255,255,.20)");
  dropGradient.addColorStop(1,"rgba(255,255,255,0)");
  dropCtx.fillStyle=dropGradient;dropCtx.fillRect(0,0,64,64);
  const dropTexture=new THREE.CanvasTexture(dropCanvas);
  dropTexture.colorSpace=THREE.SRGBColorSpace;
  splash=new THREE.Points(dropGeo,new THREE.PointsMaterial({
   color:0xD8F3E9,size:.14,map:dropTexture,transparent:true,opacity:.77,
   depthWrite:false,sizeAttenuation:true,blending:THREE.NormalBlending
  }));
  materials.push(splash.material);scene.add(splash);
  const mist=new THREE.Points(dropGeo,new THREE.PointsMaterial({
   color:0xC7EAE6,size:.32,map:dropTexture,transparent:true,opacity:.13,
   depthWrite:false,sizeAttenuation:true,blending:THREE.AdditiveBlending
  }));
  materials.push(mist.material);scene.add(mist);
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
   surface.scale.x=sea.scale.x;
   surface.position.x=sea.position.x;
   waterSurface3D.scale.x=sea.scale.x;
   waterSurface3D.position.x=sea.position.x;
   seaTop.scale.x=W;
   seaTop.position.x=0;
   // Narrow screens keep the centered water source and smaller sculpture
   // beneath the intro while preserving a separate column for service choices.
   const mobile=width<=670;
   const sculptureScale=mobile?.46:width<1120?.82:1;
   assembly.scale.setScalar(sculptureScale);
   // This exactly anchors the sculptural plinth to the viewport bottom
   // at every aspect ratio instead of leaving a tablet-sized floating gap.
   assembly.position.set(mobile?-W*.24:width<1120?-.05:0,-5+5*sculptureScale,0);
   const top=assembly.position.y+2.10*assembly.scale.x;
   const hitX=assembly.position.x+1.03*assembly.scale.x;
   const length=5.05-top;
   streamUniforms.uBend.value=mobile?W*.43-hitX:0;
   waterCore.visible=crest.visible=!mobile;
   fall.position.set(hitX,(5.05+top)*.5,1.04);
   fall.scale.y=length/2.6;
   waterCore.position.set(hitX,(5.05+top)*.5,.86);
   waterCore.scale.y=length/2.6;
   crest.position.set(hitX+.15,(5.05+top)*.5,1.1);
   crest.scale.y=length/2.48;
  }
  let lastFrame=0;
  function schedule(){if(active&&!scheduled&&visible&&!document.hidden){scheduled=true;requestAnimationFrame(frame)}}
  function frame(time){
   scheduled=false;
   if(!visible||!active)return;
   const delta=lastFrame?Math.min(50,time-lastFrame):16;lastFrame=time;
   const p=window.__watermillState?.progress??0;
   const clock=reduce.matches?0:time;
   const motion=smooth(.05,.97,p);
   const desired=reduce.matches?0:.13+.56*motion;
   speed+=(desired-speed)*(1-Math.exp(-delta/200));
   // The camera looks along -Z: negative Z rotation is visually clockwise.
   // Keep angular speed positive; only its visual orientation is reversed.
   rotation=(rotation+speed*delta/1000)%(Math.PI*2);
   rotor.rotation.z=-rotation;

   const level=smooth(.14,.985,p)*.87;
   waterUniforms.uLevel.value=level;
   waterUniforms.uTime.value=clock*.001;
   surface.position.y=-5+10*level;
   surface.visible=level>.006;
   waterSurface3D.visible=level>.025;
   waterSurface3D.position.y=-5+10*level;
   if(waterSurface3D.visible&&!reduce.matches){
    const attr=waterSurface3D.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
     const x=waterSurfaceBase[i*3],y=waterSurfaceBase[i*3+1];
     const swell=.022*Math.sin(x*13.8+clock*.00049+y*4.6)
      +.011*Math.sin(x*29.7-clock*.00085+y*7.4);
     attr.setZ(i,swell);
    }
    attr.needsUpdate=true;
    waterSurface3D.geometry.computeVertexNormals();
   }
   // The stream flows as soon as the sea spills into this scene;
   // scrolling strengthens the waterfall and then accelerates the wheel.
   streamUniforms.uStrength.value=.38+.62*smooth(.015,.25,p);
   streamUniforms.uTime.value=clock*.001;
   topUniforms.uTime.value=clock*.001;
   crest.material.opacity=.065*streamUniforms.uStrength.value;
   // Subtle volume changes create a natural flowing column, while the
   // semi-transparent outer skin preserves the spray silhouette.
   waterCore.scale.x=1+.07*Math.sin(clock*.0019);
   waterCore.scale.z=1+.12*Math.sin(clock*.0021+.7);
   waterCore.rotation.z=.016*Math.sin(clock*.0016);
   const array=splash.geometry.attributes.position;
   for(let i=0;i<drops;i++){
    const seed=i*2.399963,randomized=.44+(i%13)/13;
    const q=(i*.6180339+clock*.00035*(.55+i%7*.075))%1;
    const hitX=assembly.position.x+1.03*assembly.scale.x;
    const hitY=assembly.position.y+2.10*assembly.scale.x;
    const impulse=q*.92*randomized;
    const gravity=q*q*1.24*randomized;
    array.setXYZ(i,
     hitX+Math.sin(seed)*(.04+impulse)+.03*Math.cos(seed*2+q*4),
     hitY+.11+impulse*.48-gravity,
     1.19+.18*Math.cos(seed)*q);
   }
   array.needsUpdate=true;
   splash.visible=streamUniforms.uStrength.value>.08;
   mist.visible=splash.visible;
   updateOutlet(level);
   renderer.render(scene,camera);
   stage.dataset.wheelAngle=rotation.toFixed(3);
   stage.dataset.waterLevel=level.toFixed(3);
   window.__watermill3D={
    engine:"Three.js WebGL",wheelGeometry:"folded paper ring, beams and open troughs",
    waterfall:"animated translucent 3D mesh",rightWater:"single GPU-shaded surface",
    angularVelocity:Number(speed.toFixed(2)),waterLevel:Number(level.toFixed(3)),
    wheelRadius:2.31,frontFacing:true,seaLinked:true,
    wheelDirection:"clockwise",rotationRadians:Number(rotor.rotation.z.toFixed(3)),
    materialVersion:44,paperTextures:true,paperWheel:true,
    continuousOutlet:true,waterSurfaceMesh:!!waterSurface3D,
    liquidVolume:true,sprayParticles:drops
   };
   schedule();
  }
  const observer=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;
   if(visible){lastFrame=0;schedule();}
  },{rootMargin:"100px 0px"});
  resize();
  window.addEventListener("resize",resize,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastFrame=0;schedule();}});
  window.addEventListener("pagehide",()=>{active=false});
  window.addEventListener("pageshow",()=>{active=true;lastFrame=0;schedule();});
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
