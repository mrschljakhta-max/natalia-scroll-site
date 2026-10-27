/* Chapter 04 / cinematic sunset sailboat slow motion, v41.
 * Native video is scroll-scrubbed at 0.42x spatial time, so the stronger
 * Runway waves feel calm. Original origami-fold scene remains the fallback.
 * No baked-in typography; original brand and copy remain accessible HTML.
 */
(()=>{
  "use strict";
  const stage=document.getElementById("stage");
  const journey=document.getElementById("experience");
  const video=document.getElementById("boatFilmVideo");
  const layer=document.getElementById("boatFilm");
  if(!stage||!journey||!video||!layer)return;
  const reduce=matchMedia("(prefers-reduced-motion: reduce)");
  const clamp=x=>Math.min(1,Math.max(0,x));
  const ease=x=>{const a=clamp(x);return a*a*(3-2*a)};
  const getP=()=>{
    const r=journey.getBoundingClientRect();
    return clamp(-r.top/Math.max(1,r.height-innerHeight));
  };
  let manifest=null,ready=false,active=false,raf=0,last=0;
  let current=0,target=0,wantedTime=.001,source="none",lastRequested=-1;
  let seekFailed=false,mediaFailure=null;
  function diagnostics(){
    window.__boatFilmV41={
      version:41,ready,source,active,progress:+current.toFixed(4),
      requestedFrameSeconds:+wantedTime.toFixed(3),
      decodedFrameSeconds:video.readyState>=1?+video.currentTime.toFixed(3):0,
      slowMotionFactor:manifest?.slowMotionFactor??.42,
      originalThreeJsFallback:!ready,mediaFailure
    };
  }
  function update(){
    if(!manifest||!ready){diagnostics();return}
    const enter=manifest.startAtStoryProgress,full=manifest.fullyVisibleStoryProgress;
    const opacity=ease((current-enter)/(full-enter));
    layer.style.opacity=opacity.toFixed(4);
    const visible=opacity>.985;
    stage.classList.toggle("has-boat-film",visible);
    // The film occupies the completed fold only, never the earlier 3 chapters.
    // Sampling 42% of the source across 100% of the fourth act is true
    // scroll-linked slow motion; going back on the mouse wheel reverses time.
    const t=ease((current-enter)/(1-enter));
    const maxTime=Math.min(video.duration-.035,manifest.maxSourceSeconds);
    wantedTime=Math.max(.001,t*maxTime);
    if(!video.seeking && Math.abs(video.currentTime-wantedTime)>.03){
      try{video.currentTime=wantedTime;lastRequested=wantedTime}
      catch(err){seekFailed=true;mediaFailure=String(err)}
    }
    diagnostics();
  }
  video.addEventListener("seeked",()=>{
    if(!ready)return;
    // Coalesce fast wheel turns without piling up queued seek operations.
    if(Math.abs(video.currentTime-wantedTime)>.04){
      try{video.currentTime=wantedTime}catch(_){}
    }
  });
  function frame(now){
    raf=0;
    if(!active)return;
    const dt=last?Math.min(50,now-last):16;
    last=now;
    target=getP();
    const k=reduce.matches?1:1-Math.exp(-dt/120);
    current+=((target-current)*k);
    if(Math.abs(target-current)<.0001)current=target;
    update();
    // Keep rendering the last seek while scroll is happening; pause the
    // loop only when completely offscreen.
    raf=requestAnimationFrame(frame);
  }
  function setActive(value){
    active=value;
    if(active&&!raf){last=0;raf=requestAnimationFrame(frame)}
    if(!active&&raf){cancelAnimationFrame(raf);raf=0}
    video.pause();
  }
  async function selectSource(){
    const local=new URL("./"+manifest.localSrc,location.href);
    try{
      const result=await fetch(local,{method:"HEAD",cache:"no-store"});
      if(result.ok)return {url:local.href,kind:"permanent local MP4"};
    }catch(_){}
    return {url:manifest.previewSrc,kind:"Runway temporary CGI preview"};
  }
  function startVideo(src){
    if(!src?.url)throw Error("No cinematic video source");
    source=src.kind;
    video.muted=true;video.playsInline=true;video.autoplay=false;video.loop=false;
    video.preload="auto";video.src=src.url;video.load();
    video.pause();
  }
  function mediaReady(){
    if(ready||!Number.isFinite(video.duration)||video.duration<=0)return;
    ready=true;mediaFailure=null;
    current=target=getP();
    stage.classList.add("boat-film-available");
    update();
  }
  video.addEventListener("loadedmetadata",()=>{
    if(video.readyState>=2)mediaReady();
    else {try{video.currentTime=.001}catch(_){}}
  });
  video.addEventListener("loadeddata",mediaReady);
  video.addEventListener("canplay",mediaReady);
  video.addEventListener("error",()=>{
    ready=false;mediaFailure="Boat film MP4 unavailable or URL expired";
    stage.classList.remove("boat-film-available","has-boat-film");
    layer.style.opacity="0";
    diagnostics();
  });
  const io=new IntersectionObserver(items=>setActive(items[0].isIntersecting),
    {rootMargin:"120px 0px"});
  io.observe(stage);
  addEventListener("resize",()=>{target=getP()},{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){video.pause();last=0}
    else if(active&&!raf){raf=requestAnimationFrame(frame)}
  });
  async function init(){
    try{
      const resp=await fetch("./assets/data/origami-boat-cinematic-v41.json?v=41",{cache:"no-store"});
      if(!resp.ok)throw Error("Film manifest HTTP "+resp.status);
      manifest=await resp.json();
      startVideo(await selectSource());
      diagnostics();
    }catch(err){mediaFailure=String(err);diagnostics()}
  }
  init();
})();