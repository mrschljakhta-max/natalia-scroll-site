// UV patches: 0 = open hull, 1 = ivory main sail, 2 = sage secondary sail.
// Explicit patch IDs keep duplicated seam vertices on their own surfaces.
export function paperBoatPoint(u,v,part=v<=.34?0:u<=.5?1:2){
 const clamp=n=>Math.max(0,Math.min(1,n));
 u=clamp(u);v=clamp(v);
 if(part===0){
  const h=clamp(v/.34),long=2*u-1,cross=2*h-1;
  const taper=1-Math.pow(Math.abs(long),1.45);
  const fold=.045*Math.sin(Math.PI*u*4)*Math.sin(Math.PI*h);
  return [long*2.04,
   -.64-.76*(1-Math.abs(cross))*taper+.13*Math.pow(Math.abs(long),4)+fold,
   .70*cross*taper+.025*Math.sin(Math.PI*u)];
 }
 const height=clamp((v-.34)/.66),taper=Math.max(.001,1-height);
 if(part===1){
  const side=(.5-u)*2,ridge=1-Math.abs(side-.36)/.36;
  return [.035+1.62*side*taper,-.60+3.30*height,
   .05+.16*Math.max(0,ridge)*taper+.045*Math.sin(height*Math.PI)];
 }
 const side=(u-.5)*2;
 return [-.095-1.53*side*taper,-.61+2.72*height,
  -.14-.13*Math.sin(side*Math.PI)*taper];
}
