/* NATALIA & ANNA / Ocean-to-wheel horizontal bridge v43.
 * The actual fifth-scene DOM/Three.js canvas, not a screenshot or duplicate,
 * enters from the RIGHT over the last scroll portion of chapter four.
 * At the exact section boundary it hands control to native sticky section 05.
 */
(()=>{
 "use strict";
 const story=document.getElementById("experience");
 const mill=document.getElementById("conclusion");
 const wheelStage=document.getElementById("watermillStage");
 if(!story||!mill||!wheelStage)return;
 const reduce=matchMedia("(prefers-reduced-motion: reduce)");
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
 const start=.947;
 let visible=false,raf=0,lastPos=-1,enabled=false;
 const root=document.documentElement;
 function measure(){
  raf=0;
  if(document.hidden||reduce.matches){
   if(enabled){root.classList.remove("ocean-to-wheel-bridge");enabled=false;}
   return;
  }
  const h=innerHeight;
  const rect=story.getBoundingClientRect();
  const next=mill.getBoundingClientRect();
  const p=clamp(-rect.top/Math.max(1,rect.height-h));
  const progress=ease((p-start)/(1-start));
  // The fifth section hasn't reached the viewport yet; float its EXISTING
  // content into view from the right, then relinquish fixed positioning.
  const shouldBridge=p>=start && next.top>0 && rect.bottom>0;
  if(shouldBridge!==enabled){
   enabled=shouldBridge;
   root.classList.toggle("ocean-to-wheel-bridge",enabled);
  }
  if(shouldBridge)root.style.setProperty("--ocean-wheel-progress",progress.toFixed(5));
  else root.style.removeProperty("--ocean-wheel-progress");
  window.__oceanWheelBridge={
   active:shouldBridge,progress:+progress.toFixed(4),
   storyProgress:+p.toFixed(4),section05Top:+next.top.toFixed(1),
   actualScene05DOM:true,scrollReverseSupported:true
  };
  lastPos=p;
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(measure)}
 addEventListener("scroll",schedule,{passive:true});
 addEventListener("resize",schedule,{passive:true});
 addEventListener("pageshow",schedule);
 document.addEventListener("visibilitychange",schedule);
 reduce.addEventListener?.("change",schedule);
 schedule();
})();