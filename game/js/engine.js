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
    renderer.setPixelRatio(Math.min((window.devicePixelRatio||1) < 1.5 ? (window.devicePixelRatio||1) * 1.25 : (window.devicePixelRatio||1), 2));
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

    // Asphalte : grain procedural qui defile avec la vitesse (sinon la route
    // parait peinte et immobile sous les bandes qui, elles, bougent).
    this._roadTex = asphaltTexture(T);
    this.roadMat = new T.MeshStandardMaterial({ color:0x050609, metalness:0.35, roughness:0.7, map:this._roadTex, roughnessMap:this._roadTex });
    const road = new T.Mesh(new T.PlaneGeometry(14, 260), this.roadMat);
    road.rotation.x = -Math.PI/2; road.position.z = -100; scene.add(road);

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
      const edge = new T.Mesh(new T.BoxGeometry(0.16,0.18,260), this.edgeMat);
      edge.position.set(x, 0.12, -100); scene.add(edge);
      return edge;
    });

    // Lignes de rive continues (comme sur une vraie 2x4 voies)
    this.edgeLineMat = new T.MeshBasicMaterial({ color:0xd8dee6 });
    [-4.45, 4.45].forEach(x=>{
      const l = new T.Mesh(new T.PlaneGeometry(0.14, 260), this.edgeLineMat);
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
    // Poses devant la camera : un rendu reel (hors ecran, dans une petite cible)
    // envoie aussi leurs textures au GPU — compile() seul ne le fait pas.
    const put = (o)=>{ if(!o) return; o.position.set((tmp.length % 9 - 4) * 1.6, 0.5, -14 - Math.floor(tmp.length / 9) * 4); this.scene.add(o); tmp.push(o); };
    if(this._coneModel) put(this._instance(this._coneModel, 1.0, 0, false));
    (this._trafficModels || []).forEach(t=>put(this._instance(t.model, t.len, Math.PI, true)));
    ['coin', 'nitro', 'multiplier'].forEach(kind=>{
      if(!this._pickupProto) this._pickupProto = {};
      if(!this._pickupProto[kind]){
        const proto = pickupMesh(T, kind);
        if(this.fx) this.fx.decoratePickup(proto, kind);
        this._pickupProto[kind] = proto;
      }
      put(this._pickupProto[kind].clone(true));
    });
    tmp.forEach(o=>this._sharpenTextures(o));
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

    const model = await DG.Loader.loadModel('../' + car.model);
    this._player = model ? DG.Loader.normalizeModel(T, model, 3.4, Math.PI - (car.rotY||0)) : DG.Loader.makeFallbackCar(T, { body:car.body, emissive:0x0a0e16 });
    this._player.position.set(0,0,0);
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
    this._speed = this.mult.baseSpeed;
    this._boostFuel = 1; this._boostHeld = false; this._boostActive = false;
    this._dist = 0; this._time = 0; this._spawnT = 0.7; this._pickupT = 1.2;
    this._obstacleBonus = 0; this._coinCredits = 0; this._nearMissBonus = 0;
    this._multiplier = 1; this._multiplierT = 0;
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
    const m = new T.Group();
    const mat = new T.MeshStandardMaterial({ color:0x3df0ff, emissive:0x18c8ff, emissiveIntensity:0.9, metalness:0.5, roughness:0.2 });
    const body = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.6, 12), mat);
    m.add(body);
    [-0.3, 0.3].forEach(y=>{
      const cap = new T.Mesh(new T.SphereGeometry(0.32, 12, 8), mat);
      cap.position.y = y; m.add(cap);
    });
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
    // Geometrie/materiaux crees une seule fois par type puis partages (avant :
    // nouvelle geometrie a chaque bonus, jamais liberee -> fuite memoire GPU).
    this._pickupProto = this._pickupProto || {};
    if(!this._pickupProto[kind]){
      const proto = pickupMesh(T, kind);
      if(this.fx) this.fx.decoratePickup(proto, kind);
      this._pickupProto[kind] = proto;
    }
    const mesh = this._pickupProto[kind].clone(true);
    mesh.position.set(LANES[li], 1.05, -130);
    this.scene.add(mesh);
    this._pickups.push({ mesh, kind, taken:false, phase:Math.random()*6.28 });
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
      this.camera.lookAt(this._look);
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
      const want = this._boostHeld && this._boostFuel > 0.02;
      this._boostActive = want;
      if(want) this._boostFuel = Math.max(0, this._boostFuel - dt*this.mult.boostDrain);
      else this._boostFuel = Math.min(1, this._boostFuel + dt*this.mult.boostRecharge);
      if(want) scroll *= this.mult.boostPower;
    }

    this._scrollWorld(scroll);
    const speedK = this.playing && this.mult ? Math.max(0, Math.min(1, (this._speed - this.mult.baseSpeed*0.7) / (this.mult.maxSpeed - this.mult.baseSpeed*0.7))) : 0;
    this._speedK = speedK;
    if(this.fx) this.fx.update(dt, scroll, speedK, this.playing && this._boostActive, this.playing);

    if(!this.playing) return;

    // Deplacement lateral (aussi pendant le compte a rebours) : roulis +
    // leger braquage du nez dans le sens du changement de voie.
    const targetX = LANES[this._lane];
    this._playerX += (targetX - this._playerX) * Math.min(1, dt * this.mult.handlingRate);
    if(this._player){
      this._player.position.x = this._playerX;
      this._player.position.y = Math.sin(now*0.02)*0.02 + (this._boostActive ? Math.sin(now*0.09)*0.012 : 0);
      this._player.rotation.z = (targetX - this._playerX) * 0.14;
      this._player.rotation.y = -(targetX - this._playerX) * 0.07;
    }
    this._headlight.intensity += (this._headlightI - this._headlight.intensity) * Math.min(1, dt*3);
    this._headlight.position.set(this._playerX, 1.1, -1.6);
    if(counting) return;

    this._time += dt;
    this._speed += (this.mult.maxSpeed - this._speed) * Math.min(1, dt * this.mult.accelRamp * 0.4);
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
    if(this._pickupT <= 0){ this._pickupT = 1.1 + Math.random()*1.0; this._spawnPickup(); }

    const playerHalfW = this._playerHalfW || 0.55;
    let drafting = false;
    for(let i=this._obstacles.length-1; i>=0; i--){
      const o = this._obstacles[i];
      o.mesh.position.z += scroll - o.v * dt;
      this._trafficAI(o, dt, now);
      const gap = Math.abs(o.mesh.position.x - this._playerX) - ((o.mesh.userData.w||1.2) + playerHalfW);
      if(!o.hit && Math.abs(o.mesh.position.z) < 1.5 && gap < 0){ o.hit = true; this._startCrash(o); return; }
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
      if(o.mesh.position.z > 11){ this.scene.remove(o.mesh); this._release(o.mesh); this._obstacles.splice(i,1); }
    }
    if(drafting && !this._boostActive) this._boostFuel = Math.min(1, this._boostFuel + dt * 0.3);
    if(drafting !== this._drafting){ this._drafting = drafting; if(this.cb.onDraft) this.cb.onDraft(drafting); }

    for(let i=this._pickups.length-1; i>=0; i--){
      const p = this._pickups[i];
      p.mesh.position.z += scroll;
      p.mesh.rotation.y += dt*3;
      p.mesh.position.y = 1.05 + Math.sin(now*0.004 + p.phase) * 0.16;
      if(!p.taken && Math.abs(p.mesh.position.z) < 1.6 && Math.abs(p.mesh.position.x - this._playerX) < 1.1){
        p.taken = true;
        if(this.fx) this.fx.pickup(p.kind, p.mesh.position);
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
      scoreToRecord: this._recordBroken ? 0 : Math.max(0, this._personalBest - score),
      speedK: this._speedK || 0,
      boosting: this._boostActive,
      drafting: this._drafting
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
    return Math.floor(base * (this.mult ? this.mult.scoreFactor : 1));
  };

  GameEngine.prototype._gameOver = function(){
    this.playing = false;
    const score = this.currentScore();
    const carId = this.car.id, routeId = this.route.id;
    const result = { score, time:this._time, carId, routeId };
    if(this.cb.onGameOver) this.cb.onGameOver(result);
  };

  DG.GameEngine = GameEngine;
})();
