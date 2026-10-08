// Mode "vie reelle" (RP) branche sur le moteur : alcoolemie, cigarette,
// controles routiers (on se range, on parle au gendarme, ethylotest) et, en
// mode libre, accrochages qui ne terminent pas la partie (constat amiable).
// Le dialogue lui-meme est affiche par l'interface (main.js, cb.onRp).
(function(){
  window.DG = window.DG || {};
  const E = DG.GameEngine && DG.GameEngine.prototype;
  if(!E) return;

  // ---------- Etat ----------
  E._rpReset = function(opts){
    if(this._cp && this._cp.mesh) this.scene.remove(this._cp.mesh);
    this._rpMode = !!(opts && opts.rp);
    this._bac = 0;            // alcoolemie (g/L de sang)
    this._cigs = 0;           // cigarettes en poche
    this._smoke = null;       // cigarette allumee
    this._smokeFined = false;
    this._cp = null;          // controle routier en cours
    this._cpNext = (this._rpMode ? 1400 : 2600) + Math.random() * 900;
    this._crashes = 0;        // accrochages (mode libre)
    this._drift = 0;
    if(this._puffs) this._puffs.forEach(p=>{ p.s.visible = false; p.life = 0; });
  };

  // ---------- Fumee de cigarette (sprites gris, melange normal : pas de lueur) ----------
  let _smokeTex = null;
  function smokeTex(T){
    if(_smokeTex) return _smokeTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (_smokeTex = new T.CanvasTexture(c));
  }
  E._puff = function(x, y, z, n, big){
    const T = window.THREE;
    if(!this._puffs){
      this._puffs = [];
      for(let k = 0; k < 40; k++){
        const s = new T.Sprite(new T.SpriteMaterial({ map:smokeTex(T), color:0xc8ccd2, transparent:true, opacity:0, depthWrite:false }));
        s.visible = false; this.scene.add(s); this._puffs.push({ s, life:0, max:1, vx:0, vy:0, vz:0, g:0 });
      }
      this._puffI = 0;
    }
    for(let k = 0; k < n; k++){
      const p = this._puffs[this._puffI = (this._puffI + 1) % this._puffs.length];
      p.s.position.set(x + (Math.random() - 0.5) * 0.05, y, z + (Math.random() - 0.5) * 0.05);
      p.vx = (Math.random() - 0.5) * 0.15; p.vy = 0.18 + Math.random() * 0.12; p.vz = (Math.random() - 0.5) * 0.15;
      // (a pied, la fumee est tout pres de l'oeil : plus petite et plus legere)
      p.life = p.max = 1.6 + Math.random() * 1.2; p.g = (big ? 0.5 : 0.18) * (this._fp ? 0.32 : 1); p.op = this._fp ? 0.28 : 0.55; p.world = !this._fp;
      p.s.scale.setScalar(p.g * 0.5); p.s.visible = true;
    }
  };
  E._puffsUpdate = function(dt, scroll){
    if(!this._puffs) return;
    for(const p of this._puffs){
      if(p.life <= 0) continue;
      p.life -= dt;
      if(p.life <= 0){ p.s.visible = false; continue; }
      const k = 1 - p.life / p.max;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt + (p.world ? scroll : 0);
      p.s.scale.setScalar(p.g * (0.5 + k * 2.2));
      p.s.material.opacity = Math.min(1, k * 6) * (1 - k) * (p.op || 0.55);
    }
  };

  // ---------- Actions du joueur ----------
  E.drinkAlcohol = function(gpl){ this._bac = Math.min(2.5, (this._bac || 0) + (gpl || 0.25)); };
  E.addCigarettes = function(n){ this._cigs = (this._cigs || 0) + (n || 20); };
  E.toggleSmoke = function(){
    if(this._smoke){ this._smoke = null; return { ok:true, off:true }; }
    if(!(this._cigs > 0)) return { ok:false, error:'Pas de cigarettes : achète un paquet à la caisse d’une station' };
    this._cigs--;
    this._smoke = { t:0, puffT:2.2, life:75 };
    return { ok:true, left:this._cigs };
  };
  // position de la bouche (a pied) ou de la vitre conducteur (en voiture)
  E._mouthPos = function(v){
    if(this._fp){ this.camera.getWorldDirection(v); v.multiplyScalar(0.7).add(this.camera.position); v.y -= 0.1; return v; }
    return v.set((this._playerX || 0) - 0.55, 1.15, -0.25);
  };

  // ---------- Controle routier ----------
  function person(T, uniform, vest){
    const g = new T.Group();
    const mat = (c, e)=>new T.MeshStandardMaterial({ color:c, roughness:0.8, emissive:e || 0 });
    const dark = mat(uniform), skin = mat(0xd8a07a), refl = mat(vest, 0x3a3a00);
    [-0.11, 0.11].forEach(x=>{ const l = new T.Mesh(new T.BoxGeometry(0.15, 0.86, 0.17), dark); l.position.set(x, 0.43, 0); g.add(l); });
    const body = new T.Mesh(new T.BoxGeometry(0.46, 0.66, 0.28), dark); body.position.y = 1.2; g.add(body);
    const v = new T.Mesh(new T.BoxGeometry(0.48, 0.42, 0.3), refl); v.position.y = 1.28; g.add(v);
    [1.16, 1.36].forEach(y=>{ const st = new T.Mesh(new T.BoxGeometry(0.49, 0.04, 0.31), mat(0xd8dde2, 0x606468)); st.position.y = y; g.add(st); });
    const head = new T.Mesh(new T.SphereGeometry(0.13, 12, 10), skin); head.position.y = 1.7; g.add(head);
    const cap = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.1, 14), dark); cap.position.y = 1.82; g.add(cap);
    const visor = new T.Mesh(new T.BoxGeometry(0.2, 0.02, 0.1), mat(0x111111)); visor.position.set(0, 1.78, 0.13); g.add(visor);
    const armL = new T.Mesh(new T.BoxGeometry(0.11, 0.6, 0.11), dark); armL.position.set(-0.29, 1.18, 0); g.add(armL);
    // bras droit articule a l'epaule (il fait signe de se ranger)
    const sh = new T.Group(); sh.position.set(0.29, 1.48, 0); g.add(sh);
    const armR = new T.Mesh(new T.BoxGeometry(0.11, 0.6, 0.11), dark); armR.position.y = -0.28; sh.add(armR);
    const lamp = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.22, 8), mat(0xff3a1a, 0xff2a10)); lamp.position.y = -0.62; sh.add(lamp);
    g.userData.wave = sh;
    return g;
  }
  function signBoard(T, top, bottom, col){
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 256, 160); x.strokeStyle = col; x.lineWidth = 14; x.strokeRect(7, 7, 242, 146);
    x.fillStyle = col; x.font = '900 34px Arial'; x.textAlign = 'center'; x.fillText(top, 128, 66); x.fillStyle = '#111'; x.font = '900 40px Arial'; x.fillText(bottom, 128, 118);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    const g = new T.Group();
    const p = new T.Mesh(new T.PlaneGeometry(1.6, 1.0), new T.MeshBasicMaterial({ map:t, toneMapped:false })); p.position.y = 1.55; p.rotation.y = 0; g.add(p);
    [-0.6, 0.6].forEach(dx=>{ const leg = new T.Mesh(new T.BoxGeometry(0.06, 1.2, 0.06), new T.MeshStandardMaterial({ color:0x8a8e94 })); leg.position.set(dx, 0.6, -0.02); g.add(leg); });
    return g;
  }
  E._cpBuild = function(){
    const T = window.THREE, SK = DG.StopKit, R = this.route.radars || {};
    const g = new T.Group(), sx = this._shoulderX, ex = this._edgeX;
    const style = R.policeStyle || 'fr';
    const cars = [];
    if(SK){
      const a = SK.policeCar(T, style); a.position.set(sx + 0.15, 0, -6); a.rotation.y = 0.06; g.add(a); cars.push(a);
      const b = SK.policeCar(T, style); b.position.set(sx + 0.35, 0, -14.5); b.rotation.y = -0.04; g.add(b); cars.push(b);
    }
    // cones : biseau qui ouvre la bande d'arret d'urgence, puis alignement sur la ligne de rive
    for(let k = 0; k < 8; k++){ const c = this._coneMesh(); c.position.set(ex + 0.25 + (k / 7) * 0.0, 0, 34 - k * 4); g.add(c); }
    const off = person(T, style === 'it' ? 0x1a2a4a : style === 'ch' ? 0x2a3a4a : 0x14203a, style === 'us' ? 0xe8e020 : 0xd8ff1a);
    off.position.set(ex + 0.65, 0, 2); off.rotation.y = -0.4; g.add(off);
    const off2 = person(T, 0x14203a, 0xd8ff1a); off2.position.set(sx + 1.2, 0, -9.5); off2.rotation.y = -1.6; g.add(off2);
    const word = { it:['CARABINIERI', 'CONTROLLO'], ch:['POLIZEI', 'KONTROLLE'], us:['POLICE', 'CHECKPOINT'] }[style] || [R.police && /Police/.test(R.police) ? 'POLICE' : 'GENDARMERIE', 'CONTRÔLE'];
    const sign = signBoard(T, word[0], word[1], '#1a3a8a'); sign.position.set(sx + 0.4, 0, 70); g.add(sign);
    const sign2 = signBoard(T, '⚠', word[1], '#c8141e'); sign2.position.set(sx + 0.4, 0, 150); g.add(sign2);
    const sirens = [];
    cars.forEach(c=>['sirenRed', 'sirenBlue'].forEach(n=>{ const s = c.getObjectByName(n); if(s){ if(s.material) s.material = s.material.clone(); sirens.push(s); } }));
    g.traverse(n=>{ if(n.isMesh){ n.castShadow = true; } });
    if(this._carLook) this._carLook(g);
    return { g, officer:off, sirens };
  };
  E._cpUpdate = function(dt, scroll){
    const R = this.route && this.route.radars;
    if(!R || !DG.StopKit) return;
    const T = window.THREE, kmh = Math.round(this._speed * 5);
    if(!this._cp){
      if(this._dist > this._cpNext && !this._toll && !this._radar && !this._police && !this._accident && !this._rescue){
        const b = this._cpBuild();
        b.g.position.z = -420; this.scene.add(b.g);
        this._cp = { mesh:b.g, officer:b.officer, sirens:b.sirens, state:'far', t:0, selected:this._rpMode || Math.random() < 0.55, warned:false };
      }
      return;
    }
    const cp = this._cp; cp.t += dt;
    cp.mesh.position.z += scroll;
    // distance jusqu'a ce que le gendarme soit a la vitre conducteur
    const d = -(cp.mesh.position.z + 2) - 0.5;
    const on = Math.floor(cp.t * 5) % 2 === 0;
    cp.sirens.forEach((s, k)=>{ if(s.material) s.material.opacity = (k % 2 === 0) === on ? 1 : 0.15; });
    const w = cp.officer.userData.wave;
    if(w) w.rotation.z = cp.selected && cp.state === 'signal' ? -1.2 - Math.sin(cp.t * 6) * 0.6 : (cp.selected ? -0.2 : -0.9 + Math.sin(cp.t * 3) * 0.5);
    const onShoulder = this._playerX > this._edgeX + 0.25;
    if(cp.state === 'far' && d < 330){
      cp.state = 'signal';
      if(this.cb.onRp) this.cb.onRp('cp-ahead', { selected:cp.selected, police:R.police || 'Police' });
    }
    if(cp.state === 'signal'){
      // sur la bande d'arret d'urgence : on s'arrete pile au gendarme (ou derriere la voiture de police)
      if(onShoulder && d < 110){
        const stopAt = cp.selected ? d : d + 4.2;
        const vmax = Math.sqrt(Math.max(0, 2 * 9 * stopAt));
        if(this._speed > vmax) this._speed = vmax;
        this._vCap = Math.min(this._vCap == null ? 1e9 : this._vCap, Math.max(cp.selected ? 0 : 0, vmax));
        if(cp.selected && Math.abs(this._speed) < 0.35 && d < 1.6){
          cp.state = 'talk'; this._speed = 0; this._tollHold = true;
          if(this.cb.onRp) this.cb.onRp('cp-talk', this._cpInfo());
        }
      }
      if(d < -6 && cp.state === 'signal'){
        cp.state = 'done';
        if(cp.selected && !onShoulder){
          // refus d'obtempérer : prise en chasse
          if(this.cb.onRp) this.cb.onRp('cp-refuse', { police:R.police || 'Police' });
          if(!this._police && this._startPolice) this._startPolice(Math.max(kmh, R.limit + (R.chaseOver || 50)));
        }
      }
    }
    if(cp.mesh.position.z > 60){ this.scene.remove(cp.mesh); this._cp = null; this._cpNext = this._dist + (this._rpMode ? 2400 : 4200) * (0.8 + Math.random() * 0.4); }
  };
  E._cpInfo = function(){
    const R = this.route.radars || {}, r = this.route;
    return { police:R.police || 'Police', style:R.policeStyle || 'fr', currency:r.currency || (r.journey && r.journey.currency) || '€', coinValue:r.coinValue || 1,
      smoking:!!this._smoke, speeding:!!this._lastFlash && this._time - this._lastFlash < 90, bac:this._bac || 0, limitBac:this._bacLimit() };
  };
  E._bacLimit = function(){ const s = (this.route.radars && this.route.radars.policeStyle) || 'fr'; return s === 'us' ? 0.8 : 0.5; };
  // resultat de l'ethylotest (mg/L d'air expire, = g/L de sang / 2), avec la marge de l'appareil
  E.cpBreath = function(){ return Math.max(0, Math.round(((this._bac || 0) / 2 + (Math.random() - 0.5) * 0.02) * 100) / 100); };
  // fin du controle : { pts, arrest, sober }
  E.cpFinish = function(res){
    res = res || {};
    if(res.pts) this._obstacleBonus -= res.pts;
    if(res.sober) this._bac = Math.min(this._bac, 0.2); // immobilise le temps de redescendre
    if(res.smokeOut) this._smoke = null;
    const cp = this._cp; if(cp) cp.state = 'done';
    if(res.arrest){ this._endReason = 'arrest'; this._tollHold = false; this._gameOver(); return; }
    this._tollHold = false; this._stopT = -6;
  };

  // ---------- Accrochage en mode libre (au lieu de la fin de partie) ----------
  E._rpCrash = function(o){
    this._crashes++;
    if(this.fx){ this.fx.crash(o.mesh.position); this.fx.shake = 0.6; }
    const r = this.route, cur = r.currency || (r.journey && r.journey.currency) || '€';
    const franchise = { '€':300, 'CHF':500, '$':500, '¥':50000 }[cur] || 300, pts = Math.round(franchise / (r.coinValue || 1) * 0.4);
    this._obstacleBonus -= pts;
    this._speed = Math.min(this._speed, 4);
    o.v = 0; o.hit = true; o.lc = null;
    // la voiture percutee part en travers sur le cote (elle reste sur place, warnings)
    const side = o.mesh.position.x < this._playerX ? -1 : 1;
    o.mesh.position.x += side * 1.1; o.mesh.rotation.y += side * 0.5;
    ['dgBlinkL', 'dgBlinkR'].forEach(n=>{ const b = o.mesh.getObjectByName(n); if(b) b.visible = true; });
    if(this.cb.onRp) this.cb.onRp('crash', { n:this._crashes, max:3, franchise, pts, currency:cur });
    if(this._crashes >= 3){ this._endReason = 'wreck'; this._startCrash(o); return true; }
    return true;
  };

  // ---------- Mise a jour (appelee a chaque image par le moteur) ----------
  E._rpUpdate = function(dt, scroll){
    // alcool : elimination acceleree (0,5 g/L ~ 2 min de jeu)
    if(this._bac > 0) this._bac = Math.max(0, this._bac - dt * 0.004);
    const drunk = Math.max(0, (this._bac || 0) - 0.2);
    this._drift = drunk ? (Math.sin(this._time * 0.9) * 0.7 + Math.sin(this._time * 2.3) * 0.3) * drunk * 1.6 : 0;
    // cigarette
    const sm = this._smoke;
    if(sm){
      sm.t += dt; sm.puffT -= dt;
      const v = this._tmpMouth || (this._tmpMouth = new window.THREE.Vector3());
      if(sm.puffT <= 0){ sm.puffT = 3 + Math.random() * 2.5; this._mouthPos(v); this._puff(v.x, v.y, v.z, 5, true); if(this.cb.onRp) this.cb.onRp('puff'); }
      else if(Math.random() < dt * 3){ this._mouthPos(v); this._puff(v.x + 0.05, v.y - 0.05, v.z, 1, false); }
      if(sm.t > sm.life){ this._smoke = null; if(this.cb.onRp) this.cb.onRp('smoke-end'); }
      // interdit de fumer a la pompe
      const tl = this._toll;
      if(tl && tl.kind === 'fuel' && (this._fp || tl.state === 'stopped' || tl.state === 'paid') && !this._smokeFined){
        this._smokeFined = true;
        const r = this.route, cur = r.currency || (r.journey && r.journey.currency) || '€';
        const fine = { '€':68, 'CHF':100, '$':100, '¥':10000 }[cur] || 68, pts = Math.round(fine / (r.coinValue || 1) * 0.6);
        this._obstacleBonus -= pts; this._smoke = null;
        if(this.cb.onPickup) this.cb.onPickup('rule-fine', { title:'Cigarette allumée à la pompe — interdit (risque d’incendie)', fine, pts, currency:cur });
      }
    }
    if(!this._toll) this._smokeFined = false;
    this._puffsUpdate(dt, scroll);
    if(this.playing) this._cpUpdate(dt, scroll);
  };
})();
