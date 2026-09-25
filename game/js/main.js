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
    payModal:$('payModal'), pmIcon:$('pmIcon'), pmKicker:$('pmKicker'), pmTotal:$('pmTotal'), pmStage:$('pmStage'), pmFoot:$('pmFoot'),
    tollPanel:$('tollPanel'), tollFillLabel:$('tollFillLabel'), fpPrompt:$('fpPrompt'), fpHelp:$('fpHelp'), eatPanel:$('eatPanel'), eatList:$('eatList'), btnEatStand:$('btnEatStand'), pumpPanel:$('pumpPanel'), pumpHead:$('pumpHead'), pumpGrades:$('pumpGrades'), pumpPresets:$('pumpPresets'), pumpNozzle:$('pumpNozzle'), pumpDone:$('pumpDone'), pumpSkip:$('pumpSkip'), pumpUnitLbl:$('pumpUnitLbl'), laneStrip:$('laneStrip'), pumpQty:$('pumpQty'), pumpAmount:$('pumpAmount'), pumpBar:$('pumpBar'),
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
      onPauseChange(paused){ document.body.classList.toggle('dg-paused', !!paused); if(paused) pumpHold(false); show(paused ? 'ovPaused' : null); if(!paused){ els.hudTop.style.display='flex'; els.hudBottom.style.display='flex'; } },
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
      onTollLanes(t){ renderLaneStrip(t); },
      onAccident(a){ alerts.accident = a; renderAlert(); },
      onRescue(r){ alerts.rescue = r; renderAlert(); },
      onWalk(kind){ walkSound(kind); },
      onFp(kind, d){ fpEvent(kind, d); },
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
        else if(kind==='accident'){ popup('🚧 ACCIDENT · voie ' + payload.lane + ' fermée — change de voie ' + (payload.side > 0 ? '▶' : '◀'), '#ff5a3d', true); tone({ f:960, to:720, glide:0.24, dur:0.26, vol:0.03, type:'sawtooth' }); tone({ f:720, to:960, glide:0.24, dur:0.26, vol:0.03, type:'sawtooth', delay:0.28 }); }
        else if(kind==='rule-warn') popup(payload.text, payload.danger ? '#ff5a3d' : '#ffcc00', true);
        else if(kind==='rule-fine'){ popup('🧾 AMENDE ' + money(payload.fine, payload.currency) + ' · ' + payload.title + ' (−' + payload.pts + ' pts)', '#ff5a3d', true); tone({ f:330, dur:0.2, vol:0.05, type:'square' }); }
        else if(kind==='horn'){ popup('📯 ATTENTION DERRIÈRE !', '#ff5a3d', true); tone({ f:392, dur:0.55, vol:0.06, type:'sawtooth' }); tone({ f:494, dur:0.55, vol:0.05, type:'sawtooth' }); }
        else if(kind==='breakdown') popup('🚨 Feux de détresse · dépanneuse appelée, attends sur la bande d\'arrêt d\'urgence', '#ffcc00', true);
        else if(kind==='fuel-station') popup('⛽ AIRE DE SERVICE — voie de droite puis sortie ▶ (tu conduis, tu te gares toi-même)', '#ffcc33', true);
        else if(kind==='fuel-hint') popup('⛽ Pour faire le plein : voie de droite, puis ▶ dans la voie de sortie', '#ffcc33', true);
        else if(kind==='fuel-missed') popup('⛽ Pompe ratée — rejoins l\'autoroute par la voie d\'insertion ◀', '#ff9a3d', true);
        else if(kind==='parked'){ popup('🅿 Bien garé ! Coupe le moteur…', '#4ee39a', true); tone({ f:880, dur:0.08, vol:0.04 }); }
        else if(kind==='telepass'){ popup('📡 Télépéage · ' + money(payload.price, payload.currency) + ' débité (−' + payload.pts + ' pts)', '#ffcc00', true); tone({ f:1760, dur:0.09, vol:0.05 }); tone({ f:2350, dur:0.12, vol:0.05, delay:0.1 }); }
        else if(kind==='radar-flash'){
          showTicket(payload);
          if(els.radarFlash){ els.radarFlash.classList.remove('go'); void els.radarFlash.offsetWidth; els.radarFlash.classList.add('go'); }
          tone({ f:2400, dur:0.06, vol:0.05 });
        }
        else if(kind==='radar-ok') popup('📸 Radar : ' + speedTxt(payload.kmh, payload.unitLabel) + ' ✓', '#4ee39a');
        else if(kind==='police-chase') popup('🚓 LA POLICE TE POURSUIT ! Nitro pour la semer', '#5a8aff', true);
        else if(kind==='police-lost'){ popup('🚓 Police semée ! +200', '#4ee39a', true); chimeSound(2); }
        else if(kind==='fuel-enter') popup('↘ Voie de sortie · ralentis à 30 km/h et gare-toi dans le cadre 🅿', '#ffcc33', true);
        else if(kind==='fuel-low') popup('⚠ RÉSERVE ! Fais le plein à la prochaine station', '#ff5a3d', true);
        else if(kind==='out-of-fuel') popup('⛽ PANNE SÈCHE ! Range-toi à droite ▶ sur la bande d\'arrêt d\'urgence', '#ff5a3d', true);
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
  let _stopKind = null, _stopInfo = null;
  const curRoute = ()=>DG.routeById(state.selectedRoute);
  // Argent liquide du joueur = pieces ramassees (1 piece = 0,50 unite de monnaie locale)
  const walletCash = ()=>Math.floor(engine._coinCredits / 10) * 0.5 * (curRoute().coinValue || 1);

  // ======== Paiement : terminal de carte (code PIN) ou especes (billets) ========
  const DENOMS = { '€':[50, 20, 10, 5, 2, 1, 0.5], 'CHF':[100, 50, 20, 10, 5, 2, 1], '$':[20, 10, 5, 1, 0.25], '¥':[10000, 5000, 1000, 500, 100] };
  let _pay = null;
  function openPayment(o){
    // o : { method, amount, currency, pin, label, onDone }
    _pay = Object.assign({ step:0, code:'' }, o);
    els.pmStage.classList.remove('swipe');
    els.payModal.classList.remove('hidden');
    els.payModal.dataset.method = o.method;
    els.pmIcon.textContent = o.method === 'card' ? '💳' : '💶';
    els.pmKicker.textContent = o.label || 'Paiement';
    els.pmTotal.textContent = money(o.amount, o.currency);
    if(o.method === 'card') cardStep0(); else cashStep0();
  }
  function closePayment(ok){
    const p = _pay; _pay = null;
    els.payModal.classList.add('hidden');
    if(p && p.onDone) p.onDone(ok);
  }
  // --- carte ---
  // Terminal : 4 voyants sans contact au-dessus de l'ecran, fente en bas.
  const NFC_LIMIT = { '€':50, 'CHF':80, '$':100, '¥':15000 };
  const CARD_FACE = '<span class="bc-chip"></span><span class="bc-nfc">)))</span><span class="bc-num">•••• •••• •••• 4821</span><span class="bc-name">PILOTE</span><span class="bc-logo">CB</span>';
  function terminalHTML(screen, extra, leds, id){
    return '<div class="tpe"' + (id ? ' id="' + id + '"' : '') + '><div class="tpe-nfc" id="pmNfc"><span class="nfc-leds">' + [0, 1, 2, 3].map(k=>'<i class="' + (k < (leds || 0) ? 'ok' : '') + '"></i>').join('') + '</span><span class="nfc-sym">)))</span></div>' +
      '<div class="tpe-screen" id="pmScreen">' + screen + '</div>' + (extra || '') + '<div class="tpe-slot" id="pmSlot"></div></div>';
  }
  function cardStep0(){
    const p = _pay, lim = NFC_LIMIT[p.currency] || 50;
    p.needPin = p.pin || p.amount > lim + 1e-6;
    p.screen0 = '<small>' + money(p.amount, p.currency) + '</small><b>PASSEZ LA CARTE</b><small>⟵ DE DROITE À GAUCHE' + (p.needPin ? '<br>PUIS CODE' : '<br>SANS CONTACT') + '</small>';
    els.pmStage.classList.add('swipe');
    els.pmStage.innerHTML = terminalHTML(p.screen0, '<div class="swipe-hint">⟵</div>') + '<div class="pm-card-zone swipe" id="pmCardZone"><div class="pm-bankcard" id="pmCard">' + CARD_FACE + '</div></div>';
    els.pmFoot.innerHTML = '<span class="pm-hint">🖐 <b>Maintiens</b> la carte et <b>passe-la de droite à gauche</b> sur le terminal (ni trop vite, ni trop lent)' + (p.needPin ? ' · plus de ' + money(lim, p.currency) + ' : code demandé' : '') + ' · <kbd>Entrée</kbd></span><button class="pm-cancel" id="pmCancel">Annuler</button>';
    document.getElementById('pmCancel').addEventListener('click', ()=>closePayment(false));
    wireSwipe(p);
  }
  function wireSwipe(p){
    const card = document.getElementById('pmCard'), tpe = els.pmStage.querySelector('.tpe'), scr = document.getElementById('pmScreen');
    const leds = document.getElementById('pmNfc').querySelectorAll('i');
    let drag = null, off = { x:0, y:0 }, rd = null, done = false, lastProg = -1;
    const setLeds = (n, cls)=>leds.forEach((l, k)=>{ l.className = k < n ? (cls || 'on') : ''; });
    const place = (x, y, r)=>{ off.x = x; off.y = y; card.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + (r || 0) + 'deg)'; };
    const fail = (msg)=>{
      rd = null; setLeds(4, 'err'); tone({ f:300, dur:0.22, vol:0.05, type:'square' });
      scr.innerHTML = '<b class="err">' + msg + '</b><small>RECOMMENCEZ ⟵</small>';
      setTimeout(()=>{ if(!done && !rd) setLeds(0); }, 550);
    };
    // lecture : le centre de la carte doit traverser tout le terminal, de son bord droit a son bord gauche
    const check = (now)=>{
      if(done) return;
      const c = card.getBoundingClientRect(), t = tpe.getBoundingClientRect();
      const cx = (c.left + c.right) / 2, cy = (c.top + c.bottom) / 2;
      const inY = cy > t.top + 6 && cy < t.bottom - 6;
      const prog = (t.right - cx) / t.width;
      tpe.classList.toggle('hot', inY && prog > -0.25 && prog < 1.1);
      if(!rd){
        if(inY && prog >= 0 && prog < 0.4 && lastProg < 0.02){ rd = { t0:now, max:prog }; tone({ f:1400, dur:0.03, vol:0.03 }); scr.innerHTML = '<small>' + money(p.amount, p.currency) + '</small><b>LECTURE…</b><small>CONTINUE ⟵</small>'; }
      } else {
        if(!inY) fail('CARTE SORTIE DU LECTEUR');
        else if(prog < rd.max - 0.3) fail('MAUVAIS SENS');
        else {
          rd.max = Math.max(rd.max, prog);
          const n = Math.max(0, Math.min(4, Math.floor(rd.max * 4 + 0.001)));
          if(n > leds.length - [...leds].filter(l=>!l.className).length) tone({ f:1000 + n * 150, dur:0.03, vol:0.025 });
          setLeds(n);
          if(rd.max >= 1){
            const dt = (now - rd.t0) / 1000;
            if(dt < 0.28) fail('TROP RAPIDE');
            else if(dt > 3.5) fail('TROP LENT');
            else success();
          }
        }
      }
      lastProg = prog;
    };
    function success(){
      done = true; rd = null; setLeds(4, 'ok'); tpe.classList.remove('hot');
      tone({ f:2093, dur:0.18, vol:0.05 });
      scr.innerHTML = '<b class="ok">✔ CARTE LUE</b><small>' + (p.needPin ? 'SAISISSEZ VOTRE CODE' : 'SANS CONTACT') + '</small>';
      p.usedNfc = !p.needPin; p.step = 1;
      drag = null; card.classList.remove('drag'); card.classList.add('away');
      setTimeout(()=>{ if(_pay === p){ if(p.needPin) cardPin(); else cardProcess(); } }, 700);
    }
    card.addEventListener('pointerdown', (e)=>{
      if(done || drag) return;
      e.preventDefault(); try { card.setPointerCapture(e.pointerId); } catch(err){}
      drag = { x0:e.clientX - off.x, y0:e.clientY - off.y }; card.classList.add('drag');
    });
    card.addEventListener('pointermove', (e)=>{
      if(!drag || drag.auto || done) return;
      const x = e.clientX - drag.x0, y = e.clientY - drag.y0;
      place(x, y, Math.max(-6, Math.min(6, (e.movementX || 0) * 0.4)));
      check(performance.now());
    });
    const up = ()=>{
      if(!drag || drag.auto || done) return;
      drag = null; card.classList.remove('drag'); tpe.classList.remove('hot');
      if(rd) fail('PASSAGE INCOMPLET');
      card.style.transform = ''; off.x = off.y = 0; lastProg = -1; // la carte revient dans la main
    };
    card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
    // Entree : la carte est passee toute seule
    p.autoCard = ()=>{
      if(done || drag) return;
      const c = card.getBoundingClientRect(), t = tpe.getBoundingClientRect();
      const y = off.y + ((t.top + t.bottom) / 2 - (c.top + c.bottom) / 2);
      const cx = (c.left + c.right) / 2, x0 = off.x + (t.right + 12 - cx), x1 = off.x + (t.left - 16 - cx);
      drag = { auto:true }; card.classList.add('drag'); lastProg = -1;
      place(x0, y, -3); check(performance.now());
      const t0 = performance.now(), N = 14; let k = 0;
      const stepA = ()=>{ if(done || _pay !== p) return; k++; place(x0 + (x1 - x0) * k / N, y, -3); check(t0 + k * 65); if(k < N) setTimeout(stepA, 50); else if(!done){ drag = null; card.classList.remove('drag'); card.style.transform = ''; } };
      setTimeout(stepA, 150);
    };
  }
  function cardInsert(){ if(_pay && _pay.autoCard) _pay.autoCard(); }
  function cardPin(){
    const p = _pay;
    const dots = ()=>'<span class="pin-dots">' + [0, 1, 2, 3].map(i=>'<i class="' + (i < p.code.length ? 'on' : '') + '"></i>').join('') + '</span>';
    const keys = ['1','2','3','4','5','6','7','8','9','✕','0','✔'];
    const render = ()=>{
      els.pmStage.innerHTML = terminalHTML('<small>' + money(p.amount, p.currency) + '</small><b>CODE</b>' + dots(),
        '<div class="tpe-keys">' + keys.map(k=>'<button data-k="' + k + '" class="' + (k === '✕' ? 'red' : k === '✔' ? 'green' : '') + '">' + k + '</button>').join('') + '</div>', 4);
      els.pmStage.querySelectorAll('[data-k]').forEach(b=>b.addEventListener('click', ()=>pinKey(b.dataset.k)));
    };
    p.renderPin = render; render();
    els.pmFoot.innerHTML = '<span class="pm-hint">Tape ton code à 4 chiffres (clavier ou pavé) puis ✔</span>';
  }
  function pinKey(k){
    const p = _pay; if(!p || !p.renderPin) return;
    if(k === '✕'){ p.code = p.code.slice(0, -1); }
    else if(k === '✔'){ if(p.code.length === 4){ p.renderPin = null; cardProcess(); return; } }
    else if(p.code.length < 4) p.code += k;
    tone({ f:k === '✔' ? 1320 : 1040, dur:0.05, vol:0.035 });
    p.renderPin();
    if(p.code.length === 4 && k !== '✕') setTimeout(()=>{ if(_pay === p && p.renderPin){ p.renderPin = null; cardProcess(); } }, 350);
  }
  function cardProcess(){
    const p = _pay;
    els.pmStage.classList.remove('swipe');
    els.pmStage.innerHTML = terminalHTML('<small>' + money(p.amount, p.currency) + '</small><b class="proc">' + (p.usedNfc ? 'SANS CONTACT' : 'AUTORISATION') + '<span class="dots"><i></i><i></i><i></i></span></b>', '', 4);
    els.pmFoot.innerHTML = '';
    setTimeout(()=>{
      if(_pay !== p) return;
      tone({ f:1568, dur:0.12, vol:0.05 }); tone({ f:2093, dur:0.16, vol:0.05, delay:0.12 });
      const d = new Date();
      els.pmStage.innerHTML = terminalHTML('<b class="ok">✔ PAIEMENT ACCEPTÉ</b><small>MERCI, BONNE ROUTE</small>', '', 4) +
        '<div class="receipt"><b>' + (p.merchant || 'REÇU') + '</b><span>' + d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) + '</span>' +
        (p.lines || []).map(l=>'<span class="rl"><em>' + l[0] + '</em><em>' + l[1] + '</em></span>').join('') +
        '<span class="rl tot"><em>TOTAL</em><em>' + money(p.amount, p.currency) + '</em></span><span>CARTE •••• 4821' + (p.usedNfc ? ' · SANS CONTACT' : ' · CODE OK') + '</span></div>';
      setTimeout(()=>{ if(_pay === p) closePayment(true); }, 1700);
    }, 1300);
  }
  // --- especes ---
  function cashStep0(){
    const p = _pay, cur = p.currency, den = DENOMS[cur] || DENOMS['€'];
    // porte-monnaie : l'argent liquide du joueur decompose en billets / pieces
    let left = Math.round(walletCash() * 100) / 100; const wallet = [];
    den.forEach(v=>{ while(left + 1e-6 >= v && wallet.length < 14){ wallet.push(v); left = Math.round((left - v) * 100) / 100; } });
    p.wallet = wallet; p.given = [];
    const render = ()=>{
      const given = p.given.reduce((a, b)=>a + b, 0);
      els.pmStage.innerHTML =
        '<div class="cash-tray"><small>PLATEAU</small><div class="tray-notes">' + p.given.map(v=>noteHTML(v, cur, true)).join('') + '</div><b>' + money(given, cur) + ' / ' + money(p.amount, cur) + '</b></div>' +
        '<div class="cash-wallet"><small>TON PORTE-MONNAIE · ' + money(p.wallet.reduce((a, b)=>a + b, 0), cur) + '</small><div class="wallet-notes">' + p.wallet.map((v, i)=>'<button data-w="' + i + '">' + noteHTML(v, cur) + '</button>').join('') + '</div></div>';
      els.pmStage.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click', ()=>giveNote(+b.dataset.w)));
      const enough = given + 1e-6 >= p.amount;
      els.pmFoot.innerHTML = (enough ? '<button class="pm-ok" id="pmCashOk">Donner ' + money(given, cur) + '</button>' : '<span class="pm-hint">' + (p.wallet.reduce((a, b)=>a + b, 0) + given + 1e-6 < p.amount ? '⚠ Pas assez d\'espèces — paie par carte' : 'Clique sur tes billets pour les donner') + '</span>') + '<button class="pm-cancel" id="pmCancel">Annuler</button>';
      const ok = document.getElementById('pmCashOk'); if(ok) ok.addEventListener('click', cashChange);
      document.getElementById('pmCancel').addEventListener('click', ()=>closePayment(false));
    };
    p.renderCash = render; render();
  }
  function noteHTML(v, cur, small){
    const coin = (cur === '€' && v <= 2) || (cur === 'CHF' && v <= 5) || (cur === '$' && v < 1) || (cur === '¥' && v <= 500);
    return '<span class="' + (coin ? 'coin' : 'note') + ' n' + String(v).replace('.', '_') + (small ? ' sm' : '') + '" data-cur="' + cur + '">' + (coin ? money(v, cur).replace(/[,.]00/, '') : money(v, cur).replace(/[,.]00/, '')) + '</span>';
  }
  function giveNote(i){
    const p = _pay; if(!p || !p.renderCash) return;
    const v = p.wallet.splice(i, 1)[0]; if(v == null) return;
    p.given.push(v);
    tone({ f:620 + Math.random() * 120, dur:0.05, vol:0.03 });
    p.renderCash();
  }
  function cashChange(){
    const p = _pay, cur = p.currency;
    const given = p.given.reduce((a, b)=>a + b, 0);
    const change = Math.round((given - p.amount) * 100) / 100;
    const den = DENOMS[cur] || DENOMS['€'], back = [];
    let left = change; den.forEach(v=>{ while(left + 1e-6 >= v && back.length < 10){ back.push(v); left = Math.round((left - v) * 100) / 100; } });
    if(left > 0.001) back.push(left); // petite monnaie
    p.renderCash = null;
    els.pmStage.innerHTML = '<div class="cash-tray given"><small>ENCAISSÉ</small><div class="tray-notes">' + p.given.map(v=>noteHTML(v, cur, true)).join('') + '</div></div>' +
      '<div class="cash-change"><small>MONNAIE RENDUE</small><div class="change-notes">' + back.map((v, k)=>'<span style="animation-delay:' + (0.15 + k * 0.12) + 's">' + noteHTML(v, cur, true) + '</span>').join('') + '</div><b>' + money(change, cur) + '</b></div>';
    els.pmFoot.innerHTML = '<span class="pm-hint">Merci et bonne route !</span>';
    back.forEach((_, k)=>tone({ f:1800 + k * 60, dur:0.04, vol:0.025, delay:0.15 + k * 0.12 }));
    setTimeout(()=>{ if(_pay === p) closePayment(true); }, 1400 + back.length * 120);
  }
  window.addEventListener('keydown', (e)=>{
    if(!_pay) return;
    e.stopImmediatePropagation(); // pendant un paiement, les autres raccourcis sont ignores
    if(_pay.renderPin && /^[0-9]$/.test(e.key)){ e.preventDefault(); pinKey(e.key); }
    else if(_pay.renderPin && e.key === 'Backspace'){ e.preventDefault(); pinKey('✕'); }
    else if(_pay.renderPin && e.key === 'Enter'){ e.preventDefault(); pinKey('✔'); }
    else if(_pay.method === 'card' && _pay.step === 0 && e.key === 'Enter'){ e.preventDefault(); cardInsert(); }
    else if(e.key === 'Escape' && (_pay.step === 0 || _pay.renderCash)){ e.preventDefault(); closePayment(false); }
  }, true);

  // ======== Peage / amende ========
  function openToll(info){
    _stopKind = info.kind; _stopInfo = info;
    if(info.kind === 'fuel'){ startPump(info); return; }
    renderLaneStrip(null);
    const police = info.kind === 'police', assist = info.kind === 'assist';
    els.tollPanel.dataset.kind = assist ? 'police' : info.kind;
    els.tollLogo.textContent = police ? '🚓' : assist ? '🛻' : (info.road || '🛑');
    els.tollKicker.textContent = info.operator + (police ? ' · Amende' : assist ? ' · Intervention' : ' · Péage');
    els.tollStation.textContent = info.station;
    els.tollTrip.textContent = police ? 'Excès de vitesse : ' + speedTxt(info.kmh, info.unitLabel) + ' au lieu de ' + speedTxt(info.limit, info.unitLabel)
      : assist ? '10 L de carburant (' + money(info.fuelPrice, info.currency) + ') + déplacement (' + money(info.fee, info.currency) + ')'
      : info.from + ' → ' + info.station + ' · ' + info.km + ' km · voie ' + info.lane + ' · ' + (LANE_TXT[info.laneType] || '');
    els.tollFill.classList.add('hidden'); els.tollAfter.classList.add('hidden'); els.tollActions.classList.remove('hidden');
    els.tollPrice.textContent = money(info.price, info.currency); els.tollPrice.dataset.cur = info.currency;
    const cbOnly = !police && !assist && info.laneType === 'cb';
    const canCash = !cbOnly && walletCash() + 1e-6 >= info.price;
    els.btnTollCash.disabled = !canCash;
    els.btnTollCash.querySelector('.tl-sub').textContent = cbOnly ? 'Pas d\'espèces dans cette voie' : 'Porte-monnaie : ' + money(walletCash(), info.currency);
    els.btnTollCard.querySelector('.tl-sub').textContent = (police || assist ? 'Carte + code' : 'Sans contact ou code') + ' · −' + info.cardPoints + ' points';
    els.tollMsg.textContent = cbOnly || canCash ? '' : 'Pas assez d\'espèces : paie par carte.';
    els.ovToll.classList.remove('hidden');
    clickSound(true);
  }
  function payToll(method){
    if(_pay || !_stopInfo) return;
    if(_stopKind === 'fuel'){ payCounter(method); return; }
    const info = _stopInfo, police = info.kind === 'police', assist = info.kind === 'assist';
    if(method === 'cash' && els.btnTollCash.disabled) return;
    els.ovToll.classList.add('hidden');
    openPayment({ method, amount:info.price, currency:info.currency, pin:police || assist, label:police ? info.operator + ' · amende' : assist ? info.operator : info.station,
      merchant:police || assist ? info.operator.toUpperCase() : info.station.toUpperCase(),
      lines:assist ? [['Carburant 10 L', money(info.fuelPrice, info.currency)], ['Déplacement', money(info.fee, info.currency)]] : [[police ? 'Amende' : 'Péage', money(info.price, info.currency)]],
      onDone:(ok)=>{
        if(!ok){ els.ovToll.classList.remove('hidden'); return; }
        const res = engine.payToll(method, 0.2);
        if(!res.ok){ els.ovToll.classList.remove('hidden'); els.tollMsg.textContent = res.error || 'Paiement refusé'; return; }
        chimeSound(1);
        popup(police ? '🚓 Amende payée — roule prudemment !' : assist ? '🛻 10 L dans le réservoir — mets ton clignotant et accélère ▲' : '🛣 Barrière ouverte — accélère ▲, bonne route !', '#4ee39a', true);
      } });
  }

  // ======== Station : pompe -> caisse (panier) -> sortie ========
  // Pompe : on choisit le carburant et la quantite (montant ou plein), puis on
  // MAINTIENT le pistolet (clic maintenu / Espace) : le debit monte, le
  // compteur tourne, et ca s'arrete tout seul (declic) au montant choisi ou
  // reservoir plein. On paie ce qu'on a pompe. Raccrocher -> a pied a la caisse.
  const PUMP_PRESETS = { '€':[10, 20, 40], 'CHF':[20, 50, 80], '$':[10, 20, 40], '¥':[2000, 4000, 6000] };
  let _pump = null;
  function startPump(info){
    _pump = { info, grade:info.grade || 0, mode:{ t:'free' }, custom:info.gal ? 5 : 20, liters:0, holding:false, done:false, full:false, last:0, flowT:0 };
    // on part de zero : on ne paie que ce qu'on pompe (et ce qu'on prend en rayon)
    Object.assign(info, { price:0, qty:0, cardPoints:0, coinsNeed:0 });
    _shopItems = DG.StopKit ? DG.StopKit.shopItems(curRoute()) : []; _basket = []; _fuelPaid = false; _eatList = [];
    if(els.pumpSkip) els.pumpSkip.style.display = 'none';
    if(engine.startFreeWalk()){
      if(els.fpHelp) els.fpHelp.classList.remove('hidden');
      popup('🚶 À pied ! Ouvre la trappe à essence (flanc droit, à l\'arrière), puis décroche le pistolet de la pompe 3 — touche E', '#ffffff', true);
    } else showPumpPanel();
  }
  function showPumpPanel(){
    const p = _pump; if(!p) return;
    els.pumpPanel.classList.remove('hidden');
    if(els.pumpUnitLbl) els.pumpUnitLbl.textContent = p.info.gal ? 'GALLONS' : 'LITRES';
    renderPump(); clickSound(true);
  }
  function pumpTarget(){
    const p = _pump, g = p.info.grades[p.grade], max = p.info.maxLiters, m = p.mode;
    if(m.t === 'U') return Math.min(max, m.v * (p.info.gal ? 3.785 : 1));
    if(m.t === '€') return Math.min(max, m.v / g.ppu * (p.info.gal ? 3.785 : 1));
    return max;
  }
  function renderPump(){
    const p = _pump, info = p.info, cur = info.currency;
    els.pumpHead.innerHTML = '⛽ Pompe ' + info.lane + ' · ' + (info.station || '') + ' <small>réservoir : ' + Math.round(info.fuelPct) + ' % · ' + (info.gal ? (info.maxLiters / 3.785).toFixed(1) + ' gal' : Math.round(info.maxLiters) + ' L') + ' libres</small>';
    els.pumpGrades.innerHTML = info.grades.map((gr, k)=>'<button data-g="' + k + '" class="' + (k === p.grade ? 'on' : '') + '"' + (p.liters > 0 ? ' disabled' : '') + '><b>' + gr.label + '</b><small>' + money(gr.ppu, cur) + '/' + info.unit + '</small></button>').join('');
    const ul = info.gal ? 'gal' : 'L', m = p.mode;
    const bt = (t, v, txt)=>'<button data-t="' + t + '" data-v="' + v + '" class="' + (m.t === t && (v === '' || m.v === +v) ? 'on' : '') + '">' + txt + '</button>';
    els.pumpPresets.innerHTML =
      '<div class="pp-row"><span>Litres</span>' + (info.gal ? [3, 5, 8, 12] : [10, 20, 30, 40]).map(v=>bt('U', v, v + ' ' + ul)).join('') + '</div>' +
      '<div class="pp-row"><span>Montant</span>' + (PUMP_PRESETS[cur] || PUMP_PRESETS['€']).map(v=>bt('€', v, money(v, cur).replace(/[,.]00/, ''))).join('') + '</div>' +
      '<div class="pp-row"><span>Au choix</span><button data-step="-1">−</button><b class="pp-val' + (m.t === 'U' && m.v === p.custom ? ' on' : '') + '">' + p.custom + ' ' + ul + '</b><button data-step="1">+</button>' + bt('free', '', 'LIBRE') + bt('full', '', 'PLEIN') + '</div>';
    els.pumpGrades.querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click', ()=>{ if(p.liters > 0) return; p.grade = +b.dataset.g; clickSound(); renderPump(); }));
    const setMode = (md)=>{ p.mode = md; p.full = md.t !== 'free' && p.liters >= pumpTarget() - 1e-6; clickSound(); renderPump(); };
    els.pumpPresets.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click', ()=>setMode(b.dataset.v === '' ? { t:b.dataset.t } : { t:b.dataset.t, v:+b.dataset.v })));
    els.pumpPresets.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click', (e)=>{
      const maxU = Math.floor(info.maxLiters / (info.gal ? 3.785 : 1));
      p.custom = Math.max(1, Math.min(maxU, p.custom + (+b.dataset.step) * (e.shiftKey ? 5 : 1)));
      setMode({ t:'U', v:p.custom });
    }));
    pumpLcd();
  }
  function pumpLcd(){
    const p = _pump; if(!p) return;
    const info = p.info, g = info.grades[p.grade], q = info.gal ? p.liters / 3.785 : p.liters;
    els.pumpQty.textContent = q.toFixed(2).replace('.', ',');
    els.pumpAmount.textContent = money(q * g.ppu, info.currency);
    els.pumpBar.style.width = Math.min(100, info.fuelPct + p.liters / 55 * 100) + '%';
    engine.setPumpLcd(q.toFixed(2).replace('.', ','), money(q * g.ppu, info.currency), info.gal ? 'GALLONS' : 'LITRES', g.label);
    els.pumpDone.disabled = p.done;
    els.pumpSkip.disabled = p.liters > 0 || p.done;
    els.pumpNozzle.classList.toggle('on', p.holding);
    els.pumpNozzle.classList.toggle('full', p.full);
    els.pumpNozzle.querySelector('b').textContent = p.full ? (p.mode.t === 'U' ? '✔ ' + p.mode.v + (info.gal ? ' gal' : ' L') + ' — déclic' : p.mode.t === '€' ? '✔ MONTANT ATTEINT — déclic' : '✔ RÉSERVOIR PLEIN — déclic') : p.holding ? '⛽ REMPLISSAGE…' : p.liters > 0 ? '⛽ MAINTIENS POUR CONTINUER (ou raccroche)' : '⛽ MAINTIENS LE PISTOLET';
  }
  function pumpHold(on){
    const p = _pump; if(!p || p.done || els.pumpPanel.classList.contains('hidden')) return;
    if(on && engine.paused) return;
    if(on && p.full) return;
    if(on === p.holding) return;
    p.holding = on; p.flowT = 0;
    if(on){ p.last = performance.now(); tone({ f:220, dur:0.08, vol:0.03 }); requestAnimationFrame(pumpStep); }
    pumpLcd();
  }
  function pumpStep(now){
    const p = _pump; if(!p || !p.holding) return;
    if(engine.paused){ p.holding = false; pumpLcd(); return; }
    const dt = Math.min(0.1, Math.max(0, (now - p.last) / 1000)); p.last = now;
    const target = pumpTarget();
    p.flowT += dt;
    const rate = 7.5 * Math.min(1, 0.25 + p.flowT * 0.8); // la gachette s'enfonce : le debit monte
    p.liters = Math.min(target, p.liters + rate * dt);
    p.sndT = (p.sndT || 0) - dt; if(p.sndT <= 0){ p.sndT = 0.1; tone({ f:120 + Math.random() * 25, dur:0.1, vol:0.016, type:'sawtooth' }); }
    if(p.liters >= target - 1e-6){ p.holding = false; p.full = true; tone({ f:1320, dur:0.08, vol:0.05 }); tone({ f:700, dur:0.1, vol:0.04, delay:0.08 }); }
    if(p.liters > 0 && els.pumpGrades.querySelector('button:not([disabled])')) els.pumpGrades.querySelectorAll('button').forEach(b=>b.disabled = true);
    pumpLcd();
    if(p.holding) requestAnimationFrame(pumpStep);
  }
  // raccrocher : on paie ce qu'on a pompe (a la caisse), le pistolet retourne a la pompe
  function pumpFinish(){
    const p = _pump; if(!p || p.done) return;
    p.done = true; p.holding = false;
    const res = engine.setFuelFill(p.grade, p.liters);
    if(res) Object.assign(_stopInfo, { price:res.price, qty:res.qty, fuelLabel:res.fuelLabel, ppl:res.ppl, cardPoints:res.cardPoints, coinsNeed:res.coinsNeed });
    if(res && res.price > 0 && _fuelPaid){ _fuelPaid = false; _basket = []; els.shopCounter.classList.remove('paid'); } // articles deja payes : il reste le carburant
    pumpLcd();
    els.pumpPanel.classList.add('hidden');
    const fp = !!engine._fp;
    engine.fpHangUp(()=>{ if(!fp) openCounter(_stopInfo); });
    popup(p.liters >= 0.05 ? '✔ Pistolet raccroché · referme la trappe, puis va payer ' + money(_stopInfo.price, _stopInfo.currency) + ' à la caisse' : 'Pistolet raccroché sans prendre d\'essence', '#ffcc33', true);
  }
  // Evenements de la marche a pied (moteur -> interface)
  function fpEvent(kind, d){
    if(kind === 'prompt'){
      if(!els.fpPrompt) return;
      els.fpPrompt.classList.toggle('hidden', !d);
      if(d) els.fpPrompt.innerHTML = '<kbd>E</kbd><span>' + d + '</span>';
    }
    else if(kind === 'msg') popup(d, '#ffcc33', true);
    else if(kind === 'pump-ready'){
      if(_pump && _pump.done && _pump.liters < 0.05){ _pump.done = false; _pump.full = false; } // raccroche sans rien prendre : on peut recommencer
      showPumpPanel(); popup('⛽ Choisis ton carburant et la quantité, puis maintiens le pistolet', '#ffcc33');
    }
    else if(kind === 'pump-hang') pumpFinish();
    else if(kind === 'basket'){
      _basket = d.basket;
      const it = _shopItems[d.item];
      if(it) popup((d.added ? '🧺 ' : '↩ ') + it.ico + ' ' + it.label + (d.added ? ' dans le panier' : ' reposé'), '#ffffff');
      clickSound();
      if(!els.ovShop.classList.contains('hidden')){ renderShopItems(); renderBasket(); }
    }
    else if(kind === 'counter') openCounter(_stopInfo);
    else if(kind === 'sit') showEat();
    else if(kind === 'stand') hideEat();
    else if(kind === 'car'){
      const r = engine.fpEnterCar();
      if(!r.ok){ popup('⚠ ' + r.error, '#ff5a3d', true); return; }
      els.ovShop.classList.add('hidden'); hideEat(); els.pumpPanel.classList.add('hidden');
      if(r.stolen){ popup('🚓 Parti sans payer le carburant ! Le pompiste appelle la police : amende ' + money(r.stolen.fine, r.stolen.currency) + ' (−' + r.stolen.pts + ' pts)', '#ff5a3d', true); tone({ f:960, to:720, glide:0.24, dur:0.26, vol:0.04, type:'sawtooth' }); tone({ f:720, to:960, glide:0.24, dur:0.26, vol:0.04, type:'sawtooth', delay:0.28 }); }
      else if(r.flap) popup('Tu refermes la trappe à essence et tu montes', '#ffffff');
    }
    else if(kind === 'left'){
      if(els.fpHelp) els.fpHelp.classList.add('hidden');
      if(els.fpPrompt) els.fpPrompt.classList.add('hidden');
      els.ovShop.classList.add('hidden'); hideEat(); els.pumpPanel.classList.add('hidden');
      _pump = null;
      popup('🚗 Accélère ▲ et rejoins l\'autoroute par la voie d\'insertion ◀', '#4ee39a', true);
    }
  }
  // remet a zero toute l'interface de la station (nouvelle partie, quitter, fin de partie)
  function resetStopUi(){
    if(els.fpHelp) els.fpHelp.classList.add('hidden'); if(els.fpPrompt) els.fpPrompt.classList.add('hidden'); hideEat();
    if(els.pumpPanel) els.pumpPanel.classList.add('hidden'); if(els.ovShop) els.ovShop.classList.add('hidden');
    if(els.payModal){ els.payModal.classList.add('hidden'); _pay = null; }
    if(els.ovToll) els.ovToll.classList.add('hidden');
    _pump = null; document.body.classList.remove('dg-paused');
  }
  function stopPanelOpen(){ return [els.ovShop, els.eatPanel, els.pumpPanel, els.payModal].some(el=>el && !el.classList.contains('hidden')); }
  // Bar : on mange / boit ce qu'on a achete (petite animation de bouchees)
  let _eatList = [];
  function showEat(){ if(!els.eatPanel) return; els.eatPanel.classList.remove('hidden'); renderEat(); }
  function hideEat(){ if(els.eatPanel) els.eatPanel.classList.add('hidden'); }
  function renderEat(){
    const left = _eatList.filter(it=>!it.eaten);
    els.eatList.innerHTML = left.length ? left.map(it=>'<button class="eat-item" data-e="' + _eatList.indexOf(it) + '"><span class="ei-ico">' + it.ico + '</span><span>' + (it.effect === 'drink' || it.effect === 'coffee' ? 'Boire' : 'Manger') + ' : ' + it.label + '</span></button>').join('')
      : '<div class="shop-empty">' + (_eatList.length ? '😋 Tout est fini ! Retourne à la voiture quand tu veux.' : 'Rien à manger : prends des articles en rayon (E) et paie-les à la caisse.') + '</div>';
    els.eatList.querySelectorAll('[data-e]').forEach(b=>b.addEventListener('click', ()=>eatItem(+b.dataset.e)));
  }
  function eatItem(i){
    const it = _eatList[i]; if(!it || it.eaten || it.eating) return;
    it.eating = true;
    const drink = it.effect === 'drink' || it.effect === 'coffee';
    const big = document.createElement('div'); big.className = 'eat-anim' + (drink ? ' drink' : ''); big.textContent = it.ico; els.eatPanel.appendChild(big);
    [0, 0.45, 0.9].forEach((dl, k)=>tone(drink ? { f:320 + k * 30, to:210, glide:0.2, dur:0.24, vol:0.03, delay:dl } : { f:170 + k * 25, dur:0.07, vol:0.05, type:'square', delay:dl }));
    setTimeout(()=>{ big.remove(); it.eaten = true; it.eating = false; engine.fpEat(); popup((drink ? '🥤 Glou glou ! ' : '😋 Miam ! ') + it.label + ' (+30)', '#4ee39a'); renderEat(); }, 1400);
  }
  function pumpSkip(){
    const p = _pump; if(!p || p.done || p.liters > 0) return;
    if(engine.cancelFuel(()=>popup('🚗 Tu repars sans prendre d\'essence — accélère ▲', '#ffcc33'))){ els.pumpPanel.classList.add('hidden'); _pump = null; }
  }
  // Bandeau des voies du peage (type de chaque voie, la notre en surbrillance)
  const LANE_ICO = { cash:['💶', 'ESPÈCES + CB'], cb:['💳', 'CB UNIQUEMENT'], t:['Ⓣ', 'TÉLÉPÉAGE'] };
  function renderLaneStrip(t){
    const el = els.laneStrip; if(!el) return;
    if(!t){ el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = '<div class="ls-head">🛑 PÉAGE à ' + Math.round(t.dist) + ' m · ' + (t.locked ? 'voie choisie 🔒' : 'choisis ta voie ◀ ▶') + (t.queue ? ' · <b>voiture à la cabine : attends ton tour</b>' : '') + '</div>' +
      '<div class="ls-lanes">' + t.types.map((ty, k)=>'<span class="ls-l ' + ty + (k === t.lane ? ' me' : '') + '"><i>' + LANE_ICO[ty][0] + '</i><small>' + LANE_ICO[ty][1] + '</small>' + (k === t.lane ? '<em>▲ toi</em>' : '') + '</span>').join('') + '</div>';
  }
  // Bruits a pied : pas, portiere, portes automatiques (+ carillon de la boutique)
  function walkSound(kind){
    if(kind === 'nozzle') tone({ f:700, dur:0.05, vol:0.03 });
    else if(kind === 'clunk'){ tone({ f:160, dur:0.08, vol:0.05, type:'square' }); tone({ f:900, dur:0.04, vol:0.03, delay:0.05 }); }
    else if(kind === 'hang') tone({ f:220, dur:0.1, vol:0.05, type:'square' });
    else if(kind === 'step') tone({ f:85 + Math.random() * 35, dur:0.05, vol:0.028, type:'triangle' });
    else if(kind === 'cardoor'){ tone({ f:90, dur:0.08, vol:0.06, type:'square' }); tone({ f:60, dur:0.12, vol:0.05, type:'square', delay:0.06 }); }
    else if(kind === 'door'){ tone({ f:260, to:420, glide:0.45, dur:0.5, vol:0.018 }); tone({ f:1319, dur:0.35, vol:0.03, delay:0.25 }); tone({ f:988, dur:0.5, vol:0.03, delay:0.55 }); }
  }
  const EFFECT_TXT = { coffee:'Nitro plein + gains ×1,5 (10 s)', drink:'Nitro +50 %', food:'Aimant à pièces (8 s)' };
  let _shopItems = [], _fuelPaid = false, _basket = [];
  function openCounter(info){
    const route = curRoute();
    if(!_shopItems.length) _shopItems = DG.StopKit ? DG.StopKit.shopItems(route) : [];
    els.shopTitle.textContent = route.fuelStationName || 'Boutique';
    els.shopCounter.classList.toggle('paid', _fuelPaid);
    els.btnShopLeave.disabled = false;
    renderShopItems(); renderBasket();
    els.shopMsg.textContent = _fuelPaid ? '🧾 Payé ! Assieds-toi au bar (tabourets près de la vitrine) pour manger, ou retourne à la voiture.'
      : basketTotal() > 0 ? 'Le caissier scanne tes articles : paie par carte ou en espèces.' : 'Rien à payer pour l\'instant : fais le plein ou prends des articles en rayon (E).';
    els.ovShop.classList.remove('hidden');
    clickSound(true);
  }
  function renderShopItems(){
    const cur = curRoute().currency || '€';
    if(!_basket.length){ els.shopList.innerHTML = '<div class="shop-empty">🧺 Panier vide — les articles sont en rayon : approche-toi et appuie sur <kbd>E</kbd>.</div>'; return; }
    els.shopList.innerHTML = _basket.map(i=>{ const it = _shopItems[i]; return '<div class="shop-item in"><span class="si-ico">' + it.ico + '</span><span class="si-body"><span class="si-name">' + it.label + '</span><span class="si-eff">' + EFFECT_TXT[it.effect] + '</span></span><span class="si-price">' + money(it.price, cur) + '</span><span class="si-add">✓</span></div>'; }).join('');
  }
  function toggleItem(){}
  function basketTotal(){ return (_stopInfo ? _stopInfo.price : 0) + _basket.reduce((a, i)=>a + _shopItems[i].price, 0); }
  function renderBasket(){
    const info = _stopInfo, cur = info.currency;
    els.shopFuelLine.innerHTML = (info.qty > 0 ? '<span>⛽ Pompe ' + info.lane + ' · ' + String(info.qty).replace('.', ',') + ' ' + info.unit + ' ' + info.fuelLabel + '</span><b>' + money(info.price, cur) + '</b>' : '<span class="bl">⛽ Pas de carburant</span><b class="bl">—</b>') +
      _basket.map(i=>'<span class="bl">' + _shopItems[i].ico + ' ' + _shopItems[i].label + '</span><b class="bl">' + money(_shopItems[i].price, cur) + '</b>').join('') +
      '<span class="tot">TOTAL</span><b class="tot">' + money(basketTotal(), cur) + '</b>';
    const needCoins = (info.coinsNeed || 0) + _basket.reduce((a, i)=>a + engine.shopCost(_shopItems[i]).coins, 0);
    const canCash = Math.floor(engine._coinCredits / 10) >= needCoins, nothing = basketTotal() <= 0 || _fuelPaid;
    els.btnCounterCash.disabled = !canCash || nothing; els.btnCounterCard.disabled = nothing;
    els.btnCounterCash.querySelector('.tl-sub').textContent = 'Porte-monnaie : ' + money(walletCash(), cur);
    const pts = (info.cardPoints || 0) + _basket.reduce((a, i)=>a + engine.shopCost(_shopItems[i]).card, 0);
    els.btnCounterCard.querySelector('.tl-sub').textContent = 'Carte + code · −' + pts + ' pts';
    els.shopWallet.textContent = '👛 ' + money(walletCash(), cur) + ' en liquide · score ' + engine.currentScore().toLocaleString('fr-FR');
  }
  function payCounter(method){
    if(_fuelPaid || _pay || basketTotal() <= 0) return;
    if(method === 'cash' && els.btnCounterCash.disabled){ els.shopMsg.textContent = 'Pas assez d\'espèces : paie par carte.'; return; }
    const info = _stopInfo, cur = info.currency, route = curRoute();
    els.ovShop.classList.add('hidden');
    openPayment({ method, amount:basketTotal(), currency:cur, pin:false, label:'Caisse · ' + (route.fuelStationName || 'Station'), merchant:(route.fuelStationName || 'STATION').toUpperCase(),
      lines:(info.qty > 0 ? [[String(info.qty).replace('.', ',') + ' ' + info.unit + ' ' + info.fuelLabel, money(info.price, cur)]] : []).concat(_basket.map(i=>[_shopItems[i].label, money(_shopItems[i].price, cur)])),
      onDone:(ok)=>{
        els.ovShop.classList.remove('hidden');
        if(!ok) return;
        const res = engine.payToll(method, 'hold');
        if(!res.ok){ els.shopMsg.textContent = res.error || 'Paiement refusé'; return; }
        const got = [], failed = [];
        _basket.forEach(i=>{ const r = engine.buyItem(_shopItems[i], method); if(r.ok){ got.push(i); popup(_shopItems[i].ico + ' ' + EFFECT_TXT[_shopItems[i].effect], '#ffcc33'); } else failed.push(_shopItems[i].label + (r.error ? ' (' + r.error + ')' : '')); });
        _fuelPaid = true;
        _eatList = _eatList.concat(got.map(i=>Object.assign({}, _shopItems[i])));
        if(failed.length) popup('⚠ Non acheté : ' + failed.join(', '), '#ff9a3d', true);
        els.shopCounter.classList.add('paid');
        els.btnShopLeave.disabled = false;
        els.shopMsg.textContent = _eatList.length ? '🧾 Merci ! Va t\'asseoir au bar près de la vitrine pour manger (E sur un tabouret).' : '🧾 Merci ! Tu peux retourner à la voiture.';
        chimeSound(1); renderShopItems(); renderBasket();
      } });
  }
  function leaveShop(){ els.ovShop.classList.add('hidden'); }
  function openShop(){ if(_stopInfo) openCounter(_stopInfo); }
  function buyShop(){} // (les articles se prennent en rayon)
  function refreshWallet(){ if(_stopInfo) renderBasket(); }

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
    if(alerts.rescue){ html = '<span class="ac-ico">🚨</span><span><b>PANNE SÈCHE</b> · dépanneuse dans ' + Math.ceil(alerts.rescue.eta) + ' s<br><small>feux de détresse · reste sur la bande d\'arrêt d\'urgence</small></span>'; cls = 'station low'; }
    else if(alerts.police){ html = '<span class="ac-ico">🚓</span><span><b>POLICE</b> à ' + Math.round(alerts.police.gap) + ' m<br><small>nitro pour la semer !</small></span>'; cls = 'police'; }
    else if(alerts.accident){ const a = alerts.accident; html = '<span class="ac-ico">🚧</span><span><b>ACCIDENT</b> à ' + Math.round(a.dist) + ' m · voie ' + a.lane + ' fermée<br><small>' + (a.same ? '⚠ TU ES DANS LA VOIE FERMÉE → change ' + (a.side > 0 ? '▶' : '◀') : 'ralentis · gyrophares') + '</small></span>'; cls = 'police'; }
    else if(alerts.radar){
      const r = alerts.radar, over = r.kmh > r.limit + 5, us = r.unitLabel === 'mph';
      const lim = us ? Math.round(r.limit / 1.609) : r.limit, cur = us ? Math.round(r.kmh / 1.609) : r.kmh;
      html = '<span class="rw-sign' + (us ? ' us' : '') + '">' + (us ? '<small>SPEED<br>LIMIT</small>' : '') + lim + '</span>' +
        '<span class="rw-speed' + (over ? ' over' : '') + '">' + cur + '<small>' + (us ? 'mph' : 'km/h') + '</small></span>' +
        '<span class="rw-info"><b>' + (r.mobile ? '⚠ CONTRÔLE MOBILE' : '📸 RADAR') + '</b><small>' + Math.round(r.dist) + ' m' + (over ? ' · freine ↓' : ' · OK ✓') + '</small></span>';
      cls = 'radar' + (over ? ' over' : '');
    }
    else if(alerts.station){
      const s = alerts.station; let t, sub;
      if(s.phase === 'open' || s.dist < -40){ t = '↖ <b>VOIE D\'INSERTION</b>'; sub = 'regarde le trafic et rejoins l\'autoroute ◀'; }
      else if(s.phase === 'offer'){
        if(s.dist > 232){ t = '<b>STATION</b> · sortie dans ' + Math.round(s.dist - 232) + ' m'; sub = 'mets-toi dans la voie de droite'; }
        else if(s.dist > 0){ t = '↘ <b>SORTIE</b> — prends-la ▶'; sub = 'voie de sortie à droite · 30 km/h sur l\'aire'; }
        else { t = '<b>STATION</b> dépassée'; sub = ''; }
      }
      else if(s.dist > 3){ t = '🅿 Pompe dans <b>' + Math.round(s.dist) + ' m</b>'; sub = (s.kmh > 30 ? '<span style="color:#ff7a6a">⚠ ' + s.kmh + ' km/h — 30 max, police !</span>' : s.kmh + ' km/h · 30 max') + ' · freine ▼ dans le cadre jaune'; }
      else if(s.dist > -1.5){ t = '🅿 <b>DANS LE CADRE</b>'; sub = Math.abs(s.kmh) > 1 ? 'freine ▼ et arrête-toi' : 'parfait…'; }
      else { t = '↩ Pompe dépassée de <b>' + (-s.dist).toFixed(1) + ' m</b>'; sub = 'à l\'arrêt, maintiens ▼ pour reculer'; }
      html = '<span class="ac-ico">⛽</span><span>' + t + '<br><small>' + sub + '</small></span>'; cls = 'station' + (s.fuel < 0.35 ? ' low' : '');
    }
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
    if(els.payModal){ els.payModal.classList.add('hidden'); _pay = null; }
    if(els.pumpPanel) els.pumpPanel.classList.add('hidden');
    if(els.radarTicket) els.radarTicket.classList.remove('show');
    if(els.ovShop) els.ovShop.classList.add('hidden');
    alerts.police = alerts.radar = alerts.station = alerts.accident = alerts.rescue = null; renderAlert(); renderLaneStrip(null); _pump = null;
    if(els.fpHelp) els.fpHelp.classList.add('hidden'); if(els.fpPrompt) els.fpPrompt.classList.add('hidden'); hideEat();
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
    resetStopUi();
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
    // volant : maintenir ◀ / ▶ (clavier ou boutons) ; un petit coup = une petite correction
    const steerKeys = { l:false, r:false, bl:false, br:false };
    const applySteer = ()=>engine.setSteer(((steerKeys.r || steerKeys.br) ? 1 : 0) - ((steerKeys.l || steerKeys.bl) ? 1 : 0));
    const holdBtn = (el, fn)=>{ el.addEventListener('pointerdown', (e)=>{ e.preventDefault(); fn(true); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t=>el.addEventListener(t, ()=>fn(false))); };
    holdBtn(els.btnLeft, (v)=>{ steerKeys.bl = v; applySteer(); });
    holdBtn(els.btnRight, (v)=>{ steerKeys.br = v; applySteer(); });
    els.btnBoost.addEventListener('pointerdown', ()=>engine.setBoostHeld(true));
    els.btnBoost.addEventListener('pointerup', ()=>engine.setBoostHeld(false));
    els.btnBoost.addEventListener('pointerleave', ()=>engine.setBoostHeld(false));
    els.btnCam.addEventListener('click', ()=>engine.cycleCam());
    els.btnPause.addEventListener('click', ()=>engine.pause());
    els.btnResume.addEventListener('click', ()=>engine.resume());
    els.btnRestartFromPause.addEventListener('click', ()=>{ show(null); els.hudTop.style.display='flex'; els.hudBottom.style.display='flex'; startRun(); });
    els.btnQuitFromPause.addEventListener('click', ()=>{ engine.quit(); resetStopUi(); goToChoosing(); });

    window.addEventListener('keydown', (e)=>{
      const k = e.key;
      if(k==='ArrowLeft'||k==='a'||k==='A'||k==='q'||k==='Q'){ steerKeys.l = true; applySteer(); if(engine.playing) e.preventDefault(); }
      if(k==='ArrowRight'||k==='d'||k==='D'){ steerKeys.r = true; applySteer(); if(engine.playing) e.preventDefault(); }
      if(k==='ArrowDown'||k==='s'||k==='S'){ engine.setBrake(true); if(engine.playing) e.preventDefault(); }
      if(k===' '||k==='Shift'){ engine.setBoostHeld(true); if(engine.playing) e.preventDefault(); }
      if(k==='ArrowUp'||k==='w'||k==='W'||k==='z'||k==='Z'){ engine.setThrottle(true); if(engine.playing) e.preventDefault(); }
      if(k==='c'||k==='C'){ engine.cycleCam(); }
      if((k==='p'||k==='P') && engine.playing){ engine.paused ? engine.resume() : engine.pause(); }
      if(k==='Escape' && engine.playing && !engine.paused && !stopPanelOpen()){ engine.pause(); } // Echap ferme d'abord les panneaux de la station
    });
    window.addEventListener('keyup', (e)=>{
      const k = e.key;
      if(k===' '||k==='Shift'){ engine.setBoostHeld(false); }
      if(k==='ArrowLeft'||k==='a'||k==='A'||k==='q'||k==='Q'){ steerKeys.l = false; applySteer(); }
      if(k==='ArrowRight'||k==='d'||k==='D'){ steerKeys.r = false; applySteer(); }
      if(k==='ArrowUp'||k==='w'||k==='W'||k==='z'||k==='Z'){ engine.setThrottle(false); }
      if(k==='ArrowDown'||k==='s'||k==='S'){ engine.setBrake(false); }
    });
    // fenetre qui perd le focus : on relache tout (sinon la voiture braque seule)
    window.addEventListener('blur', ()=>{ engine.setBrake(false); engine.setBoostHeld(false); engine.setThrottle(false); pumpHold(false); steerKeys.l = steerKeys.r = steerKeys.bl = steerKeys.br = false; applySteer(); });
    if(els.fpPrompt) els.fpPrompt.addEventListener('pointerdown', (e)=>{ e.preventDefault(); if(!engine.paused) engine.fpInteract(); });
    if(els.btnEatStand) els.btnEatStand.addEventListener('click', ()=>engine._fpStand());
    // pedales (ecran tactile / souris) : maintenir
    const pedal = (el, fn)=>{ if(!el) return; el.addEventListener('pointerdown', (e)=>{ e.preventDefault(); fn(true); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t=>el.addEventListener(t, ()=>fn(false))); };
    pedal(document.getElementById('btnGas'), (v)=>engine.setThrottle(v));
    pedal(document.getElementById('btnBrakeP'), (v)=>engine.setBrake(v));
    // pompe : pistolet maintenu (souris / Espace), raccrocher, repartir sans essence
    pedal(els.pumpNozzle, pumpHold);
    els.pumpDone.addEventListener('click', pumpFinish);
    els.pumpSkip.addEventListener('click', pumpSkip);
    window.addEventListener('keydown', (e)=>{
      if(!_pump || _pump.done || els.pumpPanel.classList.contains('hidden')) return;
      if(e.key === ' '){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) pumpHold(true); }
      else if(e.key === 'Enter'){ e.preventDefault(); e.stopImmediatePropagation(); pumpFinish(); }
    }, true);
    window.addEventListener('keyup', (e)=>{ if(_pump && e.key === ' ') pumpHold(false); }, true); // (sans bloquer : le boost/la course se relache aussi)

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
    window.addEventListener('keydown', (e)=>{
      if(e.key !== 'e' && e.key !== 'E') return;
      if(engine._fp){ e.preventDefault(); if(!e.repeat && !engine.paused) engine.fpInteract(); return; }
      if(engine.playing){ if(engine.requestFuelStop()) clickSound(); }
    });
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
