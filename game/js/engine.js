// Moteur du mini-jeu : route, voiture, obstacles, bonus, score. Ne connaît rien
// du DOM/HUD au-delà des callbacks fournis — game-ui.js s'occupe de l'affichage.
(function(){
  window.DG = window.DG || {};
  const LANES = [-3.3, -1.1, 1.1, 3.3];
  const NEAR_MISS_GAP = 0.85;
  // Vraies voitures/camions de trafic (couleurs d'origine du modele, pas de teinte).
  // len = longueur cible (memes unites que les voitures jouables) : chaque type de
  // vehicule est mis a une taille realiste au lieu d'etre tous normalises pareil.
  const TRAFFIC_FILES = [
    { file:'../uploads/traffic-hatch-green.glb', len:3.3 },
    { file:'../uploads/traffic-hatch-red.glb', len:3.3 },
    { file:'../uploads/traffic-hatch-grey.glb', len:3.3 },
    { file:'../uploads/traffic-sedan-dark.glb', len:3.9 },
    { file:'../uploads/traffic-sedan-grey.glb', len:3.9 },
    { file:'../uploads/traffic-sedan-maroon.glb', len:3.9 },
    { file:'../uploads/traffic-sedan-white.glb', len:3.9 },
    { file:'../uploads/traffic-wagon-dark.glb', len:4.0 },
    { file:'../uploads/traffic-suv-dark.gltf', len:4.2 },
    { file:'../uploads/traffic-suv-grey.glb', len:4.3 },
    { file:'../uploads/traffic-van-orange.glb', len:4.6 },
    { file:'../uploads/traffic-van-white.glb', len:4.6 },
    { file:'../uploads/traffic-van-maroon.glb', len:4.6 },
    { file:'../uploads/traffic-van-red.gltf', len:4.6 },
    { file:'../uploads/traffic-bus-grey.gltf', len:8.0 },
    { file:'../uploads/traffic-bus-white.glb', len:9.0 },
    { file:'../uploads/traffic-truck-semi.glb', len:10.0 },
    { file:'../uploads/traffic-truck-flatbed.gltf', len:11.5 },
  ];

  // Fantome du meilleur run (par voiture+route) : stocke localement, aucun
  // serveur requis. Trace = points {t, dist, x} echantillonnes pendant la partie.
  function ghostKey(carId, routeId){ return 'dg_ghost_' + carId + '_' + routeId; }
  function loadGhost(carId, routeId){
    try { const raw = localStorage.getItem(ghostKey(carId, routeId)); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function saveGhost(carId, routeId, data){
    try { localStorage.setItem(ghostKey(carId, routeId), JSON.stringify(data)); } catch(e){}
  }

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
      // Pas de pos/look fixes : la position/orientation vient de _interiorHolder,
      // ancre a l'habitacle du modele (voir _buildInteriorHolder). pos/look ici ne
      // servent que de repli tant que _interiorHolder n'existe pas encore.
      { name:'INTÉRIEUR', interior:true, pos:[0,2.9,8.4], look:[0,1.0,-30] },
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
    scene.add(camera);
    // Lumiere d'habitacle : accrochee a la camera (suit exactement ce qu'elle regarde),
    // eteinte hors vue interieure. Sans elle, le tableau de bord/volant restent quasi
    // noirs la nuit (seul un reflet ponctuel du ciel/decor est visible — juste "un rayon
    // de lumiere" au lieu d'un habitacle lisible).
    this._camLight = new T.PointLight(0xfff2d8, 0, 2.6, 1.7);
    this._camLight.position.set(0, 0.45, 0.1);
    camera.add(this._camLight);
    this._routeAmbientI = 0.28;

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
    TRAFFIC_FILES.forEach(t=>DG.Loader.loadModel(t.file).then(m=>{
      if(!m) return;
      DG.Loader.boostVisibility(window.THREE, m, 0.055);
      this._trafficModels.push({ model:m, len:t.len });
    }));
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
      this._routeAmbientI = L.ambientI;
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
    this._buildInteriorHolder();

    this._lane = 1; this._playerX = LANES[1];
    this._speed = this.mult.baseSpeed;
    this._boostFuel = 1; this._boostHeld = false; this._boostActive = false;
    this._dist = 0; this._time = 0; this._spawnT = 0.7; this._pickupT = 1.2;
    this._obstacleBonus = 0; this._coinCredits = 0; this._nearMissBonus = 0;
    this._multiplier = 1; this._multiplierT = 0;
    this._personalBest = personalBest || 0;
    this._recordBroken = false;
    this._nearMissStreak = 0;

    // Fantome : charge le meilleur run enregistre pour cette voiture+route, s'il existe.
    if(this._ghostMesh){ this.scene.remove(this._ghostMesh); this._ghostMesh = null; }
    this._ghostData = loadGhost(car.id, routeId);
    this._ghostIdx = 0;
    this._trace = [];
    this._sampleT = 0;
    if(this._ghostData && this._ghostData.trace && this._ghostData.trace.length){
      const ghostMat = new T.MeshStandardMaterial({ color:0x8fd0ff, transparent:true, opacity:0.32, depthWrite:false, emissive:0x2a6f9e, emissiveIntensity:0.6 });
      this._ghostMesh = DG.Loader.makeFallbackCar(T, { body:0x8fd0ff, emissive:0x2a6f9e });
      this._ghostMesh.traverse(n=>{ if(n.isMesh) n.material = ghostMat; });
      this._ghostMesh.visible = false;
      this.scene.add(this._ghostMesh);
    }

    this.playing = true; this.paused = false;
    this.setCamLabel();
  };

  // Camera interieure : ancre un point de vue habitacle au vehicule du joueur.
  // Comme _player garde toujours la meme orientation pendant la course (seul un
  // leger roulis en z change de voie), "l'avant" reste local -Z de _player — pas
  // besoin de deviner le sens comme dans la fiche 3D du garage (voitures libres
  // de tourner dans tous les sens). Si aucun siege/habitacle n'est detecte dans le
  // modele, on retombe sur une hauteur d'oeil generique deduite de la boite englobante.
  GameEngine.prototype._buildInteriorHolder = function(){
    const T = window.THREE;
    const wrap = this._player;
    wrap.updateMatrixWorld(true);
    let seatCenterW = null, interiorCenterW = null;
    wrap.traverse(n=>{
      const nm = n.name || '';
      if(/seat|si[eè]ge/i.test(nm)){
        if(seatCenterW) return;
        const b = new T.Box3().setFromObject(n);
        if(isFinite(b.min.x)){ const c = new T.Vector3(); b.getCenter(c); seatCenterW = c; }
      } else if(/interior|int[ée]rieur|habitacle/i.test(nm)){
        if(interiorCenterW) return;
        const b = new T.Box3().setFromObject(n);
        if(isFinite(b.min.x)){ const c = new T.Vector3(); b.getCenter(c); interiorCenterW = c; }
      }
    });
    let eyeL;
    const baseW = seatCenterW || interiorCenterW;
    if(baseW){
      eyeL = wrap.worldToLocal(baseW.clone()).add(new T.Vector3(0, 0.42, -0.2));
    } else {
      // Aucun siege/habitacle nomme dans le modele (souvent un seul mesh fusionne,
      // carrosserie + interieur, sans sous-objets identifiables) : on ne peut pas
      // reperer une place assise precise, mais on peut quand meme se caler a hauteur
      // de base de pare-brise — assez haut et assez recule pour rester au-dessus du
      // capot (pas de clipping) tout en gardant une vraie sensation d'habitacle
      // (essuie-glaces/capot visibles en bas de cadre), plutot qu'une vue de toit
      // detachee de la voiture.
      const box = new T.Box3().setFromObject(wrap);
      const h = box.max.y - box.min.y;
      const zLen = box.max.z - box.min.z;
      eyeL = new T.Vector3(0, box.min.y + h * 0.74, box.min.z + zLen * 0.38);
    }
    const holder = new T.Object3D();
    holder.position.copy(eyeL);
    wrap.add(holder);
    this._interiorHolder = holder;
  };

  GameEngine.prototype.pause = function(){ if(this.playing){ this.paused = true; if(this.cb.onPauseChange) this.cb.onPauseChange(true); } };
  GameEngine.prototype.resume = function(){ if(this.playing){ this.paused = false; this._last = performance.now(); if(this.cb.onPauseChange) this.cb.onPauseChange(false); } };

  GameEngine.prototype.quit = function(){
    this.playing = false; this.paused = false;
    if(this._player){ this.scene.remove(this._player); this._player = null; }
    this._interiorHolder = null;
    if(this._ghostMesh){ this.scene.remove(this._ghostMesh); this._ghostMesh = null; }
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
    let mesh, w = 0.95;
    const r = Math.random();
    if(r < 0.35 && this._coneModel){
      mesh = DG.Loader.normalizeModel(T, this._coneModel, 1.0, 0);
      w = 0.5;
    } else if(this._trafficModels && this._trafficModels.length){
      let ti = Math.floor(Math.random()*this._trafficModels.length);
      if(this._trafficModels.length > 1 && ti === this._lastTrafficIdx) ti = (ti+1) % this._trafficModels.length;
      this._lastTrafficIdx = ti;
      const t = this._trafficModels[ti];
      mesh = DG.Loader.normalizeModel(T, t.model, t.len, Math.PI);
      // Largeur de collision proportionnelle a la taille du vehicule, plafonnee pour
      // qu'un bus/camion reste toujours doublable depuis la voie d'a cote.
      w = Math.min(1.3, 0.95 * (t.len / 3.6));
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
    // Evite de poser un bonus dans une voie deja bloquee par un obstacle proche :
    // sinon il est litteralement impossible a prendre sans percuter l'obstacle.
    const blockedLanes = new Set();
    for(const o of this._obstacles){
      if(o.mesh.position.z < -95 && o.mesh.position.z > -165){
        const li2 = LANES.indexOf(o.laneX);
        if(li2 !== -1) blockedLanes.add(li2);
      }
    }
    const freeLanes = [0,1,2,3].filter(l=>!blockedLanes.has(l));
    if(!freeLanes.length) return; // toutes les voies occupees : on saute ce cycle
    const li = freeLanes[Math.floor(Math.random()*freeLanes.length)];
    const roll = Math.random();
    const kind = roll < 0.72 ? 'coin' : (roll < 0.88 ? 'nitro' : 'multiplier');
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
    const T = window.THREE;
    const cp = this._camPresets[this._camIndex];
    if(cp.interior && this._interiorHolder){
      // Vue habitacle : la camera est rigidement calee sur le siege (aucun lissage,
      // sinon elle semble flotter hors de la carrosserie pendant les changements de voie).
      const pos = new T.Vector3(); this._interiorHolder.getWorldPosition(pos);
      const quat = new T.Quaternion(); this._interiorHolder.getWorldQuaternion(quat);
      this.camera.position.copy(pos);
      this.camera.quaternion.copy(quat);
      this.camera.fov += (76 - this.camera.fov) * Math.min(1, dt*6);
      this.camera.updateProjectionMatrix();
      if(this._camLight) this._camLight.intensity += (3.4 - this._camLight.intensity) * Math.min(1, dt*6);
      this.ambientLight.intensity += ((this._routeAmbientI + 0.4) - this.ambientLight.intensity) * Math.min(1, dt*6);
    } else {
      const bz = (this.playing && this._boostActive) ? -1.0 : 0;
      const shake = (this.playing && this._boostActive) ? Math.sin(now*0.05)*0.05 : 0;
      this.camera.position.x += (cp.pos[0]+shake - this.camera.position.x)*0.07;
      this.camera.position.y += (cp.pos[1] - this.camera.position.y)*0.07;
      this.camera.position.z += (cp.pos[2]+bz - this.camera.position.z)*0.07;
      this._look.x += (cp.look[0]-this._look.x)*0.07;
      this._look.y += (cp.look[1]-this._look.y)*0.07;
      this._look.z += (cp.look[2]-this._look.z)*0.07;
      this.camera.lookAt(this._look);
      this.camera.fov += (50 - this.camera.fov) * Math.min(1, dt*6);
      this.camera.updateProjectionMatrix();
      if(this._camLight) this._camLight.intensity += (0 - this._camLight.intensity) * Math.min(1, dt*6);
      this.ambientLight.intensity += (this._routeAmbientI - this.ambientLight.intensity) * Math.min(1, dt*6);
    }

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

    // Echantillonne notre propre trace (pour devenir le futur fantome) et fait
    // avancer le fantome existant sur sa propre trace, au meme instant t.
    this._sampleT -= dt;
    if(this._sampleT <= 0){
      this._sampleT = 0.2;
      this._trace.push({ t:this._time, dist:this._dist, x:this._playerX });
    }
    if(this._ghostMesh && this._ghostData){
      const gt = this._ghostData.trace;
      while(this._ghostIdx < gt.length - 1 && gt[this._ghostIdx+1].t <= this._time) this._ghostIdx++;
      const a = gt[this._ghostIdx], b = gt[Math.min(this._ghostIdx+1, gt.length-1)];
      const span = Math.max(0.001, b.t - a.t);
      const f = Math.max(0, Math.min(1, (this._time - a.t) / span));
      const gDist = a.dist + (b.dist - a.dist) * f;
      const gX = a.x + (b.x - a.x) * f;
      const relZ = -(gDist - this._dist);
      if(this._time <= gt[gt.length-1].t + 1 && relZ > -140 && relZ < 20){
        this._ghostMesh.visible = true;
        this._ghostMesh.position.set(gX, 0, relZ);
      } else {
        this._ghostMesh.visible = false;
      }
    }

    this._spawnT -= dt;
    const interval = Math.max(0.42, 1.0 - this._time*0.018);
    if(this._spawnT <= 0){
      this._spawnT = interval;
      const l1 = this._spawnObstacle();
      if(this._time > 18 && Math.random() < Math.min(0.4, (this._time-18)*0.016)){
        // Les deux obstacles d'une meme vague apparaissent au meme endroit (z=-134) et
        // avancent ensuite a la meme vitesse : ils restent donc cote a cote a l'ecran
        // pendant toute leur traversee. Une voie d'ecart ne suffit pas — un camion/bus
        // est assez large pour deborder sur la voie voisine et masquer/chevaucher le
        // vehicule qui s'y trouve. On impose donc au moins 2 voies d'ecart entre les
        // deux vehicules d'une meme vague.
        const farLanes = [0,1,2,3].filter(l=>Math.abs(l-l1) >= 2);
        const l2 = farLanes[Math.floor(Math.random()*farLanes.length)];
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
    const score = this.currentScore();
    const carId = this.car.id, routeId = this.route.id;
    if(!this._ghostData || score > this._ghostData.score){
      this._trace.push({ t:this._time, dist:this._dist, x:this._playerX });
      saveGhost(carId, routeId, { score, trace:this._trace });
    }
    const result = { score, time:this._time, carId, routeId };
    if(this.cb.onGameOver) this.cb.onGameOver(result);
  };

  DG.GameEngine = GameEngine;
})();
