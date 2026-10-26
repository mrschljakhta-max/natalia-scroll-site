import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({
 headless:true,args:['--disable-gpu-sandbox','--disable-dev-shm-usage']
});
const pageURL=process.env.SITE_URL||'http://127.0.0.1:4173/';
const clamp=(x)=>Math.max(0,Math.min(1,x));

async function check(viewport,reducedMotion='no-preference'){
 const page=await browser.newPage({viewport,reducedMotion});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(pageURL,{waitUntil:'domcontentloaded'});
  const stage=page.locator('#watermillStage');
  const wheel=page.locator('#millWheel');
  assert.equal(await page.locator('#conclusion .mill-category').count(),3);
  assert.equal(await page.locator('#experience .story-copy').count(),4);
  const target=async p=>page.evaluate(v=>{
    const el=document.getElementById('watermillJourney')||document.getElementById('conclusion');
    const y=el.getBoundingClientRect().top+scrollY;
    scrollTo({top:y+(el.offsetHeight-innerHeight)*v,behavior:'instant'});
  },clamp(p));

  await target(.11);
  // Both animation loops are paused until scene 05 enters the viewport.
  await page.waitForFunction(()=>window.__watermillDiagnostics?.scriptInitialized===true,
    null,{timeout:20000});
  await page.waitForFunction(()=>window.__watermill3D?.engine==='Three.js WebGL',
    null,{timeout:30000});
  assert.equal(await page.locator('#millWebGL canvas').count(),1,
    'real WebGL renderer should replace the fallback graphic');
  await page.waitForFunction(()=>window.__watermillDiagnostics?.progress>.09);
  const first=await page.evaluate(()=>window.__watermillDiagnostics);
  await target(.98);
  await page.waitForFunction(()=>window.__watermillDiagnostics?.progress>.95);
  const last=await page.evaluate(()=>window.__watermillDiagnostics);
  const real3D=await page.evaluate(()=>window.__watermill3D);
  const pbr=await page.evaluate(()=>window.__millPhotorealPBR);
  assert.equal(real3D.engine,'Three.js WebGL');
  assert.equal(real3D.materialVersion,33,'Expected updated realistic v33 materials');
  assert.equal(real3D.brassTextures,true);
  assert.equal(real3D.softReflections,true);
  assert.equal(real3D.liquidVolume,true);
  assert.ok(real3D.sprayParticles>=150,'Droplet spray should be volumetric');
  assert.equal(pbr.version,33);
  assert.equal(pbr.brassNormalMap,true);
  assert.equal(pbr.brassRoughnessMap,true);
  assert.equal(pbr.contactOcclusion,true);
  assert.equal(real3D.frontFacing,true);
  assert.equal(real3D.wheelDirection,'clockwise');
  assert.ok(real3D.rotationRadians<=0 && real3D.rotationRadians>=-Math.PI*2,
    'rotor should rotate clockwise from the front camera');
  assert.equal(real3D.seaLinked,true);
  assert.match(real3D.waterfall,/3D mesh/);
  assert.ok(real3D.waterLevel>.75,'WebGL ocean water should visibly rise');
  assert.ok(reducedMotion==='reduce'||real3D.angularVelocity>.2,
    'waterwheel should accelerate with the scroll');
  assert.equal(last.categoryCount,3);
  assert.equal(last.frontFacingWheel,true);
  assert.equal(last.waterShape,'single continuous fill');
  assert.ok(last.risingWaterTop<first.risingWaterTop-120,
    'water must rise as the page scrolls');
  assert.equal(await page.locator('.mill-category:not(:disabled)').count(),3,
    'all categories should become available when filled');

  const base=await wheel.boundingBox(),ground=await stage.boundingBox();
  assert.ok(base&&ground,'wheel/stage must be measurable');
  assert.ok(Math.abs(base.y+base.height-ground.y-ground.height)<2.5,
    'pedestal must touch bottom edge');

  await page.locator('.mill-category-2').click();
  assert.match(await page.locator('#millSelection').innerText(),/підприємц/i);

  await target(.1);
  await page.waitForFunction(()=>window.__watermillDiagnostics?.progress<.15);
  const reversed=await page.evaluate(()=>window.__watermillDiagnostics);
  assert.ok(reversed.risingWaterTop>last.risingWaterTop,
    'rising water must reverse on upward scroll');
  assert.deepEqual(errors,[],errors.join('\n'));

  console.log(JSON.stringify({viewport,reducedMotion,first,last,real3D,reversed,pass:true}));
 }finally{await page.close()}
}
try{
 await check({width:1535,height:900});
 await check({width:390,height:844});
 await check({width:1280,height:800},'reduce');
}finally{
 await browser.close();
}
