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
    drawCard:$('drawCard'), drawDesc:$('drawDesc'), drawCta:$('drawCta'),
    ovWheel:$('ovWheel'), wheelEl:$('wheelEl'), wheelResult:$('wheelResult'), btnSpinWheel:$('btnSpinWheel'), btnCloseWheel:$('btnCloseWheel'),
    overDailyCard:$('overDailyCard'), overDailyDesc:$('overDailyDesc'), btnClaimDaily:$('btnClaimDaily'),
    btnLeft:$('btnLeft'), btnRight:$('btnRight'), btnBoost:$('btnBoost'), btnCam:$('btnCam'), btnPause:$('btnPause'), btnFullscreen:$('btnFullscreen'), btnMusic:$('btnMusic'), bgAudio:$('bgAudio'),
    musicPanel:$('musicPanel'), musicTrackName:$('musicTrackName'), btnMusicPrev:$('btnMusicPrev'), btnMusicToggle:$('btnMusicToggle'), btnMusicNext:$('btnMusicNext'), musicVolume:$('musicVolume'), musicList:$('musicList'),
    musicSeek:$('musicSeek'), musicTimeCur:$('musicTimeCur'), musicTimeDur:$('musicTimeDur'),
    hudRecordChase:$('hudRecordChase'), recordFlash:$('recordFlash'), pilotBest:$('pilotBest'),
  };

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

  function popup(text, cls){
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = text;
    if(cls) el.style.color = cls;
    el.style.left = (44 + Math.random()*12) + '%';
    el.style.top = '58%';
    els.popups.appendChild(el);
    setTimeout(()=>el.remove(), 1000);
  }

  function loadUsername(){
    return DG.Auth.isLoggedIn() ? DG.Auth.displayName() : '';
  }

  function tierColor(tier){ return (DG.TIERS[tier] && DG.TIERS[tier].color) || '#9fb4c7'; }

  function renderRouteTabs(){
    els.routeTabs.innerHTML = DG.ROUTES.map(r=>
      '<button class="tab' + (r.id===state.selectedRoute?' active':'') + '" data-route="' + r.id + '">' + r.name + ' <span style="opacity:.6">· ' + r.difficulty + '</span></button>'
    ).join('');
    els.routeTabs.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click', ()=>{ state.selectedRoute = b.getAttribute('data-route'); renderRouteTabs(); }));
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
    els.carGrid.querySelectorAll('[data-car]:not([disabled])').forEach(b=>b.addEventListener('click', ()=>{ state.selectedCar = b.getAttribute('data-car'); renderCarGrid(); els.btnStart.disabled = false; updateDailyCta(); }));
    els.btnStart.disabled = unlocked.indexOf(state.selectedCar) === -1;
  }
  function hexAlpha(hex, a){
    const n = parseInt(hex.replace('#',''),16);
    return 'rgba(' + [(n>>16)&255,(n>>8)&255,n&255].join(',') + ',' + a + ')';
  }

  function refreshPilotBar(){
    els.pilotName.textContent = state.username || 'Pilote';
    els.pilotMoney.textContent = '🪙 ' + DG.Economy.money.toLocaleString('fr-FR');
  }

  function updateDailyCta(){
    if(!els.dailyCard) return;
    const dc = DG.dailyChallenge();
    const car = DG.carById(dc.carId);
    const claimed = !!state.dailyClaimedToday;
    const unlocked = DG.Economy.unlocked.indexOf(dc.carId) !== -1;
    const selected = state.selectedCar === dc.carId;
    els.dailyDesc.textContent = 'Score ≥ ' + dc.target.toLocaleString('fr-FR') + ' avec la ' + car.name + (claimed ? ' — déjà réclamé aujourd\'hui ✓' : '');
    els.dailyCard.classList.toggle('done', claimed);
    els.dailyCard.classList.toggle('locked', !claimed && !unlocked);
    els.dailyCard.classList.toggle('selected', !claimed && unlocked && selected);
    if(claimed) els.dailyCta.textContent = '✓ Fait';
    else if(!unlocked) els.dailyCta.textContent = '🔒 Débloquer';
    else if(selected) els.dailyCta.textContent = '✓ Choisi';
    else els.dailyCta.textContent = '🎯 Défi · +' + dc.reward;
  }

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
    updateDailyCta();
  }

  // Tirage du jour : contrairement au defi (qui demande d'atteindre un score),
  // c'est une action immediate au clic — des credits raisonnables la plupart du
  // temps, et une chance infime (1%) de gagner une voiture rare directement.
  function updateDrawCta(claimed){
    if(!els.drawCard) return;
    els.drawCard.classList.toggle('done', claimed);
    if(!DG.Auth.isLoggedIn()){
      els.drawCta.textContent = '🔒 Connecte-toi';
      els.drawDesc.textContent = 'Connecte-toi pour tenter le tirage du jour.';
      return;
    }
    els.drawCta.textContent = claimed ? '✓ Fait' : '🎰 Tenter';
    els.drawDesc.textContent = claimed
      ? 'Déjà tenté aujourd\'hui — reviens demain ✓'
      : 'Crédits garantis, et une chance infime de gagner une voiture rare.';
  }

  async function renderDrawCard(){
    if(!els.drawCard) return;
    const claimed = await DG.Economy.hasClaimedDailyDraw();
    updateDrawCta(claimed);
  }

  // Segments de la roue, dans l'ordre visuel (secteurs EGAUX a l'ecran — la
  // vraie probabilite est deja imposee par claim_daily_draw() cote serveur ;
  // la roue met juste en scene le resultat deja tire). L'angle est le centre
  // du secteur, mesure depuis le haut (sens horaire), pour matcher --a en CSS.
  const WHEEL_SEGMENTS = [
    { credits:120,  angle:36  },
    { credits:300,  angle:108 },
    { credits:700,  angle:180 },
    { credits:1500, angle:252 },
    { jackpot:true, angle:324 },
  ];
  let _wheelSpins = 0;

  function openWheel(){
    if(!DG.Auth.isLoggedIn()){ popup('Connecte-toi pour tenter le tirage du jour', '#ff9090'); return; }
    if(els.drawCard.classList.contains('done')){ popup('Tirage déjà tenté aujourd\'hui ✓', '#b48cff'); return; }
    els.wheelResult.textContent = '';
    els.btnSpinWheel.disabled = false;
    els.btnSpinWheel.textContent = '🎰 Lancer la roue';
    els.wheelEl.style.transition = 'none';
    els.wheelEl.style.transform = 'rotate(0deg)';
    void els.wheelEl.offsetWidth;
    els.wheelEl.style.transition = '';
    els.ovWheel.classList.remove('hidden');
  }

  function closeWheel(){
    els.ovWheel.classList.add('hidden');
  }

  async function spinWheel(){
    els.btnSpinWheel.disabled = true;
    els.btnSpinWheel.textContent = '…';
    const res = await DG.Economy.claimDailyDraw();
    if(!res.ok){
      popup(res.error, '#ff9090');
      els.wheelResult.textContent = '⚠ ' + res.error;
      els.btnSpinWheel.disabled = false;
      els.btnSpinWheel.textContent = '🎰 Lancer la roue';
      return;
    }
    // Retrouve le secteur correspondant au resultat deja tire cote serveur :
    // voiture (ou le repli 5000 credits quand tout est deja debloque) -> jackpot,
    // sinon le secteur credits le plus proche.
    let seg;
    if(res.carId || res.credits === 5000) seg = WHEEL_SEGMENTS.find(s=>s.jackpot);
    else seg = WHEEL_SEGMENTS.reduce((best,s)=> (s.credits!=null && Math.abs(s.credits-res.credits) < Math.abs((best.credits||0)-res.credits)) ? s : best, WHEEL_SEGMENTS[0]);

    _wheelSpins++;
    const fullTurns = 5 + (_wheelSpins % 3);
    const targetRotation = fullTurns*360 + (360 - seg.angle);
    els.wheelEl.style.transform = 'rotate(' + targetRotation + 'deg)';

    setTimeout(()=>{
      updateDrawCta(true);
      refreshPilotBar();
      if(res.carId){
        els.drawCard.classList.add('jackpot');
        els.wheelResult.textContent = '🏆 Voiture rare gagnée : ' + (DG.carById(res.carId) || {}).name + ' !';
        popup('🏆 Voiture rare gagnée !', '#b48cff');
      } else {
        els.wheelResult.textContent = '🎉 +' + res.credits + ' crédits !';
        popup('🎰 +' + res.credits + ' crédits !', '#b48cff');
      }
      els.btnSpinWheel.textContent = '✓ Fait';
    }, 3700);
  }

  async function goToChoosing(){
    show('ovChoosing');
    state.screen = 'choosing';
    renderRouteTabs();
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
        els.hudTime.textContent = d.time.toFixed(1) + 's';
        els.hudScore.textContent = d.score;
        els.hudSpeed.innerHTML = d.speed + '<span style="font-size:10px;color:#8a8f98"> km/h</span>';
        els.boostFill.style.width = d.boostPct + '%';
        if(d.multiplierActive){ els.multBadge.classList.add('show'); els.multTime.textContent = Math.ceil(d.multiplierT); }
        else els.multBadge.classList.remove('show');
        if(els.hudRecordChase){
          if(d.personalBest > 0 && d.recordBroken){ els.hudRecordChase.textContent = '★ RECORD'; els.hudRecordChase.classList.add('broken'); }
          else if(d.personalBest > 0){ els.hudRecordChase.textContent = '🎯 -' + d.scoreToRecord; els.hudRecordChase.classList.remove('broken'); }
          else { els.hudRecordChase.textContent = ''; els.hudRecordChase.classList.remove('broken'); }
        }
      },
      onCamLabel(label){ els.camLabel.textContent = label; },
      onPauseChange(paused){ show(paused ? 'ovPaused' : null); if(!paused){ els.hudTop.style.display='flex'; els.hudBottom.style.display='flex'; } },
      onPickup(kind, payload){
        if(kind==='coin') popup('+10 🪙', '#ffcc00');
        else if(kind==='near-miss'){
          const streak = (payload && payload.streak) || 1;
          if(streak >= 3) popup('FRÔLÉ x' + streak + ' 🔥', '#ff5a3d');
          else popup('FRÔLÉ ! +30', '#ff9090');
        }
        else if(kind==='nitro') popup('NITRO !', '#3df0ff');
        else if(kind==='multiplier') popup('×2 GAINS !', '#ff5ad1');
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

    // Compte obligatoire pour jouer (pas de mode invite) : les scores/parties
    // doivent tous etre rattaches a un vrai compte, notamment pour que la
    // moderation (recherche, bannissement IP) ait un pseudo/compte fiable en face.
    state.username = loadUsername();
    if(DG.Auth.isLoggedIn() && state.username) goToChoosing(); else show('ovNaming');

    wireControls();
    wireMusic();
  }


  function startRun(){
    const car = DG.carById(state.selectedCar);
    els.hudTop.style.display = 'flex'; els.hudBottom.style.display = 'flex';
    show(null);
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
    const isRecord = result.score > state.personalBest;
    if(isRecord){
      state.personalBest = result.score;
      if(!DG.Auth.isLoggedIn()){ try { localStorage.setItem('apex_best', String(result.score)); } catch(e){} }
      if(els.pilotBest) els.pilotBest.textContent = '🏆 ' + state.personalBest.toLocaleString('fr-FR');
    }
    els.ovRecordBadge.style.display = isRecord ? 'inline-block' : 'none';
    els.overScore.textContent = result.score;
    els.overTime.textContent = result.time.toFixed(1) + 's';
    els.overCredits.textContent = '+…';
    show('ovOver');
    flashOverScreen(result.carId);
    startOverCarSpin(result.carId);
    const credits = await DG.Economy.recordRun({ name: state.username, score: result.score, carId: result.carId, timeSeconds: result.time, routeId: result.routeId });
    els.overCredits.textContent = '+' + credits;
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
        els.overDailyDesc.textContent = '+' + res.credits + ' crédits ajoutés !';
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
    else { alert(res.error); }
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
      if(k==='ArrowLeft'||k==='a'||k==='A'){ engine.move(-1); }
      if(k==='ArrowRight'||k==='d'||k==='D'){ engine.move(1); }
      if(k===' '||k==='Shift'||k==='ArrowUp'||k==='w'||k==='W'){ engine.setBoostHeld(true); if(engine.playing) e.preventDefault(); }
      if(k==='c'||k==='C'){ engine.cycleCam(); }
      if((k==='p'||k==='P') && engine.playing){ engine.paused ? engine.resume() : engine.pause(); }
      if(k==='Escape' && engine.playing && !engine.paused){ engine.pause(); }
    });
    window.addEventListener('keyup', (e)=>{
      const k = e.key;
      if(k===' '||k==='Shift'||k==='ArrowUp'||k==='w'||k==='W'){ engine.setBoostHeld(false); }
    });

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
