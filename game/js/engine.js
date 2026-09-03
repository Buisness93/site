// Moteur du mini-jeu : route, voiture, obstacles, bonus, score. Ne connaît rien
// du DOM/HUD au-delà des callbacks fournis — game-ui.js s'occupe de l'affichage.
(function(){
  window.DG = window.DG || {};
  const LANES = [-3.3, -1.1, 1.1, 3.3];
  const NEAR_MISS_GAP = 0.85;
  const TRAFFIC_FILES = ['../uploads/taxi.glb','../uploads/van.glb','../uploads/truck-flat.glb','../uploads/police.glb','../uploads/delivery.glb','../uploads/race.glb','../uploads/race-future.glb'];
  const TRAFFIC_TINTS = [0xe23b3b,0x2f7bff,0x18c56b,0xf5b301,0xff7a00,0x9b5cff,0xeceff4,0x18324a,0x00c2ff];

  function GameEngine(container, cb){
    this.container = container;
    this.cb = cb || {};
    this.playing = false;
    this.paused = false;
    this._camIndex = 1;
    this._camPresets = [
      { name:'PROCHE', pos:[0,2.9,8.4], look:[0,1.0,-30] },
      { name:'STANDARD', pos:[0,4.2,11.4], look:[0,1.05,-46] },
      { name:'LARGE', pos:[0,5.6,14.8], look:[0,1.35,-62] },
    ];
    this._stripes = [];
    this._decor = [];
    this._obstacles = [];
    this._pickups = [];
    this._lane = 1;
    this._playerX = LANES[1];
    this._boostFuel = 1;
    this._boostHeld = false;
    this._boostActive = false;
    this._multiplier = 1;
    this._multiplierT = 0;
  }

  GameEngine.prototype.init = function(){
    const T = window.THREE;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const renderer = new T.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.75));
    renderer.setSize(w, h);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new T.Scene();
    this.scene = scene;
    const camera = new T.PerspectiveCamera(50, w/h, 0.1, 400);
    camera.position.set(0,3.6,9.8);
    camera.lookAt(0,1.1,-46);
    this.camera = camera;
    this._look = new T.Vector3(0,1.1,-46);

    this.ambientLight = new T.AmbientLight(0xffffff, 0.28); scene.add(this.ambientLight);
    this.keyLight = new T.DirectionalLight(0xffffff, 1.1); this.keyLight.position.set(6,10,7); scene.add(this.keyLight);
    this.hemiLight = new T.HemisphereLight(0x8899ff, 0x060608, 0.45); scene.add(this.hemiLight);

    this.groundMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.05, roughness:0.95 });
    const ground = new T.Mesh(new T.PlaneGeometry(340, 320), this.groundMat);
    ground.rotation.x = -Math.PI/2; ground.position.set(0, -0.03, -100); scene.add(ground);

    this.roadMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.35, roughness:0.7 });
    const road = new T.Mesh(new T.PlaneGeometry(14, 260), this.roadMat);
    road.rotation.x = -Math.PI/2; road.position.z = -100; scene.add(road);

    this._skyDome = new T.Mesh(
      new T.SphereGeometry(280, 20, 14),
      new T.MeshBasicMaterial({ side:T.BackSide, fog:false, vertexColors:true })
    );
    scene.add(this._skyDome);

    this.stripeMat = new T.MeshBasicMaterial({ color:0x39404d });
    for(const lane of [-2.2, 0, 2.2]){
      for(let i=0;i<48;i++){
        const st = new T.Mesh(new T.BoxGeometry(0.13,0.02,2), this.stripeMat);
        st.position.set(lane, 0.02, -i*5);
        scene.add(st); this._stripes.push(st);
      }
    }
    this.edgeMat = new T.MeshStandardMaterial({ color:0x1b2129, emissive:0x0a1a3a, emissiveIntensity:0.8 });
    this._edges = [-5.5, 5.5].map(x=>{
      const edge = new T.Mesh(new T.BoxGeometry(0.16,0.18,260), this.edgeMat);
      edge.position.set(x, 0.12, -100); scene.add(edge);
      return edge;
    });

    this._ro = new ResizeObserver(()=>this._onResize());
    this._ro.observe(this.container);

    this._last = performance.now();
    this._raf = requestAnimationFrame((t)=>this._loop(t));

    this._preloadObstacles();
    return this;
  };

  GameEngine.prototype._preloadObstacles = function(){
    DG.Loader.loadModel('../uploads/traffic-cone-new.glb').then(m=>{ this._coneModel = m; });
    this._trafficModels = [];
    TRAFFIC_FILES.forEach(f=>DG.Loader.loadModel(f).then(m=>{ if(m) this._trafficModels.push(m); }));
  };

  GameEngine.prototype._onResize = function(){
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if(!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
  };

  GameEngine.prototype._applySkyGradient = function(topHex, bottomHex){
    const T = window.THREE;
    const geo = this._skyDome.geometry;
    const pos = geo.attributes.position;
    const colors = geo.attributes.color && geo.attributes.color.count === pos.count
      ? geo.attributes.color
      : new T.BufferAttribute(new Float32Array(pos.count*3), 3);
    const top = new T.Color(topHex), bottom = new T.Color(bottomHex);
    const c = new T.Color();
    let minY = Infinity, maxY = -Infinity;
    for(let i=0;i<pos.count;i++){ const y = pos.getY(i); if(y<minY) minY=y; if(y>maxY) maxY=y; }
    const span = (maxY - minY) || 1;
    for(let i=0;i<pos.count;i++){
      const t = Math.max(0, Math.min(1, (pos.getY(i) - minY) / span));
      c.copy(bottom).lerp(top, Math.pow(t, 0.7));
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    geo.setAttribute('color', colors);
  };

  GameEngine.prototype.setRoute = function(routeId){
    const T = window.THREE;
    const route = DG.routeById(routeId);
    this.route = route;
    this._decor.forEach(o=>{
      this.scene.remove(o);
      o.traverse(n=>{
        if(n.geometry) n.geometry.dispose();
        if(n.material){
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m=>{ if(m.emissiveMap) m.emissiveMap.dispose(); if(m.map) m.map.dispose(); m.dispose(); });
        }
      });
    });
    this._decor = [];
    this.scene.fog = new T.Fog(route.fog, route.fogNear, route.fogFar);
    this.roadMat.color.setHex(route.road);
    this.stripeMat.color.setHex(route.stripe);
    this.edgeMat.color.setHex(route.edge);
    this.edgeMat.emissive.setHex(route.edgeEmissive);
    this.groundMat.color.setHex(route.ground != null ? route.ground : route.road);
    if(route.sky) this._applySkyGradient(route.sky.top, route.sky.bottom);
    if(route.light){
      const L = route.light;
      this.keyLight.color.setHex(L.key); this.keyLight.intensity = L.keyI;
      this.hemiLight.color.setHex(L.hemiSky); this.hemiLight.groundColor.setHex(L.hemiGround); this.hemiLight.intensity = L.hemiI;
      this.ambientLight.color.setHex(L.ambient); this.ambientLight.intensity = L.ambientI;
    }
    const DECOR_N = 16;
    this._decor = route.buildDecor(T, this.scene, DECOR_N) || [];
    this._decorWrap = (route.spacing || 8.5) * DECOR_N;
  };

  GameEngine.prototype.setCamLabel = function(){
    if(this.cb.onCamLabel) this.cb.onCamLabel(this._camPresets[this._camIndex].name);
  };

  GameEngine.prototype.cycleCam = function(){
    this._camIndex = (this._camIndex + 1) % this._camPresets.length;
    this.setCamLabel();
  };

  GameEngine.prototype._statMultipliers = function(car){
    const s = car.stats;
    return {
      baseSpeed: 18 + s.speed * 1.6,       // vitesse au demarrage : deja rapide des le depart
      maxSpeed: 25 + s.speed * 5.1,        // plafond : une bonne voiture va bien plus loin
      accelRamp: 2.4 + s.accel * 0.58,     // vitesse d'approche du plafond
      handlingRate: 7.5 + s.handling * 1.15, // reactivite des changements de voie
      boostDrain: Math.max(0.22, 0.5 - s.boost * 0.02),
      boostRecharge: 0.14 + s.boost * 0.01,
      boostPower: 1.55 + s.boost * 0.035,
      scoreFactor: DG.carScoreFactor(car),  // jusqu'a quasi x2 le score avec la meilleure voiture
    };
  };

  GameEngine.prototype.start = async function(car, routeId, personalBest){
    const T = window.THREE;
    if(!this.route || this.route.id !== routeId) this.setRoute(routeId);
    this.car = car;
    this.mult = this._statMultipliers(car);

    if(this._player) this.scene.remove(this._player);
    this._obstacles.forEach(o=>this.scene.remove(o.mesh)); this._obstacles = [];
    this._pickups.forEach(p=>this.scene.remove(p.mesh)); this._pickups = [];

    const model = await DG.Loader.loadModel('../' + car.model);
    this._player = model ? DG.Loader.normalizeModel(T, model, 3.4, Math.PI - (car.rotY||0)) : DG.Loader.makeFallbackCar(T, { body:car.body, emissive:0x0a0e16 });
    this._player.position.set(0,0,0);
    this.scene.add(this._player);

    this._lane = 1; this._playerX = LANES[1];
    this._speed = this.mult.baseSpeed;
    this._boostFuel = 1; this._boostHeld = false; this._boostActive = false;
    this._dist = 0; this._time = 0; this._spawnT = 0.7; this._pickupT = 1.2;
    this._obstacleBonus = 0; this._coinCredits = 0; this._nearMissBonus = 0;
    this._multiplier = 1; this._multiplierT = 0;
    this._personalBest = personalBest || 0;
    this._recordBroken = false;
    this._nearMissStreak = 0;
    this.playing = true; this.paused = false;
    this.setCamLabel();
    this._initEngineSound();
  };

  GameEngine.prototype.pause = function(){ if(this.playing){ this.paused = true; this._muteEngineSound(); if(this.cb.onPauseChange) this.cb.onPauseChange(true); } };
  GameEngine.prototype.resume = function(){ if(this.playing){ this.paused = false; this._last = performance.now(); if(this.cb.onPauseChange) this.cb.onPauseChange(false); } };

  GameEngine.prototype.quit = function(){
    this.playing = false; this.paused = false;
    this._muteEngineSound();
    if(this._player){ this.scene.remove(this._player); this._player = null; }
    this._obstacles.forEach(o=>this.scene.remove(o.mesh)); this._obstacles = [];
    this._pickups.forEach(p=>this.scene.remove(p.mesh)); this._pickups = [];
  };

  GameEngine.prototype.move = function(d){
    if(!this.playing || this.paused) return;
    this._lane = Math.max(0, Math.min(3, this._lane + d));
  };
  GameEngine.prototype.setBoostHeld = function(v){ this._boostHeld = v; };

  // Moteur synthetise en Web Audio (aucun fichier son a charger) : deux
  // oscillateurs (fondamentale + sous-harmonique) passes dans un filtre passe-bas,
  // dont la frequence/le volume suivent la vitesse et le boost en temps reel.
  GameEngine.prototype._initEngineSound = function(){
    if(this._audioCtx) { if(this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(()=>{}); return; }
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      const ctx = new AC();
      const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 55;
      const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 28;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
      const gain = ctx.createGain(); gain.gain.value = 0;
      osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc1.start(); osc2.start();
      this._audioCtx = ctx; this._engineOsc1 = osc1; this._engineOsc2 = osc2; this._engineFilter = filter; this._engineGain = gain;
    } catch(e){}
  };

  GameEngine.prototype._updateEngineSound = function(){
    if(!this._audioCtx || !this.mult) return;
    const ctx = this._audioCtx;
    const now = ctx.currentTime;
    const ratio = Math.max(0, Math.min(1.3, this._speed / (this.mult.maxSpeed || 1)));
    const boostAdd = this._boostActive ? 1 : 0;
    const freq1 = 55 + ratio * 210 + boostAdd * 60;
    const gainTarget = (0.05 + ratio * 0.09 + boostAdd * 0.05);
    this._engineOsc1.frequency.setTargetAtTime(freq1, now, 0.08);
    this._engineOsc2.frequency.setTargetAtTime(freq1 * 0.5, now, 0.08);
    this._engineFilter.frequency.setTargetAtTime(500 + ratio * 2200, now, 0.08);
    this._engineGain.gain.setTargetAtTime(gainTarget, now, 0.12);
  };

  GameEngine.prototype._muteEngineSound = function(){
    if(!this._audioCtx) return;
    this._engineGain.gain.setTargetAtTime(0, this._audioCtx.currentTime, 0.1);
  };

  GameEngine.prototype.destroy = function(){
    if(this._raf) cancelAnimationFrame(this._raf);
    if(this._ro) this._ro.disconnect();
    if(this._audioCtx) this._audioCtx.close().catch(()=>{});
    if(this.renderer){ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }
  };

  GameEngine.prototype._spawnObstacle = function(forceLane){
    const T = window.THREE;
    const li = forceLane != null ? forceLane : Math.floor(Math.random()*4);
    const lane = LANES[li];
    let mesh, w = 0.95;
    const r = Math.random();
    if(r < 0.35 && this._coneModel){
      mesh = DG.Loader.normalizeModel(T, this._coneModel, 1.0, 0);
      w = 0.5;
    } else if(this._trafficModels && this._trafficModels.length){
      let ti = Math.floor(Math.random()*this._trafficModels.length);
      if(this._trafficModels.length > 1 && ti === this._lastTrafficIdx) ti = (ti+1) % this._trafficModels.length;
      this._lastTrafficIdx = ti;
      mesh = DG.Loader.normalizeModel(T, this._trafficModels[ti], 3.6, Math.PI);
      DG.Loader.tintModel(T, mesh, TRAFFIC_TINTS[Math.floor(Math.random()*TRAFFIC_TINTS.length)], 0.0);
      w = 0.95;
    } else if(this._coneModel){
      mesh = DG.Loader.normalizeModel(T, this._coneModel, 1.0, 0);
      w = 0.5;
    } else {
      mesh = DG.Loader.makeFallbackCar(T, { body:0x161b23 });
      w = 0.95;
    }
    mesh.position.set(lane, 0, -134);
    mesh.userData.w = w;
    this.scene.add(mesh);
    this._obstacles.push({ mesh, hit:false, scored:false, laneX:lane });
    return li;
  };

  function pickupMesh(T, kind){
    if(kind === 'coin'){
      const m = new T.Mesh(new T.TorusGeometry(0.42, 0.16, 10, 20), new T.MeshStandardMaterial({ color:0xffcc00, emissive:0xff9500, emissiveIntensity:0.7, metalness:0.7, roughness:0.25 }));
      m.rotation.x = Math.PI/2.4; return m;
    }
    if(kind === 'multiplier'){
      const m = new T.Mesh(new T.OctahedronGeometry(0.55), new T.MeshStandardMaterial({ color:0xff5ad1, emissive:0xff2fc0, emissiveIntensity:0.9, metalness:0.5, roughness:0.2 }));
      return m;
    }
    const m = new T.Mesh(new T.CapsuleGeometry(0.32, 0.6, 4, 8), new T.MeshStandardMaterial({ color:0x3df0ff, emissive:0x18c8ff, emissiveIntensity:0.9, metalness:0.5, roughness:0.2 }));
    m.rotation.z = Math.PI/2; return m;
  }

  GameEngine.prototype._spawnPickup = function(){
    const T = window.THREE;
    const roll = Math.random();
    const kind = roll < 0.72 ? 'coin' : (roll < 0.88 ? 'nitro' : 'multiplier');
    const li = Math.floor(Math.random()*4);
    const mesh = pickupMesh(T, kind);
    mesh.position.set(LANES[li], 1.05, -130);
    this.scene.add(mesh);
    this._pickups.push({ mesh, kind, taken:false });
  };

  GameEngine.prototype._loop = function(now){
    this._raf = requestAnimationFrame((t)=>this._loop(t));
    const dt = Math.min((now - this._last)/1000, 0.05);
    this._last = now;
    if(!this.paused) this._update(dt, now);
    this.renderer.render(this.scene, this.camera);
  };

  GameEngine.prototype._update = function(dt, now){
    const cp = this._camPresets[this._camIndex];
    const bz = (this.playing && this._boostActive) ? -1.0 : 0;
    const shake = (this.playing && this._boostActive) ? Math.sin(now*0.05)*0.05 : 0;
    this.camera.position.x += (cp.pos[0]+shake - this.camera.position.x)*0.07;
    this.camera.position.y += (cp.pos[1] - this.camera.position.y)*0.07;
    this.camera.position.z += (cp.pos[2]+bz - this.camera.position.z)*0.07;
    this._look.x += (cp.look[0]-this._look.x)*0.07;
    this._look.y += (cp.look[1]-this._look.y)*0.07;
    this._look.z += (cp.look[2]-this._look.z)*0.07;
    this.camera.lookAt(this._look);

    let scroll = (this.playing ? this._speed : 7) * dt;
    if(this.playing){
      const want = this._boostHeld && this._boostFuel > 0.02;
      this._boostActive = want;
      if(want) this._boostFuel = Math.max(0, this._boostFuel - dt*this.mult.boostDrain);
      else this._boostFuel = Math.min(1, this._boostFuel + dt*this.mult.boostRecharge);
      if(want) scroll *= this.mult.boostPower;
    }
    if(this.playing) this._updateEngineSound();

    for(const st of this._stripes){ st.position.z += scroll; if(st.position.z > 10) st.position.z -= 240; }
    const wrap = this._decorWrap || 140;
    for(const d of this._decor){ d.position.z += scroll; if(d.position.z > 30) d.position.z -= wrap; }

    if(!this.playing) return;

    this._time += dt;
    this._speed += (this.mult.maxSpeed - this._speed) * Math.min(1, dt * this.mult.accelRamp * 0.4);
    this._dist += scroll;

    if(this._multiplierT > 0){ this._multiplierT -= dt; if(this._multiplierT <= 0){ this._multiplier = 1; if(this.cb.onPickup) this.cb.onPickup('multiplier-end'); } }

    const targetX = LANES[this._lane];
    this._playerX += (targetX - this._playerX) * Math.min(1, dt * this.mult.handlingRate);
    if(this._player){
      this._player.position.x = this._playerX;
      this._player.position.y = Math.sin(now*0.02)*0.02;
      this._player.rotation.z = (targetX - this._playerX) * 0.14;
    }

    this._spawnT -= dt;
    const interval = Math.max(0.3, 1.0 - this._time*0.025);
    if(this._spawnT <= 0){
      this._spawnT = interval;
      const l1 = this._spawnObstacle();
      if(this._time > 13 && Math.random() < Math.min(0.55, (this._time-13)*0.024)){
        let l2 = Math.floor(Math.random()*4); if(l2 === l1) l2 = (l1+1)%4;
        this._spawnObstacle(l2);
      }
    }
    this._pickupT -= dt;
    if(this._pickupT <= 0){ this._pickupT = 1.1 + Math.random()*1.0; this._spawnPickup(); }

    const playerHalfW = 0.55;
    for(let i=this._obstacles.length-1; i>=0; i--){
      const o = this._obstacles[i];
      o.mesh.position.z += scroll;
      const gap = Math.abs(o.mesh.position.x - this._playerX) - ((o.mesh.userData.w||1.2) + playerHalfW);
      if(!o.hit && Math.abs(o.mesh.position.z) < 1.5 && gap < 0){ o.hit = true; this._gameOver(); return; }
      if(!o.scored && o.mesh.position.z > 2){
        o.scored = true;
        this._obstacleBonus += 50 * this._multiplier;
        if(gap >= 0 && gap < NEAR_MISS_GAP){
          this._nearMissStreak++;
          const streakBonus = Math.min(5, this._nearMissStreak) * 10;
          this._nearMissBonus += (30 + streakBonus) * this._multiplier;
          if(this.cb.onPickup) this.cb.onPickup('near-miss', { streak: this._nearMissStreak });
        } else {
          this._nearMissStreak = 0;
        }
      }
      if(o.mesh.position.z > 11){ this.scene.remove(o.mesh); this._obstacles.splice(i,1); }
    }

    for(let i=this._pickups.length-1; i>=0; i--){
      const p = this._pickups[i];
      p.mesh.position.z += scroll;
      p.mesh.rotation.y += dt*3;
      if(!p.taken && Math.abs(p.mesh.position.z) < 1.6 && Math.abs(p.mesh.position.x - this._playerX) < 1.1){
        p.taken = true;
        if(p.kind === 'coin'){ this._coinCredits += 10 * this._multiplier; if(this.cb.onPickup) this.cb.onPickup('coin'); }
        else if(p.kind === 'nitro'){ this._boostFuel = 1; if(this.cb.onPickup) this.cb.onPickup('nitro'); }
        else { this._multiplier = 2; this._multiplierT = 8; if(this.cb.onPickup) this.cb.onPickup('multiplier'); }
        this.scene.remove(p.mesh); this._pickups.splice(i,1); continue;
      }
      if(p.mesh.position.z > 11){ this.scene.remove(p.mesh); this._pickups.splice(i,1); }
    }

    const score = this.currentScore();
    if(!this._recordBroken && this._personalBest > 0 && score > this._personalBest){
      this._recordBroken = true;
      if(this.cb.onRecordBroken) this.cb.onRecordBroken();
    }

    if(this.cb.onHud) this.cb.onHud({
      time: this._time,
      score: score,
      speed: Math.round(this._speed*5),
      boostPct: this._boostFuel*100,
      multiplierActive: this._multiplier > 1,
      multiplierT: this._multiplierT,
      personalBest: this._personalBest,
      recordBroken: this._recordBroken,
      scoreToRecord: this._recordBroken ? 0 : Math.max(0, this._personalBest - score)
    });
  };

  GameEngine.prototype.currentScore = function(){
    const base = Math.floor(this._dist) + this._obstacleBonus + this._coinCredits + this._nearMissBonus;
    return Math.floor(base * (this.mult ? this.mult.scoreFactor : 1));
  };

  GameEngine.prototype._gameOver = function(){
    this.playing = false;
    this._muteEngineSound();
    const result = { score:this.currentScore(), time:this._time, carId:this.car.id, routeId:this.route.id };
    if(this.cb.onGameOver) this.cb.onGameOver(result);
  };

  DG.GameEngine = GameEngine;
})();
