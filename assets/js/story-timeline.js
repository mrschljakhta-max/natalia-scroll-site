/* One reversible scroll clock; water and buoyancy keep their own real-time clock. */
(() => {
  'use strict';
  const journey = document.getElementById('experience');
  const stage = document.getElementById('stage');
  const mill = document.getElementById('conclusion');
  if (!journey || !stage || !mill) return;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const timing = Object.freeze({paperEnd: .60, travelStart: .67, travelEnd: .80});
  const panel = document.createElement('div');
  panel.className = 'ocean-panel';
  for (const child of [...stage.children]) {
    if (!child.matches('.topbar,.chapter-rail,.progress-track')) panel.append(child);
  }
  stage.prepend(panel);
  stage.append(mill);
  document.documentElement.classList.add('horizontal-story');
  const rail = stage.querySelector('.chapter-rail');
  const fifth = document.createElement('button');
  fifth.type = 'button'; fifth.className = 'chapter-dot mill-chapter';
  fifth.setAttribute('aria-label', 'Перейти до етапу: Кому допомагаємо');
  fifth.innerHTML = '<span>05 / ДЛЯ ВАС</span>';
  rail.append(fifth);
  const waterButton = document.createElement('button');
  waterButton.type = 'button'; waterButton.className = 'water-interaction';
  waterButton.setAttribute('aria-label', 'Торкнутися води — створити хвилю біля кораблика');
  waterButton.textContent = 'Торкніться води';
  panel.append(waterButton);
  const rawProgress = () => {
    const r = journey.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - stage.clientHeight));
  };
  const api = window.NAStory = {
    timing, panel, raw: 0, paper: 0, travel: 0, mill: 0,
    paperProgress: raw => clamp(raw / timing.paperEnd),
    rawProgress,
    go(raw) {
      const start = journey.getBoundingClientRect().top + scrollY;
      scrollTo({top: start + (journey.offsetHeight - stage.clientHeight) * clamp(raw),
        behavior: reduce.matches ? 'instant' : 'smooth'});
    },
    goPaper(p) { api.go(p >= .90 ? .635 : p * timing.paperEnd); },
    goMill(p = 0) { api.go(timing.travelEnd + clamp(p) * (1 - timing.travelEnd)); }
  };
  fifth.addEventListener('click', () => api.goMill(.15));
  document.querySelector('.skip')?.addEventListener('click', e => { e.preventDefault(); api.goMill(1); });
  document.querySelector('.brand')?.addEventListener('click', e => { e.preventDefault(); api.go(0); });
  waterButton.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('ocean-ripple', {detail: {nearBoat: true}}));
    waterButton.classList.add('was-used');
  });
  let previous = -1, frame = 0;
  function update() {
    frame = 0;
    const raw = rawProgress();
    api.raw = raw; api.paper = api.paperProgress(raw);
    const travelProgress = ease((raw - timing.travelStart) / (timing.travelEnd - timing.travelStart));
    api.travel = reduce.matches ? Number(travelProgress >= .5) : travelProgress;
    api.mill = clamp((raw - timing.travelEnd) / (1 - timing.travelEnd));
    if (Math.abs(raw - previous) > .000001) {
      const travel = api.travel;
      panel.style.transform = 'translate3d(' + (-travel * 100).toFixed(5) + '%,0,0)';
      mill.style.transform = 'translate3d(' + ((1 - travel) * 100).toFixed(5) + '%,0,0)';
      stage.style.setProperty('--travel', travel);
      stage.style.setProperty('--story-progress', raw);
      stage.classList.toggle('is-finale', api.paper >= .96);
      stage.classList.toggle('is-mill', travel > .55);
      const atMill = travel > .55;
      panel.inert = travel > .92;
      mill.inert = travel < .08;
      panel.setAttribute('aria-hidden', String(travel > .98));
      mill.setAttribute('aria-hidden', String(travel < .02));
      waterButton.hidden = api.paper < .96 || travel > .02;
      fifth.classList.toggle('active', atMill);
      if (atMill) {
        fifth.setAttribute('aria-current', 'step');
        stage.querySelectorAll('[data-jump]').forEach(el => {
          el.classList.remove('active'); el.removeAttribute('aria-current');
        });
      } else {
        fifth.removeAttribute('aria-current');
        if (api.paper > .82) {
          const last = stage.querySelector('[data-jump=".93"]');
          last?.classList.add('active'); last?.setAttribute('aria-current', 'step');
        }
      }
      previous = raw;
    }
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', request, {passive: true});
  addEventListener('resize', request, {passive: true});
  addEventListener('pageshow', request);
  reduce.addEventListener?.('change', () => { previous = -1; request(); });
  update();
  if (location.hash === '#conclusion') requestAnimationFrame(() => api.goMill(0));
})();
