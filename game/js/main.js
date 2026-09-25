(function(){
  const $ = (id)=>document.getElementById(id);
  const els = {
    ovLoading:$('ovLoading'), ovNaming:$('ovNaming'), ovChoosing:$('ovChoosing'), ovPaused:$('ovPaused'), ovOver:$('ovOver'), ovBoard:$('ovBoard'),
    hudTop:$('hudTop'), hudBottom:$('hudBottom'), multBadge:$('multBadge'), multTime:$('multTime'), popups:$('popups'),
    hudTime:$('hudTime'), hudScore:$('hudScore'), hudSpeed:$('hudSpeed'), hudSpeedCell:$('hudSpeedCell'), camLabel:$('camLabel'), boostFill:$('boostFill'),
    pilotName:$('pilotName'), pilotMoney:$('pilotMoney'), routeTabs:$('routeTabs'), carGrid:$('carGrid'), btnStart:$('btnStart'), btnBoardOpen:$('btnBoardOpen'),
    btnResume:$('btnResume'), btnRestartFromPause:$('btnRestartFromPause'), btnQuitFromPause:$('btnQuitFromPause'),
    overScore:$('overScore'), overTime:$('overTime'), overCredits:$('overCredits'), overBoard:$('overBoard'), ovRecordBadge:$('ovRecordBadge'), overCarSpin:$('overCarSpin'),
    btnRetry:$('btnRetry'), btnChangeCar:$('btnChangeCar'), btnWatchAd:$('btnWatchAd'),
    fullBoard:$('fullBoard'), btnBoardClose:$('btnBoardClose'),
    dailyCard:$('dailyCard'), dailyDesc:$('dailyDesc'), dailyCta:$('dailyCta'),
    dailyBrand:$('dailyBrand'), dailyCarName:$('dailyCarName'), dailyStars:$('dailyStars'), dailyReward:$('dailyReward'), dailyRing:$('dailyRing'), dailyPct:$('dailyPct'),
    dailyBar:$('dailyBar'), dailyNote:$('dailyNote'), dailyStreak:$('dailyStreak'), dailyTimer:$('dailyTimer'),
    drawCard:$('drawCard'), drawDesc:$('drawDesc'), drawCta:$('drawCta'), drawNote:$('drawNote'), drawTimer:$('drawTimer'), drawStreak:$('drawStreak'),
    ovWheel:$('ovWheel'), wheelEl:$('wheelEl'), reelTrack:$('reelTrack'), wheelResult:$('wheelResult'), btnSpinWheel:$('btnSpinWheel'), btnCloseWheel:$('btnCloseWheel'),
    overDailyCard:$('overDailyCard'), overDailyDesc:$('overDailyDesc'), btnClaimDaily:$('btnClaimDaily'),
    tollPanel:$('tollPanel'), tollFillLabel:$('tollFillLabel'), pumpPanel:$('pumpPanel'), pumpHead:$('pumpHead'), pumpQty:$('pumpQty'), pumpAmount:$('pumpAmount'), pumpBar:$('pumpBar'),
    shopCounter:$('shopCounter'), shopFuelLine:$('shopFuelLine'), btnCounterCard:$('btnCounterCard'), btnCounterCash:$('btnCounterCash'),
    radarTicket:$('radarTicket'), ticketTitle:$('ticketTitle'), ticketPhoto:$('ticketPhoto'), ticketRows:$('ticketRows'), ticketStamp:$('ticketStamp'),
    journeyChip:$('journeyChip'), tollAfter:$('tollAfter'), btnShopEnter:$('btnShopEnter'), btnShopSkip:$('btnShopSkip'), ovShop:$('ovShop'), shopTitle:$('shopTitle'), shopList:$('shopList'), shopWallet:$('shopWallet'), shopMsg:$('shopMsg'), btnShopLeave:$('btnShopLeave'), alertChip:$('alertChip'), radarFlash:$('radarFlash'), tollFill:$('tollFill'), tollFillBar:$('tollFillBar'), tollFillTxt:$('tollFillTxt'), tollActions:$('tollActions'), tollLogo:$('tollLogo'), tollKicker:$('tollKicker'), hudFuel:$('hudFuel'), hudFuelCell:$('hudFuelCell'), ovToll:$('ovToll'), tollStation:$('tollStation'), tollTrip:$('tollTrip'), tollPrice:$('tollPrice'), tollMsg:$('tollMsg'), btnTollCash:$('btnTollCash'), btnTollCard:$('btnTollCard'),
    btnLeft:$('btnLeft'), btnRight:$('btnRight'), btnBoost:$('btnBoost'), btnCam:$('btnCam'), btnPause:$('btnPause'), btnFullscreen:$('btnFullscreen'), btnMusic:$('btnMusic'), bgAudio:$('bgAudio'),
    musicPanel:$('musicPanel'), musicTrackName:$('musicTrackName'), btnMusicPrev:$('btnMusicPrev'), btnMusicToggle:$('btnMusicToggle'), btnMusicNext:$('btnMusicNext'), musicVolume:$('musicVolume'), musicList:$('musicList'),
    musicSeek:$('musicSeek'), musicTimeCur:$('musicTimeCur'), musicTimeDur:$('musicTimeDur'),
    hudRecordChase:$('hudRecordChase'), recordFlash:$('recordFlash'), pilotBest:$('pilotBest'),
    speedFx:$('speedFx'), edgeFlashL:$('edgeFlashL'), edgeFlashR:$('edgeFlashR'), crashFlash:$('crashFlash'), countdown:$('countdown'), draftBadge:$('draftBadge'), boostBar:$('boostBar'), stage:$('stage'),
  };

  // ---------- Petits effets d'interface ----------
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function replay(el, cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function countUp(el, to, fmt, dur){
    fmt = fmt || (n=>String(Math.round(n)));
    if(reducedMotion){ el.textContent = fmt(to); return; }
    const t0 = performance.now(); dur = dur || 1300;
    (function step(now){
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(to * e);
      if(k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function confetti(x, y){
    if(reducedMotion) return;
    const c = document.createElement('canvas'); c.className = 'game-confetti';
    document.body.appendChild(c);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const colors = ['#ffcc00', '#ffffff', '#8fd0ff', '#ff5ad1', '#4ee39a'];
    const parts = Array.from({ length:140 }, ()=>{ const a = Math.random()*Math.PI*2, s = 4 + Math.random()*10; return { x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 7, r:Math.random()*3, vr:(Math.random()-.5)*.4, w:5+Math.random()*6, h:3+Math.random()*4, c:colors[(Math.random()*colors.length)|0], life:1 }; });
    let last = performance.now();
    (function frame(now){
      const dt = Math.min(2, (now - last) / 16.7); last = now;
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for(const p of parts){
        p.vy += .32*dt; p.vx *= Math.pow(.985, dt); p.x += p.vx*dt; p.y += p.vy*dt; p.r += p.vr*dt; p.life -= .008*dt;
        if(p.life <= 0 || p.y > innerHeight + 20) continue;
        alive++;
        g.save(); g.globalAlpha = p.life; g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w/2, -p.h/2, p.w, p.h*Math.abs(Math.cos(p.r*2))); g.restore();
      }
      if(alive) requestAnimationFrame(frame); else c.remove();
    })(last);
  }
  let _lastScore = 0, _lastSpd = -1, _cdTimer = 0;
  const _hud = {};

  // Sons d'interface synthetises (aucun fichier a charger). Tout passe par une
  // chaine commune : filtre passe-bas (retire le cote "numerique" aigu), petite
  // reverb generee (donne de la rondeur). Chaque note a une attaque de quelques
  // ms : sans ca, le demarrage brutal fait "clac".
  let _actx = null, _sfxIn = null;
  function sfxBus(){
    if(_sfxIn) return _sfxIn;
    const ac = _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
    const master = ac.createGain(); master.gain.value = 0.7;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.4;
    const verb = ac.createConvolver(), wet = ac.createGain(); wet.gain.value = 0.22;
    const len = Math.floor(ac.sampleRate * 1.1), ir = ac.createBuffer(2, len, ac.sampleRate);
    for(let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    _sfxIn = ac.createGain();
    _sfxIn.connect(lp); lp.connect(master); lp.connect(verb); verb.connect(wet); wet.connect(master);
    master.connect(ac.destination);
    return _sfxIn;
  }
  // Une note : forme d'onde, frequence (avec glissando optionnel), enveloppe douce
  function tone(o){
    try {
      const bus = sfxBus(), ac = _actx;
      if(ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + (o.delay || 0), osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, t);
      if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || o.dur * 0.6));
      const atk = o.atk || 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g).connect(bus); osc.start(t); osc.stop(t + o.dur + 0.05);
    } catch(e){}
  }
  // Clic : "pop" rond et bref ; bouton principal : petit accord qui s'epanouit
  function clickSound(deep){
    if(deep){
      tone({ f:392, to:523, glide:0.08, dur:0.32, vol:0.08, type:'triangle', atk:0.008 });
      tone({ f:659, dur:0.36, vol:0.04, delay:0.05, atk:0.01 });
    } else {
      tone({ f:880, to:620, glide:0.05, dur:0.09, vol:0.06 });
      tone({ f:1760, dur:0.04, vol:0.012 });
    }
  }
  // Carillon de gain : arpege majeur, plus long et plus aigu selon la rarete (0-4)
  function chimeSound(level){
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    const n = 2 + Math.min(4, level || 0);
    for(let i = 0; i < n; i++){
      const f = notes[i], d = i * 0.085;
      tone({ f, dur:0.9, vol:0.06, delay:d, atk:0.006 });
      tone({ f:f * 2, dur:0.5, vol:0.015, delay:d, atk:0.004 }); // harmonique "cloche"
    }
    tone({ f:notes[0] / 2, dur:1.1, vol:0.05, type:'triangle', delay:0, atk:0.02 });
  }
  document.addEventListener('pointerdown', (e)=>{
    const b = e.target.closest && e.target.closest('.btn-go,.btn-side,.route-card,.car-card:not([disabled]),.daily-card,.btn');
    if(!b || b.disabled || b.closest('.bottombar')) return;
    clickSound(b.classList.contains('btn-go'));
    if(navigator.vibrate) try { navigator.vibrate(b.classList.contains('btn-go') ? 18 : 8); } catch(err){}
    if(reducedMotion) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.4;
    const rip = document.createElement('span');
    rip.className = 'ui-ripple';
    rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size/2) + 'px;top:' + (e.clientY - r.top - size/2) + 'px';
    b.appendChild(rip);
    setTimeout(()=>rip.remove(), 700);
  });

  const state = { username:null, selectedCar: DG.defaultCarId, selectedRoute: DG.defaultRouteId, screen:'loading', personalBest:0 };

  async function refreshPersonalBest(){
    if(DG.Auth.isLoggedIn() && DG.supabase && DG.Auth.user){
      try{
        const { data, error } = await DG.supabase.from('leaderboard').select('score').eq('user_id', DG.Auth.user.id).order('score', { ascending:false }).limit(1);
        state.personalBest = (!error && data && data.length) ? data[0].score : 0;
      } catch(e){ state.personalBest = 0; }
    } else {
      try { state.personalBest = parseInt(localStorage.getItem('apex_best')||'0',10) || 0; } catch(e){ state.personalBest = 0; }
    }
    if(els.pilotBest) els.pilotBest.textContent = '🏆 ' + (state.personalBest > 0 ? state.personalBest.toLocaleString('fr-FR') : '—');
  }

  function show(id){
    ['ovLoading','ovNaming','ovChoosing','ovPaused','ovOver','ovBoard'].forEach(k=>els[k].classList.add('hidden'));
    if(id) els[id].classList.remove('hidden');
    if(id && id !== 'ovPaused'){ els.hudTop.style.display = 'none'; els.hudBottom.style.display = 'none'; }
    if(id !== 'ovOver') stopOverCarSpin();
  }

  // Explosion de couleur (teinte de la voiture) au moment ou l'ecran de fin apparait :
  // sans ca l'ecran etait tout noir/plat, "pas envie" selon le retour recu. On retire
  // puis reajoute la classe pour pouvoir rejouer l'animation a chaque game over
  // (retry) meme si l'overlay n'a pas ete cache entre-temps.
  function flashOverScreen(carId){
    const car = DG.carById(carId);
    const hex = '#' + (car.glow != null ? car.glow : 0xffcc00).toString(16).padStart(6, '0');
    els.ovOver.style.setProperty('--flash-color', hex);
    const flash = document.getElementById('overFlash');
    if(!flash) return;
    flash.classList.remove('play');
    void flash.offsetWidth; // force reflow pour rejouer l'animation CSS
    flash.classList.add('play');
  }

  // Petite scene 3D independante (meme moteur de chargement que la course) pour faire
  // tourner la voiture du joueur sur l'ecran de fin de partie, a cote du score — un clin
  // d'oeil "showroom" pour rendre la fin de run plus stylee qu'un simple recapitulatif texte.
  let _overSpin = null;
  function stopOverCarSpin(){
    if(!_overSpin) return;
    cancelAnimationFrame(_overSpin.raf);
    _overSpin.renderer.dispose();
    if(_overSpin.renderer.domElement.parentNode) _overSpin.renderer.domElement.parentNode.removeChild(_overSpin.renderer.domElement);
    _overSpin = null;
  }
  async function startOverCarSpin(carId){
    stopOverCarSpin();
    const host = els.overCarSpin;
    if(!host) return;
    const T = window.THREE;
    const car = DG.carById(carId);
    const w = host.clientWidth || 320, h = host.clientHeight || 170;
    const renderer = new T.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.75));
    renderer.setSize(w, h);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    host.innerHTML = '';
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, w/h, 0.1, 50);
    camera.position.set(0, 1.15, 4.4);
    camera.lookAt(0, 0.55, 0);
    scene.add(new T.AmbientLight(0xffffff, 0.55));
    const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(3, 5, 4); scene.add(key);
    const glow = new T.PointLight(car.glow || 0x66ccff, 2.2, 12); glow.position.set(-2, 1.2, -2); scene.add(glow);
    const rig = new T.Group(); scene.add(rig);
    const state = { raf:0, renderer, scene };
    _overSpin = state;
    const model = await DG.Loader.loadModel('../' + car.model);
    if(_overSpin !== state) { renderer.dispose(); return; } // ecran quitte pendant le chargement
    // Cible plus grande (4.2, comme le garage) qu'au premier jet (2.4) : la voiture
    // restait minuscule au milieu de son cadre agrandi ("on ne voit rien").
    const wrap = model ? DG.Loader.normalizeModel(T, model, 4.2, car.rotY || 0) : DG.Loader.makeFallbackCar(T, { body:car.body });
    wrap.position.y -= 0.12;
    rig.add(wrap);
    (function loop(now){
      state.raf = requestAnimationFrame(loop);
      rig.rotation.y = (now || 0) * 0.00055;
      renderer.render(scene, camera);
    })();
  }

  function popup(text, cls, big){
    const el = document.createElement('div');
    el.className = 'popup' + (big ? ' big' : '');
    el.textContent = text;
    if(cls) el.style.color = cls;
    el.style.left = (44 + Math.random()*12) + '%';
    el.style.top = '58%';
    els.popups.appendChild(el);
    setTimeout(()=>el.remove(), 1150);
  }

  function loadUsername(){
    return DG.Auth.isLoggedIn() ? DG.Auth.displayName() : '';
  }

  function tierColor(tier){ return (DG.TIERS[tier] && DG.TIERS[tier].color) || '#9fb4c7'; }

  const ROUTE_UI = {
    'autoroute-nuit': { ico:'🌙', grad:'linear-gradient(135deg,#1b2a4a,#070a14)', glow:'#8fb0ff' },
    'cote-sunset':    { ico:'🌅', grad:'linear-gradient(135deg,#ff9a5a,#3a2350)', glow:'#ffb27a' },
    'centre-neon':    { ico:'🌆', grad:'linear-gradient(135deg,#b43dff,#140828)', glow:'#ff5ad1' },
    'japon-sakura':   { ico:'🌸', grad:'linear-gradient(135deg,#ff9cc0,#3a1f4a)', glow:'#ffb7d0' },
    'lac-neuchatel':  { ico:'⛵', grad:'linear-gradient(135deg,#5aa8d8,#1a3a5a)', glow:'#8fd0ff' },
    'autostrada':     { ico:'🇮🇹', grad:'linear-gradient(135deg,#1f8a3a 0%,#f4f4f4 50%,#c8202a 100%)', glow:'#9fe0a0' },
    'provence':       { ico:'💜', grad:'linear-gradient(135deg,#a07ae0,#3a6a3a)', glow:'#c8a8ff' },
    'route66':        { ico:'🌵', grad:'linear-gradient(135deg,#ff9a50,#6a2a14)', glow:'#ffb070' },
    'a7-france':      { ico:'🇫🇷', grad:'linear-gradient(135deg,#1f4fa8 0%,#f4f4f4 50%,#d8202a 100%)', glow:'#9ab8ff' },
    'a2-suisse':      { ico:'🇨🇭', grad:'linear-gradient(135deg,#d52b1e,#3a6a26)', glow:'#ff9a90' },
  };
  const DIFF_LVL = { 'Détente':1, 'Standard':2, 'Intense':3 };
  function renderRouteTabs(){
    els.routeTabs.innerHTML = DG.ROUTES.map(r=>{
      const ui = ROUTE_UI[r.id] || { ico:'🛣', grad:'linear-gradient(135deg,#2a3140,#0a0c10)', glow:'#9fb4c7' };
      const lvl = DIFF_LVL[r.difficulty] || 2;
      const dots = [1,2,3].map(i=>'<i class="' + (i<=lvl?'on':'') + '"></i>').join('');
      return '<button class="route-card' + (r.id===state.selectedRoute?' active':'') + '" data-route="' + r.id + '" style="--rg:' + ui.grad + ';--rc:' + ui.glow + '">' +
        '<span class="route-ico">' + ui.ico + '</span>' +
        '<span class="route-body"><span class="route-name">' + r.name + '</span><span class="route-diff"><span class="dots">' + dots + '</span>' + r.difficulty + '</span></span>' +
        '<span class="route-check">✓</span>' +
      '</button>';
    }).join('');
    els.routeTabs.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click', ()=>{
      state.selectedRoute = b.getAttribute('data-route');
      renderRouteTabs(); updateDock();
      if(engine && !engine.playing) engine.setRoute(state.selectedRoute);
    }));
  }
  function updateDock(){
    const el = document.getElementById('dockSel');
    if(!el) return;
    const car = DG.carById(state.selectedCar), route = DG.routeById(state.selectedRoute);
    el.innerHTML = '<b>' + (car ? car.brand + ' ' + car.name : '—') + '</b><span>' + (route ? route.name : '') + '</span>';
  }

  function statBar(val, color){ return '<div class="stat-bar"><i style="width:' + (val*10) + '%;color:' + color + '"></i></div>'; }

  function renderCarGrid(){
    const unlocked = DG.Economy.unlocked;
    els.carGrid.innerHTML = DG.CARS.map(c=>{
      const isUnlocked = unlocked.indexOf(c.id) !== -1;
      const isSelected = state.selectedCar === c.id;
      const color = tierColor(c.tier);
      return (
        '<button class="car-card' + (isUnlocked?'':' locked') + (isSelected?' selected':'') + '" data-car="' + c.id + '" ' + (isUnlocked?'':'disabled') + '>' +
          '<div class="bar" style="background:' + color + '"></div>' +
          '<div class="body">' +
            '<div class="tier" style="color:' + color + '">' + c.brand + ' · ' + (DG.TIERS[c.tier]?DG.TIERS[c.tier].label:c.tier) + '</div>' +
            '<div class="name">' + c.name + '</div>' +
            '<div class="score-mult">🏆 Score ×' + DG.carScoreFactor(c).toFixed(2) + '</div>' +
            '<div class="stats">' +
              statBar(c.stats.speed, color) + statBar(c.stats.accel, color) + statBar(c.stats.handling, color) + statBar(c.stats.boost, color) +
            '</div>' +
            (isUnlocked
              ? '<div class="cta" style="background:' + hexAlpha(color,.16) + ';border:1px solid ' + hexAlpha(color,.4) + '">▶ Sélectionner</div>'
              : '<div class="cta" style="background:rgba(255,90,90,.1);border:1px solid rgba(255,90,90,.3);color:#ff9090">🔒 ' + c.price.toLocaleString('fr-FR') + ' crédits</div>') +
          '</div>' +
        '</button>'
      );
    }).join('');
    els.carGrid.querySelectorAll('[data-car]:not([disabled])').forEach(b=>b.addEventListener('click', ()=>{ state.selectedCar = b.getAttribute('data-car'); renderCarGrid(); els.btnStart.disabled = false; els.btnStart.classList.add('ready'); updateDailyCta(); }));
    els.btnStart.disabled = unlocked.indexOf(state.selectedCar) === -1;
    els.btnStart.classList.toggle('ready', !els.btnStart.disabled);
    updateDock();
  }
  function hexAlpha(hex, a){
    const n = parseInt(hex.replace('#',''),16);
    return 'rgba(' + [(n>>16)&255,(n>>8)&255,n&255].join(',') + ',' + a + ')';
  }

  function refreshPilotBar(){
    els.pilotName.textContent = state.username || 'Pilote';
    els.pilotMoney.textContent = '🪙 ' + DG.Economy.money.toLocaleString('fr-FR');
  }

  // Petites memoires locales du jour (confort d'affichage uniquement : les
  // recompenses restent verifiees cote serveur). Tout est protege par try/catch
  // car le stockage peut etre indisponible (navigation privee, etc.).
  function readLocal(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
  function writeLocal(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function dailyBestToday(){ const d = readLocal('dg_daily_best'); return (d && d.day === DG.dailyChallenge().days) ? d.score : 0; }
  function recordDailyRun(result){
    const dc = DG.dailyChallenge();
    if(result.carId !== dc.carId || result.score <= dailyBestToday()) return;
    writeLocal('dg_daily_best', { day:dc.days, score:result.score });
  }
  // Serie de jours consecutifs avec le defi reussi
  function streakCount(){
    const s = readLocal('dg_streak'), today = DG.dailyChallenge().days;
    return (s && (s.last === today || s.last === today - 1)) ? s.count : 0;
  }
  function bumpStreak(){
    const s = readLocal('dg_streak') || {}, today = DG.dailyChallenge().days;
    if(s.last === today) return;
    writeLocal('dg_streak', { last:today, count: s.last === today - 1 ? (s.count || 0) + 1 : 1 });
  }
  function untilTomorrow(){
    const ms = (Math.floor(Date.now() / 86400000) + 1) * 86400000 - Date.now();
    const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    return [h, m, sec].map(n=>String(n).padStart(2, '0')).join(':');
  }

  function updateDailyCta(){
    if(!els.dailyCard) return;
    const dc = DG.dailyChallenge();
    const car = DG.carById(dc.carId);
    const claimed = !!state.dailyClaimedToday;
    const unlocked = DG.Economy.unlocked.indexOf(dc.carId) !== -1;
    const selected = state.selectedCar === dc.carId;
    const best = claimed ? Math.max(dailyBestToday(), dc.target) : dailyBestToday();
    const pct = Math.min(100, Math.round(best / dc.target * 100));
    const diff = 1 + (dc.days % 5);
    els.dailyBrand.textContent = car.brand + ' · ' + (DG.TIERS[car.tier] ? DG.TIERS[car.tier].label : car.tier);
    els.dailyCarName.textContent = car.name;
    els.dailyDesc.textContent = 'Fais ≥ ' + dc.target.toLocaleString('fr-FR') + ' points avec cette voiture';
    els.dailyStars.innerHTML = '★'.repeat(diff) + '<i>' + '★'.repeat(5 - diff) + '</i>';
    els.dailyReward.textContent = '🪙 +' + dc.reward;
    els.dailyRing.style.setProperty('--p', pct);
    els.dailyPct.textContent = claimed ? '✓' : pct + '%';
    els.dailyBar.style.width = pct + '%';
    els.dailyNote.innerHTML = claimed ? 'Réussi — <b>+' + dc.reward + '</b> crédits récupérés'
      : !unlocked ? 'Débloque la <b>' + car.name + '</b> au garage (' + car.price.toLocaleString('fr-FR') + ' 🪙)'
      : best > 0 ? 'Ton meilleur aujourd\'hui : <b>' + best.toLocaleString('fr-FR') + '</b> / ' + dc.target.toLocaleString('fr-FR')
      : 'Pas encore tenté aujourd\'hui';
    const streak = streakCount();
    els.dailyStreak.textContent = '🔥 ' + streak;
    els.dailyStreak.classList.toggle('hidden', streak < 2);
    els.dailyCard.classList.toggle('done', claimed);
    els.dailyCard.classList.toggle('locked', !claimed && !unlocked);
    els.dailyCard.classList.toggle('selected', !claimed && unlocked && selected);
    if(claimed) els.dailyCta.textContent = '✓ Fait';
    else if(!unlocked) els.dailyCta.textContent = '🔒 Verrouillé';
    else if(selected) els.dailyCta.textContent = '✓ Choisi';
    else els.dailyCta.textContent = '🎯 Relever';
    tickDailyTimers();
  }

  // Compte a rebours avant le prochain defi / tirage (changement de jour UTC,
  // comme cote serveur). Si le jour change pendant qu'on est sur le menu, on
  // recharge les deux cartes.
  let _timerDay = Math.floor(Date.now() / 86400000);
  function tickDailyTimers(){
    if(!els.dailyTimer) return;
    const day = Math.floor(Date.now() / 86400000);
    if(day !== _timerDay){ _timerDay = day; renderDailyCard(); renderDrawCard(); return; }
    const t = untilTomorrow();
    els.dailyTimer.textContent = '⏱ ' + t;
    els.drawTimer.textContent = els.drawCard.classList.contains('done') ? '⏱ ' + t : '● Disponible';
  }
  setInterval(()=>{ if(state.screen === 'choosing') tickDailyTimers(); }, 1000);

  function selectDailyChallenge(){
    const dc = DG.dailyChallenge();
    if(state.dailyClaimedToday){ popup('Défi déjà réclamé aujourd\'hui ✓', '#ffcc00'); return; }
    if(DG.Economy.unlocked.indexOf(dc.carId) === -1){
      popup('Débloque la ' + DG.carById(dc.carId).name + ' pour ce défi', '#ff9090');
      return;
    }
    state.selectedCar = dc.carId;
    renderCarGrid();
    updateDailyCta();
    popup('🎯 Défi sélectionné !', '#ffcc00');
  }

  async function renderDailyCard(){
    if(!els.dailyCard) return;
    state.dailyClaimedToday = await DG.Economy.hasClaimedDailyChallenge();
    if(state.dailyClaimedToday) bumpStreak();
    updateDailyCta();
  }

  // Tirage du jour : contrairement au defi (qui demande d'atteindre un score),
  // c'est une action immediate — des credits a coup sur, et 2% de chance de
  // gagner une voiture rare. Tirage, probabilites et bonus de serie (+10%/jour,
  // max +50%, Epique garanti le 7e jour) : claim_daily_draw() (SQL).
  const LOOT = [
    { key:'commun',     credits:200,  rarity:'Commun',     color:'#8fa3b8', ico:'🪙', w:50 },
    { key:'rare',       credits:400,  rarity:'Rare',       color:'#3d8bff', ico:'💰', w:30 },
    { key:'epique',     credits:900,  rarity:'Épique',     color:'#b14dff', ico:'💎', w:13 },
    { key:'legendaire', credits:2000, rarity:'Légendaire', color:'#ffb020', ico:'👑', w:5 },
    { key:'jackpot', jackpot:true, rarity:'Jackpot',       color:'#ff3d6e', ico:'🏆', w:2 }
  ];
  // Lot renvoye par le serveur -> rarete. `rarity` est fourni par la version
  // actuelle de claim_daily_draw() ; les seuils ne servent que de repli pour
  // l'ancienne version (120 / 300 / 700 / 1500, et 5000 si tout est debloque).
  function lootFor(res){
    const byKey = res.rarity && LOOT.find(l=>l.key === res.rarity);
    if(byKey) return byKey;
    if(res.carId || res.credits >= 5000) return LOOT[4];
    return res.credits >= 1500 ? LOOT[3] : res.credits >= 700 ? LOOT[2] : res.credits >= 300 ? LOOT[1] : LOOT[0];
  }
  const pctBonus = (mult)=>Math.round(((mult || 1) - 1) * 100);
  function updateDrawCta(claimed){
    if(!els.drawCard) return;
    els.drawCard.classList.toggle('done', claimed);
    if(!DG.Auth.isLoggedIn()){
      els.drawCta.textContent = '🔒 Connexion';
      els.drawDesc.textContent = 'Connecte-toi pour ouvrir ta caisse du jour.';
      els.drawNote.textContent = 'Un lot garanti chaque jour';
      tickDailyTimers();
      return;
    }
    const st = state.drawStatus;
    els.drawCta.textContent = claimed ? '✓ Ouverte' : '🎁 Ouvrir';
    els.drawDesc.textContent = claimed
      ? 'Reviens demain : ta série continue et le bonus grimpe.'
      : st && st.weekly ? 'Coffre du 7e jour : Épique ou mieux garanti !'
      : 'Crédits garantis, et 2% de chance de gagner une voiture rare.';
    // Serie : jour en cours et bonus (fournis par le serveur si la fonction SQL
    // daily_draw_status() est installee, sinon la pastille reste cachee)
    const streak = st ? st.streak : 0, bonus = pctBonus(st && st.mult);
    els.drawStreak.textContent = '🔥 J' + streak + (bonus ? ' · +' + bonus + '%' : '');
    els.drawStreak.classList.toggle('hidden', !st);
    els.drawStreak.title = 'Jour ' + streak + ' de série : +10% de crédits par jour consécutif (max +50%), Épique garanti tous les 7 jours';
    const last = readLocal('dg_draw_last');
    const todayLot = st && st.claimed
      ? (st.car_id ? (DG.carById(st.car_id) || {}).name : '+' + (st.credits || 0).toLocaleString('fr-FR') + ' crédits')
      : (last && last.day === DG.dailyChallenge().days ? last.label : null);
    els.drawNote.innerHTML = claimed
      ? (todayLot ? 'Lot du jour : <b>' + todayLot + '</b>' : 'Caisse déjà ouverte aujourd\'hui')
      : streak > 1 ? 'Jour <b>' + streak + '</b> de série · bonus <b>+' + bonus + '%</b>'
      : 'Reviens chaque jour : +10% par jour de série';
    tickDailyTimers();
  }

  async function renderDrawCard(){
    if(!els.drawCard) return;
    state.drawStatus = await DG.Economy.dailyDrawStatus();
    const claimed = state.drawStatus ? !!state.drawStatus.claimed : await DG.Economy.hasClaimedDailyDraw();
    updateDrawCta(claimed);
  }

  // Bande de lots : REEL_WIN = position du lot gagnant, les autres sont tires
  // au hasard avec les memes poids que le serveur (pour que la bande "ressemble"
  // aux vraies chances : beaucoup de communs, un jackpot de temps en temps).
  const REEL_LEN = 58, REEL_WIN = 50;
  function randomLoot(){
    let r = Math.random() * 100;
    for(const l of LOOT){ if((r -= l.w) < 0) return l; }
    return LOOT[0];
  }
  function lootHTML(l, carName){
    const val = l.jackpot ? (carName || 'Voiture') : l.credits.toLocaleString('fr-FR');
    return '<div class="reel-item" style="--r:' + l.color + '"><span class="ri-ico">' + l.ico + '</span><span class="ri-val">' + val + '</span><span class="ri-lbl">' + l.rarity + '</span></div>';
  }
  function buildReel(win){
    const items = [];
    for(let i = 0; i < REEL_LEN; i++) items.push(i === REEL_WIN && win ? win : randomLoot());
    // Petit frisson : un jackpot "rate de peu" juste apres le lot gagnant
    if(win && !win.jackpot && Math.random() < 0.5) items[REEL_WIN + 1] = LOOT[4];
    els.reelTrack.innerHTML = items.map((l, i)=>lootHTML(l, i === REEL_WIN ? win && win.carName : null)).join('');
  }
  function reelMetrics(){
    const first = els.reelTrack.firstElementChild;
    const w = first ? first.getBoundingClientRect().width : 118;
    const gap = parseFloat(getComputedStyle(els.reelTrack).columnGap) || 10;
    return { w, step:w + gap, view:els.wheelEl.clientWidth };
  }
  function setReelX(x, animate, dur){
    els.reelTrack.style.transition = animate ? 'transform ' + dur + 'ms cubic-bezier(.12,.55,.08,1)' : 'none';
    els.reelTrack.style.transform = 'translateX(' + x + 'px)';
  }
  // "Tic" de la bande : petit clic boise, doux et court (pas une onde carree qui grince)
  function tickSound(pitch){
    tone({ f:pitch || 1200, to:(pitch || 1200) * 0.7, glide:0.025, dur:0.045, vol:0.035, type:'triangle', atk:0.002 });
  }
  let _reelRaf = 0;

  function openWheel(){
    if(!DG.Auth.isLoggedIn()){ popup('Connecte-toi pour ouvrir la caisse du jour', '#ff9090'); return; }
    if(els.drawCard.classList.contains('done')){ popup('Caisse déjà ouverte aujourd\'hui ✓', '#b48cff'); return; }
    els.wheelResult.innerHTML = '';
    els.wheelResult.classList.remove('pop');
    els.wheelEl.classList.remove('settled');
    els.ovWheel.classList.remove('burst');
    els.btnSpinWheel.disabled = false;
    els.btnSpinWheel.textContent = '🎁 Ouvrir la caisse';
    els.ovWheel.classList.remove('hidden');
    buildReel(null);
    const m = reelMetrics();
    setReelX(m.view / 2 - m.w / 2 - m.step * 3, false);
  }

  function closeWheel(){
    cancelAnimationFrame(_reelRaf);
    els.ovWheel.classList.add('hidden');
  }

  async function spinWheel(){
    els.btnSpinWheel.disabled = true;
    els.btnSpinWheel.textContent = '…';
    const res = await DG.Economy.claimDailyDraw();
    if(!res.ok){
      popup(res.error, '#ff9090');
      els.wheelResult.innerHTML = '<span class="rr-lbl" style="--r:#ff9090">⚠ ' + res.error + '</span>';
      els.btnSpinWheel.disabled = false;
      els.btnSpinWheel.textContent = '🎁 Ouvrir la caisse';
      return;
    }
    // Lot tire cote serveur -> element de la bande, avec le montant REELLEMENT
    // gagne (bonus de serie compris). Jackpot sans voiture (tout deja debloque) :
    // case jackpot avec le gros bonus de credits.
    const carName = res.carId ? (DG.carById(res.carId) || {}).name : null;
    const loot = lootFor(res), level = LOOT.indexOf(loot);
    const win = res.carId ? Object.assign({}, loot, { carName })
      : Object.assign({}, loot, { jackpot:false, credits:res.credits });
    buildReel(win);
    const m = reelMetrics();
    setReelX(m.view / 2 - m.w / 2 - m.step * 3, false);
    void els.reelTrack.offsetWidth;
    // Arret legerement decale dans la case gagnante : on ne sait jamais si ca va deborder
    const jitter = (Math.random() - 0.5) * m.w * 0.7;
    const endX = m.view / 2 - m.w / 2 - m.step * REEL_WIN + jitter;
    const DUR = reducedMotion ? 400 : 6200;
    setReelX(endX, true, DUR);
    els.btnSpinWheel.textContent = '🎁 Ouverture…';

    // "Tic" a chaque lot qui passe sous le curseur, comme une roue a crans
    let lastIdx = -1;
    const t0 = performance.now();
    cancelAnimationFrame(_reelRaf);
    (function watch(){
      const x = new DOMMatrixReadOnly(getComputedStyle(els.reelTrack).transform).m41;
      const idx = Math.floor((m.view / 2 - x) / m.step);
      if(idx !== lastIdx){ if(lastIdx !== -1) tickSound(1100 + (idx % 2) * 120); lastIdx = idx; }
      if(performance.now() - t0 < DUR) _reelRaf = requestAnimationFrame(watch);
    })();

    setTimeout(()=>{
      const winEl = els.reelTrack.children[REEL_WIN];
      if(winEl) winEl.classList.add('win');
      els.wheelEl.classList.add('settled');
      els.ovWheel.style.setProperty('--burst', win.color);
      els.ovWheel.classList.remove('burst'); void els.ovWheel.offsetWidth; els.ovWheel.classList.add('burst');
      const label = res.carId ? carName : '+' + res.credits.toLocaleString('fr-FR') + ' crédits';
      writeLocal('dg_draw_last', { day:DG.dailyChallenge().days, label });
      if(state.drawStatus) Object.assign(state.drawStatus, { claimed:true, credits:res.credits, car_id:res.carId || null });
      els.wheelResult.style.setProperty('--r', win.color);
      const bonus = pctBonus(res.mult);
      const extra = (res.weekly ? '<span class="rr-sub">🎁 Coffre du 7e jour</span>' : '') +
        (res.streak > 1 ? '<span class="rr-sub">🔥 Jour ' + res.streak + ' de série' + (bonus && !res.carId ? ' · bonus +' + bonus + '% inclus' : '') + '</span>' : '');
      els.wheelResult.innerHTML = '<span class="rr-lbl">' + win.rarity + (res.carId ? ' · voiture rare !' : '') + '</span><span class="rr-val">' + (res.carId ? '🏆 ' + carName : '') + '</span>' + extra;
      replay(els.wheelResult, 'pop');
      if(!res.carId) countUp(els.wheelResult.querySelector('.rr-val'), res.credits, n=>'+' + Math.round(n).toLocaleString('fr-FR') + ' crédits', 900);
      chimeSound(level);
      updateDrawCta(true);
      refreshPilotBar();
      if(level >= 2) confetti(innerWidth/2, innerHeight*0.4);
      if(res.carId){
        els.drawCard.classList.add('jackpot');
        popup('🏆 Voiture rare gagnée !', '#ff3d6e', true);
      } else popup('🎁 +' + res.credits + ' crédits !', win.color);
      els.btnSpinWheel.textContent = '✓ Ouverte';
    }, DUR + 60);
  }

  async function goToChoosing(){
    show('ovChoosing');
    state.screen = 'choosing';
    renderRouteTabs();
    els.carGrid.classList.add('intro');
    clearTimeout(els.carGrid._introT);
    els.carGrid._introT = setTimeout(()=>els.carGrid.classList.remove('intro'), 1500);
    renderCarGrid();
    refreshPilotBar();
    refreshPersonalBest();
    renderDailyCard();
    renderDrawCard();
  }

  let engine;
  async function boot(){
    await DG.Auth.init();
    await DG.Economy.init();
    DG.Economy.onChange(()=>{ refreshPilotBar(); renderCarGrid(); });

    engine = new DG.GameEngine($('canvasHost'), {
      onHud(d){
        if(els.hudFuel){
          const on = d.fuel != null;
          if(on !== _hud.fOn){ _hud.fOn = on; els.hudFuelCell.style.display = on ? '' : 'none'; }
          if(on){ const f = Math.round(d.fuel * 100); if(f !== _hud.f){ _hud.f = f; els.hudFuel.style.width = f + '%'; els.hudFuelCell.classList.toggle('low', f < 20); } }
        }
        const tTxt = d.time.toFixed(1) + 's';
        if(tTxt !== _hud.t){ _hud.t = tTxt; els.hudTime.textContent = tTxt; }
        if(d.score - _lastScore >= 30) replay(els.hudScore, 'bump');
        _lastScore = d.score;
        if(d.score !== _hud.s){ _hud.s = d.score; els.hudScore.textContent = d.score; }
        const spd = Math.round((d.speedK || 0) * 20) / 20;
        if(spd !== _lastSpd){ _lastSpd = spd; els.speedFx.style.setProperty('--spd', (spd * 0.85).toFixed(2)); }
        els.speedFx.classList.toggle('boost', !!d.boosting);
        els.btnBoost.classList.toggle('on', !!d.boosting);
        els.boostBar.classList.toggle('on', !!d.boosting);
        els.boostBar.classList.toggle('full', d.boostPct >= 99.5);
        els.boostBar.classList.toggle('low', d.boostPct < 18);
        if(d.speed !== _hud.v){ _hud.v = d.speed; els.hudSpeed.innerHTML = d.speed + '<span style="font-size:10px;color:#8a8f98"> km/h</span>'; }
        const bp = Math.round(d.boostPct * 2) / 2;
        if(bp !== _hud.b){ _hud.b = bp; els.boostFill.style.width = bp + '%'; }
        if(d.multiplierActive){ els.multBadge.classList.add('show'); els.multTime.textContent = Math.ceil(d.multiplierT); }
        else els.multBadge.classList.remove('show');
        if(els.hudRecordChase){
          if(d.personalBest > 0 && d.recordBroken){ els.hudRecordChase.textContent = '★ RECORD'; els.hudRecordChase.classList.add('broken'); }
          else if(d.personalBest > 0){ els.hudRecordChase.textContent = '🎯 -' + d.scoreToRecord; els.hudRecordChase.classList.remove('broken'); }
          else { els.hudRecordChase.textContent = ''; els.hudRecordChase.classList.remove('broken'); }
        }
      },
      onCamLabel(label){ els.camLabel.textContent = label; },
      onCountdown(n){
        els.countdown.innerHTML = n > 0 ? '<span>' + n + '</span>' : '<span class="go">GO!</span>';
        clearTimeout(_cdTimer);
        if(n <= 0) _cdTimer = setTimeout(()=>{ els.countdown.innerHTML = ''; }, 900);
      },
      onDraft(on){ els.draftBadge.classList.toggle('show', !!on); },
      onCrash(){
        els.draftBadge.classList.remove('show');
        els.speedFx.classList.remove('boost');
        replay(els.crashFlash, 'play');
        replay(els.stage, 'shake');
        if(navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch(e){}
      },
      onPauseChange(paused){ show(paused ? 'ovPaused' : null); if(!paused){ els.hudTop.style.display='flex'; els.hudBottom.style.display='flex'; } },
      onJourney(j){
        if(!els.journeyChip) return;
        els.journeyChip.classList.remove('hidden');
        const pct = Math.min(100, j.kmDone / j.kmTotal * 100);
        els.journeyChip.innerHTML = '<span class="jc-road">' + (j.road || '') + '</span><span class="jc-from">' + j.from + '</span>' +
          '<span class="jc-bar"><i style="width:' + pct.toFixed(1) + '%"></i></span><span class="jc-to">' + j.to + '</span>' +
          '<span class="jc-next">' + (j.toll ? '🛑 ' : '↗ ') + j.next + ' · <b>' + j.kmNext.toFixed(j.kmNext < 10 ? 1 : 0) + ' km</b></span>';
      },
      onStation(s){ alerts.station = s; renderAlert(); },
      onRadar(r){ alerts.radar = r; renderAlert(); },
      onPolice(p){ alerts.police = p; renderAlert(); if(p && !_siren){ sirenTick(); _siren = setInterval(sirenTick, 560); } },
      onTollApproach(stop){ popup('🛑 PÉAGE · ' + stop.name + ' — ralentis', '#ffcc00', true); },
      onToll(info){ openToll(info); },
      onPickup(kind, payload){
        if(kind==='coin') popup('+10 🪙', '#ffcc00');
        else if(kind==='near-miss'){
          const streak = (payload && payload.streak) || 1;
          const edge = payload && payload.side < 0 ? els.edgeFlashL : els.edgeFlashR;
          edge.classList.toggle('hot', streak >= 3);
          replay(edge, 'play');
          if(streak >= 3) popup('FRÔLÉ x' + streak + ' 🔥', '#ff5a3d', true);
          else popup('FRÔLÉ ! +30', '#ff9090');
        }
        else if(kind==='nitro') popup('⚡ NITRO PLEIN !', '#3df0ff', true);
        else if(kind==='multiplier') popup('×2 GAINS !', '#ff5ad1', true);
        else if(kind==='magnet') popup('🧲 AIMANT !', '#ff6a6a', true);
        else if(kind==='shield') popup('🛡 BOUCLIER !', '#3dffb0', true);
        else if(kind==='shield-hit') popup('🛡 BOUCLIER BRISÉ', '#3dffb0', true);
        else if(kind==='jump') popup('🚀 SAUT ! +100', '#3df0ff', true);
        else if(kind==='fuel-station') popup('⛽ STATION À 300 m — appuie sur E pour t\'y arrêter', '#ffcc33', true);
        else if(kind==='telepass'){ popup('📡 Télépéage · ' + money(payload.price, payload.currency) + ' débité (−' + payload.pts + ' pts)', '#ffcc00', true); tone({ f:1760, dur:0.09, vol:0.05 }); tone({ f:2350, dur:0.12, vol:0.05, delay:0.1 }); }
        else if(kind==='radar-flash'){
          showTicket(payload);
          if(els.radarFlash){ els.radarFlash.classList.remove('go'); void els.radarFlash.offsetWidth; els.radarFlash.classList.add('go'); }
          tone({ f:2400, dur:0.06, vol:0.05 });
        }
        else if(kind==='radar-ok') popup('📸 Radar : ' + speedTxt(payload.kmh, payload.unitLabel) + ' ✓', '#4ee39a');
        else if(kind==='police-chase') popup('🚓 LA POLICE TE POURSUIT ! Nitro pour la semer', '#5a8aff', true);
        else if(kind==='police-lost'){ popup('🚓 Police semée ! +200', '#4ee39a', true); chimeSound(2); }
        else if(kind==='fuel-enter') popup('⛽ Arrêt à la pompe…', '#ffcc33');
        else if(kind==='fuel-low') popup('⚠ RÉSERVE ! Fais le plein à la prochaine station', '#ff5a3d', true);
        else if(kind==='out-of-fuel') popup('⛽ PANNE SÈCHE…', '#ff5a3d', true);
        else if(kind==='arrival'){ popup('🏁 ARRIVÉE À ' + ((payload && payload.city) || '').toUpperCase() + ' ! +500', '#4ee39a', true); confetti(innerWidth/2, innerHeight*0.35); chimeSound(4); }
      },
      onRecordBroken(){
        popup('★ NOUVEAU RECORD !', '#ffcc00');
        if(els.recordFlash){
          els.recordFlash.classList.remove('show'); void els.recordFlash.offsetWidth;
          els.recordFlash.classList.add('show');
        }
      },
      onGameOver(result){ handleGameOver(result); }
    });
    engine.init();
    engine.setRoute(state.selectedRoute);
    const idle = window.requestIdleCallback || ((f)=>setTimeout(f, 1200));
    idle(()=>DG.preloadRouteAssets && DG.preloadRouteAssets());

    // Compte obligatoire pour jouer (pas de mode invite) : les scores/parties
    // doivent tous etre rattaches a un vrai compte, notamment pour que la
    // moderation (recherche, bannissement IP) ait un pseudo/compte fiable en face.
    state.username = loadUsername();
    if(DG.Auth.isLoggedIn() && state.username) goToChoosing(); else show('ovNaming');

    wireControls();
    wireMusic();
  }


  // ---------- Arrets : peage, police, station (pompe -> caisse -> boutique) ----------
  const money = (v, cur)=>cur === '$' ? '$' + v.toFixed(2) : cur === '¥' ? '¥' + Math.round(v).toLocaleString('fr-FR') : v.toFixed(2).replace('.', ',') + ' ' + cur;
  const speedTxt = (kmh, unit)=>unit === 'mph' ? Math.round(kmh / 1.609) + ' mph' : kmh + ' km/h';
  const LANE_TXT = { t:'Voie télépéage', cb:'Voie CB — carte uniquement', cash:'Voie espèces & carte' };
  let _stopKind = null, _stopInfo = null, _processing = false;
  function openToll(info){
    _stopKind = info.kind; _stopInfo = info;
    if(info.kind === 'fuel'){ startPump(info); return; }
    const police = info.kind === 'police';
    els.tollPanel.dataset.kind = info.kind;
    els.tollLogo.textContent = police ? '🚓' : (info.road || '🛑');
    els.tollKicker.textContent = info.operator + (police ? ' · Amende' : ' · Péage');
    els.tollStation.textContent = info.station;
    els.tollTrip.textContent = police ? 'Excès de vitesse : ' + speedTxt(info.kmh, info.unitLabel) + ' au lieu de ' + speedTxt(info.limit, info.unitLabel)
      : info.from + ' → ' + info.station + ' · ' + info.km + ' km · voie ' + info.lane + ' · ' + (LANE_TXT[info.laneType] || '');
    els.tollFill.classList.add('hidden'); els.tollAfter.classList.add('hidden'); els.tollActions.classList.remove('hidden');
    els.tollPrice.textContent = money(info.price, info.currency); els.tollPrice.dataset.cur = info.currency;
    const cbOnly = !police && info.laneType === 'cb';
    const canCash = !cbOnly && info.coinsHave >= info.coinsNeed;
    els.btnTollCash.disabled = !canCash;
    els.btnTollCash.querySelector('.tl-sub').textContent = cbOnly ? 'Pas d\'espèces dans cette voie' : info.coinsNeed + ' pièces 🪙 (tu en as ' + info.coinsHave + ')';
    els.btnTollCard.querySelector('.tl-sub').textContent = 'Sans contact · −' + info.cardPoints + ' points';
    els.tollMsg.textContent = cbOnly ? '' : canCash ? '' : 'Pas assez de pièces ramassées : paie par carte.';
    els.ovToll.classList.remove('hidden');
    _processing = false;
    clickSound(true);
  }
  // Paiement a la borne : carte sans contact ou especes (rendu de monnaie)
  function payToll(method){
    if(_processing || !_stopInfo) return;
    if(_stopKind === 'fuel'){ payCounter(method); return; }
    const PROC = 1.5, info = _stopInfo;
    const res = engine.payToll(method, PROC);
    if(!res.ok){ els.tollMsg.textContent = res.error || 'Paiement refusé'; return; }
    _processing = true;
    els.tollActions.classList.add('hidden'); els.tollMsg.textContent = '';
    els.tollFill.classList.remove('hidden');
    const cur = info.currency, bills = cur === '¥' ? [1000, 5000, 10000] : [5, 10, 20, 50, 100];
    const bill = bills.find(b=>b >= info.price) || bills[bills.length - 1];
    const lines = method === 'card'
      ? ['📶 Approchez votre carte…', '💳 Lecture…', '✔ Paiement accepté']
      : ['💶 Billet de ' + money(bill, cur) + ' inséré', '🪙 Rendu : ' + money(Math.max(0, bill - info.price), cur), '✔ Merci, bonne route'];
    els.tollFillLabel.textContent = lines[0];
    const t0 = performance.now();
    (function step(now){
      const k = Math.min(1, (now - t0) / (PROC * 1000));
      els.tollFillBar.style.width = (k * 100) + '%';
      els.tollFillLabel.textContent = lines[Math.min(2, Math.floor(k * 3))];
      els.tollFillTxt.textContent = k < 1 ? money(info.price, cur) : '🧾 ' + money(info.price, cur) + ' · ' + (method === 'card' ? 'CB' : 'ESPÈCES');
      if(k < 1) requestAnimationFrame(step);
      else { els.ovToll.classList.add('hidden'); _processing = false; chimeSound(1); popup(res.kind === 'police' ? '🚓 Amende payée — roule prudemment !' : '🛣 Barrière ouverte — bonne route !', '#4ee39a', true); }
    })(t0);
  }
  // Station 1/3 : a la pompe, le compteur tourne (litres + montant)
  function startPump(info){
    els.pumpPanel.classList.remove('hidden');
    els.pumpHead.textContent = '⛽ Pompe ' + info.lane + ' · ' + info.fuelLabel + ' · ' + money(info.ppl, info.currency) + '/' + info.unit;
    const FILL = 2.4, t0 = performance.now();
    (function step(now){
      const k = Math.min(1, (now - t0) / (FILL * 1000)), e = 1 - Math.pow(1 - k, 1.6);
      els.pumpQty.textContent = (info.qty * e).toFixed(2).replace('.', ',');
      els.pumpAmount.textContent = money(info.price * e, info.currency);
      els.pumpBar.style.width = (info.fuelPct + (100 - info.fuelPct) * e) + '%';
      if(k < 1){ requestAnimationFrame(step); return; }
      tone({ f:1320, dur:0.12, vol:0.04 }); // "clic" du pistolet
      els.pumpHead.textContent = '✔ Réservoir plein — 🚶 direction la caisse…';
      setTimeout(()=>{ els.pumpPanel.classList.add('hidden'); openCounter(info); }, 900);
    })(t0);
  }
  // Station 2/3 : on entre dans la boutique, on paie le carburant a la caisse
  const EFFECT_TXT = { coffee:'Nitro plein + gains ×1,5 (10 s)', drink:'Nitro +50 %', food:'Aimant à pièces (8 s)' };
  let _shopItems = [], _fuelPaid = false;
  function openCounter(info){
    const route = DG.routeById(state.selectedRoute), cur = route.currency || '€';
    _shopItems = DG.StopKit ? DG.StopKit.shopItems(route) : [];
    _fuelPaid = false;
    engine.enterShop(true);
    els.shopTitle.textContent = route.fuelStationName || 'Boutique';
    els.shopFuelLine.innerHTML = '<span>⛽ Pompe ' + info.lane + ' · ' + info.qty + ' ' + info.unit + ' ' + info.fuelLabel + '</span><b>' + money(info.price, cur) + '</b>';
    els.btnCounterCash.querySelector('.tl-sub').textContent = info.coinsNeed + ' pièces (tu en as ' + info.coinsHave + ')';
    els.btnCounterCard.querySelector('.tl-sub').textContent = '−' + info.cardPoints + ' points';
    els.btnCounterCash.disabled = info.coinsHave < info.coinsNeed;
    els.shopCounter.classList.remove('paid');
    els.btnShopLeave.disabled = true;
    els.shopMsg.textContent = 'Le caissier t\'attend : règle ton carburant.';
    renderShopItems(route);
    refreshWallet();
    setTimeout(()=>{ if(engine._shopCam) els.ovShop.classList.remove('hidden'); }, 900); // le temps d'entrer
  }
  function renderShopItems(route){
    const cur = route.currency || '€';
    els.shopList.innerHTML = _shopItems.map((it, i)=>{
      const c = engine.shopCost(it);
      return '<div class="shop-item" data-i="' + i + '"><span class="si-ico">' + it.ico + '</span><span class="si-body"><span class="si-name">' + it.label + ' <kbd>' + (i + 1) + '</kbd></span><span class="si-eff">' + EFFECT_TXT[it.effect] + '</span></span>' +
        '<span class="si-price">' + money(it.price, cur) + '</span>' +
        '<span class="si-buy"><button class="si-btn" data-buy="' + i + '" data-m="cash">🪙 ' + c.coins + '</button><button class="si-btn card" data-buy="' + i + '" data-m="card">💳 ' + c.card + ' pts</button></span></div>';
    }).join('');
    els.shopList.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click', ()=>buyShop(+b.dataset.buy, b.dataset.m)));
  }
  function payCounter(method){
    if(_fuelPaid) return;
    const res = engine.payToll(method, 'hold');
    if(!res.ok){ els.shopMsg.textContent = res.error || 'Paiement refusé'; return; }
    _fuelPaid = true;
    els.shopCounter.classList.add('paid');
    els.btnShopLeave.disabled = false;
    els.shopMsg.textContent = (method === 'card' ? '💳 Paiement accepté' : '💶 Payé en espèces') + ' — ticket imprimé 🧾';
    chimeSound(1); refreshWallet();
  }
  function refreshWallet(){ els.shopWallet.textContent = '🪙 ' + Math.floor(engine._coinCredits / 10) + ' pièces · score ' + engine.currentScore().toLocaleString('fr-FR'); }
  function buyShop(i, method){
    const it = _shopItems[i]; if(!it) return;
    const res = engine.buyItem(it, method);
    if(!res.ok){ els.shopMsg.textContent = res.error || (method === 'cash' ? 'Pas assez de pièces — paie par carte.' : 'Impossible'); return; }
    const row = els.shopList.querySelector('[data-i="' + i + '"]'); if(row) row.classList.add('bought');
    els.shopMsg.textContent = it.ico + ' ' + it.label + ' acheté ! (' + res.left + ' article' + (res.left > 1 ? 's' : '') + ' max. encore)';
    clickSound(); chimeSound(0);
    popup(it.ico + ' ' + EFFECT_TXT[it.effect], '#ffcc33');
    refreshWallet();
  }
  // Station 3/3 : on ressort (seulement une fois le carburant paye) et on repart
  function leaveShop(){
    if(!_fuelPaid){ els.shopMsg.textContent = '⚠ Paie d\'abord ton carburant à la caisse.'; return; }
    els.ovShop.classList.add('hidden');
    engine.enterShop(false);
    setTimeout(()=>{ engine.leaveStop(); popup('🚗 Bonne route !', '#4ee39a'); }, 1100);
  }
  function openShop(){ if(_stopInfo) openCounter(_stopInfo); }

  // Avis de contravention (photo prise au moment du flash)
  function showTicket(p){
    if(!els.radarTicket) return;
    const lang = (DG._journey && DG._journey.lang) || 'fr';
    els.ticketTitle.textContent = { it:'VERBALE DI CONTRAVVENZIONE', de:'ORDNUNGSBUSSE' }[lang] || (p.currency === '$' ? 'SPEEDING TICKET' : 'AVIS DE CONTRAVENTION');
    const flags = { '$':'repeating-linear-gradient(180deg,#b22234 0 2px,#fff 2px 4px)', CHF:'radial-gradient(circle,#fff 0 30%,#d52b1e 31%)', '¥':'radial-gradient(circle,#bc002d 0 34%,#fff 35%)' };
    const flag = flags[p.currency] || (lang === 'it' ? 'linear-gradient(90deg,#009246 33%,#fff 33% 66%,#ce2b37 66%)' : 'linear-gradient(90deg,#1f4fa8 33%,#fff 33% 66%,#d0141e 66%)');
    const fl = els.radarTicket.querySelector('.rt-flag'); if(fl) fl.style.background = flag;
    els.ticketPhoto.src = p.photo || '';
    els.ticketPhoto.style.display = p.photo ? '' : 'none';
    const d = new Date();
    els.ticketRows.innerHTML =
      '<span>Date</span><b>' + d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) + '</b>' +
      '<span>Lieu</span><b>' + (p.place || '—') + '</b>' +
      '<span>Vitesse retenue</span><b class="bad">' + speedTxt(p.kmh, p.unitLabel) + '</b>' +
      '<span>Limitation</span><b>' + speedTxt(p.limit, p.unitLabel) + '</b>' +
      '<span>Amende</span><b class="bad">' + money(p.fine, p.currency) + ' (−' + p.pts + ' pts)</b>';
    els.ticketStamp.textContent = p.police || 'Police';
    els.radarTicket.classList.remove('show'); void els.radarTicket.offsetWidth; els.radarTicket.classList.add('show');
    clearTimeout(showTicket._t); showTicket._t = setTimeout(()=>els.radarTicket.classList.remove('show'), 5500);
  }

  // Bandeau d'alerte : poursuite > radar > station (on peut toucher / E pour la station)
  const alerts = { police:null, radar:null, station:null };
  let _siren = 0;
  function renderAlert(){
    const el = els.alertChip; if(!el) return;
    let html = '', cls = '';
    if(alerts.police){ html = '<span class="ac-ico">🚓</span><span><b>POLICE</b> à ' + Math.round(alerts.police.gap) + ' m<br><small>nitro pour la semer !</small></span>'; cls = 'police'; }
    else if(alerts.radar){
      const r = alerts.radar, over = r.kmh > r.limit + 5, us = r.unitLabel === 'mph';
      const lim = us ? Math.round(r.limit / 1.609) : r.limit, cur = us ? Math.round(r.kmh / 1.609) : r.kmh;
      html = '<span class="rw-sign' + (us ? ' us' : '') + '">' + (us ? '<small>SPEED<br>LIMIT</small>' : '') + lim + '</span>' +
        '<span class="rw-speed' + (over ? ' over' : '') + '">' + cur + '<small>' + (us ? 'mph' : 'km/h') + '</small></span>' +
        '<span class="rw-info"><b>' + (r.mobile ? '⚠ CONTRÔLE MOBILE' : '📸 RADAR') + '</b><small>' + Math.round(r.dist) + ' m' + (over ? ' · freine ↓' : ' · OK ✓') + '</small></span>';
      cls = 'radar' + (over ? ' over' : '');
    }
    else if(alerts.station){ const s = alerts.station; html = '<span class="ac-ico">⛽</span><span>' + (s.requested ? 'Direction la pompe…' : '<b>STATION</b> dans ' + Math.round(s.dist) + ' m<br><small><kbd>E</kbd> / touche ici pour faire le plein</small>') + '</span>'; cls = 'station' + (s.fuel < 0.35 ? ' low' : '') + (s.requested ? ' requested' : ''); }
    el.className = 'alert-chip ' + cls + (html ? '' : ' hidden');
    el.innerHTML = html;
  }
  function sirenTick(){
    if(!alerts.police){ clearInterval(_siren); _siren = 0; return; }
    tone({ f:960, to:720, glide:0.24, dur:0.26, vol:0.035, type:'sawtooth' });
    tone({ f:720, to:960, glide:0.24, dur:0.26, vol:0.035, type:'sawtooth', delay:0.28 });
  }

  function startRun(){
    if(els.ovToll) els.ovToll.classList.add('hidden');
    if(els.pumpPanel) els.pumpPanel.classList.add('hidden');
    if(els.radarTicket) els.radarTicket.classList.remove('show');
    if(els.ovShop) els.ovShop.classList.add('hidden');
    alerts.police = alerts.radar = alerts.station = null; renderAlert();
    const rt = DG.routeById(state.selectedRoute);
    if(rt && rt.journey && rt.journey.intro) setTimeout(()=>{ if(engine.playing) popup(rt.journey.intro, '#ffffff', true); }, 3600);
    if(els.journeyChip){ els.journeyChip.classList.add('hidden'); els.journeyChip.innerHTML = ''; }
    const car = DG.carById(state.selectedCar);
    els.hudTop.style.display = 'flex'; els.hudBottom.style.display = 'flex';
    show(null);
    _lastScore = 0;
    for(const k in _hud) delete _hud[k];
    els.countdown.innerHTML = '';
    els.draftBadge.classList.remove('show');
    engine.start(car, state.selectedRoute, state.personalBest);
  }
  els.btnStart.addEventListener('click', startRun);
  if(els.dailyCard){
    els.dailyCard.addEventListener('click', selectDailyChallenge);
    els.dailyCard.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); selectDailyChallenge(); } });
  }
  if(els.drawCard){
    els.drawCard.addEventListener('click', openWheel);
    els.drawCard.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openWheel(); } });
  }
  if(els.btnSpinWheel) els.btnSpinWheel.addEventListener('click', spinWheel);
  if(els.btnCloseWheel) els.btnCloseWheel.addEventListener('click', closeWheel);

  let lastResult = null;
  async function handleGameOver(result){
    els.hudTop.style.display = 'none'; els.hudBottom.style.display = 'none';
    lastResult = result;
    recordDailyRun(result);
    const isRecord = result.score > state.personalBest;
    if(isRecord){
      state.personalBest = result.score;
      if(!DG.Auth.isLoggedIn()){ try { localStorage.setItem('apex_best', String(result.score)); } catch(e){} }
      if(els.pilotBest) els.pilotBest.textContent = '🏆 ' + state.personalBest.toLocaleString('fr-FR');
    }
    els.ovRecordBadge.style.display = isRecord ? 'inline-block' : 'none';
    els.speedFx.classList.remove('boost'); els.speedFx.style.setProperty('--spd', 0); _lastSpd = -1;
    els.draftBadge.classList.remove('show');
    els.overScore.textContent = '0';
    els.overTime.textContent = result.time.toFixed(1) + 's';
    els.overCredits.textContent = '+…';
    show('ovOver');
    countUp(els.overScore, result.score, n=>Math.round(n).toLocaleString('fr-FR'), 1500);
    if(isRecord) setTimeout(()=>{ confetti(innerWidth/2, innerHeight*0.3); chimeSound(3); }, 350);
    flashOverScreen(result.carId);
    startOverCarSpin(result.carId);
    const credits = await DG.Economy.recordRun({ name: state.username, score: result.score, carId: result.carId, timeSeconds: result.time, routeId: result.routeId });
    countUp(els.overCredits, credits, n=>'+' + Math.round(n).toLocaleString('fr-FR'), 1000);
    const board = await DG.Leaderboard.fetchBoard(5);
    els.overBoard.innerHTML = board.length ? board.map((e,i)=>DG.Leaderboard.rowHTML(e,i)).join('') : '<div style="text-align:center;color:#8a8f98;padding:16px">Aucun score encore.</div>';
    await refreshDailyClaim(result);
  }

  async function refreshDailyClaim(result){
    if(!els.overDailyCard) return;
    els.overDailyCard.classList.add('hidden');
    const dc = DG.dailyChallenge();
    if(result.carId !== dc.carId || result.score < dc.target) return;
    if(!DG.Auth.isLoggedIn()){
      els.overDailyDesc.textContent = 'Connecte-toi pour réclamer tes +' + dc.reward + ' crédits.';
      els.btnClaimDaily.textContent = 'Se connecter';
      els.btnClaimDaily.onclick = ()=>{ window.location.href = '../compte.html'; };
      els.overDailyCard.classList.remove('hidden');
      return;
    }
    const already = await DG.Economy.hasClaimedDailyChallenge();
    if(already) return;
    els.overDailyDesc.textContent = 'Objectif du jour atteint (' + result.score.toLocaleString('fr-FR') + ' ≥ ' + dc.target.toLocaleString('fr-FR') + ').';
    els.btnClaimDaily.disabled = false;
    els.btnClaimDaily.textContent = 'Réclamer +' + dc.reward;
    els.btnClaimDaily.onclick = async ()=>{
      els.btnClaimDaily.disabled = true;
      els.btnClaimDaily.textContent = '…';
      const res = await DG.Economy.claimDailyChallenge(result.score, result.carId);
      if(res.ok){
        els.btnClaimDaily.textContent = '✓ Réclamé';
        state.dailyClaimedToday = true;
        bumpStreak();
        const streak = streakCount();
        els.overDailyDesc.textContent = '+' + res.credits + ' crédits ajoutés !' + (streak >= 2 ? ' 🔥 ' + streak + ' jours de suite' : '');
        chimeSound(2);
        const r = els.btnClaimDaily.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top);
      } else {
        els.btnClaimDaily.disabled = false;
        els.btnClaimDaily.textContent = 'Réclamer +' + dc.reward;
        els.overDailyDesc.textContent = res.error || 'Erreur.';
      }
    };
    els.overDailyCard.classList.remove('hidden');
  }

  els.btnRetry.addEventListener('click', startRun);
  els.btnChangeCar.addEventListener('click', ()=>{ engine.quit(); goToChoosing(); });
  els.btnWatchAd.addEventListener('click', async ()=>{
    els.btnWatchAd.disabled = true;
    const res = await DG.Ads.watch();
    if(res.ok){ popup('+' + res.amount + ' 🪙', '#ffcc00'); }
    else { popup(res.error || 'Pub indisponible', '#ff9090'); }
    els.btnWatchAd.disabled = false;
  });

  async function openBoard(){
    show('ovBoard');
    els.fullBoard.innerHTML = '<div class="skeleton" style="color:#8a8f98;text-align:center;padding:20px">Chargement…</div>';
    const board = await DG.Leaderboard.fetchBoard(25);
    els.fullBoard.innerHTML = board.length ? board.map((e,i)=>DG.Leaderboard.rowHTML(e,i)).join('') : '<div style="text-align:center;color:#8a8f98;padding:30px">Aucun score encore — soyez le premier !</div>';
  }
  els.btnBoardOpen.addEventListener('click', openBoard);
  els.btnBoardClose.addEventListener('click', ()=>show('ovChoosing'));

  function wireControls(){
    els.btnLeft.addEventListener('pointerdown', ()=>engine.move(-1));
    els.btnRight.addEventListener('pointerdown', ()=>engine.move(1));
    els.btnBoost.addEventListener('pointerdown', ()=>engine.setBoostHeld(true));
    els.btnBoost.addEventListener('pointerup', ()=>engine.setBoostHeld(false));
    els.btnBoost.addEventListener('pointerleave', ()=>engine.setBoostHeld(false));
    els.btnCam.addEventListener('click', ()=>engine.cycleCam());
    els.btnPause.addEventListener('click', ()=>engine.pause());
    els.btnResume.addEventListener('click', ()=>engine.resume());
    els.btnRestartFromPause.addEventListener('click', ()=>{ show(null); els.hudTop.style.display='flex'; els.hudBottom.style.display='flex'; startRun(); });
    els.btnQuitFromPause.addEventListener('click', ()=>{ engine.quit(); goToChoosing(); });

    window.addEventListener('keydown', (e)=>{
      const k = e.key;
      if(k==='ArrowLeft'||k==='a'||k==='A'||k==='q'||k==='Q'){ engine.move(-1); if(engine.playing) e.preventDefault(); }
      if(k==='ArrowRight'||k==='d'||k==='D'){ engine.move(1); if(engine.playing) e.preventDefault(); }
      if(k==='ArrowDown'||k==='s'||k==='S'){ engine.setBrake(true); if(engine.playing) e.preventDefault(); }
      if(k===' '||k==='Shift'||k==='ArrowUp'||k==='w'||k==='W'){ engine.setBoostHeld(true); if(engine.playing) e.preventDefault(); }
      if(k==='c'||k==='C'){ engine.cycleCam(); }
      if((k==='p'||k==='P') && engine.playing){ engine.paused ? engine.resume() : engine.pause(); }
      if(k==='Escape' && engine.playing && !engine.paused){ engine.pause(); }
    });
    window.addEventListener('keyup', (e)=>{
      const k = e.key;
      if(k===' '||k==='Shift'||k==='ArrowUp'||k==='w'||k==='W'){ engine.setBoostHeld(false); }
      if(k==='ArrowDown'||k==='s'||k==='S'){ engine.setBrake(false); }
    });
    // fenetre qui perd le focus : on relache tout (sinon la voiture braque seule)
    window.addEventListener('blur', ()=>{ engine.setBrake(false); engine.setBoostHeld(false); });

    // Peage : touches 1 / 2 pour payer sans souris
    window.addEventListener('keydown', (e)=>{
      if(els.ovToll.classList.contains('hidden')) return;
      if(e.key === '1') payToll('cash');
      if(e.key === '2' || e.key === 'Enter') payToll('card');
    });
    els.btnTollCash.addEventListener('click', ()=>payToll('cash'));
    els.btnShopEnter.addEventListener('click', openShop);
    els.btnShopSkip.addEventListener('click', ()=>{ els.ovToll.classList.add('hidden'); engine.leaveStop(); popup('🚗 Bonne route !', '#4ee39a'); });
    els.btnShopLeave.addEventListener('click', leaveShop);
    els.btnCounterCard.addEventListener('click', ()=>payCounter('card'));
    els.btnCounterCash.addEventListener('click', ()=>payCounter('cash'));
    window.addEventListener('keydown', (e)=>{
      if(!els.ovShop.classList.contains('hidden')){
        const n = parseInt(e.key, 10);
        if(n >= 1 && n <= _shopItems.length){ buyShop(n - 1, Math.floor(engine._coinCredits / 10) > 0 ? 'cash' : 'card'); }
        if(e.key === 'c' || e.key === 'C') payCounter('card');
        if(e.key === 'v' || e.key === 'V') payCounter('cash');
        if(e.key === 'Escape' || e.key === 'Enter'){ e.preventDefault(); leaveShop(); }
      } else if(!els.tollAfter.classList.contains('hidden') && !els.ovToll.classList.contains('hidden')){
        if(e.key === 'b' || e.key === 'B') openShop();
        if(e.key === 'Enter'){ els.ovToll.classList.add('hidden'); engine.leaveStop(); }
      }
    });
    // station : demande d'arret (touche E ou toucher le bandeau)
    window.addEventListener('keydown', (e)=>{ if((e.key === 'e' || e.key === 'E') && engine.playing){ if(engine.requestFuelStop()) clickSound(); } });
    if(els.alertChip) els.alertChip.addEventListener('pointerdown', ()=>{ if(engine.requestFuelStop()) clickSound(); });
    els.btnTollCard.addEventListener('click', ()=>payToll('card'));

    const fsSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if(!fsSupported){ els.btnFullscreen.style.display = 'none'; }
    else {
      els.btnFullscreen.addEventListener('click', ()=>{
        const stage = document.getElementById('stage');
        if(!document.fullscreenElement && !document.webkitFullscreenElement){
          Promise.resolve((stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage)).catch(()=>{});
        } else {
          Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(()=>{});
        }
      });
      document.addEventListener('fullscreenchange', updateFsIcon);
      document.addEventListener('webkitfullscreenchange', updateFsIcon);
    }
    function updateFsIcon(){
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      els.btnFullscreen.textContent = isFs ? '⤡' : '⛶';
      els.btnFullscreen.title = isFs ? 'Quitter le plein écran' : 'Plein écran';
    }
  }

  function wireMusic(){
    let tracks = [], current = -1, loaded = false;
    async function loadTracks(){
      if(loaded || !DG.supabase || !DG.SUPABASE_READY) return;
      loaded = true;
      const { data, error } = await DG.supabase.from('music_tracks').select('*').eq('active', true).order('added_at', { ascending:false });
      tracks = (!error && data) ? data : [];
    }
    function trackLabel(t){ return t.artist ? (t.title + ' — ' + t.artist) : t.title; }
    function renderList(){
      if(!tracks.length){ els.musicList.innerHTML = '<div class="music-list-empty">Aucune piste</div>'; return; }
      els.musicList.innerHTML = tracks.map((t,i)=>
        '<div class="music-list-item' + (i===current?' active':'') + '" data-idx="' + i + '">' +
          '<span class="n">' + (i+1) + '</span><span>' + trackLabel(t) + '</span>' +
        '</div>'
      ).join('');
      els.musicList.querySelectorAll('[data-idx]').forEach(el=>el.addEventListener('click', ()=>playIndex(parseInt(el.getAttribute('data-idx'),10))));
    }
    function playIndex(i){
      if(!tracks.length) return;
      current = (i + tracks.length) % tracks.length;
      els.bgAudio.src = tracks[current].url;
      els.bgAudio.play().catch(()=>{});
      els.musicTrackName.textContent = trackLabel(tracks[current]);
      renderList();
    }
    function fmtTime(s){
      if(!isFinite(s) || s < 0) s = 0;
      const m = Math.floor(s/60), sec = Math.floor(s%60);
      return m + ':' + (sec<10?'0':'') + sec;
    }
    let seeking = false;
    let savedVol = 50;
    try { const v = parseInt(localStorage.getItem('dg_music_vol'), 10); if(!isNaN(v)) savedVol = v; } catch(e){}
    els.bgAudio.volume = savedVol/100;
    els.musicVolume.value = savedVol;
    els.bgAudio.addEventListener('ended', ()=>playIndex(current+1));
    els.bgAudio.addEventListener('play', ()=>{ els.btnMusic.classList.add('active'); els.btnMusicToggle.textContent = '⏸'; });
    els.bgAudio.addEventListener('pause', ()=>{ els.btnMusic.classList.remove('active'); els.btnMusicToggle.textContent = '▶'; });
    els.bgAudio.addEventListener('loadedmetadata', ()=>{ els.musicTimeDur.textContent = fmtTime(els.bgAudio.duration); });
    els.bgAudio.addEventListener('timeupdate', ()=>{
      if(seeking) return;
      els.musicTimeCur.textContent = fmtTime(els.bgAudio.currentTime);
      if(els.bgAudio.duration) els.musicSeek.value = String(Math.round((els.bgAudio.currentTime/els.bgAudio.duration)*1000));
    });
    els.musicSeek.addEventListener('input', ()=>{
      seeking = true;
      if(els.bgAudio.duration) els.musicTimeCur.textContent = fmtTime((els.musicSeek.value/1000)*els.bgAudio.duration);
    });
    els.musicSeek.addEventListener('change', ()=>{
      if(els.bgAudio.duration) els.bgAudio.currentTime = (els.musicSeek.value/1000)*els.bgAudio.duration;
      seeking = false;
    });
    els.musicTrackName.addEventListener('click', ()=>{
      els.musicList.classList.toggle('hidden');
      els.musicTrackName.classList.toggle('open', !els.musicList.classList.contains('hidden'));
    });
    els.btnMusic.addEventListener('click', async ()=>{
      await loadTracks();
      if(!tracks.length){ popup('Aucune musique disponible pour le moment', '#8a8f98'); els.musicPanel.classList.add('hidden'); return; }
      els.musicPanel.classList.toggle('hidden');
      renderList();
      if(!els.musicPanel.classList.contains('hidden') && current === -1) playIndex(Math.floor(Math.random()*tracks.length));
    });
    els.btnMusicToggle.addEventListener('click', ()=>{
      if(!tracks.length) return;
      if(!els.bgAudio.paused) els.bgAudio.pause();
      else if(current === -1) playIndex(Math.floor(Math.random()*tracks.length));
      else els.bgAudio.play().catch(()=>{});
    });
    els.btnMusicPrev.addEventListener('click', ()=>playIndex(current-1));
    els.btnMusicNext.addEventListener('click', ()=>playIndex(current+1));
    els.musicVolume.addEventListener('input', ()=>{
      const v = parseInt(els.musicVolume.value, 10);
      els.bgAudio.volume = v/100;
      try { localStorage.setItem('dg_music_vol', String(v)); } catch(e){}
    });
  }

  function waitThree(cb){ if(window.THREE && window.THREE.GLTFLoader) cb(); else setTimeout(()=>waitThree(cb), 60); }
  waitThree(boot);
})();
