/* Lightweight moving water and touch feedback when a GPU is unavailable. */
(() => {
  const stage = document.getElementById('stage');
  const panel = document.querySelector('.ocean-panel');
  if (!stage || !panel) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'ocean-fallback-waves';
  canvas.setAttribute('aria-hidden', 'true');
  panel.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ripples = [];
  let width = 0, height = 0, down = null, frame = 0;
  const ready = () => document.documentElement.classList.contains('canvas-fallback') &&
    window.NAStory?.paper > .95 && window.NAStory?.travel < .99;
  function addRipple(x, y) {
    if (!ready() || reduce.matches || y < height * .58) return;
    ripples.push({x, y, start: performance.now()});
    if (ripples.length > 4) ripples.shift();
    stage.dataset.rippleCount = String(Number(stage.dataset.rippleCount || 0) + 1);
  }
  stage.addEventListener('pointerdown', e => { down = {x:e.clientX,y:e.clientY}; }, {passive:true});
  stage.addEventListener('pointercancel', () => { down = null; }, {passive:true});
  stage.addEventListener('pointerup', e => {
    const start = down; down = null;
    if (!start || e.target.closest('button,a') || Math.hypot(e.clientX-start.x,e.clientY-start.y)>9) return;
    const rect = stage.getBoundingClientRect();
    addRipple(e.clientX-rect.left,e.clientY-rect.top);
  }, {passive:true});
  addEventListener('ocean-ripple', () => addRipple(width*.60,height*.76));
  function draw(now) {
    frame = 0;
    if (document.hidden) return;
    frame = requestAnimationFrame(draw);
    canvas.hidden = !ready();
    if (canvas.hidden) return;
    const w = stage.clientWidth,h = stage.clientHeight;
    if (w !== width || h !== height) {
      width=w;height=h;
      const dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=w*dpr;canvas.height=h*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    const t=reduce.matches?0:now*.001;
    ctx.clearRect(0,0,w,h);
    const horizon=h*.58;
    // Increasing spacing and amplitude simulate perspective without a flat grid.
    for(let i=0;i<68;i++) {
      const depth=(i+.5)/68,y=horizon+depth*depth*(h-horizon);
      const wave=1+depth*4,span=26+depth*90;
      ctx.beginPath();
      for(let x=-10;x<=w+10;x+=8){
        const yy=y+Math.sin(x/span+t*(.35+depth*.3)+i*1.71)*wave;
        if(x===-10)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
      }
      ctx.strokeStyle=i%3===0?'rgba(220,235,211,.17)':'rgba(9,64,72,.12)';
      ctx.lineWidth=.55+depth*1.15;ctx.stroke();
      // Broken golden reflections sit underneath the sun.
      for(let j=0;j<3;j++) {
        const spread=12+depth*w*.13;
        const x=w*.80+Math.sin(i*7.13+j*3.21+t*.4)*spread;
        const length=3+depth*23*(.5+.5*Math.sin(i*3.14+j));
        ctx.fillStyle=`rgba(255,227,177,${(.14+Math.sin(i*2.31+t)*.07)*(1-depth*.5)})`;
        ctx.fillRect(x,y,length,.6+depth);
      }
    }
    for(const ripple of ripples) {
      const age=(now-ripple.start)/1000;
      if(age>5)continue;
      for(let i=0;i<3;i++) {
        const radius=Math.max(0,age*85-i*16);
        ctx.beginPath();ctx.ellipse(ripple.x,ripple.y,radius,radius*.24,0,0,Math.PI*2);
        ctx.strokeStyle=`rgba(240,246,222,${Math.max(0,(1-age/5)*.43-i*.07)})`;
        ctx.lineWidth=1.2;ctx.stroke();
      }
    }
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!frame)frame=requestAnimationFrame(draw);});
  frame=requestAnimationFrame(draw);
})();
