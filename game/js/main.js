(function(){
  const $ = (id)=>document.getElementById(id);
  const els = {
    ovLoading:$('ovLoading'), ovNaming:$('ovNaming'), ovChoosing:$('ovChoosing'), ovPaused:$('ovPaused'), ovOver:$('ovOver'), ovBoard:$('ovBoard'),
    hudTop:$('hudTop'), hudBottom:$('hudBottom'), multBadge:$('multBadge'), multTime:$('multTime'), popups:$('popups'),
    hudTime:$('hudTime'), hudScore:$('hudScore'), hudSpeed:$('hudSpeed'), hudSpeedCell:$('hudSpeedCell'), camLabel:$('camLabel'), boostFill:$('boostFill'),
    nameInput:$('nameInput'), btnNameOk:$('btnNameOk'),
    pilotName:$('pilotName'), pilotMoney:$('pilotMoney'), routeTabs:$('routeTabs'), carGrid:$('carGrid'), btnStart:$('btnStart'), btnBoardOpen:$('btnBoardOpen'),
    btnResume:$('btnResume'), btnRestartFromPause:$('btnRestartFromPause'), btnQuitFromPause:$('btnQuitFromPause'),
    overScore:$('overScore'), overTime:$('overTime'), overCredits:$('overCredits'), overBoard:$('overBoard'), ovRecordBadge:$('ovRecordBadge'),
    btnRetry:$('btnRetry'), btnChangeCar:$('btnChangeCar'), btnWatchAd:$('btnWatchAd'),
    fullBoard:$('fullBoard'), btnBoardClose:$('btnBoardClose'),
    dailyCard:$('dailyCard'), dailyDesc:$('dailyDesc'), dailyCta:$('dailyCta'),
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
    if(DG.Auth.isLoggedIn()) return DG.Auth.displayName();
    try { return (localStorage.getItem('apex_user')||'').slice(0,16); } catch(e){ return ''; }
  }
  function saveGuestUsername(v){ try { localStorage.setItem('apex_user', v); } catch(e){} }

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

  async function goToChoosing(){
    show('ovChoosing');
    state.screen = 'choosing';
    renderRouteTabs();
    renderCarGrid();
    refreshPilotBar();
    refreshPersonalBest();
    renderDailyCard();
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

    state.username = loadUsername();
    if(state.username) goToChoosing(); else show('ovNaming');

    wireControls();
    wireMusic();
  }

  els.btnNameOk.addEventListener('click', ()=>{
    let v = (els.nameInput.value||'').trim().slice(0,16) || 'Pilote';
    saveGuestUsername(v);
    state.username = v;
    goToChoosing();
  });
  els.nameInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') els.btnNameOk.click(); });

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
