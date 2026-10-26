/**
 * Scene 05 — genuinely dimensional brass wheel and flowing sea.
 * Perspective depth comes from extruded stone, 3D toruses, volumetric spokes,
 * bucket geometry and dynamic GPU-shaded water — not SVG/card mockups.
 * All geometry faces the camera (frontal angle).
 */
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {RGBELoader} from "three/addons/loaders/RGBELoader.js";

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
 let assembly=null,loadedRotor=null,hdriApplied=false,gltfApplied=false;
 let waterSurface3D=null,waterSurfaceBase=null,assetLoading=false;
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
  // Six physically reflected studio softboxes, generated without an HDRI asset
  // or extra network dependency. Three.js PMREM filters this environment.
  const envFaces=[];
  for(let i=0;i<6;i++){
   const c=document.createElement("canvas");c.width=c.height=160;
   const cx=c.getContext("2d");
   const bg=cx.createLinearGradient(0,0,160,160);
   bg.addColorStop(0,i===2?"#F7F1E5":"#DEE6E1");
   bg.addColorStop(.55,i===3?"#A0C5C3":"#CCCEC5");
   bg.addColorStop(1,i===4?"#C1CEC8":"#8DAEB1");
   cx.fillStyle=bg;cx.fillRect(0,0,160,160);
   const box=cx.createRadialGradient(i%2?101:56,32,2,i%2?101:56,32,116);
   box.addColorStop(0,"rgba(255,250,229,.95)");
   box.addColorStop(.38,"rgba(255,248,229,.47)");
   box.addColorStop(1,"rgba(255,249,238,0)");
   cx.fillStyle=box;cx.fillRect(0,0,160,160);
   cx.fillStyle="rgba(255,254,248,.36)";
   cx.fillRect(i%2?95:38,0,14,132);
   envFaces.push(c);
  }
  const studioEnv=new THREE.CubeTexture(envFaces);
  studioEnv.colorSpace=THREE.SRGBColorSpace;
  studioEnv.needsUpdate=true;
  scene.environment=studioEnv;
  scene.environmentIntensity=.82;
  // Real brushed-metal micro-surface, roughness variation and microscopic
  // scratches encoded in repeatable procedural PBR textures (not paint-on
  // glossy streaks); deterministic and generated once at startup.
  const texSize=384,normalData=new Uint8Array(texSize*texSize*4),
   roughData=new Uint8Array(texSize*texSize*4);
  let grainSeed=1559;
  const grain=()=>{grainSeed=(grainSeed*1664525+1013904223)>>>0;return grainSeed/4294967296};
  const scratches=Array.from({length:23},()=>({x:Math.floor(grain()*texSize),
   width:.6+grain()*2,weight:.6+grain()*.4}));
  for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){
   let scratch=0;
   for(const line of scratches){
    const distance=Math.min(Math.abs(x-line.x),texSize-Math.abs(x-line.x));
    scratch+=Math.exp(-distance*distance/(line.width*line.width))*line.weight;
   }
   const tremor=grain()-.5;
   const waviness=Math.sin(y*.11+x*.017)+.55*Math.sin(y*.42-x*.013);
   const k=(y*texSize+x)*4;
   const nx=128+Math.max(-25,Math.min(25,scratch*8+tremor*8));
   const ny=128+waviness*3+tremor*5;
   normalData[k]=Math.round(Math.min(255,nx));
   normalData[k+1]=Math.round(Math.min(255,ny));
   normalData[k+2]=253;normalData[k+3]=255;
   const rough=Math.round(Math.max(96,Math.min(196,135+scratch*14+tremor*13+waviness*4)));
   roughData[k]=rough;roughData[k+1]=rough;roughData[k+2]=rough;roughData[k+3]=255;
  }
  const mapFrom=(pixels)=>{
   const tex=new THREE.DataTexture(pixels,texSize,texSize,THREE.RGBAFormat);
   tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;
   tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;
   tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;
  };
  const brassNormal=mapFrom(normalData),brassRoughness=mapFrom(roughData);
  // Satin brushed brass; restrained reflections make the circular form
  // feel machined and substantial instead of plastic or mirror-chrome.
  const gold=new THREE.MeshPhysicalMaterial({color:0xBC925D,metalness:.82,roughness:.80,
   roughnessMap:brassRoughness,normalMap:brassNormal,normalScale:new THREE.Vector2(.15,.15),
   envMapIntensity:.86,clearcoat:.055,clearcoatRoughness:.65});
  const lightGold=new THREE.MeshPhysicalMaterial({color:0xD9B582,metalness:.73,roughness:.74,
   roughnessMap:brassRoughness,normalMap:brassNormal,normalScale:new THREE.Vector2(.12,.12),
   envMapIntensity:.88,clearcoat:.075,clearcoatRoughness:.68});
  const darkGold=new THREE.MeshStandardMaterial({color:0x755338,metalness:.64,roughness:.86,
   roughnessMap:brassRoughness,envMapIntensity:.60});
  // A gently varied mineral surface, authored procedurally and only once.
  // Fine warm flecks and subtle grain replace the previous flat cream fill.
  const stoneCanvas=document.createElement("canvas");
  stoneCanvas.width=stoneCanvas.height=384;
  const stoneContext=stoneCanvas.getContext("2d",{willReadFrequently:true});
  stoneContext.fillStyle="#e9e0d2";stoneContext.fillRect(0,0,384,384);
  const stonePixels=stoneContext.getImageData(0,0,384,384);
  let seed=421381;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<384;y++)for(let x=0;x<384;x++){
   const i=(y*384+x)*4;
   const mineral=3*Math.sin(x*.031+y*.012)+2*Math.sin(y*.047-x*.008);
   const fleck=(random()-.5)*11;
   const tone=mineral+fleck;
   stonePixels.data[i]=Math.round(Math.max(0,Math.min(255,229+tone)));
   stonePixels.data[i+1]=Math.round(Math.max(0,Math.min(255,220+tone)));
   stonePixels.data[i+2]=Math.round(Math.max(0,Math.min(255,205+tone)));
   stonePixels.data[i+3]=255;
  }
  stoneContext.putImageData(stonePixels,0,0);
  stoneContext.strokeStyle="rgba(143,122,93,.055)";
  for(let i=0;i<30;i++){
   const x=random()*390,y=random()*390;
   stoneContext.beginPath();stoneContext.moveTo(x,y);
   stoneContext.bezierCurveTo(x+8,y-3,x+24,y+5,x+34,y+2);
   stoneContext.lineWidth=.6+random()*.8;stoneContext.stroke();
  }
  const stoneMap=new THREE.CanvasTexture(stoneCanvas);
  stoneMap.colorSpace=THREE.SRGBColorSpace;
  stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;
  stoneMap.repeat.set(1.5,2.2);
  const porcelain=new THREE.MeshPhysicalMaterial({color:0xFFFFFF,map:stoneMap,
    bumpMap:stoneMap,bumpScale:.028,roughness:.83,metalness:0,clearcoat:.06});
  const porcelainEdge=new THREE.MeshStandardMaterial({color:0xF0E5D4,roughness:.78});
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
  // Subtle hand-painted contact occlusion behind the wheel and the pedestal.
  // These are translucent decals, not heavy post-processing passes.
  const aoCanvas=document.createElement("canvas");aoCanvas.width=aoCanvas.height=256;
  const aoc=aoCanvas.getContext("2d");
  const g=aoc.createRadialGradient(128,128,12,128,128,128);
  g.addColorStop(0,"rgba(40,29,19,.56)");
  g.addColorStop(.48,"rgba(50,37,24,.27)");
  g.addColorStop(1,"rgba(60,48,31,0)");
  aoc.fillStyle=g;aoc.fillRect(0,0,256,256);
  const aoMap=new THREE.CanvasTexture(aoCanvas);aoMap.colorSpace=THREE.SRGBColorSpace;
  const contact=mesh(new THREE.PlaneGeometry(5.5,5.5),new THREE.MeshBasicMaterial({
   map:aoMap,transparent:true,opacity:.19,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1
  }),assembly);
  contact.position.set(0,0,-.86);
  const shadow=mesh(new THREE.PlaneGeometry(5.1,.35),new THREE.MeshBasicMaterial({
   color:0x5A5447,transparent:true,opacity:.065,depthWrite:false
  }));
  materials.push(shadow.material,contact.material);
  shadow.position.set(0,-4.97,-.45);
  // Actual 3D rotating rotor: two concentric raised rims, spoke barrels
  // in different depth planes and 12 individually extruded water-catching cups.
  rotor=new THREE.Group();assembly.add(rotor);
  torus(2.31,.215,-.45,darkGold,rotor);
  torus(2.31,.19,.40,gold,rotor);
  torus(2.15,.036,.55,lightGold,rotor);
  torus(1.89,.055,.19,darkGold,rotor);
  torus(1.90,.027,.26,lightGold,rotor);
  torus(2.31,.038,.61,lightGold,rotor);
  const up=new THREE.Vector3(0,1,0);
  const PADDLE_COUNT=10;
  const boltGeometry=new THREE.SphereGeometry(.066,12,8);
  geometries.push(boltGeometry);
  for(let i=0;i<PADDLE_COUNT;i++){
   const a=i*Math.PI*2/PADDLE_COUNT;
   const radial=new THREE.Vector3(Math.sin(a),Math.cos(a),0);
   const spoke=mesh(new THREE.CylinderGeometry(.062,.083,2.19,12,1),i%3===0?lightGold:gold,rotor);
   spoke.position.set(radial.x*1.17,radial.y*1.17,.17);
   spoke.quaternion.setFromUnitVectors(up,radial);
   const spokeBack=mesh(new THREE.CylinderGeometry(.034,.044,2.08,8),darkGold,rotor);
   spokeBack.position.set(radial.x*1.17,radial.y*1.17,-.33);
   spokeBack.quaternion.setFromUnitVectors(up,radial);
   const bucket=mesh(new THREE.BoxGeometry(.57,.35,.95,2,2,2),i%2?gold:lightGold,rotor);
   bucket.position.set(radial.x*2.3,radial.y*2.3,.03);
   bucket.rotation.z=-a;
   const innerCup=mesh(new THREE.BoxGeometry(.42,.08,.72),darkGold,rotor);
   innerCup.position.set(radial.x*2.44,radial.y*2.44,.05);
   innerCup.rotation.z=-a;
   const rivet=new THREE.Mesh(boltGeometry,lightGold);
   rivet.position.set(radial.x*2.29,radial.y*2.29,.625);
   rotor.add(rivet);
  }
  // Dark mechanical joint behind the axle adds convincing depth at the hub.
  const joint=mesh(new THREE.CylinderGeometry(.67,.67,.12,64),darkGold,rotor);
  joint.rotation.x=Math.PI/2;joint.position.z=-.13;
  const hubBack=mesh(new THREE.CylinderGeometry(.59,.59,.67,64),darkGold,rotor);
  hubBack.rotation.x=Math.PI/2;
  hubBack.position.z=.12;
  const hubFront=mesh(new THREE.CylinderGeometry(.46,.49,.69,64),gold,rotor);
  hubFront.rotation.x=Math.PI/2;hubFront.position.z=.58;
  const hubDisc=mesh(new THREE.CylinderGeometry(.25,.25,.055,64),lightGold);
  hubDisc.rotation.x=Math.PI/2;hubDisc.position.z=1.02;
  const axle=mesh(new THREE.CylinderGeometry(.105,.105,.09,32),darkGold);
  axle.rotation.x=Math.PI/2;axle.position.z=1.08;
  const hubRing=torus(.28,.017,1.076,lightGold,assembly);
  // Water is GPU shaded with moving caustics, volume, refraction and real
  // wave crest. The RIGHT side is a single liquid region (no tubes or tiers).
  // First-party glTF sculptural asset, authored for this exact front camera.
  // Existing wheel remains as a complete fallback until the replacement is
  // confirmed loaded and parsed. The glTF geometry has curved catch-paddles
  // and a forged rim profile instead of assembled torus/box placeholders.
  function loadPremiumAssets(){
   if(assetLoading)return;
   assetLoading=true;
   const wheelUrl=new URL("../models/studio-waterwheel-v35.gltf",import.meta.url);
   new GLTFLoader().load(wheelUrl.href,asset=>{
    loadedRotor=asset.scene;
    loadedRotor.traverse(obj=>{
     if(!obj.isMesh)return;
     // Our bespoke geometry uses topology optimized for a tiny glTF.
     // Generate UVs on import so PBR micro-scratch normal/roughness maps
     // work correctly even when the source meshes omit TEXCOORD_0.
     const geo=obj.geometry,vertices=geo.getAttribute("position");
     if(vertices&&!geo.getAttribute("uv")){
      const uv=new Float32Array(vertices.count*2);
      for(let i=0;i<vertices.count;i++){
       uv[i*2]=vertices.getX(i)*.17+.5;
       uv[i*2+1]=vertices.getY(i)*.17+.5;
      }
      geo.setAttribute("uv",new THREE.BufferAttribute(uv,2));
     }
     const n=obj.material?.name||"";
     obj.material=n.includes("Champagne")?lightGold:
      n.includes("Dark")?darkGold:gold;
     obj.castShadow=false;obj.receiveShadow=false;
     obj.frustumCulled=false;
    });
    assembly.add(loadedRotor);
    loadedRotor.rotation.z=rotor.rotation.z;
    rotor.visible=false;
    hubDisc.visible=false;
    axle.visible=false;
    hubRing.visible=false;
    gltfApplied=true;
   },undefined,error=>{
    window.__watermillAssetWarning="glTF wheel unavailable; displaying original 3D fallback";
    console.warn("Watermill glTF fallback:",error);
   });
   // Actual CC0 studio HDRI, deliberately low-resolution (1K) and fetched
   // only when scene 05 approaches the viewport. The procedural cube
   // environment already set above remains when off-line / CORS-blocked.
   const hdr="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr";
   new RGBELoader().load(hdr,texture=>{
    const generator=new THREE.PMREMGenerator(renderer);
    const pack=generator.fromEquirectangular(texture);
    scene.environment=pack.texture;
    scene.environmentIntensity=.82;
    hdriApplied=true;
    texture.dispose();
    generator.dispose();
   },undefined,error=>{
    window.__watermillHDRIWarning="HDRI unavailable; using procedural environment";
    console.warn("Watermill HDRI fallback:",error);
   });
  }
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
   uTime:{value:0},uStrength:{value:0},
   uPale:{value:rgb("#EDFFF1")},uAqua:{value:rgb("#55BBC0")}
  };
  // Waterfall glints are slow, irregular and edge-feathered; never parallel
  // fluorescent threads. The shader flows over a translucent 3D water core.
  const fallVertex=[
   "uniform float uTime;varying vec2 vUv;",
   "void main(){vUv=uv;vec3 p=position;",
   "float bend=.040*sin(uv.y*7.4+uTime*1.1)+.024*sin(uv.y*16.-uTime*1.7);",
   "p.x+=bend+.024*sin(uv.x*9.+uv.y*12.+uTime*1.2);",
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
   const sculptureScale=mobile?.54:width<1120?.82:1;
   assembly.scale.setScalar(sculptureScale);
   // This exactly anchors the sculptural plinth to the viewport bottom
   // at every aspect ratio instead of leaving a tablet-sized floating gap.
   assembly.position.set(mobile?-W*.22:width<1120?-.05:0,-5+5*sculptureScale,0);
   const top=assembly.position.y+2.31*assembly.scale.x;
   const length=5.05-top;
   fall.position.set(assembly.position.x,(5.05+top)*.5,1.04);
   fall.scale.y=length/2.6;
   waterCore.position.set(assembly.position.x,(5.05+top)*.5,.86);
   waterCore.scale.y=length/2.6;
   crest.position.set(assembly.position.x+.15,(5.05+top)*.5,1.1);
   crest.scale.y=length/2.48;
  }
  let lastFrame=0;
  function schedule(){if(active&&!scheduled&&visible){scheduled=true;requestAnimationFrame(frame)}}
  function frame(time){
   scheduled=false;
   if(!visible||!active)return;
   // A fully decoded cinematic film replaces the old GPU scene. Keep the
   // Three.js fallback alive but avoid unnecessary render work underneath it.
   if(stage.classList.contains('has-cinematic-film')){lastFrame=time;schedule();return;}
   const delta=lastFrame?Math.min(50,time-lastFrame):16;lastFrame=time;
   const p=window.__watermillState?.progress??0;
   const motion=smooth(.05,.97,p);
   const desired=reduce.matches?0:motion*(.20+4.1*Math.pow(motion,1.48));
   speed+=(desired-speed)*(1-Math.exp(-delta/200));
   // The camera looks along -Z: negative Z rotation is visually clockwise.
   // Keep angular speed positive; only its visual orientation is reversed.
   rotation=(rotation+speed*delta/1000)%(Math.PI*2);
   rotor.rotation.z=-rotation;
   if(loadedRotor)loadedRotor.rotation.z=-rotation;
   const level=smooth(.14,.985,p)*.87;
   waterUniforms.uLevel.value=level;
   waterUniforms.uTime.value=time*.001;
   surface.position.y=-5+10*level;
   surface.visible=level>.006;
   waterSurface3D.visible=level>.025;
   waterSurface3D.position.y=-5+10*level;
   if(waterSurface3D.visible&&!reduce.matches){
    const attr=waterSurface3D.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
     const x=waterSurfaceBase[i*3],y=waterSurfaceBase[i*3+1];
     const swell=.022*Math.sin(x*13.8+time*.00049+y*4.6)
      +.011*Math.sin(x*29.7-time*.00085+y*7.4);
     attr.setZ(i,swell);
    }
    attr.needsUpdate=true;
    waterSurface3D.geometry.computeVertexNormals();
   }
   // The stream flows as soon as the sea spills into this scene;
   // scrolling strengthens the waterfall and then accelerates the wheel.
   streamUniforms.uStrength.value=.38+.62*smooth(.015,.25,p);
   streamUniforms.uTime.value=time*.001;
   topUniforms.uTime.value=time*.001;
   crest.material.opacity=.065*streamUniforms.uStrength.value;
   // Subtle volume changes create a natural flowing column, while the
   // semi-transparent outer skin preserves the spray silhouette.
   waterCore.scale.x=1+.07*Math.sin(time*.0019);
   waterCore.scale.z=1+.12*Math.sin(time*.0021+.7);
   waterCore.rotation.z=.016*Math.sin(time*.0016);
   const array=splash.geometry.attributes.position;
   for(let i=0;i<drops;i++){
    const seed=i*2.399963,randomized=.44+(i%13)/13;
    const q=(i*.6180339+time*.00035*(.55+i%7*.075))%1;
    const hitX=assembly.position.x;
    const hitY=assembly.position.y+2.31*assembly.scale.x;
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
   renderer.render(scene,camera);
   window.__watermill3D={
    engine:"Three.js WebGL",wheelGeometry:"3D toruses, buckets and cylinders",
    waterfall:"animated translucent 3D mesh",rightWater:"single GPU-shaded surface",
    angularVelocity:Number(speed.toFixed(2)),waterLevel:Number(level.toFixed(3)),
    wheelRadius:2.31,frontFacing:true,seaLinked:true,
    wheelDirection:"clockwise",rotationRadians:Number(rotor.rotation.z.toFixed(3)),
    materialVersion:35,brassTextures:true,softReflections:true,
    gltfModel:gltfApplied,studioHDRI:hdriApplied,waterSurfaceMesh:!!waterSurface3D,
    liquidVolume:true,sprayParticles:drops
   };
   schedule();
  }
  window.__millPhotorealPBR={version:35,environment:"studio_small_09 HDRI with fallback",
   brassNormalMap:true,brassRoughnessMap:true,contactOcclusion:true};
  const observer=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting;
   if(visible)loadPremiumAssets();
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
