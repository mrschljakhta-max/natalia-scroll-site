/* Cinematic film v40 — two real Runway CGI segments driven by native page scroll.
 * Chapters 01–04 are untouched; chapter 05 uses media only once loaded.
 * Remote previews are temporary; when same-origin MP4 files exist they win.
 */
(()=>{
  "use strict";
  const stage=document.getElementById("watermillStage");
  const journey=document.getElementById("conclusion");
  const first=document.getElementById("millFilmFill");
  const second=document.getElementById("millFilmSettle");
  const status=document.getElementById("millFilmStatus");
  const progressLabel=document.getElementById("millFilmProgress");
  const phaseLabel=document.getElementById("millFilmPhase");
  if(!stage||!journey||!first||!second)return;
  const videos=[first,second], ready=[false,false], failed=[false,false];
  const reduce=matchMedia("(prefers-reduced-motion: reduce)");
  const clamp=x=>Math.min(1,Math.max(0,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  let manifest=null,durations=[10.041,5.041],target=0,current=0,raf=0,last=0,inView=false,lastRendered=-1;
  let usedSources=["",""],mediaStatus="loading";
  const cards=[...stage.querySelectorAll("[data-mill-category]")];
  function diagnostics(){
    window.__cinematicFilmV40={
      loaded:ready.slice(),failed:failed.slice(),source:usedSources.slice(),
      segment:current*sum()<durations[0]?"fill":"settle",
      progress:+current.toFixed(4),totalDurationSeconds:+sum().toFixed(3),
      mediaStatus,scrollControlled:true,interactiveHTML:true,
      note:"Preview URLs expire; for stable delivery publish permanent same-origin MP4 files."
    };
  }
  function sum(){return durations[0]+durations[1]}
  function scrollProgress(){
    const rect=journey.getBoundingClientRect();
    return clamp(-rect.top/Math.max(1,journey.offsetHeight-innerHeight));
  }
  function requestSeek(video,t){
    if(!video || video.readyState===0||!Number.isFinite(video.duration))return;
    const wanted=Math.min(Math.max(.001,t),Math.max(.001,video.duration-.035));
    // Coalesce rapid wheel scrolling rather than enqueueing seeks;
    // final seek is requested again after every seeked event.
    video.dataset.wanted=String(wanted);
    if(video.seeking)return;
    if(Math.abs(video.currentTime-wanted)<.027)return;
    try{video.currentTime=wanted}catch(_){}
  }
  videos.forEach(v=>v.addEventListener("seeked",()=>{
    const t=Number(v.dataset.wanted);
    if(Number.isFinite(t))requestSeek(v,t);
  }));
  function render(){
    if(!manifest||!ready[0])return;
    const t=current*sum(),cut=durations[0];
    if(t<cut+.40){
      requestSeek(first,Math.min(cut-.04,Math.max(0,t)));
    } else if(first.readyState>=2 && Math.abs(first.currentTime-(cut-.045))>.06){
      requestSeek(first,cut-.045);
    }
    if(ready[1]&&t>cut-.5)requestSeek(second,Math.max(0,t-cut));
    // Fade across the seam. At all other times the first movie remains unchanged.
    const fade=ready[1]?clamp((t-(cut-.08))/.26):0;
    second.style.opacity=String(fade);
    if(status)status.textContent=t<cut?"CGI / НАПОВНЕННЯ":"CGI / ХВИЛІ";
    if(progressLabel)progressLabel.textContent=Math.round(current*100)+"%";
    if(phaseLabel)phaseLabel.textContent=t<cut?"Вода заповнює простір":t<cut+2.8?"Вода м’яко коливається":"Поверхня заспокоюється";
    stage.style.setProperty("--mill-progress",current.toFixed(4));
    diagnostics();
  }
  function loop(now){
    raf=0;
    if(!inView)return;
    const dt=last?Math.min(56,now-last):16;
    last=now;
    target=scrollProgress();
    current=reduce.matches?target:lerp(current,target,1-Math.exp(-dt/85));
    if(Math.abs(current-target)<.00015)current=target;
    if(ready[0])render();
    raf=requestAnimationFrame(loop);
  }
  function updateState(){
    const playing=ready[0];
    stage.classList.toggle("has-cinematic-film",playing);
    mediaStatus=playing?(ready[1]?"ready":"fill-only"):"fallback-3d";
    if(!playing&&progressLabel)progressLabel.textContent="";
    diagnostics();
    if(inView&&!raf){last=0;raf=requestAnimationFrame(loop)}
  }
  function loadVideo(index,source){
    const v=videos[index];
    usedSources[index]=source;
    v.muted=true;v.playsInline=true;v.preload="auto";v.loop=false;v.autoplay=false;
    v.pause();
    v.addEventListener("loadeddata",()=>{ready[index]=true;failed[index]=false;v.pause();updateState()},{once:true});
    v.addEventListener("canplay",()=>{if(!ready[index]){ready[index]=true;failed[index]=false;v.pause();updateState()}},{once:true});
    v.addEventListener("error",()=>{ready[index]=false;failed[index]=true;updateState()});
    v.src=source;v.load();
  }
  async function resolveSource(segment){
    const local=new URL("./"+segment.localSrc,location.href);
    try{
      const h=await fetch(local.href,{method:"HEAD",cache:"no-store"});
      if(h.ok && (/video|octet-stream/i).test(h.headers.get("content-type")||"video"))return local.href;
    }catch(_){}
    return segment.previewSrc;
  }
  async function init(){
    try{
      const r=await fetch("./assets/data/cinematic-film-v40.json?v=40",{cache:"no-store"});
      if(!r.ok)throw Error("Film manifest "+r.status);
      manifest=await r.json();
      durations=manifest.segments.map(s=>s.durationSeconds);
      const src=await Promise.all(manifest.segments.map(resolveSource));
      src.forEach((url,i)=>loadVideo(i,url));
      current=target=scrollProgress();
      diagnostics();
    }catch(error){
      mediaStatus=String(error);
      stage.classList.remove("has-cinematic-film");
      diagnostics();
      console.warn("[Cinematic v40]",error);
    }
  }
  const observer=new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;
    if(inView&&!raf){last=0;raf=requestAnimationFrame(loop)}
    if(!inView){videos.forEach(v=>v.pause());if(raf){cancelAnimationFrame(raf);raf=0}}
  },{rootMargin:"100px 0px"});
  observer.observe(stage);
  addEventListener("resize",()=>{target=scrollProgress()},{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){videos.forEach(v=>v.pause());last=0;}
    else if(inView&&!raf){raf=requestAnimationFrame(loop)}
  });
  // Simple focused manual override for offline approval on the same device:
  // load local files by video element API without uploading anything.
  window.__useCinematicLocalFiles=(fillFile,settleFile)=>{
    if(fillFile){const old=first.dataset.objectURL;if(old)URL.revokeObjectURL(old);const u=URL.createObjectURL(fillFile);first.dataset.objectURL=u;ready[0]=false;loadVideo(0,u)}
    if(settleFile){const old=second.dataset.objectURL;if(old)URL.revokeObjectURL(old);const u=URL.createObjectURL(settleFile);second.dataset.objectURL=u;ready[1]=false;loadVideo(1,u)}
  };
  addEventListener("pagehide",()=>videos.forEach(v=>{if(v.dataset.objectURL)URL.revokeObjectURL(v.dataset.objectURL)}));
  init();
})();