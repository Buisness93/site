// Effets visuels 3D de la course (aucune incidence sur le gameplay ni le score) :
// lignes de vitesse, flammes de nitro, neon sous la caisse, etincelles, onde de
// ramassage, crash. Tout est alloue une fois (pools) : rien n'est cree/detruit
// pendant la course, pour ne pas faire tousser le ramasse-miettes a 60 fps.
(function(){
  window.DG = window.DG || {};

  function radialTexture(T, inner, outer){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, inner); grad.addColorStop(0.35, outer); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(c);
    return tex;
  }

  function GameFX(engine){
    const T = window.THREE;
    this.engine = engine;
    this.scene = engine.scene;
    this.shake = 0;
    this._t = 0;
    this._glowTex = radialTexture(T, 'rgba(255,255,255,1)', 'rgba(255,255,255,.35)');

    // ---------- Lignes de vitesse ----------
    const N = 120;
    this._lineN = N;
    this._linePos = new Float32Array(N * 6);
    this._lineSeed = [];
    for(let i=0;i<N;i++) this._lineSeed.push(this._randLine({}));
    const lgeo = new T.BufferGeometry();
    lgeo.setAttribute('position', new T.BufferAttribute(this._linePos, 3));
    this._lineMat = new T.LineBasicMaterial({ color:0x9fd4ff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false, fog:false });
    this._lines = new T.LineSegments(lgeo, this._lineMat);
    this._lines.frustumCulled = false;
    this.scene.add(this._lines);

    // ---------- Etincelles (pool de particules) ----------
    const P = 420;
    this._pN = P;
    this._pPos = new Float32Array(P * 3);
    this._pCol = new Float32Array(P * 3);
    this._pVel = new Float32Array(P * 3);
    this._pLife = new Float32Array(P);
    this._pNext = 0;
    for(let i=0;i<P;i++) this._pPos[i*3+1] = -999;
    const pgeo = new T.BufferGeometry();
    pgeo.setAttribute('position', new T.BufferAttribute(this._pPos, 3));
    pgeo.setAttribute('color', new T.BufferAttribute(this._pCol, 3));
    this._pMat = new T.PointsMaterial({ size:0.32, map:this._glowTex, vertexColors:true, transparent:true, blending:T.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
    this._points = new T.Points(pgeo, this._pMat);
    this._points.frustumCulled = false;
    this.scene.add(this._points);

    // ---------- Ondes de ramassage ----------
    this._rings = [];
    const ringGeo = new T.RingGeometry(0.55, 0.75, 40);
    for(let i=0;i<5;i++){
      const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false }));
      m.visible = false; this.scene.add(m);
      this._rings.push({ mesh:m, t:1 });
    }

    // ---------- Halos des bonus (sprites partages par type) ----------
    this._haloMats = {
      coin: new T.SpriteMaterial({ map:this._glowTex, color:0xffb300, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false }),
      nitro: new T.SpriteMaterial({ map:this._glowTex, color:0x2fd8ff, transparent:true, opacity:.6, blending:T.AdditiveBlending, depthWrite:false }),
      multiplier: new T.SpriteMaterial({ map:this._glowTex, color:0xff3fc8, transparent:true, opacity:.6, blending:T.AdditiveBlending, depthWrite:false }),
      magnet: new T.SpriteMaterial({ map:this._glowTex, color:0xff4a4a, transparent:true, opacity:.6, blending:T.AdditiveBlending, depthWrite:false }),
      shield: new T.SpriteMaterial({ map:this._glowTex, color:0x3dffb0, transparent:true, opacity:.6, blending:T.AdditiveBlending, depthWrite:false }),
    };

    // ---------- Neon sous la caisse + flammes de nitro (attaches au joueur) ----------
    this._underMat = new T.MeshBasicMaterial({ map:this._glowTex, color:0x66ccff, transparent:true, opacity:.55, blending:T.AdditiveBlending, depthWrite:false });
    this._under = new T.Mesh(new T.PlaneGeometry(1, 1), this._underMat);
    this._under.rotation.x = -Math.PI/2;
    this._underLight = new T.PointLight(0x66ccff, 0, 6, 2);
    this._flameMat = new T.MeshBasicMaterial({ map:this._glowTex, color:0x5fd7ff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide });
    const flameGeo = new T.ConeGeometry(0.16, 1.2, 10, 1, true);
    flameGeo.rotateX(Math.PI/2); // pointe vers +Z (l'arriere)
    flameGeo.translate(0, 0, 0.6);
    this._flames = [new T.Mesh(flameGeo, this._flameMat), new T.Mesh(flameGeo, this._flameMat)];
    this._flameCoreMat = new T.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false });
    const coreGeo = new T.ConeGeometry(0.07, 0.6, 8, 1, true); coreGeo.rotateX(Math.PI/2); coreGeo.translate(0, 0, 0.3);
    this._flameCores = [new T.Mesh(coreGeo, this._flameCoreMat), new T.Mesh(coreGeo, this._flameCoreMat)];
    this._boostLight = new T.PointLight(0x39c8ff, 0, 7, 2);
    // Lumieres gardees en permanence dans la scene (le nombre de lumieres fait
    // partie du shader : en ajouter/retirer au depart forcerait une recompilation).
    this.scene.add(this._underLight); this.scene.add(this._boostLight);
  }

  GameFX.prototype._randLine = function(o){
    const side = Math.random() < 0.5 ? -1 : 1;
    o.x = side * (5.4 + Math.random() * 5.5);
    o.y = 0.25 + Math.random() * 3.6;
    o.z = -70 + Math.random() * 80;
    o.len = 0.4 + Math.random() * 0.9;
    return o;
  };

  // Accroche les effets au modele du joueur (appele a chaque depart de course).
  GameFX.prototype.attachPlayer = function(player, car){
    const T = window.THREE;
    if(!player) return;
    player.updateMatrixWorld(true);
    const box = DG.Loader && DG.Loader.worldBox ? DG.Loader.worldBox(T, player) : new T.Box3().setFromObject(player);
    const size = new T.Vector3(); box.getSize(size);
    const glow = car && car.glow != null ? car.glow : 0x66ccff;
    this._underMat.color.setHex(glow);
    this._underLight.color.setHex(glow);
    this._under.scale.set(size.x * 1.9, size.z * 1.35, 1);
    this._under.position.set(0, 0.03, 0);
    this._underLight.position.set(0, 0.35, 0);
    const rearZ = box.max.z - 0.05, exY = box.min.y + size.y * 0.24, exX = size.x * 0.22;
    this._flames.forEach((f, i)=>{ f.position.set(i ? exX : -exX, exY, rearZ); player.add(f); });
    this._flameCores.forEach((f, i)=>{ f.position.set(i ? exX : -exX, exY, rearZ); player.add(f); });
    this._boostOff = { y:exY + 0.2, z:rearZ + 0.8 };
    this._player = player;
    player.add(this._under);
    this._boost = 0;
  };

  GameFX.prototype.decoratePickup = function(mesh, kind){
    const T = window.THREE;
    const s = new T.Sprite(this._haloMats[kind] || this._haloMats.coin);
    s.scale.set(2.3, 2.3, 1);
    mesh.add(s);
  };

  GameFX.prototype.emit = function(x, y, z, count, color, speed, up, life){
    const c = this._tmpC || (this._tmpC = new window.THREE.Color());
    c.setHex(color);
    for(let k=0;k<count;k++){
      const i = this._pNext; this._pNext = (this._pNext + 1) % this._pN;
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI/2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this._pPos[i*3] = x; this._pPos[i*3+1] = y; this._pPos[i*3+2] = z;
      this._pVel[i*3] = Math.cos(a) * Math.cos(e) * s;
      this._pVel[i*3+1] = Math.abs(Math.sin(e)) * s * 0.7 + up * Math.random();
      this._pVel[i*3+2] = Math.sin(a) * Math.cos(e) * s;
      this._pLife[i] = life * (0.6 + Math.random() * 0.4);
      const f = 0.75 + Math.random() * 0.25;
      this._pCol[i*3] = c.r * f; this._pCol[i*3+1] = c.g * f; this._pCol[i*3+2] = c.b * f;
    }
  };

  GameFX.prototype.ring = function(x, y, z, color){
    const r = this._rings.find(q=>q.t >= 1) || this._rings[0];
    r.t = 0; r.mesh.visible = true;
    r.mesh.position.set(x, y, z);
    r.mesh.material.color.setHex(color);
    r.mesh.lookAt(this.engine.camera.position);
  };

  GameFX.prototype.pickup = function(kind, pos){
    const col = kind === 'coin' ? 0xffc21a : kind === 'nitro' ? 0x39dcff : kind === 'magnet' ? 0xff4a4a : kind === 'shield' ? 0x3dffb0 : 0xff4fd0;
    this.emit(pos.x, pos.y, pos.z, kind === 'coin' ? 26 : 44, col, 7, 3, 0.7);
    this.ring(pos.x, pos.y, pos.z, col);
    this.shake = Math.max(this.shake, kind === 'coin' ? 0.04 : 0.12);
  };

  GameFX.prototype.nearMiss = function(obsX, playerX, streak){
    const side = obsX < playerX ? -1 : 1;
    const x = playerX + side * 0.9;
    this.emit(x, 0.5, 0.4, 14 + Math.min(5, streak) * 5, streak >= 3 ? 0xff6a2a : 0xfff1c9, 5, 1.5, 0.45);
    this.shake = Math.max(this.shake, 0.1 + Math.min(5, streak) * 0.03);
  };

  GameFX.prototype.crash = function(pos){
    this.emit(pos.x, 0.7, pos.z - 1.2, 150, 0xffa13a, 14, 5, 1.1);
    this.emit(pos.x, 0.9, pos.z - 1.2, 70, 0xffffff, 9, 4, 0.7);
    this.emit(pos.x, 0.5, pos.z - 1.2, 60, 0xff3a1a, 11, 3, 1.2);
    this.ring(pos.x, 0.8, pos.z - 1, 0xff7a2a);
    this.shake = 0.9;
  };

  // scroll = distance parcourue par le decor cette frame ; speedK = 0..1 (vitesse / max)
  GameFX.prototype.update = function(dt, scroll, speedK, boosting, playing){
    this._t += dt;
    // Lignes de vitesse : invisibles au ralenti, de plus en plus longues et
    // nombreuses avec la vitesse, et franchement marquees pendant le nitro.
    const vis = playing ? Math.max(0, speedK - 0.25) / 0.75 : 0;
    const targetOp = Math.min(0.7, vis * 0.28 + (boosting ? 0.35 : 0));
    this._lineMat.opacity += (targetOp - this._lineMat.opacity) * Math.min(1, dt * 5);
    this._lines.visible = this._lineMat.opacity > 0.01;
    if(this._lines.visible){
      const stretch = 1 + speedK * 2.5 + (boosting ? 3.5 : 0);
      const pos = this._linePos;
      for(let i=0;i<this._lineN;i++){
        const s = this._lineSeed[i];
        s.z += scroll * 1.35;
        if(s.z > 12){ this._randLine(s); s.z = -70; }
        const j = i * 6;
        pos[j] = s.x; pos[j+1] = s.y; pos[j+2] = s.z;
        pos[j+3] = s.x; pos[j+4] = s.y; pos[j+5] = s.z - s.len * stretch;
      }
      this._lines.geometry.attributes.position.needsUpdate = true;
    }

    // Particules
    let any = false;
    const g = 16;
    for(let i=0;i<this._pN;i++){
      if(this._pLife[i] <= 0) continue;
      any = true;
      this._pLife[i] -= dt;
      const j = i * 3;
      if(this._pLife[i] <= 0){ this._pPos[j+1] = -999; continue; }
      this._pVel[j+1] -= g * dt;
      this._pPos[j] += this._pVel[j] * dt;
      this._pPos[j+1] = Math.max(0.03, this._pPos[j+1] + this._pVel[j+1] * dt);
      this._pPos[j+2] += this._pVel[j+2] * dt + scroll;
      if(this._pPos[j+1] <= 0.031){ this._pVel[j+1] *= -0.35; this._pVel[j] *= 0.7; }
      const fade = Math.min(1, this._pLife[i] * 2.2);
      this._pCol[j] *= 0.985 + fade * 0.015; this._pCol[j+1] *= 0.975 + fade * 0.025; this._pCol[j+2] *= 0.96 + fade * 0.04;
    }
    if(any || this._pDirty){
      this._points.geometry.attributes.position.needsUpdate = true;
      this._points.geometry.attributes.color.needsUpdate = true;
      this._pDirty = any;
    }

    // Ondes
    for(const r of this._rings){
      if(r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt * 2.2);
      const k = 1 - Math.pow(1 - r.t, 3);
      r.mesh.scale.setScalar(0.6 + k * 3.2);
      r.mesh.material.opacity = (1 - r.t) * 0.9;
      r.mesh.position.z += scroll;
      if(r.t >= 1) r.mesh.visible = false;
    }

    // Nitro : flammes + lumiere, avec montee/descente douce et scintillement
    this._boost = (this._boost || 0) + ((boosting ? 1 : 0) - (this._boost || 0)) * Math.min(1, dt * 10);
    const b = this._boost, flick = 0.8 + Math.sin(this._t * 60) * 0.12 + Math.random() * 0.18;
    this._flameMat.opacity = b * 0.85;
    this._flameCoreMat.opacity = b * 0.9;
    for(const f of this._flames) f.scale.set(1 + b * 0.4, 1 + b * 0.4, (0.2 + b * 1.4) * flick);
    for(const f of this._flameCores) f.scale.set(1, 1, (0.2 + b * 1.3) * flick);
    this._boostLight.intensity = b * 4.5 * flick;
    if(this._player){
      const pp = this._player.position;
      this._underLight.position.set(pp.x, 0.35, pp.z);
      if(this._boostOff) this._boostLight.position.set(pp.x, this._boostOff.y, pp.z + this._boostOff.z);
    }
    // Chaussee mouillee : fine gerbe d'eau soulevee par les roues arriere, plus
    // fournie avec la vitesse (reutilise le pool de particules, zero allocation).
    const route = this.engine.route;
    if(playing && route && route.wet && this._player && this._boostOff){
      this._sprayAcc = (this._sprayAcc || 0) + dt * (18 + speedK * 40 + b * 30);
      const pp = this._player.position, hw = (this.engine._playerHalfW || 0.55) * 0.8;
      while(this._sprayAcc >= 1){
        this._sprayAcc -= 1;
        this.emit(pp.x + (Math.random() < 0.5 ? -hw : hw), 0.12, pp.z + this._boostOff.z - 0.9, 1, 0x9fb2d6, 1.6, 1.8, 0.32);
      }
    }
    this._underLight.intensity = playing ? 1.6 + b * 1.2 : 1.1;
    this._underMat.opacity = 0.42 + Math.sin(this._t * 3) * 0.06 + b * 0.25;

    this.shake *= Math.pow(0.02, dt);
    if(this.shake < 0.002) this.shake = 0;
  };

  DG.GameFX = GameFX;
})();
