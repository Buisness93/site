// Routes jouables — chaque route ne fait que décrire son décor + son ambiance
// (sol, ciel, lumières), le moteur (engine.js) reste identique. Pour ajouter une
// route : ajoute une entrée ici, avec une fonction decor() qui pose des objets
// recyclables des deux côtés de la route, et (optionnel) extras() pour le décor
// fixe lointain (silhouettes, nuages, mer...). Les briques procédurales
// partagées (textures canvas, bandes instanciées...) sont dans scenery.js.
//
// Gabarit de la route (NE JAMAIS poser de décor dedans) : voies à ±1.1/±3.3,
// lignes de rive à ±4.45, bordures à ±5.5. Tout objet posé au sol reste
// au-delà de |x| = 5.6 (seuls les marquages/reflets au sol vont sur la chaussée).
(function(){
  window.DG = window.DG || {};
  const S = () => DG.Scenery;

  // Materiaux partages (cles fixes) : 16 glissieres ne creent plus 48
  // materiaux identiques. Liberes au changement de route par le moteur puis
  // recrees a la volee par three.js s'ils resservent.
  const MATS = {};
  function M(key, make){ return MATS[key] || (MATS[key] = make()); }
  function lambert(hex){ return M('lam:' + hex, ()=>new window.THREE.MeshLambertMaterial({ color:hex })); }
  function basic(hex){ return M('bas:' + hex, ()=>new window.THREE.MeshBasicMaterial({ color:hex })); }
  function additive(key, map, hex, op){
    const T = window.THREE;
    return M('add:' + key + ':' + hex + ':' + op, ()=>new T.MeshBasicMaterial({ map, color:hex, transparent:true, opacity:op, blending:T.AdditiveBlending, depthWrite:false }));
  }

  function windowTexture(baseHex, litHex, cols, rows){
    const c = document.createElement('canvas');
    c.width = 32; c.height = 64;
    const ctx = c.getContext('2d');
    const base = '#' + baseHex.toString(16).padStart(6,'0');
    const lit = '#' + litHex.toString(16).padStart(6,'0');
    ctx.fillStyle = base; ctx.fillRect(0,0,32,64);
    const cw = 32/cols, rh = 64/rows;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        if(Math.random() < 0.42){
          ctx.fillStyle = lit;
          ctx.globalAlpha = 0.55 + Math.random()*0.45;
          ctx.fillRect(x*cw+1, y*rh+1, cw-2, rh-2);
        }
      }
    }
    ctx.globalAlpha = 1;
    const tex = new window.THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = window.THREE.RepeatWrapping;
    return tex;
  }

  function building(T, w, h, d, baseHex, litHex){
    const tex = windowTexture(baseHex, litHex, 4, Math.max(4, Math.round(h)));
    tex.repeat.set(1, Math.max(1, h/4));
    const mat = new T.MeshStandardMaterial({
      color: baseHex, emissive: litHex, emissiveMap: tex, emissiveIntensity: 0.85,
      metalness:0.25, roughness:0.85
    });
    const m = new T.Mesh(new T.BoxGeometry(w,h,d), mat);
    return m;
  }

  // Tache de lumiere au sol sous un lampadaire : donne l'impression que la
  // route est eclairee sans ajouter de vraie lumiere dynamique (couteuse).
  function lightPool(T, hex, w, l, op){
    const m = new T.Mesh(M('geo:pool', ()=>new T.PlaneGeometry(1, 1)), additive('pool', S().pool(T), hex, op));
    m.rotation.x = -Math.PI/2; m.scale.set(w, l, 1);
    return m;
  }
  // Reflet etire d'une source lumineuse sur sol mouille (vers le spectateur).
  function wetStreak(T, hex, w, l, op){
    const m = new T.Mesh(M('geo:pool', ()=>new T.PlaneGeometry(1, 1)), additive('streak', S().streak(T), hex, op));
    m.rotation.x = -Math.PI/2; m.scale.set(w, l, 1);
    return m;
  }

  function streetlight(T, x, z, headColor){
    const g = new T.Group();
    const steel = M('std:lampSteel', ()=>new T.MeshStandardMaterial({ color:0x14161c, metalness:0.6, roughness:0.5 }));
    const pole = new T.Mesh(M('geo:lampPole', ()=>new T.CylinderGeometry(0.07,0.09,4.2,6)), steel);
    pole.position.y = 2.1; g.add(pole);
    const arm = new T.Mesh(M('geo:lampArm', ()=>new T.BoxGeometry(0.9,0.08,0.08)), steel);
    arm.position.set(x<0?0.45:-0.45, 4.15, 0); g.add(arm);
    const head = new T.Mesh(M('geo:lampHead', ()=>new T.SphereGeometry(0.16,10,8)), basic(headColor));
    head.position.set(x<0?0.85:-0.85, 4.1, 0); g.add(head);
    const glow = new T.PointLight(headColor, 0.9, 9);
    glow.position.copy(head.position); glow.position.y -= 0.05; g.add(glow);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:lampGlowTex(T), color:headColor, transparent:true, opacity:.75, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(2, 2, 1); halo.position.copy(head.position); g.add(halo);
    // cone de lumiere au sol, decale vers la chaussee
    const pool = lightPool(T, headColor, 6.5, 8, 0.3);
    pool.position.set(x<0?1.6:-1.6, 0.035, 0); g.add(pool);
    g.position.set(x, 0, z);
    return g;
  }

  function palmTree(T, x, z){
    const g = new T.Group();
    const trunkMat = new T.MeshStandardMaterial({ color:0x3a2a1e, roughness:0.9 });
    const trunk = new T.Mesh(new T.CylinderGeometry(0.14,0.24,4.6,6), trunkMat);
    trunk.position.y = 2.3; trunk.rotation.z = 0.08; g.add(trunk);
    const frondMat = new T.MeshStandardMaterial({ color:0x1f5c3a, roughness:0.8, side:T.DoubleSide });
    const frondGeo = new T.PlaneGeometry(2.6, 0.55, 1, 1);
    const N = 6;
    for(let i=0;i<N;i++){
      const fr = new T.Mesh(frondGeo, frondMat);
      const a = (i/N)*Math.PI*2;
      fr.position.set(Math.cos(a)*1.1, 4.75, Math.sin(a)*1.1);
      fr.rotation.y = a;
      fr.rotation.z = -0.5;
      g.add(fr);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function guardrail(T, x, z, side){
    const g = new T.Group();
    const railMat = M('std:rail', ()=>new T.MeshStandardMaterial({ color:0x9aa4ad, metalness:0.75, roughness:0.35 }));
    const rail = new T.Mesh(M('geo:rail', ()=>new T.BoxGeometry(0.09, 0.32, 6.6)), railMat);
    rail.position.y = 0.62; g.add(rail);
    const postMat = M('std:railPost', ()=>new T.MeshStandardMaterial({ color:0x2a2e35, metalness:0.5, roughness:0.6 }));
    const postGeo = M('geo:railPost', ()=>new T.BoxGeometry(0.08,0.7,0.08));
    for(let k=-1;k<=1;k++){
      const post = new T.Mesh(postGeo, postMat);
      post.position.set(0, 0.35, k*2.2); g.add(post);
    }
    const reflector = new T.Mesh(M('geo:railRefl', ()=>new T.SphereGeometry(0.045,6,6)), basic(side<0 ? 0xff5a3d : 0xffe27a));
    reflector.position.set(0.08, 0.62, 0); g.add(reflector);
    g.position.set(x, 0, z);
    return g;
  }

  // Panneau de signalisation autoroutiere (fond vert/bleu, texte blanc) dessine
  // en canvas : retro-reflechissant la nuit, donc MeshBasic (lisible sans lumiere).
  function signTexture(T, bg, lines, arrow){
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#f4f6f8'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
    g.fillStyle = '#f4f6f8'; g.textBaseline = 'middle';
    g.font = '800 64px "Saira Condensed", Arial Narrow, Arial, sans-serif';
    g.fillText(lines[0], 44, 92);
    g.font = '700 46px "Saira Condensed", Arial Narrow, Arial, sans-serif';
    g.fillText(lines[1], 44, 176);
    if(arrow){ g.font = '900 110px Arial, sans-serif'; g.fillText(arrow, 380, 132); }
    const tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }
  const SIGNS = [
    { bg:'#0b6b3a', lines:['GENÈVE', 'Lausanne 64 km'], arrow:'↑' },
    { bg:'#1d4fa8', lines:['SORTIE 12', 'Aéroport · Centre'], arrow:'↗' },
    { bg:'#0b6b3a', lines:['MONTREUX', 'Sion 92 km'], arrow:'↑' },
    { bg:'#1d4fa8', lines:['AIRE DE REPOS', 'Station 2 km'], arrow:'⛽' },
  ];
  let _signIdx = 0;
  function gantry(T, z){
    const g = new T.Group();
    const steel = M('std:gantry', ()=>new T.MeshStandardMaterial({ color:0x6d7680, metalness:0.8, roughness:0.4 }));
    [-6.4, 6.4].forEach(x=>{
      const post = new T.Mesh(new T.BoxGeometry(0.32, 7.2, 0.32), steel);
      post.position.set(x, 3.6, 0); g.add(post);
    });
    [6.6, 7.3].forEach(y=>{
      const beam = new T.Mesh(new T.BoxGeometry(13.2, 0.18, 0.18), steel);
      beam.position.set(0, y, 0); g.add(beam);
    });
    const a = SIGNS[_signIdx++ % SIGNS.length], b = SIGNS[_signIdx++ % SIGNS.length];
    [[-2.6, a], [2.6, b]].forEach(([x, def])=>{
      const m = new T.Mesh(new T.PlaneGeometry(4.6, 2.3), new T.MeshBasicMaterial({ map:signTexture(T, def.bg, def.lines, def.arrow) }));
      m.position.set(x, 5.6, 0.14); g.add(m);
      const back = new T.Mesh(new T.BoxGeometry(4.7, 2.4, 0.08), steel);
      back.position.set(x, 5.6, 0.06); g.add(back);
      // petites rampes d'eclairage du panneau + leur reflet au sol
      const lampBar = new T.Mesh(new T.BoxGeometry(3.8, 0.06, 0.18), basic(0xfff4d8));
      lampBar.position.set(x, 4.3, 0.3); g.add(lampBar);
      const pool = lightPool(T, 0xfff0d0, 5, 5, 0.12);
      pool.position.set(x, 0.036, 1.2); g.add(pool);
    });
    g.position.set(0, 0, z);
    return g;
  }

  function pineTree(T, x, z){
    const g = new T.Group();
    const trunk = new T.Mesh(M('geo:pineTrunk', ()=>new T.CylinderGeometry(0.13,0.18,1.3,6)), M('std:pineTrunk', ()=>new T.MeshStandardMaterial({ color:0x3a2c22, roughness:0.9 })));
    trunk.position.y = 0.65; g.add(trunk);
    const foliageMat = M('std:pineFoliage', ()=>new T.MeshStandardMaterial({ color:0x0b2414, roughness:0.9, flatShading:true }));
    const tiers = 3;
    for(let i=0;i<tiers;i++){
      const s = 1 - i*0.22;
      const cone = new T.Mesh(M('geo:pineCone' + i, ()=>new T.ConeGeometry(1.1*s, 1.6, 7)), foliageMat);
      cone.position.y = 1.5 + i*1.05;
      g.add(cone);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(0.85 + Math.random()*0.5);
    return g;
  }

  function bush(T, x, z){
    const m = new T.Mesh(M('geo:bush', ()=>new T.SphereGeometry(0.55,7,6)), M('std:bush', ()=>new T.MeshStandardMaterial({ color:0x1f3a22, roughness:0.95, flatShading:true })));
    m.position.set(x, 0.45, z);
    m.scale.set(1 + Math.random()*0.5, 0.65 + Math.random()*0.3, 1 + Math.random()*0.4);
    m.rotation.y = Math.random()*Math.PI;
    return m;
  }

  function duneRidge(T, x, z, w, h, hex){
    const m = new T.Mesh(new T.ConeGeometry(w, h, 5, 1), new T.MeshStandardMaterial({ color:hex, roughness:1, flatShading:true }));
    m.rotation.y = Math.random()*Math.PI;
    m.scale.set(1, 0.34, 0.7);
    m.position.set(x, 0, z);
    return m;
  }

  // ---------- Geometries fusionnees (1 appel de dessin par bande instanciee) ----------
  function pineGeo(T){
    return S().merge(T, [
      { geo:new T.CylinderGeometry(0.12, 0.2, 1.4, 5), pos:[0, 0.7, 0], color:0x1e140d },
      { geo:new T.ConeGeometry(1.3, 2.1, 7), pos:[0, 1.95, 0], color:0x0a1f10 },
      { geo:new T.ConeGeometry(1.0, 1.8, 7), pos:[0, 2.95, 0], rot:[0, 0.4, 0], color:0x0c2513 },
      { geo:new T.ConeGeometry(0.66, 1.5, 7), pos:[0, 3.9, 0], rot:[0, 0.9, 0], color:0x0f2b17 },
    ]);
  }
  function roundTreeGeo(T){
    return S().merge(T, [
      { geo:new T.CylinderGeometry(0.1, 0.16, 1.6, 5), pos:[0, 0.8, 0], color:0x1e160f },
      { geo:new T.IcosahedronGeometry(1.15, 0), pos:[0, 2.2, 0], scale:[1, 0.9, 1], color:0x10200f },
      { geo:new T.IcosahedronGeometry(0.8, 0), pos:[0.45, 2.85, 0.2], color:0x142812 },
      { geo:new T.IcosahedronGeometry(0.7, 0), pos:[-0.4, 2.7, -0.3], color:0x122411 },
    ]);
  }
  function grassTuftGeo(T){
    const parts = [];
    for(let k=0;k<5;k++){
      const a = k/5*Math.PI*2;
      parts.push({ geo:new T.ConeGeometry(0.05, 0.75 + (k%2)*0.25, 3), pos:[Math.cos(a)*0.09, 0.38, Math.sin(a)*0.09], rot:[Math.sin(a)*0.35, 0, Math.cos(a)*0.35], color: k%2 ? 0xb2b060 : 0x8a9a4e });
    }
    return S().merge(T, parts);
  }
  function rockGeo(T){
    return S().merge(T, [
      { geo:new T.DodecahedronGeometry(0.6, 0), pos:[0, 0.2, 0], scale:[1.3, 0.7, 1], color:0x7d6d62 },
      { geo:new T.DodecahedronGeometry(0.35, 0), pos:[0.6, 0.1, 0.3], scale:[1, 0.8, 1.2], color:0x8a7a6c },
    ]);
  }
  function lifeguardTowerGeo(T){
    const parts = [];
    [[-0.8,-0.7],[0.8,-0.7],[-0.8,0.7],[0.8,0.7]].forEach(([x,z])=>parts.push({ geo:new T.BoxGeometry(0.14, 2.3, 0.14), pos:[x, 1.15, z], color:0xd8cbb4 }));
    parts.push({ geo:new T.BoxGeometry(2.2, 0.12, 2.0), pos:[0, 2.3, 0], color:0xcfc2aa });
    parts.push({ geo:new T.BoxGeometry(1.7, 1.25, 1.5), pos:[0, 2.98, 0], color:0xd8432f });
    parts.push({ geo:new T.BoxGeometry(1.72, 0.22, 1.52), pos:[0, 2.75, 0], color:0xf2efe6 });
    parts.push({ geo:new T.BoxGeometry(2.3, 0.1, 2.1), pos:[0, 3.66, 0], rot:[0, 0, 0.08], color:0xf2efe6 });
    parts.push({ geo:new T.BoxGeometry(0.06, 1.4, 0.06), pos:[0.7, 4.3, 0.6], color:0xcfc2aa });
    parts.push({ geo:new T.BoxGeometry(0.03, 0.4, 0.6), pos:[0.7, 4.8, 0.9], color:0xe8402a });
    for(let k=0;k<6;k++) parts.push({ geo:new T.BoxGeometry(0.7, 0.06, 0.08), pos:[-1.3 + k*0.02, 0.3 + k*0.38, 1.1 + k*0.12], rot:[0.3, 0, 0], color:0xcfc2aa });
    return S().merge(T, parts);
  }
  function sailboatGeo(T){
    const tri = (a, b, c)=>{ const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([...a, ...b, ...c]), 3)); return g; };
    return S().merge(T, [
      { geo:new T.BoxGeometry(4.2, 0.5, 1.1), pos:[0, 0.25, 0], color:0x24142c },
      { geo:new T.BoxGeometry(0.1, 6.4, 0.1), pos:[0.2, 3.4, 0], color:0x24142c },
      { geo:tri([0.3, 0.8, 0], [0.3, 6.4, 0], [2.4, 0.9, 0]), color:0x3a2440 },
      { geo:tri([0.1, 5.8, 0], [0.1, 0.8, 0], [-1.9, 0.8, 0]), color:0x33203a },
    ]);
  }

  // Modeles .glb ponctuels (palmier/parasol de la plage, station essence de
  // l'autoroute) : charges une seule fois (mis en cache par DG.Loader), puis
  // clones/redimensionnes pour chaque instance posee dans le decor. buildDecor()
  // est synchrone (pose les objets tout de suite, pour le calcul de defilement/
  // wrap) alors que le chargement est async : chaque fonction pose donc un Group
  // vide a la bonne position des l'appel, puis le remplit une fois le modele
  // arrive (repli sur l'ancienne geometrie procedurale si le chargement echoue).
  let _palmModelP = null, _umbrellaModelP = null, _gasStationModelP = null, _lampModelP = null;
  let _cyberBuildingP = null, _singaporeBuildingP = null, _asianSkylineP = null;
  function loadPalmModel(){ if(!_palmModelP) _palmModelP = DG.Loader.loadModel('../uploads/tropical_palm_tree.glb'); return _palmModelP; }
  function loadUmbrellaModel(){ if(!_umbrellaModelP) _umbrellaModelP = DG.Loader.loadModel('../uploads/umbrella_wooden_chair.glb'); return _umbrellaModelP; }
  function loadGasStationModel(){ if(!_gasStationModelP) _gasStationModelP = DG.Loader.loadModel('../uploads/gas-station.glb'); return _gasStationModelP; }
  function loadLampModel(){ if(!_lampModelP) _lampModelP = DG.Loader.loadModel('../uploads/lampadaire.glb'); return _lampModelP; }
  // La facade du modele cyberpunk est gris clair (#e7e7e7) : de nuit elle
  // ressortait presque blanche, comme eclairee en plein jour. On l'assombrit une
  // fois pour toutes (materiau partage par tous les clones) ; ses bandes
  // lumineuses rouge/cyan, elles, restent intactes.
  function loadCyberBuilding(){
    if(!_cyberBuildingP) _cyberBuildingP = DG.Loader.loadModel('../uploads/g1_cyberpunk_building.glb').then(src=>{
      if(src) src.traverse(n=>{
        if(!n.isMesh || !n.material || n.material.name !== 'FrontColor') return;
        n.material.color.setHex(0x030206); n.material.roughness = 0.85; n.material.metalness = 0.15;
      });
      return src;
    });
    return _cyberBuildingP;
  }
  // Meme probleme pour la tour de Singapour (textures claires de jour) : on
  // assombrit tout sauf les materiaux qui ont deja des fenetres lumineuses.
  function loadSingaporeBuilding(){
    if(!_singaporeBuildingP) _singaporeBuildingP = DG.Loader.loadModel('../uploads/singapore_office_skyscraper_free.glb').then(src=>{
      if(src) src.traverse(n=>{ if(n.isMesh && n.material && !n.material.emissiveMap && n.material.color) n.material.color.setHex(0x1c1826); });
      return src;
    });
    return _singaporeBuildingP;
  }
  function loadAsianSkyline(){ if(!_asianSkylineP) _asianSkylineP = DG.Loader.loadModel('../uploads/asian_themed_low_poly_night_city_buildings.glb'); return _asianSkylineP; }

  // Redimensionne un modele charge a une HAUTEUR cible (palmier/parasol : ce qui
  // compte pour s'inserer dans le decor existant, c'est leur hauteur, pas leur
  // emprise au sol). Pose (0,0,0) = base au sol, centre en X/Z.
  function sizeModelByHeight(T, src, targetHeight){
    const clone = src.clone(true);
    const box = new T.Box3().setFromObject(clone);
    const size = new T.Vector3(); box.getSize(size);
    const center = new T.Vector3(); box.getCenter(center);
    const s = targetHeight / (size.y || 1);
    clone.position.set(-center.x, -box.min.y, -center.z);
    const inner = new T.Group(); inner.add(clone); inner.scale.setScalar(s);
    const wrap = new T.Group(); wrap.add(inner);
    return wrap;
  }
  // Meme chose mais a partir de la plus grande EMPRISE au sol (station essence :
  // structure large et basse, sa largeur compte plus que sa hauteur pour la
  // placer sans qu'elle deborde sur la route ou le decor voisin).
  function sizeModelByFootprint(T, src, targetWidth){
    const clone = src.clone(true);
    const box = new T.Box3().setFromObject(clone);
    const size = new T.Vector3(); box.getSize(size);
    const center = new T.Vector3(); box.getCenter(center);
    const s = targetWidth / (Math.max(size.x, size.z) || 1);
    clone.position.set(-center.x, -box.min.y, -center.z);
    const inner = new T.Group(); inner.add(clone); inner.scale.setScalar(s);
    const wrap = new T.Group(); wrap.add(inner);
    return wrap;
  }

  function palmTreeModel(T, x, z, targetHeight, rotY){
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = rotY != null ? rotY : Math.random()*Math.PI*2;
    loadPalmModel().then(src=>{
      holder.add(src ? sizeModelByHeight(T, src, targetHeight) : palmTree(T, 0, 0));
    });
    return holder;
  }

  function umbrellaModelDecor(T, x, z, hex){
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    loadUmbrellaModel().then(src=>{
      holder.add(src ? sizeModelByHeight(T, src, 2.3) : beachUmbrella(T, 0, 0, hex));
    });
    return holder;
  }

  function gasStationModel(T, x, z, rotY){
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = rotY || 0;
    loadGasStationModel().then(src=>{
      if(!src) return; // pas de repli procedural : element rare, on saute juste s'il echoue
      holder.add(sizeModelByFootprint(T, src, 40));
    });
    return holder;
  }

  // Reprend le vrai modele de lampadaire (garde son metal sombre naturel — le
  // teindre en entier avec tintModel() ecrasait tout le detail du fer forge en
  // un aplat de couleur) et n'ajoute que le point lumineux neon pres de la
  // lanterne, comme le faisait l'ancien streetlight() procedural.
  function lampGlowTex(T){ return S().glow(T); }
  function lampModel(T, x, z, headColor, targetHeight, withLight){
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    loadLampModel().then(src=>{
      if(!src){ holder.add(streetlight(T, 0, 0, headColor)); return; }
      const h = targetHeight || 4.5;
      holder.add(sizeModelByHeight(T, src, h));
      const glowY = h * 0.965;
      const glow = new T.Mesh(M('geo:lampGlow' + h, ()=>new T.SphereGeometry(h*0.03, 10, 8)), basic(headColor));
      glow.position.set(0, glowY, 0);
      holder.add(glow);
      const halo = new T.Sprite(new T.SpriteMaterial({ map:lampGlowTex(T), color:headColor, transparent:true, opacity:.8, blending:T.AdditiveBlending, depthWrite:false }));
      halo.scale.set(2.4, 2.4, 1); halo.position.set(0, glowY, 0); holder.add(halo);
      // Une lumiere dynamique par lampadaire coutait cher (chaque lumiere
      // alourdit le shader de TOUS les materiaux) : 1 sur 2 suffit a eclairer
      // la route, le halo donne l'impression que toutes sont allumees.
      if(withLight !== false){
        const light = new T.PointLight(headColor, 1.5, 11);
        light.position.set(0, glowY - 0.05, 0);
        holder.add(light);
      }
    });
    return holder;
  }

  // ---------- Centre-ville neon ----------
  const NEON = [0xff3df0, 0x3df0ff, 0xffe23d, 0x7a3dff, 0x3dffb0, 0xff5a8a];
  const NEON_WORDS = ['HÔTEL', '拉麺', 'BAR', 'ネオン', 'CLUB', '24H', '夜市', 'CAFÉ', 'ARCADE', '酒場', 'SUSHI', 'KARAOKE'];
  const NEON_BANNERS = ['NIGHT MARKET', 'CYBER · CAFÉ', 'PHARMACIE 24/7', 'HOTEL LUMIÈRE', 'ARCADE ∞', 'RAMEN · BAR'];
  let _neonSignI = 0;

  // Animation des enseignes d'un bloc : quelques tubes "fatigues" qui gresillent
  // (micro-coupures irregulieres) et des bandeaux qui respirent doucement. On
  // anime la COULEUR du materiau (propre a chaque enseigne) : la fusion des
  // pieces fixes du bloc (mergeStatic) la conserve, donc aucun cout de dessin.
  function animateSign(G, mat, mode){
    const list = G.userData.signFx || (G.userData.signFx = []);
    list.push({ mat, mode, ph:Math.random() * 10 });
    if(G.userData.tick) return;
    G.userData.tick = (t)=>{
      for(const f of G.userData.signFx){
        let v = 1;
        if(f.mode === 'flicker'){
          const u = (t + f.ph) % 5.3;
          if(u < 0.55) v = Math.sin(u * 97 + f.ph) > 0.1 ? 1 : 0.15;
          else if(u > 3.1 && u < 3.18) v = 0.3;
        } else v = 0.72 + 0.28 * Math.sin(t * 1.7 + f.ph);
        f.mat.color.setScalar(v);
      }
    };
  }

  // Enseignes d'un immeuble : enseigne "drapeau" verticale qui sort de la
  // facade cote route (+ son halo et son reflet sur le trottoir mouille), et
  // parfois un bandeau horizontal plaque sur la facade. inner = distance du
  // centre de l'immeuble a sa facade cote route ; h = hauteur de l'immeuble.
  function neonSigns(T, G, side, inner, h){
    const k = _neonSignI++;
    const col = NEON[(k*5 + 1) % NEON.length];
    const signH = 3.4 + Math.random()*1.8, signW = signH * 0.26;
    const sx = -side*(inner + signW/2 + 0.08);
    const maxY = Math.max(6.2, h - 0.8);
    const cy = Math.min(maxY - signH/2, 5.4 + signH/2 + Math.random()*4);
    const blade = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map:S().bladeSignTex(T, NEON_WORDS[k % NEON_WORDS.length], col), side:T.DoubleSide }));
    blade.scale.set(signW, signH, 1); blade.position.set(sx, cy, 0); G.add(blade);
    if(k % 4 === 1) animateSign(G, blade.material, 'flicker');
    const refl = wetStreak(T, col, 1.1, 7, 0.42);
    refl.position.set(sx, 0.118, 3.5); G.add(refl);
    if(Math.random() < 0.45 && h > 8){
      const bcol = NEON[(k*3 + 4) % NEON.length];
      const banner = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map:S().bannerTex(T, NEON_BANNERS[k % NEON_BANNERS.length], bcol) }));
      banner.scale.set(3.6, 0.68, 1);
      banner.rotation.y = -side*Math.PI/2;
      banner.position.set(-side*(inner + 0.06), 3.4 + Math.random()*1.2, (Math.random()-.5)*1.2);
      G.add(banner);
      if(k % 2 === 0) animateSign(G, banner.material, 'pulse');
    }
    // Ecran hologramme geant sur la facade (1 immeuble sur 3 environ)
    if(k % 3 === 0 && h > 12) holoScreen(T, G, side, inner, h, k);
  }

  // Ecran publicitaire accroche a la facade cote route, tourne a 45 degres vers
  // les voitures qui arrivent (a plat contre la facade, on ne le voyait que par
  // la tranche) : texture partagee dont les pubs defilent (ticker de la route),
  // halo colore devant, reflet au sol.
  function holoScreen(T, G, side, inner, h, k){
    const w = 3.2, hh = 4.6;
    const y = Math.min(h - hh/2 - 1, 9 + Math.random() * 4);
    const scr = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), M('mat:holo' + (k % 2), ()=>new T.MeshBasicMaterial({ map:S().holoAdTex(T, k % 2), toneMapped:false })));
    scr.scale.set(w, hh, 1);
    scr.rotation.y = -side*Math.PI/4;
    scr.position.set(-side*(inner + w*0.38), y, 1.2);
    G.add(scr);
    const col = NEON[(k + 3) % NEON.length];
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:col, transparent:true, opacity:.4, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(w * 2.2, hh * 1.6, 1); halo.position.set(-side*(inner + 0.9), y, scr.position.z); G.add(halo);
    const refl = wetStreak(T, col, 2.2, 9, 0.32);
    refl.position.set(-side*(inner + 1.8), 0.118, 3); G.add(refl);
  }

  // Guirlande de lanternes en papier tendue au-dessus de la rue (ambiance
  // marche de nuit) : cable qui pend en chainette + lanternes chaudes, qui
  // contrastent avec les neons froids. Tout est fixe -> fusionne en 2-3 dessins.
  function lanternString(T, z){
    const g = new T.Group();
    const span = 15, top = 7.6, sag = 1.1, n = 9;
    const at = (u)=>({ x:-span/2 + u*span, y:top - sag * 4 * u * (1 - u) });
    const pts = [];
    for(let i = 0; i <= 24; i++){ const p = at(i/24); pts.push(new T.Vector3(p.x, p.y, 0)); }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), M('line:cable', ()=>new T.LineBasicMaterial({ color:0x05030a }))));
    const warm = [0xff3b2a, 0xff7a1a, 0xff3b2a, 0xffc23d];
    for(let i = 1; i < n; i++){
      const p = at(i/n), col = warm[i % warm.length];
      const body = new T.Mesh(M('geo:lantern', ()=>new T.CylinderGeometry(0.2, 0.2, 0.46, 10)), basic(col));
      body.position.set(p.x, p.y - 0.34, 0); g.add(body);
      const cap = new T.Mesh(M('geo:lanternCap', ()=>new T.CylinderGeometry(0.12, 0.12, 0.06, 8)), basic(0x1a0c06));
      cap.position.set(p.x, p.y - 0.08, 0); g.add(cap);
      const glowS = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:col, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false }));
      glowS.scale.set(1.6, 1.6, 1); glowS.position.set(p.x, p.y - 0.34, 0); g.add(glowS);
    }
    g.position.set(0, 0, z);
    return g;
  }

  // Distributeur de boissons sur le trottoir : caisson sombre + facade eclairee
  // (MeshBasic : lumineux sans lumiere dynamique) et sa flaque de lumiere.
  function vendingMachine(T, x, z, colorHex){
    const g = new T.Group();
    const side = x < 0 ? -1 : 1;
    const body = new T.Mesh(M('geo:vendBody', ()=>{ const b = new T.BoxGeometry(0.9, 1.9, 0.7); b.translate(0, 0.95, 0); return b; }), M('std:vendBody', ()=>new T.MeshStandardMaterial({ color:0x1a1d26, roughness:0.4, metalness:0.6 })));
    g.add(body);
    const face = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), M('mat:vend' + colorHex, ()=>new T.MeshBasicMaterial({ map:S().vendingTex(T, colorHex), toneMapped:false })));
    face.scale.set(0.78, 1.62, 1); face.position.set(0, 1.0, 0.356); g.add(face);
    const pool = new T.Mesh(M('geo:pool', ()=>new T.PlaneGeometry(1, 1)), additive('pool', S().pool(T), colorHex, 0.5));
    pool.rotation.x = -Math.PI/2; pool.scale.set(2.2, 2.2, 1); pool.position.set(0, 0.12, 1.0); g.add(pool);
    g.rotation.y = -side * Math.PI/2; // facade tournee vers la route
    g.position.set(x, 0, z);
    return g;
  }


  // Batiment de la rue neon : pioche au hasard entre le batiment procedural
  // (fenetres neon generees) et 2 vrais modeles .glb — sinon c'etait toujours
  // la meme silhouette de boite qui se repetait le long de la rue.
  // IMPORTANT : dimensionne au GABARIT AU SOL (largeur/profondeur), pas a la
  // hauteur — le gratte-ciel de Singapour a un socle tres large par rapport a
  // sa hauteur (podium vitre) ; le dimensionner par hauteur le rendait 3-4x
  // plus large qu'un batiment procedural une fois mis a la meme echelle,
  // assez pour deborder sur la route et la cacher completement.
  // Les modeles sont tournes par quarts de tour seulement (facades alignees
  // sur la rue, emprise laterale bornee a footprint/2).
  function neonBuilding(T, x, z, colorHex){
    const side = x < 0 ? -1 : 1;
    const G = new T.Group();
    G.position.set(x, 0, z);
    const roll = Math.random();
    if(roll < 0.34){
      const h = 11 + Math.random()*30;
      const m = building(T, 3.9, h, 3.9, 0x0a0812, colorHex);
      m.position.set(0, h/2, 0);
      G.add(m);
      // tubes neon sur les 2 aretes cote route + corniche lumineuse (1 seul maillage)
      const fx = -side*1.97;
      G.add(new T.Mesh(S().merge(T, [
        { geo:new T.BoxGeometry(0.1, h, 0.1), pos:[fx, h/2, -1.97] },
        { geo:new T.BoxGeometry(0.1, h, 0.1), pos:[fx, h/2, 1.97] },
        { geo:new T.BoxGeometry(0.1, 0.1, 4.0), pos:[fx, h - 0.1, 0] },
      ]), basic(colorHex)));
      neonSigns(T, G, side, 1.95, h);
      return G;
    }
    const holder = new T.Group();
    holder.rotation.y = Math.floor(Math.random()*4) * Math.PI/2;
    G.add(holder);
    const footprint = 5 + Math.random()*3; // 5-8, coherent avec le 3.9x3.9 procedural
    const load = roll < 0.67 ? loadCyberBuilding : loadSingaporeBuilding;
    load().then(src=>{
      if(!src) return;
      holder.add(sizeModelByFootprint(T, src, footprint));
      // facade cote route mesuree sur le modele reel, pour y accrocher l'enseigne
      G.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(holder);
      const inner = side < 0 ? box.max.x - G.position.x : G.position.x - box.min.x;
      neonSigns(T, G, side, Math.max(1, Math.min(footprint*0.72, inner)), Math.min(30, box.max.y - box.min.y));
    });
    return G;
  }

  // Repere de fond occasionnel (grappe de buildings + enseignes lumineuses
  // deja composee) : pose loin derriere les batiments du premier plan pour
  // donner un peu de profondeur a la skyline, sans se substituer aux batiments
  // au bord de la route (sa forme, large et basse, ne leur ressemble pas).
  function neonSkylineBackdrop(T, x, z){
    const holder = new T.Group();
    holder.position.set(x, 0, z);
    loadAsianSkyline().then(src=>{ if(src) holder.add(sizeModelByFootprint(T, src, 34)); });
    return holder;
  }

  // Portique neon au-dessus de la rue (poteaux sur les trottoirs, bien au-dessus
  // des plus hauts vehicules) : repere fort et rare de l'identite "centre-ville".
  function neonArch(T, z){
    const g = new T.Group();
    const steel = M('std:archSteel', ()=>new T.MeshStandardMaterial({ color:0x16121e, metalness:0.7, roughness:0.4 }));
    const a = basic(0xff3df0), b = basic(0x3df0ff);
    [-6.5, 6.5].forEach(x=>{
      const post = new T.Mesh(new T.BoxGeometry(0.34, 9.4, 0.34), steel); post.position.set(x, 4.7, 0); g.add(post);
      const tube = new T.Mesh(new T.BoxGeometry(0.08, 9.2, 0.08), a); tube.position.set(x - Math.sign(x)*0.2, 4.6, 0.2); g.add(tube);
      const refl = wetStreak(T, 0xff3df0, 0.8, 10, 0.5); refl.position.set(x - Math.sign(x)*1.3, 0.03, 5); g.add(refl);
    });
    const top = new T.Mesh(new T.BoxGeometry(13.4, 0.4, 0.4), steel); top.position.set(0, 9.4, 0); g.add(top);
    const t1 = new T.Mesh(new T.BoxGeometry(13.0, 0.08, 0.08), a); t1.position.set(0, 9.15, 0.24); g.add(t1);
    const t2 = new T.Mesh(new T.BoxGeometry(12.2, 0.08, 0.08), b); t2.position.set(0, 8.3, 0.1); g.add(t2);
    const sign = new T.Mesh(new T.PlaneGeometry(6.4, 1.2), new T.MeshBasicMaterial({ map:S().bannerTex(T, 'CENTRE · NÉON', 0x3df0ff) }));
    sign.position.set(0, 7.5, 0.12); g.add(sign);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0x7a3dff, transparent:true, opacity:.35, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(16, 5, 1); halo.position.set(0, 8.4, 0); g.add(halo);
    const refl = wetStreak(T, 0x3df0ff, 3.2, 14, 0.28); refl.position.set(0, 0.03, 7); g.add(refl);
    g.position.set(0, 0, z);
    return g;
  }

  // Essaim de lucioles a l'oree du bois : points vert-jaune qui flottent et
  // s'allument/s'eteignent chacun a son rythme (sprites, anime par tick).
  function fireflies(T, x, z){
    const g = new T.Group();
    const mat = M('spr:firefly', ()=>new T.SpriteMaterial({ map:S().glow(T), color:0xd8ff6a, transparent:true, blending:T.AdditiveBlending, depthWrite:false }));
    const bugs = [];
    for(let k = 0; k < 7; k++){
      // materiau propre a chaque luciole : chacune clignote a son rythme
      const s = new T.Sprite(k ? mat.clone() : mat);
      s.scale.set(0.32, 0.32, 1); g.add(s);
      bugs.push({ s, ox:(Math.random()-.5)*3, oy:0.5 + Math.random()*1.6, oz:(Math.random()-.5)*5, ph:Math.random()*20 });
    }
    g.userData.tick = (t)=>{
      for(const b of bugs){
        b.s.position.set(b.ox + Math.sin(t*0.7 + b.ph)*0.5, b.oy + Math.sin(t*1.1 + b.ph*1.3)*0.3, b.oz + Math.cos(t*0.5 + b.ph)*0.5);
        const f = (t*0.45 + b.ph) % 1;
        b.s.material.opacity = f < 0.45 ? Math.sin(f / 0.45 * Math.PI) : 0.05;
      }
    };
    g.position.set(x, 0, z);
    return g;
  }

  // Bouche d'egout qui fume sur le trottoir : quelques sprites qui montent et
  // s'estompent en boucle (anime par userData.tick, aucune allocation).
  function steamVent(T, x, z){
    const g = new T.Group();
    const grate = new T.Mesh(M('geo:grate', ()=>new T.CylinderGeometry(0.45, 0.45, 0.03, 12)), lambert(0x1a1622));
    grate.position.y = 0.12; g.add(grate);
    const puffs = [];
    for(let k=0;k<3;k++){
      const s = new T.Sprite(new T.SpriteMaterial({ map:S().cloud(T), color:0x9a86c0, transparent:true, opacity:0, depthWrite:false }));
      g.add(s); puffs.push({ s, p:k/3 });
    }
    g.userData.tick = (t)=>{
      for(let k=0;k<puffs.length;k++){
        const q = puffs[k], u = (t*0.32 + q.p) % 1;
        q.s.position.set(Math.sin(u*5 + k)*0.25, 0.3 + u*3.4, 0);
        q.s.scale.set(1.2 + u*3.2, 0.7 + u*1.8, 1);
        q.s.material.opacity = (u < 0.12 ? u/0.12 : 1 - (u-0.12)/0.88) * 0.26;
      }
    };
    g.position.set(x, 0, z);
    return g;
  }

  // Parasol de plage colore (remplace les anciens "tas" violets qui ne lisaient
  // pas comme du sable) : mat + toile conique rayee, pose pres de la route.
  function beachUmbrella(T, x, z, hex){
    const g = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(0.045,0.045,1.7,6), new T.MeshStandardMaterial({ color:0xe8e2d4, roughness:0.6 }));
    pole.position.y = 0.85; g.add(pole);
    const canopy = new T.Mesh(new T.ConeGeometry(0.95,0.55,10,1,true), new T.MeshStandardMaterial({ color:hex, roughness:0.75, side:T.DoubleSide, flatShading:true }));
    canopy.position.y = 1.75; g.add(canopy);
    const tip = new T.Mesh(new T.SphereGeometry(0.045,6,6), new T.MeshStandardMaterial({ color:0xe8e2d4 }));
    tip.position.y = 2.05; g.add(tip);
    g.position.set(x, 0, z);
    return g;
  }

  // Mer (fixe) : un seul grand plan en degrade turquoise du bord -> bleu
  // profond au large, qui se fond dans la brume rosee de l'horizon. Remplace
  // les 16 tuiles qui defilaient (et s'arretaient net a 46 unites du bord :
  // au-dela on voyait du sable jusqu'a l'horizon).
  function seaTexture(T){
    const c = document.createElement('canvas');
    c.width = 512; c.height = 4;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0,0,512,0);
    g.addColorStop(0, '#3aa39c');
    g.addColorStop(0.012, '#2a8290');
    g.addColorStop(0.05, '#215f80');
    g.addColorStop(0.16, '#22446c');
    g.addColorStop(0.45, '#33345e');
    g.addColorStop(1, '#46305a');
    ctx.fillStyle = g; ctx.fillRect(0,0,512,4);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    return t;
  }

  // Bande de sable mouille + ecume qui lèche le rivage (entre sable et mer).
  const SHORE_X = 13;

  // ---------- Japon · Sakura ----------
  const SAKURA_PINKS = [0xff8fb8, 0xff76a6, 0xffa3c6, 0xf0709e, 0xffb8d2, 0xff6a9c];

  // Cerisier en fleurs : tronc noueux + 6-7 boules de fleurs roses (couleurs de
  // sommet), fusionne en UNE geometrie -> 1 appel de dessin par arbre, et
  // instanciable par centaines pour les rangees du fond.
  function sakuraGeo(T){
    return M('geo:sakura', ()=>{
      const bark = 0x3a2420;
      const parts = [
        { geo:new T.CylinderGeometry(0.13, 0.24, 2.3, 6), pos:[0, 1.15, 0], color:bark },
        { geo:new T.CylinderGeometry(0.06, 0.11, 1.5, 5), pos:[0.42, 2.25, 0.1], rot:[0.2, 0, -0.85], color:bark },
        { geo:new T.CylinderGeometry(0.05, 0.1, 1.3, 5), pos:[-0.38, 2.2, -0.15], rot:[-0.2, 0, 0.8], color:bark },
      ];
      const blobs = [[0, 3.05, 0, 1.35], [1.05, 2.75, 0.3, 1.0], [-1.0, 2.7, -0.2, 1.05], [0.35, 3.55, -0.6, 0.95], [-0.45, 3.4, 0.65, 0.9], [0.2, 2.5, -0.95, 0.85], [-0.2, 2.45, 1.0, 0.8]];
      blobs.forEach((b, k)=>parts.push({ geo:new T.IcosahedronGeometry(b[3], 1), pos:[b[0], b[1], b[2]], scale:[1, 0.78, 1], color:SAKURA_PINKS[k % SAKURA_PINKS.length] }));
      return S().merge(T, parts);
    });
  }
  function sakuraMat(T){
    return M('lam:sakura', ()=>new T.MeshLambertMaterial({ vertexColors:true, emissive:0x24060f }));
  }
  function sakuraTree(T, x, z, scale){
    const g = new T.Group();
    const tree = new T.Mesh(sakuraGeo(T), sakuraMat(T));
    tree.scale.setScalar(scale || 1); tree.rotation.y = Math.random() * Math.PI * 2;
    g.add(tree);
    // tapis de petales tombes au pied de l'arbre
    const carpet = new T.Mesh(M('geo:pool', ()=>new T.PlaneGeometry(1, 1)), M('mat:petalCarpet', ()=>new T.MeshBasicMaterial({ map:S().pool(T), color:0xffb0cc, transparent:true, opacity:.55, depthWrite:false })));
    carpet.rotation.x = -Math.PI/2; carpet.scale.set(4.6 * (scale || 1), 4.6 * (scale || 1), 1); carpet.position.y = 0.02;
    g.add(carpet);
    g.position.set(x, 0, z);
    return g;
  }

  // Torii rouge au-dessus de la route (piliers sur les bas-cotes) : repere fort
  // et rare, comme le portique de la ville neon.
  function torii(T, z){
    const g = new T.Group();
    const red = M('std:toriiRed', ()=>new T.MeshStandardMaterial({ color:0xc42a1e, roughness:0.55, metalness:0.05, emissive:0x2a0602 }));
    const black = M('std:toriiBlack', ()=>new T.MeshStandardMaterial({ color:0x141012, roughness:0.6 }));
    [-6.3, 6.3].forEach(x=>{
      const pil = new T.Mesh(M('geo:toriiPillar', ()=>new T.CylinderGeometry(0.3, 0.36, 7.4, 14)), red); pil.position.set(x, 3.7, 0); g.add(pil);
      const foot = new T.Mesh(M('geo:toriiFoot', ()=>new T.CylinderGeometry(0.44, 0.44, 0.55, 14)), black); foot.position.set(x, 0.27, 0); g.add(foot);
      // lanterne suspendue sous la traverse + son halo
      const lamp = new T.Mesh(M('geo:lantern', ()=>new T.CylinderGeometry(0.2, 0.2, 0.46, 10)), basic(0xffb347)); lamp.position.set(x * 0.72, 5.0, 0.25); g.add(lamp);
      const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xffa040, transparent:true, opacity:.6, blending:T.AdditiveBlending, depthWrite:false }));
      halo.scale.set(2.2, 2.2, 1); halo.position.copy(lamp.position); g.add(halo);
    });
    const nuki = new T.Mesh(new T.BoxGeometry(14.2, 0.36, 0.32), red); nuki.position.set(0, 5.7, 0); g.add(nuki);
    const shimaki = new T.Mesh(new T.BoxGeometry(15.4, 0.34, 0.5), red); shimaki.position.set(0, 6.95, 0); g.add(shimaki);
    const kasagi = new T.Mesh(new T.BoxGeometry(15.2, 0.4, 0.66), black); kasagi.position.set(0, 7.32, 0); g.add(kasagi);
    // extremites relevees du linteau (silhouette caracteristique du torii)
    [-1, 1].forEach(s=>{
      const tip = new T.Mesh(M('geo:toriiTip', ()=>new T.BoxGeometry(1.6, 0.4, 0.66)), black);
      tip.position.set(s*8.25, 7.5, 0); tip.rotation.z = s*0.22; g.add(tip);
    });
    const plaque = new T.Mesh(new T.BoxGeometry(1.0, 1.25, 0.14), black); plaque.position.set(0, 6.32, 0.02); g.add(plaque);
    const label = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map:S().bladeSignTex(T, '京都', 0xffd27a) }));
    label.scale.set(0.7, 1.05, 1); label.position.set(0, 6.32, 0.1); g.add(label);
    const refl = lightPool(T, 0xff7040, 16, 8, 0.12); refl.position.set(0, 0.03, 1); g.add(refl);
    g.position.set(0, 0, z);
    return g;
  }

  // Lanterne de pierre (toro) au bord de la route : flamme chaude dans la
  // cage, halo et flaque de lumiere au sol (sans lumiere dynamique).
  function stoneLantern(T, x, z){
    const g = new T.Group();
    const stone = M('std:stone', ()=>new T.MeshStandardMaterial({ color:0x8c8680, roughness:0.95 }));
    const add = (geo, y, mat, rotY)=>{ const m = new T.Mesh(geo, mat || stone); m.position.y = y; if(rotY) m.rotation.y = rotY; g.add(m); return m; };
    add(M('geo:toroBase', ()=>new T.CylinderGeometry(0.34, 0.42, 0.26, 6)), 0.13);
    add(M('geo:toroPole', ()=>new T.CylinderGeometry(0.12, 0.15, 0.95, 6)), 0.73);
    add(M('geo:toroDeck', ()=>new T.BoxGeometry(0.62, 0.12, 0.62)), 1.26);
    add(M('geo:toroFire', ()=>new T.BoxGeometry(0.4, 0.36, 0.4)), 1.5, basic(0xffc070));
    add(M('geo:toroRoof', ()=>new T.ConeGeometry(0.6, 0.38, 4)), 1.87, null, Math.PI/4);
    add(M('geo:toroTip', ()=>new T.SphereGeometry(0.09, 8, 6)), 2.1);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xffa850, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(1.9, 1.9, 1); halo.position.y = 1.5; g.add(halo);
    const pool = lightPool(T, 0xffa050, 3.4, 3.4, 0.28); pool.position.y = 0.02; g.add(pool);
    g.position.set(x, 0, z);
    return g;
  }

  // Maison traditionnelle (machiya) en retrait : bois sombre, etage enduit
  // blanc, toit de tuiles a deux pans, fenetres a claire-voie eclairees et
  // lanterne rouge a l'entree, cote route.
  function machiya(T, x, z){
    const side = x < 0 ? -1 : 1;
    const g = new T.Group();
    const w = 4.2 + Math.random()*1.6, d = 4.4, h = 3.1;
    const wood = M('std:machiyaWood', ()=>new T.MeshStandardMaterial({ color:0x2e1d16, roughness:0.85 }));
    const plaster = M('std:machiyaPlaster', ()=>new T.MeshStandardMaterial({ color:0xd9d0c0, roughness:0.9 }));
    const tile = M('std:machiyaTile', ()=>new T.MeshStandardMaterial({ color:0x2a2e36, roughness:0.7, metalness:0.2 }));
    const low = new T.Mesh(new T.BoxGeometry(d, h*0.6, w), wood); low.position.y = h*0.3; g.add(low);
    const up = new T.Mesh(new T.BoxGeometry(d*0.96, h*0.4, w*0.96), plaster); up.position.y = h*0.8; g.add(up);
    // toit a 2 pans : prisme triangulaire (cylindre a 3 faces couche le long de z)
    const roof = new T.Mesh(new T.CylinderGeometry(d*0.72, d*0.72, w + 0.8, 3, 1), tile);
    roof.rotation.x = -Math.PI/2; roof.scale.set(1, 1, 0.42); // pointe vers le haut, aplatie
    roof.position.y = h + 0.5; g.add(roof);
    // facade cote route : 2 fenetres chaudes + lanterne
    const fx = -side*(d/2 + 0.02);
    const winMat = M('mat:machiyaWin', ()=>new T.MeshBasicMaterial({ color:0xffb35a }));
    [-w*0.24, w*0.24].forEach(oz=>{
      const win = new T.Mesh(M('geo:unitPlane', ()=>new T.PlaneGeometry(1, 1)), winMat);
      win.scale.set(1.1, 0.8, 1); win.rotation.y = -side*Math.PI/2; win.position.set(fx, h*0.34, oz); g.add(win);
    });
    const lamp = new T.Mesh(M('geo:lantern', ()=>new T.CylinderGeometry(0.2, 0.2, 0.46, 10)), basic(0xff3b2a));
    lamp.position.set(fx - side*0.3, 2.0, 0); g.add(lamp);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xff5a30, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(1.8, 1.8, 1); halo.position.copy(lamp.position); g.add(halo);
    const pool = lightPool(T, 0xffa050, 5, 3, 0.2); pool.position.set(fx - side*1.8, 0.02, 0); g.add(pool);
    g.position.set(x, 0, z);
    return g;
  }

  // Pagode a 5 etages (repere rare, en retrait) : corps rouges, toits sombres
  // debordants, fenetres eclairees et fleche doree.
  function pagoda(T, x, z){
    const g = new T.Group();
    const red = M('std:pagodaRed', ()=>new T.MeshStandardMaterial({ color:0x8e2a20, roughness:0.7 }));
    const roofM = M('std:pagodaRoof', ()=>new T.MeshStandardMaterial({ color:0x1e2026, roughness:0.6, metalness:0.2 }));
    const warm = basic(0xffc070);
    let y = 0.8;
    const base = new T.Mesh(new T.BoxGeometry(6.4, 0.8, 6.4), M('std:stone', ()=>new T.MeshStandardMaterial({ color:0x8c8680, roughness:0.95 })));
    base.position.y = 0.4; g.add(base);
    for(let k = 0; k < 5; k++){
      const s = 4.2 - k*0.55, bh = 1.7 - k*0.1;
      const body = new T.Mesh(new T.BoxGeometry(s, bh, s), red); body.position.y = y + bh/2; g.add(body);
      const win = new T.Mesh(new T.BoxGeometry(s*0.5, bh*0.4, s + 0.02), warm); win.position.y = y + bh*0.5; g.add(win);
      y += bh;
      const roof = new T.Mesh(new T.ConeGeometry((s + 2.4) * 0.72, 0.9, 4), roofM);
      roof.rotation.y = Math.PI/4; roof.position.y = y + 0.3; g.add(roof);
      y += 0.55;
    }
    const spire = new T.Mesh(new T.CylinderGeometry(0.06, 0.1, 3, 6), basic(0xd9a441)); spire.position.y = y + 1.4; g.add(spire);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xff9a50, transparent:true, opacity:.3, blending:T.AdditiveBlending, depthWrite:false }));
    halo.scale.set(16, 20, 1); halo.position.y = y * 0.55; g.add(halo);
    g.position.set(x, 0, z);
    return g;
  }

  const ROUTES = [
    {
      id:'autoroute-nuit', name:'Autoroute Nocturne', difficulty:'Standard', spacing:9,
      fog:0x0c1322, fogNear:30, fogFar:140, ground:0x06090a, exposure:1.08,
      road:0x0b0d12, stripe:0xd8dee6, edge:0x1b2129, edgeEmissive:0x1a2a3a,
      sky:{ top:0x000103, mid:0x01040c, bottom:0x071022, glow:0x8fa8ff, glowI:0.14 },
      light:{ key:0xaebeda, keyI:0.9, hemiSky:0x2c3a5e, hemiGround:0x05050a, hemiI:0.5, ambient:0xffffff, ambientI:0.18 },
      stars:true, headlights:2.6,
      celestial:{ color:0xf2f4ff, halo:0x8fa8ff, size:15, x:-70, y:64, haloOp:.3, tex:(T)=>S().moon(T) },
      horizonGlow:{ color:0xff9a4a, op:.18, y:4, w:320, h:30 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      // Decor lointain fixe : 2 chaines de montagnes (sommets enneiges sous la
      // lune, villages eclaires au pied), antenne-relais clignotante, nuages.
      extras(T, ctx){
        const Sc = S();
        const fog = this.fog;
        const far = Sc.ridged(11), near = Sc.fbm(5);
        ctx.add(Sc.silhouette(T, {
          radius:228, height:84, yBase:-6, peak:50, top:0x1e2a44, bottom:fog, rim:0x8c9cc4, rimA:.3,
          profile:(a)=> 6 + far(a*7 + 40) * 44 * (0.45 + 0.55*Math.abs(Math.sin(a*1.4 + 0.6))),
          decorate(g, o){
            // neige sur les plus hauts sommets
            for(let x=0;x<o.W;x++){
              const h = o.profile[x]; if(h < 30) continue;
              const y = o.toPx(h), depth = (h - 30) * 1.2 * (0.7 + 0.3*Math.sin(x*0.37));
              const gr = g.createLinearGradient(0, y, 0, y + depth);
              gr.addColorStop(0, 'rgba(170,186,220,.32)'); gr.addColorStop(1, 'rgba(196,210,240,0)');
              g.fillStyle = gr; g.fillRect(x, y, 1, depth);
            }
          }
        }));
        let mast = null;
        const nearMesh = ctx.add(Sc.silhouette(T, {
          radius:196, height:50, yBase:-6, peak:18, top:0x0b101c, bottom:fog, rim:0x33425f, rimA:.3,
          profile:(a)=> 1.5 + near(a*11 + 7) * 15,
          decorate(g, o){
            // lumieres de villages au pied des collines
            for(let i=0;i<150;i++){
              const x = Math.floor(Math.random()*o.W);
              const top = o.toPx(o.profile[x]);
              const y = top + (o.horizonPx - top) * (0.35 + Math.random()*0.6);
              g.fillStyle = Math.random() < 0.8 ? 'rgba(255,196,120,' + (0.5 + Math.random()*0.5) + ')' : 'rgba(200,220,255,.8)';
              g.fillRect(x, y, Math.random() < 0.3 ? 2 : 1, 1);
            }
            // antenne-relais sur une crete, un peu a gauche de l'axe
            const mx = Math.round(o.W * 0.62), my = o.toPx(o.profile[mx]);
            g.strokeStyle = '#0a101c'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(mx, my + 2); g.lineTo(mx, my - 26); g.stroke();
            g.beginPath(); g.moveTo(mx - 4, my + 2); g.lineTo(mx, my - 14); g.lineTo(mx + 4, my + 2); g.stroke();
            mast = [mx, my - 26];
          }
        }));
        if(mast){
          const blink = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.glow(T), color:0xff3a2a, transparent:true, opacity:1, blending:T.AdditiveBlending, depthWrite:false, fog:false })));
          blink.position.copy(nearMesh.userData.worldAt(mast[0], mast[1])); blink.scale.set(3.2, 3.2, 1);
          ctx.tick((dt, t)=>{ blink.material.opacity = (t % 1.6) < 0.25 ? 1 : 0.08; });
        }
        // voiles de nuages sombres eclaires par la lune
        [[-95, 72, 70, 0.28, 0x4a5a80], [-40, 88, 90, 0.2, 0x3a4668], [30, 62, 80, 0.22, 0x2e3a58], [95, 80, 70, 0.18, 0x2a3552], [-130, 48, 60, 0.22, 0x33405e]].forEach(([x, y, w, op, col])=>{
          const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.cloud(T), color:col, transparent:true, opacity:op, depthWrite:false, fog:false })));
          s.scale.set(w, w*0.3, 1); s.position.set(x, y, -210);
        });
        // Etoiles filantes : une trainee traverse le ciel toutes les 4 a 10 s.
        // Tete brillante a l'origine du plan, queue qui s'estompe derriere.
        const shootGeo = new T.PlaneGeometry(0.45, 18); shootGeo.translate(0, 9, 0);
        const shoot = ctx.add(new T.Mesh(shootGeo, new T.MeshBasicMaterial({ map:Sc.beamTex(T), color:0xe6eeff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false, fog:false, side:T.DoubleSide })));
        const star = { wait:3, life:0, dx:0, dy:0 };
        ctx.tick((dt)=>{
          if(star.wait > 0){
            star.wait -= dt;
            if(star.wait <= 0){
              const phi = (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random()*0.5);
              shoot.rotation.z = phi;
              shoot.position.set((Math.random()-.5)*200, 80 + Math.random()*40, -215);
              star.dx = Math.sin(phi) * 110; star.dy = -Math.cos(phi) * 110; star.life = 0;
            }
            return;
          }
          star.life += dt / 0.85;
          shoot.position.x += star.dx * dt; shoot.position.y += star.dy * dt;
          shoot.material.opacity = Math.sin(Math.min(1, star.life) * Math.PI) * 0.9;
          if(star.life >= 1){ shoot.material.opacity = 0; star.wait = 4 + Math.random()*6; }
        });
      },
      buildDecor(T, scene, N){
        const items = [];
        const add = (o)=>{ scene.add(o); items.push(o); return o; };
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const z = -12 - i*9;
          // La station essence a besoin d'une ouverture dans la glissiere pour
          // une vraie entree/sortie (sinon la barriere continue devant son
          // acces donnait l'impression qu'on ne pouvait pas y acceder). Mais son
          // cycle de retour est 5x plus long que celui du reste du decor (voir
          // plus bas) : si on se contentait de ne jamais poser de glissiere ici,
          // l'ouverture reviendrait a CHAQUE tour du decor (144 unites) alors
          // que la station, elle, n'y est que 1 tour sur 5 — une glissiere
          // cassee sans raison 4 fois sur 5. On pose donc 4 glissieres de
          // secours qui partagent le meme cycle long que la station, decalees
          // d'un tour chacune : elles occupent la place a tour de role pendant
          // les 4 tours "sans station", et seul le tour de la station reste
          // ouvert.
          const wrap = this.spacing || 9;
          const hasGasStation = i % 9 === 7;

          if(hasGasStation){
            const gasWrapDist = wrap * N * 5;
            for(let k=1;k<5;k++){
              const filler = guardrail(T, side*4.35, z - wrap*N*k, side);
              filler.userData.wrapDist = gasWrapDist;
              add(filler);
            }
          } else {
            add(guardrail(T, side*4.35, z, side));
          }

          if(i % 3 === 0){
            add(pineTree(T, side*(6.4 + Math.random()*2.4), z + 2.5));
          } else if(i % 3 === 1){
            add(bush(T, side*(5.9 + Math.random()*2), z + 1.5));
          }

          if(i % 4 === 2){
            const h = 4 + Math.random()*6;
            const m = building(T, 3, h, 3, 0x0a0d14, 0x8fa8d0);
            m.position.set(side*(18 + Math.random()*12), h/2, z - 6);
            add(m);
            // halo chaud de la cour eclairee devant la maison
            const pool = lightPool(T, 0xffb060, 7, 7, 0.16);
            pool.position.set(m.position.x - side*2.2, 0.01, m.position.z + 1.5); add(pool);
          }

          if(i % 5 === 0){
            add(streetlight(T, side*5.9, z - 3, 0xffc36b));
          }
          if(i % 3 === 2) add(fireflies(T, side*(7 + Math.random()*2.5), z));

          if(i === 4 || i === 12){
            const gt = gantry(T, z - 1);
            gt.userData.wrapDist = wrap * N * 2;
            add(gt);
          }

          // Station essence : collee au bord de la route (juste apres la
          // glissiere, dont l'ouverture ci-dessus sert d'entree/sortie) pour
          // bien la voir en passant. Le decor scroll/boucle sur une distance
          // courte (144 unites) partagee par tout le reste : sans wrapDist plus
          // grand, ce repere "rare" repasse en fait toutes les quelques
          // secondes a haute vitesse. On lui donne donc son propre cycle de
          // retour, bien plus long.
          if(hasGasStation){
            const gs = gasStationModel(T, side*(15 + Math.random()*3), z - 4, side<0 ? Math.PI*0.5 : -Math.PI*0.5);
            gs.userData.wrapDist = wrap * N * 5;
            add(gs);
          }
        }

        const Sc = S();
        // Balises de bord de route (poteaux blancs + catadioptre ambre/rouge).
        const postGeo = new T.BoxGeometry(0.11, 1.0, 0.11); postGeo.translate(0, 0.5, 0);
        const reflGeo = new T.BoxGeometry(0.125, 0.14, 0.125); reflGeo.translate(0, 0.84, 0);
        const delinPos = (d, i)=>{ const s = i < 2 ? -1 : 1; d.position.set(s*6.45, 0, -(i % 2)*25 - 6); };
        add(Sc.strip(T, postGeo, lambert(0xd6dade), 50, 4, (d, c, i)=>delinPos(d, i)));
        add(Sc.strip(T, reflGeo, new T.MeshBasicMaterial({ color:0xffffff }), 50, 4, (d, c, i)=>{ delinPos(d, i); c.setHex(i < 2 ? 0xffa53a : 0xff4a3a); }));
        // Plots retro-reflechissants ("yeux de chat") entre les tirets et le long des rives.
        const studGeo = new T.BoxGeometry(0.16, 0.035, 0.1);
        add(Sc.strip(T, studGeo, new T.MeshBasicMaterial({ color:0xffffff }), 10, 8, (d, c, i)=>{
          if(i < 6){ d.position.set([-2.2, 0, 2.2][i % 3], 0.035, i < 3 ? -2.5 : -7.5); c.setHex(0xdfe8ff); }
          else { d.position.set(i === 6 ? -4.7 : 4.7, 0.035, -5); c.setHex(i === 6 ? 0xffb347 : 0xff5040); }
        }));
        // Foret : sapins + feuillus instancies (des centaines d'arbres, 2 appels de
        // dessin). A gauche : lisiere proche puis foret profonde derriere les
        // maisons ; a droite : seulement au loin (la station essence est a droite).
        const treeMat = new T.MeshLambertMaterial({ vertexColors:true });
        const placeTree = (d, c, near)=>{
          const left = Math.random() < 0.62;
          let x;
          if(left) x = near ? -(9.8 + Math.random()*5.5) : -(34 + Math.random()*55);
          else x = 44 + Math.random()*50;
          d.position.set(x, 0, -Math.random()*96);
          const s = near ? 0.9 + Math.random()*0.6 : 1.2 + Math.random()*1.5;
          d.scale.set(s * (0.85 + Math.random()*0.3), s, s * (0.85 + Math.random()*0.3));
          d.rotation.y = Math.random()*Math.PI*2;
          const v = 0.42 + Math.random()*0.38;
          c.setRGB(v*(0.8 + Math.random()*0.25), v, v*(0.85 + Math.random()*0.3));
        };
        add(Sc.strip(T, pineGeo(T), treeMat, 96, 46, (d, c, i)=>placeTree(d, c, i < 14)));
        add(Sc.strip(T, roundTreeGeo(T), treeMat, 96, 16, (d, c, i)=>placeTree(d, c, i < 6)));
        return items;
      }
    },
    {
      id:'cote-sunset', name:'Côte au Coucher du Soleil', difficulty:'Détente', spacing:8,
      fog:0x8a4446, fogNear:34, fogFar:175, ground:0x9c6d44, exposure:1.02,
      road:0x1d1715, stripe:0xf2c78a, edge:0x5a3b2c, edgeEmissive:0xff9a4d,
      sky:{ top:0x05031a, mid:0x2c0c3a, bottom:0xd0502a, glow:0xff9a50, glowI:0.75, band:0.07 },
      light:{ key:0xffb27a, keyI:1.2, hemiSky:0xff9d6b, hemiGround:0x2a1810, hemiI:0.6, ambient:0xffcfa0, ambientI:0.3 },
      headlights:0.9,
      celestial:{ color:0xfff0c8, halo:0xff8a3a, size:42, x:55, y:10, haloOp:.5, tex:(T)=>S().sun(T) },
      horizonGlow:{ color:0xff6a3a, op:.3, y:3, w:360, h:46 },
      groundTex(T){ return { tex:S().sandTex(T), rx:40, ry:36 }; },
      // Decor lointain fixe : mer jusqu'a l'horizon + chemin de reflets du
      // soleil, voiliers en contre-jour, collines et cap avec phare, nuages
      // roses, et le liseré d'ecume qui defile le long du rivage.
      extras(T, ctx){
        const Sc = S();
        const fog = this.fog;
        // mer
        const seaW = 320, seaL = 400;
        const sea = new T.Mesh(new T.PlaneGeometry(seaW, seaL), new T.MeshBasicMaterial({ map:seaTexture(T) }));
        sea.rotation.x = -Math.PI/2; sea.position.set(SHORE_X + seaW/2, 0.004, -150); ctx.add(sea);
        // scintillement general des vaguelettes (additif, tres leger)
        const glintTex = Sc.sparkleTex(T).clone(); glintTex.needsUpdate = true; glintTex.repeat.set(26, 30);
        const glint = new T.Mesh(new T.PlaneGeometry(150, 300), new T.MeshBasicMaterial({ map:glintTex, color:0xffc8a0, transparent:true, opacity:0.14, blending:T.AdditiveBlending, depthWrite:false }));
        glint.rotation.x = -Math.PI/2; glint.position.set(SHORE_X + 76, 0.012, -130); ctx.add(glint);
        ctx.scrollTex(glintTex, 30/300);
        // chemin de lumiere du soleil sur l'eau (enveloppe en couleurs de sommets)
        const pathL = 200, pathW = 12;
        const pg = new T.PlaneGeometry(pathW, pathL, 6, 24);
        const pc = new Float32Array(pg.attributes.position.count*3);
        for(let i=0;i<pg.attributes.position.count;i++){
          const u = pg.attributes.uv.getX(i), v = pg.attributes.uv.getY(i);
          const lat = Math.exp(-Math.pow((u - 0.5)*3.6, 2)), along = 0.2 + 0.8*Math.pow(v, 1.3);
          const k = lat*along; pc[i*3] = k; pc[i*3+1] = k*0.8; pc[i*3+2] = k*0.55;
        }
        pg.setAttribute('color', new T.BufferAttribute(pc, 3));
        const pathTex = Sc.sparkleTex(T).clone(); pathTex.needsUpdate = true; pathTex.repeat.set(3, 16);
        const path = new T.Mesh(pg, new T.MeshBasicMaterial({ map:pathTex, vertexColors:true, transparent:true, opacity:0.95, blending:T.AdditiveBlending, depthWrite:false, fog:false }));
        path.rotation.x = -Math.PI/2;
        const pathHolder = new T.Group();
        pathHolder.rotation.y = -Math.atan2(55, 254);
        path.position.set(0, 0.02, -(90 + pathL/2));
        pathHolder.add(path); ctx.add(pathHolder);
        ctx.tick((dt, t)=>{ pathTex.offset.y = (pathTex.offset.y + dt*0.06) % 1; pathTex.offset.x = Math.sin(t*0.7)*0.05; path.material.opacity = 0.85 + Math.sin(t*3.1)*0.1; });
        // rivage : sable mouille + ecume (defile avec la route, va-et-vient de la maree)
        const foamTex = Sc.foamTex(T); foamTex.repeat.set(1, 24);
        const foam = new T.Mesh(new T.PlaneGeometry(6, 300), new T.MeshBasicMaterial({ map:foamTex, transparent:true, depthWrite:false }));
        foam.rotation.x = -Math.PI/2; foam.position.set(SHORE_X - 3.84 + 3, 0.016, -120); ctx.add(foam);
        ctx.scrollTex(foamTex, 24/300);
        ctx.tick((dt, t)=>{ foamTex.offset.x = Math.sin(t*0.9)*0.035 + Math.sin(t*2.3)*0.01; });
        // voiliers en contre-jour, qui tanguent doucement
        const boatGeo = sailboatGeo(T), boatMat = new T.MeshBasicMaterial({ vertexColors:true, side:T.DoubleSide, fog:false });
        const boats = [[46, -168, 1.3], [78, -226, 1.6], [30, -118, 1.0], [120, -200, 1.4]].map(([x, z, s], k)=>{
          const b = ctx.add(new T.Mesh(boatGeo, boatMat));
          b.position.set(x, 0, z); b.scale.setScalar(s); b.rotation.y = k % 2 ? 0.3 : -0.25;
          return b;
        });
        ctx.tick((dt, t)=>{ boats.forEach((b, k)=>{ b.rotation.z = Math.sin(t*0.9 + k*1.7)*0.05; b.position.y = Math.sin(t*1.2 + k)*0.08; }); });
        // collines cote terre (gauche) + cap lointain a droite, rien devant le soleil
        const hillsFar = Sc.fbm(3), hillsNear = Sc.fbm(9);
        const landMask = (a)=> a > 0.02 ? Math.min(1, (a - 0.02)/0.25) : 0;
        let lighthouse = null;
        const farMesh = ctx.add(Sc.silhouette(T, {
          radius:226, height:70, yBase:-6, peak:34, top:0x6a3462, bottom:fog, rim:0xffa878, rimA:.45,
          profile:(a)=>{
            const land = landMask(a) * (5 + hillsFar(a*6 + 11)*30);
            const cape = a < -0.5 ? Math.min(1, (-a - 0.5)/0.12) * (7 + hillsFar(a*9 + 30)*12) : 0;
            const island = Math.max(0, 1 - Math.abs(a + 0.37)/0.03) * 2.6;
            return Math.max(land, cape, island);
          },
          decorate(g, o){
            // phare au bout du cap
            let bx = 0; for(let x=0;x<o.W;x++){ if(o.angOf(x) < -0.53 && o.profile[x] > 3){ bx = x; } }
            if(bx){
              const by = o.toPx(o.profile[bx]);
              g.fillStyle = '#3a2038'; g.fillRect(bx - 2, by - 16, 4, 17);
              g.fillStyle = '#f2e2c8'; g.fillRect(bx - 2, by - 12, 4, 2);
              lighthouse = [bx, by - 17];
            }
          }
        }));
        if(lighthouse){
          const lh = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.glow(T), color:0xfff0c0, transparent:true, opacity:1, blending:T.AdditiveBlending, depthWrite:false, fog:false })));
          lh.position.copy(farMesh.userData.worldAt(lighthouse[0], lighthouse[1])); lh.scale.set(5, 5, 1);
          // Faisceau qui balaie la mer : il pointe vers nous (vu en raccourci) au
          // moment de l'eclat, et s'allonge sur le cote le reste du temps.
          const beamGeo = new T.PlaneGeometry(2.2, 70); beamGeo.translate(0, 35, 0); beamGeo.rotateX(-Math.PI/2);
          const beam = ctx.add(new T.Mesh(beamGeo, new T.MeshBasicMaterial({ map:Sc.beamTex(T), color:0xfff0c0, transparent:true, opacity:.22, blending:T.AdditiveBlending, depthWrite:false, fog:false, side:T.DoubleSide })));
          beam.position.copy(lh.position);
          ctx.tick((dt, t)=>{
            const k = Math.pow(Math.max(0, Math.sin(t*1.6)), 6); lh.material.opacity = 0.2 + k*0.8; lh.scale.set(4 + k*6, 4 + k*6, 1);
            beam.rotation.y = t*1.6 - Math.PI/2 + Math.PI;
          });
        }
        ctx.add(Sc.silhouette(T, {
          radius:190, height:44, yBase:-6, peak:16, top:0x4a2248, bottom:fog, rim:0xff9a6a, rimA:.35,
          profile:(a)=> landMask(a - 0.1) * (1 + hillsNear(a*10 + 3)*14)
        }));
        // nuages etires roses/orange, plus chauds pres du soleil
        [[20, 26, 90, 0.6, 0xff7a40], [75, 34, 80, 0.55, 0xff6a4a], [-40, 42, 110, 0.5, 0xa03a5a], [-110, 30, 90, 0.45, 0x802a50], [130, 48, 100, 0.45, 0x902e58], [-10, 70, 130, 0.35, 0x4a1a48], [60, 58, 70, 0.5, 0xff8060]].forEach(([x, y, w, op, col])=>{
          const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.cloud(T), color:col, transparent:true, opacity:op, depthWrite:false, fog:false })));
          s.scale.set(w, w*0.22, 1); s.position.set(x, y, -205);
        });
        // Mouettes en contre-jour : planent en larges boucles et battent des
        // ailes de temps en temps (on ecrase le sprite en hauteur).
        const gulls = [];
        for(let k = 0; k < 6; k++){
          const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.gullTex(T), transparent:true, depthWrite:false, fog:false })));
          gulls.push({ s, cx:-30 + Math.random()*90, cy:22 + Math.random()*22, r:8 + Math.random()*14, z:-90 - Math.random()*60, sp:0.12 + Math.random()*0.1, ph:Math.random()*6.3, size:2.2 + Math.random()*1.4 });
        }
        ctx.tick((dt, t)=>{
          for(const q of gulls){
            const a = t*q.sp + q.ph;
            q.s.position.set(q.cx + Math.cos(a)*q.r, q.cy + Math.sin(a*2)*2.5, q.z);
            const flap = (t*0.6 + q.ph) % 3 < 1 ? 0.55 + 0.45*Math.abs(Math.sin(t*9 + q.ph)) : 1;
            q.s.scale.set(q.size, q.size*0.5*flap, 1);
          }
        });
      },
      // Cote fixe : l'ocean reste toujours du meme cote de la route (comme une
      // vraie route cotiere). Les parasols+chaise ne sont poses QUE cote plage/
      // mer (entre la route et l'eau) ; les palmiers, eux, poussent des deux
      // cotes (sable cote route aussi), juste sans parasol de ce cote-la.
      buildDecor(T, scene, N){
        const items = [];
        const add = (o)=>{ scene.add(o); items.push(o); return o; };
        const umbrellaColors = [0xe2432f, 0x2fa6a0, 0xf2c23d, 0xe8734a, 0x3d6fd9];
        const wrap = this.spacing || 8;
        for(let i=0;i<N;i++){
          const z = -16 - i*8;

          // Cote gauche (-x) : palmiers (pas de parasol de ce cote), quelques
          // dunes au loin pour casser la ligne d'horizon plate.
          if(i % 7 === 6){
            add(duneRidge(T, -(16+Math.random()*8), z, 8+Math.random()*5, 6+Math.random()*4, 0xc9a869));
          } else {
            add(palmTreeModel(T, -(7.5+Math.random()*3.5), z, 5.5 + Math.random()*2));
          }
          // Reverberes de promenade cote terre (halo seulement, pas de lumiere
          // dynamique : il fait encore jour), qui s'allument au crepuscule.
          if(i % 3 === 1){
            add(lampModel(T, -5.9, z - 3, 0xffd08a, 4.3, false));
          }

          // Cote plage/mer (droite), entre la route et l'eau : palmiers et
          // parasols+chaise en alternance.
          if(i % 2 === 0){
            add(palmTreeModel(T, 6.5 + Math.random()*3, z + (Math.random()*3-1.5), 5.5 + Math.random()*2));
          } else {
            add(umbrellaModelDecor(T, 6.5 + Math.random()*3, z + (Math.random()*3-1.5), umbrellaColors[i % umbrellaColors.length]));
          }

          // Poste de maitre-nageur, rare (cycle de retour allonge).
          if(i === 5){
            const tw = new T.Mesh(lifeguardTowerGeo(T), new T.MeshLambertMaterial({ vertexColors:true }));
            tw.position.set(SHORE_X - 1.4, 0, z - 2); tw.rotation.y = -Math.PI/2 + 0.15;
            tw.userData.wrapDist = wrap * N * 3;
            add(tw);
          }
        }

        const Sc = S();
        // Barriere de promenade en bois blanc cote plage.
        const fencePost = new T.BoxGeometry(0.12, 1.0, 0.12); fencePost.translate(0, 0.5, 0);
        const fenceMat = lambert(0xeadfcc);
        add(Sc.strip(T, fencePost, fenceMat, 40, 16, (d, c, i)=>{ d.position.set(5.85, 0, -i*2.5); }));
        add(Sc.strip(T, new T.BoxGeometry(0.06, 0.09, 40), fenceMat, 40, 2, (d, c, i)=>{ d.position.set(5.85, i ? 0.88 : 0.5, -20); }));
        // Touffes d'oyats (herbes de dune) des deux cotes.
        const grassMat = new T.MeshLambertMaterial({ vertexColors:true });
        add(Sc.strip(T, grassTuftGeo(T), grassMat, 48, 64, (d, c)=>{
          const sea = Math.random() < 0.3;
          d.position.set(sea ? 6.3 + Math.random()*4 : -(5.9 + Math.random()*16), 0, -Math.random()*48);
          d.scale.setScalar(0.6 + Math.random()*0.8); d.rotation.y = Math.random()*6.28;
          const v = 0.8 + Math.random()*0.35; c.setRGB(v, v*(0.9 + Math.random()*0.15), v*0.85);
        }));
        // Rochers sur le rivage (certains dans l'eau) et dans les dunes.
        add(Sc.strip(T, rockGeo(T), new T.MeshLambertMaterial({ vertexColors:true }), 64, 16, (d, c, i)=>{
          const shore = i < 10;
          d.position.set(shore ? SHORE_X - 1.5 + Math.random()*3.5 : -(10 + Math.random()*14), 0, -Math.random()*64);
          d.scale.setScalar(shore ? 0.5 + Math.random()*1.1 : 0.6 + Math.random()*1.4); d.rotation.y = Math.random()*6.28;
          const v = 0.75 + Math.random()*0.35; c.setRGB(v, v*0.95, v*0.92);
        }));
        return items;
      }
    },
    {
      id:'centre-neon', name:'Centre-Ville Néon', difficulty:'Intense', spacing:8,
      fog:0x12061d, fogNear:20, fogFar:112, ground:0x050309, exposure:1.1,
      road:0x0a0714, stripe:0xff5ad1, edge:0x2a1044, edgeEmissive:0xb43dff,
      sky:{ top:0x010003, mid:0x06020d, bottom:0x220a34, band:0.08 },
      light:{ key:0xb98cff, keyI:1.0, hemiSky:0xb43dff, hemiGround:0x0a0518, hemiI:0.55, ambient:0xff9dfa, ambientI:0.26 },
      rain:true, wet:true, headlights:2.4,
      roadEnv(T){ return S().neonEnvCanvas(T); }, roadEnvI:1.35,
      horizonGlow:{ color:0xff3df0, op:.26, y:10, w:300, h:60 },
      // Decor lointain fixe : skyline en 2 plans (fenetres allumees, feux
      // d'obstacle rouges qui clignotent au sommet des tours), trottoirs mouilles.
      extras(T, ctx){
        const Sc = S();
        const fog = this.fog;
        const cityLayer = (radius, height, minH, maxH, top, winA, seed)=>{
          const W = 2048;
          const heights = new Float32Array(W), towers = [];
          let x = 0;
          while(x < W){
            const w = 8 + Math.floor(Math.random()*26);
            const a = -0.7*Math.PI + (x/W)*1.4*Math.PI;
            const downtown = Math.exp(-Math.pow(a/0.5, 2)); // plus haut dans l'axe de la rue
            const h = minH + Math.random()*(maxH - minH)*(0.35 + 0.65*downtown) * (Math.random() < 0.15 ? 1.35 : 1);
            for(let k=x;k<Math.min(W, x+w);k++) heights[k] = h;
            towers.push({ x, w, h });
            x += w + (Math.random() < 0.3 ? 2 : 0);
          }
          let tips = [];
          const mesh = ctx.add(Sc.silhouette(T, {
            width:W, radius, height, yBase:-6, peak:maxH, top, bottom:fog,
            profile:(a, px)=> heights[px],
            decorate(g, o){
              towers.forEach(t=>{
                const topY = o.toPx(t.h);
                for(let wy = topY + 4; wy < o.horizonPx - 2; wy += 3){
                  for(let wx = t.x + 2; wx < t.x + t.w - 2; wx += 3){
                    if(Math.random() > 0.3) continue;
                    const col = NEON[(Math.random()*NEON.length)|0];
                    const warm = Math.random() < 0.5;
                    g.fillStyle = warm ? 'rgba(255,214,160,' + winA*(0.5+Math.random()*0.5) + ')' : Sc.css(col, winA*(0.4+Math.random()*0.6));
                    g.fillRect(wx, wy, 1, 1);
                  }
                }
                if(Math.random() < 0.18){ const c = NEON[(Math.random()*NEON.length)|0]; g.fillStyle = Sc.css(c, 0.8); g.fillRect(t.x, topY, t.w, 1); }
              });
              const tall = towers.slice().sort((p, q)=>q.h - p.h).slice(0, 7);
              tall.forEach(t=>{
                const cx = t.x + (t.w >> 1), ty = o.toPx(t.h);
                g.strokeStyle = '#0a0612'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, ty); g.lineTo(cx, ty - 10); g.stroke();
                tips.push([cx, ty - 10]);
              });
            }
          }));
          return tips.map(p=>mesh.userData.worldAt(p[0], p[1]));
        };
        const tipsFar = cityLayer(226, 120, 10, 78, 0x241238, 0.75, 1);
        cityLayer(182, 96, 14, 60, 0x12081e, 0.9, 2);
        const blinkers = tipsFar.map((p, k)=>{
          const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.glow(T), color:0xff2a2a, transparent:true, opacity:1, blending:T.AdditiveBlending, depthWrite:false, fog:false })));
          s.position.copy(p); s.scale.set(3.5, 3.5, 1); return { s, ph:k*0.37 };
        });
        ctx.tick((dt, t)=>{ for(const b of blinkers) b.s.material.opacity = ((t + b.ph) % 1.4) < 0.3 ? 1 : 0.1; });

        // Lumiere de contre cyan venant de la gauche : avec la lumiere principale
        // violette, la carrosserie prend des reflets bicolores typiques du neon.
        const rimL = new T.DirectionalLight(0x3df0ff, 0.55); rimL.position.set(-9, 4, 3); ctx.add(rimL);

        // Projecteurs qui balaient le ciel derriere la ville (additifs, hors brouillard)
        const beamMat = (hex)=>new T.MeshBasicMaterial({ map:Sc.beamTex(T), color:hex, transparent:true, opacity:.3, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false });
        const beamGeo = new T.CylinderGeometry(7, 0.5, 170, 16, 1, true); beamGeo.translate(0, 85, 0);
        // (devant les silhouettes de la ville, rayon 182+, qui sont opaques)
        const beams = [[-30, 0x7a3dff, 0.0], [-9, 0x3df0ff, 1.7], [11, 0xff3df0, 3.1], [32, 0x7a3dff, 4.4]].map(([x, col, ph])=>{
          const b = ctx.add(new T.Mesh(beamGeo, beamMat(col)));
          b.position.set(x, -4, -150); return { b, ph };
        });
        // Trafic aerien : vehicules volants (phare blanc + feu arriere) qui traversent
        const flyers = [];
        for(let k = 0; k < 7; k++){
          const g = new T.Group();
          const head = new T.Sprite(new T.SpriteMaterial({ map:Sc.glow(T), color:0xdff6ff, transparent:true, blending:T.AdditiveBlending, depthWrite:false, fog:false }));
          head.scale.set(2.6, 2.6, 1); g.add(head);
          const tail = new T.Sprite(new T.SpriteMaterial({ map:Sc.glow(T), color:k % 2 ? 0xff2a4a : 0xff3df0, transparent:true, blending:T.AdditiveBlending, depthWrite:false, fog:false }));
          tail.scale.set(1.8, 1.8, 1); g.add(tail);
          ctx.add(g);
          flyers.push({ g, head, tail, dir:k % 2 ? 1 : -1, y:26 + Math.random()*34, z:-120 - Math.random()*70, v:10 + Math.random()*12, x:(Math.random()-.5)*260 });
        }
        const holo = [Sc.holoAdTex(T, 0), Sc.holoAdTex(T, 1)];
        ctx.tick((dt, t)=>{
          for(const q of beams){ q.b.rotation.z = Math.sin(t * 0.23 + q.ph) * 0.42; q.b.rotation.x = Math.sin(t * 0.17 + q.ph * 2) * 0.18; }
          for(const f of flyers){
            f.x += f.dir * f.v * dt;
            if(f.x > 140) f.x = -140; else if(f.x < -140) f.x = 140;
            f.g.position.set(f.x, f.y + Math.sin(t * 0.8 + f.z) * 0.6, f.z);
            f.tail.position.set(-f.dir * 1.3, 0, 0);
            f.tail.material.opacity = (t * 1.3 + f.z) % 1 < 0.5 ? 1 : 0.35;
          }
          // Pubs : une nouvelle toutes les 3.2 s, avec un bref "glitch" au changement
          holo.forEach((tx, k)=>{
            const u = t / 3.2 + k * 0.5, slot = Math.floor(u) % 4, f = u % 1;
            tx.offset.y = slot * 0.25;
            tx.offset.x = f < 0.04 ? (Math.random() - 0.5) * 0.08 : 0;
          });
        });
        // trottoirs dalles mouilles (reflets via la meme carte d'environnement que la route)
        const slab = Sc.slabTex(T); slab.repeat.set(3, 150);
        const walkMat = new T.MeshStandardMaterial({ map:slab, color:0x16121f, roughness:0.3, metalness:0.4, envMap:ctx.env, envMapIntensity:0.4 });
        [-1, 1].forEach(s=>{
          const w = new T.Mesh(new T.PlaneGeometry(6, 300), walkMat);
          w.rotation.x = -Math.PI/2; w.position.set(s*8.62, 0.1, -120); ctx.add(w);
        });
        ctx.scrollTex(slab, 150/300);
      },
      buildDecor(T, scene, N){
        const items = [];
        const add = (o)=>{ scene.add(o); items.push(o); return o; };
        const wrap = this.spacing || 8;
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const c = NEON[i % 5];
          add(neonBuilding(T, side*(12 + Math.random()*8), -18 - i*8, c));
          const lampCol = NEON[(i+2) % 5];
          const sl = add(lampModel(T, side*5.9, -12 - i*8, lampCol, 4.5, i % 2 === 0));
          // reflet du lampadaire sur la chaussee mouillee
          const st = wetStreak(T, lampCol, 1.0, 10, 0.55);
          st.position.set(-side*0.85, 0.03, 5); sl.add(st);

          // Skyline lointaine occasionnelle, en retrait derriere le premier
          // plan, pour donner un peu de profondeur a la rue.
          if(i % 6 === 3){
            add(neonSkylineBackdrop(T, side*(30 + Math.random()*10), -18 - i*8 - 22));
          }
          if(i % 5 === 2){
            add(steamVent(T, -side*(7.6 + Math.random()*2), -15 - i*8));
          }
          if(i % 4 === 1) add(lanternString(T, -16 - i*8));
          if(i % 3 === 0) add(vendingMachine(T, side*10.6, -14.5 - i*8, NEON[(i + 1) % NEON.length]));
          if(i === 5){
            const arch = neonArch(T, -15 - i*8);
            arch.userData.wrapDist = wrap * N * 2;
            add(arch);
          }
        }
        // Deuxieme rang d'immeubles (instancies, fenetres allumees) derriere le
        // premier plan : la rue ne donne plus sur une plaine vide entre 2 tours.
        const winTex = windowTexture(0x06040a, 0xffc890, 4, 12); winTex.repeat.set(2, 5);
        const blockMat = new T.MeshStandardMaterial({ color:0x0a0710, emissive:0xffffff, emissiveMap:winTex, emissiveIntensity:0.34, roughness:0.8, metalness:0.2 });
        const blockGeo = new T.BoxGeometry(1, 1, 1); blockGeo.translate(0, 0.5, 0);
        add(S().strip(T, blockGeo, blockMat, 64, 22, (d, c, i)=>{
          const s = i % 2 ? 1 : -1;
          d.position.set(s*(25 + Math.random()*38), 0, -Math.random()*64);
          d.scale.set(5 + Math.random()*6, 10 + Math.random()*38, 5 + Math.random()*6);
        }));
        // Plots lumineux cyan/magenta entre les tirets (effet "piste" futuriste).
        add(S().strip(T, new T.BoxGeometry(0.15, 0.03, 0.15), new T.MeshBasicMaterial({ color:0xffffff }), 10, 6, (d, c, i)=>{
          d.position.set([-2.2, 0, 2.2][i % 3], 0.035, i < 3 ? -2.5 : -7.5); c.setHex(i % 2 ? 0x3df0ff : 0xff5ad1);
        }));
        return items;
      }
    },
    {
      id:'japon-sakura', name:'Japon · Sakura', difficulty:'Standard', spacing:9,
      fog:0xc98aa2, fogNear:28, fogFar:160, ground:0x2a3a1e, exposure:1.0,
      road:0x1b1a20, stripe:0xf4ece6, edge:0x4a4048, edgeEmissive:0x5a2038,
      sky:{ top:0x0e0c2a, mid:0x4a2a64, bottom:0xffa0b8, glow:0xffb0c8, glowI:0.6, band:0.08 },
      light:{ key:0xffd8cc, keyI:1.1, hemiSky:0xffb8d4, hemiGround:0x1e2a1a, hemiI:0.6, ambient:0xffe6f0, ambientI:0.28 },
      headlights:1.4,
      celestial:{ color:0xfff2e8, halo:0xff8fb0, size:30, x:62, y:18, haloOp:.45, tex:(T)=>S().sun(T) },
      horizonGlow:{ color:0xff8fb8, op:.28, y:5, w:340, h:40 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      // Decor lointain fixe : Mont Fuji enneige dans l'axe gauche de la route,
      // collines avec pagodes et villages eclaires, nuages roses, et des petales
      // de cerisier qui tombent en continu autour de la voiture.
      extras(T, ctx){
        const Sc = S(), fog = this.fog;
        const range = Sc.fbm(21), hills = Sc.fbm(5);
        // Fuji : cone large au sommet legerement tronque, entoure de chaines basses
        const FUJI_A = 0.24;
        const fujiH = (a)=>{ const d = Math.abs(a - FUJI_A) / 0.34; return d < 1 ? Math.min(60, 66 * Math.pow(1 - d, 1.35)) : 0; };
        ctx.add(Sc.silhouette(T, {
          radius:226, height:110, yBase:-6, peak:66, top:0x3a2e5c, bottom:fog, rim:0xffc0d4, rimA:.5,
          profile:(a)=>Math.max(fujiH(a), 5 + range(a*5 + 2)*18),
          decorate(g, o){
            // neige : de la crete jusqu'a ~38 unites, avec un bord dechiquete
            for(let x = 0; x < o.W; x++){
              const h = o.profile[x];
              if(h < 40) continue;
              const snowLow = 38 + Math.sin(x*0.9)*1.6 + Math.sin(x*0.23)*2.4;
              const y0 = o.toPx(h), y1 = o.toPx(Math.max(snowLow, h - 22));
              const gr = g.createLinearGradient(0, y0, 0, y1);
              gr.addColorStop(0, 'rgba(255,244,248,.97)'); gr.addColorStop(1, 'rgba(255,196,214,.85)');
              g.fillStyle = gr; g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
            }
          }
        }));
        // collines proches : pagodes en silhouette + lumieres de villages
        ctx.add(Sc.silhouette(T, {
          radius:186, height:60, yBase:-6, peak:24, top:0x2a1c3c, bottom:fog, rim:0xff9ab8, rimA:.35,
          profile:(a)=> Math.abs(a - FUJI_A) < 0.12 ? 2 + hills(a*9)*4 : 4 + hills(a*9 + 4)*16,
          decorate(g, o){
            const pag = (cx)=>{
              let y = o.toPx(o.profile[cx]);
              for(let k = 0; k < 5; k++){
                const w = 14 - k*2.2, bh = 6 - k*0.4;
                g.fillStyle = '#1e1428'; g.fillRect(cx - w/2 + 2, y - bh, w - 4, bh);
                g.beginPath(); g.moveTo(cx - w/2 - 3, y - bh); g.lineTo(cx + w/2 + 3, y - bh); g.lineTo(cx, y - bh - 4); g.closePath(); g.fill();
                g.fillStyle = 'rgba(255,190,120,.9)'; g.fillRect(cx - 1, y - bh*0.6, 2, 2);
                y -= bh + 3;
              }
              g.fillStyle = '#1e1428'; g.fillRect(cx - 0.5, y - 9, 1, 9);
            };
            [0.28, 0.42, 0.6].forEach(f=>pag(Math.floor(o.W * f)));
            for(let i = 0; i < 90; i++){
              const x = Math.floor(Math.random() * o.W), y = o.toPx(o.profile[x]) + 2 + Math.random()*10;
              g.fillStyle = Math.random() < 0.7 ? 'rgba(255,196,130,.95)' : 'rgba(255,120,110,.9)'; g.fillRect(x, y, 1, 1);
            }
          }
        }));
        // nuages etires roses / lavande
        [[-120, 40, 90, 0.5, 0xffa6c4], [-40, 58, 110, 0.4, 0xd88ab8], [30, 34, 80, 0.5, 0xffb8c8], [110, 50, 100, 0.42, 0xb07ab0], [0, 80, 140, 0.3, 0x6a4a8a]].forEach(([x, y, w, op, col])=>{
          const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:Sc.cloud(T), color:col, transparent:true, opacity:op, depthWrite:false, fog:false })));
          s.scale.set(w, w*0.22, 1); s.position.set(x, y, -208);
        });
        // Petales de cerisier : tombent en tournoyant et defilent avec la route
        const NP = 460, pp = new Float32Array(NP*3), seeds = [];
        const spawn = (s, anywhere)=>{ s.x = (Math.random()-.5)*40; s.y = anywhere ? Math.random()*12 : 9 + Math.random()*5; s.z = anywhere ? -80 + Math.random()*92 : -90 + Math.random()*40; };
        for(let i = 0; i < NP; i++){ const s = { vy:0.45 + Math.random()*0.6, ph:Math.random()*6.28, sw:0.5 + Math.random()*0.9 }; spawn(s, true); seeds.push(s); }
        const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
        const petals = ctx.add(new T.Points(pg, new T.PointsMaterial({ map:Sc.petalTex(T), size:0.24, sizeAttenuation:true, transparent:true, depthWrite:false, alphaTest:0.05 })));
        petals.frustumCulled = false;
        ctx.tick((dt, t)=>{
          const sc = ctx.scroll();
          for(let i = 0; i < NP; i++){
            const s = seeds[i];
            s.y -= s.vy * dt; s.x += Math.sin(t*1.3 + s.ph) * s.sw * dt; s.z += sc + Math.cos(t*0.9 + s.ph) * 0.3 * dt;
            if(s.y < 0.05 || s.z > 14) spawn(s, false);
            pp[i*3] = s.x; pp[i*3+1] = s.y; pp[i*3+2] = s.z;
          }
          pg.attributes.position.needsUpdate = true;
        });
      },
      buildDecor(T, scene, N){
        const items = [];
        const add = (o)=>{ scene.add(o); items.push(o); return o; };
        const wrap = this.spacing || 9;
        for(let i = 0; i < N; i++){
          const side = i % 2 === 0 ? -1 : 1;
          const z = -12 - i*9;
          add(sakuraTree(T, side*(6.6 + Math.random()*1.6), z + Math.random()*2, 0.9 + Math.random()*0.35));
          if(i % 3 === 0) add(sakuraTree(T, -side*(7.2 + Math.random()*2), z - 4, 0.8 + Math.random()*0.3));
          add(stoneLantern(T, side*5.35, z - 4.5));
          if(i % 3 === 1) add(machiya(T, side*(12.5 + Math.random()*3), z - 2));
          if(i % 5 === 4) add(lanternString(T, z - 6));
          if(i === 2 || i === 10){
            const t = torii(T, z - 1);
            t.userData.wrapDist = wrap * N * 2;
            add(t);
          }
          if(i === 6){
            const p = pagoda(T, -side*(24 + Math.random()*4), z - 8);
            p.userData.wrapDist = wrap * N * 2;
            add(p);
          }
        }
        const Sc = S();
        // Rangees de cerisiers du fond (instancies : des centaines d'arbres en 1 dessin)
        add(Sc.strip(T, sakuraGeo(T), sakuraMat(T), 54, 16, (d, c, i)=>{
          const s = i % 2 ? 1 : -1;
          d.position.set(s*(11 + Math.random()*30), 0, -Math.random()*54);
          d.rotation.y = Math.random()*6.28; d.scale.setScalar(0.9 + Math.random()*0.6);
        }));
        // Bosquets de bambous par endroits, derriere la cloture
        const bambooGeo = new T.CylinderGeometry(0.06, 0.08, 1, 5); bambooGeo.translate(0, 0.5, 0);
        add(Sc.strip(T, bambooGeo, M('lam:bamboo', ()=>new T.MeshLambertMaterial({ color:0xffffff })), 72, 34, (d, c, i)=>{
          const s = i < 17 ? -1 : 1, grove = (i % 17) < 9 ? 0 : 1;
          d.position.set(s*(9 + Math.random()*1.8), 0, -8 - grove*36 - Math.random()*7);
          d.scale.set(1, 5.5 + Math.random()*3.5, 1); d.rotation.z = (Math.random()-.5)*0.08;
          c.setHex([0x6f8f3a, 0x7fa048, 0x5d7a30][i % 3]);
        }));
        // Cloture basse en bois le long des bas-cotes (poteau + 2 lisses, 1 dessin)
        const fenceGeo = Sc.merge(T, [
          { geo:new T.BoxGeometry(0.12, 1.0, 0.12), pos:[0, 0.5, 0], color:0x3a2a20 },
          { geo:new T.BoxGeometry(0.06, 0.07, 3), pos:[0, 0.82, -1.5], color:0x4a3628 },
          { geo:new T.BoxGeometry(0.06, 0.07, 3), pos:[0, 0.45, -1.5], color:0x4a3628 },
        ]);
        add(Sc.strip(T, fenceGeo, M('lam:fence', ()=>new T.MeshLambertMaterial({ vertexColors:true })), 3, 2, (d, c, i)=>{
          d.position.set(i ? 4.65 : -4.65, 0, 0);
        }));
        return items;
      }
    }
  ];

  // Precharge en arriere-plan tous les modeles du decor (mis en cache par
  // DG.Loader) : quand le joueur choisit une route, tout est deja la.
  DG.preloadRouteAssets = function(){
    [loadPalmModel, loadUmbrellaModel, loadGasStationModel, loadLampModel, loadCyberBuilding, loadSingaporeBuilding, loadAsianSkyline].forEach(fn=>fn());
  };

  const byId = {}; ROUTES.forEach(r=>byId[r.id]=r);
  DG.ROUTES = ROUTES;
  DG.routeById = (id)=>byId[id] || ROUTES[0];
  DG.defaultRouteId = ROUTES[0].id;
})();
