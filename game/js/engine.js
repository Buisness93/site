// Moteur du mini-jeu : route, voiture, obstacles, bonus, score. Ne connaît rien
// du DOM/HUD au-delà des callbacks fournis — game-ui.js s'occupe de l'affichage.
(function(){
  window.DG = window.DG || {};
  const LANES = [-3.3, -1.1, 1.1, 3.3];

  // Virages et collines facon "monde courbe" : la route reste droite pour la
  // logique du jeu (voies, collisions), mais au dessin chaque sommet est decale
  // selon le carre de sa distance a la camera (lateralement = virage, en
  // hauteur = bosse/creux). Tout le decor, le trafic et les bonus suivent la
  // meme courbe, sans rien changer au gameplay ni aux collisions. Distance
  // plafonnee : au loin, montagnes et skyline glissent d'un bloc (comme quand
  // on tourne) au lieu de partir a l'infini.
  const BEND = { value:null };
  // Creux successifs (Route 66...) : ondulation le long de la distance qui
  // avance vers la camera ; nulle pres de la voiture (le jeu reste a plat)
  // et au loin (horizon et montagnes ne bougent pas). x = amplitude,
  // y = nombre d'onde, z = phase (liee a la distance parcourue).
  const DIP = { value:null };
  const BEND_GLSL = [
    '{',
    '  float bzd = max(-mvPosition.z, 0.0);',
    '  float bdx = min(bzd, 120.0), bdy = min(bzd, 100.0);',
    '  mvPosition.x += uBend.x * bdx * bdx;',
    '  mvPosition.y += uBend.y * bdy * bdy;',
    '  mvPosition.y += uDip.x * sin(uDip.y * bzd + uDip.z) * smoothstep(14.0, 44.0, bzd) * (1.0 - smoothstep(170.0, 230.0, bzd));',
    '  gl_Position = projectionMatrix * mvPosition;',
    '}'
  ].join('\n');
  function bendMaterial(m){
    if(!m || m.userData.dgBend || m.isShaderMaterial || m.isRawShaderMaterial) return;
    m.userData.dgBend = true;
    // Certains materiaux ont deja leur propre crochet (ex. extension glTF
    // "specular-glossiness", qui y ajoute ses uniformes) : on l'enchaine au
    // lieu de l'ecraser, sinon three.js plante en rafraichissant ces uniformes.
    const prev = m.onBeforeCompile, prevKey = prev.toString();
    m.customProgramCacheKey = function(){ return 'dgBend|' + prevKey; };
    m.onBeforeCompile = function(sh, renderer){
      prev.call(this, sh, renderer);
      sh.uniforms.uBend = BEND; sh.uniforms.uDip = DIP;
      let vs = sh.vertexShader;
      if(vs.indexOf('#include <project_vertex>') !== -1) vs = vs.replace('#include <project_vertex>', '#include <project_vertex>\n' + BEND_GLSL);
      else if(vs.indexOf('gl_Position = projectionMatrix * mvPosition;') !== -1) vs = vs.replace('gl_Position = projectionMatrix * mvPosition;', 'gl_Position = projectionMatrix * mvPosition;\n' + BEND_GLSL); // sprites
      else return;
      sh.vertexShader = 'uniform vec2 uBend;\nuniform vec3 uDip;\n' + vs;
    };
    m.needsUpdate = true;
  }
  function bendScene(root){
    root.traverse(n=>{
      const m = n.material;
      if(!m) return;
      if(Array.isArray(m)) m.forEach(bendMaterial); else bendMaterial(m);
    });
  }
  // Relief le long de la distance parcourue : bosses et creux
  function hillAt(d){ return Math.sin(d*0.0034 + 0.6) * 0.7 + Math.sin(d*0.0013 + 2.2) * 0.3; }
  const HILL_Y = 0.00032;
  const JUMP_V = 9.5, GRAVITY = 24;

  // Reflets de carrosserie : petite carte d'environnement peinte avec les
  // couleurs du ciel de la route (zenith -> horizon -> sol sombre) et un point
  // chaud a la place de l'astre. Sans elle, la peinture des voitures reste mate
  // et "plastique" ; avec, elle reflete le ciel comme une vraie carrosserie.
  function skyEnvCanvas(T, route){
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const sky = route.sky || { top:0x020207, bottom:0x121a2e };
    const hex = (h)=>'#' + DG.Scenery.lin2srgb(h).toString(16).padStart(6, '0');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, hex(sky.top));
    gr.addColorStop(0.3, hex(sky.mid != null ? sky.mid : sky.top));
    gr.addColorStop(0.49, hex(sky.bottom));
    gr.addColorStop(0.52, hex(route.fog));
    gr.addColorStop(0.62, hex(route.ground || 0x101010));
    gr.addColorStop(1, '#050505');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    // bande claire au-dessus de l'horizon (ciel lumineux / lampadaires)
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 50, 256, 6);
    const cel = route.celestial;
    if(cel){
      const x = (0.5 + Math.atan2(cel.x, -254) / (Math.PI * 2)) * 256 % 256, y = 64 - Math.atan2(cel.y, 254) / Math.PI * 128;
      const sg = g.createRadialGradient(x, y, 0, x, y, 26);
      sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(1, 'rgba(255,250,235,0)');
      g.fillStyle = sg; g.fillRect(x - 26, y - 26, 52, 52);
    }
    const t = new T.CanvasTexture(c);
    t.mapping = T.EquirectangularReflectionMapping; t.encoding = T.sRGBEncoding;
    return t;
  }
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


  function asphaltTexture(T){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    for(let i=0;i<img.data.length;i+=4){
      const v = 150 + Math.random()*80 + (Math.random() < 0.03 ? 25 : 0);
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
    }
    g.putImageData(img, 0, 0);
    // traces d'usure longitudinales dans l'axe des roues
    g.globalAlpha = 0.08; g.fillStyle = '#000';
    [40, 90, 166, 216].forEach(x=>g.fillRect(x, 0, 14, 256));
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(2, 60);
    tex.anisotropy = 4;
    return tex;
  }

  let _glowTex = null;
  function glow(T){
    if(_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(.3,'rgba(255,255,255,.4)'); grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0,0,64,64);
    return (_glowTex = new T.CanvasTexture(c));
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
    this._ramps = [];
    this._jumpY = 0; this._jumpVy = 0;
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
    BEND.value = new T.Vector2(0, 0); DIP.value = new T.Vector3(0, 0, 0);
    this._bendD = 0;
    const renderer = new T.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min((window.devicePixelRatio||1) < 1.5 ? (window.devicePixelRatio||1) * 1.25 : (window.devicePixelRatio||1), 2));
    renderer.setSize(w, h);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    // Ombres portees temps reel, limitees a la voiture et au trafic (voir
    // _castShadows) sur une petite zone qui suit le joueur : peu couteux, mais
    // les voitures sont enfin "posees" sur la route.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
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
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const sc = this.keyLight.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 22; sc.bottom = -16; sc.near = 1; sc.far = 60;
    this.keyLight.shadow.bias = -0.0008; this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.target.position.set(0, 0, -6); scene.add(this.keyLight.target);
    this.hemiLight = new T.HemisphereLight(0x8899ff, 0x060608, 0.45); scene.add(this.hemiLight);

    this.groundMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.05, roughness:0.95 });
    // (longs plans subdivises dans la longueur : un plan en 1 seul morceau ne
    // pourrait pas suivre la courbure des virages/collines)
    const ground = new T.Mesh(new T.PlaneGeometry(340, 320, 12, 64), this.groundMat);
    ground.rotation.x = -Math.PI/2; ground.position.set(0, -0.03, -100); ground.receiveShadow = true; scene.add(ground);

    // Asphalte : grain procedural qui defile avec la vitesse (sinon la route
    // parait peinte et immobile sous les bandes qui, elles, bougent).
    this._roadTex = asphaltTexture(T);
    this.roadMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.35, roughness:0.7, map:this._roadTex, roughnessMap:this._roadTex });
    const road = new T.Mesh(new T.PlaneGeometry(14, 260, 2, 104), this.roadMat);
    road.rotation.x = -Math.PI/2; road.position.z = -100; road.receiveShadow = true; scene.add(road);

    // Ciel en degrade calcule au pixel (4 teintes + halo autour de l'astre +
    // tramage anti-bandes) : l'horizon prend exactement la couleur du brouillard,
    // si bien que le sol/la mer embrumes se fondent dans le ciel sans ligne dure.
    this._skyU = {
      top:{ value:new T.Color() }, mid:{ value:new T.Color() }, bottom:{ value:new T.Color() }, haze:{ value:new T.Color() },
      sunDir:{ value:new T.Vector3(0, 0.2, -1).normalize() }, sunCol:{ value:new T.Color(0) }, band:{ value:0.07 }
    };
    this._skyDome = new T.Mesh(
      new T.SphereGeometry(280, 32, 16),
      new T.ShaderMaterial({
        uniforms:this._skyU, side:T.BackSide, fog:false, depthWrite:false,
        vertexShader:'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:[
          'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 haze; uniform vec3 sunDir; uniform vec3 sunCol; uniform float band;',
          'varying vec3 vDir;',
          'void main(){',
          '  vec3 d = normalize(vDir); float el = d.y; vec3 c = haze;',
          '  if(el > 0.0){',
          '    vec3 up = el < 0.32 ? mix(bottom, mid, smoothstep(band * 0.6, 0.32, el)) : mix(mid, top, pow(smoothstep(0.32, 1.0, el), 0.8));',
          '    c = mix(haze, up, smoothstep(0.0, band, el));',
          '  }',
          '  float s = max(dot(d, sunDir), 0.0);',
          '  c += sunCol * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.55) * smoothstep(0.0, 0.05, el);',
          '  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 180.0;',
          '  gl_FragColor = vec4(c, 1.0);',
          '  #include <tonemapping_fragment>',
          '  #include <encodings_fragment>',
          '}'
        ].join('\n')
      })
    );
    this._skyDome.renderOrder = -10;
    scene.add(this._skyDome);
    this._tickers = [];
    this._scrollTex = [];

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
      const edge = new T.Mesh(new T.BoxGeometry(0.16,0.18,260, 1, 1, 104), this.edgeMat);
      edge.position.set(x, 0.12, -100); scene.add(edge);
      return edge;
    });

    // Lignes de rive continues (comme sur une vraie 2x4 voies)
    this.edgeLineMat = new T.MeshBasicMaterial({ color:0xd8dee6 });
    [-4.45, 4.45].forEach(x=>{
      const l = new T.Mesh(new T.PlaneGeometry(0.14, 260, 1, 104), this.edgeLineMat);
      l.rotation.x = -Math.PI/2; l.position.set(x, 0.021, -100); scene.add(l);
    });

    this.fx = DG.GameFX ? new DG.GameFX(this) : null;
    this._routeExtras = [];
    // Nettete : sur un ecran "1x" on rend un peu plus fin que l'ecran (supersampling
    // 1.25x, les aretes et le bitume restent nets) ; sur un ecran haute densite on
    // monte jusqu'a 2x. La resolution adaptative ne descend sous la definition
    // native de l'ecran qu'en dernier recours (machine vraiment a la peine).
    const dpr = window.devicePixelRatio || 1;
    this._maxPR = Math.min(dpr < 1.5 ? dpr * 1.25 : dpr, 2);
    this._minPR = Math.min(this._maxPR, Math.max(0.75, Math.min(dpr, 1)));
    this._pr = this._maxPR;
    this._frameAvg = 16.7; this._prCheckT = 0; this._prHoldT = 0; this._frameBase = 0;
    this._aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);

    // Phares du joueur : un seul spot (couteux sinon), accroche a la voiture au depart.
    this._headlight = new T.SpotLight(0xfff1dc, 0, 48, 0.42, 0.65, 1.4);
    this._headlightTarget = new T.Object3D();
    this._headlight.target = this._headlightTarget;
    this._headlightI = 2.2;
    scene.add(this._headlight); scene.add(this._headlightTarget);

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
    this.renderer.setPixelRatio(this._pr || 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
  };

  GameEngine.prototype._applySky = function(route){
    const U = this._skyU, sky = route.sky || { top:0x020207, bottom:0x121a2e };
    U.top.value.setHex(sky.top);
    U.bottom.value.setHex(sky.bottom);
    if(sky.mid != null) U.mid.value.setHex(sky.mid); else U.mid.value.setHex(sky.bottom).lerp(U.top.value, 0.4);
    U.haze.value.setHex(sky.haze != null ? sky.haze : route.fog);
    U.band.value = sky.band || 0.07;
    const c = route.celestial;
    if(c){
      U.sunDir.value.set(c.x, c.y, -254).normalize();
      U.sunCol.value.setHex(sky.glow != null ? sky.glow : c.halo).multiplyScalar(sky.glowI != null ? sky.glowI : 0.6);
    } else U.sunCol.value.setRGB(0, 0, 0);
  };

  // Libere tout ce qu'un objet (et ses enfants) possede sur le GPU.
  function disposeDeep(o){
    o.traverse(n=>{
      if(n.geometry) n.geometry.dispose();
      if(n.material){
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m=>{ if(m.emissiveMap) m.emissiveMap.dispose(); if(m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  // Fusionne les pieces fixes d'un bloc de decor (immeuble + enseignes + lampadaire...)
  // en UN maillage par materiau. Le bloc defile d'un seul tenant, donc ses pieces
  // ne bougent jamais entre elles : on passe de ~9 appels de dessin par bloc a 2-4.
  // C'etait le premier poste de cout du rendu (plus de la moitie du temps par image
  // sur un GPU integre). Les pieces animees par userData.tick sont detectees en
  // rejouant l'animation a plusieurs instants, et laissees telles quelles.
  function countMeshes(root){ let c = 0; root.traverse(n=>{ if(n.isMesh) c++; }); return c; }
  function mergeStatic(T, root){
    root.userData._mc = -1;
    root.updateMatrixWorld(true);
    const snap = new Map();
    const take = ()=>{ const m = new Map(); root.traverse(n=>m.set(n, n.matrix.elements.join(',') + (n.visible ? 1 : 0) + (n.material && n.material.uuid || ''))); return m; };
    const dynamic = new Set();
    if(root.userData.tick){
      const before = take();
      [0.37, 1.91, 4.3, 7.7, 11.2].forEach(t=>{ root.userData.tick(t, 0.016); root.traverse(n=>n.updateMatrix()); });
      const after = take();
      root.traverse(n=>{ if(n !== root && before.get(n) !== after.get(n)) dynamic.add(n); });
    }
    const isDynamic = (n)=>{ for(let p = n; p && p !== root; p = p.parent) if(dynamic.has(p) || !p.visible) return true; return false; };
    const inv = new T.Matrix4().copy(root.matrixWorld).invert();
    const groups = new Map();
    root.traverse(n=>{
      if(!n.isMesh || n.isInstancedMesh || n.isSkinnedMesh || Array.isArray(n.material) || !n.geometry || !n.geometry.attributes.position) return;
      if(n.morphTargetInfluences || n.onBeforeRender !== T.Object3D.prototype.onBeforeRender || isDynamic(n)) return;
      const g = n.geometry;
      const mtx = new T.Matrix4().multiplyMatrices(inv, n.matrixWorld);
      if(mtx.determinant() < 0) return; // miroir : l'ordre des faces s'inverserait
      // (les "groups" des BoxGeometry etc. n'importent pas : un seul materiau couvre tout)
      const key = n.material.uuid + '|' + Object.keys(g.attributes).sort().join(',') + '|' + n.renderOrder;
      let list = groups.get(key); if(!list){ list = []; groups.set(key, list); }
      list.push({ n, mtx });
    });
    groups.forEach(list=>{
      if(list.length < 2) return;
      const names = Object.keys(list[0].n.geometry.attributes);
      // Chaque piece est d'abord recopiee en flottants 32 bits "a plat" (sans index),
      // PUIS transformee. Les modeles .glb compresses stockent leurs sommets en
      // entiers 16 bits, parfois entrelaces : leur appliquer la matrice en place
      // (ou passer par toNonIndexed, qui ignore l'entrelacement) debordait et
      // projetait des triangles noirs geants dans le decor.
      const GET = ['getX', 'getY', 'getZ', 'getW'];
      const DIV = { Uint8Array:255, Int8Array:127, Uint16Array:65535, Int16Array:32767 };
      const parts = list.map(({ n, mtx })=>{
        const src = n.geometry, idx = src.index, count = idx ? idx.count : src.attributes.position.count;
        const g = new T.BufferGeometry();
        for(const name of names){
          const a = src.attributes[name];
          const raw = a.isInterleavedBufferAttribute ? a.data.array : a.array;
          const div = a.normalized ? (DIV[raw.constructor.name] || 1) : 1;
          const arr = new Float32Array(count * a.itemSize);
          for(let i = 0, o = 0; i < count; i++){
            const v = idx ? idx.getX(i) : i;
            for(let c = 0; c < a.itemSize; c++) arr[o++] = a[GET[c]](v) / div;
          }
          g.setAttribute(name, new T.BufferAttribute(arr, a.itemSize, false));
        }
        g.applyMatrix4(mtx);
        return g;
      });
      const out = new T.BufferGeometry();
      for(const name of names){
        const size = parts[0].attributes[name].itemSize;
        let total = 0; parts.forEach(g=>{ total += g.attributes[name].array.length; });
        const arr = new Float32Array(total);
        let o = 0;
        parts.forEach(g=>{ arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; });
        out.setAttribute(name, new T.BufferAttribute(arr, size, false));
      }
      parts.forEach(g=>g.dispose());
      out.computeBoundingSphere();
      const m = new T.Mesh(out, list[0].n.material);
      m.renderOrder = list[0].n.renderOrder;
      m.name = 'dgMerged';
      root.add(m);
      // Les geometries d'origine peuvent etre partagees (cache) : on les retire sans les liberer.
      list.forEach(({ n })=>n.parent.remove(n));
    });
    root.userData._mc = countMeshes(root);
  }

  GameEngine.prototype.setRoute = function(routeId){
    const T = window.THREE;
    const route = DG.routeById(routeId);
    this.route = route;
    this._decor.forEach(o=>{ this.scene.remove(o); disposeDeep(o); });
    this._decor = [];
    this.scene.fog = new T.Fog(route.fog, route.fogNear, route.fogFar);
    this.renderer.toneMappingExposure = route.exposure || 1.05;
    this.roadMat.color.setHex(route.road);
    this.stripeMat.color.setHex(route.stripe);
    this.edgeMat.color.setHex(route.edge);
    this.edgeMat.emissive.setHex(route.edgeEmissive);
    this.groundMat.color.setHex(route.ground != null ? route.ground : route.road);
    // Sol texture (herbe, sable...) qui defile a la meme vitesse que la route.
    const gt = route.groundTex ? route.groundTex(T) : null;
    if(gt){ gt.tex.repeat.set(gt.rx, gt.ry); this._groundK = gt.ry / 320; }
    this.groundMat.map = gt ? gt.tex : null;
    this.groundMat.needsUpdate = true;
    this._applySky(route);
    // Chaussee mouillee : vrais reflets colores via une carte d'environnement
    // procedurale (PMREM calcule une seule fois par route, puis garde en cache).
    let env = null;
    if(route.roadEnv){
      if(!route._envRT){
        const pm = new T.PMREMGenerator(this.renderer);
        const src = route.roadEnv(T);
        route._envRT = pm.fromEquirectangular(src);
        src.dispose(); pm.dispose();
      }
      env = route._envRT.texture;
    }
    this.roadMat.envMap = env;
    this.roadMat.envMapIntensity = route.roadEnvI || 1;
    this.roadMat.needsUpdate = true;
    this._env = env;
    if(!route._carEnvRT){
      const pm = new T.PMREMGenerator(this.renderer);
      const src = route.roadEnv ? route.roadEnv(T) : skyEnvCanvas(T, route);
      route._carEnvRT = pm.fromEquirectangular(src);
      src.dispose(); pm.dispose();
    }
    this._carEnv = route._carEnvRT.texture;
    if(route.light){
      const L = route.light;
      this.keyLight.color.setHex(L.key); this.keyLight.intensity = L.keyI;
      this.hemiLight.color.setHex(L.hemiSky); this.hemiLight.groundColor.setHex(L.hemiGround); this.hemiLight.intensity = L.hemiI;
      this.ambientLight.color.setHex(L.ambient); this.ambientLight.intensity = L.ambientI;
      this._routeAmbientI = L.ambientI;
    }
    this.roadMat.roughness = route.wet ? 0.32 : 0.78;
    this.roadMat.metalness = route.wet ? 0.55 : 0.3;
    this.edgeLineMat.color.setHex(route.stripe);
    this._headlightI = route.headlights != null ? route.headlights : 2.2;
    this._buildRouteExtras(route);
    const DECOR_N = 16;
    this._decor = route.buildDecor(T, this.scene, DECOR_N) || [];
    this._decorWrap = (route.spacing || 8.5) * DECOR_N;
    this._decor.forEach(d=>mergeStatic(T, d));
    this._sharpenTextures(this.scene);
    this._prewarm();
  };

  // Filtrage anisotrope sur toutes les textures : sans lui, le bitume, les
  // marquages et le sol deviennent flous des quelques metres (angle rasant).
  GameEngine.prototype._sharpenTextures = function(root){
    const a = this._aniso || 1;
    if(a <= 1) return;
    const KEYS = ['map', 'roughnessMap', 'emissiveMap', 'normalMap', 'metalnessMap', 'alphaMap', 'bumpMap'];
    root.traverse(n=>{
      const mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : null;
      if(!mats) return;
      for(const m of mats) for(const k of KEYS){
        const t = m[k];
        if(t && t.anisotropy < a && !t.isRenderTargetTexture){ t.anisotropy = a; t.needsUpdate = true; }
      }
    });
  };

  // Compile les shaders de tout ce qui peut apparaitre en course (trafic, cones,
  // bonus) AVANT le depart : sinon chaque premiere apparition d'un modele fige
  // l'image le temps que le GPU compile son materiau (la "saccade" en course).
  GameEngine.prototype._prewarm = function(){
    const T = window.THREE;
    if(!this.renderer || !this.scene) return;
    const tmp = [];
    bendScene(this.scene);
    // Poses devant la camera : un rendu reel (hors ecran, dans une petite cible)
    // envoie aussi leurs textures au GPU — compile() seul ne le fait pas.
    const put = (o)=>{ if(!o) return; o.position.set((tmp.length % 9 - 4) * 1.6, 0.5, -14 - Math.floor(tmp.length / 9) * 4); this.scene.add(o); tmp.push(o); };
    if(this._coneModel) put(this._instance(this._coneModel, 1.0, 0, false));
    (this._trafficModels || []).forEach(t=>put(this._instance(t.model, t.len, Math.PI, true)));
    put(this._rampMesh());
    ['coin', 'nitro', 'multiplier', 'magnet', 'shield'].forEach(kind=>{
      if(!this._pickupProto) this._pickupProto = {};
      if(!this._pickupProto[kind]){
        const proto = pickupMesh(T, kind);
        if(this.fx) this.fx.decoratePickup(proto, kind);
        this._pickupProto[kind] = proto;
      }
      put(this._pickupProto[kind].clone(true));
    });
    tmp.forEach(o=>this._sharpenTextures(o));
    bendScene(this.scene);
    try {
      this.renderer.compile(this.scene, this.camera);
      if(!this._warmRT){ this._warmRT = new T.WebGLRenderTarget(64, 64); this._warmRT.texture.encoding = T.sRGBEncoding; } // meme variante de shader que l'ecran
      const prev = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this._warmRT);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(prev);
    } catch(e){}
    tmp.forEach(o=>{ this.scene.remove(o); this._release(o); });
  };

  // Reserve de vehicules deja construits : on recycle au lieu de cloner a chaque
  // apparition (moins d'allocations = moins de pauses du ramasse-miettes).
  GameEngine.prototype._release = function(mesh){
    const key = mesh && mesh.userData.tplKey;
    if(!key) return;
    this._pool = this._pool || new Map();
    let list = this._pool.get(key);
    if(!list){ list = []; this._pool.set(key, list); }
    if(list.length < 8) list.push(mesh);
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
    this._obstacles.forEach(o=>{ this.scene.remove(o.mesh); this._release(o.mesh); }); this._obstacles = [];
    this._pickups.forEach(p=>this.scene.remove(p.mesh)); this._pickups = [];
    this._ramps.forEach(r=>this.scene.remove(r.mesh)); this._ramps = [];

    const model = await DG.Loader.loadModel('../' + car.model);
    this._player = model ? DG.Loader.normalizeModel(T, model, 3.4, Math.PI - (car.rotY||0)) : DG.Loader.makeFallbackCar(T, { body:car.body, emissive:0x0a0e16 });
    this._player.position.set(0,0,0);
    this._carLook(this._player);
    this._addVehicleLights(this._player);
    // feux arriere du joueur : materiau a part, pour s'allumer au freinage
    this._playerTailMat = this._tailMat.clone(); this._playerTailMat.opacity = 0.5;
    this._player.traverse(n=>{ if(n.isSprite && n.material === this._tailMat) n.material = this._playerTailMat; });
    this.scene.add(this._player);
    this._sharpenTextures(this._player);
    this._buildInteriorHolder();
    if(this.fx) this.fx.attachPlayer(this._player, car);
    this._player.add(this._headlightTarget);
    this._headlightTarget.position.set(0, 0, -26);
    this._crash = null;
    this._countdown = 3.0; this._countStep = 4;
    this._drafting = false;

    this._lane = 1; this._playerX = LANES[1];
    this._brake = false;
    this._roll = 0; this._yaw = 0; this._pitch = 0;
    this._speed = this.mult.baseSpeed;
    this._boostFuel = 1; this._boostHeld = false; this._boostActive = false;
    this._dist = 0; this._time = 0; this._spawnT = 0.7; this._pickupT = 1.2;
    this._obstacleBonus = 0; this._coinCredits = 0; this._nearMissBonus = 0;
    this._multiplier = 1; this._multiplierT = 0;
    this._jumpY = 0; this._jumpVy = 0; this._rampT = 6; this._magnetT = 0; this._shield = false;
    if(this._toll){ this.scene.remove(this._toll.mesh); this._toll = null; }
    this._journeyReset();
    // bulle du bouclier autour de la voiture (visible quand il est actif)
    if(!this._shieldFx){
      this._shieldFx = new T.Mesh(new T.SphereGeometry(2.3, 24, 16), new T.MeshBasicMaterial({ color:0x3dffb0, transparent:true, opacity:.16, blending:T.AdditiveBlending, depthWrite:false }));
      this._shieldFx.scale.set(1, 1, 1);
    }
    this._shieldFx.visible = false; this._shieldFx.position.set(0, 0.7, 0);
    this._player.add(this._shieldFx);
    this._personalBest = personalBest || 0;
    this._recordBroken = false;
    this._nearMissStreak = 0;
    // Suit le temps recemment passe dans chaque voie (moyenne glissante, se
    // desactive avec le temps) : sert a reperer la "planque" du joueur — les 2
    // voies ou il se contente de rester — pour l'en deloger explicitement au
    // lieu de bloquer 2 voies au hasard (voir la vague double dans _update).
    this._laneUse = [0, 0, 0, 0];

    this._decor.forEach(d=>{ if(countMeshes(d) !== d.userData._mc) mergeStatic(T, d); });
    this._prewarm();
    this._last = performance.now();
    this._frameBase = 0; this._frameAvg = 16.7; this._prCheckT = 0; this._prHoldT = 0;
    this.playing = true; this.paused = false;
    this.setCamLabel();
  };

  // Decor fixe (ne defile pas) : astres, etoiles, pluie, halo de ville.
  GameEngine.prototype._buildRouteExtras = function(route){
    const T = window.THREE;
    this._routeExtras.forEach(o=>{ this.scene.remove(o); disposeDeep(o); });
    this._routeExtras = [];
    this._tickers = [];
    this._scrollTex = [];
    this._rain = null;
    const add = (o)=>{ this.scene.add(o); this._routeExtras.push(o); return o; };
    const sprite = (color, size, x, y, z, op)=>{
      const s = new T.Sprite(new T.SpriteMaterial({ map:glow(T), color, transparent:true, opacity:op==null?1:op, blending:T.AdditiveBlending, depthWrite:false, fog:false }));
      s.scale.set(size, size, 1); s.position.set(x, y, z); return add(s);
    };
    if(route.stars){
      // 2 couches : poussiere d'etoiles fine + quelques etoiles vives qui scintillent,
      // plus denses vers le zenith et le long d'une "voie lactee" diagonale.
      const mk = (n, size, op, bright)=>{
        const pos = new Float32Array(n*3), col = new Float32Array(n*3), tint = new T.Color();
        for(let i=0;i<n;i++){
          let a = Math.random()*Math.PI*2, e = 0.06 + Math.pow(Math.random(), 0.8)*1.35;
          if(!bright && i % 3 === 0){ a = -1.2 + Math.random()*2.4; e = 0.25 + (a + 1.2) * 0.42 + (Math.random()-.5)*0.18; }
          const r = 250;
          pos[i*3] = Math.cos(a)*Math.cos(e)*r; pos[i*3+1] = Math.sin(e)*r; pos[i*3+2] = Math.sin(a)*Math.cos(e)*r - 60;
          tint.setHSL(Math.random() < 0.5 ? 0.6 : 0.1, 0.35, 0.72 + Math.random()*0.28);
          col[i*3] = tint.r; col[i*3+1] = tint.g; col[i*3+2] = tint.b;
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
        return add(new T.Points(g, new T.PointsMaterial({ size, sizeAttenuation:false, vertexColors:true, transparent:true, opacity:op, fog:false, depthWrite:false })));
      };
      mk(1100, 1.1, .75, false);
      const bright = mk(110, 2.3, .95, true);
      this._tickers.push((dt, t)=>{ bright.material.opacity = 0.78 + Math.sin(t*2.3)*0.12 + Math.sin(t*5.1)*0.06; });
    }
    const c = route.celestial;
    if(c){
      sprite(c.halo, c.size*3.2, c.x, c.y, -255, c.haloOp || .45);
      if(c.tex){
        const disc = new T.Sprite(new T.SpriteMaterial({ map:c.tex(T), color:0xffffff, transparent:true, depthWrite:false, fog:false }));
        disc.scale.set(c.size, c.size, 1); disc.position.set(c.x, c.y, -254); add(disc);
      } else sprite(c.color, c.size, c.x, c.y, -254, 1);
    }
    // Decor fixe propre a la route (silhouettes lointaines, nuages, mer...) :
    // la route peut aussi enregistrer des animations legeres (tick) et des
    // textures a faire defiler avec la vitesse (scrollTex, k = repetitions/unite).
    if(route.extras){
      route.extras(T, {
        add, env:this._env,
        tick:(f)=>this._tickers.push(f),
        scrollTex:(tex, k)=>this._scrollTex.push({ tex, k }),
        // distance parcourue par le decor pendant la derniere image (particules
        // qui doivent "rester dans le monde" et defiler avec la route)
        scroll:()=>this._lastScroll || 0
      });
    }
    if(route.horizonGlow){
      const h = route.horizonGlow;
      const s = sprite(h.color, 1, h.x || 0, h.y || 6, -240, h.op || .5);
      s.scale.set(h.w || 260, h.h || 40, 1);
    }
    if(route.rain){
      const n = 900, pos = new Float32Array(n*6), seeds = [];
      for(let i=0;i<n;i++) seeds.push({ x:(Math.random()-.5)*34, y:Math.random()*18, z:-70 + Math.random()*82, v:26 + Math.random()*10 });
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      const lines = add(new T.LineSegments(g, new T.LineBasicMaterial({ color:0xb8c8ff, transparent:true, opacity:.32, blending:T.AdditiveBlending, depthWrite:false })));
      lines.frustumCulled = false;
      this._rain = { lines, pos, seeds };
    }
  };

  GameEngine.prototype._updateRain = function(dt, scroll){
    const r = this._rain; if(!r) return;
    const slant = 0.06 + Math.min(0.5, scroll * 0.9);
    for(let i=0;i<r.seeds.length;i++){
      const s = r.seeds[i];
      s.y -= s.v * dt; s.z += scroll * 0.6;
      if(s.y < 0 || s.z > 12){ s.y = 14 + Math.random()*6; s.z = -70 + Math.random()*80; s.x = (Math.random()-.5)*34; }
      const j = i*6;
      r.pos[j] = s.x; r.pos[j+1] = s.y; r.pos[j+2] = s.z;
      r.pos[j+3] = s.x; r.pos[j+4] = s.y + 0.55; r.pos[j+5] = s.z - slant;
    }
    r.lines.geometry.attributes.position.needsUpdate = true;
  };

  // Camera "capot" : point de vue fixe juste au-dessus du capot, centre, comme
  // dans la plupart des jeux de course (hood cam) — au lieu de deviner un siege/
  // volant par nom de mesh (fragile et incoherent selon les exports, parfois
  // place hors de la voiture ou tourne vers l'arriere). Meme calcul pour toutes
  // les voitures : fiable, previsible, et pas de detection a corriger par modele.
  // Comme _player garde toujours la meme orientation pendant la course (seul un
  // leger roulis en z change de voie), "l'avant" reste local -Z de _player.
  GameEngine.prototype._buildInteriorHolder = function(){
    const T = window.THREE;
    const wrap = this._player;
    wrap.updateMatrixWorld(true);
    const box = DG.Loader.worldBox(T, wrap);
    const zLen = box.max.z - box.min.z;
    const xLen = box.max.x - box.min.x;
    // Quelques exports (ex: Supra Dekztrax) embarquent un residu de geometrie
    // invisible/degenerescente qui couvre a lui seul toute la longueur ET toute
    // la largeur de la voiture, et gonfle enormement la hauteur mesuree (plus de
    // 2x la longueur, alors qu'aucune carrosserie reelle n'est aussi haute) : sans
    // filtre, la camera capot calculee a partir de cette hauteur se retrouve a
    // flotter tres au-dessus du vehicule. Un vrai panneau de carrosserie (capot,
    // portiere, aileron...) ne couvre jamais a lui seul tout l'empreinte au sol de
    // la voiture ; on ignore donc, pour la hauteur, tout maillage qui le fait —
    // presque toujours un residu/proxy, jamais une piece visible de la caisse.
    let maxBodyY = box.min.y;
    wrap.traverse(n=>{
      if(!n.isMesh) return;
      const b = DG.Loader.worldBox(T, n);
      if(!isFinite(b.max.y)) return;
      if((b.max.x-b.min.x) > xLen*0.9 && (b.max.z-b.min.z) > zLen*0.9) return;
      if(b.max.y > maxBodyY) maxBodyY = b.max.y;
    });
    const h = maxBodyY - box.min.y;
    // La largeur de collision suivait une constante fixe (0.55) qui ne correspondait
    // pas aux voitures "widebody" (GT3 RS, M4 Widebody...) : leur carrosserie visuelle
    // depassait la zone de collision, donnant l'impression de "passer a travers" les
    // obstacles avant meme un vrai contact. On la derive maintenant de la largeur reelle
    // du modele charge.
    this._playerHalfW = Math.max(0.42, Math.min(0.95, xLen/2 * 0.86));
    // Centree en X (pas de cote conducteur), tres pres du sommet de la caisse
    // (hauteur du bas de pare-brise, au-dessus du volant/tableau de bord) et vers
    // l'avant du vehicule (au-dessus du capot, pas au milieu de l'habitacle) :
    // le capot reste visible en bas de cadre, vue road-clear comme dans la
    // plupart des jeux de course.
    const eyeL = new T.Vector3(0, box.min.y + h * 0.95, box.min.z + zLen * 0.40);
    const holder = new T.Object3D();
    holder.position.copy(eyeL);
    wrap.add(holder);
    this._interiorHolder = holder;
  };

  GameEngine.prototype.pause = function(){ if(this.playing){ this.paused = true; if(this.cb.onPauseChange) this.cb.onPauseChange(true); } };
  GameEngine.prototype.resume = function(){ if(this.playing){ this.paused = false; this._last = performance.now(); if(this.cb.onPauseChange) this.cb.onPauseChange(false); } };

  GameEngine.prototype.quit = function(){
    this.playing = false; this.paused = false; this._crash = null;
    if(this._player){ this.scene.remove(this._player); this._player = null; }
    this._interiorHolder = null;
    this._obstacles.forEach(o=>this.scene.remove(o.mesh)); this._obstacles = [];
    this._pickups.forEach(p=>this.scene.remove(p.mesh)); this._pickups = [];
    this._ramps.forEach(r=>this.scene.remove(r.mesh)); this._ramps = [];
    this._jumpY = 0; this._jumpVy = 0; this._shield = false; this._magnetT = 0;
    if(this._toll){ this.scene.remove(this._toll.mesh); this._toll = null; }
    this._tollHold = false; this._tollLock = false; this._jr = null;
  };

  GameEngine.prototype.setBrake = function(v){ this._brake = !!v; };
  GameEngine.prototype.move = function(d){
    if(!this.playing || this.paused || this._tollHold) return;
    this._lane = Math.max(0, Math.min(3, this._lane + d));
  };

  // ---------- Arrets : peages (route.journey) et stations-service ----------
  // Peages : a chaque sortie a peage du trajet, une barriere apparait au loin,
  // la voiture ralentit toute seule et s'arrete a la cabine, et il faut payer
  // (menu cote interface) pour que la barriere se leve. Arrivee au bout du
  // trajet : bonus, puis le trajet repart en sens inverse.
  // Carburant : le reservoir se vide avec la distance (plus vite au nitro).
  // Regulierement, une station-service apparait sur la droite : si on est
  // dans la voie de droite en arrivant, on s'y arrete pour faire le plein
  // (menu de paiement). Reservoir vide = la voiture s'arrete : panne seche.
  const FUEL_PER_UNIT = 1 / 2600, FUEL_GAP = 1700;
  GameEngine.prototype._journeyReset = function(){
    const j = this.route && this.route.journey;
    this._jr = j ? { stops:j.stops.slice(), from:j.from, to:j.to, idx:0, base:0, lap:1, lastTollKm:0 } : null;
    this._toll = null; this._tollHold = false; this._tollLock = false;
    this._fuel = 1; this._fuelOut = false; this._fuelWarned = false; this._fuelNext = 1300;
    this._endReason = null;
  };
  GameEngine.prototype._journeyInfo = function(){
    const jr = this._jr, j = this.route.journey;
    const km = this._dist / j.unitsPerKm - jr.base;
    const stop = jr.stops[jr.idx], total = jr.stops[jr.stops.length - 1].km;
    return { road:j.road || '', from:jr.from, to:jr.to, next:stop.name, kmNext:Math.max(0, stop.km - km), kmDone:Math.min(total, km), kmTotal:total, toll:!!stop.toll, lap:jr.lap };
  };
  GameEngine.prototype._spawnStop = function(kind, unitsAhead, stop){
    const T = window.THREE, SK = DG.StopKit;
    let mesh;
    if(kind === 'toll') mesh = this.route.tollPlaza ? this.route.tollPlaza(T, stop) : (SK ? SK.tollPlaza(T, stop, this.route.tollStyle) : new T.Group());
    else mesh = SK ? SK.fuelStation(T, this.route) : new T.Group();
    mesh.position.set(0, 0, -unitsAhead - 6);
    this.scene.add(mesh);
    bendScene(mesh);
    this._toll = { mesh, stop, kind, state:kind === 'toll' ? 'approach' : 'offer', t:0 };
    this._ramps.forEach(r=>this.scene.remove(r.mesh)); this._ramps = [];
    if(kind === 'toll'){
      for(let i = this._obstacles.length - 1; i >= 0; i--){ const o = this._obstacles[i]; if(o.mesh.position.z < -25){ this.scene.remove(o.mesh); this._release(o.mesh); this._obstacles.splice(i, 1); } }
      if(this.cb.onTollApproach) this.cb.onTollApproach(stop);
    } else if(this.cb.onPickup) this.cb.onPickup('fuel-station', { fuel:this._fuel });
  };
  GameEngine.prototype._journeyUpdate = function(dt, scroll){
    const jr = this._jr, j = this.route.journey;
    // carburant
    if(!this.route.noFuel){
      if(!this._tollHold) this._fuel = Math.max(0, this._fuel - (scroll || 0) * FUEL_PER_UNIT * (this._boostActive ? 1.8 : 1));
      if(this._fuel < 0.2 && !this._fuelWarned){ this._fuelWarned = true; if(this.cb.onPickup) this.cb.onPickup('fuel-low'); }
      if(this._fuel <= 0 && !this._fuelOut){ this._fuelOut = true; if(this.cb.onPickup) this.cb.onPickup('out-of-fuel'); }
    }
    let tollNear = false, unitsToToll = Infinity;
    if(jr){
      const info = this._journeyInfo();
      DG._journey = info; // lu par les panneaux du decor (villes / distances)
      this._jHudT = (this._jHudT || 0) - dt;
      if(this._jHudT <= 0){ this._jHudT = 0.25; if(this.cb.onJourney) this.cb.onJourney(info); }
      const stop = jr.stops[jr.idx];
      const unitsLeft = info.kmNext * j.unitsPerKm;
      if(!stop.toll){ if(info.kmNext <= 0 && !(this._toll && this._toll.kind === 'toll')) this._journeyNext(); }
      else {
        unitsToToll = unitsLeft;
        // (une fois paye, plus de verrou meme si la barriere est encore visible)
        tollNear = unitsLeft < 260 && !(this._toll && this._toll.kind === 'toll' && this._toll.state === 'open');
        if(!this._toll && unitsLeft < 150) this._spawnStop('toll', unitsLeft, stop);
      }
    }
    // station-service periodique (decalee si un peage arrive bientot)
    if(!this.route.noFuel && !this._toll && this._dist > this._fuelNext - 150){
      if(unitsToToll < 420) this._fuelNext = this._dist + unitsToToll + 500;
      else this._spawnStop('fuel', this._fuelNext - this._dist, null);
    }
    const tl = this._toll;
    // plus de trafic ni de nitro a l'approche d'un arret (le verrou est
    // recalcule a chaque image : il se libere des qu'on est reparti)
    this._tollLock = tollNear || !!(tl && tl.state !== 'offer' && !(tl.state === 'open' && !this._tollHold));
    if(!tl) return;
    tl.t += dt;
    const d = -(tl.mesh.position.z + 6) - 2.2;
    if(tl.state === 'offer'){
      // station : on s'y arrete seulement si on est dans la voie de droite
      if(this._lane === 3 && d < 70 && d > 14){
        tl.state = 'approach';
        for(let i = this._obstacles.length - 1; i >= 0; i--){ const o = this._obstacles[i]; if(o.li === 3 && o.mesh.position.z < 0){ this.scene.remove(o.mesh); this._release(o.mesh); this._obstacles.splice(i, 1); } }
        if(this.cb.onPickup) this.cb.onPickup('fuel-enter');
      } else if(tl.mesh.position.z > 20){
        this.scene.remove(tl.mesh); this._toll = null; this._fuelNext = this._dist + FUEL_GAP * 0.55;
      }
    } else if(tl.state === 'approach'){
      // freinage progressif : vitesse maxi = racine(2 * decel * distance restante)
      const vmax = Math.sqrt(Math.max(0, 2 * 16 * d));
      if(this._speed > vmax) this._speed = vmax;
      if(d <= 0.05){
        this._speed = 0; tl.state = 'stopped'; this._tollHold = true;
        const cur = this.route.currency || (j && j.currency) || '€';
        const coinsHave = Math.floor(this._coinCredits / 10);
        if(tl.kind === 'toll'){
          const km = tl.stop.km - jr.lastTollKm;
          tl.price = Math.max(1.2, Math.round(km * j.pricePerKm * 10) / 10);
          if(this.cb.onToll) this.cb.onToll({ kind:'toll', operator:j.operator || 'Péage', road:j.road || '', currency:cur, station:tl.stop.name, from:jr.lastTollName || jr.from, km:Math.round(km), price:tl.price, coinsNeed:Math.ceil(tl.price), coinsHave, cardPoints:Math.round(tl.price * 3), lane:this._lane + 1 });
        } else {
          const ppl = this.route.fuelPrice || 1.89;
          const liters = Math.max(5, Math.round((1 - this._fuel) * 55));
          tl.price = Math.round(liters * ppl * 10) / 10; tl.liters = liters;
          if(this.cb.onToll) this.cb.onToll({ kind:'fuel', operator:this.route.fuelBrand || 'Station-service', currency:cur, station:this.route.fuelStationName || 'Aire de service', fuelPct:Math.round(this._fuel * 100), liters, ppl, price:tl.price, coinsNeed:Math.ceil(tl.price), coinsHave, cardPoints:Math.round(tl.price * 3), lane:this._lane + 1 });
        }
      }
    } else if(tl.state === 'open'){
      // barriere qui se leve (peage) puis on repart
      const arm = tl.mesh.getObjectByName('arm' + this._lane);
      if(arm) arm.rotation.z = Math.min(Math.PI/2 * 0.95, arm.rotation.z + dt * 3.2);
      if(tl.t > 0.55 && this._tollHold){ this._tollHold = false; }
      if(tl.mesh.position.z > 30){
        this.scene.remove(tl.mesh); this._toll = null;
        if(tl.kind === 'toll') this._journeyNext();
        else this._fuelNext = this._dist + FUEL_GAP;
      }
    }
  };
  GameEngine.prototype._journeyNext = function(){
    const jr = this._jr, j = this.route.journey;
    const stop = jr.stops[jr.idx];
    if(stop.toll){ jr.lastTollKm = stop.km; jr.lastTollName = stop.name; }
    jr.idx++;
    if(jr.idx >= jr.stops.length){
      // arrivee : bonus, puis retour dans l'autre sens
      this._obstacleBonus += 500 * this._multiplier;
      if(this.cb.onPickup) this.cb.onPickup('arrival', { city:jr.to });
      const total = jr.stops[jr.stops.length - 1].km;
      const lastToll = jr.stops[jr.stops.length - 1].toll;
      const rev = jr.stops.slice(0, -1).reverse().map(s=>({ name:s.name, toll:s.toll, km:total - s.km }));
      rev.push({ name:jr.from, km:total, toll:!!lastToll });
      jr.stops = rev;
      const f = jr.from; jr.from = jr.to; jr.to = f;
      jr.base = this._dist / j.unitsPerKm; jr.idx = 0; jr.lap++; jr.lastTollKm = 0; jr.lastTollName = null;
    }
  };
  // Paiement (peage ou plein) : especes = pieces ramassees pendant la course
  // (1 piece = 1 unite de monnaie), carte = points du score.
  GameEngine.prototype.payToll = function(method){
    const tl = this._toll;
    if(!tl || tl.state !== 'stopped') return { ok:false };
    if(method === 'cash'){
      const need = Math.ceil(tl.price) * 10;
      if(this._coinCredits < need) return { ok:false, error:'Pas assez de pièces' };
      this._coinCredits -= need;
    } else {
      this._obstacleBonus -= Math.round(tl.price * 3);
    }
    if(tl.kind === 'fuel'){ this._fuel = 1; this._fuelOut = false; this._fuelWarned = false; }
    tl.state = 'open'; tl.t = 0;
    if(this.fx) this.fx.emit(this._playerX, 1.2, -4, 18, tl.kind === 'fuel' ? 0xffcc33 : 0x4ee39a, 3, 1.5, 0.5);
    return { ok:true, price:tl.price, method, kind:tl.kind, liters:tl.liters };
  };


  // Reflets du ciel sur la carrosserie + ombre portee (une seule fois par materiau)
  GameEngine.prototype._carLook = function(root){
    const env = this._carEnv;
    root.traverse(n=>{
      if(!n.isMesh) return;
      n.castShadow = true;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(m=>{
        if(!m || !m.isMeshStandardMaterial || m.envMap === env || (m.envMap && m.userData.dgEnv !== true)) return;
        m.envMap = env; m.envMapIntensity = 1.1; m.userData.dgEnv = true; m.needsUpdate = true;
      });
    });
  };
  GameEngine.prototype.setBoostHeld = function(v){ this._boostHeld = v; };

  GameEngine.prototype.destroy = function(){
    if(this._raf) cancelAnimationFrame(this._raf);
    if(this._ro) this._ro.disconnect();
    if(this.renderer){ this.renderer.dispose(); if(this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }
  };

  // maxW : plafond de largeur (collision + choix du gabarit) utilise quand cet
  // obstacle partage sa vague avec un autre sur une voie adjacente (voir la
  // vague double dans _update) — evite qu'un bus/camion trop large chevauche
  // visuellement le vehicule de la voie d'a cote.
  GameEngine.prototype._spawnObstacle = function(forceLane, maxW){
    const T = window.THREE;
    const li = forceLane != null ? forceLane : Math.floor(Math.random()*4);
    const lane = LANES[li];
    let mesh, w = 0.95;
    const r = Math.random();
    let kind = 'cone', v = 0;
    if(r < 0.35 && this._coneModel){
      mesh = this._instance(this._coneModel, 1.0, 0, false);
      w = 0.5;
    } else if(this._trafficModels && this._trafficModels.length){
      const pool = maxW != null ? this._trafficModels.filter(t=>t.len <= 4.0) : this._trafficModels;
      const models = pool.length ? pool : this._trafficModels;
      let t = models[Math.floor(Math.random()*models.length)];
      if(models.length > 1 && t === this._lastTrafficModel) t = models[(models.indexOf(t)+1) % models.length];
      this._lastTrafficModel = t;
      mesh = this._instance(t.model, t.len, Math.PI, true);
      kind = 'car';
      // Le trafic roule dans le meme sens que le joueur, a sa propre allure :
      // poids lourds plus lents, citadines un peu plus vives.
      v = t.len > 6 ? 3.5 + Math.random()*1.5 : 5 + Math.random()*3.5;
      // Largeur de collision proportionnelle a la taille du vehicule, plafonnee pour
      // qu'un bus/camion reste toujours doublable depuis la voie d'a cote.
      w = Math.min(1.3, 0.95 * (t.len / 3.6));
    } else if(this._coneModel){
      mesh = this._instance(this._coneModel, 1.0, 0, false);
      w = 0.5;
    } else {
      mesh = DG.Loader.makeFallbackCar(T, { body:0x161b23 });
      w = 0.95;
    }
    if(maxW != null) w = Math.min(w, maxW);
    mesh.position.set(lane, 0, -134);
    this._carLook(mesh);
    mesh.userData.w = w;
    this.scene.add(mesh);
    this._obstacles.push({ mesh, hit:false, scored:false, laneX:lane, li, kind, v, solo:forceLane == null, lc:null,
      blinkL:mesh.getObjectByName('dgBlinkL'), blinkR:mesh.getObjectByName('dgBlinkR') });
    return li;
  };

  // Un modele n'est mesure/normalise qu'UNE fois : les apparitions suivantes
  // clonent ce gabarit deja pret (recalculer la boite englobante a chaque
  // apparition, toutes les ~0.3 s, provoquait des micro-saccades en course).
  GameEngine.prototype._instance = function(model, len, rotY, lights){
    const T = window.THREE;
    this._tpl = this._tpl || new Map();
    const key = model.uuid + ':' + len + ':' + rotY;
    let tpl = this._tpl.get(key);
    if(!tpl){
      let skinned = false; model.traverse(n=>{ if(n.isSkinnedMesh) skinned = true; });
      tpl = { obj: DG.Loader.normalizeModel(T, model, len, rotY), skinned };
      if(lights) this._addVehicleLights(tpl.obj);
      this._tpl.set(key, tpl);
    }
    if(tpl.skinned){ const o = DG.Loader.normalizeModel(T, model, len, rotY); if(lights) this._addVehicleLights(o); return o; }
    const pooled = this._pool && this._pool.get(key);
    if(pooled && pooled.length){
      const o = pooled.pop();
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      const bl = o.getObjectByName('dgBlinkL'), br = o.getObjectByName('dgBlinkR');
      if(bl) bl.visible = false; if(br) br.visible = false;
      return o;
    }
    const o = tpl.obj.clone(true);
    o.userData.tplKey = key;
    return o;
  };

  // Feux arriere (toujours allumes) + clignotants (allumes pendant un
  // changement de voie) en sprites additifs : lisibles la nuit, quasi gratuits.
  GameEngine.prototype._addVehicleLights = function(wrap){
    const T = window.THREE;
    if(!this._tailMat){
      this._tailMat = new T.SpriteMaterial({ map:glow(T), color:0xff2a1a, transparent:true, opacity:.95, blending:T.AdditiveBlending, depthWrite:false });
      this._blinkMat = new T.SpriteMaterial({ map:glow(T), color:0xffa21a, transparent:true, opacity:1, blending:T.AdditiveBlending, depthWrite:false });
    }
    wrap.updateMatrixWorld(true);
    const box = DG.Loader.worldBox(T, wrap);
    const sx = box.max.x - box.min.x, sy = box.max.y - box.min.y;
    const y = box.min.y + Math.min(sy * 0.42, 1.1), z = box.max.z + 0.03;
    [-1, 1].forEach(side=>{
      const t = new T.Sprite(this._tailMat); t.scale.set(0.55, 0.38, 1); t.position.set(side * sx * 0.36, y, z); wrap.add(t);
      const b = new T.Sprite(this._blinkMat); b.scale.set(0.75, 0.75, 1); b.position.set(side * sx * 0.47, y + 0.05, z); b.visible = false;
      b.name = side < 0 ? 'dgBlinkL' : 'dgBlinkR'; wrap.add(b);
    });
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
    // CapsuleGeometry n'existe pas dans cette version de three.js (r128, ajoutee
    // en r142) : ça levait une exception a chaque apparition d'un bonus nitro,
    // qui sautait donc le rendu de cette frame (et l'objet n'etait jamais ajoute
    // a la scene). Un cylindre a bouts arrondis (spheres) donne une forme de
    // bonbonne tres proche, compatible avec cette version.
    if(kind === 'magnet' || kind === 'shield') return extraPickupMesh(T, kind);
    const m = new T.Group();
    const mat = new T.MeshStandardMaterial({ color:0x3df0ff, emissive:0x18c8ff, emissiveIntensity:0.9, metalness:0.5, roughness:0.2 });
    const body = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.6, 12), mat);
    m.add(body);
    [-0.3, 0.3].forEach(y=>{
      const cap = new T.Mesh(new T.SphereGeometry(0.32, 12, 8), mat);
      cap.position.y = y; m.add(cap);
    });
    if(kind === 'nitro'){ m.rotation.z = Math.PI/2; return m; }
    return m;
  }
  // (nitro ci-dessus) ; aimant en U rouge a pointes argentees, bouclier = gemme verte
  function extraPickupMesh(T, kind){
    if(kind === 'magnet'){
      const g = new T.Group();
      const red = new T.MeshStandardMaterial({ color:0xff3b3b, emissive:0xc01818, emissiveIntensity:0.7, metalness:0.4, roughness:0.3 });
      const arc = new T.Mesh(new T.TorusGeometry(0.36, 0.13, 10, 18, Math.PI), red); arc.rotation.z = Math.PI; g.add(arc);
      const tipMat = new T.MeshStandardMaterial({ color:0xe8eef4, emissive:0x8090a0, emissiveIntensity:0.4, metalness:0.9, roughness:0.2 });
      [-0.36, 0.36].forEach(x=>{ const t = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.26, 10), tipMat); t.position.set(x, 0.12, 0); g.add(t); });
      return g;
    }
    return new T.Mesh(new T.IcosahedronGeometry(0.5, 1), new T.MeshStandardMaterial({ color:0x3dffb0, emissive:0x10c080, emissiveIntensity:0.9, metalness:0.3, roughness:0.15, flatShading:true }));
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
    const kind = roll < 0.6 ? 'coin' : roll < 0.73 ? 'nitro' : roll < 0.84 ? 'multiplier' : roll < 0.92 ? 'magnet' : 'shield';
    // Ligne de pieces (1 fois sur 3) : bien plus satisfaisant a "aspirer"
    if(kind === 'coin' && Math.random() < 0.35){
      for(let k = 0; k < 5; k++) this._addPickup('coin', LANES[li], 1.05, -130 - k*3.2);
      return;
    }
    this._addPickup(kind, LANES[li], 1.05, -130);
  };
  GameEngine.prototype._addPickup = function(kind, x, y, z){
    const T = window.THREE;
    // Geometrie/materiaux crees une seule fois par type puis partages (avant :
    // nouvelle geometrie a chaque bonus, jamais liberee -> fuite memoire GPU).
    this._pickupProto = this._pickupProto || {};
    if(!this._pickupProto[kind]){
      const proto = pickupMesh(T, kind);
      if(this.fx) this.fx.decoratePickup(proto, kind);
      this._pickupProto[kind] = proto;
    }
    const mesh = this._pickupProto[kind].clone(true);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this._pickups.push({ mesh, kind, taken:false, phase:Math.random()*6.28, baseY:y });
  };

  // Tremplin jaune et noir a chevrons (prototype unique, clone a chaque fois)
  GameEngine.prototype._rampMesh = function(){
    const T = window.THREE;
    if(!this._rampProto){
      const L = 3.4, H = 0.8, W = 1.9;
      const shape = new T.Shape(); shape.moveTo(0, 0); shape.lineTo(-L, 0); shape.lineTo(-L, H); shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, { depth:W, bevelEnabled:false });
      geo.rotateY(-Math.PI/2); geo.translate(W/2, 0, L/2);
      const g = new T.Group();
      g.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color:0x1a1a1e, roughness:0.6, metalness:0.3 })));
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#ffc21a'; x.fillRect(0, 0, 64, 128);
      x.fillStyle = '#111'; for(let k = -1; k < 5; k++){ x.beginPath(); x.moveTo(0, k*32 + 40); x.lineTo(32, k*32 + 16); x.lineTo(64, k*32 + 40); x.lineTo(64, k*32 + 54); x.lineTo(32, k*32 + 30); x.lineTo(0, k*32 + 54); x.closePath(); x.fill(); }
      const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
      const slope = new T.Mesh(new T.PlaneGeometry(W * 0.98, Math.hypot(L, H)), new T.MeshStandardMaterial({ map:tex, emissive:0x553300, emissiveMap:tex, emissiveIntensity:0.6, roughness:0.5 }));
      slope.rotation.x = -Math.PI/2 + Math.atan2(H, L); slope.position.set(0, H/2 + 0.012, 0); g.add(slope);
      const lip = new T.Mesh(new T.BoxGeometry(W, 0.06, 0.08), new T.MeshBasicMaterial({ color:0x3df0ff })); lip.position.set(0, H + 0.02, -L/2); g.add(lip);
      const glowTex = glow(T);
      const halo = new T.Sprite(new T.SpriteMaterial({ map:glowTex, color:0x3df0ff, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false }));
      halo.scale.set(3.4, 1.4, 1); halo.position.set(0, H, -L/2); g.add(halo);
      this._rampProto = g;
    }
    return this._rampProto.clone(true);
  };

  // Pose un tremplin dans une voie libre, un arc de pieces sur la trajectoire
  // du saut, et parfois une voiture juste derriere a franchir en l'air.
  GameEngine.prototype._spawnRamp = function(){
    const Z = -134;
    const busy = new Set();
    for(const o of this._obstacles){ if(o.mesh.position.z < Z + 30 && o.mesh.position.z > Z - 30) busy.add(o.li); }
    const free = [0,1,2,3].filter(l=>!busy.has(l));
    if(!free.length) return;
    const li = free[Math.floor(Math.random()*free.length)], x = LANES[li];
    const mesh = this._rampMesh();
    mesh.position.set(x, 0, Z);
    this.scene.add(mesh);
    this._ramps.push({ mesh, li, used:false });
    // pieces le long de la parabole du saut (a la vitesse actuelle)
    const v = this._speed || 30;
    for(let k = 1; k <= 6; k++){
      const t = k * 0.11, y = 1.05 + JUMP_V * t - GRAVITY/2 * t * t;
      this._addPickup('coin', x, y, Z - 1.7 - v * t);
    }
    if(Math.random() < 0.55){
      this._spawnObstacle(li);
      const o = this._obstacles[this._obstacles.length - 1];
      o.mesh.position.z = Z - 1.7 - v * 0.4; o.solo = false; o.v = Math.min(o.v, 3);
    }
  };

  GameEngine.prototype._loop = function(now){
    this._raf = requestAnimationFrame((t)=>this._loop(t));
    const raw = now - this._last;
    // Hors course (menus opaques par-dessus) : 30 fps suffisent largement.
    const active = this.playing || this._crash;
    if(!active && raw < 30) return;
    const dt = Math.min(raw/1000, 0.05);
    this._last = now;
    this._lastDt = dt;
    if(!this.paused){
      this._tNow = (this._tNow || 0) + dt;
      for(let i=0;i<this._tickers.length;i++) this._tickers[i](dt, this._tNow);
      this._update(dt, now);
    }
    if((this._bendScan = (this._bendScan || 0) + 1) % 20 === 0) bendScene(this.scene);
    this.renderer.render(this.scene, this.camera);
    if(active && !this.paused) this._adaptResolution(raw);
  };

  // Resolution dynamique : si les images mettent trop de temps a sortir, on
  // baisse un peu la definition interne (quasi invisible en mouvement) plutot
  // que de laisser le jeu saccader ; on remonte des que la machine suit.
  // Juge par rapport a la cadence de l'ecran (60, 120, 144 Hz...), avec
  // hysteresis : on ne baisse qu'apres ~2 s nettement trop lentes, on ne remonte
  // qu'apres ~8 s confortables, et jamais juste apres une baisse. Chaque
  // changement redimensionne le canvas (petite saccade) : il faut qu'ils soient rares.
  GameEngine.prototype._adaptResolution = function(frameMs){
    if(frameMs > 100) return; // onglet en arriere-plan, pas representatif
    this._frameAvg += (frameMs - this._frameAvg) * 0.04;
    // Cadence de reference = meilleure moyenne observee (intervalle de l'ecran)
    this._frameBase = this._frameBase ? Math.min(this._frameBase + 0.002, Math.max(6, this._frameAvg)) : Math.max(6, frameMs);
    if(this._frameAvg < this._frameBase) this._frameBase = Math.max(6, this._frameAvg);
    this._prCheckT += frameMs;
    this._prHoldT = Math.max(0, this._prHoldT - frameMs);
    const base = Math.min(16.7, Math.max(this._frameBase, 6.9)), ratio = this._frameAvg / base;
    let pr = this._pr;
    if(this._prCheckT >= 2000 && ratio > 1.35 && pr > this._minPR){
      pr = Math.max(this._minPR, pr - 0.15);
      this._prHoldT = 12000;
    } else if(this._prCheckT >= 2000 && ratio > 1.8 && this._frameAvg > 30 && pr > 0.75){
      pr = Math.max(0.75, pr - 0.15); // dernier recours : machine vraiment a la peine
      this._prHoldT = 12000;
    } else if(this._prCheckT >= 8000 && this._prHoldT <= 0 && ratio < 1.08 && pr < this._maxPR){
      pr = Math.min(this._maxPR, pr + 0.1);
    }
    if(this._prCheckT >= 8000 || pr !== this._pr) this._prCheckT = 0;
    if(pr !== this._pr){ this._pr = pr; this._onResize(); }
  };

  GameEngine.prototype._update = function(dt, now){
    const T = window.THREE;
    const cp = this._camPresets[this._camIndex];
    if(cp.interior && this._interiorHolder){
      // Vue habitacle : la camera est rigidement calee sur le siege (aucun lissage,
      // sinon elle semble flotter hors de la carrosserie pendant les changements de voie).
      const pos = this._tmpV || (this._tmpV = new T.Vector3()); this._interiorHolder.getWorldPosition(pos);
      const quat = this._tmpQ || (this._tmpQ = new T.Quaternion()); this._interiorHolder.getWorldQuaternion(quat);
      this.camera.position.copy(pos);
      this.camera.quaternion.copy(quat);
      const sh = this.fx ? this.fx.shake * 0.25 : 0;
      if(sh){ this.camera.position.x += (Math.random()-.5)*sh; this.camera.position.y += (Math.random()-.5)*sh; }
      this.camera.fov += ((76 + this._fovKick()) - this.camera.fov) * Math.min(1, dt*6);
      this.camera.updateProjectionMatrix();
      if(this._camLight) this._camLight.intensity += (3.4 - this._camLight.intensity) * Math.min(1, dt*6);
      this.ambientLight.intensity += ((this._routeAmbientI + 0.4) - this.ambientLight.intensity) * Math.min(1, dt*6);
    } else {
      const bz = (this.playing && this._boostActive) ? -1.0 : 0;
      const shake = (this.playing && this._boostActive) ? Math.sin(now*0.05)*0.07 : 0;
      const ck = 1 - Math.pow(0.93, dt * 60);
      this.camera.position.x += (cp.pos[0]+shake - this.camera.position.x)*ck;
      this.camera.position.y += (cp.pos[1] - this.camera.position.y)*ck;
      this.camera.position.z += (cp.pos[2]+bz - this.camera.position.z)*ck;
      this._look.x += (cp.look[0]-this._look.x)*ck;
      this._look.y += (cp.look[1]-this._look.y)*ck;
      this._look.z += (cp.look[2]-this._look.z)*ck;
      this.camera.position.y += (this._jumpY || 0) * 0.45 * ck;
      this.camera.lookAt(this._look);
      this.camera.rotateZ(-BEND.value.x * 55); // inclinaison dans les virages
      const sh = this.fx ? this.fx.shake : 0;
      if(sh){ this.camera.position.x += (Math.random()-.5)*sh; this.camera.position.y += (Math.random()-.5)*sh*0.7; }
      this.camera.fov += ((50 + this._fovKick()) - this.camera.fov) * Math.min(1, dt*6);
      this.camera.updateProjectionMatrix();
      if(this._camLight) this._camLight.intensity += (0 - this._camLight.intensity) * Math.min(1, dt*6);
      this.ambientLight.intensity += (this._routeAmbientI - this.ambientLight.intensity) * Math.min(1, dt*6);
    }

    let scroll = (this.playing ? this._speed : 7) * dt;
    if(this._crash){
      // Ralenti du crash : le monde freine brutalement, la voiture part en toupie.
      const c = this._crash;
      c.t += dt;
      const sdt = dt * (c.t < 0.9 ? 0.28 : 0.6);
      c.speed *= Math.pow(0.08, sdt);
      scroll = c.speed * sdt;
      if(this._player){
        c.vy -= 22 * sdt;
        this._player.position.y = Math.max(0, this._player.position.y + c.vy * sdt);
        if(this._player.position.y <= 0 && c.vy < 0) c.vy *= -0.3;
        this._player.rotation.y += c.spin * sdt;
        this._player.rotation.z += (c.roll - this._player.rotation.z) * Math.min(1, sdt*4);
        this._player.position.x += c.vx * sdt;
        if(this.fx && Math.random() < 0.5) this.fx.emit(this._player.position.x, 0.2, 0.6, 2, 0xff8a2a, 3, 1, 0.5);
      }
      if(c.obs){ c.obs.mesh.position.z -= 6 * sdt; c.obs.mesh.rotation.y -= c.spin * 0.25 * sdt; }
      this._scrollWorld(scroll);
      if(this.fx) this.fx.update(dt, scroll, 0, false, false);
      if(c.t > 1.25){ this._crash = null; this._gameOver(); }
      return;
    }
    let counting = false;
    if(this.playing && this._countdown > 0){
      // Depart lance : on roule au pas pendant le 3-2-1, pleine allure au GO.
      counting = true;
      this._countdown -= dt;
      const step = Math.ceil(Math.max(0, this._countdown));
      if(step !== this._countStep){ this._countStep = step; if(this.cb.onCountdown) this.cb.onCountdown(step); }
      scroll = this._speed * dt * (0.35 + (1 - Math.max(0, this._countdown) / 3) * 0.45);
    }
    if(this.playing && !counting){
      const want = this._boostHeld && this._boostFuel > 0.02 && !this._tollLock;
      this._boostActive = want;
      if(want) this._boostFuel = Math.max(0, this._boostFuel - dt*this.mult.boostDrain);
      else this._boostFuel = Math.min(1, this._boostFuel + dt*this.mult.boostRecharge);
      if(want) scroll *= this.mult.boostPower;
    }

    this._scrollWorld(scroll);
    this._bendD += scroll;
    const bamp = (this.route && this.route.bend) || { x:1, y:1 };
    const bk = Math.min(1, dt * 1.5);
    // plus de virages (la route reste droite) ; seules les bosses et les creux restent
    BEND.value.x += (0 - BEND.value.x) * bk;
    const dip = this.route && this.route.dips;
    if(dip){ const k = Math.PI * 2 / dip.len; DIP.value.set(DIP.value.x + (dip.amp - DIP.value.x) * bk, k, (this._bendD % dip.len) * k); }
    else DIP.value.x += (0 - DIP.value.x) * bk;
    BEND.value.y += (hillAt(this._bendD * (bamp.yf || 1)) * HILL_Y * (bamp.y != null ? bamp.y : 1) - BEND.value.y) * bk;
    const speedK = this.playing && this.mult ? Math.max(0, Math.min(1, (this._speed - this.mult.baseSpeed*0.7) / (this.mult.maxSpeed - this.mult.baseSpeed*0.7))) : 0;
    this._speedK = speedK;
    if(this.fx) this.fx.update(dt, scroll, speedK, this.playing && this._boostActive, this.playing);

    if(!this.playing) return;

    // Changement de voie (systeme d'origine) : la voiture glisse vers le centre
    // de la voie choisie, a la vitesse de sa maniabilite.
    const targetX = LANES[this._lane];
    this._playerX += (targetX - this._playerX) * Math.min(1, dt * this.mult.handlingRate);
    // Saut (tremplin) : simple balistique ; atterrissage avec secousse + etincelles
    if(this._jumpY > 0 || this._jumpVy > 0){
      this._jumpVy -= GRAVITY * dt;
      this._jumpY += this._jumpVy * dt;
      if(this._jumpY <= 0){
        this._jumpY = 0;
        if(this._jumpVy < -4 && this.fx){
          this.fx.emit(this._playerX, 0.15, 0.4, 36, 0xffd27a, 6, 1.2, 0.5);
          this.fx.shake = Math.max(this.fx.shake, 0.28);
        }
        this._jumpVy = 0;
      }
    }
    if(this._player){
      this._player.position.x = this._playerX;
      this._player.position.y = this._jumpY + Math.sin(now*0.02)*0.02 + (this._boostActive ? Math.sin(now*0.09)*0.012 : 0);
      // Dynamique de caisse : roulis vers l'exterieur en braquant, nez qui suit
      // la trajectoire (et le virage), plongee au freinage, accroupi au boost.
      const k = Math.min(1, dt * 8);
      this._roll += ((targetX - this._playerX) * 0.14 - this._roll) * k;
      this._yaw += (-(targetX - this._playerX) * 0.07 - BEND.value.x * 110 - this._yaw) * k;
      const pitchT = this._jumpY > 0 ? Math.max(-0.22, Math.min(0.28, this._jumpVy * 0.03)) : (this._brake ? -0.035 : this._boostActive ? 0.03 : 0);
      this._pitch += (pitchT - this._pitch) * k;
      this._player.rotation.z = this._roll;
      this._player.rotation.y = this._yaw;
      this._player.rotation.x = this._pitch;
      if(this._playerTailMat){
        const on = this._brake && this.playing;
        this._playerTailMat.opacity += ((on ? 1 : 0.5) - this._playerTailMat.opacity) * Math.min(1, dt * 12);
      }
      if(this._shieldFx){
        this._shieldFx.visible = !!this._shield;
        if(this._shield){ const p = 1 + Math.sin(now*0.006) * 0.04; this._shieldFx.scale.set(p, p, p); }
      }
    }
    this._headlight.intensity += (this._headlightI - this._headlight.intensity) * Math.min(1, dt*3);
    this._headlight.position.set(this._playerX, 1.1, -1.6);
    this.keyLight.position.set(this._playerX + 6, 10, 1); this.keyLight.target.position.set(this._playerX, 0, -6);
    if(counting) return;

    this._journeyUpdate(dt, scroll);
    if(this._fuelOut && !this._tollHold){
      // panne seche : la voiture ralentit jusqu'a l'arret, fin de partie
      this._speed = Math.max(0, this._speed - dt * 12);
      if(this._speed < 1.5){ this._endReason = 'fuel'; this.playing = false; this._gameOver(); return; }
    }
    if(this._toll) this._toll.mesh.position.z += scroll;
    if(this._tollHold){
      if(this.cb.onHud) this.cb.onHud({ time:this._time, score:this.currentScore(), speed:0, boostPct:this._boostFuel*100, multiplierActive:this._multiplier > 1, multiplierT:this._multiplierT, personalBest:this._personalBest, recordBroken:this._recordBroken, scoreToRecord:0, speedK:0, boosting:false, drafting:false, fuel:this._fuel });
      return;
    }
    this._time += dt;
    if(this._fuelOut){}
    else if(this._brake) this._speed = Math.max(this.mult.baseSpeed * 0.65, this._speed - dt * 13);
    else this._speed += (this.mult.maxSpeed - this._speed) * Math.min(1, dt * this.mult.accelRamp * (this._speed < this.mult.baseSpeed ? 0.9 : 0.4));
    this._dist += scroll;

    if(this._multiplierT > 0){ this._multiplierT -= dt; if(this._multiplierT <= 0){ this._multiplier = 1; if(this.cb.onPickup) this.cb.onPickup('multiplier-end'); } }

    // Moyenne glissante du temps passe dans chaque voie (voir la vague double
    // plus bas) : la voie courante monte, les 3 autres redescendent avec le temps.
    this._laneUse[this._lane] += dt;
    for(let k=0;k<4;k++) this._laneUse[k] *= Math.max(0, 1 - dt*0.12);

    this._spawnT -= dt;
    // Le trafic arrivait trop lentement et par voie unique la plupart du temps :
    // il suffisait de se caler entre 2 voies voisines pour ne quasi jamais changer
    // de cote, d'ou des scores enormes sans vraie difficulte. La cadence de base
    // monte plus vite avec le temps, et des vagues a 2 voies (tot) puis 3 voies —
    // un vrai "mur" qui ne laisse qu'un seul passage — forcent a utiliser toute la
    // largeur de la route. Il reste toujours au moins une voie praticable : jamais
    // impossible, juste plus exigeant.
    const interval = Math.max(0.32, 1.0 - this._time*0.024);
    if(this._spawnT <= 0 && this._tollLock) this._spawnT = 0.4;
    if(this._spawnT <= 0){
      this._spawnT = interval;
      const tripleChance = this._time > 35 ? Math.min(0.22, (this._time-35)*0.006) : 0;
      const doubleChance = this._time > 8 ? Math.min(0.55, (this._time-8)*0.02) : 0;
      const roll = Math.random();
      if(roll < tripleChance){
        const gapIdx = Math.floor(Math.random()*4);
        [0,1,2,3].filter(l=>l!==gapIdx).forEach(l=>this._spawnObstacle(l));
      } else if(roll < tripleChance + doubleChance){
        // Vise directement les 2 voies ou le joueur se planque (le plus utilise
        // recemment, cf. _laneUse) au lieu de 2 voies prises au hasard : sinon il
        // suffit de trouver une paire de voies jamais visee et de ne plus en
        // bouger. Si ces 2 voies sont adjacentes, on plafonne leur largeur pour
        // eviter que 2 gros vehicules (bus/camion) se chevauchent visuellement.
        const order = [0,1,2,3].slice().sort((a,b)=>this._laneUse[b]-this._laneUse[a]);
        const l1 = order[0], l2 = order[1];
        const adjacent = Math.abs(l1-l2) === 1;
        this._spawnObstacle(l1, adjacent ? 0.9 : null);
        this._spawnObstacle(l2, adjacent ? 0.9 : null);
      } else {
        this._spawnObstacle();
      }
    }
    this._pickupT -= dt;
    if(this._pickupT <= 0){ this._pickupT = 1.1 + Math.random()*1.0; if(!this._tollLock) this._spawnPickup(); }
    this._rampT -= dt;
    if(this._rampT <= 0){ this._rampT = 12 + Math.random()*9; if(!this._tollLock) this._spawnRamp(); }
    if(this._magnetT > 0) this._magnetT -= dt;

    // Tremplins : pris dans la bonne voie (et au sol) -> saut + bonus
    for(let i=this._ramps.length-1; i>=0; i--){
      const r = this._ramps[i];
      r.mesh.position.z += scroll;
      if(!r.used && this._jumpY === 0 && Math.abs(r.mesh.position.z) < 1.4 && Math.abs(r.mesh.position.x - this._playerX) < 1.0){
        r.used = true;
        this._jumpVy = JUMP_V;
        this._obstacleBonus += 100 * this._multiplier;
        if(this.fx){ this.fx.emit(this._playerX, 0.3, 0.2, 30, 0x3df0ff, 5, 2, 0.5); this.fx.shake = Math.max(this.fx.shake, 0.15); }
        if(this.cb.onPickup) this.cb.onPickup('jump');
      }
      if(r.mesh.position.z > 12){ this.scene.remove(r.mesh); this._ramps.splice(i, 1); }
    }

    const playerHalfW = this._playerHalfW || 0.55;
    let drafting = false;
    for(let i=this._obstacles.length-1; i>=0; i--){
      const o = this._obstacles[i];
      o.mesh.position.z += scroll - o.v * dt;
      this._trafficAI(o, dt, now);
      const gap = Math.abs(o.mesh.position.x - this._playerX) - ((o.mesh.userData.w||1.2) + playerHalfW);
      const clearance = o.kind === 'car' ? 1.25 : 0.7; // hauteur a franchir en l'air
      if(!o.hit && Math.abs(o.mesh.position.z) < 1.5 && gap < 0 && this._jumpY < clearance){
        o.hit = true;
        if(this._shield){
          // Bouclier : le vehicule est ejecte, on continue
          this._shield = false;
          if(this.fx){ this.fx.crash(o.mesh.position); this.fx.shake = 0.45; }
          if(this.cb.onPickup) this.cb.onPickup('shield-hit');
          this.scene.remove(o.mesh); this._release(o.mesh); this._obstacles.splice(i, 1);
          continue;
        }
        this._startCrash(o); return;
      }
      // Aspiration : dans le sillage d'un vehicule (meme voie, juste derriere),
      // le nitro se recharge bien plus vite — moins de resistance de l'air,
      // comme en vrai. Recompense le fait de coller le trafic avant de deboiter.
      if(o.kind === 'car' && o.mesh.position.z < -3.5 && o.mesh.position.z > -17 && Math.abs(o.mesh.position.x - this._playerX) < 0.9) drafting = true;
      if(!o.scored && o.mesh.position.z > 2){
        o.scored = true;
        this._obstacleBonus += 50 * this._multiplier;
        if(gap >= 0 && gap < NEAR_MISS_GAP){
          this._nearMissStreak++;
          const streakBonus = Math.min(5, this._nearMissStreak) * 10;
          this._nearMissBonus += (30 + streakBonus) * this._multiplier;
          if(this.fx) this.fx.nearMiss(o.mesh.position.x, this._playerX, this._nearMissStreak);
          if(this.cb.onPickup) this.cb.onPickup('near-miss', { streak: this._nearMissStreak, side: o.mesh.position.x < this._playerX ? -1 : 1 });
        } else {
          this._nearMissStreak = 0;
        }
      }
      if(o.mesh.position.z > 11 || (this._toll && o.mesh.position.z < this._toll.mesh.position.z + 12)){ this.scene.remove(o.mesh); this._release(o.mesh); this._obstacles.splice(i,1); }
    }
    if(drafting && !this._boostActive) this._boostFuel = Math.min(1, this._boostFuel + dt * 0.3);
    if(drafting !== this._drafting){ this._drafting = drafting; if(this.cb.onDraft) this.cb.onDraft(drafting); }

    for(let i=this._pickups.length-1; i>=0; i--){
      const p = this._pickups[i];
      p.mesh.position.z += scroll;
      p.mesh.rotation.y += dt*3;
      // Aimant : les pieces proches filent vers la voiture
      if(this._magnetT > 0 && p.kind === 'coin' && p.mesh.position.z > -45){
        const k = Math.min(1, dt * 7);
        p.mesh.position.x += (this._playerX - p.mesh.position.x) * k;
        p.baseY += ((this._jumpY || 0) + 1.05 - p.baseY) * k;
        p.mesh.position.z += Math.min(18 * dt, Math.max(0, -p.mesh.position.z) * k);
      }
      p.mesh.position.y = p.baseY + Math.sin(now*0.004 + p.phase) * 0.16;
      const dy = Math.abs(p.mesh.position.y - ((this._jumpY || 0) + 1.05));
      if(!p.taken && Math.abs(p.mesh.position.z) < 1.6 && Math.abs(p.mesh.position.x - this._playerX) < 1.1 && dy < 1.2){
        p.taken = true;
        if(this.fx) this.fx.pickup(p.kind, p.mesh.position);
        if(p.kind === 'coin'){ this._coinCredits += 10 * this._multiplier; if(this.cb.onPickup) this.cb.onPickup('coin'); }
        else if(p.kind === 'nitro'){ this._boostFuel = 1; if(this.cb.onPickup) this.cb.onPickup('nitro'); }
        else if(p.kind === 'magnet'){ this._magnetT = 8; if(this.cb.onPickup) this.cb.onPickup('magnet'); }
        else if(p.kind === 'shield'){ this._shield = true; if(this.cb.onPickup) this.cb.onPickup('shield'); }
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
      scoreToRecord: this._recordBroken ? 0 : Math.max(0, this._personalBest - score),
      speedK: this._speedK || 0,
      boosting: this._boostActive,
      drafting: this._drafting,
      fuel: this.route && this.route.noFuel ? null : this._fuel
    });
  };

  GameEngine.prototype._scrollWorld = function(scroll){
    this._lastScroll = scroll;
    for(const st of this._stripes){ st.position.z += scroll; if(st.position.z > 10) st.position.z -= 240; }
    if(this._roadTex) this._roadTex.offset.y += scroll * 60 / 260;
    if(this.groundMat.map) this.groundMat.map.offset.y += scroll * this._groundK;
    for(let i=0;i<this._scrollTex.length;i++){ const s = this._scrollTex[i]; s.tex.offset.y = (s.tex.offset.y + scroll * s.k) % 1; }
    const wrap = this._decorWrap || 140;
    // wrapDist : un decor peut demander un cycle de retour plus long que les
    // autres (ex: station essence, repere rare) — sinon tout le decor partage
    // la meme boucle courte et un objet cense etre rare repasse en fait toutes
    // les quelques secondes a haute vitesse.
    const tNow = this._tNow || 0, dt = this._lastDt || 0.016;
    for(const d of this._decor){
      d.position.z += scroll;
      const w = d.userData.wrapDist || wrap;
      if(d.position.z > 30){
        d.position.z -= w;
        if(countMeshes(d) !== d.userData._mc) mergeStatic(window.THREE, d);
      }
      if(d.userData.tick) d.userData.tick(tNow, dt);
    }
    this._updateRain(this._lastDt || 0.016, scroll);
  };

  GameEngine.prototype._fovKick = function(){
    if(!this.playing) return 0;
    return (this._speedK || 0) * 7 + (this._boostActive ? 9 : 0);
  };

  // Changements de voie du trafic : seulement les vehicules isoles (jamais un
  // morceau de "mur"), loin devant, vers une voie libre sur une bonne distance,
  // et toujours annonces au clignotant pendant ~1 s. Ne peut donc jamais
  // refermer le seul passage d'une vague ni surprendre le joueur a bout portant.
  GameEngine.prototype._trafficAI = function(o, dt, now){
    if(o.kind !== 'car') return;
    if(o.lc){
      const lc = o.lc;
      lc.t += dt;
      const b = lc.dir < 0 ? o.blinkL : o.blinkR;
      if(b) b.visible = Math.floor(now / 260) % 2 === 0;
      if(lc.t > lc.signal){
        const k = Math.min(1, (lc.t - lc.signal) / lc.move);
        const e = k * k * (3 - 2 * k);
        o.mesh.position.x = lc.fromX + (lc.toX - lc.fromX) * e;
        o.mesh.rotation.y = Math.sin(k * Math.PI) * -0.09 * lc.dir;
        if(k >= 1){ o.lc = null; o.mesh.rotation.y = 0; if(b) b.visible = false; }
      }
      return;
    }
    if(!o.solo || o.changed || o.mesh.position.z > -60 || o.mesh.position.z < -120) return;
    if(Math.random() > dt * 0.35) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const to = o.li + dir;
    if(to < 0 || to > 3) return;
    for(const q of this._obstacles){
      if(q === o) continue;
      const qTo = q.lc ? q.lc.toLi : q.li;
      if((qTo === to || q.li === to) && Math.abs(q.mesh.position.z - o.mesh.position.z) < 22) return;
    }
    for(const p of this._pickups){ if(Math.abs(p.mesh.position.x - LANES[to]) < 0.5 && Math.abs(p.mesh.position.z - o.mesh.position.z) < 10) return; }
    o.changed = true;
    o.lc = { t:0, signal:0.9, move:1.1, dir, fromX:LANES[o.li], toX:LANES[to], toLi:to };
    o.li = to; o.laneX = LANES[to];
  };

  GameEngine.prototype._startCrash = function(o){
    this.playing = false;
    this._boostActive = false;
    const side = o.mesh.position.x < this._playerX ? 1 : -1;
    this._crash = { t:0, obs:o, speed:this._speed * 0.7, vy:5.5, spin:(4 + Math.random()*3) * side, roll:0.35 * side, vx:1.8 * side };
    if(this.fx) this.fx.crash(this._player ? this._player.position : o.mesh.position);
    if(this.cb.onCrash) this.cb.onCrash();
  };

  GameEngine.prototype.currentScore = function(){
    const base = Math.floor(this._dist) + this._obstacleBonus + this._coinCredits + this._nearMissBonus;
    return Math.max(0, Math.floor(base * (this.mult ? this.mult.scoreFactor : 1)));
  };

  GameEngine.prototype._gameOver = function(){
    this.playing = false;
    const score = this.currentScore();
    const carId = this.car.id, routeId = this.route.id;
    const result = { score, time:this._time, carId, routeId, reason:this._endReason || null };
    if(this.cb.onGameOver) this.cb.onGameOver(result);
  };

  DG.GameEngine = GameEngine;
})();
