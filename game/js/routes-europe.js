// Routes "Europe" : Lac de Neuchatel, Autostrada italienne, Provence.
// Meme principe que routes.js : decor lointain fixe (extras) + blocs de decor
// qui defilent et bouclent (buildDecor). Presque tout est en geometries
// fusionnees a couleurs de sommet et en bandes instanciees (S.strip) : des
// centaines d'arbres/rangs de vigne/lavande pour une poignee d'appels de dessin.
(function(){
  window.DG = window.DG || {};
  const K = ()=>DG.RouteKit, S = ()=>DG.Scenery;
  const M = (k, f)=>K().M(k, f);
  const vc = (key)=>M('lam:vc:' + key, ()=>new window.THREE.MeshLambertMaterial({ vertexColors:true }));
  const vcStd = (key, rough)=>M('std:vc:' + key, ()=>new window.THREE.MeshStandardMaterial({ vertexColors:true, roughness:rough == null ? 0.85 : rough, metalness:0.05 }));

  // ---------- Vegetation ----------
  function leafyGeo(T, key, greens, trunk, shape){
    return M('geo:leafy:' + key, ()=>{
      const sh = shape || {};
      const th = sh.trunkH || 1.8, r = sh.r || 1.2, cy = th + r*0.7;
      const parts = [{ geo:new T.CylinderGeometry(0.12, 0.2, th + 0.4, 6), pos:[0, (th + 0.4)/2, 0], color:trunk }];
      [[0, cy, 0, 1], [r*0.8, cy - r*0.25, r*0.2, 0.72], [-r*0.75, cy - r*0.2, -r*0.25, 0.75], [r*0.2, cy + r*0.55, -r*0.35, 0.68], [-r*0.3, cy + r*0.4, r*0.5, 0.62]].forEach((b, k)=>{
        parts.push({ geo:new T.IcosahedronGeometry(r * b[3], 1), pos:[b[0], b[1], b[2]], scale:[1, sh.flat || 0.85, 1], color:greens[k % greens.length] });
      });
      return S().merge(T, parts);
    });
  }
  const swissTreeGeo = (T)=>leafyGeo(T, 'swiss', [0x2f6a26, 0x3d7c2c, 0x285c20, 0x46883a], 0x3a2a1c);
  const oliveGeo = (T)=>leafyGeo(T, 'olive', [0x3a4a26, 0x44532e, 0x34431f], 0x3a2e22, { trunkH:1.1, r:1.05, flat:0.6 });
  // Pin parasol (Italie) : tronc haut et nu, couronne large et plate
  const stonePineGeo = (T)=>leafyGeo(T, 'stonepine', [0x2f4f24, 0x375a2a, 0x2a4620], 0x4a3524, { trunkH:5.2, r:1.9, flat:0.42 });
  // Platane de bord de route (Provence) : grand tronc clair avec la bande
  // blanche peinte des routes francaises, couronne ample qui deborde sur la route
  function planeTreeGeo(T){
    return M('geo:platane', ()=>{
      const parts = [
        { geo:new T.CylinderGeometry(0.26, 0.36, 5.4, 8), pos:[0, 2.7, 0], color:0x6a6048 },
        { geo:new T.CylinderGeometry(0.37, 0.37, 0.45, 8), pos:[0, 0.9, 0], color:0xf2f2ec },
        { geo:new T.CylinderGeometry(0.1, 0.18, 2.6, 6), pos:[0.8, 5.6, 0], rot:[0, 0, -0.7], color:0x5a5040 },
        { geo:new T.CylinderGeometry(0.1, 0.18, 2.6, 6), pos:[-0.8, 5.7, 0.2], rot:[0, 0, 0.7], color:0x5a5040 },
      ];
      [[0, 7.6, 0, 2.6], [1.9, 7.0, 0.4, 1.9], [-1.9, 7.1, -0.3, 2.0], [0.4, 8.6, -0.9, 1.7], [-0.6, 8.3, 1.1, 1.6], [2.8, 6.5, -0.4, 1.3], [-2.7, 6.6, 0.5, 1.4]].forEach((b, k)=>{
        parts.push({ geo:new T.IcosahedronGeometry(b[3], 1), pos:[b[0], b[1], b[2]], scale:[1, 0.72, 1], color:[0x2a4a1a, 0x335a20, 0x243f16, 0x3a6224][k % 4] });
      });
      return S().merge(T, parts);
    });
  }
  function cypressGeo(T){
    return M('geo:cypress', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.1, 0.14, 0.8, 5), pos:[0, 0.4, 0], color:0x3a2a1c },
      { geo:new T.ConeGeometry(0.62, 3.2, 8), pos:[0, 2.1, 0], color:0x1f3a1c },
      { geo:new T.ConeGeometry(0.5, 3.6, 8), pos:[0, 3.9, 0], color:0x234220 },
      { geo:new T.ConeGeometry(0.3, 1.8, 8), pos:[0, 6.0, 0], color:0x284a24 },
    ]));
  }

  // ---------- Batiments ----------
  // Maison a toit a 2 pans (murs, toit en prisme, fenetres + volets, porte,
  // cheminee), fusionnee en 1 geometrie. Axe long parallele a la route ;
  // fenetres sur les 2 grandes facades (celle cote route est toujours vue).
  function houseGeo(T, key, o){
    return M('geo:house:' + key, ()=>{
      const w = o.w, d = o.d, h = o.h, parts = [];
      parts.push({ geo:new T.BoxGeometry(d, h, w), pos:[0, h/2, 0], color:o.wall });
      const rr = d * 0.74;
      parts.push({ geo:new T.CylinderGeometry(rr, rr, w + 0.6, 3, 1), pos:[0, h + rr*0.5*(o.pitch || 0.5) - 0.05, 0], rot:[-Math.PI/2, 0, 0], scale:[1, 1, o.pitch || 0.5], color:o.roof });
      const floors = Math.max(1, Math.round(h / 2.6)), cols = Math.max(2, Math.round(w / 1.8));
      for(let f = 0; f < floors; f++) for(let c = 0; c < cols; c++){
        const y = 1.2 + f * 2.5, z = -w/2 + (c + 0.5) * (w / cols);
        if(y > h - 0.6) continue;
        [-1, 1].forEach(s=>{
          if(f === 0 && c === Math.floor(cols/2) && s === -1){ parts.push({ geo:new T.BoxGeometry(0.06, 2.0, 0.9), pos:[s*(d/2 + 0.02), 1.0, z], color:o.door || 0x4a2e1c }); return; }
          parts.push({ geo:new T.BoxGeometry(0.06, 1.05, 0.7), pos:[s*(d/2 + 0.02), y, z], color:o.glass || 0x2a3440 });
          if(o.shutter != null){
            parts.push({ geo:new T.BoxGeometry(0.08, 1.1, 0.34), pos:[s*(d/2 + 0.04), y, z - 0.54], color:o.shutter });
            parts.push({ geo:new T.BoxGeometry(0.08, 1.1, 0.34), pos:[s*(d/2 + 0.04), y, z + 0.54], color:o.shutter });
          }
        });
      }
      if(o.chimney !== false) parts.push({ geo:new T.BoxGeometry(0.5, 1.4, 0.5), pos:[d*0.2, h + rr*0.45, w*0.3], color:o.chimneyColor || o.wall });
      return S().merge(T, parts);
    });
  }
  function churchGeo(T, key, wall, roof){
    return M('geo:church:' + key, ()=>S().merge(T, [
      { geo:new T.BoxGeometry(6, 5, 11), pos:[0, 2.5, 0], color:wall },
      { geo:new T.CylinderGeometry(4.4, 4.4, 11.4, 3, 1), pos:[0, 5.9, 0], rot:[-Math.PI/2, 0, 0], scale:[1, 1, 0.5], color:roof },
      { geo:new T.BoxGeometry(3, 12, 3), pos:[0, 6, -6.6], color:wall },
      { geo:new T.ConeGeometry(2.3, 5, 4), pos:[0, 14.5, -6.6], rot:[0, Math.PI/4, 0], color:roof },
      { geo:new T.BoxGeometry(3.05, 1, 0.3), pos:[0, 9.6, -8.1], color:0x2a2a30 },
    ]));
  }
  function placeRow(d, c, s, xMin, xMax, P){ d.position.set(s*(xMin + Math.random()*(xMax - xMin)), 0, -Math.random()*P); d.rotation.y = Math.random()*6.28; d.scale.setScalar(0.85 + Math.random()*0.4); }

  // Voiture simplifiee (trafic en sens inverse, vu de loin) : caisse + habitacle + roues
  function simpleCarGeo(T, key, color){
    return M('geo:simplecar:' + key, ()=>S().merge(T, [
      { geo:new T.BoxGeometry(1.8, 0.62, 4.2), pos:[0, 0.62, 0], color },
      { geo:new T.BoxGeometry(1.6, 0.55, 2.2), pos:[0, 1.2, 0.2], color:0x1e2630 },
      ...[[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]].map(([x, z])=>({ geo:new T.CylinderGeometry(0.34, 0.34, 0.26, 10), pos:[x, 0.34, z], rot:[0, 0, Math.PI/2], color:0x141414 })),
      { geo:new T.BoxGeometry(1.5, 0.16, 0.05), pos:[0, 0.72, -2.11], color:0xfff6d8 },
    ]));
  }

  // Ciel de jour : cumulus epars (sprites) sur l'horizon
  function dayClouds(T, ctx, list, tint){
    list.forEach(([x, y, w, op])=>{
      const s = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:S().cloud(T), color:tint || 0xffffff, transparent:true, opacity:op, depthWrite:false, fog:false })));
      s.scale.set(w, w*0.32, 1); s.position.set(x, y, -208);
    });
  }
  // Long ruban fixe subdivise (pour suivre les virages) : bande d'asphalte, rail, muret...
  function longStrip(T, w, h, len, color, x, y, mat){
    const m = new T.Mesh(new T.BoxGeometry(w, h, len, 1, 1, Math.round(len / 2.5)), mat || M('std:strip:' + color, ()=>new T.MeshStandardMaterial({ color, roughness:0.9 })));
    m.position.set(x, y, -len/2 + 20);
    return m;
  }
  // Texture de plan d'eau (lac/mer) : degrade du bord (clair) vers le large (profond)
  function waterTex(T, stops){
    const c = document.createElement('canvas'); c.width = 512; c.height = 4;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 512, 0);
    stops.forEach(([p, col])=>gr.addColorStop(p, col));
    g.fillStyle = gr; g.fillRect(0, 0, 512, 4);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  // Petit voilier blanc (plein jour)
  function daySailboatGeo(T){
    return M('geo:daysail', ()=>{
      const tri = (a, b, c)=>{ const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([...a, ...b, ...c]), 3)); return g; };
      return S().merge(T, [
        { geo:new T.BoxGeometry(4.2, 0.55, 1.2), pos:[0, 0.28, 0], color:0xf4f6f8 },
        { geo:new T.BoxGeometry(1.6, 0.5, 0.9), pos:[-0.4, 0.8, 0], color:0xdfe6ec },
        { geo:new T.BoxGeometry(0.1, 6.4, 0.1), pos:[0.2, 3.5, 0], color:0xc9ced4 },
        { geo:tri([0.3, 0.9, 0], [0.3, 6.5, 0], [2.4, 1.0, 0]), color:0xffffff },
        { geo:tri([0.1, 5.8, 0], [0.1, 0.9, 0], [-1.9, 0.9, 0]), color:0xf0f2f4 },
      ]);
    });
  }
  // Silhouette avec neige au-dessus d'une altitude (Alpes, Ventoux...)
  function snowCaps(g, o, above, col){
    for(let x = 0; x < o.W; x++){
      const h = o.profile[x]; if(h < above) continue;
      const y0 = o.toPx(h), y1 = o.toPx(Math.max(above + Math.sin(x*0.7)*1.2, h - 14));
      g.fillStyle = col || 'rgba(250,252,255,.95)'; g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
    }
  }

  // ======================================================================
  const ROUTES = [
    // ------------------------------------------------------------------
    // LAC DE NEUCHATEL : route du bord du lac en fin d'apres-midi. Lac a
    // droite (voiliers, rive opposee et Alpes enneigees au loin), a gauche la
    // voie CFF (train rouge qui croise), villages vignerons et vignes du Jura.
    {
      id:'lac-neuchatel', name:'Lac de Neuchâtel', difficulty:'Détente', spacing:9,
      fog:0xbcd2e2, fogNear:40, fogFar:190, ground:0x3f6a2c, exposure:0.9,
      road:0x24262c, stripe:0xf2f2ee, edge:0x55585e, edgeEmissive:0x000000,
      sky:{ top:0x0a3272, mid:0x3a78c4, bottom:0xc4dcf0, glow:0xfff0d0, glowI:0.5, band:0.07 },
      light:{ key:0xfff0dc, keyI:1.5, hemiSky:0xbfd8ff, hemiGround:0x3a4a2a, hemiI:0.55, ambient:0xffffff, ambientI:0.22 },
      headlights:0,
      celestial:{ color:0xfffbee, halo:0xfff0c8, size:22, x:-80, y:46, haloOp:.35 },
      horizonGlow:{ color:0xffffff, op:.12, y:6, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, ridge = Sc.ridged ? Sc.ridged(11) : Sc.fbm(11), jura = Sc.fbm(4);
        // Alpes au loin sur la droite (de l'autre cote du lac), Jura boise a gauche
        ctx.add(Sc.silhouette(T, {
          radius:226, height:110, yBase:-6, peak:44, top:0x6a7fa6, bottom:fog, rim:0xffffff, rimA:.35,
          profile:(a)=> a < -0.02 ? 3 + Math.max(0, ridge(a*7 + 3)) * 40 * Math.min(1, (-a - 0.02)/0.2) : 6 + jura(a*3 + 1)*20,
          decorate(g, o){ snowCaps(g, o, 26); }
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:60, yBase:-6, peak:26, top:0x2e5a34, bottom:fog, rim:0xd8f0c0, rimA:.25,
          profile:(a)=> a > 0.05 ? 5 + jura(a*6 + 7)*20 : 0.6,
          decorate(g, o){
            // villages sur les coteaux : maisons blanches aux toits bruns + clochers
            for(let i = 0; i < 70; i++){
              const x = Math.floor(o.W*0.05 + Math.random()*o.W*0.42), y = o.toPx(o.profile[x]) + 3 + Math.random()*14;
              g.fillStyle = '#f2ede2'; g.fillRect(x, y, 3, 2); g.fillStyle = '#8a4a2a'; g.fillRect(x, y - 1, 3, 1);
            }
            [0.18, 0.33].forEach(f=>{ const x = Math.floor(o.W*f), y = o.toPx(o.profile[x]) + 4; g.fillStyle = '#e8e4da'; g.fillRect(x, y - 9, 2, 9); g.fillStyle = '#5a3424'; g.fillRect(x - 1, y - 12, 4, 3); });
            // rangs de vigne (stries) sur les pentes
            g.strokeStyle = 'rgba(70,110,40,.5)';
            for(let x = Math.floor(o.W*0.1); x < o.W*0.45; x += 3){ const y = o.toPx(o.profile[x]); g.beginPath(); g.moveTo(x, y + 5); g.lineTo(x + 2, y + 16); g.stroke(); }
          }
        }));
        dayClouds(T, ctx, [[-110, 60, 70, .7], [-30, 74, 90, .55], [40, 58, 60, .7], [120, 66, 80, .6], [0, 90, 120, .35]]);
        // Le lac : du rivage (x=13) jusqu'a l'horizon, avec reflet du soleil
        const lakeW = 320, lake = new T.Mesh(new T.PlaneGeometry(lakeW, 400, 16, 80), new T.MeshBasicMaterial({ map:waterTex(T, [[0, '#6fb7b4'], [0.03, '#3f8fa6'], [0.2, '#2f6f98'], [1, '#6f9ec0']]) }));
        lake.rotation.x = -Math.PI/2; lake.position.set(13 + lakeW/2, 0.004, -150); ctx.add(lake);
        const glint = new T.Mesh(new T.PlaneGeometry(150, 300, 8, 60), new T.MeshBasicMaterial({ map:(()=>{ const t = Sc.sparkleTex(T).clone(); t.needsUpdate = true; return t; })(), color:0xfff4d8, transparent:true, opacity:0.22, blending:T.AdditiveBlending, depthWrite:false }));
        glint.material.map.repeat.set(4, 20); glint.rotation.x = -Math.PI/2; glint.position.set(13 + 76, 0.02, -150); ctx.add(glint);
        ctx.scrollTex(glint.material.map, 20/300);
        // voiliers qui dansent sur l'eau
        const boats = [[40, -90, 1], [75, -140, 1.3], [28, -170, 0.9], [110, -110, 1.1], [58, -60, 0.8]].map(([x, z, s], k)=>{
          const b = ctx.add(new T.Mesh(daySailboatGeo(T), vc('boat'))); b.position.set(x, 0, z); b.scale.setScalar(s); b.rotation.y = k * 0.9; return b;
        });
        // Voie CFF a gauche : ballast, 2 rails, ligne de contact (fixes, subdivises)
        const TX = -12.5;
        ctx.add(longStrip(T, 3.6, 0.12, 300, 0x6a655e, TX, 0.06));
        [-0.72, 0.72].forEach(dx=>ctx.add(longStrip(T, 0.1, 0.14, 300, 0x8a8d92, TX + dx, 0.2, M('std:rail', ()=>new T.MeshStandardMaterial({ color:0x9aa0a8, metalness:0.8, roughness:0.35 })))));
        ctx.add(longStrip(T, 0.03, 0.03, 300, 0x222222, TX, 5.6));
        // Train CFF rouge qui croise, periodiquement (4 voitures)
        const wagonGeo = M('geo:cffWagon', ()=>S().merge(T, [
          { geo:new T.BoxGeometry(2.9, 3.0, 24), pos:[0, 2.0, 0], color:0xd4212a },
          { geo:new T.BoxGeometry(2.95, 0.9, 22), pos:[0, 2.6, 0], color:0x20262e },
          { geo:new T.BoxGeometry(2.96, 0.14, 24), pos:[0, 1.3, 0], color:0xf2f2f2 },
          { geo:new T.BoxGeometry(2.6, 0.4, 23), pos:[0, 3.65, 0], color:0x8a8f96 },
          { geo:new T.BoxGeometry(2.4, 0.5, 22), pos:[0, 0.45, 0], color:0x2a2a2e },
        ]));
        const train = new T.Group();
        for(let k = 0; k < 4; k++){ const w = new T.Mesh(wagonGeo, vcStd('cff', 0.45)); w.position.z = k * 24.6; train.add(w); }
        train.position.set(TX, 0, -400); ctx.add(train);
        const tr = { wait:4 };
        ctx.tick((dt)=>{
          const sc = ctx.scroll();
          boats.forEach((b, k)=>{ b.rotation.z = Math.sin(performance.now()*0.0009 + k)*0.04; });
          if(tr.wait > 0){ tr.wait -= dt; if(tr.wait <= 0) train.position.z = -260; return; }
          train.position.z += sc + 28 * dt;
          if(train.position.z > 40){ tr.wait = 9 + Math.random()*10; train.position.z = -400; }
        });
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K();
        const flagTex = M('tex:swissflag', ()=>{ const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#d52b1e'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(26, 12, 12, 40); g.fillRect(12, 26, 40, 12); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; });
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          // cote lac : muret de quai + arbres du quai + drapeau suisse de temps en temps
          if(i % 2 === 0){
            const tree = new T.Mesh(swissTreeGeo(T), vc('swiss')); tree.position.set(8.6 + Math.random()*2, 0, z); tree.scale.setScalar(1 + Math.random()*0.3); tree.rotation.y = Math.random()*6; add(tree);
          }
          if(i % 5 === 2){
            const g = new T.Group();
            const pole = new T.Mesh(M('geo:flagPole', ()=>new T.CylinderGeometry(0.05, 0.06, 6, 6)), M('std:flagPole', ()=>new T.MeshStandardMaterial({ color:0xe8eaec, metalness:0.6, roughness:0.3 })));
            pole.position.y = 3; g.add(pole);
            const flag = new T.Mesh(M('geo:flag', ()=>{ const p = new T.PlaneGeometry(1.4, 1.4, 6, 1); p.translate(0.7, 0, 0); return p; }), M('mat:swissflag', ()=>new T.MeshLambertMaterial({ map:flagTex, side:T.DoubleSide })));
            flag.position.set(0.05, 5.2, 0); g.add(flag);
            g.userData.tick = (t)=>{ flag.rotation.y = Math.sin(t*2.2 + i)*0.35 - 0.3; };
            g.position.set(7.2, 0, z - 3); add(g);
          }
          // cote terre : maisons vigneronnes au-dela de la voie ferree
          if(i % 3 === 1){
            const v = i % 2, h = new T.Mesh(houseGeo(T, 'swiss' + v, v ? { w:7, d:6, h:6.2, wall:0xd8d2c4, roof:0x4a1c10, shutter:0x1f4a28 } : { w:6, d:5.5, h:5, wall:0xcfbf9c, roof:0x5a2614, shutter:0x7a1a16 }), vc('house'));
            h.position.set(-19 - Math.random()*6, 0, z); add(h);
          }
          if(i === 7){ const c = new T.Mesh(churchGeo(T, 'swiss', 0xd6d0c2, 0x3a1c12), vc('house')); c.position.set(-28, 0, z); c.userData.wrapDist = 9 * N * 2; add(c); }
          if(i % 4 === 0) add(Kt.streetlight(T, 5.9, z - 2, 0xfff2d0));
        }
        // traverses de la voie ferree + poteaux de la ligne de contact
        add(Sc.strip(T, new T.BoxGeometry(2.6, 0.1, 0.24), M('lam:sleeper', ()=>new T.MeshLambertMaterial({ color:0x4a3f36 })), 1.2, 1, (d)=>{ d.position.set(-12.5, 0.14, -0.6); }));
        const catGeo = Sc.merge(T, [{ geo:new T.BoxGeometry(0.18, 6, 0.18), pos:[0, 3, 0], color:0x6a6e74 }, { geo:new T.BoxGeometry(2.2, 0.12, 0.12), pos:[1.0, 5.8, 0], color:0x6a6e74 }]);
        add(Sc.strip(T, catGeo, vc('cat'), 30, 1, (d)=>{ d.position.set(-14.4, 0, -15); }));
        // muret du quai (pierre claire) le long du lac
        add(Sc.strip(T, new T.BoxGeometry(0.5, 0.7, 6), M('std:quay', ()=>new T.MeshStandardMaterial({ color:0xc8c0b0, roughness:0.9 })), 6, 1, (d)=>{ d.position.set(12.6, 0.35, -3); }));
        // vignes : rangs perpendiculaires a la route, a gauche derriere les maisons
        const vine = Sc.merge(T, [{ geo:new T.BoxGeometry(18, 1.0, 0.45), pos:[0, 0.6, 0], color:0x4a7a2a }, { geo:new T.BoxGeometry(18, 0.25, 0.5), pos:[0, 1.15, 0], color:0x5e8e34 }]);
        add(Sc.strip(T, vine, vc('vine'), 16, 8, (d, c, i)=>{ d.position.set(-38 - (i % 2)*20, 0, -i*2); }));
        // arbres epars et haies
        add(Sc.strip(T, swissTreeGeo(T), vc('swiss'), 40, 8, (d, c, i)=>placeRow(d, c, -1, 16, 40, 40)));
        return items;
      }
    },

    // ------------------------------------------------------------------
    // AUTOSTRADA DEL SOLE : autoroute toscane en fin d'apres-midi dore. Terre-
    // plein central en beton, chaussee opposee avec trafic qui croise, collines
    // de Toscane, cypres, pins parasols, fermes en pierre, bottes de foin,
    // portiques verts et le pont-restaurant Autogrill au-dessus des voies.
    {
      id:'autostrada', name:'Autostrada del Sole', difficulty:'Intense', spacing:9,
      fog:0xe6d2b0, fogNear:40, fogFar:185, ground:0x8a8a3e, exposure:0.9,
      road:0x2a2a2e, stripe:0xf4f2ea, edge:0x6a6a6e, edgeEmissive:0x000000,
      sky:{ top:0x123e8a, mid:0x5a8ac8, bottom:0xf2d6a8, glow:0xffc880, glowI:0.6, band:0.08 },
      light:{ key:0xffdcb0, keyI:1.55, hemiSky:0xcfdcff, hemiGround:0x5a4a2a, hemiI:0.5, ambient:0xfff0dc, ambientI:0.2 },
      headlights:0,
      celestial:{ color:0xfff2d0, halo:0xffc070, size:26, x:70, y:30, haloOp:.4 },
      horizonGlow:{ color:0xffd8a0, op:.2, y:5, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, hills = Sc.fbm(8), far = Sc.fbm(2);
        // collines toscanes douces + ville perchee a tours (San Gimignano)
        ctx.add(Sc.silhouette(T, {
          radius:226, height:90, yBase:-6, peak:26, top:0x8a9a78, bottom:fog, rim:0xffe0b0, rimA:.3,
          profile:(a)=> 6 + far(a*3 + 2)*16,
          decorate(g, o){
            const x0 = Math.floor(o.W*0.62);
            for(let k = 0; k < 9; k++){ const x = x0 + k*5 + (k%2), h = 10 + (k*37 % 13); const y = o.toPx(o.profile[x]); g.fillStyle = '#b8a07a'; g.fillRect(x, y - h, 4, h + 2); }
            for(let x = x0 - 12; x < x0 + 58; x++){ const y = o.toPx(o.profile[x]); g.fillStyle = '#c4ab84'; g.fillRect(x, y - 4, 1, 5); }
          }
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:60, yBase:-6, peak:20, top:0x6f8a4a, bottom:fog, rim:0xfff0c0, rimA:.3,
          profile:(a)=> 3 + hills(a*6 + 5)*15,
          decorate(g, o){
            // cypres en file le long des chemins + pins parasols + fermes
            for(let i = 0; i < 40; i++){
              const x = Math.floor(Math.random()*o.W), y = o.toPx(o.profile[x]) + 2 + Math.random()*8;
              if(i % 3 === 0){ g.fillStyle = '#e2d0a8'; g.fillRect(x, y - 3, 5, 3); g.fillStyle = '#a0502a'; g.fillRect(x - 1, y - 4, 7, 1); }
              else { g.fillStyle = '#243a1c'; for(let k = 0; k < 4; k++) g.fillRect(x + k*3, y - 7, 1.5, 7); }
            }
          }
        }));
        dayClouds(T, ctx, [[-100, 52, 80, .6], [-20, 66, 70, .5], [60, 50, 90, .55], [130, 60, 70, .5]], 0xfff4e4);
        // Terre-plein central (beton "New Jersey") + chaussee opposee et ses lignes
        const jersey = M('geo:jersey', ()=>{
          const sh = new T.Shape(); sh.moveTo(-0.32, 0); sh.lineTo(0.32, 0); sh.lineTo(0.1, 0.35); sh.lineTo(0.09, 0.85); sh.lineTo(-0.09, 0.85); sh.lineTo(-0.1, 0.35); sh.closePath();
          const g = new T.ExtrudeGeometry(sh, { depth:300, steps:120, bevelEnabled:false }); g.translate(0, 0, -280); return g;
        });
        const jm = ctx.add(new T.Mesh(jersey, M('std:jersey', ()=>new T.MeshStandardMaterial({ color:0xc9c4b8, roughness:0.9 }))));
        jm.position.set(-5.0, 0, 0);
        ctx.add(longStrip(T, 9, 0.02, 300, 0x2a2a2e, -10.3, 0.005, M('std:oppRoad', ()=>new T.MeshStandardMaterial({ color:0x2e2e32, roughness:0.8 }))));
        [-6.4, -14.2].forEach(x=>ctx.add(longStrip(T, 0.14, 0.02, 300, 0xf4f2ea, x, 0.02, M('bas:line', ()=>new T.MeshBasicMaterial({ color:0xe8e6de })))));
        // trafic en sens inverse (voitures simplifiees, vues de loin)
        const cols = [0xc81e1e, 0xf2f2f2, 0x1e3a8a, 0x2a2a2a, 0x9aa0a6, 0xd8b030];
        const opp = [];
        for(let k = 0; k < 7; k++){
          const car = ctx.add(new T.Mesh(simpleCarGeo(T, 'c' + (k % cols.length), cols[k % cols.length]), vcStd('opp', 0.35)));
          car.rotation.y = Math.PI; car.position.set(k % 2 ? -8.4 : -12.2, 0, -30 - k*28);
          opp.push({ car, v:30 + Math.random()*14 });
        }
        ctx.tick((dt)=>{
          const sc = ctx.scroll();
          for(const o of opp){
            o.car.position.z += sc + o.v * dt;
            if(o.car.position.z > 30){ o.car.position.z = -190 - Math.random()*40; o.v = 30 + Math.random()*14; }
          }
        });
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K(), wrap = 9;
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          add(Kt.guardrail(T, 4.35, z, 1));
          if(i % 3 === 0){ const f = new T.Mesh(houseGeo(T, 'toscana' + (i % 2), i % 2 ? { w:9, d:7, h:6, wall:0xb89e72, roof:0x6a2410, shutter:0x4a2e16, chimney:true } : { w:7, d:6, h:5.2, wall:0xae956c, roof:0x7a2c14, shutter:0x243a24 }), vc('house')); f.position.set(20 + Math.random()*10, 0, z); add(f); }
          // panneau de limitation 130 sur le bas-cote
          if(i % 4 === 2){
            const g = new T.Group();
            const post = new T.Mesh(M('geo:signPost', ()=>new T.CylinderGeometry(0.05, 0.05, 2.6, 6)), M('std:signPost', ()=>new T.MeshStandardMaterial({ color:0x9aa0a6, metalness:0.6, roughness:0.4 })));
            post.position.y = 1.3; g.add(post);
            const disc = new T.Mesh(M('geo:signDisc', ()=>new T.CircleGeometry(0.42, 24)), M('mat:sign130', ()=>{ const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#d0141e'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI*2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 48, 0, Math.PI*2); x.fill(); x.fillStyle = '#111'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('130', 64, 68); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshLambertMaterial({ map:t }); }));
            disc.position.set(0, 2.5, 0.04); g.add(disc);
            g.position.set(5.6, 0, z); add(g);
          }
          // portique vert (signalisation autoroute italienne)
          if(i === 3 || i === 11){
            const g = new T.Group();
            const steel = M('std:gantryIt', ()=>new T.MeshStandardMaterial({ color:0x8a9098, metalness:0.7, roughness:0.4 }));
            [-5.4, 5.4].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.3, 7.2, 0.3), steel); p.position.set(x, 3.6, 0); g.add(p); });
            const beam = new T.Mesh(new T.BoxGeometry(11.2, 0.4, 0.4), steel); beam.position.set(0, 7.0, 0); g.add(beam);
            [[-2.7, ['FIRENZE', '45 km'], '↑'], [2.7, ['ROMA', 'Uscita 1 km'], '↗']].forEach(([x, lines, arrow])=>{
              const s = new T.Mesh(new T.PlaneGeometry(5, 2.5), new T.MeshLambertMaterial({ map:Kt.signTexture(T, '#0a7a3a', lines, arrow) }));
              s.position.set(x, 5.8, 0.25); g.add(s);
            });
            g.position.set(0, 0, z); g.userData.wrapDist = wrap * N * 2; add(g);
          }
          // pont-restaurant Autogrill au-dessus des 2 chaussees (repere rare)
          if(i === 7){
            const g = new T.Group();
            const concrete = M('std:bridge', ()=>new T.MeshStandardMaterial({ color:0xcfc8ba, roughness:0.9 }));
            [-17, -3.8, 5.4].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.9, 6.4, 3), concrete); p.position.set(x, 3.2, 0); g.add(p); });
            const deck = new T.Mesh(new T.BoxGeometry(26, 0.8, 9), concrete); deck.position.set(-5.8, 6.8, 0); g.add(deck);
            const glass = new T.Mesh(new T.BoxGeometry(24, 2.6, 8), new T.MeshStandardMaterial({ color:0x9ab8cc, metalness:0.6, roughness:0.15, emissive:0x3a2a10, emissiveIntensity:0.4 })); glass.position.set(-5.8, 8.5, 0); g.add(glass);
            const roof = new T.Mesh(new T.BoxGeometry(26, 0.5, 9.4), concrete); roof.position.set(-5.8, 10.0, 0); g.add(roof);
            const sign = new T.Mesh(new T.PlaneGeometry(9, 1.3), new T.MeshBasicMaterial({ map:M('tex:autogrill', ()=>{ const c = document.createElement('canvas'); c.width = 512; c.height = 74; const x = c.getContext('2d'); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 512, 74); x.fillStyle = '#fff'; x.font = 'italic 900 54px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AUTOGRILL', 256, 40); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }) }));
            sign.position.set(-2, 10.9, 4.75); g.add(sign);
            g.position.set(0, 0, z); g.userData.wrapDist = wrap * N * 3; add(g);
          }
        }
        // cypres en alignement le long de chemins de ferme, a droite
        add(Sc.strip(T, cypressGeo(T), vc('cypress'), 36, 9, (d, c, i)=>{ d.position.set(11 + (i < 5 ? 0 : 25), 0, -i*3.8 % 36); d.scale.setScalar(0.9 + Math.random()*0.3); }));
        // oliviers et pins parasols epars, des deux cotes
        add(Sc.strip(T, oliveGeo(T), vc('olive'), 40, 12, (d, c, i)=>placeRow(d, c, 1, 14, 40, 40)));
        add(Sc.strip(T, stonePineGeo(T), vc('stonepine'), 60, 6, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 20, 44, 60)));
        add(Sc.strip(T, oliveGeo(T), vc('olive'), 40, 8, (d, c, i)=>placeRow(d, c, -1, 18, 40, 40)));
        // bottes de foin rondes dans les champs moissonnes
        const baleGeo = new T.CylinderGeometry(0.75, 0.75, 1.2, 14); baleGeo.rotateZ(Math.PI/2); baleGeo.translate(0, 0.75, 0);
        add(Sc.strip(T, baleGeo, M('lam:bale', ()=>new T.MeshLambertMaterial({ color:0xd4b060 })), 30, 7, (d, c, i)=>{ d.position.set((i % 2 ? 1 : -1)*(16 + Math.random()*22), 0, -Math.random()*30); d.rotation.y = Math.random()*3; }));
        return items;
      }
    },

    // ------------------------------------------------------------------
    // ROUTE DE PROVENCE : route de campagne bordee de platanes (bande blanche
    // peinte, ombre qui tachete la chaussee), champs de lavande en rangs,
    // murets de pierre seche, mas aux volets bleus, cypres, oliviers, bornes
    // kilometriques, et le Mont Ventoux a la cime blanche au loin.
    {
      id:'provence', name:'Route de Provence', difficulty:'Standard', spacing:9,
      fog:0xd4e0ea, fogNear:40, fogFar:190, ground:0x7a6a42, exposure:0.9,
      road:0x2c2c30, stripe:0xf4f4ee, edge:0x6a6660, edgeEmissive:0x000000,
      sky:{ top:0x0a3a9a, mid:0x3a86e0, bottom:0xcfe2f2, glow:0xfff4d8, glowI:0.45, band:0.07 },
      light:{ key:0xfff2dc, keyI:1.6, hemiSky:0xcfe0ff, hemiGround:0x5a4a30, hemiI:0.5, ambient:0xffffff, ambientI:0.2 },
      headlights:0,
      bend:{ x:1.15, y:1.1 }, // routes de campagne : plus sinueuses
      celestial:{ color:0xfffcf0, halo:0xfff4d0, size:22, x:40, y:70, haloOp:.3 },
      horizonGlow:{ color:0xffffff, op:.1, y:6, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, lub = Sc.fbm(13), hills = Sc.fbm(6);
        const VENT_A = -0.18;
        ctx.add(Sc.silhouette(T, {
          radius:226, height:100, yBase:-6, peak:36, top:0x7a8aa8, bottom:fog, rim:0xffffff, rimA:.3,
          profile:(a)=>{ const d = Math.abs(a - VENT_A)/0.3; const v = d < 1 ? 34*Math.pow(1 - d, 1.2) : 0; return Math.max(v, 5 + lub(a*4 + 3)*12); },
          decorate(g, o){ snowCaps(g, o, 24, 'rgba(236,236,232,.95)'); } // cime pelee et claire du Ventoux
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:60, yBase:-6, peak:20, top:0x5a7a44, bottom:fog, rim:0xfff4d0, rimA:.3,
          profile:(a)=> 3 + hills(a*7 + 1)*14,
          decorate(g, o){
            // village perche (maisons ocre serrees + clocher) sur une colline a gauche
            const x0 = Math.floor(o.W*0.34);
            for(let k = 0; k < 22; k++){ const x = x0 + k*2, y = o.toPx(o.profile[x]); const h = 3 + (k*7 % 5); g.fillStyle = k % 3 ? '#d8b88a' : '#e6cca0'; g.fillRect(x, y - h, 2, h + 1); g.fillStyle = '#b0603a'; g.fillRect(x, y - h - 1, 2, 1); }
            const cx = x0 + 22, cy = o.toPx(o.profile[cx]); g.fillStyle = '#d8b88a'; g.fillRect(cx, cy - 13, 3, 13);
            // bandes de lavande violettes sur les pentes
            for(let x = 0; x < o.W; x += 2){ if(Math.sin(x*0.02) < 0.3) continue; const y = o.toPx(o.profile[x]); g.fillStyle = 'rgba(130,100,190,.55)'; g.fillRect(x, y + 4, 2, 6); }
          }
        }));
        dayClouds(T, ctx, [[-120, 64, 70, .55], [-10, 80, 80, .45], [80, 60, 60, .55]]);
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S();
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          if(i % 3 === 1){
            const side = i % 2 ? 1 : -1;
            const mas = new T.Mesh(houseGeo(T, 'mas' + (i % 2), i % 2 ? { w:10, d:7, h:5.6, wall:0xc49e64, roof:0x72280f, shutter:0x2a5a8a, chimney:true } : { w:8, d:6.5, h:5, wall:0xcfb080, roof:0x6a240e, shutter:0x3a6a4a }), vc('house'));
            mas.position.set(side*(37 + Math.random()*1.5), 0, z); add(mas);
            // paire de cypres devant le mas
            [-3, 3].forEach(dz=>{ const c = new T.Mesh(cypressGeo(T), vc('cypress')); c.position.set(mas.position.x - side*5, 0, z + dz); add(c); });
          }
        }
        // platanes serres le long de la route (projettent leur ombre sur la chaussee)
        const plane = Sc.strip(T, planeTreeGeo(T), vc('platane'), 8, 2, (d, c, i)=>{ d.position.set(i ? 5.7 : -5.7, 0, -4 - (i ? 4 : 0)); d.rotation.y = i * 2.1; d.scale.setScalar(1.0 + (i ? 0.06 : 0)); });
        plane.castShadow = true; add(plane);
        // champs de lavande : rangs perpendiculaires a la route, des deux cotes
        const lav = Sc.merge(T, [{ geo:new T.BoxGeometry(22, 0.5, 0.8), pos:[0, 0.28, 0], color:0x2e1a62 }, { geo:new T.BoxGeometry(22, 0.22, 0.55), pos:[0, 0.6, 0], color:0x4a2c8e }]);
        add(Sc.strip(T, lav, vc('lavender'), 16, 12, (d, c, i)=>{ const s = i < 6 ? -1 : 1; d.position.set(s*((i % 6) > 2 ? 55 : 20), 0, -(i % 3)*5.3 - 1); }));
        // murets de pierre seche + bornes kilometriques (blanches a tete rouge)
        add(Sc.strip(T, new T.BoxGeometry(0.6, 0.8, 7.6), M('std:drystone', ()=>new T.MeshStandardMaterial({ color:0x7a6c52, roughness:1 })), 8, 2, (d, c, i)=>{ d.position.set(i ? 8.2 : -8.2, 0.4, -4); }));
        const borne = Sc.merge(T, [{ geo:new T.BoxGeometry(0.42, 0.6, 0.22), pos:[0, 0.3, 0], color:0xf2f0ea }, { geo:new T.CylinderGeometry(0.21, 0.21, 0.22, 12, 1, false, 0, Math.PI), pos:[0, 0.6, 0], rot:[Math.PI/2, 0, Math.PI/2], color:0xd0201e }]);
        add(Sc.strip(T, borne, vc('borne'), 36, 1, (d)=>{ d.position.set(4.9, 0, -10); }));
        // oliviers en vergers + cypres isoles
        add(Sc.strip(T, oliveGeo(T), vc('olive'), 36, 6, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 32, 43, 36)));
        add(Sc.strip(T, cypressGeo(T), vc('cypress'), 50, 4, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 32, 43, 50)));
        return items;
      }
    }
  ];

  DG.ROUTES = (DG.ROUTES || []).concat(ROUTES);
})();
