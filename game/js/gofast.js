// Mode "Go fast" branche sur le moteur : un colis a livrer a l'autre bout du
// trajet avant la fin du chrono, avec la police aux trousses. Chaque livraison
// rapporte une prime (ajoutee au score, donc aux credits) et enchaine sur un
// contrat plus long et mieux paye, avec plus de chaleur (etoiles de recherche).
// Se faire rattraper = interpellation, colis saisi, fin de la partie.
// L'interface (HUD, messages) est geree par main.js via cb.onGoFast / cb.onPickup.
(function(){
  window.DG = window.DG || {};
  const GE = DG.GameEngine, E = GE && GE.prototype;
  if(!E) return;

  const M_PER_UNIT = 1000 / 720; // 1 unite/s = 5 km/h -> 1 unite = 1,39 m
  const MAX_HEAT = 5;

  E._gfReset = function(opts){
    if(this._gf && this._gf.cop) this.scene.remove(this._gf.cop.mesh);
    this._gf = null;
    if(!(opts && opts.gofast) || (opts && opts.rp)) return;
    this._gf = { level:0, heat:1, cop:null, nextCop:9, hudT:0, lost:0, earned:0, pause:0, ended:false };
    this._gfContract();
  };

  // Nouveau contrat : plus long, plus serre, mieux paye a chaque livraison
  E._gfContract = function(){
    const gf = this._gf;
    gf.level++;
    const secs = Math.max(55, 85 - gf.level * 4);           // temps imparti
    const pace = this.mult.baseSpeed * (1.12 + gf.level * 0.05); // vitesse moyenne a tenir
    gf.goal = Math.round(secs * pace);
    gf.left = gf.goal;
    gf.time = secs;
    gf.reward = Math.round((2500 + gf.level * 1500) * (1 + (gf.level - 1) * 0.35));
    if(this.cb.onPickup) this.cb.onPickup('gf-contract', { level:gf.level, km:(gf.goal * M_PER_UNIT / 1000), secs, reward:gf.reward });
  };

  E._gfCopSpawn = function(){
    const T = window.THREE, SK = DG.StopKit, gf = this._gf;
    const style = (this.route.radars && this.route.radars.policeStyle) || 'fr';
    const mesh = SK ? SK.policeCar(T, style) : new T.Group();
    mesh.position.set(this._playerX, 0, 12);
    if(GE.own) GE.own(mesh);
    this.scene.add(mesh);
    if(GE.bend) GE.bend(mesh);
    if(this._carLook) this._carLook(mesh);
    gf.cop = { mesh, z:12, blink:0, state:'chase', redL:mesh.getObjectByName('sirenRed'), blueL:mesh.getObjectByName('sirenBlue') };
    if(this.cb.onPickup) this.cb.onPickup('gf-cop', { heat:Math.floor(gf.heat) });
  };

  E._gfUpdate = function(dt, scroll){
    const gf = this._gf;
    if(!gf || gf.ended || !this.playing) return;
    if(this._tollHold){ this._gfHud(); return; } // (peage, station : le chrono s'arrete)

    // progression et chrono
    if(gf.pause > 0){ gf.pause -= dt; if(gf.pause <= 0) this._gfContract(); this._gfHud(); return; }
    gf.left -= Math.max(0, scroll || 0);
    gf.time -= dt;
    gf.heat = Math.min(MAX_HEAT, gf.heat + dt * (0.012 + gf.level * 0.004) * (this._boostActive ? 1.6 : 1));

    if(gf.left <= 0){
      // livre !
      const bonusT = Math.max(0, Math.round(gf.time * 45));
      const pay = Math.round((gf.reward + bonusT) * (1 + (Math.floor(gf.heat) - 1) * 0.2));
      this._obstacleBonus += pay;
      gf.earned += pay;
      if(this.cb.onPickup) this.cb.onPickup('gf-delivered', { level:gf.level, pay, bonusT, heat:Math.floor(gf.heat), total:gf.earned });
      if(this.fx) this.fx.emit(this._wx ? this._wx(this._playerX) : this._playerX, 1.2, -2, 60, 0xffcc00, 9, 1.4, 0.6);
      gf.pause = 4; // souffle avant le contrat suivant
      this._gfHud();
      return;
    }
    if(gf.time <= 0){
      gf.ended = true;
      this._endReason = 'gofast-late';
      if(this.cb.onPickup) this.cb.onPickup('gf-late');
      this._gameOver();
      return;
    }

    // police : une voiture a la fois, de plus en plus collante avec la chaleur
    const cop = gf.cop;
    if(!cop){
      gf.nextCop -= dt;
      if(gf.nextCop <= 0) this._gfCopSpawn();
    } else if(cop.state === 'chase'){
      const kmh = this._speed * 5;
      const fast = Math.max(0, Math.min(1, (this._speed - this.mult.baseSpeed) / Math.max(1, this.mult.maxSpeed - this.mult.baseSpeed)));
      const rel = this._boostActive ? -(8 - gf.heat * 0.6) : this._brake ? 9 : (1.8 + gf.heat * 0.75 - fast * 4.2);
      cop.z -= rel * dt;
      cop.mesh.position.set(cop.mesh.position.x + (this._playerX - cop.mesh.position.x) * Math.min(1, dt * (2 + gf.heat * 0.4)), 0, cop.z);
      cop.blink += dt;
      const on = Math.floor(cop.blink * 7) % 2 === 0;
      if(cop.redL) cop.redL.material.opacity = on ? 1 : 0.15;
      if(cop.blueL) cop.blueL.material.opacity = on ? 0.15 : 1;
      if(cop.z > 34){
        // semee
        this.scene.remove(cop.mesh); gf.cop = null;
        gf.lost++;
        const bonus = Math.round(300 * gf.heat);
        this._obstacleBonus += bonus;
        gf.heat = Math.max(1, gf.heat - 0.6);
        gf.nextCop = Math.max(6, 16 - gf.heat * 2) + Math.random() * 6;
        if(this.cb.onPickup) this.cb.onPickup('gf-lost', { bonus, kmh:Math.round(kmh) });
      } else if(cop.z < 3.6){
        // interpellation : on se range, le colis est saisi
        cop.state = 'busted'; cop.t = 0; this._ghost = true;
        if(this.cb.onPickup) this.cb.onPickup('gf-busted');
      }
    } else if(cop.state === 'busted'){
      cop.t += dt;
      this._speed = Math.max(0, this._speed - dt * 26);
      this._xOverride = this._shoulderX;
      cop.z = Math.max(4.2, cop.z - dt * 2); cop.mesh.position.z = cop.z;
      cop.blink += dt;
      const on = Math.floor(cop.blink * 7) % 2 === 0;
      if(cop.redL) cop.redL.material.opacity = on ? 1 : 0.15;
      if(cop.blueL) cop.blueL.material.opacity = on ? 0.15 : 1;
      if(cop.t > 2.2){
        gf.ended = true;
        this._xOverride = null;
        // le colis en cours est saisi : on perd la moitie des primes deja touchees
        const seized = Math.round(gf.earned * 0.5);
        this._obstacleBonus -= seized;
        this._endReason = 'gofast-busted';
        this._gfSeized = seized;
        this._gameOver();
        return;
      }
    }
    gf.hudAcc = (gf.hudAcc || 0) + dt;
    if(gf.hudAcc >= 0.1){ gf.hudAcc = 0; this._gfHud(); }
  };

  E._gfHud = function(){
    const gf = this._gf;
    if(!this.cb.onGoFast || !gf) return;
    this.cb.onGoFast({
      level:gf.level, heat:gf.heat, time:Math.max(0, gf.time), pause:gf.pause > 0,
      km:Math.max(0, gf.left) * M_PER_UNIT / 1000, progress:1 - Math.max(0, gf.left) / gf.goal,
      reward:gf.reward, earned:gf.earned,
      cop:gf.cop ? { gap:Math.max(0, gf.cop.z - 3.6) * M_PER_UNIT, busted:gf.cop.state === 'busted' } : null,
    });
  };
})();
