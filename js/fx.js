// Couche d'animations "premium" partagee par toutes les pages du site (hors jeu).
// Autonome : n'a besoin d'aucune autre lib. Expose DG.FX (countUp, toast, confetti,
// particles) pour les scripts de page. Coupe tout ce qui bouge si l'utilisateur
// prefere reduire les animations.
(function(){
  window.DG = window.DG || {};
  const doc = document, root = doc.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('fx-ready');

  function el(tag, cls, parent){ const e = doc.createElement(tag); if(cls) e.className = cls; (parent || doc.body).appendChild(e); return e; }

  // ---------- Decor : aurore, grain, progression du scroll ----------
  if(!reduced) el('div', 'fx-aurora').setAttribute('aria-hidden', 'true');
  el('div', 'fx-grain').setAttribute('aria-hidden', 'true');
  const progress = el('div', 'fx-progress');

  let ticking = false;
  function onScroll(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(()=>{
      ticking = false;
      const y = scrollY, max = doc.documentElement.scrollHeight - innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      const nav = doc.querySelector('.navbar');
      if(nav) nav.classList.toggle('scrolled', y > 24);
      for(const fn of scrollHooks) fn(y);
    });
  }
  const scrollHooks = [];
  addEventListener('scroll', onScroll, { passive:true });
  addEventListener('resize', onScroll);

  // ---------- Curseur lumineux ----------
  if(finePointer && !reduced){
    const ring = el('div', 'fx-cursor gone'), dot = el('div', 'fx-cursor-dot gone');
    let mx = -100, my = -100, rx = -100, ry = -100, seen = false, running = false;
    function kick(){ if(!running){ running = true; requestAnimationFrame(follow); } }
    addEventListener('pointermove', (e)=>{
      if(e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if(!seen){ seen = true; rx = mx; ry = my; ring.classList.remove('gone'); dot.classList.remove('gone'); }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      kick();
      const hot = e.target.closest && e.target.closest('a,button,[data-buy],[data-view3d],input,select,textarea,label,.playlist-row');
      ring.classList.toggle('hover', !!hot);
    }, { passive:true });
    addEventListener('pointerdown', ()=>ring.classList.add('down'));
    addEventListener('pointerup', ()=>ring.classList.remove('down'));
    doc.addEventListener('mouseleave', ()=>{ ring.classList.add('gone'); dot.classList.add('gone'); seen = false; });
    function follow(){
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      if(Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(follow); else running = false;
    }
  }

  // ---------- Apparitions au scroll + cascades ----------
  const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('is-in'); revealIO.unobserve(en.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -6% 0px' }) : null;

  function prepReveal(node){
    if(node.__fxReveal) return; node.__fxReveal = true;
    if(revealIO) revealIO.observe(node); else node.classList.add('is-in');
  }

  // Un conteneur [data-stagger] fait entrer ses enfants en cascade la premiere
  // fois qu'il est rempli, puis plus jamais : le garage re-rend toute sa grille a
  // chaque changement d'argent, rejouer l'animation a chaque achat serait penible.
  function prepStagger(box){
    if(box.hasAttribute('data-stagger-done')) return;
    const kids = Array.from(box.children).filter(k=>!k.classList.contains('skeleton'));
    if(!kids.length) return;
    kids.forEach((k, i)=>k.style.setProperty('--i', Math.min(i, 18)));
    box.querySelectorAll('.stat-bars').forEach(sb=>Array.from(sb.children).forEach((b, i)=>{ const inner = b.firstElementChild; if(inner) inner.style.setProperty('--i', i + 2); }));
    clearTimeout(box.__fxT);
    box.__fxT = setTimeout(()=>box.setAttribute('data-stagger-done', ''), Math.min(kids.length, 18) * 55 + 1500);
  }

  // ---------- Inclinaison 3D + projecteur ----------
  const TILT_SEL = '.car-card,.teaser-card,.fx-step,.board-highlight,[data-tilt]';
  function prepTilt(card){ card.classList.add('fx-tilt'); }

  if(finePointer && !reduced){
    let current = null;
    doc.addEventListener('pointermove', (e)=>{
      const card = e.target.closest && e.target.closest('.fx-tilt');
      if(current && current !== card){ resetTilt(current); current = null; }
      if(!card) return;
      current = card;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      const strength = card.classList.contains('board-highlight') ? 3 : 7;
      card.classList.add('tilting');
      card.style.setProperty('--ry', ((px - 0.5) * strength).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * strength).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }, { passive:true });
    doc.addEventListener('pointerleave', ()=>{ if(current){ resetTilt(current); current = null; } });
  }
  function resetTilt(card){ card.classList.remove('tilting'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }

  // ---------- Boutons magnetiques + ripple ----------
  const MAG_SEL = '.btn-primary:not(.btn-block),.btn-ghost:not(.btn-block),.nav-cta,[data-magnetic]';
  if(finePointer && !reduced){
    let magEl = null;
    doc.addEventListener('pointermove', (e)=>{
      const b = e.target.closest && e.target.closest(MAG_SEL);
      if(magEl && magEl !== b){ magEl.style.transform = ''; magEl = null; }
      if(b && !b.disabled){
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.28 - 2).toFixed(1) + 'px)';
        magEl = b;
      }
    }, { passive:true });
  }
  doc.addEventListener('pointerdown', (e)=>{
    const b = e.target.closest && e.target.closest('.btn,.nav-cta');
    if(!b || b.disabled || reduced) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const rip = doc.createElement('span');
    rip.className = 'fx-ripple';
    rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(rip);
    setTimeout(()=>rip.remove(), 750);
  });

  // ---------- Transitions entre pages ----------
  const leave = el('div', 'fx-curtain leave');
  leave.setAttribute('aria-hidden', 'true');
  doc.addEventListener('click', (e)=>{
    if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if(!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if(!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
    const url = new URL(a.href, location.href);
    if(url.origin !== location.origin) return;
    if(url.pathname === location.pathname && url.search === location.search) return;
    if(reduced) return;
    e.preventDefault();
    leave.classList.add('on');
    setTimeout(()=>{ location.href = url.href; }, 380);
  });
  addEventListener('pageshow', (e)=>{ if(e.persisted) leave.classList.remove('on'); });

  // Precharge la page visee des le survol / le toucher : la navigation parait instantanee.
  const prefetched = new Set();
  function prefetch(e){
    const a = e.target.closest && e.target.closest('a[href]');
    if(!a || a.target === '_blank') return;
    let url; try { url = new URL(a.href, location.href); } catch(err){ return; }
    if(url.origin !== location.origin || url.pathname === location.pathname || prefetched.has(url.pathname)) return;
    prefetched.add(url.pathname);
    const l = doc.createElement('link'); l.rel = 'prefetch'; l.href = url.pathname; doc.head.appendChild(l);
  }
  doc.addEventListener('pointerover', prefetch, { passive:true });
  doc.addEventListener('touchstart', prefetch, { passive:true });

  // ---------- Scan initial + contenu rendu plus tard (garage, classement...) ----------
  let lastMoney = null;
  function scan(scope){
    if(!scope.querySelectorAll) return;
    scope.querySelectorAll('[data-reveal]').forEach(prepReveal);
    scope.querySelectorAll(TILT_SEL).forEach(prepTilt);
    if(scope.matches && scope.matches(TILT_SEL)) prepTilt(scope);
  }
  function watchMoney(){
    const m = doc.getElementById('dgMoney');
    if(!m) return;
    const v = m.textContent;
    if(lastMoney !== null && v !== lastMoney && !/—/.test(lastMoney) && !/—/.test(v)){
      m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
    }
    lastMoney = v;
  }
  function boot(){
    scan(doc);
    doc.querySelectorAll('[data-stagger]').forEach(prepStagger);
    onScroll();
    new MutationObserver((muts)=>{
      const boxes = new Set();
      let money = false;
      for(const m of muts){
        m.addedNodes.forEach(n=>{ if(n.nodeType === 1) scan(n); });
        const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if(!t) continue;
        const box = t.closest('[data-stagger]');
        if(box) boxes.add(box);
        if(t.closest('#dgMoney') || t.id === 'site-nav' || t.closest('#site-nav')) money = true;
      }
      boxes.forEach(prepStagger);
      if(money) watchMoney();
    }).observe(doc.body, { childList:true, subtree:true, characterData:true });
  }
  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();

  // ================= API publique =================
  function countUp(node, to, opts){
    opts = opts || {};
    to = Number(to) || 0;
    const fmt = opts.format || (n=>Math.round(n).toLocaleString('fr-FR'));
    if(reduced || !node){ if(node) node.textContent = fmt(to); return; }
    const dur = opts.duration || 1600, t0 = performance.now();
    (function step(now){
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      node.textContent = fmt(to * e);
      if(k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // Lance countUp quand l'element entre a l'ecran (utile pour les chiffres plus bas dans la page)
  function countWhenVisible(node, to, opts){
    if(!node) return;
    if(!revealIO){ countUp(node, to, opts); return; }
    const io = new IntersectionObserver((es)=>{ if(es[0].isIntersecting){ io.disconnect(); countUp(node, to, opts); } }, { threshold:0.4 });
    io.observe(node);
  }

  let toastBox = null;
  function toast(msg, type){
    if(!toastBox) toastBox = el('div', 'fx-toasts');
    const t = el('div', 'fx-toast' + (type ? ' ' + type : ''), toastBox);
    t.setAttribute('role', 'status');
    t.textContent = msg;
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 460); }, 3600);
  }

  function confetti(x, y){
    if(reduced) return;
    const c = el('canvas', 'fx-confetti');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#9fb4c7';
    const colors = [accent, '#ffcc00', '#ffffff', '#4ee39a', '#ff5a5a'];
    const parts = Array.from({ length:110 }, ()=>{
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      return { x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 6, r:Math.random() * Math.PI, vr:(Math.random() - .5) * .4, w:5 + Math.random() * 6, h:3 + Math.random() * 4, c:colors[(Math.random() * colors.length) | 0], life:1 };
    });
    let last = performance.now();
    (function frame(now){
      const dt = Math.min(2, (now - last) / 16.7); last = now;
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for(const p of parts){
        p.vy += 0.32 * dt; p.vx *= Math.pow(0.985, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= 0.009 * dt;
        if(p.life <= 0 || p.y > innerHeight + 20) continue;
        alive++;
        g.save(); g.globalAlpha = Math.max(0, p.life); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore();
      }
      if(alive) requestAnimationFrame(frame); else c.remove();
    })(last);
  }

  // Poussiere lumineuse qui flotte (hero de l'accueil). Se met en pause hors ecran.
  function particles(host, count){
    if(reduced || !host) return;
    const c = el('canvas', 'fx-particles', host);
    const g = c.getContext('2d');
    let w = 0, h = 0, visible = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    function size(){ w = host.clientWidth; h = host.clientHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    const rgb = (getComputedStyle(root).getPropertyValue('--accent-rgb').trim() || '159,180,199');
    const spr = doc.createElement('canvas'); spr.width = spr.height = 32;
    const sg = spr.getContext('2d'), grad = sg.createRadialGradient(16,16,0,16,16,16);
    grad.addColorStop(0, 'rgba(' + rgb + ',1)'); grad.addColorStop(.25, 'rgba(' + rgb + ',.55)'); grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    sg.fillStyle = grad; sg.fillRect(0, 0, 32, 32);
    const pts = Array.from({ length:count || 70 }, ()=>({ x:Math.random() * w, y:Math.random() * h, r:Math.random() * 1.6 + .3, vx:(Math.random() - .5) * .15, vy:-(Math.random() * .35 + .05), a:Math.random() * .6 + .15, tw:Math.random() * Math.PI * 2 }));
    if('IntersectionObserver' in window) new IntersectionObserver((es)=>{ visible = es[0].isIntersecting; if(visible) requestAnimationFrame(frame); }).observe(host);
    function frame(){
      if(!visible) return;
      g.globalAlpha = 1;
      g.clearRect(0, 0, w, h);
      for(const p of pts){
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if(p.y < -5){ p.y = h + 5; p.x = Math.random() * w; }
        if(p.x < -5) p.x = w + 5; else if(p.x > w + 5) p.x = -5;
        g.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        const d = p.r * 7;
        g.drawImage(spr, p.x - d / 2, p.y - d / 2, d, d);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  DG.FX = { countUp, countWhenVisible, toast, confetti, particles, onScroll:(fn)=>scrollHooks.push(fn), reduced };
})();
