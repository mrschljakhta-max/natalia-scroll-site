import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paperBoatPoint} from '../assets/js/paper-boat-shape.mjs';

test('all three paper patches have finite, continuous rows including their duplicated seams',()=>{
 for(const [part,u0,u1,v0,v1,nx,ny] of [[0,0,1,0,.34,36,18],[1,0,.5,.34,1,18,36],[2,.5,1,.34,1,18,36]]){
  for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
   const u=u0+(u1-u0)*ix/nx,v=v0+(v1-v0)*iy/ny;
   const p=paperBoatPoint(u,v,part);
   assert.ok(p.every(Number.isFinite));
   if(iy>0){
    const before=paperBoatPoint(u,v-(v1-v0)/ny,part);
    assert.ok(Math.hypot(...p.map((n,i)=>n-before[i]))<.16,`patch ${part}: torn seam at ${u},${v}`);
   }
  }
 }
});
test('the two sails retain independent bases and tips at a shared UV boundary',()=>{
 assert.equal(paperBoatPoint(.5,.34,1)[1],-.60);
 assert.equal(paperBoatPoint(.5,.34,2)[1],-.61);
 assert.ok(Math.abs(paperBoatPoint(.5,1,1)[1]-2.70)<1e-10);
 assert.ok(Math.abs(paperBoatPoint(.5,1,2)[1]-2.11)<1e-10);
 assert.notDeepEqual(paperBoatPoint(.5,.34,0),paperBoatPoint(.5,.34,1));
});
test('the hull is open, has two raised rims and a submerged central keel',()=>{
 const front=paperBoatPoint(.5,0,0),back=paperBoatPoint(.5,.34,0),keel=paperBoatPoint(.5,.17,0);
 assert.ok(front[2]<0&&back[2]>0);
 assert.ok(keel[1]<front[1]-.7&&keel[1]<back[1]-.7);
 assert.ok(Math.abs(paperBoatPoint(0,.17,0)[0]+2.04)<1e-10);
 assert.ok(Math.abs(paperBoatPoint(1,.17,0)[0]-2.04)<1e-10);
});
