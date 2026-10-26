/* N/A — WATERMILL / Scene 05
 * Scroll-driven continuation of the existing origami sea.
 * Stand and rotor use layered vector materials for a crisp frontal wheel.
 * Two light canvas layers render continuous water (not tubes or reservoirs).
 */
(()=>{
 'use strict';
 const journey=document.getElementById('conclusion'); // Real section ID; v29 exited before initializing any animation.
 const stage=document.getElementById('watermillStage');
 const fill=document.getElementById('millFillCanvas');
 const fall=document.getElementById('millFallCanvas');
 const rotor=document.getElementById('millRotor');
 const wheel=document.getElementById('millWheel');
 const cards=[...document.querySelectorAll('[data-mill-category]')];
 const detail=document.getElementById('millSelection');
 const jump=document.getElementById('millExplore');
 if(!journey||!stage||!fill||!fall||!rotor||!wheel)return;
 const C=fill.getContext('2d',{alpha:true});
 const F=fall.getContext('2d',{alpha:true});
 if(!C||!F)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const categoryDescriptions=[
  'Бухгалтерський супровід цифрових спеціалістів, IT-ФОП та фрилансерів.',
  'Облік і звітність для підприємців, які розвивають власну справу.',
  'Системна бухгалтерська підтримка для невеликих команд та бізнесів.'
 ];
 let w=1,h=1,dpr=1,elapsed=0,previous=0,progress=0,rot=0,angularSpeed=0,visible=true;
 let lastTime=0,selected=-1,inView=false,scheduled=false;
 function size(){
  const rect=stage.getBoundingClientRect();
  w=Math.max(1,Math.round(rect.width));h=Math.max(1,Math.round(rect.height));
  dpr=Math.min(devicePixelRatio||1,1.65);
  for(const el of [fill,fall]){
   el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);
   el.style.width=w+'px';el.style.height=h+'px';
  }
  C.setTransform(dpr,0,0,dpr,0,0);F.setTransform(dpr,0,0,dpr,0,0);
 }
 function targetProgress(){
  const y=journey.getBoundingClientRect().top;
  return clamp(-y/Math.max(1,journey.offsetHeight-h));
 }
 function waterSurface(x,top,t){
  if(reduce.matches)return top;
  return top+Math.sin(x*.013+t*.00053)*5.5+Math.sin(x*.024-t*.00037)*2.6;
 }
 function drawFill(p,t){
  C.clearRect(0,0,w,h);
  const rise=smooth(.17,.975,p);
  if(rise<=.0005)return h+12;
  const top=h*(1-.865*rise);
  const left=Math.max(w*.515,Math.min(w*.675,w*.54+36));
  // A single contiguous body of water, spanning the right of the screen.
  C.save();
  C.beginPath();
  C.moveTo(left,waterSurface(left,top,t));
  for(let x=left+5;x<=w+6;x+=5)C.lineTo(x,waterSurface(x,top,t));
  C.lineTo(w+6,h+8);C.lineTo(left,h+8);C.closePath();
  C.clip();
  const ocean=C.createLinearGradient(0,top,0,h);
  ocean.addColorStop(0,'rgba(145,223,217,.79)');
  ocean.addColorStop(.28,'rgba(75,172,177,.80)');
  ocean.addColorStop(.72,'rgba(32,123,136,.90)');
  ocean.addColorStop(1,'rgba(17,89,103,.95)');
  C.fillStyle=ocean;C.fillRect(left,top,w-left,h-top+2);
  // Soft edge fade merges the fill into the waterfall at the wheel.
  const edge=C.createLinearGradient(left,0,left+Math.min(95,w*.1),0);
  edge.addColorStop(0,'rgba(245,241,232,.32)');
  edge.addColorStop(1,'rgba(245,241,232,0)');
  C.fillStyle=edge;C.fillRect(left,top,w-left,h-top);
  // Refraction: irregular caustic flecks, never a stack of horizontal pipes.
  const count=Math.round(clamp(w/42,13,43));
  for(let i=0;i<count;i++){
   const fx=left+20+((i*107.2)%Math.max(30,w-left-24));
   const fy=top+19+((i*63.7)%(Math.max(23,h-top-18)));
   C.beginPath();C.ellipse(fx+Math.sin(t*.0006+i)*9,fy,5+(i%5)*2,1.5+(i%3),-.3+(i%7)*.1,0,Math.PI*1.8);
   C.strokeStyle=i%4===0?'rgba(255,241,202,.35)':'rgba(223,250,238,.21)';
   C.lineWidth=i%3===0?1.55:1;
   C.stroke();
  }
  C.restore();
  // Thin, organic moving surface, as ONE continuous waterline.
  C.beginPath();
  for(let x=left;x<=w+5;x+=4){
   const y=waterSurface(x,top,t);
   if(x===left)C.moveTo(x,y);else C.lineTo(x,y);
  }
  C.strokeStyle='rgba(235,248,226,.70)';C.lineWidth=2;C.stroke();
  C.save();C.globalAlpha=.18;
  const glow=C.createRadialGradient(w*.77,top+80,0,w*.77,top+80,w*.39);
  glow.addColorStop(0,'rgba(255,250,226,.7)');
  glow.addColorStop(1,'rgba(255,250,226,0)');
  C.fillStyle=glow;C.fillRect(left,top,w-left,h-top);
  C.restore();
  return top;
 }
 function drawFall(p,t){
  F.clearRect(0,0,w,h);
  const amount=smooth(.018,.23,p);
  if(amount<=.002)return;
  const rect=wheel.getBoundingClientRect(),parent=stage.getBoundingClientRect();
  const cx=rect.left-parent.left+rect.width*.5;
  const top=rect.top-parent.top+rect.height*.1;
  const start=Math.min(48,h*.052);
  const end=Math.max(start+18,top+Math.min(65,rect.height*.10));
  const radius=Math.max(12,Math.min(25,w*.014));
  const fallGrad=F.createLinearGradient(cx-radius,0,cx+radius,0);
  fallGrad.addColorStop(0,'rgba(23,111,124,.03)');
  fallGrad.addColorStop(.20,'rgba(107,196,192,.70)');
  fallGrad.addColorStop(.46,'rgba(236,254,245,.93)');
  fallGrad.addColorStop(.7,'rgba(101,202,204,.82)');
  fallGrad.addColorStop(1,'rgba(15,101,116,.12)');
  F.save();F.globalAlpha=amount;
  F.beginPath();
  F.moveTo(cx-radius,start);
  F.bezierCurveTo(cx-radius*1.15,end*.35,cx-radius*.88,end*.77,cx-radius*.85,end);
  F.quadraticCurveTo(cx,end+18,cx+radius*.9,end);
  F.bezierCurveTo(cx+radius*.9,end*.75,cx+radius*1.1,end*.33,cx+radius,start);
  F.closePath();F.fillStyle=fallGrad;F.fill();
  // Strands emphasize motion without creating a second object or pipe.
  for(let i=0;i<13;i++){
   const ox=((i/12)-.5)*radius*1.8;
   const phase=t*(reduce.matches?0:.0007)*(1+i%3*.12)+i*1.43;
   F.beginPath();
   F.moveTo(cx+ox,start);
   F.bezierCurveTo(cx+ox+Math.sin(phase)*3,end*.38,cx+ox-3+Math.sin(phase+.8)*3,end*.72,cx+ox+Math.sin(phase+.3)*4,end+4);
   F.strokeStyle=i%3===0?'rgba(255,251,225,.78)':'rgba(195,240,234,.35)';
   F.lineWidth=i%3===0?1.6:.9;F.stroke();
  }
  // One small splash just above the wheel's upper rim.
  for(let i=0;i<19;i++){
   const a=i*2.399963+Math.sin(t*.0007+i)*.13;
   const dist=5+(i%7)*4+(reduce.matches?0:Math.sin(t*.0017+i)*3);
   F.beginPath();F.arc(cx+Math.cos(a)*dist,end+Math.sin(a)*dist*.55,1+(i%3)*.7,0,Math.PI*2);
   F.fillStyle=i%3===0?'rgba(255,249,214,.75)':'rgba(133,216,217,.55)';
   F.fill();
  }
  F.restore();
 }
 function setChoice(i){
  selected=i;
  cards.forEach((el,n)=>el.setAttribute('aria-pressed',String(i===n)));
  detail.textContent=i<0?'':categoryDescriptions[i];
  detail.classList.toggle('is-open',i>=0);
 }
 cards.forEach((card,i)=>card.addEventListener('click',()=>setChoice(i)));
 jump?.addEventListener('click',()=>{
  const offset=journey.getBoundingClientRect().top+scrollY;
  const span=Math.max(1,journey.offsetHeight-innerHeight);
  window.scrollTo({top:offset+span*.985,behavior:reduce.matches?'instant':'smooth'});
 });
 function schedule(){
  if(!scheduled&&visible&&inView){scheduled=true;requestAnimationFrame(frame);}
 }
 function frame(now){
  scheduled=false;
  if(!visible||!inView){lastTime=now;return;}
  const delta=lastTime?Math.min(50,now-lastTime):16;
  lastTime=now;
  const t=now,goal=targetProgress();
  progress=reduce.matches?goal:lerp(progress,goal,1-Math.exp(-delta/110));
  if(Math.abs(progress-goal)<.0001)progress=goal;
  const motion=smooth(.065,.98,progress);
  const targetSpeed=reduce.matches?0:motion*(.16+3.75*Math.pow(motion,1.6));
  angularSpeed=lerp(angularSpeed,targetSpeed,1-Math.exp(-delta/280));
  rot=(rot+angularSpeed*delta/1000)%(Math.PI*2);
  const real3D=stage.classList.contains("is-mill-webgl");
  if(!real3D)rotor.setAttribute('transform','rotate('+(rot*180/Math.PI).toFixed(3)+' 300 290)');
  const surface=real3D
   ?h*(1-.865*smooth(.17,.975,progress))
   :drawFill(progress,t);
  if(!real3D)drawFall(progress,t);
  // Lightweight state bridge. The 3D renderer owns its wheel and water meshes;
  // this controller owns only scroll position, semantics and category buttons.
  window.__watermillState={progress,waterTop:surface,active:real3D};
  stage.style.setProperty('--mill-progress',progress.toFixed(4));
  stage.style.setProperty('--wheel-activity',motion.toFixed(3));
  cards.forEach((card)=>{
   const y=card.getBoundingClientRect().top-stage.getBoundingClientRect().top+card.offsetHeight*.45;
   const active=progress>.22&&y>surface-8;
   card.classList.toggle('is-revealed',active);
   card.disabled=!active;
   card.tabIndex=active?0:-1;
  });
  window.__watermillDiagnostics={
   progress:Number(progress.toFixed(3)),wheelRpm:Number((angularSpeed*60/(2*Math.PI)).toFixed(2)),
   risingWaterTop:Number(surface.toFixed(1)),categoryCount:cards.length,
   flowFromPreviousSea:true,frontFacingWheel:true,waterShape:'single continuous fill',
   engine:real3D?'Three.js':'Canvas / SVG fallback',scriptInitialized:true
  };
  schedule();
 }
 document.addEventListener('visibilitychange',()=>{
  const wasVisible=visible;visible=!document.hidden;
  if(!wasVisible&&visible){lastTime=0;schedule();}
 });
 let resizeJob=0;
 window.addEventListener('resize',()=>{clearTimeout(resizeJob);resizeJob=setTimeout(size,90);},{passive:true});
 // Offscreen scenes never spend frames on canvas work during the original
 // four-act WebGL journey. Re-entering the scene resumes the water and rotor.
 const observer=new IntersectionObserver(entries=>{
  inView=entries[0].isIntersecting;
  if(inView){lastTime=0;schedule();}
 },{rootMargin:'100px 0px'});
 observer.observe(stage);
 size();
 progress=targetProgress();
 if(reduce.matches)rot=0;
})();
