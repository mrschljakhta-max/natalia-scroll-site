import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({
 headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--disable-gpu-sandbox','--disable-dev-shm-usage']
});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const snapshots=[];
async function exercise(name,viewport,reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 try{
  const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response.status(),200,name+': HTTP error');
  await page.waitForFunction(()=>window.__origami3DReady===true,{timeout:45000}).catch(()=>{});
  const ready=await page.evaluate(()=>({
   active:!!window.__origami3DReady,
   fallback:document.documentElement.classList.contains('canvas-fallback'),
   diagnostics:window.__origami3DDiagnostics
  }));
  assert.equal(ready.active,true,name+': WebGL never initialized ('+JSON.stringify(errors)+')');
  assert.equal(ready.fallback,false,name+': Unexpected fallback');
  assert.match(ready.diagnostics?.finalScene||'',/v19/);
  assert.ok(ready.diagnostics?.waveVertices>5000,name+': no tessellated world sea');
  await page.evaluate(()=>{
   const el=document.querySelector('#experience');
   window.scrollTo({top:el.offsetTop+el.offsetHeight-innerHeight-2,behavior:'instant'});
  });
  await page.waitForFunction(()=>window.__origami3DProgress>.96,{timeout:12000});
  await page.waitForTimeout(1000);
  await mkdir('screenshots',{recursive:true});
  const canvas=page.locator('#origami3d canvas');
  assert.equal(await canvas.count(),1);
  const a=await canvas.screenshot({animations:'allow'});
  await page.screenshot({path:'screenshots/'+name+'-final.png'});
  await page.waitForTimeout(750);
  const b=await canvas.screenshot({animations:'allow'});
  if(reducedMotion==='no-preference'){
   assert.notEqual(hash(a),hash(b),name+': sea / boat not animating when scroll stopped');
  }
  await page.evaluate(()=>{
   const el=document.querySelector('#experience');
   window.scrollTo({top:el.offsetTop+el.offsetHeight*.27,behavior:'instant'});
  });
  await page.waitForFunction(()=>window.__origami3DProgress<.75,{timeout:12000});
  await page.screenshot({path:'screenshots/'+name+'-reverse.png'});
  assert.deepEqual(errors,[],name+': Browser console errors');
  snapshots.push({name,webgl:true,final:true,backwards:true,waveVertices:ready.diagnostics.waveVertices});
 }finally{await context.close();}
}
try{
 await exercise('desktop',{width:1440,height:900});
 await exercise('mobile',{width:390,height:844});
 await exercise('reduced-motion',{width:1280,height:720},'reduce');
 console.log('QA PASSED',JSON.stringify(snapshots));
}finally{await browser.close();}
