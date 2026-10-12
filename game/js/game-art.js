// Deylo Garage — couche d'effets "art" du jeu : etoiles de vitesse (warp), ondes de
// choc (compte a rebours, nitro), eclats au crash, etincelles sur les points, cartes
// de voiture en 3D. Autonome : observe le DOM que main.js met a jour, sans toucher
// a la logique du jeu. Coupe tout si l'utilisateur prefere reduire les animations.
(function(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced) return;
  const doc = document, $ = (id)=>doc.getElementById(id);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = !finePointer || innerWidth < 760;

  function el(tag, cls, parent){ const e = doc.createElement(tag); if(cls) e.className = cls; (parent || doc.body).appendChild(e); return e; }
  function later(fn, ms){ return setTimeout(fn, ms); }

  // ---------- Onde de choc + etincelles (DOM, ephemeres) ----------
  function ring(x, y, color, size, cls){
    const r = el('div', 'ga-ring' + (cls ? ' ' + cls : ''));
    r.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--c:' + (color || '#8fd0ff') + ';--s:' + (size || 260) + 'px';
    later(()=>r.remove(), 900);
  }
  function sparks(x, y, color, n, dist){
    n = mobile ? Math.ceil(n * 0.6) : n;
    for(let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, d = (dist || 70) * (0.5 + Math.random() * 0.7);
      const s = el('i', 'ga-spark');
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--c:' + (color || '#ffe066') + ';--dx:' + (Math.cos(a) * d).toFixed(1) + 'px;--dy:' + (Math.sin(a) * d).toFixed(1) + 'px;--r:' + (Math.random() * 360 | 0) + 'deg';
      later(()=>s.remove(), 800);
    }
  }
  function center(node){ const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  // ---------- Etoiles de vitesse : des traits jaillissent du point de fuite ----------
  const speedFx = $('speedFx');
  if(speedFx){
    const cv = el('canvas', 'ga-warp'); cv.setAttribute('aria-hidden', 'true');
    const g = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    function size(){ dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    const MAX = mobile ? 70 : 140;
    const stars = [];
    function spawn(){ const a = Math.random() * Math.PI * 2; return { a, d:10 + Math.random() * 60, v:0.4 + Math.random() * 0.8, w:0.6 + Math.random() * 1.4, hue:Math.random() }; }
    let drawn = false, last = performance.now();
    (function frame(now){
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const spd = parseFloat(speedFx.style.getPropertyValue('--spd')) || 0;
      const boost = speedFx.classList.contains('boost');
      const paused = doc.body.classList.contains('dg-paused');
      if(spd < 0.12 || paused){ if(drawn){ g.clearRect(0, 0, W, H); drawn = false; stars.length = 0; } return; }
      drawn = true;
      const want = Math.round(MAX * Math.min(1, (spd - 0.1) * 1.3) * (boost ? 1.4 : 1));
      while(stars.length < want) stars.push(spawn());
      if(stars.length > want + 10) stars.length = want;
      const cx = W / 2, cy = H * 0.46, reach = Math.hypot(W, H) * 0.6;
      g.clearRect(0, 0, W, H);
      g.lineCap = 'round';
      const k = (boost ? 2.4 : 1) * (0.6 + spd);
      for(const s of stars){
        const prev = s.d;
        s.d += s.d * s.v * k * dt * 2.2 + 40 * dt;
        if(s.d > reach){ Object.assign(s, spawn()); continue; }
        const life = Math.min(1, s.d / (reach * 0.35));
        const tail = Math.max(prev, s.d - (18 + spd * 70 + (boost ? 90 : 0)) * life);
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        g.globalAlpha = Math.min(0.9, life * (0.25 + spd * 0.5) * (boost ? 1.5 : 1));
        g.strokeStyle = boost ? (s.hue > 0.5 ? '#9ff3ff' : '#ffffff') : (s.hue > 0.7 ? '#ffe9b0' : '#dfeaff');
        g.lineWidth = s.w * (0.6 + life);
        g.beginPath(); g.moveTo(cx + ca * tail, cy + sa * tail * 0.62); g.lineTo(cx + ca * s.d, cy + sa * s.d * 0.62); g.stroke();
      }
      g.globalAlpha = 1;
    })(last);

    // Allumage du nitro : onde de choc cyan + secousse legere de la camera (HUD)
    let wasBoost = false;
    new MutationObserver(()=>{
      const b = speedFx.classList.contains('boost');
      if(b && !wasBoost){
        ring(innerWidth / 2, innerHeight * 0.46, '#5fe1ff', Math.max(innerWidth, innerHeight) * 0.9, 'boost');
        const st = $('stage'); if(st){ st.classList.remove('ga-punch'); void st.offsetWidth; st.classList.add('ga-punch'); }
      }
      wasBoost = b;
    }).observe(speedFx, { attributes:true, attributeFilter:['class'] });
  }

  // ---------- Compte a rebours : chaque chiffre envoie une onde, GO explose ----------
  const cd = $('countdown');
  if(cd) new MutationObserver(()=>{
    const sp = cd.querySelector('span'); if(!sp) return;
    const x = innerWidth / 2, y = innerHeight / 2;
    if(sp.classList.contains('go')){
      ring(x, y, '#ffe066', Math.max(innerWidth, innerHeight) * 1.1, 'go');
      later(()=>ring(x, y, '#ff9500', Math.max(innerWidth, innerHeight) * 0.7, 'go'), 120);
      sparks(x, y, '#ffe066', 36, Math.min(innerWidth, innerHeight) * 0.45);
      const b = el('div', 'ga-burst'); later(()=>b.remove(), 1000);
    } else {
      ring(x, y, '#8fd0ff', 420);
    }
  }).observe(cd, { childList:true });

  // ---------- Crash : eclats de verre + aberration chromatique ----------
  const crash = $('crashFlash');
  if(crash) new MutationObserver(()=>{
    if(!crash.classList.contains('play')) return;
    const x = innerWidth / 2, y = innerHeight * 0.6;
    for(let i = 0; i < (mobile ? 18 : 30); i++){
      const a = -Math.PI * Math.random(), d = 120 + Math.random() * Math.max(innerWidth, innerHeight) * 0.45;
      const s = el('i', 'ga-shard');
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--dx:' + (Math.cos(a) * d * 1.3).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d * 0.8 + 260).toFixed(0) + 'px;--r:' + ((Math.random() - 0.5) * 900 | 0) + 'deg;--w:' + (6 + Math.random() * 16 | 0) + 'px;--h:' + (4 + Math.random() * 12 | 0) + 'px';
      later(()=>s.remove(), 1300);
    }
    ring(x, y, '#ff5a3d', 520);
    const st = $('stage'); if(st){ st.classList.remove('ga-glitch'); void st.offsetWidth; st.classList.add('ga-glitch'); }
  }).observe(crash, { attributes:true, attributeFilter:['class'] });

  // ---------- Points : etincelles a chaque popup, onde pour les grands messages ----------
  const popups = $('popups');
  if(popups) new MutationObserver((muts)=>{
    muts.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.nodeType !== 1) return;
      requestAnimationFrame(()=>{ const [x, y] = center(n); sparks(x, y, n.style.color || '#ffe066', 8, 46); });
    }));
  }).observe(popups, { childList:true });
  new MutationObserver((muts)=>{
    muts.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.nodeType !== 1) return;
      if(n.classList.contains('pop-stack')){ watchStack(n); return; }
    }));
  }).observe(doc.body, { childList:true });
  function watchStack(stack){
    new MutationObserver((muts)=>{
      muts.forEach(m=>m.addedNodes.forEach(n=>{
        if(n.nodeType !== 1 || n.classList.contains('long')) return;
        requestAnimationFrame(()=>{ const [x, y] = center(n); const c = n.style.color || '#ffe066'; ring(x, y, c, 300); sparks(x, y, c, 16, 110); });
      }));
    }).observe(stack, { childList:true });
  }
  doc.querySelectorAll('.pop-stack').forEach(watchStack);

  // ---------- Multiplicateur : apparition explosive ----------
  const mult = $('multBadge');
  if(mult){
    let was = false;
    new MutationObserver(()=>{
      const on = mult.classList.contains('show');
      if(on && !was) requestAnimationFrame(()=>{ const [x, y] = center(mult); ring(x, y, '#ff5ad1', 340); sparks(x, y, '#ff9500', 20, 90); });
      was = on;
    }).observe(mult, { attributes:true, attributeFilter:['class'] });
  }

  // ---------- Record battu : feu d'artifice dore sur le HUD ----------
  const chase = $('hudRecordChase');
  if(chase){
    let was = false;
    new MutationObserver(()=>{
      const on = chase.classList.contains('broken');
      if(on && !was){ const [x, y] = center(chase); ring(x, y, '#ffcc00', 380); sparks(x, y, '#ffcc00', 28, 140); }
      was = on;
    }).observe(chase, { attributes:true, attributeFilter:['class'] });
  }

  // ---------- Menus : cartes de voiture en 3D avec projecteur, etincelles au clic ----------
  if(finePointer){
    let cur = null;
    doc.addEventListener('pointermove', (e)=>{
      const card = e.target.closest && e.target.closest('.car-card:not(.locked),.route-card,.daily-card');
      if(cur && cur !== card){ cur.style.removeProperty('--rx'); cur.style.removeProperty('--ry'); cur.classList.remove('ga-tilting'); cur = null; }
      if(!card) return;
      cur = card;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.classList.add('ga-tilting');
      card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }, { passive:true });
  }
  doc.addEventListener('pointerdown', (e)=>{
    const b = e.target.closest && e.target.closest('.btn-go,.btn-side,.btn,.route-card,.car-card:not(.locked),.tab');
    if(!b) return;
    sparks(e.clientX, e.clientY, b.classList.contains('btn-go') ? '#bfe6ff' : '#ffe066', b.classList.contains('btn-go') ? 22 : 10, b.classList.contains('btn-go') ? 90 : 50);
    if(b.classList.contains('btn-go')) ring(e.clientX, e.clientY, '#8fd0ff', 260);
  }, { passive:true });
})();
