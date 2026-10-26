/* Real CGI video scrubber for the separated cinematic experiment.
 * No artificial wheel, canvas sprites, image slices, or WebGL fakebacks.
 * Rendered MP4/WEBM is required before "ready" can become true.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const root=$("cineJourney"),screen=$("cineScreen"),video=$("cineVideo"),missing=$("cineMissing");
 const input=$("cineInput"),status=$("cineStatus"),phase=$("cinePhase"),percent=$("cinePercent");
 const services=[...document.querySelectorAll("[data-service]")];
 const detail=$("cineDetail"),close=$("cineClose"),cta=$("cineCTA");
 if(!root||!screen||!video)return;
 const reduce=matchMedia("(prefers-reduced-motion: reduce)");
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=(a,b,p)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t)};
 const servicesText=[
  ["IT та фриланс","Облік і бухгалтерський супровід для IT-ФОП, фрилансерів, дизайнерів та інших спеціалістів цифрової сфери."],
  ["ФОП та підприємці","Звітність, облік і практичний бухгалтерський супровід для підприємців та самозайнятих фахівців."],
  ["Малий бізнес","Бухгалтерська підтримка малого бізнесу — для роботи з цифрами без зайвої рутини."]
 ];
 let manifest=null,configured=false,ready=false,current=0,target=0,selected=-1,active=false;
 let objectURL=null,raf=0,lastTick=0,seekBusy=false,wantedTime=0,lastCommitted=-1;
 let mediaError="",loadedName="";
 function diagnostic(){window.__cinematicVideoLab={
  version:38,mode:"real pre-rendered cinematic video",hasRealVideo:ready,
  filmSource:loadedName||null,progress:+current.toFixed(4),
  desiredTime:+wantedTime.toFixed(3),renderedTime:+(Number.isFinite(video.currentTime)?video.currentTime:0).toFixed(3),
  scrubEnabled:ready,mediaError,
  fakeFrameGeneration:false,sourceConfigured:configured
 }}
 function message(text){status.textContent=text;mediaError=text;diagnostic()}
 function reveal(){
  missing.hidden=true;screen.classList.add("has-video");ready=true;
  lastCommitted=-1;seekBusy=false;lastTick=0;
  video.pause();schedule();diagnostic();
 }
 function setVideo(src,name,isLocal){
  if(!src)return;
  ready=false;seekBusy=false;lastCommitted=-1;configured=true;
  screen.classList.remove("has-video");missing.hidden=false;
  video.pause();video.removeAttribute("src");video.load();
  video.muted=true;video.playsInline=true;
  video.preload="auto";
  loadedName=name||"cinematic-video";
  mediaError="";
  video.src=src;
  video.load();
  message("Завантаження CGI-відео…");
  if(isLocal){
   // A muted play/pause after the file-picker gesture allows native
   // decoding on mobile browsers that delay seeking paused video.
   video.play().then(()=>video.pause()).catch(()=>{});
  }
 }
 video.addEventListener("loadedmetadata",()=>{
  if(!Number.isFinite(video.duration)||video.duration<=0){
   message("Відео не має коректної часової шкали.");return;
  }
  if(!video.videoWidth||!video.videoHeight){
   message("Не вдалося визначити розміри відео.");return;
  }
  message("Підготовлено "+video.videoWidth+"×"+video.videoHeight+" / "+video.duration.toFixed(1)+" с.");
  try{video.currentTime=.001}catch(_){}
  // Avoid the black flash that occurs when metadata exists but the first
  // decodable frame is not ready. Reveal only after actual frame data.
  if(video.readyState>=2)reveal();
 });
 video.addEventListener("loadeddata",()=>{if(!ready&&video.readyState>=2)reveal()});
 video.addEventListener("canplay",()=>{if(!ready&&video.readyState>=2)reveal()});
 video.addEventListener("error",()=>{
  ready=false;screen.classList.remove("has-video");missing.hidden=false;
  message("Файл недоступний або його формат не підтримується в цьому браузері.");
 });
 video.addEventListener("seeked",()=>{seekBusy=false;flush()});
 video.addEventListener("stalled",()=>{if(ready)status.textContent="Буферизація відео…"});
 video.addEventListener("waiting",()=>{if(ready)status.textContent="Завантаження кадрів…"});
 async function loadManifest(){
  try{
   const res=await fetch("./assets/data/watermill-cinematic-v38.json?v=38",{cache:"no-store"});
   if(!res.ok)throw Error("manifest HTTP "+res.status);
   manifest=await res.json();
   if(manifest?.videoSrc){
    const url=new URL(manifest.videoSrc,location.href);
    if(url.origin!==location.origin)throw Error("Для CGI потрібен файл із цього сайту.");
    setVideo(url.href,manifest.videoSrc,false);
   }else{
    configured=false;
    message("Відеорендер ще не доданий. Сторінка готова прийняти CGI-файл.");
   }
  }catch(error){message("Маніфест відео: "+error.message)}
 }
 function scrollTarget(){
  const b=root.getBoundingClientRect();
  target=clamp(-b.top/Math.max(1,root.offsetHeight-innerHeight));
  if(!active)renderUI();
  schedule();
 }
 function requestSeek(t){
  if(!ready||!Number.isFinite(video.duration)||video.duration<=0)return;
  wantedTime=Math.min(Math.max(.001,video.duration*.999),Math.max(.001,t));
  flush();
 }
 function flush(){
  if(!ready||seekBusy)return;
  if(Math.abs(video.currentTime-wantedTime)<1/45)return;
  if(Math.abs(wantedTime-lastCommitted)<1/60)return;
  seekBusy=true;
  lastCommitted=wantedTime;
  try{video.currentTime=wantedTime}catch(e){seekBusy=false;message("Не вдалося перейти до кадру: "+e.message)}
 }
 function renderUI(){
  document.documentElement.style.setProperty("--progress",current.toFixed(4));
  percent.textContent=Math.round(current*100)+"%";
  const events=manifest?.events||[
   {at:0,label:"Море переходить у потік"},{at:.19,label:"Колесо набирає швидкість"},
   {at:.40,label:"Вода заповнює простір"},{at:.73,label:"Відкриваються напрями"},
   {at:.91,label:"Обери свій напрям"}
  ];
  phase.textContent=ready?events.reduce((name,event)=>current>=event.at?event.label:name,events[0].label):
   "Очікуємо на CGI-відео";
  const marks=manifest?.categoryRevealProgress||[.62,.75,.87];
  for(let i=0;i<services.length;i++){
   const enabled=ready&&current>=marks[i];
   services[i].disabled=!enabled;services[i].classList.toggle("open",enabled);
   services[i].setAttribute("aria-hidden",String(!enabled));
   services[i].tabIndex=enabled?0:-1;
  }
  diagnostic();
 }
 function schedule(){if(!raf&&active)raf=requestAnimationFrame(tick)}
 function tick(time){
  raf=0;
  if(!active)return;
  const dt=lastTick?Math.min(56,time-lastTick):16;lastTick=time;
  current=reduce.matches?target:current+(target-current)*(1-Math.exp(-dt/110));
  if(Math.abs(current-target)<.00025)current=target;
  renderUI();
  if(ready)requestSeek(video.duration*current);
  if(Math.abs(current-target)>.00025)schedule();
 }
 input.addEventListener("change",()=>{
  const file=input.files?.[0];
  if(!file)return;
  if(!file.type.startsWith("video/")){message("Оберіть файл MP4 або WebM.");return}
  if(objectURL)URL.revokeObjectURL(objectURL);
  objectURL=URL.createObjectURL(file);setVideo(objectURL,file.name,true);
 });
 services.forEach((b,i)=>b.addEventListener("click",()=>{
  if(b.disabled)return;selected=i;
  $("cineDetailTitle").textContent=servicesText[i][0];
  $("cineDetailText").textContent=servicesText[i][1];
  detail.hidden=false;
  services.forEach((el,n)=>el.setAttribute("aria-pressed",String(n===i)));
  close.focus();
 }));
 function closeDetail(){detail.hidden=true;if(selected>=0)services[selected].focus()}
 close.addEventListener("click",closeDetail);
 window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!detail.hidden)closeDetail()});
 cta.addEventListener("click",()=>{
  const begin=root.getBoundingClientRect().top+scrollY;
  scrollTo({top:begin+Math.max(1,root.offsetHeight-innerHeight)*.94,behavior:reduce.matches?"instant":"smooth"});
 });
 const observer=new IntersectionObserver(entries=>{
  active=entries[0].isIntersecting;
  if(active){lastTick=0;schedule()}else{video.pause();if(raf){cancelAnimationFrame(raf);raf=0}}
 },{rootMargin:"80px 0px"});
 observer.observe(screen);
 addEventListener("scroll",scrollTarget,{passive:true});
 addEventListener("resize",scrollTarget,{passive:true});
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden){video.pause();lastTick=0}
  else if(active)schedule();
 });
 addEventListener("pagehide",()=>{if(objectURL)URL.revokeObjectURL(objectURL)});
 scrollTarget();loadManifest();
})();