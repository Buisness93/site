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
    const box = new T.Box3().setFromObject(obj);
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
    scene.add(new T.AmbientLight(0xffffff, 0.22));
    const key = new T.DirectionalLight(0xffffff, 1.35); key.position.set(6,10,7); scene.add(key);
    const fill = new T.DirectionalLight(0xbcd0ff, 0.5); fill.position.set(-6,4,-5); scene.add(fill);
    const rim = new T.PointLight(opts.glow != null ? opts.glow : 0x88aaff, opts.glowI != null ? opts.glowI : 2.4, 42);
    rim.position.set(-4,3,-4); scene.add(rim);
    const entry = { renderer, scene, camera:null, el, active:false, update:null, alwaysOn:false };
    entry.camera = new T.PerspectiveCamera(45, w/h, 0.1, 400);
    this.scenes.push(entry);
    return entry;
  };

  Showroom.prototype.initHero = async function(el, carDef){
    const T = window.THREE;
    const s = this.makeScene(el, { glow:0x7aa2ff, glowI:2.2 });
    s.camera.position.set(0.5,1.7,8.6);
    const model = await this.loadModel(carDef.model);
    const car = model ? this.normalizeModel(model, 4.6, carDef.rotY || 0) : new T.Group();
    car.position.x = 2.6;
    s.scene.add(car);
    const N = 850;
    const pos = new Float32Array(N*3);
    for(let i=0;i<N;i++){ pos[i*3]=(Math.random()-0.5)*48; pos[i*3+1]=(Math.random()-0.5)*26; pos[i*3+2]=(Math.random()-0.5)*48; }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos,3));
    const pts = new T.Points(pg, new T.PointsMaterial({ color:0x9fc0ff, size:0.07, transparent:true, opacity:0.72, blending:T.AdditiveBlending, depthWrite:false }));
    s.scene.add(pts);
    const self = this;
    s.update = function(dt){
      const sp = self._heroSpin;
      const boost = sp > 0 ? (11*sp*sp) : 0;
      if(sp > 0) self._heroSpin = Math.max(0, sp - dt*0.75);
      car.rotation.y += dt*(0.32 + boost);
      car.scale.setScalar(1 + 0.07*Math.sin((1-sp)*Math.PI)*(sp>0?1:0));
      pts.rotation.y += dt*(0.02 + boost*0.22);
      s.camera.position.x += (0.5 + self._heroTarget.x*1.8 - s.camera.position.x)*0.05;
      s.camera.position.y += (1.7 + self._heroTarget.y*0.9 - s.camera.position.y)*0.05;
      s.camera.lookAt(0,0.55,0);
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
