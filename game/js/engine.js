// Moteur du mini-jeu : route, voiture, obstacles, bonus, score. Ne connaît rien
// du DOM/HUD au-delà des callbacks fournis — game-ui.js s'occupe de l'affichage.
(function(){
  window.DG = window.DG || {};
  const LANES = [-3.3, -1.1, 1.1, 3.3];
  const NEAR_MISS_GAP = 0.85;
  const TRAFFIC_FILES = ['../uploads/police-a617b880.glb','../uploads/suv-9df31f6e.glb','../uploads/suv-luxury-9e2a79dc.glb','../uploads/taxi-38035397.glb','../uploads/truck-5e1bc66c.glb'];
  const TRAFFIC_TINTS = [0xe23b3b,0x2f7bff,0x18c56b,0xf5b301,0xff7a00,0x9b5cff,0xeceff4,0x18324a,0x00c2ff];

  function GameEngine(container, cb){
    this.container = container;
    this.cb = cb || {};
    this.playing = false;
    this.paused = false;
    this._camIndex = 1;
    this._camPresets = [
      { name:'PROCHE', pos:[0,2.6,7.2], look:[0,0.85,-30] },
      { name:'STANDARD', pos:[0,3.6,9.8], look:[0,1.1,-46] },
      { name:'LARGE', pos:[0,4.9,13.2], look:[0,1.4,-62] },
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

    scene.add(new T.AmbientLight(0xffffff, 0.28));
    const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(6,10,7); scene.add(key);
    scene.add(new T.HemisphereLight(0x8899ff, 0x060608, 0.45));

    this.roadMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.35, roughness:0.7 });
    const road = new T.Mesh(new T.PlaneGeometry(14, 260), this.roadMat);
    road.rotation.x = -Math.PI/2; road.position.z = -100; scene.add(road);

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

    this._preloadTraffic();
    return this;
  };

  GameEngine.prototype._preloadTraffic = function(){
    this._trafficModels = [];
    TRAFFIC_FILES.forEach(f=>DG.Loader.loadModel(f).then(m=>{ if(m) this._trafficModels.push(m); }));
    DG.Loader.loadModel('../uploads/cone.glb').then(m=>{ this._coneModel = m; });
  };

  GameEngine.prototype._onResize = function(){
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if(!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
  };

  GameEngine.prototype.setRoute = function(routeId){
    const T = window.THREE;
    const route = DG.routeById(routeId);
    this.route = route;
    this._decor.forEach(o=>this.scene.remove(o));
    this._decor = [];
    this.scene.fog = new T.Fog(route.fog, route.fogNear, route.fogFar);
    this.roadMat.color.setHex(route.road);
    this.stripeMat.color.setHex(route.stripe);
    this.edgeMat.color.setHex(route.edge);
    this.edgeMat.emissive.setHex(route.edgeEmissive);
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
      baseSpeed: 13 + s.speed * 1.15,
      accelRamp: 0.016 + s.accel * 0.0016,
      handling: 7 + s.handling * 1.6,
      boostDrain: Math.max(0.22, 0.5 - s.boost * 0.02),
      boostRecharge: 0.14 + s.boost * 0.01,
      boostPower: 1.55 + s.boost * 0.035,
    };
  };

  GameEngine.prototype.start = async function(car, routeId){
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
    this.playing = true; this.paused = false;
    this.setCamLabel();
  };

  GameEngine.prototype.pause = function(){ if(this.playing){ this.paused = true; if(this.cb.onPauseChange) this.cb.onPauseChange(true); } };
  GameEngine.prototype.resume = function(){ if(this.playing){ this.paused = false; this._last = performance.now(); if(this.cb.onPauseChange) this.cb.onPauseChange(false); } };

  GameEngine.prototype.quit = function(){
    this.playing = false; this.paused = false;
    if(this._player){ this.scene.remove(this._player); this._player = null; }
    this._obstacles.forEach(o=>this.scene.remove(o.mesh)); this._obstacles = [];
    this._pickups.forEach(p=>this.scene.remove(p.mesh)); this._pickups = [];
  };

  GameEngine.prototype.move = function(d){
    if(!this.playing || this.paused) return;
    this._lane = Math.max(0, Math.min(3, this._lane + d));
  };
  GameEngine.prototype.setBoostHeld = function(v){ this._boostHeld = v; };

  GameEngine.prototype.destroy = function(){
    if(this._raf) cancelAnimationFrame(this._raf);
    if(this._ro) this._ro.disconnect();
    if(this.renderer){ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }
  };

  GameEngine.prototype._spawnObstacle = function(forceLane){
    const T = window.THREE;
    const li = forceLane != null ? forceLane : Math.floor(Math.random()*4);
    const lane = LANES[li];
    let mesh, w = 1.2;
    const r = Math.random();
    if(r < 0.3 && this._coneModel){
      mesh = DG.Loader.normalizeModel(T, this._coneModel, 1.0, 0);
      DG.Loader.tintModel(T, mesh, [0xff7a00,0xff8c1a,0xff6600][Math.floor(Math.random()*3)], 0.5);
      w = 0.7;
    } else if(this._trafficModels && this._trafficModels.length){
      let ti = Math.floor(Math.random()*this._trafficModels.length);
      if(this._trafficModels.length > 1 && ti === this._lastTrafficIdx) ti = (ti+1) % this._trafficModels.length;
      this._lastTrafficIdx = ti;
      mesh = DG.Loader.normalizeModel(T, this._trafficModels[ti], 3.6, Math.PI);
      DG.Loader.tintModel(T, mesh, TRAFFIC_TINTS[Math.floor(Math.random()*TRAFFIC_TINTS.length)], 0.0);
      w = 1.25;
    } else {
      mesh = DG.Loader.makeFallbackCar(T, { body:0x161b23 });
      w = 1.2;
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

    for(const st of this._stripes){ st.position.z += scroll; if(st.position.z > 10) st.position.z -= 240; }
    const wrap = this._decorWrap || 140;
    for(const d of this._decor){ d.position.z += scroll; if(d.position.z > 30) d.position.z -= wrap; }

    if(!this.playing) return;

    this._time += dt;
    this._speed += dt * (this.mult.accelRamp*40 + this._time*0.024);
    this._dist += scroll;

    if(this._multiplierT > 0){ this._multiplierT -= dt; if(this._multiplierT <= 0){ this._multiplier = 1; if(this.cb.onPickup) this.cb.onPickup('multiplier-end'); } }

    const targetX = LANES[this._lane];
    this._playerX += (targetX - this._playerX) * Math.min(1, dt * (this.mult.handling/7));
    if(this._player){
      this._player.position.x = this._playerX;
      this._player.position.y = Math.sin(now*0.02)*0.02;
      this._player.rotation.z = (targetX - this._playerX) * 0.14;
    }

    this._spawnT -= dt;
    const interval = Math.max(0.34, 1.05 - this._time*0.022);
    if(this._spawnT <= 0){
      this._spawnT = interval;
      const l1 = this._spawnObstacle();
      if(this._time > 16 && Math.random() < Math.min(0.5, (this._time-16)*0.02)){
        let l2 = Math.floor(Math.random()*4); if(l2 === l1) l2 = (l1+1)%4;
        this._spawnObstacle(l2);
      }
    }
    this._pickupT -= dt;
    if(this._pickupT <= 0){ this._pickupT = 1.1 + Math.random()*1.0; this._spawnPickup(); }

    const playerHalfW = 0.9;
    for(let i=this._obstacles.length-1; i>=0; i--){
      const o = this._obstacles[i];
      o.mesh.position.z += scroll;
      const gap = Math.abs(o.mesh.position.x - this._playerX) - ((o.mesh.userData.w||1.2) + playerHalfW);
      if(!o.hit && Math.abs(o.mesh.position.z) < 1.5 && gap < 0){ o.hit = true; this._gameOver(); return; }
      if(!o.scored && o.mesh.position.z > 2){
        o.scored = true;
        this._obstacleBonus += 50 * this._multiplier;
        if(gap >= 0 && gap < NEAR_MISS_GAP){
          this._nearMissBonus += 30 * this._multiplier;
          if(this.cb.onPickup) this.cb.onPickup('near-miss');
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

    if(this.cb.onHud) this.cb.onHud({
      time: this._time,
      score: this.currentScore(),
      speed: Math.round(this._speed*5),
      boostPct: this._boostFuel*100,
      multiplierActive: this._multiplier > 1,
      multiplierT: this._multiplierT
    });
  };

  GameEngine.prototype.currentScore = function(){
    return Math.floor(this._dist) + this._obstacleBonus + this._coinCredits + this._nearMissBonus;
  };

  GameEngine.prototype._gameOver = function(){
    this.playing = false;
    const result = { score:this.currentScore(), time:this._time, carId:this.car.id, routeId:this.route.id };
    if(this.cb.onGameOver) this.cb.onGameOver(result);
  };

  DG.GameEngine = GameEngine;
})();
