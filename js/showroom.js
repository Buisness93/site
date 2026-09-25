// Showroom 3D (hero + fiches voitures) — porté depuis l'ancien moteur Design Canvas,
// réécrit en JS simple. Nécessite three.js + GLTFLoader + MeshoptDecoder chargés avant.
(function(){
  window.DG = window.DG || {};

  function Showroom(){
    this.scenes = [];
    this.models = {};
    this.carCtrls = {};
    this._heroTarget = { x:0, y:0 };
    this._heroSpin = 0;
    this._last = performance.now();
  }

  Showroom.prototype.placeholderTexURL = function(){
    const c = document.createElement('canvas'); c.width = c.height = 4;
    const x = c.getContext('2d'); x.fillStyle = '#33383f'; x.fillRect(0,0,4,4);
    return c.toDataURL();
  };

  Showroom.prototype._ensureLoader = function(){
    const T = window.THREE;
    if(this._loader) return this._loader;
    const mgr = new T.LoadingManager();
    const ph = this.placeholderTexURL();
    mgr.setURLModifier((u)=>{ if(/colormap\.png$/i.test(u) || /Textures\//i.test(u)) return ph; return u; });
    this._loader = new T.GLTFLoader(mgr);
    if(window.MeshoptDecoder){
      window.MeshoptDecoder.ready.then(()=>this._loader.setMeshoptDecoder(window.MeshoptDecoder)).catch(()=>{});
    }
    return this._loader;
  };

  Showroom.prototype.loadModel = function(url){
    this._ensureLoader();
    if(this.models[url]) return Promise.resolve(this.models[url]);
    return new Promise((resolve)=>{
      this._loader.load(url,
        (g)=>{ const scene = g.scene || (g.scenes && g.scenes[0]); this.models[url] = scene; resolve(scene); },
        undefined,
        (err)=>{ console.warn('GLB load failed', url, err); resolve(null); }
      );
    });
  };

  // Comme loadModel, mais conserve aussi les clips d'animation du fichier (portes qui
  // s'ouvrent, etc.) — necessaire pour la fiche 3D detaillee du garage.
  Showroom.prototype.loadModelFull = function(url){
    this._ensureLoader();
    this._fullModels = this._fullModels || {};
    if(this._fullModels[url]) return this._fullModels[url];
    this._fullModels[url] = new Promise((resolve)=>{
      this._loader.load(url,
        (g)=>{
          const scene = g.scene || (g.scenes && g.scenes[0]);
          resolve({ scene, animations: g.animations || [] });
        },
        undefined,
        (err)=>{ console.warn('GLB load failed', url, err); resolve({ scene:null, animations:[] }); }
      );
    });
    return this._fullModels[url];
  };

  const GROUND_RE = /\b(floor|ground|chao|ch[aã]o|backdrop|pavement|asphalt|tarmac|studio|platform|stage|plinth|pedestal)\b/i;
  function stripGroundPlanes(obj){
    const toRemove = [];
    obj.traverse(n=>{
      if(!n.isMesh) return;
      const matName = Array.isArray(n.material) ? n.material.map(m=>m && m.name).join(' ') : (n.material && n.material.name) || '';
      if(GROUND_RE.test(n.name) || GROUND_RE.test(matName)) toRemove.push(n);
    });
    toRemove.forEach(n=>{ if(n.parent) n.parent.remove(n); });
  }

  // Box3.setFromObject() ignore la pose du squelette d'un SkinnedMesh (limitation
  // connue de three.js) : il ne mesure que la geometrie "bind pose" (repos), pas
  // la forme reellement affichee une fois les os appliques. Ca ne se voit pas sur
  // la plupart des modeles (repos ~= forme finale), mais certains exports riggent
  // CHAQUE piece de carrosserie sur son propre os (ex. pour permettre l'animation
  // de suspension) : leur bind pose n'a alors plus aucun rapport avec la voiture
  // reelle, ce qui fausse completement le calcul de taille. On reproduit ici le
  // calcul de skinning (identique a celui du shader GPU) pour mesurer la vraie
  // position posee de chaque sommet.
  // .getComponent() n'existe que sur BufferAttribute, pas sur InterleavedBufferAttribute
  // (frequent pour les attributs skinIndex/skinWeight issus de GLTFLoader) : on passe par
  // getX/getY/getZ/getW, supportes par les deux.
  // Attributs quantifies (KHR_mesh_quantization, frequents dans les .glb compresses) :
  // stockes en entiers "normalized" que le GPU ramene a [-1,1] / [0,1], mais que
  // getX() de three.js r128 renvoie BRUTS (ex. 0..32767). On applique la meme
  // conversion que le GPU pour mesurer les vraies positions / poids.
  function normScale(attr){
    if(!attr.normalized) return 1;
    const a = attr.array || (attr.data && attr.data.array);
    if(a instanceof Int8Array) return 1 / 127;
    if(a instanceof Uint8Array) return 1 / 255;
    if(a instanceof Int16Array) return 1 / 32767;
    if(a instanceof Uint16Array) return 1 / 65535;
    return 1;
  }
  function attrComp(attr, i, k, sc){
    const raw = k === 0 ? attr.getX(i) : k === 1 ? attr.getY(i) : k === 2 ? attr.getZ(i) : attr.getW(i);
    return sc === 1 || sc === undefined ? raw : Math.max(raw * sc, -1);
  }

  // Boite englobante mesuree sur les VRAIS sommets, et non sur la boite stockee
  // dans le fichier : certains exports (ex. Pagani Huayra BC) ont des boites
  // min/max bien plus grandes que la geometrie reelle, ce qui faisait flotter la
  // voiture au-dessus du sol une fois posee dessus.
  function worldBox(T, root){
    const box = new T.Box3();
    const v = new T.Vector3();
    const tmp4 = new T.Vector4();
    const boneMat = new T.Matrix4();
    const acc = new T.Vector4();
    root.traverse(n=>{
      if(!n.isMesh) return;
      const geo = n.geometry;
      const pos = geo && geo.attributes && geo.attributes.position;
      if(!pos){ box.expandByObject(n); return; }
      const ps = normScale(pos);
      if(!n.isSkinnedMesh || !n.skeleton || !geo.attributes.skinIndex || !geo.attributes.skinWeight){
        for(let i=0;i<pos.count;i++){
          v.set(attrComp(pos, i, 0, ps), attrComp(pos, i, 1, ps), attrComp(pos, i, 2, ps)).applyMatrix4(n.matrixWorld);
          box.expandByPoint(v);
        }
        return;
      }
      n.skeleton.update();
      const boneMatrices = n.skeleton.boneMatrices;
      const skinIndex = geo.attributes.skinIndex, skinWeight = geo.attributes.skinWeight, ws = normScale(skinWeight);
      for(let i=0;i<pos.count;i++){
        v.set(attrComp(pos, i, 0, ps), attrComp(pos, i, 1, ps), attrComp(pos, i, 2, ps));
        tmp4.set(v.x, v.y, v.z, 1).applyMatrix4(n.bindMatrix);
        acc.set(0,0,0,0);
        for(let k=0;k<4;k++){
          const weight = attrComp(skinWeight, i, k, ws);
          if(!weight) continue;
          boneMat.fromArray(boneMatrices, attrComp(skinIndex, i, k) * 16);
          const px=tmp4.x, py=tmp4.y, pz=tmp4.z, pw=tmp4.w, e=boneMat.elements;
          acc.x += weight*(e[0]*px+e[4]*py+e[8]*pz+e[12]*pw);
          acc.y += weight*(e[1]*px+e[5]*py+e[9]*pz+e[13]*pw);
          acc.z += weight*(e[2]*px+e[6]*py+e[10]*pz+e[14]*pw);
          acc.w += weight*(e[3]*px+e[7]*py+e[11]*pz+e[15]*pw);
        }
        v.set(acc.x, acc.y, acc.z).applyMatrix4(n.bindMatrixInverse).applyMatrix4(n.matrixWorld);
        box.expandByPoint(v);
      }
    });
    return box;
  }

  Showroom.prototype.normalizeModel = function(src, targetLen, rotY){
    const T = window.THREE;
    // src.clone(true) ne recree pas correctement les os d'un modele rigge (SkinnedMesh) :
    // le clone garde une reference vers le squelette ORIGINAL et continue de se dessiner
    // selon la pose du modele source en cache, ignorant toute rotation appliquee au clone.
    // SkeletonUtils.clone recree aussi les os pour de vrai.
    let hasSkin = false;
    src.traverse(n=>{ if(n.isSkinnedMesh) hasSkin = true; });
    const obj = (hasSkin && T.SkeletonUtils) ? T.SkeletonUtils.clone(src) : src.clone(true);
    stripGroundPlanes(obj);
    obj.rotation.y = rotY || 0;
    obj.updateMatrixWorld(true);
    const box = worldBox(T, obj);
    const size = new T.Vector3(); box.getSize(size);
    const center = new T.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x, size.z) || 1;
    const s = (targetLen || 4.4) / maxDim;
    obj.position.set(-center.x, -box.min.y, -center.z);
    const inner = new T.Group(); inner.add(obj); inner.scale.setScalar(s);
    const wrap = new T.Group(); wrap.add(inner);
    wrap.userData.len = maxDim * s;
    return wrap;
  };

  Showroom.prototype.makeEnvTex = function(renderer){
    const T = window.THREE;
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0,0,0,64);
    g.addColorStop(0.0,'#9aa7bd'); g.addColorStop(0.35,'#3a424f'); g.addColorStop(0.55,'#151a22'); g.addColorStop(1.0,'#050609');
    ctx.fillStyle = g; ctx.fillRect(0,0,16,64);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0,4,16,4);
    const tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    const pmrem = new T.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
    return env;
  };

  Showroom.prototype.makeScene = function(el, opts){
    const T = window.THREE;
    opts = opts || {};
    const w = el.clientWidth || 400, h = el.clientHeight || 400;
    const renderer = new T.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.environment = this.makeEnvTex(renderer);
    const amb = new T.AmbientLight(0xffffff, 0.22); scene.add(amb);
    const key = new T.DirectionalLight(0xffffff, 1.35); key.position.set(6,10,7); scene.add(key);
    const fill = new T.DirectionalLight(0xbcd0ff, 0.5); fill.position.set(-6,4,-5); scene.add(fill);
    const rim = new T.PointLight(opts.glow != null ? opts.glow : 0x88aaff, opts.glowI != null ? opts.glowI : 2.4, 42);
    rim.position.set(-4,3,-4); scene.add(rim);
    const entry = { renderer, scene, camera:null, el, active:false, update:null, alwaysOn:false, rim, key, fill, amb };
    entry.camera = new T.PerspectiveCamera(45, w/h, 0.1, 400);
    this.scenes.push(entry);
    return entry;
  };

  // Couleurs du theme actif (accent + accent-2), lues dans les variables CSS.
  function themeRGB(){
    const css = getComputedStyle(document.documentElement);
    return {
      a: (css.getPropertyValue('--accent-rgb').trim() || '139,124,255'),
      b: (css.getPropertyValue('--accent-2-rgb').trim() || '94,231,255')
    };
  }
  function rgbToHex(rgb){ const p = rgb.split(',').map(n=>parseInt(n, 10) || 0); return (p[0] << 16) | (p[1] << 8) | p[2]; }

  // Scene de showroom sous la voiture : ombre de contact, halo, anneau lumineux
  // bicolore (degrade accent -> accent-2 du theme) et sol quadrille qui s'estompe.
  // Textures canvas generees ici (aucun fichier). Se recolore en direct quand le
  // theme change (evenement 'dg:theme' emis par js/nav.js).
  Showroom.prototype.makeStage = function(car){
    const T = window.THREE;
    car.updateMatrixWorld(true);
    const box = worldBox(T, car);
    const floorY = isFinite(box.min.y) ? box.min.y + 0.01 : -0.6;
    // Centre sur le pivot de la voiture (elle tourne autour), pas sur sa boite du moment
    const cx = car.position.x, cz = car.position.z;
    function canvasTex(size, draw){
      const c = document.createElement('canvas'); c.width = c.height = size;
      draw(c.getContext('2d'), size);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
    }
    function flat(size, blending, opacity){
      const m = new T.MeshBasicMaterial({ transparent:true, opacity:opacity, depthWrite:false, blending:blending || T.NormalBlending });
      const mesh = new T.Mesh(new T.PlaneGeometry(size, size), m);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    }
    const g = new T.Group();
    g.position.set(cx, floorY, cz);

    const grid = flat(22, T.AdditiveBlending, 0.22); grid.position.y = -0.005; g.add(grid);
    const halo = flat(9, T.AdditiveBlending, 0.6); g.add(halo);
    const shadow = flat(6.2, T.NormalBlending, 1); shadow.scale.set(1, 0.62, 1); shadow.position.y = 0.004; g.add(shadow);
    const ring = flat(6.4, T.AdditiveBlending, 0.9); ring.position.y = 0.008; g.add(ring);
    const ring2 = flat(7.6, T.AdditiveBlending, 0.5); ring2.position.y = 0.006; g.add(ring2);

    shadow.material.map = canvasTex(256, (x, n)=>{
      const f = x.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
      f.addColorStop(0, 'rgba(0,0,0,.92)'); f.addColorStop(0.5, 'rgba(0,0,0,.55)'); f.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = f; x.fillRect(0, 0, n, n);
    });

    function paint(){
      const { a, b } = themeRGB();
      [grid, halo, ring, ring2].forEach(m=>{ if(m.material.map) m.material.map.dispose(); });
      grid.material.map = canvasTex(512, (x, n)=>{
        const lg = x.createLinearGradient(0, 0, n, n);
        lg.addColorStop(0, 'rgba(' + a + ',0.6)'); lg.addColorStop(1, 'rgba(' + b + ',0.5)');
        x.strokeStyle = lg; x.lineWidth = 1;
        for(let i = 0; i <= n; i += 32){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, n); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(n, i); x.stroke(); }
        x.globalCompositeOperation = 'destination-in';
        const f = x.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
        f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(0.55, 'rgba(0,0,0,.5)'); f.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = f; x.fillRect(0, 0, n, n);
      });
      halo.material.map = canvasTex(256, (x, n)=>{
        const f = x.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
        f.addColorStop(0, 'rgba(' + a + ',.55)'); f.addColorStop(0.3, 'rgba(' + a + ',.26)'); f.addColorStop(0.62, 'rgba(' + b + ',.1)'); f.addColorStop(1, 'rgba(' + b + ',0)');
        x.fillStyle = f; x.fillRect(0, 0, n, n);
      });
      ring.material.map = canvasTex(512, (x, n)=>{
        const c = n / 2;
        // Degrade conique accent -> accent-2 -> accent : l'anneau parait irise en tournant
        const cg = x.createConicGradient ? x.createConicGradient(0, c, c) : null;
        const col = (o)=>{ if(cg){ cg.addColorStop(0, 'rgba(' + a + ',' + o + ')'); cg.addColorStop(0.5, 'rgba(' + b + ',' + o + ')'); cg.addColorStop(1, 'rgba(' + a + ',' + o + ')'); return cg; } return 'rgba(' + a + ',' + o + ')'; };
        x.lineCap = 'round';
        x.strokeStyle = col(0.95); x.lineWidth = 5;
        x.shadowColor = 'rgba(' + a + ',1)'; x.shadowBlur = 18;
        x.beginPath(); x.arc(c, c, c * 0.86, 0.1, Math.PI * 1.35); x.stroke();
        x.shadowColor = 'rgba(' + b + ',1)';
        x.beginPath(); x.arc(c, c, c * 0.86, Math.PI * 1.5, Math.PI * 1.9); x.stroke();
        x.lineWidth = 1.5; x.shadowBlur = 6;
        x.beginPath(); x.arc(c, c, c * 0.93, 0, Math.PI * 2); x.stroke();
        for(let i = 0; i < 48; i++){
          const an = i / 48 * Math.PI * 2, r1 = c * 0.955, r2 = c * (i % 4 ? 0.975 : 0.99);
          x.beginPath(); x.moveTo(c + Math.cos(an) * r1, c + Math.sin(an) * r1); x.lineTo(c + Math.cos(an) * r2, c + Math.sin(an) * r2); x.stroke();
        }
      });
      ring2.material.map = canvasTex(512, (x, n)=>{
        const c = n / 2;
        x.setLineDash([2, 10]); x.lineWidth = 2;
        x.strokeStyle = 'rgba(' + b + ',.8)'; x.shadowColor = 'rgba(' + b + ',1)'; x.shadowBlur = 8;
        x.beginPath(); x.arc(c, c, c * 0.95, 0, Math.PI * 2); x.stroke();
        x.setLineDash([]); x.lineWidth = 3; x.strokeStyle = 'rgba(' + a + ',.9)';
        x.beginPath(); x.arc(c, c, c * 0.95, Math.PI * 0.2, Math.PI * 0.55); x.stroke();
        x.beginPath(); x.arc(c, c, c * 0.95, Math.PI * 1.2, Math.PI * 1.4); x.stroke();
      });
      [grid, halo, ring, ring2].forEach(m=>{ m.material.needsUpdate = true; });
    }
    paint();

    const onTheme = ()=>paint();
    window.addEventListener('dg:theme', onTheme);
    g.userData = { ring, ring2, halo, dispose:()=>window.removeEventListener('dg:theme', onTheme) };
    return g;
  };

  // Lumiere de contour teintee a l'accent du theme (et mise a jour au changement)
  Showroom.prototype.themeRim = function(s){
    if(!s || !s.rim) return;
    const apply = ()=>s.rim.color.setHex(rgbToHex(themeRGB().a));
    apply();
    window.addEventListener('dg:theme', apply);
  };

  Showroom.prototype.initHero = async function(el, carDef){
    const T = window.THREE;
    const s = this.makeScene(el, { glow:0x7aa2ff, glowI:2.2 });
    this.themeRim(s);
    s.camera.position.set(0.5,1.7,8.6);
    // `car` est un support fixe : le modele 3D a l'interieur peut etre remplace
    // (selecteur de voitures du hero) sans recreer la scene ni le contexte WebGL.
    const car = new T.Group();
    car.position.x = 2.6;
    s.scene.add(car);
    const model = await this.loadModel(carDef.model);
    let body = model ? this.normalizeModel(model, 4.6, carDef.rotY || 0) : new T.Group();
    car.add(body);
    const stage = this.makeStage(car);
    s.scene.add(stage);
    const self0 = this;
    let swapToken = 0, scaleTarget = 1, scaleNow = 1;
    // Change la voiture du hero : elle rapetisse en tournant, le nouveau modele
    // se charge (cache), puis grandit a sa place. Le sol se recale a sa hauteur.
    this.setHeroCar = async function(def){
      const token = ++swapToken;
      scaleTarget = 0.001;
      const [m] = await Promise.all([self0.loadModel(def.model), new Promise(r=>setTimeout(r, 380))]);
      if(token !== swapToken) return;
      car.remove(body);
      body = m ? self0.normalizeModel(m, 4.6, def.rotY || 0) : new T.Group();
      car.add(body);
      const sc = car.scale.x; car.scale.setScalar(1); car.updateMatrixWorld(true);
      const bb = worldBox(T, body);
      if(isFinite(bb.min.y)) stage.position.y = bb.min.y + 0.01;
      car.scale.setScalar(sc);
      scaleTarget = 1;
      self0._heroSpin = 0.55;
    };
    this.preloadHero = function(defs){ defs.forEach(d=>self0.loadModel(d.model)); };
    const N = 850;
    const pos = new Float32Array(N*3);
    for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-0.5)*48; pos[i*3+1]=(Math.random()-0.5)*26; pos[i*3+2]=(Math.random()-0.5)*48; }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos,3));
    const pts = new T.Points(pg, new T.PointsMaterial({ color:0x9fc0ff, size:0.07, transparent:true, opacity:0.72, blending:T.AdditiveBlending, depthWrite:false }));
    s.scene.add(pts);
    const tintPts = ()=>pts.material.color.setHex(rgbToHex(themeRGB().b));
    tintPts(); window.addEventListener('dg:theme', tintPts);
    const self = this;
    // Cadrage selon l'ecran : a droite du texte sur grand ecran, centree au-dessus
    // du texte (et plus loin) sur mobile, sinon la voiture sort du cadre.
    const view = { camX:0.5, camY:1.7, camZ:8.6, lookY:0.55 };
    function layout(){
      const narrow = s.camera.aspect < 0.95;
      car.position.x = narrow ? 0 : 2.6;
      stage.position.x = car.position.x;
      view.camX = narrow ? 0 : 0.5;
      view.camZ = narrow ? 11.5 : 8.6;
      view.camY = narrow ? 2.6 : 1.7;
      view.lookY = narrow ? -2.6 : 0.55;
    }
    layout();
    s.camera.position.z = view.camZ;
    addEventListener('resize', ()=>requestAnimationFrame(layout));
    s.update = function(dt){
      const sp = self._heroSpin;
      const boost = sp > 0 ? (11*sp*sp) : 0;
      if(sp > 0) self._heroSpin = Math.max(0, sp - dt*0.75);
      car.rotation.y += dt*(0.32 + boost);
      scaleNow += (scaleTarget - scaleNow) * Math.min(1, dt * 9);
      car.scale.setScalar(scaleNow * (1 + 0.07*Math.sin((1-sp)*Math.PI)*(sp>0?1:0)));
      pts.rotation.y += dt*(0.02 + boost*0.22);
      stage.userData.ring.rotation.z -= dt*(0.12 + boost*0.4);
      stage.userData.ring2.rotation.z += dt*(0.05 + boost*0.2);
      stage.userData.halo.material.opacity = 0.55 + 0.15*Math.sin(performance.now()*0.0016) + boost*0.04;
      s.camera.position.x += (view.camX + self._heroTarget.x*1.8 - s.camera.position.x)*0.05;
      s.camera.position.y += (view.camY + self._heroTarget.y*0.9 - s.camera.position.y)*0.05;
      s.camera.position.z += (view.camZ - s.camera.position.z)*0.05;
      s.camera.lookAt(0,view.lookY,0);
    };
    el.addEventListener('pointermove', (e)=>{
      const r = el.getBoundingClientRect();
      this._heroTarget.x = ((e.clientX-r.left)/r.width - 0.5);
      this._heroTarget.y = -((e.clientY-r.top)/r.height - 0.5);
    });
    let downX=0, downY=0, downT=0;
    el.addEventListener('pointerdown', (e)=>{ downX=e.clientX; downY=e.clientY; downT=performance.now(); });
    el.addEventListener('pointerup', (e)=>{
      const moved = Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY);
      if(moved < 8 && performance.now()-downT < 400 && !this._heroSpin) this._heroSpin = 1;
    });
    s.active = true;
  };

  Showroom.prototype.initCarCard = async function(el, carDef, key){
    const T = window.THREE;
    const s = this.makeScene(el, { glow:carDef.glow, glowI:2.6 });
    const model = await this.loadModel(carDef.model);
    const car = model ? this.normalizeModel(model, 3.8, carDef.rotY || 0) : new T.Group();
    car.position.y = -0.62;
    const baseRot = -0.55;
    car.rotation.y = baseRot;
    s.scene.add(car);
    const defaultView = { pos:new T.Vector3(4.5,1.55,6.2), look:0.02 };
    const DEFAULT_ZOOM = 0.62;
    s.camera.position.copy(defaultView.pos);
    const ctrl = { auto:true, resetting:false, dragging:false, velocity:0, car, baseRot, camTarget:defaultView.pos.clone(), lookY:defaultView.look, zoom:DEFAULT_ZOOM, defaultView };
    this.carCtrls[key] = ctrl;
    s.update = function(dt){
      if(ctrl.resetting){
        car.rotation.y += (baseRot - car.rotation.y) * 0.12;
        if(Math.abs(baseRot - car.rotation.y) < 0.01){ car.rotation.y = baseRot; ctrl.resetting = false; }
      } else if(ctrl.dragging){
        // piloté par pointermove
      } else if(Math.abs(ctrl.velocity) > 0.015){
        car.rotation.y += ctrl.velocity * dt;
        ctrl.velocity *= Math.pow(0.06, dt);
      } else if(ctrl.auto){
        car.rotation.y += dt*0.3;
      }
      const tgt = ctrl.camTarget.clone().multiplyScalar(ctrl.zoom);
      s.camera.position.lerp(tgt, 0.08);
      s.camera.lookAt(0, ctrl.lookY, 0);
    };
    const dom = s.renderer.domElement;
    dom.style.cursor = 'grab';
    let lastX = 0, lastT = 0;
    dom.addEventListener('pointerdown', (e)=>{ ctrl.dragging=true; ctrl.resetting=false; ctrl.velocity=0; lastX=e.clientX; lastT=performance.now(); dom.style.cursor='grabbing'; });
    window.addEventListener('pointermove', (e)=>{
      if(!ctrl.dragging) return;
      const now = performance.now(), dtms = Math.max(1, now-lastT);
      const dx = e.clientX-lastX;
      car.rotation.y += dx*0.01;
      ctrl.velocity = (dx*0.01) / (dtms/1000);
      lastX = e.clientX; lastT = now;
    });
    window.addEventListener('pointerup', ()=>{ if(ctrl.dragging){ ctrl.dragging=false; dom.style.cursor='grab'; } });
    s.active = true;
    return key;
  };

  Showroom.prototype.toggleRot = function(key){ const c = this.carCtrls[key]; if(c){ c.auto = !c.auto; c.resetting = false; } };
  Showroom.prototype.resetView = function(key){ const c = this.carCtrls[key]; if(c){ c.resetting = true; c.velocity = 0; c.zoom = 0.62; c.camTarget.copy(c.defaultView.pos); c.lookY = c.defaultView.look; } };

  Showroom.prototype.startLoop = function(){
    const io = new IntersectionObserver((es)=>es.forEach(en=>{
      const sc = this.scenes.find(s=>s.el===en.target);
      if(sc && !sc.alwaysOn) sc.active = en.isIntersecting;
    }), { threshold:0.08 });
    this.scenes.forEach(s=>io.observe(s.el));

    const ro = new IntersectionObserver((es)=>es.forEach(en=>{
      if(en.isIntersecting){
        if(en.target.hasAttribute('data-reveal')){ en.target.style.opacity='1'; en.target.style.transform='none'; en.target.style.filter='none'; }
        if(en.target.classList.contains('car-frame')) en.target.classList.add('is-revealed');
        ro.unobserve(en.target);
      }
    }), { threshold:0.15 });
    document.querySelectorAll('[data-reveal]').forEach(el=>ro.observe(el));
    document.querySelectorAll('.car-frame').forEach(el=>ro.observe(el));

    window.addEventListener('resize', ()=>this.scenes.forEach(s=>{
      const w = s.el.clientWidth, h = s.el.clientHeight;
      if(w && h){ s.renderer.setSize(w,h); s.camera.aspect = w/h; s.camera.updateProjectionMatrix(); }
    }));

    const loop = ()=>{
      const now = performance.now();
      const dt = Math.min((now - this._last)/1000, 0.05);
      this._last = now;
      for(const s of this.scenes){ if(s.active){ if(s.update) s.update(dt, now); s.renderer.render(s.scene, s.camera); } }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  DG.Showroom = Showroom;
})();
