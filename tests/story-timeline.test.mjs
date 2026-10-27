import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

// A small DOM harness exercises the actual coordinator without a GPU/browser.
class Element {
  constructor(classes='',attrs={}) {
    this.children=[];this.attrs={...attrs};this.events={};this.values={};
    const classesSet=new Set(classes.split(' ').filter(Boolean));
    this.classList={add:c=>classesSet.add(c),remove:c=>classesSet.delete(c),
      contains:c=>classesSet.has(c),toggle:(c,on)=>on?classesSet.add(c):classesSet.delete(c)};
    Object.defineProperty(this,'className',{set:s=>{classesSet.clear();s.split(' ').forEach(c=>classesSet.add(c));}});
    this.style={setProperty:(key,value)=>{this.values[key]=value;}};
  }
  matches(selector) {
    return selector.split(',').some(s=>s.startsWith('.')?this.classList.contains(s.slice(1)):
      s==='[data-jump]'?'data-jump' in this.attrs:
      s==='[data-jump=".93"]'?this.attrs['data-jump']==='.93':false);
  }
  append(child) {if(child.parent)child.parent.children=child.parent.children.filter(e=>e!==child);child.parent=this;this.children.push(child);}
  prepend(child) {this.append(child);this.children.unshift(this.children.pop());}
  querySelectorAll(selector) {return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
  querySelector(selector) {return this.querySelectorAll(selector)[0];}
  setAttribute(k,v) {this.attrs[k]=v;}
  removeAttribute(k) {delete this.attrs[k];}
  addEventListener(name,fn) {(this.events[name]??=[]).push(fn);}
  click() {this.events.click?.forEach(fn=>fn({preventDefault(){}}));}
}
function setup(reduced=false,hash='') {
  const stage=new Element('stage'),journey=new Element('journey'),mill=new Element('watermill-journey');
  const root=new Element(),bar=new Element('topbar'),brand=new Element('brand'),rail=new Element('chapter-rail');
  const skip=new Element('skip'),content=new Element('headline-area'),progress=new Element('progress-track');
  journey.offsetHeight=10000;stage.clientHeight=1000;
  bar.append(brand);stage.append(content);stage.append(bar);stage.append(rail);stage.append(progress);
  for(const n of ['0','.38','.70','.93'])rail.append(new Element('chapter-dot',{'data-jump':n}));
  const elements={experience:journey,stage,conclusion:mill};
  const listeners={},queue=[],calls=[];
  const context={console,location:{hash},scrollY:0,
    matchMedia:()=>({matches:reduced}),
    document:{documentElement:root,getElementById:id=>elements[id],createElement:()=>new Element(),
      querySelector:s=>s==='.skip'?skip:s==='.brand'?brand:null},
    requestAnimationFrame:fn=>{queue.push(fn);return queue.length;},
    addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn);},
    scrollTo:options=>{context.scrollY=options.top;calls.push(options);},
  };
  context.window=context;
  journey.getBoundingClientRect=()=>({top:-context.scrollY,height:journey.offsetHeight});
  vm.runInNewContext(readFileSync(new URL('../assets/js/story-timeline.js',import.meta.url),'utf8'),context);
  const flush=()=>{while(queue.length)queue.shift()();};
  const at=raw=>{context.scrollY=raw*(journey.offsetHeight-stage.clientHeight);listeners.scroll.forEach(fn=>fn());flush();};
  return {api:context.NAStory,stage,mill,rail,bar,progress,content,skip,calls,at,flush,journey};
}
test('the original paper journey finishes before the horizontal transition',()=>{
  const h=setup();h.at(.60);
  assert.equal(h.api.paper,1);assert.equal(h.api.travel,0);assert.equal(h.api.mill,0);
  h.at(.635);assert.equal(h.api.travel,0);
  assert.equal(h.content.parent,h.api.panel);
  assert.equal(h.bar.parent,h.stage);assert.equal(h.rail.parent,h.stage);assert.equal(h.progress.parent,h.stage);
});
test('horizontal panels meet without a gap and fully reverse',()=>{
  const h=setup();h.at(.735);
  assert.ok(Math.abs(h.api.travel-.5)<1e-8);
  assert.equal(h.api.panel.style.transform,'translate3d(-50.00000%,0,0)');
  assert.equal(h.mill.style.transform,'translate3d(50.00000%,0,0)');
  h.at(.90);assert.equal(h.api.travel,1);assert.ok(Math.abs(h.api.mill-.5)<1e-8);
  assert.equal(h.api.panel.inert,true);assert.equal(h.mill.inert,false);
  h.at(.635);assert.equal(h.api.panel.inert,false);assert.equal(h.mill.inert,true);
  assert.equal(h.api.panel.style.transform,'translate3d(0.00000%,0,0)');
});
test('chapter and skip navigation land on stable complete scenes',()=>{
  const h=setup();h.api.goPaper(.93);assert.equal(h.calls.at(-1).top,5715);
  h.skip.click();assert.equal(h.calls.at(-1).top,9000);
  h.api.goMill(.5);assert.equal(h.calls.at(-1).top,8100);
  h.journey.offsetHeight=18000;h.api.goPaper(.93);assert.equal(h.calls.at(-1).top,10795);
});
test('reduced motion replaces the sideways movement with a direct switch',()=>{
  const h=setup(true);h.at(.72);assert.equal(h.api.travel,0);
  h.at(.75);assert.equal(h.api.travel,1);
  h.api.goMill(1);assert.equal(h.calls.at(-1).behavior,'instant');
});
test('direct conclusion links enter the mill at its beginning',()=>{
  const h=setup(false,'#conclusion');h.flush();assert.equal(h.calls.at(-1).top,7200);
});
