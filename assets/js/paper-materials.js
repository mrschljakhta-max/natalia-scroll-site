/**
 * Stable, reusable handmade-paper PBR maps shared by the vortex and the one
 * uninterrupted hero sheet. Created ONCE; no frame-time texture generation.
 */
export function createPaperMaterialMaps(THREE,renderer,{mobile=false}={}){
 const width=mobile?384:768,height=mobile?512:1024;
 const fiberCanvas=document.createElement("canvas");
 const normalCanvas=document.createElement("canvas");
 const roughCanvas=document.createElement("canvas");
 for(const c of [fiberCanvas,normalCanvas,roughCanvas]){c.width=width;c.height=height;}
 const fiberCtx=fiberCanvas.getContext("2d",{willReadFrequently:true});
 const normalCtx=normalCanvas.getContext("2d"),roughCtx=roughCanvas.getContext("2d");
 if(!fiberCtx||!normalCtx||!roughCtx)throw new Error("Paper material canvas unavailable");
 let seed=0x3f2a6d91;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 const makeGrid=(nx,ny)=>{
  const grid=new Float32Array(nx*ny);
  for(let i=0;i<grid.length;i++)grid[i]=rand();
  return {grid,nx,ny};
 };
 const coarse=makeGrid(13,19),medium=makeGrid(67,91);
 const lattice=(layer,x,y)=>{
  const fx=x*(layer.nx-1)/(width-1),fy=y*(layer.ny-1)/(height-1);
  const ix=Math.floor(fx),iy=Math.floor(fy);
  const jx=Math.min(layer.nx-1,ix+1),jy=Math.min(layer.ny-1,iy+1);
  const tx=fx-ix,ty=fy-iy,ux=tx*tx*(3-2*tx),uy=ty*ty*(3-2*ty);
  const a=layer.grid[iy*layer.nx+ix],b=layer.grid[iy*layer.nx+jx];
  const c=layer.grid[jy*layer.nx+ix],d=layer.grid[jy*layer.nx+jx];
  return (a+(b-a)*ux)*(1-uy)+(c+(d-c)*ux)*uy;
 };
 const fiberImg=fiberCtx.createImageData(width,height);
 const roughImg=roughCtx.createImageData(width,height);
 const normalImg=normalCtx.createImageData(width,height);
 const elevations=new Float32Array(width*height);
 const f=fiberImg.data,r=roughImg.data,n=normalImg.data;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,j=i*4;
  const large=lattice(coarse,x,y)-.5;
  const mediumGrain=lattice(medium,x,y)-.5;
  const fine=rand()-.5;
  const tone=large*11+mediumGrain*8+fine*6,warmth=large*2+mediumGrain*2;
  f[j]=Math.max(0,Math.min(255,249+tone));
  f[j+1]=Math.max(0,Math.min(255,246+tone*.91));
  f[j+2]=Math.max(0,Math.min(255,237+tone*.72-warmth));
  f[j+3]=255;
  // Three.js roughnessMap samples the green channel.
  const rough=Math.max(215,Math.min(255,238+large*15+mediumGrain*13+fine*12));
  r[j]=rough;r[j+1]=rough;r[j+2]=rough;r[j+3]=255;
  elevations[i]=large*14+mediumGrain*11+fine*8;
 }
 fiberCtx.putImageData(fiberImg,0,0);
 // Asymmetric fine organic fibers; avoid a visible procedural square grid.
 for(let k=0;k<(mobile?380:1250);k++){
  const x=rand()*width,y=rand()*height,length=2+rand()*26,dy=(rand()-.5)*length*.28;
  fiberCtx.beginPath();fiberCtx.moveTo(x,y);
  fiberCtx.quadraticCurveTo(x+length*.45,y+dy*.7,x+length,y+dy);
  fiberCtx.lineWidth=.28+rand()*.55;
  fiberCtx.strokeStyle=rand()<.70
   ? "rgba(111,128,112,"+(.032+rand()*.066).toFixed(3)+")"
   : "rgba(255,255,238,"+(.038+rand()*.08).toFixed(3)+")";
  fiberCtx.stroke();
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,j=i*4;
  const left=elevations[y*width+Math.max(0,x-1)];
  const right=elevations[y*width+Math.min(width-1,x+1)];
  const above=elevations[Math.max(0,y-1)*width+x];
  const below=elevations[Math.min(height-1,y+1)*width+x];
  // 128,128,255 is a flat tangent-space normal.
  n[j]=Math.max(0,Math.min(255,128+(left-right)*1.4));
  n[j+1]=Math.max(0,Math.min(255,128+(above-below)*1.4));
  n[j+2]=254;n[j+3]=255;
 }
 normalCtx.putImageData(normalImg,0,0);
 roughCtx.putImageData(roughImg,0,0);
 const toTexture=(canvas,srgb=false)=>{
  const tex=new THREE.CanvasTexture(canvas);
  if(srgb)tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  tex.wrapS=THREE.ClampToEdgeWrapping;
  tex.wrapT=THREE.ClampToEdgeWrapping;
  return tex;
 };
 return {
  albedoCanvas:fiberCanvas,
  fiber:toTexture(fiberCanvas,true),
  normal:toTexture(normalCanvas),
  roughness:toTexture(roughCanvas),
  dimensions:[width,height],
  dispose(){this.fiber.dispose();this.normal.dispose();this.roughness.dispose();}
 };
}
