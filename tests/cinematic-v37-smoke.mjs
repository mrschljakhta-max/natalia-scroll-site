import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
const base=process.env.SITE_URL||"http://127.0.0.1:4173/cinematic-v37.html";
async function check(viewport,reducedMotion="no-preference"){
 const page=await browser.newPage({viewport,reducedMotion});
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
 try{
  const response=await page.goto(base,{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.waitForFunction(()=>window.__cinematicV37?.ready===true,null,{timeout:20000});
  const asset=await page.evaluate(()=>window.__cinematicV37);
  assert.equal(asset.mode,"photographic 2.5D");
  assert.equal(asset.wheelDirection,"clockwise");
  assert.equal(asset.generatedCGISequence,false);

  // Scroll 4 viewport heights inside a sticky cinematic narrative.
  const setScroll=async p=>{
    await page.evaluate(v=>{
      const e=document.getElementById("cinematicJourney");
      window.scrollTo({top:e.offsetTop+v*(e.offsetHeight-innerHeight),behavior:"instant"});
    },p);
  };
  await setScroll(.08);
  await page.waitForFunction(()=>window.__cinematicV37?.progress<.2);
  const early=await page.evaluate(()=>{
    const v=document.getElementById("cinematicCanvas"),c=v.getContext("2d");
    const x=Math.floor(v.width*.94),y=Math.floor(v.height*.50);
    return {p:window.__cinematicV37.progress,
      pixel:[...c.getImageData(x,y,1,1).data],
      angle:window.__cinematicV37.angle};
  });
  await setScroll(.96);
  await page.waitForFunction(()=>window.__cinematicV37?.progress>.93,null,{timeout:15000});
  const late=await page.evaluate(()=>{
    const v=document.getElementById("cinematicCanvas"),c=v.getContext("2d");
    const x=Math.floor(v.width*.94),y=Math.floor(v.height*.50);
    return {p:window.__cinematicV37.progress,
      pixel:[...c.getImageData(x,y,1,1).data],
      angle:window.__cinematicV37.angle,
      labels:[...document.querySelectorAll("[data-cine-service]")].filter(b=>!b.disabled).length};
  });
  assert.equal(late.labels,3,"all three service categories should be activated by water rise");
  assert.ok(early.pixel.some((c,i)=>i<3&&Math.abs(c-late.pixel[i])>25),
    "right-hand sea should visually change as water rises");
  assert.ok(late.angle<early.angle||Math.abs(late.angle-early.angle)>0.1,
    "wheel must actually animate while scroll progresses");

  if(viewport.width>790){
   await page.locator('[data-cine-service="0"]').click();
  } else {
   await page.locator(".mobile-services button").first().click();
  }
  assert.equal(await page.locator("#cinematicDetail").isVisible(),true);
  assert.match(await page.locator("#cinematicDetail strong").innerText(),/IT та фриланс/);
  await page.locator("#cinematicDetail button").click();
  assert.equal(await page.locator("#cinematicDetail").isVisible(),false);

  await setScroll(.12);
  await page.waitForFunction(()=>window.__cinematicV37?.progress<.17);
  assert.equal((await page.evaluate(()=>window.__cinematicV37)).risingWater,true);
  assert.deepEqual(errors,[],errors.join("\n"));
  const path=process.env.CI?"screenshots/v37-"+viewport.width+"-"+reducedMotion+".png":null;
  if(path)await page.screenshot({path,fullPage:false});
  console.log(JSON.stringify({viewport,reducedMotion,early,late,passed:true}));
 }finally{await page.close()}
}
try{
 await check({width:1535,height:900});
 await check({width:390,height:844});
 await check({width:1280,height:800},"reduce");
}finally{await browser.close()}
