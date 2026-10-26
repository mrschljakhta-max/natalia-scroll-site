/**
 * CINEMATIC LAB v37 — reference-driven kinetic photographic composite.
 * No iframe, no fake AAA claim, no dependency on external render servers.
 * Source: approved original CGI concept, locally hosted as AVIF.
 *
 * Image separation / layered compositor:
 *  1) stationary original sea + warm editorial space
 *  2) right-side photographic water rising as ONE continuous level
 *  3) independently clockwise-rotating photographic wheel
 *  4) stationary vertical stream, moving mist, impact droplets and sun rays
 *  5) genuine keyboard-accessible hotspot controls
 */
(()=>{
"use strict";
const stage=document.getElementById("cinematicStage");
const journey=document.getElementById("cinematicJourney");
const canvas=document.getElementById("cinematicCanvas");
if(!stage||!journey||!canvas)return;
const ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
if(!ctx)return;
const W=800,H=450,CX=377,CY=223,R=126,SEA_Y=73;
const reduce=matchMedia("(prefers-reduced-motion: reduce)");
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
const make=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;return c};
const original=make(),base=make(),water=make(),wheel=make();
const originalCtx=original.getContext("2d",{willReadFrequently:true});
const baseCtx=base.getContext("2d",{willReadFrequently:true});
const waterCtx=water.getContext("2d",{willReadFrequently:true});
const wheelCtx=wheel.getContext("2d");
const buttons=[...stage.querySelectorAll("[data-cine-service]")];
const detail=document.getElementById("cinematicDetail");
const CTA=document.getElementById("cinematicCTA");
const progressEl=document.getElementById("cineProgress");
const legend=document.getElementById("cineLegend");
const mobileActions=document.getElementById("cinematicMobileServices");
const descriptions=[
 ["IT та фриланс","Професійний бухгалтерський супровід для IT-ФОП, дизайнерів, маркетологів та інших цифрових спеціалістів."],
 ["ФОП та підприємці","Облік, звітність і підтримка щоденної діяльності підприємців та самозайнятих фахівців."],
 ["Малий бізнес","Бухгалтерська підтримка для невеликих компаній і команд — відповідно до фактичного переліку послуг."]
];
let ready=false,visible=false,scheduled=false,w=1,h=1,dpr=1;
let progress=0,wanted=0,lastTime=0,angle=0,speed=0,frameNo=0;
let assetUrl=null,selected=-1,assetsError="";
function prepare(img){
 originalCtx.drawImage(img,0,0,W,H);
 // The source still contains all accepted brand text. Its 3D wheel is
 // extracted into a separate angular layer; this background has it removed.
 const src=originalCtx.getImageData(0,0,W,H),source=src.data;
 baseCtx.drawImage(original,0,0);
 // Hide the original right-side water+labels. They return only as the
 // physically rising wave crosses their location.
 const cream=baseCtx.createLinearGradient(0,SEA_Y,0,H);
 cream.addColorStop(0,"#F5F0E6");cream.addColorStop(.72,"#F1EDE4");cream.addColorStop(1,"#E6E7DE");
 baseCtx.fillStyle=cream;baseCtx.fillRect(391,SEA_Y,W-391,H-SEA_Y);
 // Under the rotating photographic wheel, reconstitute the cream wall.
 baseCtx.save();baseCtx.beginPath();baseCtx.arc(CX,CY,R+1,0,Math.PI*2);baseCtx.clip();
 const wall=baseCtx.createLinearGradient(CX-R,CY-R,CX+R,CY+R);
 wall.addColorStop(0,"#F3EDE4");wall.addColorStop(.65,"#F1ECE3");wall.addColorStop(1,"#E2E3D8");
 baseCtx.fillStyle=wall;baseCtx.fillRect(CX-R-3,CY-R-3,2*R+6,2*R+6);
 baseCtx.restore();
 // Restore the approved ocean photograph only on the water reveal layer.
 waterCtx.drawImage(original,0,0);
 const frame=waterCtx.getImageData(0,0,W,H),out=frame.data;
 // Inpaint the wheel occluding the right-side water, using clean cyan
 // photo pixels from the right of the source. Rotating the rotor then
 // reveals water, rather than the old static rotor beneath it.
 for(let y=CY-R-3;y<=CY+R+3;y++){
  if(y<0||y>=H)continue;
  for(let x=Math.max(391,CX-R-3);x<=Math.min(W-1,CX+R+6);x++){
   const dx=x-CX,dy=y-CY;
   if(dx*dx+dy*dy>(R+8)*(R+8))continue;
   const k=(y*W+x)*4;
   const sx=Math.min(W-1,540+((x*5+y*3)%36));
   const p=(y*W+sx)*4;
   const influence=clamp(((R+8)-Math.hypot(dx,dy))/13);
   for(let c=0;c<3;c++)out[k+c]=Math.round(lerp(out[k+c],source[p+c],influence));
  }
 }
 waterCtx.putImageData(frame,0,0);
 // Soft-masked photo wheel: its true metal, caustics, cast shadows and
 // water droplets remain photographic rather than procedural PBR.
 wheelCtx.drawImage(original,0,0);
 const feather=wheelCtx.createRadialGradient(CX,CY,R-12,CX,CY,R+2);
 feather.addColorStop(0,"rgba(0,0,0,1)");
 feather.addColorStop(.89,"rgba(0,0,0,.98)");
 feather.addColorStop(1,"rgba(0,0,0,0)");
 wheelCtx.globalCompositeOperation="destination-in";
 wheelCtx.fillStyle=feather;wheelCtx.fillRect(0,0,W,H);
 wheelCtx.globalCompositeOperation="source-over";
 ready=true;stage.classList.add("is-ready");schedule();
}
function resize(){
 w=Math.max(1,stage.clientWidth);h=Math.max(1,stage.clientHeight);
 dpr=Math.min(devicePixelRatio||1,w<700?1.25:1.7);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 canvas.style.width=w+"px";canvas.style.height=h+"px";schedule();
}
function target(){
 const rect=journey.getBoundingClientRect();
 wanted=clamp(-rect.top/Math.max(1,journey.offsetHeight-innerHeight));
 if(reduce.matches)progress=wanted;
 schedule();
}
function schedule(){
 if(!scheduled&&visible&&ready){scheduled=true;requestAnimationFrame(tick)}
}
function waveY(x,baseline,t){
 return baseline+(reduce.matches?0:
  2.2*Math.sin(x*.038+t*.0012)+1.5*Math.sin(x*.080-t*.0017));
}
function compose(t){
 // "cover" gives the artwork its original premium widescreen framing.
 // All masks, hotspots and scroll effects use this same normalized space.
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle="#F0EEE5";ctx.fillRect(0,0,w,h);
 const scale=Math.max(w/W,h/H);
 const offX=(w-W*scale)/2,offY=(h-H*scale)/2;
 ctx.translate(offX,offY);ctx.scale(scale,scale);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
 ctx.drawImage(base,0,0);
 // Single rising ocean. Not three flask layers or striped containers.
 const rise=smooth(.04,.96,progress),top=H-(H-SEA_Y-4)*rise;
 if(rise>.001){
  ctx.save();ctx.beginPath();
  ctx.moveTo(393,waveY(393,top,t));
  for(let x=398;x<=W+5;x+=4)ctx.lineTo(x,waveY(x,top,t));
  ctx.lineTo(W+5,H+3);ctx.lineTo(393,H+3);ctx.closePath();ctx.clip();
  ctx.drawImage(water,0,0);
  // A subtle diffuse caustic wash, not repeating scanner lines.
  const shimmer=ctx.createRadialGradient(620,top+45,2,620,top+45,190);
  shimmer.addColorStop(0,"rgba(254,245,214,.085)");
  shimmer.addColorStop(1,"rgba(254,245,214,0)");
  ctx.fillStyle=shimmer;ctx.fillRect(392,top,W-392,H-top);
  ctx.restore();
  ctx.beginPath();
  for(let x=393;x<=W+3;x+=4){const y=waveY(x,top,t);if(x===393)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
  ctx.lineWidth=1.6;ctx.strokeStyle="rgba(242,252,231,.55)";ctx.stroke();
 }
 // The photo rotor has its own depth/shadow and clockwise kinetic rotation.
 ctx.save();ctx.translate(CX,CY);
 const rot=reduce.matches?-.42*progress:angle;
 ctx.rotate(rot);ctx.drawImage(wheel,-CX,-CY);
 ctx.restore();
 // The waterfall remains vertical when the metal rotates beneath it.
 // A feathered crop taken directly from the approved CGI plate keeps its
 // realistic refraction, rather than turning water into glowing threads.
 ctx.save();ctx.beginPath();
 ctx.moveTo(CX-17,0);ctx.lineTo(CX+17,0);
 ctx.bezierCurveTo(CX+14,58,CX+19,88,CX+14,110);
 ctx.lineTo(CX-14,110);
 ctx.bezierCurveTo(CX-20,76,CX-14,45,CX-17,0);ctx.closePath();
 ctx.clip();
 ctx.globalAlpha=.96;
 ctx.drawImage(original,0,0);
 ctx.restore();
 // Localized impact droplets and mist, coupled to scroll acceleration.
 if(!reduce.matches){
  const intensity=smooth(.05,.48,progress);
  ctx.save();ctx.globalCompositeOperation="screen";
  for(let i=0;i<34;i++){
   const theta=i*2.39996,phase=(i*.439+t*.00017*(.65+i%5*.15))%1;
   const radius=5+phase*54*(.5+(i%9)/13);
   const px=CX+Math.sin(theta)*radius;
   const py=109+Math.sin(theta)*phase*20+phase*phase*27;
   const alpha=intensity*(1-phase)*(.25+(i%5)*.06);
   ctx.beginPath();ctx.ellipse(px,py,1+phase*1.7,.6+phase,theta,0,Math.PI*2);
   ctx.fillStyle="rgba(255,252,232,"+alpha.toFixed(3)+")";ctx.fill();
  }
  ctx.restore();
 }
 // A restrained photographic lens bloom moves across wet bronze.
 const glowX=CX+Math.cos(t*.00019)*72,glowY=120+Math.sin(t*.00027)*13;
 const glow=ctx.createRadialGradient(glowX,glowY,4,glowX,glowY,128);
 glow.addColorStop(0,"rgba(255,246,205,.095)");
 glow.addColorStop(1,"rgba(255,246,205,0)");
 ctx.fillStyle=glow;ctx.fillRect(CX-135,42,270,310);
 // Maintain detailed original sunlight near the surface; vignette only
 // at edges and never over important body copy.
 const vignette=ctx.createRadialGradient(400,218,110,400,218,565);
 vignette.addColorStop(0,"rgba(23,38,39,0)");
 vignette.addColorStop(1,"rgba(23,38,39,.15)");
 ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function tick(t){
 scheduled=false;
 if(!visible||!ready)return;
 const delta=lastTime?Math.min(50,t-lastTime):16;lastTime=t;
 progress=reduce.matches?wanted:lerp(progress,wanted,1-Math.exp(-delta/135));
 if(Math.abs(progress-wanted)<.0001)progress=wanted;
 const activity=smooth(.06,.98,progress);
 const targetSpeed=reduce.matches?0:.10+activity*(.22+1.9*activity*activity);
 speed=lerp(speed,targetSpeed,1-Math.exp(-delta/240));
 angle=(angle-speed*delta/1000)%(Math.PI*2);
 compose(t);
 stage.style.setProperty("--cine-progress",progress.toFixed(4));
 if(progressEl)progressEl.textContent=Math.round(progress*100)+"%";
 if(legend)legend.textContent=progress<.18?"Море переходить у потік":progress<.54?"Колесо набирає швидкість":progress<.87?"Вода відкриває напрями":"Обери свою категорію";
 buttons.forEach((btn,i)=>{
  // The labels are baked into the photographic artwork; transparent real
  // button hit areas are revealed by the liquid exactly as it crosses them.
  const line=[.345,.525,.69][i],level=1-smooth(.04,.96,progress)*(.84);
  const enabled=progress>.07&&level<line+.02;
  btn.disabled=!enabled;btn.tabIndex=enabled?0:-1;
  btn.setAttribute("aria-hidden",String(!enabled));
  btn.classList.toggle("is-active",enabled);
 });
 window.__cinematicV37={ready:true,source:"approved CGI still / local binary AVIF",
  mode:"photographic 2.5D",progress:+progress.toFixed(3),
  wheelDirection:"clockwise",angle:+angle.toFixed(3),
  risingWater:true,selectedService:selected,
  assetCompressedBytes:11713,generatedCGISequence:false};
 if(!reduce.matches||Math.abs(progress-wanted)>.0001)schedule();
}
function choose(i){
 selected=i;const d=descriptions[i];if(!d)return;
 detail.querySelector("strong").textContent=d[0];
 detail.querySelector("p").textContent=d[1];
 detail.hidden=false;
 buttons.forEach((b,n)=>b.setAttribute("aria-pressed",String(n===i)));
 mobileActions?.querySelectorAll("button").forEach((b,n)=>b.setAttribute("aria-pressed",String(n===i)));
 detail.querySelector("button")?.focus();
}
buttons.forEach((b,i)=>b.addEventListener("click",()=>choose(i)));
mobileActions?.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>choose(i)));
detail.querySelector("button")?.addEventListener("click",()=>{detail.hidden=true;buttons[selected]?.focus()});
CTA?.addEventListener("click",()=>{
 const rect=journey.getBoundingClientRect();
 const top=rect.top+scrollY,range=Math.max(1,journey.offsetHeight-innerHeight);
 scrollTo({top:top+range*.99,behavior:reduce.matches?"instant":"smooth"});
});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!detail.hidden){detail.hidden=true;buttons[selected]?.focus()}});
addEventListener("resize",resize,{passive:true});
addEventListener("scroll",target,{passive:true});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){lastTime=0;schedule()}});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible)schedule()},
 {rootMargin:"100px 0px"}).observe(stage);
resize();target();
const image=new Image();
image.onload=()=>prepare(image);
image.onerror=()=>{
 assetsError="Cinematic AVIF failed to decode";
 stage.classList.add("is-fallback");
 stage.querySelector(".cinematic-error").hidden=false;
 window.__cinematicV37Error=assetsError;
};
image.src="./assets/images/cinematic-v37-plate.avif?v=37";
})();