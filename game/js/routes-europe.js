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

  // ---------- A1 : plaine du Po ----------
  // Peuplier d'Italie : tronc fin et houppier etroit tres haut (rideaux d'arbres)
  function poplarGeo(T){
    return M('geo:poplar', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.12, 0.18, 2.4, 6), pos:[0, 1.2, 0], color:0x4a4034 },
      { geo:new T.IcosahedronGeometry(1, 1), pos:[0, 5.6, 0], scale:[1.05, 3.6, 1.05], color:0x1f3814 },
      { geo:new T.IcosahedronGeometry(0.8, 1), pos:[0.2, 8.4, 0.1], scale:[1, 2.2, 1], color:0x284818 },
    ]));
  }
  // Pylone a haute tension en treillis (4 montants inclines + consoles)
  function pylonGeo(T){
    return M('geo:pylon', ()=>{
      const c = 0x5a5e62, parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz])=>parts.push({ geo:new T.BoxGeometry(0.16, 22.5, 0.16), pos:[sx*1.1, 11, sz*1.1], rot:[sz*0.07, 0, -sx*0.07], color:c }));
      for(let y = 3; y < 21; y += 3.2){ const w = 2.4 - y*0.07; parts.push({ geo:new T.BoxGeometry(w*2, 0.1, 0.1), pos:[0, y, 1.2 - y*0.05], color:c }); parts.push({ geo:new T.BoxGeometry(w*2, 0.1, 0.1), pos:[0, y, -1.2 + y*0.05], color:c }); }
      parts.push({ geo:new T.BoxGeometry(6.2, 0.24, 0.24), pos:[0, 21.4, 0], color:c });
      parts.push({ geo:new T.BoxGeometry(4.2, 0.2, 0.2), pos:[0, 17.6, 0], color:c });
      parts.push({ geo:new T.ConeGeometry(0.5, 2.2, 4), pos:[0, 23.4, 0], color:c });
      return S().merge(T, parts);
    });
  }
  // Barriere de peage : la chaussee s'elargit vers la droite (8 voies de
  // cabines), grand auvent au nom de la gare, ilots et cabines, panneau par
  // voie (telepeage / carte / especes), barrieres a bras rayes. Les voies du
  // joueur (x = -3.3 .. 3.3) ont les bras "arm0..arm3" ; les voies en plus
  // (userData.queueLanes) recoivent des voitures qui font la queue (moteur).
  // Type de chaque voie de cabine : telepeage (T), carte (CB), especes + carte (€)
  const LANE_TYPES = ['cash', 't', 'cb', 'cash', 'cb', 't', 'cash', 'cb'];
  function tollPlaza(T, stop, style){
    const st = Object.assign({ bg:'#0a3a7a', fg:'#ffffff', accent:'#ffcc00', left:'T', right:'€', title:null }, style || {});
    const g = new T.Group();
    const concrete = M('std:tollConcrete', ()=>new T.MeshStandardMaterial({ color:0xb0aaa0, roughness:0.9 }));
    const white = M('std:tollWhite', ()=>new T.MeshStandardMaterial({ color:0xe8eaec, roughness:0.5, metalness:0.2 }));
    const asph = M('std:tollApron', ()=>new T.MeshStandardMaterial({ color:0x333336, roughness:0.85 }));
    const LN = [-3.3, -1.1, 1.1, 3.3, 5.5, 7.7, 9.9, 12.1];
    // elargissement : trapeze d'asphalte (4.6 -> 13.4) puis zone des cabines
    const sh = new T.Shape();
    sh.moveTo(-4.6, -60); sh.lineTo(4.6, -60); sh.lineTo(13.4, -26); sh.lineTo(13.4, 20); sh.lineTo(4.6, 60); sh.lineTo(-4.6, 60); sh.closePath();
    const apron = new T.Mesh(new T.ShapeGeometry(sh), asph);
    apron.rotation.x = -Math.PI/2; apron.position.y = 0.012; apron.receiveShadow = true; g.add(apron);
    const lineMat = M('bas:line', ()=>new T.MeshBasicMaterial({ color:0xe8e6de }));
    // marquages des voies de cabines + ligne d'arret
    for(let k = 0; k < LN.length - 1; k++){ const x = (LN[k] + LN[k + 1]) / 2; for(let z = 8; z < 30; z += 4){ const m = new T.Mesh(M('geo:dash', ()=>new T.PlaneGeometry(0.12, 2)), lineMat); m.rotation.x = -Math.PI/2; m.position.set(x, 0.03, z); g.add(m); } }
    const stopLine = new T.Mesh(new T.PlaneGeometry(17.6, 0.4), lineMat); stopLine.rotation.x = -Math.PI/2; stopLine.position.set(4.4, 0.03, 5.6); g.add(stopLine);
    // auvent + bandeau au nom de la gare
    const roof = new T.Mesh(new T.BoxGeometry(20.5, 0.9, 13), white); roof.position.set(4.4, 6.6, 0); g.add(roof);
    const roofEdge = new T.Mesh(new T.BoxGeometry(20.6, 0.3, 13.1), M('std:tollEdge' + st.bg, ()=>new T.MeshStandardMaterial({ color:new T.Color(st.bg), roughness:0.5 }))); roofEdge.position.set(4.4, 6.05, 0); g.add(roofEdge);
    [-5.6, 14.4].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.8, 6.2, 0.8), concrete); p.position.set(x, 3.1, 0); g.add(p); });
    const band = new T.Mesh(new T.PlaneGeometry(19.6, 1.5), new T.MeshBasicMaterial({ map:(()=>{
      const c = document.createElement('canvas'); c.width = 1024; c.height = 78; const x = c.getContext('2d');
      x.fillStyle = st.bg; x.fillRect(0, 0, 1024, 78);
      x.fillStyle = st.fg; x.font = '900 46px Arial'; x.textBaseline = 'middle'; x.textAlign = 'center';
      const nm = stop.name.toUpperCase();
      x.fillText((st.title && nm.indexOf(st.title) !== 0 ? st.title + '  ' : '') + nm, 512, 41);
      x.fillStyle = st.accent; x.fillRect(16, 14, 50, 50); x.fillStyle = st.bg; x.font = '900 30px Arial'; x.fillText(st.left, 41, 41);
      x.fillStyle = st.accent; x.fillRect(958, 14, 50, 50); x.fillStyle = st.bg; x.fillText(st.right, 983, 41);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; })() }));
    band.position.set(4.4, 6.6, 6.52); g.add(band);
    for(let k = 0; k < 4; k++){ const l = new T.Mesh(new T.BoxGeometry(18, 0.05, 0.3), M('bas:tollLight', ()=>new T.MeshBasicMaterial({ color:0xfff6e0 }))); l.position.set(4.4, 6.12, -4.5 + k*3); g.add(l); }
    // panneau au-dessus de chaque voie : type de paiement
    const laneSign = (kind)=>M('mat:laneSign:' + kind + st.accent, ()=>{
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      const col = kind === 't' ? st.accent : kind === 'cb' ? '#1f6ad8' : '#1a9a4a';
      x.fillStyle = '#111'; x.fillRect(0, 0, 64, 64); x.fillStyle = col; x.fillRect(4, 4, 56, 56);
      x.fillStyle = kind === 't' ? st.bg : '#fff'; x.font = '900 ' + (kind === 'cb' ? 24 : 34) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(kind === 't' ? st.left : kind === 'cb' ? 'CB' : st.right, 32, 34);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshBasicMaterial({ map:t });
    });
    const stripeTex = M('tex:barrierStripe', ()=>{ const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d'); for(let i = 0; i < 8; i++){ x.fillStyle = i % 2 ? '#fff' : '#d0141e'; x.fillRect(i*8, 0, 8, 8); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; });
    const boothMat = M('std:booth', ()=>new T.MeshStandardMaterial({ color:0x9ac0d0, roughness:0.1, metalness:0.5, emissive:0x1a2a30 }));
    const bollardMat = M('std:bollard', ()=>new T.MeshStandardMaterial({ color:0xffc21a, roughness:0.5 }));
    LN.forEach((lane, k)=>{
      const ix = lane - 1.1; // ilot a gauche de la voie
      const island = new T.Mesh(M('geo:island', ()=>new T.BoxGeometry(0.9, 0.3, 11)), concrete); island.position.set(ix, 0.15, 0); g.add(island);
      const booth = new T.Mesh(M('geo:booth', ()=>new T.BoxGeometry(0.8, 2.3, 2.0)), boothMat); booth.position.set(ix, 1.45, -1); g.add(booth);
      const cap = new T.Mesh(M('geo:boothCap', ()=>new T.BoxGeometry(1.0, 0.2, 2.3)), white); cap.position.set(ix, 2.7, -1); g.add(cap);
      const bollard = new T.Mesh(M('geo:bollard', ()=>new T.CylinderGeometry(0.2, 0.2, 1.0, 10)), bollardMat); bollard.position.set(ix, 0.8, 5.2); g.add(bollard);
      const type = LANE_TYPES[k % LANE_TYPES.length];
      const sign = new T.Mesh(M('geo:laneSign', ()=>new T.PlaneGeometry(0.9, 0.9)), laneSign(type)); sign.position.set(lane, 5.4, 6.25); g.add(sign);
      const pivot = new T.Group(); pivot.name = 'arm' + k; pivot.position.set(lane - 1.0, 1.0, 4.4);
      const arm = new T.Mesh(M('geo:arm', ()=>new T.BoxGeometry(1.95, 0.12, 0.12)), M('mat:arm', ()=>new T.MeshLambertMaterial({ map:stripeTex })));
      arm.position.x = 0.98; pivot.add(arm); g.add(pivot);
    });
    const lastIsland = new T.Mesh(M('geo:island', ()=>new T.BoxGeometry(0.9, 0.3, 11)), concrete); lastIsland.position.set(13.2, 0.15, 0); g.add(lastIsland);
    g.userData.queueLanes = LN.map((x, k)=>({ x, k, arm:'arm' + k, type:LANE_TYPES[k % LANE_TYPES.length] }));
    return g;
  }


  // Station-service sur le bas-cote droit : auvent aux couleurs de la route,
  // pompes a cote de la voie de droite (la voiture s'arrete juste a cote),
  // boutique et totem des prix visibles de loin. Origine = meme repere que la
  // barriere de peage (la voiture s'arrete a +6 + 2.2 devant l'origine).
  function fuelStation(T, route){
    const g = new T.Group();
    const col = route.fuelColor || 0x1a7a3a, col2 = route.fuelColor2 || 0xffcc00;
    const cur = route.currency || (route.journey && route.journey.currency) || '€';
    const prices = route.fuelPrices || [1.79, 1.86, 1.95], labels = route.fuelLabels || ['GAZOLE', 'SP95', 'SP98'];
    const fmt = (v)=> cur === '¥' ? Math.round(v) + '' : cur === '$' ? '$' + v.toFixed(2) : v.toFixed(3).replace('.', ',');
    const white = M('std:tollWhite', ()=>new T.MeshStandardMaterial({ color:0xe8eaec, roughness:0.5, metalness:0.2 }));
    const brand = M('std:fuelBrand' + col, ()=>new T.MeshStandardMaterial({ color:col, roughness:0.45 }));
    const concrete = M('std:tollConcrete', ()=>new T.MeshStandardMaterial({ color:0xb0aaa0, roughness:0.9 }));
    const lineMat = M('bas:line', ()=>new T.MeshBasicMaterial({ color:0xe8e6de }));
    // aire : asphalte de la voie de service + parking, bordures
    const apron = new T.Mesh(new T.PlaneGeometry(22, 70, 2, 14), M('std:tollApron', ()=>new T.MeshStandardMaterial({ color:0x333336, roughness:0.85 })));
    apron.rotation.x = -Math.PI/2; apron.position.set(15.4, 0.012, 2); apron.receiveShadow = true; g.add(apron);
    // ligne discontinue epaisse : bretelle de decceleration qui s'ecarte de la route
    for(let z = -30; z < 40; z += 5){ const m = new T.Mesh(M('geo:decelDash', ()=>new T.PlaneGeometry(0.3, 3)), lineMat); m.rotation.x = -Math.PI/2; m.position.set(4.7, 0.03, z); g.add(m); }
    // fleches peintes vers les pompes
    const arrowTex = M('tex:arrow', ()=>{ const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = 'rgba(232,230,222,.9)'; x.beginPath(); x.moveTo(32, 4); x.lineTo(60, 44); x.lineTo(42, 44); x.lineTo(42, 124); x.lineTo(22, 124); x.lineTo(22, 44); x.lineTo(4, 44); x.closePath(); x.fill(); const t = new T.CanvasTexture(c); return t; });
    [26, 40].forEach(z=>{ const a = new T.Mesh(M('geo:arrowDecal', ()=>new T.PlaneGeometry(1.1, 2.2)), M('mat:arrowDecal', ()=>new T.MeshBasicMaterial({ map:arrowTex, transparent:true, depthWrite:false }))); a.rotation.x = -Math.PI/2; a.rotation.z = -0.25; a.position.set(6.3, 0.035, z); g.add(a); });
    // auvent : toit blanc, bandeau a la couleur de l'enseigne, liseré lumineux
    const roof = new T.Mesh(new T.BoxGeometry(8, 0.6, 13), white); roof.position.set(8.7, 5.4, 7.5); g.add(roof);
    const band = new T.Mesh(new T.BoxGeometry(8.1, 0.55, 13.1), brand); band.position.set(8.7, 4.95, 7.5); g.add(band);
    const led = new T.Mesh(new T.BoxGeometry(8.2, 0.08, 13.2), M('bas:fuelLed' + col2, ()=>new T.MeshBasicMaterial({ color:col2 }))); led.position.set(8.7, 4.64, 7.5); g.add(led);
    [[5.4, 2.4], [5.4, 12.6], [12, 2.4], [12, 12.6]].forEach(([x, z])=>{ const p = new T.Mesh(new T.BoxGeometry(0.35, 4.8, 0.35), white); p.position.set(x, 2.4, z); g.add(p); });
    for(let k = 0; k < 3; k++){ const l = new T.Mesh(new T.BoxGeometry(6, 0.05, 0.3), M('bas:tollLight', ()=>new T.MeshBasicMaterial({ color:0xfff6e0 }))); l.position.set(8.7, 5.08, 4 + k*3.5); g.add(l); }
    // ilot des pompes (a cote de la voie de service ou s'arrete la voiture)
    const island = new T.Mesh(new T.BoxGeometry(1.3, 0.28, 10), concrete); island.position.set(8.7, 0.14, 7.5); g.add(island);
    const pumpGeo = M('geo:pumpV3', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.75, 2.0, 1.0), pos:[0, 1.0, 0], color:0xe8eaec },
      { geo:new T.BoxGeometry(0.77, 0.45, 1.02), pos:[0, 2.05, 0], color:col },
      { geo:new T.BoxGeometry(0.12, 0.35, 0.18), pos:[-0.43, 1.05, 0.28], color:0x111111 },
      { geo:new T.BoxGeometry(0.12, 0.35, 0.18), pos:[-0.43, 1.05, -0.28], color:0x111111 },
      { geo:new T.BoxGeometry(0.6, 0.2, 0.8), pos:[0, 0.1, 0], color:0x8a8e94 },
    ]));
    const screenMat = M('mat:pumpScreen:' + route.id, ()=>{ const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#0a1410'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#6dff9e'; x.font = '700 14px Courier New'; x.textAlign = 'center'; labels.forEach((l, k)=>{ x.fillText(l + ' ' + fmt(prices[k] || prices[0]), 64, 24 + k*26); }); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshBasicMaterial({ map:t, toneMapped:false }); });
    [4.2, 7.5, 10.8].forEach(z=>{
      const p = new T.Mesh(pumpGeo, vc('pump')); p.position.set(8.7, 0.28, z); g.add(p);
      const sc = new T.Mesh(M('geo:pumpScreen', ()=>new T.PlaneGeometry(0.62, 0.46)), screenMat); sc.rotation.y = -Math.PI/2; sc.position.set(8.3, 1.9, z); g.add(sc);
    });
    // tuyau de la pompe du milieu vers la trappe a carburant (visible pendant le plein)
    const hosePts = [new T.Vector3(8.3, 1.3, 7.2), new T.Vector3(8.0, 0.35, 7.8), new T.Vector3(7.95, 0.8, 8.6)];
    const hose = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(hosePts), 14, 0.05, 6), M('std:hose', ()=>new T.MeshStandardMaterial({ color:0x121212, roughness:0.6 })));
    hose.name = 'hose'; hose.visible = false; g.add(hose);
    // boutique vitree eclairee + enseigne
    // coque de la boutique ouverte cote vitrine (on voit l'interieur et on y entre)
    const shop = new T.Mesh(M('geo:fuelShopV4', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.2, 3.6, 12), pos:[3.75, 1.8, 0], color:0xd8d4cc },
      { geo:new T.BoxGeometry(7, 3.6, 0.2), pos:[0, 1.8, -6.02], color:0xd8d4cc },
      { geo:new T.BoxGeometry(7, 3.6, 0.2), pos:[0, 1.8, 6.02], color:0xd8d4cc },
      { geo:new T.BoxGeometry(0.2, 0.85, 12), pos:[-3.4, 3.18, 0], color:0xd8d4cc },
      { geo:new T.BoxGeometry(7.4, 0.5, 12.4), pos:[0, 3.8, 0], color:0x4a4e54 },
      { geo:new T.BoxGeometry(0.1, 0.34, 7.6), pos:[-3.52, 0.17, -2.2], color:0x6a6e74 },
      { geo:new T.BoxGeometry(0.1, 0.34, 2.6), pos:[-3.52, 0.17, 4.7], color:0x6a6e74 },
    ])), vc('fuelshop'));
    shop.position.set(18, 0, 7); g.add(shop);
    // vitrine (2 panneaux fixes) + portes automatiques coulissantes au milieu
    const glassMat = M('std:shopGlass2', ()=>new T.MeshStandardMaterial({ color:0x9ab8cc, metalness:0.7, roughness:0.08, emissive:0x5a4a30, emissiveIntensity:0.45, transparent:true, opacity:0.42, side:T.DoubleSide, depthWrite:false }));
    [[6.1, 5.55], [1.1, 10.95]].forEach(([w, z])=>{ const p = new T.Mesh(new T.PlaneGeometry(w, 2.4), glassMat); p.rotation.y = -Math.PI/2; p.position.set(14.47, 1.55, z); g.add(p); });
    const frameMat = M('std:doorFrame', ()=>new T.MeshStandardMaterial({ color:0x2a2e34, metalness:0.7, roughness:0.35 }));
    const doorGlass = M('std:doorGlass', ()=>new T.MeshStandardMaterial({ color:0xb8d4e4, metalness:0.6, roughness:0.05, emissive:0x3a3428, emissiveIntensity:0.4, transparent:true, opacity:0.35, side:T.DoubleSide, depthWrite:false }));
    ['shopDoorA', 'shopDoorB'].forEach((n, k)=>{
      const d = new T.Group(); d.name = n;
      const gl = new T.Mesh(new T.PlaneGeometry(0.9, 2.3), doorGlass); gl.rotation.y = -Math.PI/2; d.add(gl);
      [[0, 1.17, 0, 0.06, 0.06, 0.92], [0, -1.17, 0, 0.06, 0.06, 0.92], [0, 0, 0.45, 0.06, 2.36, 0.05], [0, 0, -0.45, 0.06, 2.36, 0.05]].forEach(([x, y, z, sx, sy, sz])=>{ const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), frameMat); b.position.set(x, y, z); d.add(b); });
      const handle = new T.Mesh(new T.BoxGeometry(0.05, 0.5, 0.04), frameMat); handle.position.set(-0.05, 0, k ? -0.36 : 0.36); d.add(handle);
      d.position.set(14.42, 1.2, k ? 9.95 : 9.05); g.add(d);
    });
    [[14.45, 2.5, 9.5, 0.14, 0.18, 1.9], [14.45, 1.25, 8.56, 0.12, 2.5, 0.08], [14.45, 1.25, 10.44, 0.12, 2.5, 0.08], [14.36, 2.66, 9.5, 0.1, 0.1, 0.3]].forEach(([x, y, z, sx, sy, sz])=>{ const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), frameMat); b.position.set(x, y, z); g.add(b); });
    const mat = new T.Mesh(new T.PlaneGeometry(1.2, 1.7), M('std:doormat', ()=>new T.MeshStandardMaterial({ color:0x2a2c30, roughness:1 }))); mat.rotation.x = -Math.PI/2; mat.position.set(13.8, 0.03, 9.5); g.add(mat);
    const mat2 = mat.clone(); mat2.position.set(15.2, 0.07, 9.5); g.add(mat2);
    const shopSign = new T.Mesh(new T.PlaneGeometry(4.2, 0.7), new T.MeshBasicMaterial({ map:(()=>{ const c = document.createElement('canvas'); c.width = 384; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillRect(0, 0, 384, 64); x.fillStyle = '#fff'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((route.shopWord || (cur === '$' ? 'FOOD · SHOP' : cur === '¥' ? 'コンビニ' : cur === 'CHF' && route.journey && route.journey.lang === 'de' ? 'SHOP · CAFÉ' : 'BOUTIQUE · CAFÉ')), 192, 34); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })(), toneMapped:false }));
    shopSign.rotation.y = -Math.PI/2; shopSign.position.set(14.4, 3.2, 7); g.add(shopSign);
    // voie de sortie (avant l'aire) et voie d'insertion (apres), ligne discontinue,
    // ligne de rive, cadre de stationnement devant la pompe, panneaux, police garee
    const apronMat = M('std:svcLane', ()=>new T.MeshStandardMaterial({ color:0x17181b, roughness:0.88, metalness:0.1 }));
    [[139.5, 205], [-80.5, 95]].forEach(([z, len])=>{
      const lane = new T.Mesh(new T.PlaneGeometry(3.6, len, 1, Math.ceil(len / 5)), apronMat); lane.rotation.x = -Math.PI/2; lane.position.set(6.4, 0.013, z); g.add(lane);
      const rive = new T.Mesh(new T.PlaneGeometry(0.14, len), lineMat); rive.rotation.x = -Math.PI/2; rive.position.set(8.1, 0.03, z); g.add(rive);
    });
    for(let z = 40; z < 236; z += 5){ const m = new T.Mesh(M('geo:decelDash', ()=>null), lineMat); m.rotation.x = -Math.PI/2; m.position.set(4.7, 0.03, z); g.add(m); }
    for(let z = -35; z > -124; z -= 5){ const m = new T.Mesh(M('geo:decelDash', ()=>null), lineMat); m.rotation.x = -Math.PI/2; m.position.set(4.7, 0.03, z); g.add(m); }
    const boxMat = M('bas:parkBox', ()=>new T.MeshBasicMaterial({ color:0xffd23a }));
    [[6.3 - 1.25, 8.2, 0.12, 5.2], [6.3 + 1.25, 8.2, 0.12, 5.2], [6.3, 8.2 - 2.6, 2.62, 0.12], [6.3, 8.2 + 2.6, 2.62, 0.12]].forEach(([x, z, w, h])=>{ const b = new T.Mesh(new T.PlaneGeometry(w, h), boxMat); b.rotation.x = -Math.PI/2; b.position.set(x, 0.036, z); g.add(b); });
    const pMark = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ffd23a'; x.font = '900 52px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', 32, 36); const t = new T.CanvasTexture(c); return t; })();
    const pm = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map:pMark, transparent:true, depthWrite:false })); pm.rotation.x = -Math.PI/2; pm.position.set(6.3, 0.037, 8.2 - 1.6); g.add(pm);
    const signPost = M('std:radarPole', ()=>new T.MeshStandardMaterial({ color:0x8a9098, metalness:0.6, roughness:0.4 }));
    const exitSign = new T.Group();
    const ec = document.createElement('canvas'); ec.width = 256; ec.height = 160; const ex = ec.getContext('2d');
    ex.fillStyle = cur === '$' ? '#0a6a3a' : '#1f4fa8'; ex.fillRect(0, 0, 256, 160); ex.strokeStyle = '#fff'; ex.lineWidth = 6; ex.strokeRect(6, 6, 244, 148);
    ex.fillStyle = '#fff'; ex.textAlign = 'center'; ex.font = '900 46px Arial'; ex.fillText('⛽ 🍴', 128, 62); ex.font = '800 24px Arial'; ex.fillText(cur === '$' ? 'GAS · FOOD' : cur === '¥' ? 'サービスエリア' : 'AIRE DE SERVICE', 128, 104); ex.font = '900 26px Arial'; ex.fillText('↘ ' + (cur === '$' ? 'EXIT' : 'SORTIE'), 128, 140);
    const et = new T.CanvasTexture(ec); et.encoding = T.sRGBEncoding;
    const ep = new T.Mesh(new T.PlaneGeometry(2.6, 1.62), new T.MeshBasicMaterial({ map:et, toneMapped:false })); ep.position.set(0, 3.1, 0.06); exitSign.add(ep);
    const epost = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 3.6, 8), signPost); epost.position.y = 1.8; exitSign.add(epost);
    exitSign.position.set(9.4, 0, 250); g.add(exitSign);
    [[42, 30], [-40, 90]].forEach(([z, lim], k)=>{ if(k && cur !== '€') return; const s = new T.Group(); const plate = new T.Mesh(new T.PlaneGeometry(0.9, cur === '$' ? 1.12 : 0.9), limitSignTex(T, cur === '$' ? 48 : lim, cur === '$')); plate.position.set(0, 2.1, 0.05); s.add(plate); const pp = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), signPost); pp.position.y = 1.2; s.add(pp); s.position.set(8.6, 0, z); g.add(s); });
    const cop = policeCar(T, route.radars && route.radars.policeStyle || (cur === '$' ? 'us' : cur === 'CHF' ? 'ch' : route.id === 'autostrada' ? 'it' : 'fr'));
    ['sirenRed', 'sirenBlue'].forEach(n=>{ const o = cop.getObjectByName(n); if(o) o.material.opacity = 0.25; });
    cop.position.set(16.4, 0, -13); cop.rotation.y = -1.35; g.add(cop);
    // pistolet de la pompe arriere (on le decroche pour faire le plein) + son compteur
    const noz = new T.Group(); noz.name = 'nozzle';
    const nm = M('std:nozzle', ()=>new T.MeshStandardMaterial({ color:0x1a1a1c, roughness:0.5, metalness:0.3 }));
    const grip = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.07), nm); grip.position.set(0.06, -0.09, 0); noz.add(grip);
    const nbody = new T.Mesh(new T.BoxGeometry(0.24, 0.085, 0.085), M('std:nozzleCol' + col, ()=>new T.MeshStandardMaterial({ color:col, roughness:0.4 }))); noz.add(nbody);
    const spout = new T.Mesh(new T.CylinderGeometry(0.018, 0.022, 0.26, 8), M('std:spout', ()=>new T.MeshStandardMaterial({ color:0xb0b4ba, metalness:0.8, roughness:0.3 }))); spout.rotation.z = Math.PI / 2; spout.position.set(-0.24, -0.02, 0); noz.add(spout);
    noz.position.set(8.22, 1.33, 11.08); noz.rotation.z = -0.9; g.add(noz);
    const lc = document.createElement('canvas'); lc.width = 256; lc.height = 160;
    const lx = lc.getContext('2d'); lx.fillStyle = '#050c08'; lx.fillRect(0, 0, 256, 160); lx.fillStyle = '#6dff9e'; lx.font = '700 30px Courier New'; lx.textAlign = 'right'; lx.fillText('0,00', 246, 92); lx.fillText('0,00', 246, 146);
    const lt = new T.CanvasTexture(lc); lt.encoding = T.sRGBEncoding;
    const lcd = new T.Mesh(new T.PlaneGeometry(0.62, 0.39), new T.MeshBasicMaterial({ map:lt, toneMapped:false }));
    lcd.name = 'pumpLcd'; lcd.userData.canvas = lc; lcd.position.set(8.7, 1.62, 11.315); g.add(lcd);
    const inside = shopInterior(T, route); inside.position.set(18, 0, 7); g.add(inside);
    // modele de station fourni (gas-station.glb) : grande station derriere la
    // voie de service (sa propre boutique, ses pompes, son parking)
    if(route.fuelStationModel){
      const holder = new T.Group(); holder.position.set(40, 0, 0); holder.rotation.y = -Math.PI / 2; g.add(holder);
      DG.Loader.loadModel(route.fuelStationModel).then(src=>{
        if(!src) return;
        const clone = src.clone(true);
        const box = DG.Loader.worldBox(T, clone), size = new T.Vector3(), c = new T.Vector3(); box.getSize(size); box.getCenter(c);
        const k = 44 / (Math.max(size.x, size.z) || 1);
        clone.position.set(-c.x, -box.min.y, -c.z);
        clone.traverse(n=>{ n.frustumCulled = false; if(n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m=>{ m.userData.dgWiden = true; m.needsUpdate = true; }); }); // decor : elargi avec la route
        const inner = new T.Group(); inner.add(clone); inner.scale.setScalar(k); holder.add(inner);
      });
    }
    // petits details : poubelles, borne de gonflage, place de parking
    const bin = new T.Mesh(M('geo:bin', ()=>new T.CylinderGeometry(0.3, 0.26, 0.9, 10)), M('std:bin', ()=>new T.MeshStandardMaterial({ color:0x2a5a3a, roughness:0.6 }))); bin.position.set(8.7, 0.72, 2.6); g.add(bin);
    const air = new T.Mesh(M('geo:airPump', ()=>S().merge(T, [ { geo:new T.BoxGeometry(0.5, 1.4, 0.4), pos:[0, 0.7, 0], color:0x1f5ad8 }, { geo:new T.BoxGeometry(0.52, 0.3, 0.42), pos:[0, 1.2, 0], color:0xf2f2f2 } ])), vc('airpump')); air.position.set(13.6, 0, -4); g.add(air);
    for(let k = 0; k < 4; k++){ const m = new T.Mesh(M('geo:parkLine', ()=>new T.PlaneGeometry(0.12, 4.6)), lineMat); m.rotation.x = -Math.PI/2; m.rotation.z = Math.PI/2; m.position.set(16.2, 0.03, -6 - k*2.8); g.add(m); }
    // totem des prix, visible de loin (avant l'entree)
    const totem = new T.Group();
    const post = new T.Mesh(new T.BoxGeometry(1.6, 7, 0.5), brand); post.position.y = 3.5; totem.add(post);
    const board = new T.Mesh(new T.PlaneGeometry(1.5, 3.2), new T.MeshBasicMaterial({ map:(()=>{
      const c = document.createElement('canvas'); c.width = 96; c.height = 204; const x = c.getContext('2d');
      x.fillStyle = '#111'; x.fillRect(0, 0, 96, 204);
      x.fillStyle = '#' + col2.toString(16).padStart(6, '0'); x.fillRect(0, 0, 96, 44);
      x.fillStyle = '#111'; x.font = '900 30px Arial'; x.textAlign = 'center'; x.fillText('⛽', 48, 34);
      labels.forEach((r, k)=>{ x.fillStyle = '#ccc'; x.font = '700 13px Arial'; x.fillText(r, 48, 70 + k*46); x.fillStyle = '#ff5a3a'; x.font = '900 21px Courier New'; x.fillText(fmt(prices[k] || prices[0]), 48, 94 + k*46); });
      if(route.fuelUnit === 'gal'){ x.fillStyle = '#888'; x.font = '700 11px Arial'; x.fillText('PER GALLON', 48, 200); }
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })(), toneMapped:false }));
    board.position.set(0, 5.2, 0.26); totem.add(board);
    totem.position.set(6.6, 0, -22); totem.rotation.y = -0.3; g.add(totem);
    return g;
  }
  // ---------- Radars et police ----------
  function limitSignTex(T, limit, us){
    return M('tex:limit:' + limit + ':' + (us ? 1 : 0), ()=>{
      const c = document.createElement('canvas'); c.width = 128; c.height = us ? 160 : 128; const x = c.getContext('2d');
      if(us){
        x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 128, 160); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(6, 6, 116, 148);
        x.fillStyle = '#111'; x.textAlign = 'center'; x.font = '900 22px Arial'; x.fillText('SPEED', 64, 42); x.fillText('LIMIT', 64, 66);
        x.font = '900 64px Arial'; x.fillText(String(Math.round(limit / 1.609)), 64, 132);
      } else {
        x.fillStyle = '#d0141e'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI*2); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 48, 0, Math.PI*2); x.fill();
        x.fillStyle = '#111'; x.font = '900 ' + (limit >= 100 ? 46 : 58) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(limit), 64, 68);
      }
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshLambertMaterial({ map:t, transparent:true });
    });
  }
  function warnSignTex(T, text, sub, bg, fg){
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 160); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(8, 8, 240, 144);
    // pictogramme camera
    x.fillStyle = fg; x.fillRect(96, 30, 64, 40); x.beginPath(); x.arc(128, 50, 13, 0, Math.PI*2); x.fillStyle = bg; x.fill(); x.fillStyle = fg; x.fillRect(118, 70, 20, 16);
    x.fillStyle = fg; x.textAlign = 'center'; x.font = '900 24px Arial'; x.fillText(text, 128, 114); x.font = '700 17px Arial'; x.fillText(sub, 128, 140);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshLambertMaterial({ map:t });
  }
  // Radar : fixe (tourelle grise a rayures reflechissantes en France, cabine
  // orange en Italie, grise en Suisse, blanche aux USA) annonce par 2 panneaux
  // (400 et 200 unites avant) + limitation ; ou radar MOBILE : voiture de
  // police garee sur le bas-cote avec un appareil sur trepied, sans panneau.
  // Le flash (sprite "radarFlash") s'allume au moment ou on est flashe.
  function speedCamera(T, R, route, edgeX, mobile){
    const g = new T.Group(), us = R.style === 'us', ex = edgeX || 5.6;
    const grey = M('std:radarPole', ()=>new T.MeshStandardMaterial({ color:0x8a9098, metalness:0.6, roughness:0.4 }));
    const flash = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xffffff, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false }));
    flash.name = 'radarFlash'; flash.scale.set(5, 5, 1);
    if(mobile){
      const car = policeCar(T, R.policeStyle || R.style || 'fr'); car.rotation.y = 0.25; car.position.set(ex + 2.2, 0, -3); g.add(car);
      ['sirenRed', 'sirenBlue'].forEach(n=>{ const o = car.getObjectByName(n); if(o) o.material.opacity = 0; }); // gyrophares eteints : discret
      const tri = new T.Mesh(M('geo:tripod', ()=>S().merge(T, [
        ...[0, 2.1, 4.2].map(a=>({ geo:new T.CylinderGeometry(0.03, 0.03, 1.4, 5), pos:[Math.sin(a)*0.25, 0.65, Math.cos(a)*0.25], rot:[Math.cos(a)*0.35, 0, -Math.sin(a)*0.35], color:0x222222 })),
        { geo:new T.BoxGeometry(0.4, 0.3, 0.5), pos:[0, 1.45, 0], color:0x2a2a2e },
        { geo:new T.CylinderGeometry(0.1, 0.12, 0.2, 10), pos:[0, 1.45, 0.3], rot:[Math.PI/2, 0, 0], color:0x101418 },
      ])), vc('tripod'));
      tri.position.set(ex + 0.4, 0, 1.5); g.add(tri);
      flash.position.set(ex + 0.4, 1.6, 1.8); g.add(flash);
      return g;
    }
    if(R.style === 'fr'){
      // radar "tourelle" : colonne haute avec bandes reflechissantes
      const col = new T.Mesh(M('geo:tourelle', ()=>S().merge(T, [
        { geo:new T.CylinderGeometry(0.32, 0.36, 4.2, 14), pos:[0, 2.1, 0], color:0x9aa0a6 },
        { geo:new T.CylinderGeometry(0.33, 0.33, 0.25, 14), pos:[0, 1.2, 0], color:0xf2f2f2 },
        { geo:new T.CylinderGeometry(0.33, 0.33, 0.25, 14), pos:[0, 2.0, 0], color:0xf2f2f2 },
        { geo:new T.BoxGeometry(0.72, 0.72, 0.72), pos:[0, 4.45, 0], color:0x3a3e44 },
        { geo:new T.BoxGeometry(0.5, 0.2, 0.05), pos:[0, 4.55, 0.37], color:0x0a0e12 },
      ])), vc('tourelle'));
      col.position.set(ex, 0, 0); g.add(col);
      flash.position.set(ex, 4.3, 0.5); g.add(flash);
    } else {
      const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 3.6, 8), grey); pole.position.set(ex, 1.8, 0); g.add(pole);
      const boxCol = R.style === 'it' ? 0xe86a10 : R.style === 'ch' ? 0x5a5e64 : 0xe8e8e8;
      const cab = new T.Mesh(M('geo:radarCab' + boxCol, ()=>S().merge(T, [
        { geo:new T.BoxGeometry(0.8, 1.1, 0.7), pos:[0, 0, 0], color:boxCol },
        { geo:new T.BoxGeometry(0.84, 0.12, 0.74), pos:[0, 0.6, 0], color:0x2a2e34 },
        { geo:new T.CylinderGeometry(0.16, 0.16, 0.06, 14), pos:[0, 0.1, 0.36], rot:[Math.PI/2, 0, 0], color:0x0a0e12 },
        { geo:new T.BoxGeometry(0.42, 0.18, 0.04), pos:[0, -0.3, 0.36], color:0xfff4e0 },
      ])), vc('radarCab'));
      cab.position.set(ex, 4.0, 0); g.add(cab);
      flash.position.set(ex, 3.7, 0.5); g.add(flash);
    }
    // panneaux d'annonce a 400 et 200 + limitation juste avant
    const texts = { fr:['CONTRÔLE', 'RADAR'], it:['CONTROLLO', 'ELETTRONICO'], ch:['RADAR', 'CONTRÔLE'], us:['RADAR', 'ENFORCED'] }[R.style || 'fr'];
    [[400, '400 m'], [200, '200 m']].forEach(([dz, dist])=>{
      const w = new T.Group();
      const post = new T.Mesh(M('geo:warnPost', ()=>new T.CylinderGeometry(0.06, 0.06, 3, 6)), grey); post.position.y = 1.5; w.add(post);
      const warn = new T.Mesh(M('geo:warnPlate', ()=>new T.PlaneGeometry(1.7, 1.06)), M('mat:warn:' + R.style + dist, ()=>warnSignTex(T, texts[0] + ' ' + texts[1], dist, us ? '#f4f4f0' : '#1f4fa8', us ? '#111' : '#ffffff'))); warn.position.set(0, 2.6, 0.05); w.add(warn);
      const lim = new T.Mesh(M('geo:limPlate' + us, ()=>new T.PlaneGeometry(us ? 0.9 : 1.0, us ? 1.12 : 1.0)), limitSignTex(T, R.limit, us)); lim.position.set(0, 1.5, 0.06); w.add(lim);
      w.position.set(ex + 0.2, 0, dz); g.add(w);
    });
    return g;
  }
  // Voiture de police : caisse aux couleurs du pays + rampe de gyrophares
  // (sprites rouge/bleu nommes pour clignoter)
  function policeCar(T, style){
    const liv = { fr:[0xf2f2f2, 0x1a3a8a], it:[0x1a3a8a, 0xf2f2f2], ch:[0xf2f2f2, 0xff8a1a], us:[0x151515, 0xf2f2f2] }[style] || [0xf2f2f2, 0x1a3a8a];
    const g = new T.Group();
    const body = new T.Mesh(M('geo:police:' + style, ()=>S().merge(T, [
      { geo:new T.BoxGeometry(1.9, 0.66, 4.5), pos:[0, 0.66, 0], color:liv[0] },
      { geo:new T.BoxGeometry(1.94, 0.22, 4.52), pos:[0, 0.72, 0], color:liv[1] },
      { geo:new T.BoxGeometry(1.7, 0.6, 2.3), pos:[0, 1.26, 0.2], color:0x1e2630 },
      { geo:new T.BoxGeometry(1.3, 0.14, 0.4), pos:[0, 1.62, 0.2], color:0x222222 },
      ...[[-0.9, -1.45], [0.9, -1.45], [-0.9, 1.45], [0.9, 1.45]].map(([x, z])=>({ geo:new T.CylinderGeometry(0.36, 0.36, 0.28, 12), pos:[x, 0.36, z], rot:[0, 0, Math.PI/2], color:0x111111 })),
    ])), vcStd('police', 0.3));
    g.add(body);
    const red = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xff2020, transparent:true, blending:T.AdditiveBlending, depthWrite:false })); red.name = 'sirenRed'; red.scale.set(1.8, 1.8, 1); red.position.set(-0.4, 1.75, 0.2); g.add(red);
    const blue = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0x2a6aff, transparent:true, blending:T.AdditiveBlending, depthWrite:false })); blue.name = 'sirenBlue'; blue.scale.set(1.8, 1.8, 1); blue.position.set(0.4, 1.75, 0.2); g.add(blue);
    const head = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xfff4e0, transparent:true, opacity:.7, blending:T.AdditiveBlending, depthWrite:false })); head.scale.set(2.4, 1.2, 1); head.position.set(0, 0.7, -2.3); g.add(head);
    g.rotation.y = 0; // meme sens que le joueur (on la voit dans le retro / derriere)
    return g;
  }

  // ---------- Boutique de la station (interieur 3D) ----------
  // Piece vue depuis l'entree, face a la caisse : comptoir avec caissier(e),
  // caisse enregistreuse, terminal de carte, machine a cafe et vitrine chaude,
  // meuble a produits derriere le comptoir, frigos a boissons eclaires sur le
  // cote, petites gondoles basses, carrelage, dalles lumineuses, affiches.
  // Repere local : camera en (-1.8, 1.65, 0.3), regard vers +x (le comptoir).
  function shopInterior(T, route){
    const g = new T.Group();
    const W = 7.2, H = 3.2, D = 11.6;
    const brandCol = route.fuelColor || 0x1a7a3a;
    const floorTex = M('tex:shopFloor2', ()=>{ const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){ x.fillStyle = (i + j) % 2 ? '#e2ded6' : '#cfcac0'; x.fillRect(i*32, j*32, 32, 32); } x.strokeStyle = 'rgba(0,0,0,.08)'; for(let i = 0; i <= 4; i++){ x.beginPath(); x.moveTo(i*32, 0); x.lineTo(i*32, 128); x.moveTo(0, i*32); x.lineTo(128, i*32); x.stroke(); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 6); t.encoding = T.sRGBEncoding; return t; });
    const wall = M('std:shopWall2', ()=>new T.MeshStandardMaterial({ color:0xd8d6d0, roughness:0.85, side:T.BackSide, emissive:0x3a3a36 }));
    const ceil = M('std:shopCeil2', ()=>new T.MeshStandardMaterial({ color:0xf2f2f0, roughness:0.9, side:T.BackSide, emissive:0x4a4a48 }));
    const floor = M('std:shopFloor2', ()=>new T.MeshStandardMaterial({ map:floorTex, roughness:0.3, metalness:0.1, side:T.BackSide, emissive:0x2a2a28 }));
    // (face avant absente : c'est la vitrine, on voit dehors et on entre par la porte)
    const none = M('bas:none', ()=>{ const m = new T.MeshBasicMaterial(); m.visible = false; return m; });
    const room = new T.Mesh(new T.BoxGeometry(W, H, D), [wall, none, ceil, floor, wall, wall]);
    room.position.set(0, H/2 + 0.05, 0); g.add(room);
    // bandeau a la couleur de l'enseigne en haut des murs
    const band = M('bas:shopBand' + brandCol, ()=>new T.MeshBasicMaterial({ color:brandCol }));
    [[W/2 - 0.03, 0, -Math.PI/2, D], [0, -D/2 + 0.03, 0, W], [0, D/2 - 0.03, Math.PI, W]].forEach(([x, z, ry, len])=>{ const b = new T.Mesh(new T.PlaneGeometry(len, 0.35), band); b.position.set(x, H - 0.35, z); b.rotation.y = ry; g.add(b); });
    // dalles lumineuses au plafond
    const panel = M('bas:shopPanel', ()=>new T.MeshBasicMaterial({ color:0xfffdf4 }));
    [[-1.5, -3], [-1.5, 0], [-1.5, 3], [1.5, -3], [1.5, 0], [1.5, 3]].forEach(([x, z])=>{ const p = new T.Mesh(M('geo:ceilPanel', ()=>new T.BoxGeometry(1.2, 0.04, 1.2)), panel); p.position.set(x, H + 0.02, z); g.add(p); });
    // comptoir (face a la camera), plan de travail clair, facade a la couleur de l'enseigne
    const counter = new T.Mesh(M('geo:counter2:' + brandCol, ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.9, 1.0, 4.6), pos:[0, 0.5, 0], color:brandCol },
      { geo:new T.BoxGeometry(1.05, 0.06, 4.8), pos:[0, 1.03, 0], color:0xe8e4dc },
      { geo:new T.BoxGeometry(0.02, 0.12, 4.6), pos:[-0.46, 0.9, 0], color:0xf2f2f2 },
    ])), vc('counter2'));
    counter.position.set(1.9, 0.05, 0.3); g.add(counter);
    // caisse enregistreuse + ecran client, terminal de carte, bonbons
    const reg = new T.Mesh(M('geo:register', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.45, 0.14, 0.5), pos:[0, 0.07, 0], color:0x2a2a2e },
      { geo:new T.BoxGeometry(0.06, 0.34, 0.42), pos:[0.1, 0.3, 0], rot:[0, 0, 0.25], color:0x1a1a1e },
      { geo:new T.BoxGeometry(0.02, 0.26, 0.36), pos:[0.06, 0.3, 0], rot:[0, 0, 0.25], color:0x3a8aff },
    ])), vc('register'));
    reg.position.set(1.95, 1.08, 1.0); g.add(reg);
    const tpe = new T.Mesh(M('geo:tpe', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.16, 0.05, 0.1), pos:[0, 0.025, 0], color:0x222226 },
      { geo:new T.BoxGeometry(0.1, 0.18, 0.08), pos:[-0.02, 0.1, 0], rot:[0, 0, 0.35], color:0x1a1a1e },
      { geo:new T.BoxGeometry(0.02, 0.07, 0.06), pos:[-0.05, 0.14, 0], rot:[0, 0, 0.35], color:0x6dff9e },
    ])), vc('tpe'));
    tpe.position.set(1.55, 1.08, 0.4); g.add(tpe);
    const candy = new T.Mesh(M('geo:candy', ()=>{ const parts = []; for(let k = 0; k < 12; k++) parts.push({ geo:new T.BoxGeometry(0.08, 0.14, 0.05), pos:[(k % 3) * 0.1, 0.07, Math.floor(k / 3) * 0.08], color:[0xd8202a, 0xffc21a, 0x1f6ad8, 0x2fae4a, 0xff7a1a, 0x8a3ad8][k % 6] }); return S().merge(T, parts); }), vc('candy'));
    candy.position.set(1.5, 1.08, -1.2); g.add(candy);
    // machine a cafe + vitrine chaude au bout du comptoir
    const coffee = new T.Mesh(M('geo:coffeeMachine', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.5, 0.7, 0.55), pos:[0, 0.35, 0], color:0x2a2a2e },
      { geo:new T.BoxGeometry(0.52, 0.12, 0.57), pos:[0, 0.72, 0], color:0xb0b4ba },
      { geo:new T.BoxGeometry(0.02, 0.22, 0.3), pos:[-0.26, 0.45, 0], color:0x6dff9e },
    ])), vc('coffee'));
    coffee.position.set(2.0, 1.08, -2.1); g.add(coffee);
    const hot = new T.Mesh(M('geo:hotCase', ()=>S().merge(T, [ { geo:new T.BoxGeometry(0.6, 0.45, 0.9), pos:[0, 0.22, 0], color:0xffd08a }, { geo:new T.BoxGeometry(0.62, 0.05, 0.92), pos:[0, 0.47, 0], color:0x9aa0a6 } ])), vc('hotcase'));
    hot.position.set(1.95, 1.08, 2.1); g.add(hot);
    // caissier(e) derriere le comptoir (polo aux couleurs de l'enseigne)
    const clerk = new T.Group();
    const body = new T.Mesh(M('geo:clerkBody', ()=>new T.CylinderGeometry(0.22, 0.26, 0.75, 10)), M('std:clerkShirt' + brandCol, ()=>new T.MeshStandardMaterial({ color:brandCol, roughness:0.8 }))); body.position.y = 1.35; clerk.add(body);
    const head = new T.Mesh(M('geo:clerkHead', ()=>new T.SphereGeometry(0.15, 14, 10)), M('std:skin', ()=>new T.MeshStandardMaterial({ color:0xe0b090, roughness:0.7 }))); head.position.y = 1.9; clerk.add(head);
    const hair = new T.Mesh(M('geo:clerkHair', ()=>new T.SphereGeometry(0.155, 14, 10, 0, Math.PI*2, 0, Math.PI/2)), M('std:hair', ()=>new T.MeshStandardMaterial({ color:0x3a2418, roughness:0.9 }))); hair.position.y = 1.93; clerk.add(hair);
    [-0.27, 0.27].forEach(z=>{ const arm = new T.Mesh(M('geo:clerkArm', ()=>new T.CylinderGeometry(0.06, 0.06, 0.55, 8)), M('std:clerkShirt' + brandCol, ()=>null)); arm.position.set(-0.08, 1.3, z); arm.rotation.z = 0.35; clerk.add(arm); });
    clerk.position.set(2.7, 0.05, 0.6); g.add(clerk);
    g.userData.clerk = clerk;
    // meuble mural derriere le comptoir, rempli de produits
    const prodCols = [0xd8202a, 0xffc21a, 0x1f6ad8, 0x2fae4a, 0xff7a1a, 0x8a3ad8, 0xf2f2f2, 0x6a3a1a];
    const back = new T.Mesh(M('geo:backShelf', ()=>{
      const parts = [{ geo:new T.BoxGeometry(0.45, 2.3, 5.2), pos:[0, 1.15, 0], color:0x4a4e54 }];
      for(let lv = 0; lv < 5; lv++){ parts.push({ geo:new T.BoxGeometry(0.47, 0.03, 5.2), pos:[0, 0.3 + lv * 0.45, 0], color:0x9aa0a6 }); for(let k = 0; k < 20; k++){ const h = 0.14 + ((k + lv) % 4) * 0.04; parts.push({ geo:new T.BoxGeometry(0.16, h, 0.18), pos:[-0.12, 0.32 + lv * 0.45 + h/2, -2.45 + k * 0.26], color:prodCols[(k * 3 + lv) % prodCols.length] }); } }
      return S().merge(T, parts);
    }), vc('backShelf'));
    back.position.set(W/2 - 0.3, 0.05, 0.3); g.add(back);
    // frigos a boissons eclaires sur le mur de gauche
    const fridge = new T.Mesh(M('geo:fridge2', ()=>{
      const parts = [{ geo:new T.BoxGeometry(3.6, 2.3, 0.7), pos:[0, 1.15, 0], color:0x2a2e34 }];
      for(let lv = 0; lv < 5; lv++) for(let k = 0; k < 16; k++) parts.push({ geo:new T.CylinderGeometry(0.05, 0.05, 0.26, 6), pos:[-1.6 + k * 0.21, 0.35 + lv * 0.42, 0.05], color:prodCols[(k + lv * 2) % prodCols.length] });
      return S().merge(T, parts);
    }), vc('fridge2'));
    fridge.position.set(-0.4, 0.05, -D/2 + 0.4); g.add(fridge);
    const glow = new T.Mesh(new T.PlaneGeometry(3.5, 2.1), M('mat:fridgeGlow', ()=>new T.MeshBasicMaterial({ color:0xbfe0ff, transparent:true, opacity:.25, blending:T.AdditiveBlending, depthWrite:false })));
    glow.position.set(-0.4, 1.2, -D/2 + 0.78); g.add(glow);
    // gondoles basses de part et d'autre de l'allee (ne cachent pas le comptoir)
    const low = M('geo:lowGondola', ()=>{
      const parts = [{ geo:new T.BoxGeometry(2.2, 1.0, 0.7), pos:[0, 0.5, 0], color:0x5a5e64 }];
      for(let lv = 0; lv < 2; lv++) for(let k = 0; k < 10; k++) [-1, 1].forEach(s=>{ const h = 0.16 + (k % 3) * 0.04; parts.push({ geo:new T.BoxGeometry(0.18, h, 0.16), pos:[-0.95 + k * 0.21, 0.25 + lv * 0.42 + h/2, s * 0.3], color:prodCols[(k * 2 + lv + (s > 0 ? 3 : 0)) % prodCols.length] }); });
      return S().merge(T, parts);
    });
    [[-0.6, -3.2], [-0.6, 3.6]].forEach(([x, z])=>{ const m = new T.Mesh(low, vc('lowGondola')); m.position.set(x, 0.05, z); g.add(m); });
    // affiches : offre du moment + nom de la station
    const poster = (txt, sub, col, x, y, z, ry, w)=>{ const c = document.createElement('canvas'); c.width = 256; c.height = 128; const k = c.getContext('2d'); k.fillStyle = col; k.fillRect(0, 0, 256, 128); k.fillStyle = '#fff'; k.textAlign = 'center'; k.font = '900 40px Arial'; k.fillText(txt, 128, 58); k.font = '700 22px Arial'; k.fillText(sub, 128, 98); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; const m = new T.Mesh(new T.PlaneGeometry(w || 1.6, (w || 1.6) / 2), new T.MeshBasicMaterial({ map:t, toneMapped:false })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
    const items = shopItems(route), cur = route.currency || '€';
    const priceTxt = (v)=> cur === '$' ? '$' + v.toFixed(2) : cur === '¥' ? '¥' + Math.round(v) : v.toFixed(2).replace('.', ',') + ' ' + cur;
    poster(items[0].label.toUpperCase(), priceTxt(items[0].price), '#b01818', W/2 - 0.55, 2.55, -1.6, -Math.PI/2, 1.3);
    poster(items[1].label.split(' ')[0].toUpperCase(), priceTxt(items[1].price), '#1f6ad8', W/2 - 0.55, 2.55, 2.2, -Math.PI/2, 1.3);
    return g;
  }
  // Articles de la boutique, prix reels par pays (monnaie de la route)
  function shopItems(route){
    const id = route.id, cur = route.currency || '€';
    if(id === 'autostrada') return [
      { ico:'☕', label:'Caffè espresso', price:1.40, effect:'coffee' }, { ico:'🥪', label:'Panino Camogli', price:6.90, effect:'food', pts:220 },
      { ico:'🍕', label:'Trancio di pizza', price:4.50, effect:'food', pts:150 }, { ico:'💧', label:'Acqua minerale', price:1.50, effect:'drink' }, { ico:'🍦', label:'Gelato', price:3.00, effect:'food', pts:100 } ];
    if(cur === 'CHF') return [
      { ico:'☕', label:'Kaffee', price:4.60, effect:'coffee' }, { ico:'🥪', label:'Sandwich jambon', price:7.90, effect:'food', pts:220 },
      { ico:'🥨', label:'Bretzel', price:3.20, effect:'food', pts:90 }, { ico:'🥤', label:'Rivella', price:3.50, effect:'drink' }, { ico:'🍫', label:'Chocolat suisse', price:2.90, effect:'food', pts:90 } ];
    if(cur === '$') return [
      { ico:'☕', label:'Coffee', price:2.49, effect:'coffee' }, { ico:'🍔', label:'Cheeseburger', price:7.99, effect:'food', pts:250 },
      { ico:'🍩', label:'Donut', price:1.99, effect:'food', pts:80 }, { ico:'🥤', label:'Soda', price:2.29, effect:'drink' }, { ico:'🌭', label:'Hot dog', price:3.49, effect:'food', pts:120 } ];
    if(cur === '¥') return [
      { ico:'☕', label:'缶コーヒー', price:150, effect:'coffee' }, { ico:'🍙', label:'おにぎり', price:180, effect:'food', pts:90 },
      { ico:'🍱', label:'弁当', price:590, effect:'food', pts:250 }, { ico:'🍵', label:'お茶', price:160, effect:'drink' }, { ico:'🍜', label:'カップ麺', price:230, effect:'food', pts:120 } ];
    return [
      { ico:'☕', label:'Café', price:2.50, effect:'coffee' }, { ico:'🥖', label:'Sandwich jambon-beurre', price:5.90, effect:'food', pts:200 },
      { ico:'🥐', label:'Croissant', price:1.90, effect:'food', pts:80 }, { ico:'🥤', label:'Canette de soda', price:2.80, effect:'drink' }, { ico:'🍫', label:'Barre chocolatée', price:1.60, effect:'food', pts:60 } ];
  }

  DG.StopKit = { tollPlaza, fuelStation, speedCamera, policeCar, shopItems };

  // ---------- Route 66 ----------
  function saguaroGeo(T){
    return M('geo:saguaro', ()=>{
      const c = 0x1c3612, c2 = 0x244418;
      return S().merge(T, [
        { geo:new T.CylinderGeometry(0.32, 0.36, 5.2, 8), pos:[0, 2.6, 0], color:c },
        { geo:new T.SphereGeometry(0.32, 8, 6), pos:[0, 5.2, 0], color:c2 },
        { geo:new T.CylinderGeometry(0.2, 0.22, 1.2, 7), pos:[0.62, 2.2, 0], rot:[0, 0, Math.PI/2], color:c },
        { geo:new T.CylinderGeometry(0.2, 0.2, 1.8, 7), pos:[1.2, 3.0, 0], color:c2 },
        { geo:new T.SphereGeometry(0.2, 7, 5), pos:[1.2, 3.9, 0], color:c2 },
        { geo:new T.CylinderGeometry(0.18, 0.2, 1.0, 7), pos:[-0.55, 3.1, 0], rot:[0, 0, Math.PI/2], color:c },
        { geo:new T.CylinderGeometry(0.18, 0.18, 1.3, 7), pos:[-1.0, 3.7, 0], color:c2 },
        { geo:new T.SphereGeometry(0.18, 7, 5), pos:[-1.0, 4.35, 0], color:c2 },
      ]);
    });
  }
  // Blason "Route 66" : peint sur la route (blanc) ou panneau (blanc a bord noir)
  function shield66Tex(T, painted){
    return M('tex:shield66:' + painted, ()=>{
      const c = document.createElement('canvas'); c.width = 128; c.height = 150; const x = c.getContext('2d');
      x.beginPath(); x.moveTo(8, 10); x.lineTo(120, 10); x.lineTo(118, 70); x.quadraticCurveTo(110, 125, 64, 145); x.quadraticCurveTo(18, 125, 10, 70); x.closePath();
      x.fillStyle = painted ? 'rgba(240,238,228,.9)' : '#f4f2ea'; x.fill();
      if(!painted){ x.lineWidth = 6; x.strokeStyle = '#111'; x.stroke(); }
      x.fillStyle = painted ? 'rgba(20,20,20,.85)' : '#111'; x.textAlign = 'center';
      x.font = '900 18px Arial'; x.fillText('ROUTE', 64, 36); x.fillText('US', 64, 56);
      x.font = '900 60px Arial'; x.fillText('66', 64, 112);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
    });
  }
  function neonText(T, text, color, w, h){
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d');
    x.fillStyle = '#1a1210'; x.fillRect(0, 0, c.width, c.height);
    x.font = '900 ' + Math.round(c.height * 0.62) + 'px "Saira Condensed", Arial Narrow, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 24; x.fillStyle = color; x.fillText(text, 256, c.height/2 + 4);
    x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(text, 256, c.height/2 + 4);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  function motel(T){
    const g = new T.Group();
    const body = new T.Mesh(houseGeo(T, 'motel', { w:22, d:7, h:3.2, wall:0xc88a5a, roof:0x6a3a24, shutter:0x2a5a6a, chimney:false, glass:0x3a2a1a, pitch:0.22 }), vc('house'));
    g.add(body);
    const pole = new T.Mesh(new T.BoxGeometry(0.4, 9, 0.4), M('std:signMetal', ()=>new T.MeshStandardMaterial({ color:0x7a7e84, metalness:0.7, roughness:0.4 }))); pole.position.set(6, 4.5, 11); g.add(pole);
    const sign = new T.Mesh(new T.PlaneGeometry(5.5, 2.2), new T.MeshBasicMaterial({ map:neonText(T, 'MOTEL', '#ff3a3a', 5.5, 2.2), toneMapped:false })); sign.position.set(6, 8.4, 11.25); sign.rotation.y = 0.5; g.add(sign);
    const vac = new T.Mesh(new T.PlaneGeometry(3.6, 0.9), new T.MeshBasicMaterial({ map:neonText(T, 'VACANCY', '#3dffb0', 3.6, 0.9), toneMapped:false })); vac.position.set(6, 6.7, 11.25); vac.rotation.y = 0.5; g.add(vac);
    const halo = new T.Sprite(new T.SpriteMaterial({ map:S().glow(T), color:0xff4a3a, transparent:true, opacity:.35, blending:T.AdditiveBlending, depthWrite:false })); halo.scale.set(9, 5, 1); halo.position.set(6, 8.2, 11.6); g.add(halo);
    g.userData.tick = (t)=>{ vac.material.color.setScalar((t % 2.2) < 0.25 ? 0.25 : 1); };
    return g;
  }
  function diner(T){
    const g = new T.Group();
    const chrome = M('std:dinerChrome', ()=>new T.MeshStandardMaterial({ color:0xd8dde2, metalness:0.95, roughness:0.18 }));
    const body = new T.Mesh(new T.CylinderGeometry(3.2, 3.2, 16, 20, 1, false, 0, Math.PI), chrome); body.rotation.z = Math.PI/2; body.rotation.y = Math.PI/2; body.position.set(0, 0.4, 0); g.add(body);
    const stripe = new T.Mesh(new T.BoxGeometry(6.5, 0.5, 16.1), M('std:dinerRed', ()=>new T.MeshStandardMaterial({ color:0xb01818, roughness:0.4 }))); stripe.position.set(0, 1.2, 0); g.add(stripe);
    const win = new T.Mesh(new T.BoxGeometry(6.52, 1.1, 14), M('std:dinerWin', ()=>new T.MeshStandardMaterial({ color:0x2a1e14, emissive:0xffb060, emissiveIntensity:0.5 }))); win.position.set(0, 2.2, 0); g.add(win);
    const sign = new T.Mesh(new T.PlaneGeometry(6, 1.8), new T.MeshBasicMaterial({ map:neonText(T, 'DINER', '#3dd6ff', 6, 1.8), toneMapped:false })); sign.position.set(-3.3, 4.6, 0); sign.rotation.y = -Math.PI/2; g.add(sign);
    return g;
  }
  function oldGasStation(T){
    const g = new T.Group();
    const shop = new T.Mesh(houseGeo(T, 'gas66', { w:8, d:6, h:3.6, wall:0xe8e0cc, roof:0xb01818, shutter:null, chimney:false, pitch:0.3 }), vc('house')); shop.position.x = -3; g.add(shop);
    const canopy = new T.Mesh(new T.BoxGeometry(6, 0.4, 9), M('std:gasCanopy', ()=>new T.MeshStandardMaterial({ color:0xe8e4d8, roughness:0.6 }))); canopy.position.set(4, 4.2, 0); g.add(canopy);
    [[2, -3.5], [6, -3.5], [2, 3.5], [6, 3.5]].forEach(([x, z])=>{ const p = new T.Mesh(new T.BoxGeometry(0.25, 4.2, 0.25), M('std:gasPost', ()=>new T.MeshStandardMaterial({ color:0xb01818 }))); p.position.set(x, 2.1, z); g.add(p); });
    [-1.5, 1.5].forEach(z=>{ const pump = new T.Mesh(M('geo:pump66', ()=>S().merge(T, [ { geo:new T.BoxGeometry(0.6, 1.7, 0.5), pos:[0, 0.85, 0], color:0xb01818 }, { geo:new T.SphereGeometry(0.3, 10, 8), pos:[0, 1.95, 0], color:0xf4f2ea } ])), vc('pump')); pump.position.set(4, 0, z); g.add(pump); });
    const sign = new T.Mesh(new T.PlaneGeometry(4.5, 1.4), new T.MeshBasicMaterial({ map:neonText(T, 'GAS · EAT', '#ffcc33', 4.5, 1.4), toneMapped:false })); sign.position.set(4, 5.3, 4.6); g.add(sign);
    return g;
  }
  function billboard66(T){
    const g = new T.Group();
    const wood = M('lam:wood', ()=>new T.MeshLambertMaterial({ color:0x4a3322 }));
    [-3, 3].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.3, 7, 0.3), wood); p.position.set(x, 3.5, 0); g.add(p); });
    const board = new T.Mesh(new T.PlaneGeometry(9, 3.6), new T.MeshLambertMaterial({ map:(()=>{
      const c = document.createElement('canvas'); c.width = 512; c.height = 205; const x = c.getContext('2d');
      x.fillStyle = '#f2e6c8'; x.fillRect(0, 0, 512, 205); x.fillStyle = '#b01818'; x.fillRect(0, 0, 512, 60);
      x.fillStyle = '#fff'; x.font = '900 40px Arial'; x.textAlign = 'center'; x.fillText('ROUTE 66 GIFT SHOP', 256, 44);
      x.fillStyle = '#2a1a10'; x.font = '900 34px Arial'; x.fillText('SOUVENIRS · COLD DRINKS', 256, 112); x.font = '700 28px Arial'; x.fillText('NEXT EXIT  →  2 MILES', 256, 168);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })() }));
    board.position.set(0, 5.4, 0.2); board.rotation.y = -0.35; g.add(board);
    return g;
  }


  // Panneaux d'autoroute : panneau "directions" (jusqu'a 3 destinations avec
  // distances alignees a droite, fleche) et panneau "sortie" dans la langue
  // du pays (USCITA / SORTIE / AUSFAHRT) avec la distance en metres a
  // l'approche. Peints d'apres le trajet reel de la route en cours.
  const EXIT_WORD = { it:'USCITA', fr:'SORTIE', de:'AUSFAHRT' };
  const TOLL_WORD = { it:'CASELLO', fr:'PÉAGE', de:'ZOLL' };
  function motorwaySignTex(T, bg, rows, arrow, header){
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#f4f6f8'; x.lineWidth = 7; x.strokeRect(10, 10, 492, 236);
    x.fillStyle = '#f4f6f8'; x.textBaseline = 'middle';
    let y0 = 58;
    if(header){ x.fillStyle = '#f4f6f8'; x.fillRect(26, 26, 150, 42); x.fillStyle = bg; x.font = '900 28px Arial'; x.textAlign = 'center'; x.fillText(header, 101, 48); x.fillStyle = '#f4f6f8'; y0 = 100; }
    const lh = rows.length > 2 ? 52 : 64;
    rows.forEach((r, k)=>{
      const y = y0 + k * lh;
      x.textAlign = 'left'; x.font = '800 ' + (rows.length > 2 ? 40 : 48) + 'px "Saira Condensed", Arial Narrow, Arial';
      x.fillText(r[0], 34, y);
      x.textAlign = 'right'; x.font = '700 ' + (rows.length > 2 ? 34 : 40) + 'px Arial'; x.fillText(r[1], arrow ? 402 : 480, y);
    });
    if(arrow){ x.textAlign = 'center'; x.font = '900 110px Arial'; x.fillText(arrow, 452, 136); }
    const t = new T.CanvasTexture(c); t.anisotropy = 4; t.encoding = T.sRGBEncoding; return t;
  }
  function journeyDefault(route){
    const j = route.journey; if(!j) return null;
    return { road:j.road, routeId:route.id, lang:j.lang || 'fr', to:j.to, next:j.stops[0].name, kmNext:j.stops[0].km, kmTotal:j.stops[j.stops.length - 1].km, kmDone:0, toll:!!j.stops[0].toll,
      upcoming:j.stops.slice(0, 3).map(s=>({ name:s.name, km:s.km, toll:!!s.toll })) };
  }
  function shortName(n){ return n.replace(/^(Casello di |Barriera di |Péage de |Péage du )/, ''); }
  function kmTxt(k){ return k < 2 ? Math.max(100, Math.round(k * 10) * 100) + ' m' : Math.round(k) + ' km'; }
  // Portique a 2 panneaux, repeint quand le decor boucle ou quand le trajet change
  function paintGantry(T, signs, bg, route){
    let j = DG._journey; if(!j || j.routeId !== route.id) j = journeyDefault(route); if(!j) return;
    const lang = j.lang || 'fr';
    const dest = [[j.to.toUpperCase(), Math.round(j.kmTotal - j.kmDone) + ' km']];
    (j.upcoming || []).filter(u=>u.name !== j.to).slice(0, 2).forEach(u=>dest.push([shortName(u.name).toUpperCase(), Math.round(u.km) + ' km']));
    const tex = [motorwaySignTex(T, bg, dest.slice(0, 3), '↑', null),
      motorwaySignTex(T, bg, [[shortName(j.next).toUpperCase(), kmTxt(j.kmNext)]], '↗', (j.toll ? TOLL_WORD : EXIT_WORD)[lang])];
    signs.forEach((sg, k)=>{ if(sg.material.map) sg.material.map.dispose(); sg.material.map = tex[k]; sg.material.needsUpdate = true; });
  }
  function gantryTick(T, g, signs, bg, route){
    let lastZ = 0, key = '';
    g.userData.tick = ()=>{
      const j = DG._journey, k = j && j.routeId === route.id ? j.next : 'default';
      if(g.position.z < lastZ - 20 || k !== key){ key = k; paintGantry(T, signs, bg, route); }
      lastZ = g.position.z;
    };
  }

  // ---------- Outils autoroute (A7 France, A2 Suisse) ----------
  // Terre-plein central gazonne avec double glissiere, chaussee opposee et
  // trafic qui croise (voitures simplifiees, vues de loin).
  function motorwayOpposite(T, ctx, cols){
    ctx.add(longStrip(T, 2.2, 0.04, 300, 0x2e4a22, -6.0, 0.02, M('lam:median', ()=>new T.MeshLambertMaterial({ color:0x2e4a22 }))));
    const rail = M('std:railMedian', ()=>new T.MeshStandardMaterial({ color:0x8a949c, metalness:0.75, roughness:0.35 }));
    [-5.0, -7.0].forEach(x=>ctx.add(longStrip(T, 0.08, 0.3, 300, 0x8a949c, x, 0.62, rail)));
    ctx.add(longStrip(T, 8.4, 0.02, 300, 0x2a2a2e, -11.3, 0.005, M('std:oppRoad', ()=>new T.MeshStandardMaterial({ color:0x2e2e32, roughness:0.8 }))));
    [-7.4, -15.2].forEach(x=>ctx.add(longStrip(T, 0.14, 0.02, 300, 0xf4f2ea, x, 0.02, M('bas:line', ()=>new T.MeshBasicMaterial({ color:0xe8e6de })))));
    const opp = [];
    for(let k = 0; k < 8; k++){
      const car = ctx.add(new T.Mesh(simpleCarGeo(T, 'c' + (k % cols.length), cols[k % cols.length]), vcStd('opp', 0.35)));
      car.rotation.y = Math.PI; car.position.set(k % 2 ? -9.4 : -13.2, 0, -30 - k*26); car.castShadow = true;
      opp.push({ car, v:30 + Math.random()*14 });
    }
    ctx.tick((dt)=>{
      const sc = ctx.scroll();
      for(const o of opp){ o.car.position.z += sc + o.v * dt; if(o.car.position.z > 30){ o.car.position.z = -190 - Math.random()*40; o.v = 30 + Math.random()*14; } }
    });
  }
  // Portique a 2 panneaux dont le texte suit le trajet reel (destination +
  // prochaine sortie), repeint a chaque passage (le decor boucle).
  function journeyGantry(T, z, bg, wrapDist, route){
    const g = new T.Group();
    const steel = M('std:gantryIt', ()=>new T.MeshStandardMaterial({ color:0x8a9098, metalness:0.7, roughness:0.4 }));
    [-5.4, 5.4].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.3, 7.2, 0.3), steel); p.position.set(x, 3.6, 0); g.add(p); });
    const beam = new T.Mesh(new T.BoxGeometry(11.2, 0.4, 0.4), steel); beam.position.set(0, 7.0, 0); g.add(beam);
    const signs = [-2.7, 2.7].map(x=>{ const sg = new T.Mesh(new T.PlaneGeometry(5, 2.5), new T.MeshLambertMaterial({ color:0xffffff })); sg.position.set(x, 5.8, 0.25); g.add(sg); return sg; });
    gantryTick(T, g, signs, bg, route);
    g.position.set(0, 0, z); g.userData.wrapDist = wrapDist;
    return g;
  }
  // Tour de refroidissement (centrale du Tricastin, vallee du Rhone) : profil
  // hyperbolique tourne + panache de vapeur qui monte et se dissipe.
  function coolingTower(T, ctx, x, z, s){
    const pts = [];
    for(let i = 0; i <= 12; i++){ const t = i / 12, y = t * 26, r = 8.5 - Math.sin(t * Math.PI * 0.92) * 3.2 + t * 0.6; pts.push(new T.Vector2(r, y)); }
    const tower = ctx.add(new T.Mesh(new T.LatheGeometry(pts, 28), M('std:tower', ()=>new T.MeshStandardMaterial({ color:0x9a9890, roughness:0.95, side:T.DoubleSide }))));
    tower.position.set(x, 0, z); tower.scale.setScalar(s);
    const puffs = [];
    for(let k = 0; k < 5; k++){ const p = ctx.add(new T.Sprite(new T.SpriteMaterial({ map:S().cloud(T), color:0xf4f4f2, transparent:true, opacity:0, depthWrite:false, fog:false }))); puffs.push({ p, ph:k / 5 }); }
    ctx.tick((dt, t)=>{
      for(const q of puffs){
        const u = (t * 0.06 + q.ph) % 1;
        q.p.position.set(x + u * 18 * s, (26 + u * 40) * s, z - u * 6);
        q.p.scale.set((14 + u * 30) * s, (9 + u * 16) * s, 1);
        q.p.material.opacity = (u < 0.15 ? u / 0.15 : 1 - u) * 0.8;
      }
    });
  }
  // ---------- Suisse ----------
  function spruceGeo(T){
    return M('geo:spruce', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.14, 0.2, 1.2, 6), pos:[0, 0.6, 0], color:0x2a1c12 },
      { geo:new T.ConeGeometry(1.6, 2.6, 8), pos:[0, 2.2, 0], color:0x12281a },
      { geo:new T.ConeGeometry(1.25, 2.3, 8), pos:[0, 3.5, 0], rot:[0, 0.4, 0], color:0x163020 },
      { geo:new T.ConeGeometry(0.85, 2.0, 8), pos:[0, 4.8, 0], rot:[0, 0.9, 0], color:0x1a3624 },
      { geo:new T.ConeGeometry(0.45, 1.4, 8), pos:[0, 5.9, 0], color:0x1e3c28 },
    ]));
  }
  // Chalet : soubassement en pierre blanche, etage en bois, toit plat a
  // large debord, balcon courant avec jardinieres de geraniums rouges.
  function chaletGeo(T){
    return M('geo:chalet', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(7, 2.4, 9), pos:[0, 1.2, 0], color:0xcfcac0 },
      { geo:new T.BoxGeometry(7, 3.2, 9), pos:[0, 4.0, 0], color:0x4a2a14 },
      { geo:new T.CylinderGeometry(6.6, 6.6, 11, 3, 1), pos:[0, 6.3, 0], rot:[-Math.PI/2, 0, 0], scale:[1, 1, 0.36], color:0x2a2420 },
      { geo:new T.BoxGeometry(1.2, 0.2, 9.4), pos:[-4.0, 3.0, 0], color:0x3a200e },
      { geo:new T.BoxGeometry(0.1, 0.9, 9.4), pos:[-4.55, 3.5, 0], color:0x3a200e },
      { geo:new T.BoxGeometry(0.4, 0.35, 9.0), pos:[-4.6, 4.1, 0], color:0x9a0e0e },
      { geo:new T.BoxGeometry(0.06, 1.1, 1.0), pos:[-3.52, 4.2, -2.4], color:0x2a3440 },
      { geo:new T.BoxGeometry(0.06, 1.1, 1.0), pos:[-3.52, 4.2, 0], color:0x2a3440 },
      { geo:new T.BoxGeometry(0.06, 1.1, 1.0), pos:[-3.52, 4.2, 2.4], color:0x2a3440 },
      { geo:new T.BoxGeometry(0.06, 1.0, 0.9), pos:[-3.52, 1.2, -2], color:0x2a3440 },
      { geo:new T.BoxGeometry(0.06, 1.9, 1.0), pos:[-3.52, 0.95, 1.8], color:0x3a200e },
    ]));
  }
  // Vache (brune ou noire et blanche) qui broute dans les alpages
  function cowGeo(T, key, body, patch){
    return M('geo:cow:' + key, ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.9, 0.85, 1.9), pos:[0, 1.05, 0], color:body },
      { geo:new T.BoxGeometry(0.92, 0.5, 0.7), pos:[0, 1.2, 0.3], color:patch },
      { geo:new T.BoxGeometry(0.5, 0.5, 0.6), pos:[0, 0.9, 1.15], rot:[0.5, 0, 0], color:body },
      { geo:new T.BoxGeometry(0.3, 0.2, 0.2), pos:[0, 0.7, 1.4], color:0xd8b0a0 },
      ...[[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]].map(([x, z])=>({ geo:new T.BoxGeometry(0.16, 0.65, 0.16), pos:[x, 0.33, z], color:body })),
    ]));
  }
  // Tunnel routier realiste : voute elliptique (profil extrude), carrelage
  // clair en bas des parois, rampes lumineuses continues, ventilateurs au
  // plafond, niches SOS eclairees en vert, catadioptres, portail en beton avec
  // le nom du tunnel dans une masse rocheuse. Le plafond projette son ombre.
  function roadTunnel(T, z, len, name){
    const g = new T.Group();
    const steps = Math.round(len / 3);
    const vault = M('geo:tunnelVault:' + len, ()=>{
      const s = new T.Shape();
      s.moveTo(-8.4, 0); s.lineTo(-8.4, 2.6); s.absellipse(0, 2.6, 8.4, 5.4, Math.PI, 0, true); s.lineTo(8.4, 0); s.lineTo(7.8, 0); s.lineTo(7.8, 2.6);
      s.absellipse(0, 2.6, 7.8, 4.8, 0, Math.PI, false); s.lineTo(-7.8, 0); s.closePath();
      const geo = new T.ExtrudeGeometry(s, { depth:len, steps, bevelEnabled:false, curveSegments:18 }); geo.translate(0, 0, -len); return geo;
    });
    const tube = new T.Mesh(vault, M('std:tunnelConcrete', ()=>new T.MeshStandardMaterial({ color:0x4a4a4c, roughness:0.95, side:T.DoubleSide })));
    tube.castShadow = true; g.add(tube);
    const tile = M('std:tunnelTile', ()=>new T.MeshStandardMaterial({ color:0xc8ccce, roughness:0.35, metalness:0.1 }));
    [-7.72, 7.72].forEach(x=>{ const t = new T.Mesh(new T.BoxGeometry(0.1, 2.4, len, 1, 1, steps), tile); t.position.set(x, 1.4, -len/2); g.add(t); });
    // rampes lumineuses continues (LED chaudes) de chaque cote de la voute
    const led = M('bas:tunnelLed', ()=>new T.MeshBasicMaterial({ color:0xffd9a0 }));
    [-5.6, 5.6].forEach(x=>{ const l = new T.Mesh(new T.BoxGeometry(0.25, 0.12, len - 4, 1, 1, steps), led); l.position.set(x, 6.9, -len/2); g.add(l); });
    // ventilateurs (paires de cylindres) tous les 40
    const fanMat = M('std:jetfan', ()=>new T.MeshStandardMaterial({ color:0x9aa0a6, metalness:0.7, roughness:0.35 }));
    for(let k = 20; k < len - 10; k += 40){ [-1.4, 1.4].forEach(x=>{ const f = new T.Mesh(M('geo:jetfan', ()=>{ const c = new T.CylinderGeometry(0.55, 0.55, 3.6, 14); c.rotateX(Math.PI/2); return c; }), fanMat); f.position.set(x, 7.0, -k); g.add(f); }); }
    // niches SOS vertes + catadioptres le long des parois
    const sosMat = M('mat:sos', ()=>{ const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#0a8a3a'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.font = '900 22px Arial'; x.textAlign = 'center'; x.fillText('SOS', 32, 40); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshBasicMaterial({ map:t, toneMapped:false }); });
    for(let k = 12; k < len; k += 30){ const s = new T.Mesh(M('geo:sos', ()=>new T.PlaneGeometry(1.1, 1.1)), sosMat); s.rotation.y = -Math.PI/2; s.position.set(7.64, 1.9, -k); g.add(s); }
    const refl = M('bas:tunnelRefl', ()=>new T.MeshBasicMaterial({ color:0xffa530 }));
    for(let k = 3; k < len; k += 6){ [-7.64, 7.64].forEach(x=>{ const r = new T.Mesh(M('geo:tunnelRefl', ()=>new T.BoxGeometry(0.05, 0.12, 0.3)), refl); r.position.set(x, 0.8, -k); g.add(r); }); }
    // portail : cadre en beton + nom, dans une masse rocheuse
    const frame = new T.Mesh(M('geo:portalFrame', ()=>{
      const s = new T.Shape();
      s.moveTo(-9.6, 0); s.lineTo(-9.6, 2.6); s.absellipse(0, 2.6, 9.6, 6.6, Math.PI, 0, true); s.lineTo(9.6, 0); s.lineTo(8.4, 0); s.lineTo(8.4, 2.6);
      s.absellipse(0, 2.6, 8.4, 5.4, 0, Math.PI, false); s.lineTo(-8.4, 0); s.closePath();
      return new T.ExtrudeGeometry(s, { depth:1.2, bevelEnabled:false, curveSegments:18 });
    }), M('std:portalFrame', ()=>new T.MeshStandardMaterial({ color:0xb8b2a6, roughness:0.8 })));
    frame.position.z = 0.2; frame.castShadow = true; g.add(frame);
    const plate = new T.Mesh(new T.PlaneGeometry(6, 0.9), new T.MeshBasicMaterial({ map:(()=>{ const c = document.createElement('canvas'); c.width = 384; c.height = 58; const x = c.getContext('2d'); x.fillStyle = '#e8e4da'; x.fillRect(0, 0, 384, 58); x.fillStyle = '#1a1a1a'; x.font = '900 36px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((name || 'TUNNEL').toUpperCase(), 192, 31); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; })() }));
    plate.position.set(0, 9.3, 1.45); g.add(plate);
    const rock = M('std:portalRock', ()=>new T.MeshStandardMaterial({ color:0x5e5a52, roughness:1, flatShading:true }));
    [[-19, 10, 20, 20], [19, 10, 20, 20], [0, 15.5, 22, 9]].forEach(([x, y, w, h])=>{ const b = new T.Mesh(new T.DodecahedronGeometry(1, 1), rock); b.scale.set(w/2, h/2, 6); b.position.set(x, y - 2, -3); b.castShadow = true; g.add(b); });
    g.position.set(0, 0, z);
    return g;
  }

  // ======================================================================
  const ROUTES = [
    // ------------------------------------------------------------------
    // LAC DE NEUCHATEL : route du bord du lac en fin d'apres-midi. Lac a
    // droite (voiliers, rive opposee et Alpes enneigees au loin), a gauche la
    // voie CFF (train rouge qui croise), villages vignerons et vignes du Jura.
    {
      id:'lac-neuchatel', name:'Lac de Neuchâtel', difficulty:'Détente', spacing:9,
      currency:'CHF', coinValue:0.95, fuelPrices:[1.86, 1.97, 1.91], fuelLabels:['BLEIFREI 95', 'BLEIFREI 98', 'DIESEL'], fuelColor:0xc8101e, fuelColor2:0xf4f4f4, fuelBrand:'Station-service', fuelStationName:'Station du Littoral',
      radars:{ limit:80, style:'ch', police:'Police neuchâteloise', policeStyle:'ch', chaseOver:30, every:1500, fine:(o)=> o <= 5 ? 40 : o <= 10 ? 100 : o <= 15 ? 160 : o <= 20 ? 240 : 600 },
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
    // A1 BOLOGNA -> MILANO : autoroute de la plaine du Po, plate, en fin
    // d'apres-midi. Terre-plein beton et trafic en sens inverse, rangees de
    // peupliers, cascine en brique, champs de mais, entrepots, pylones a haute
    // tension, ligne a grande vitesse sur viaduc (Frecciarossa), Apennins au
    // sud et Alpes enneigees au loin au nord. Portiques verts avec les vraies
    // distances, et 3 barrieres de peage ou il faut s'arreter et payer.
    {
      id:'autostrada', name:'A1 Bologna → Milano', difficulty:'Intense', spacing:9, lanes:5, // 2x5 voies comme sur les troncons elargis de l'A1
      fog:0xdcd2bc, fogNear:40, fogFar:185, ground:0x5a6a2e, exposure:0.9,
      road:0x2a2a2e, stripe:0xf4f2ea, edge:0x6a6a6e, edgeEmissive:0x000000,
      sky:{ top:0x123e8a, mid:0x5a8ac8, bottom:0xe8dcc0, glow:0xffd090, glowI:0.55, band:0.08 },
      light:{ key:0xffe2bc, keyI:1.55, hemiSky:0xcfdcff, hemiGround:0x4a4a2a, hemiI:0.5, ambient:0xfff0dc, ambientI:0.2 },
      headlights:0, bend:{ y:0.25 }, // plaine du Po : quasi pas de relief
      fuelPrices:[1.94, 1.85, 0.79], fuelLabels:['BENZINA', 'GASOLIO', 'GPL'], fuelColor:0x1a6a3a, fuelBrand:'Stazione di servizio', fuelStationName:'Area di servizio',
      radars:{ limit:130, style:'it', police:'Polizia Stradale', policeStyle:'it', chaseOver:60, every:1500, fine:(o)=> o <= 10 ? 42 : o <= 40 ? 173 : o <= 60 ? 543 : 845 },
      celestial:{ color:0xfff2d0, halo:0xffc878, size:24, x:-70, y:34, haloOp:.38 },
      horizonGlow:{ color:0xffe0b0, op:.2, y:5, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      journey:{
        road:'A1', lang:'it', from:'Bologna', to:'Milano', unitsPerKm:22, pricePerKm:0.078, operator:"Autostrade per l'Italia",
        stops:[
          { name:'Modena Nord', km:39 },
          { name:'Casello di Parma', km:92, toll:true, price:7.30 },
          { name:'Fiorenzuola', km:125 },
          { name:'Piacenza Sud', km:150, toll:true, price:4.10 },
          { name:'Lodi', km:180 },
          { name:'Barriera di Milano Sud', km:205, toll:true, price:5.20 }
        ]
      },
      tollPlaza(T, stop){ return tollPlaza(T, stop); },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, ap = Sc.fbm(8), alps = Sc.ridged(5);
        // Apennins bas et bleutes a gauche (sud), Alpes lointaines a droite (nord)
        ctx.add(Sc.silhouette(T, {
          radius:226, height:90, yBase:-6, peak:30, top:0x8a98b0, bottom:fog, rim:0xffffff, rimA:.25,
          profile:(a)=> a > 0.05 ? 4 + ap(a*4 + 2)*12 : a < -0.1 ? 2 + Math.max(0, alps(a*6 + 1) - 0.25) * 36 : 1.5,
          decorate(g, o){ snowCaps(g, o, 17, 'rgba(244,246,250,.8)'); }
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:50, yBase:-6, peak:12, top:0x4a5a30, bottom:fog, rim:0xfff0c8, rimA:.2,
          profile:(a)=> 1.6 + Math.sin(a*40)*0.3,
          decorate(g, o){
            // horizon de plaine : rideaux de peupliers, clochers, fermes, silos
            for(let i = 0; i < 70; i++){
              const x = Math.floor(Math.random()*o.W), y = o.toPx(o.profile[x]) + 1;
              if(i % 7 === 0){ g.fillStyle = '#8a4a34'; g.fillRect(x, y - 12, 2, 12); g.fillRect(x - 1, y - 14, 4, 2); }
              else if(i % 5 === 0){ g.fillStyle = '#9aa0a4'; g.fillRect(x, y - 8, 3, 8); g.fillRect(x + 4, y - 6, 3, 6); }
              else { g.fillStyle = '#2e4420'; for(let k = 0; k < 6; k++) g.fillRect(x + k*2, y - 8 - (k%2)*2, 1.5, 9 + (k%2)*2); }
            }
          }
        }));
        dayClouds(T, ctx, [[-100, 52, 80, .55], [-20, 64, 70, .45], [60, 48, 90, .5], [130, 58, 70, .45]], 0xfff6ea);
        // terre-plein beton + chaussee opposee + trafic en sens inverse
        const jersey = M('geo:jersey', ()=>{
          const sh = new T.Shape(); sh.moveTo(-0.32, 0); sh.lineTo(0.32, 0); sh.lineTo(0.1, 0.35); sh.lineTo(0.09, 0.85); sh.lineTo(-0.09, 0.85); sh.lineTo(-0.1, 0.35); sh.closePath();
          const g = new T.ExtrudeGeometry(sh, { depth:300, steps:120, bevelEnabled:false }); g.translate(0, 0, -280); return g;
        });
        const jm = ctx.add(new T.Mesh(jersey, M('std:jersey', ()=>new T.MeshStandardMaterial({ color:0x9a968c, roughness:0.9 }))));
        jm.position.set(-6.1, 0, 0);
        ctx.add(longStrip(T, 9, 0.02, 300, 0x2a2a2e, -11.4, 0.005, M('std:oppRoad', ()=>new T.MeshStandardMaterial({ color:0x2e2e32, roughness:0.8 }))));
        [-7.5, -15.3].forEach(x=>ctx.add(longStrip(T, 0.14, 0.02, 300, 0xf4f2ea, x, 0.02, M('bas:line', ()=>new T.MeshBasicMaterial({ color:0xe8e6de })))));
        const cols = [0xa01414, 0xe8e8e8, 0x14286a, 0x1e1e1e, 0x707880, 0xb08a20, 0x2a4a2a];
        const opp = [];
        for(let k = 0; k < 8; k++){
          const car = ctx.add(new T.Mesh(simpleCarGeo(T, 'c' + (k % cols.length), cols[k % cols.length]), vcStd('opp', 0.35)));
          car.rotation.y = Math.PI; car.position.set(k % 2 ? -9.5 : -13.3, 0, -30 - k*26);
          car.castShadow = true;
          opp.push({ car, v:30 + Math.random()*14 });
        }
        // Ligne a grande vitesse sur viaduc, a droite, avec un Frecciarossa qui passe
        const VX = 34;
        const deck = ctx.add(longStrip(T, 7, 1.0, 300, 0xbab4a8, VX, 7.2));
        deck.castShadow = false;
        const fr = new T.Group();
        const frGeo = M('geo:frecciarossa', ()=>S().merge(T, [
          { geo:new T.BoxGeometry(2.9, 3.2, 26), pos:[0, 1.6, 0], color:0xd8d8dc },
          { geo:new T.BoxGeometry(2.95, 0.9, 26), pos:[0, 0.5, 0], color:0xb01018 },
          { geo:new T.BoxGeometry(2.96, 0.7, 24), pos:[0, 2.2, 0], color:0x1a1e26 },
          { geo:new T.BoxGeometry(2.97, 0.12, 26), pos:[0, 1.1, 0], color:0x505458 },
        ]));
        for(let k = 0; k < 5; k++){ const w = new T.Mesh(frGeo, vcStd('fr', 0.3)); w.position.z = k * 26.4; fr.add(w); }
        fr.position.set(VX, 7.7, -420); ctx.add(fr);
        const trn = { wait:6 };
        // lignes haute tension (fixes, subdivisees) tenues par les pylones du decor
        [-42.4, -37.6].forEach(x=>ctx.add(longStrip(T, 0.05, 0.05, 300, 0x303236, x, 21.4)));
        ctx.tick((dt)=>{
          const sc = ctx.scroll();
          for(const o of opp){
            o.car.position.z += sc + o.v * dt;
            if(o.car.position.z > 30){ o.car.position.z = -190 - Math.random()*40; o.v = 30 + Math.random()*14; }
          }
          if(trn.wait > 0){ trn.wait -= dt; if(trn.wait <= 0) fr.position.z = -300; }
          else { fr.position.z += sc + 70 * dt; if(fr.position.z > 60){ trn.wait = 12 + Math.random()*10; fr.position.z = -420; } }
        });
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K(), wrap = 9;
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          add(Kt.guardrail(T, 5.45, z, 1));
          if(i % 3 === 0){
            const brick = i % 2 ? { w:12, d:7, h:7, wall:0x5a2414, roof:0x4a1a0c, shutter:0x2a3a24, chimney:true, glass:0x1a1e24 } : { w:8, d:6.5, h:5.5, wall:0x7a4a2a, roof:0x4a1a0c, shutter:0x3a2a1a };
            const f = new T.Mesh(houseGeo(T, 'cascina' + (i % 2), brick), vc('house')); f.position.set(22 + Math.random()*10, 0, z); add(f);
          }
          // entrepots (capannoni) de zone industrielle, en retrait
          if(i % 5 === 1){
            const g = new T.Mesh(M('geo:capannone', ()=>S().merge(T, [
              { geo:new T.BoxGeometry(14, 7, 22), pos:[0, 3.5, 0], color:0x70767c },
              { geo:new T.BoxGeometry(14.2, 1.1, 22.2), pos:[0, 6.2, 0], color:0x1a4a8a },
              { geo:new T.BoxGeometry(14.4, 0.4, 22.4), pos:[0, 7.2, 0], color:0x4a5056 },
              { geo:new T.BoxGeometry(0.1, 4.5, 6), pos:[-7.05, 2.25, -4], color:0x3a3e44 },
              { geo:new T.BoxGeometry(0.1, 4.5, 6), pos:[-7.05, 2.25, 5], color:0x3a3e44 },
            ])), vcStd('capannone', 0.7));
            g.position.set(34 + Math.random()*8, 0, z); add(g);
          }
          if(i % 4 === 2){
            const g = new T.Group();
            const post = new T.Mesh(M('geo:signPost', ()=>new T.CylinderGeometry(0.05, 0.05, 2.6, 6)), M('std:signPost', ()=>{ const m = new T.MeshStandardMaterial({ color:0x9aa0a6, metalness:0.6, roughness:0.4 }); m.name = 'dg-roadside'; return m; }));
            post.position.y = 1.3; g.add(post);
            const disc = new T.Mesh(M('geo:signDisc', ()=>new T.CircleGeometry(0.42, 24)), M('mat:sign130', ()=>{ const mk = ()=>{ const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#d0141e'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI*2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 48, 0, Math.PI*2); x.fill(); x.fillStyle = '#111'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('130', 64, 68); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshLambertMaterial({ map:t }); }; const m = mk(); m.name = 'dg-roadside'; return m; }));
            disc.position.set(0, 2.5, 0.04); g.add(disc);
            g.position.set(6.7, 0, z); add(g);
          }
          // portiques verts : prochaine sortie + distance de Milano, mis a jour
          // a chaque passage (le decor boucle) avec la position reelle du trajet
          if(i === 3 || i === 11){
            const g = new T.Group();
            const steel = M('std:gantryIt', ()=>new T.MeshStandardMaterial({ color:0x8a9098, metalness:0.7, roughness:0.4 }));
            [-6.6, 6.6].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.3, 7.2, 0.3), steel); p.position.set(x, 3.6, 0); g.add(p); });
            const beam = new T.Mesh(new T.BoxGeometry(13.6, 0.4, 0.4), steel); beam.position.set(0, 7.0, 0); g.add(beam);
            const signs = [-3.3, 3.3].map(x=>{ const sg = new T.Mesh(new T.PlaneGeometry(5, 2.5), new T.MeshLambertMaterial({ color:0xffffff })); sg.position.set(x, 5.8, 0.25); g.add(sg); return sg; });
            gantryTick(T, g, signs, '#0a7a3a', this);
            g.position.set(0, 0, z); g.userData.wrapDist = wrap * N * 2; add(g);
          }
          // pont-restaurant Autogrill (celui de Fiorenzuola enjambe l'A1)
          if(i === 7){
            const g = new T.Group();
            const concrete = M('std:bridge', ()=>new T.MeshStandardMaterial({ color:0xa8a296, roughness:0.9 }));
            [-17, -6.3, 6.9].forEach(x=>{ const p = new T.Mesh(new T.BoxGeometry(0.9, 6.4, 3), concrete); p.position.set(x, 3.2, 0); g.add(p); });
            const deck = new T.Mesh(new T.BoxGeometry(26, 0.8, 9), concrete); deck.position.set(-5.8, 6.8, 0); g.add(deck);
            const glass = new T.Mesh(new T.BoxGeometry(24, 2.6, 8), new T.MeshStandardMaterial({ color:0x5a7a90, metalness:0.6, roughness:0.15, emissive:0x3a2a10, emissiveIntensity:0.4 })); glass.position.set(-5.8, 8.5, 0); g.add(glass);
            const roof = new T.Mesh(new T.BoxGeometry(26, 0.5, 9.4), concrete); roof.position.set(-5.8, 10.0, 0); g.add(roof);
            const sign = new T.Mesh(new T.PlaneGeometry(9, 1.3), new T.MeshBasicMaterial({ map:M('tex:autogrill', ()=>{ const c = document.createElement('canvas'); c.width = 512; c.height = 74; const x = c.getContext('2d'); x.fillStyle = '#c8102e'; x.fillRect(0, 0, 512, 74); x.fillStyle = '#fff'; x.font = 'italic 900 54px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AUTOGRILL', 256, 40); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }) }));
            sign.position.set(-2, 10.9, 4.75); g.add(sign);
            g.position.set(0, 0, z); g.userData.wrapDist = wrap * N * 3; add(g);
          }
        }
        // rangees de peupliers le long des champs (des deux cotes)
        add(Sc.strip(T, poplarGeo(T), vc('poplar'), 40, 16, (d, c, i)=>{ const s = i < 8 ? 1 : -1; d.position.set(s > 0 ? (i % 8 < 4 ? 14 : 48) : -(i % 8 < 4 ? 19 : 48), 0, -(i % 4)*10 - 2); d.scale.setScalar(0.9 + Math.random()*0.25); }));
        add(Sc.strip(T, poplarGeo(T), vc('poplar'), 30, 12, (d, c, i)=>{ const s = i % 2 ? 1 : -1; d.position.set(s*(19 + (i >> 1)*5), 0, -2); }));
        // champs de mais : rangs perpendiculaires, hauts et verts
        const maize = Sc.merge(T, [{ geo:new T.BoxGeometry(16, 1.7, 0.55), pos:[0, 0.85, 0], color:0x2e4a16 }, { geo:new T.BoxGeometry(16, 0.35, 0.4), pos:[0, 1.85, 0], color:0x8a8a3a }]);
        add(Sc.strip(T, maize, vc('maize'), 12, 8, (d, c, i)=>{ const s = i < 4 ? 1 : -1; d.position.set(s*(i % 2 ? 58 : 24) - (s < 0 ? 0 : 0), 0, -(i % 4 < 2 ? 0 : 6) - 1); }));
        // pylones a haute tension (a gauche, en retrait) + piles du viaduc TAV (a droite)
        add(Sc.strip(T, pylonGeo(T), vc('pylon'), 60, 1, (d)=>{ d.position.set(-40, 0, -30); }));
        add(Sc.strip(T, new T.BoxGeometry(2.2, 7.2, 2.2), M('std:pier', ()=>new T.MeshStandardMaterial({ color:0xaaa498, roughness:0.9 })), 24, 1, (d)=>{ d.position.set(34, 3.3, -12); }));
        return items;
      }
    },

    // ------------------------------------------------------------------
    // ROUTE 66 : desert de l'Arizona au soleil couchant. Mesas et buttes
    // rouges, saguaros, lignes telephoniques en bois, motel et diner retro a
    // enseigne neon, station-service d'epoque, panneaux "Historic Route 66",
    // blasons 66 peints sur la chaussee, epaves rouillees et virevoltants.
    {
      id:'route66', name:'Route 66', difficulty:'Détente', spacing:9,
      fog:0xe0a878, fogNear:45, fogFar:200, ground:0x8a4a22, exposure:0.95,
      road:0x2e2a28, stripe:0xf0c030, edge:0x6a5040, edgeEmissive:0x000000,
      sky:{ top:0x1a3a8a, mid:0x6a8ac8, bottom:0xffb070, glow:0xffa050, glowI:0.7, band:0.08 },
      light:{ key:0xffc890, keyI:1.6, hemiSky:0xffd0a8, hemiGround:0x5a2a14, hemiI:0.5, ambient:0xffe0c0, ambientI:0.22 },
      headlights:0.3, lanes:2, twoWay:true, hills:true, bend:{ y:1.6, yf:0.35 }, // 2 voies (une par sens) ; longue pente douce, comme la vraie Route 66
      currency:'$', coinValue:1.1, fuelUnit:'gal', fuelPrices:[3.39, 3.79, 3.89], fuelLabels:['REGULAR', 'PLUS', 'DIESEL'],
      radars:{ limit:105, unitLabel:'mph', style:'us', police:'Arizona Highway Patrol', policeStyle:'us', chaseOver:40, every:1400, fine:(o)=>{ const mph = o / 1.609; return mph < 15 ? 150 : mph < 25 ? 250 : 400; } }, fuelColor:0xb01818, fuelColor2:0xf4f2ea, fuelBrand:'Gas station', fuelStationName:'Route 66 Gas & Diner',
      celestial:{ color:0xfff0c8, halo:0xff9a40, size:32, x:60, y:14, haloOp:.5 },
      horizonGlow:{ color:0xff9a50, op:.3, y:4, w:360, h:40 },
      groundTex(T){ return { tex:S().sandTex(T), rx:40, ry:36 }; },
      journey:{
        road:'US 66', from:'Albuquerque', to:'Santa Monica', unitsPerKm:1.8, pricePerKm:0, currency:'$',
        stops:[ { name:'Gallup', km:225 }, { name:'Winslow', km:430 }, { name:'Flagstaff', km:520 }, { name:'Kingman', km:760 }, { name:'Barstow', km:1020 }, { name:'Santa Monica', km:1210 } ]
      },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, mesa = Sc.fbm(17), range = Sc.fbm(29);
        // mesas et buttes a sommet plat (strates claires), chaine violette au loin
        ctx.add(Sc.silhouette(T, {
          radius:226, height:100, yBase:-6, peak:34, top:0x7a5a8a, bottom:fog, rim:0xffc890, rimA:.3,
          profile:(a)=> 6 + range(a*5 + 4)*20
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:70, yBase:-6, peak:30, top:0x8a3a1a, bottom:fog, rim:0xffb070, rimA:.45,
          profile:(a)=>{
            const n = mesa(a*7 + 2);
            const butte = n > 0.62 ? 26 : n > 0.55 ? 26 * (n - 0.55) / 0.07 : 0; // parois verticales, sommet plat
            return Math.max(2, butte + (n > 0.55 ? 0 : n * 3));
          },
          decorate(g, o){
            // strates horizontales sur les parois
            for(let x = 0; x < o.W; x++){
              const h = o.profile[x]; if(h < 8) continue;
              for(let s = 6; s < h; s += 4.5){ const y = o.toPx(s); g.fillStyle = s % 9 < 4.5 ? 'rgba(255,170,110,.35)' : 'rgba(90,30,10,.3)'; g.fillRect(x, y, 1, 1.5); }
            }
          }
        }));
        dayClouds(T, ctx, [[-120, 50, 80, .5], [-30, 62, 60, .4], [90, 46, 90, .45]], 0xffd8b0);
        // virevoltants (tumbleweeds) qui traversent la route de temps en temps
        const twGeo = M('geo:tumble', ()=>new T.IcosahedronGeometry(0.55, 1));
        const twMat = M('mat:tumble', ()=>new T.MeshLambertMaterial({ color:0x8a6a3a, wireframe:true }));
        const tws = [0, 1, 2].map(k=>{ const m = ctx.add(new T.Mesh(twGeo, twMat)); m.position.set(-30, 0.55, -60 - k*30); return { m, v:3 + Math.random()*3, dir:k % 2 ? 1 : -1 }; });
        ctx.tick((dt)=>{
          const sc = ctx.scroll();
          for(const w of tws){
            w.m.position.z += sc; w.m.position.x += w.dir * w.v * dt;
            w.m.rotation.z -= w.dir * w.v * dt / 0.55;
            w.m.position.y = 0.55 + Math.abs(Math.sin(performance.now()*0.004 + w.v)) * 0.35;
            if(w.m.position.z > 20 || Math.abs(w.m.position.x) > 34){ w.dir = Math.random() < 0.5 ? 1 : -1; w.m.position.set(-w.dir * 30, 0.55, -80 - Math.random()*60); w.v = 3 + Math.random()*3; }
          }
        });
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K(), wrap = 9;
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          // blason "66" peint sur la chaussee (voie de droite)
          if(i % 4 === 0){
            const d = new T.Mesh(M('geo:unitPlane66', ()=>new T.PlaneGeometry(1, 1)), M('mat:shield66', ()=>new T.MeshBasicMaterial({ map:shield66Tex(T, true), transparent:true, opacity:0.85, depthWrite:false })));
            d.rotation.x = -Math.PI/2; d.scale.set(2.2, 2.6, 1); d.position.set(1.8, 0.025, z); add(d);
          }
          // panneau "Historic Route 66" sur le bas-cote
          if(i % 5 === 3){
            const g = new T.Group();
            const post = new T.Mesh(M('geo:woodPost', ()=>new T.BoxGeometry(0.12, 2.6, 0.12)), M('lam:wood', ()=>new T.MeshLambertMaterial({ color:0x4a3322 }))); post.position.y = 1.3; g.add(post);
            const sign = new T.Mesh(M('geo:shieldSign', ()=>new T.PlaneGeometry(1.1, 1.3)), M('mat:shield66sign', ()=>new T.MeshLambertMaterial({ map:shield66Tex(T, false), transparent:true })));
            sign.position.set(0, 2.5, 0.08); g.add(sign);
            g.position.set(4.4, 0, z); add(g);
          }
          // reperes rares : motel, diner, station-service d'epoque, panneau publicitaire, epave
          if(i === 2) { const m = motel(T); m.position.set(-17, 0, z); m.userData.wrapDist = wrap * N * 2; add(m); }
          if(i === 9) { const d = diner(T); d.position.set(15, 0, z); d.userData.wrapDist = wrap * N * 2; add(d); }
          if(i === 13){ const s = oldGasStation(T); s.position.set(-15, 0, z); s.userData.wrapDist = wrap * N * 3; add(s); }
          if(i === 6) { const b = billboard66(T); b.position.set(18, 0, z); b.userData.wrapDist = wrap * N * 2; add(b); }
          if(i % 7 === 4){ const w = new T.Mesh(M('geo:wreck', ()=>S().merge(T, [ { geo:new T.BoxGeometry(1.9, 0.7, 4.6), pos:[0, 0.5, 0], color:0x6a3218 }, { geo:new T.BoxGeometry(1.6, 0.6, 2.0), pos:[0, 1.15, 0.2], color:0x5a2a14 }, { geo:new T.BoxGeometry(1.7, 0.3, 1.2), pos:[0, 0.95, -1.8], color:0x7a3a1c } ])), vc('wreck')); w.position.set((i % 2 ? 1 : -1)*(11 + Math.random()*4), 0, z); w.rotation.y = 0.6; w.rotation.z = 0.08; add(w); }
        }
        // poteaux telephoniques en bois (a gauche) et leurs fils
        const pole = Sc.merge(T, [{ geo:new T.CylinderGeometry(0.12, 0.16, 8, 6), pos:[0, 4, 0], color:0x4a3322 }, { geo:new T.BoxGeometry(2.2, 0.14, 0.14), pos:[0, 7.4, 0], color:0x4a3322 }, { geo:new T.BoxGeometry(1.6, 0.12, 0.12), pos:[0, 6.8, 0], color:0x4a3322 }]);
        add(Sc.strip(T, pole, vc('telpole'), 24, 1, (d)=>{ d.position.set(-8.5, 0, -12); }));
        // saguaros, buissons et rochers dans le desert
        add(Sc.strip(T, saguaroGeo(T), vc('saguaro'), 30, 12, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 9, 38, 30)));
        add(Sc.strip(T, Kt.rockGeo(T), vc('rock66'), 20, 10, (d, c, i)=>{ placeRow(d, c, i % 2 ? 1 : -1, 7, 40, 20); d.scale.multiplyScalar(0.7 + Math.random()); }));
        add(Sc.strip(T, Kt.grassTuftGeo(T), vc('tuft66'), 12, 14, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 6.5, 30, 12)));
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
      fuelPrices:[1.79, 1.89, 1.99], fuelLabels:['GAZOLE', 'SP95-E10', 'SP98'], fuelDefault:1, fuelColor:0x1a4fa8, fuelColor2:0xff7a00, fuelStationName:'Station du village',
      radars:{ limit:80, style:'fr', police:'Gendarmerie', policeStyle:'fr', chaseOver:50, every:1500, fine:(o)=> o < 20 ? 68 : o < 50 ? 135 : 1500 },
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
    },
    // ------------------------------------------------------------------
    // A7 LYON -> MARSEILLE ("Autoroute du Soleil") : vallee du Rhone l'ete.
    // Terre-plein gazonne a double glissiere, panneaux bleus francais avec
    // les vraies distances, vignobles des Cotes du Rhone, vergers, cypres,
    // tours de refroidissement du Tricastin qui fument, Vercors et Ventoux au
    // loin, lavande en approchant de la Provence. Peages de Vienne et Lancon.
    {
      id:'a7-france', name:'A7 Lyon → Marseille', difficulty:'Standard', spacing:9,
      fog:0xd8dce2, fogNear:40, fogFar:190, ground:0x6a6a34, exposure:0.9,
      road:0x2a2a2e, stripe:0xf4f4ee, edge:0x6a6a6e, edgeEmissive:0x000000,
      sky:{ top:0x0e3c96, mid:0x4a8ad8, bottom:0xd8e4f0, glow:0xfff0d0, glowI:0.45, band:0.07 },
      light:{ key:0xfff0d8, keyI:1.6, hemiSky:0xcfe0ff, hemiGround:0x4a4430, hemiI:0.5, ambient:0xffffff, ambientI:0.2 },
      headlights:0, bend:{ y:0.6 },
      celestial:{ color:0xfffcf0, halo:0xfff4d0, size:22, x:60, y:62, haloOp:.3 },
      horizonGlow:{ color:0xffffff, op:.1, y:6, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      fuelPrices:[1.86, 1.96, 2.06], fuelLabels:['GAZOLE', 'SP95-E10', 'SP98'], fuelDefault:1, fuelColor:0x1a4fa8, fuelColor2:0xff7a00, fuelBrand:'Station-service', fuelStationName:'Aire de service',
      radars:{ limit:130, style:'fr', police:'Gendarmerie nationale', policeStyle:'fr', chaseOver:50, every:1500, fine:(o)=> o < 20 ? 68 : o < 50 ? 135 : 1500 },
      tollStyle:{ bg:'#1c4fa8', title:'PÉAGE', accent:'#ff7a00', left:'t', right:'CB' },
      journey:{
        road:'A7', lang:'fr', from:'Lyon', to:'Marseille', unitsPerKm:20, pricePerKm:0.095, operator:'Autoroutes du Sud',
        stops:[
          { name:'Péage de Vienne-Reventin', km:34, toll:true, price:3.40 },
          { name:'Valence Nord', km:98 },
          { name:'Montélimar Sud', km:152 },
          { name:'Orange', km:204 },
          { name:'Avignon Nord', km:226 },
          { name:'Péage de Lançon', km:288, toll:true, price:27.90 },
          { name:'Marseille', km:318 }
        ]
      },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, west = Sc.fbm(31), east = Sc.fbm(37);
        // Ardeche/Massif central a droite (collines), Vercors a falaises et Ventoux a gauche
        ctx.add(Sc.silhouette(T, {
          radius:226, height:100, yBase:-6, peak:32, top:0x7a8aa8, bottom:fog, rim:0xffffff, rimA:.3,
          profile:(a)=> a > 0.05 ? (east(a*4 + 3) > 0.55 ? 22 : 8 + east(a*4 + 3)*12) : 5 + west(a*5 + 1)*14,
          decorate(g, o){ snowCaps(g, o, 21, 'rgba(236,236,232,.9)'); }
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:55, yBase:-6, peak:16, top:0x4a6a36, bottom:fog, rim:0xfff4d0, rimA:.25,
          profile:(a)=> 2 + west(a*9 + 7)*9,
          decorate(g, o){
            for(let i = 0; i < 50; i++){
              const x = Math.floor(Math.random()*o.W), y = o.toPx(o.profile[x]) + 2 + Math.random()*6;
              if(i % 6 === 0){ g.fillStyle = '#d8c09a'; g.fillRect(x, y - 3, 5, 3); g.fillStyle = '#9a4a2a'; g.fillRect(x - 1, y - 4, 7, 1); }
              else { g.fillStyle = 'rgba(40,70,30,.8)'; g.fillRect(x, y, 6, 1); }
            }
          }
        }));
        dayClouds(T, ctx, [[-110, 60, 70, .5], [-20, 76, 80, .4], [70, 56, 60, .5], [140, 68, 70, .4]]);
        motorwayOpposite(T, ctx, [0xb01818, 0xe8e8e8, 0x1a2a6a, 0x1e1e1e, 0x707880, 0x3a6a8a, 0xd8d0c0]);
        // centrale du Tricastin au loin sur la droite
        coolingTower(T, ctx, 70, -150, 1); coolingTower(T, ctx, 92, -168, 0.95);
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K(), wrap = 9;
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          add(Kt.guardrail(T, 4.35, z, 1));
          if(i % 4 === 1){ const m = new T.Mesh(houseGeo(T, 'rhone' + (i % 2), i % 2 ? { w:9, d:7, h:6, wall:0xb89e72, roof:0x6a2410, shutter:0x2a5a8a, chimney:true } : { w:7, d:6, h:5, wall:0xc4aa80, roof:0x72280f, shutter:0x3a6a4a }), vc('house')); m.position.set(24 + Math.random()*10, 0, z); add(m); }
          if(i === 3 || i === 11) add(journeyGantry(T, z, '#1f4fa8', wrap * N * 2, this));
          // borne d'appel d'urgence orange (tous les 2 km sur les autoroutes francaises)
          if(i % 5 === 2){ const b = new T.Mesh(M('geo:sos', ()=>S().merge(T, [ { geo:new T.BoxGeometry(0.5, 1.3, 0.35), pos:[0, 0.65, 0], color:0xe8701a }, { geo:new T.BoxGeometry(0.4, 0.3, 0.37), pos:[0, 1.05, 0], color:0xf4f4ee } ])), vc('sos')); b.position.set(5.5, 0, z); add(b); }
        }
        // vignobles des Cotes du Rhone : rangs perpendiculaires des deux cotes
        const vine = Sc.merge(T, [{ geo:new T.BoxGeometry(18, 1.0, 0.45), pos:[0, 0.6, 0], color:0x2e4a16 }, { geo:new T.BoxGeometry(18, 0.25, 0.5), pos:[0, 1.15, 0], color:0x3a5a1e }]);
        add(Sc.strip(T, vine, vc('vineFr'), 16, 12, (d, c, i)=>{ const s = i < 6 ? 1 : -1; d.position.set(s > 0 ? 14 + (i % 2)*20 : -(22 + (i % 2)*20), 0, -((i % 6) >> 1)*5 - 1); }));
        // vergers (abricotiers) et cypres coupe-vent en rideau
        add(Sc.strip(T, oliveGeo(T), vc('olive'), 30, 8, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 36, 56, 30)));
        add(Sc.strip(T, cypressGeo(T), vc('cypress'), 32, 8, (d, c, i)=>{ d.position.set(i < 4 ? 11.5 : -19, 0, -(i % 4)*8 - 2); d.scale.setScalar(1 + Math.random()*0.2); }));
        // quelques champs de lavande (on approche de la Provence)
        const lav = Sc.merge(T, [{ geo:new T.BoxGeometry(16, 0.5, 0.8), pos:[0, 0.28, 0], color:0x2e1a62 }, { geo:new T.BoxGeometry(16, 0.22, 0.55), pos:[0, 0.6, 0], color:0x4a2c8e }]);
        add(Sc.strip(T, lav, vc('lavender'), 48, 5, (d, c, i)=>{ d.position.set(58, 0, -i*1.6 - 20); }));
        return items;
      }
    },

    // ------------------------------------------------------------------
    // A2 BASEL -> LUGANO (Gothard) : autoroute suisse dans une vallee alpine.
    // Pas de peage (vignette), panneaux verts suisses aux vraies distances,
    // montagnes enneigees tres hautes, forets d'epiceas, alpages avec vaches,
    // chalets a geraniums, lac, et des tunnels eclaires au sodium.
    {
      id:'a2-suisse', name:'A2 Basel → Lugano', difficulty:'Standard', spacing:9,
      fog:0xc8d6e2, fogNear:40, fogFar:190, ground:0x3a6a26, exposure:0.9,
      road:0x2a2a2e, stripe:0xf4f4ee, edge:0x6a6a6e, edgeEmissive:0x000000,
      sky:{ top:0x0a3478, mid:0x3a7ac8, bottom:0xc8dcef, glow:0xfff4e0, glowI:0.45, band:0.07 },
      light:{ key:0xfff4e4, keyI:1.55, hemiSky:0xc8dcff, hemiGround:0x2a3a1e, hemiI:0.55, ambient:0xffffff, ambientI:0.2 },
      headlights:0, bend:{ y:1.3, yf:0.8 },
      celestial:{ color:0xfffcf0, halo:0xfff4d0, size:22, x:-50, y:66, haloOp:.3 },
      horizonGlow:{ color:0xffffff, op:.1, y:6, w:340, h:36 },
      groundTex(T){ return { tex:S().grassTex(T), rx:34, ry:32 }; },
      currency:'CHF', coinValue:0.95, fuelPrices:[1.88, 1.99, 1.93], fuelLabels:['BLEIFREI 95', 'BLEIFREI 98', 'DIESEL'],
      radars:{ limit:120, style:'ch', police:'Kantonspolizei Uri', policeStyle:'ch', chaseOver:30, every:1500, fine:(o)=> o <= 5 ? 20 : o <= 10 ? 60 : o <= 15 ? 120 : o <= 20 ? 180 : o <= 25 ? 260 : 600 }, fuelColor:0xc8101e, fuelColor2:0xf4f4f4, fuelBrand:'Tankstelle', fuelStationName:'Raststätte',
      journey:{
        road:'A2', lang:'de', from:'Basel', to:'Lugano', unitsPerKm:18, pricePerKm:0, currency:'CHF',
        intro:'🇨🇭 Vignette ✓ — pas de péage sur les autoroutes suisses',
        stops:[ { name:'Olten', km:42 }, { name:'Luzern', km:96 }, { name:'Flüelen', km:131 }, { name:'Göschenen', km:160 }, { name:'Airolo', km:178 }, { name:'Bellinzona', km:232 }, { name:'Lugano', km:262 } ]
      },
      extras(T, ctx){
        const Sc = S(), fog = this.fog, peaks = Sc.ridged(23), peaks2 = Sc.ridged(41);
        // hautes Alpes des deux cotes (neige au-dessus de 30), vallee etroite
        ctx.add(Sc.silhouette(T, {
          radius:226, height:120, yBase:-6, peak:60, top:0x5a6a88, bottom:fog, rim:0xffffff, rimA:.4,
          profile:(a)=> Math.abs(a) < 0.08 ? 20 + peaks(a*8)*20 : 26 + peaks(a*6 + 2)*42,
          decorate(g, o){ snowCaps(g, o, 34); }
        }));
        ctx.add(Sc.silhouette(T, {
          radius:186, height:80, yBase:-6, peak:40, top:0x1e3a22, bottom:fog, rim:0xd8ecff, rimA:.25,
          profile:(a)=> Math.abs(a) < 0.1 ? 4 : 12 + peaks2(a*9 + 5)*30,
          decorate(g, o){
            // forets sombres en bas, alpages clairs plus haut, cascades blanches
            for(let x = 0; x < o.W; x++){ const h = o.profile[x]; if(h < 16) continue; const y = o.toPx(h * 0.72); g.fillStyle = 'rgba(80,120,50,.55)'; g.fillRect(x, o.toPx(h) + 2, 1, Math.max(0, y - o.toPx(h))); }
            [0.2, 0.32, 0.7, 0.83].forEach(f=>{ const x = Math.floor(o.W*f), top = o.toPx(o.profile[x]) + 6; g.fillStyle = 'rgba(240,248,255,.8)'; g.fillRect(x, top, 1.5, 40); });
          }
        }));
        dayClouds(T, ctx, [[-100, 80, 70, .55], [10, 96, 80, .45], [90, 84, 60, .55]]);
        motorwayOpposite(T, ctx, [0xd8d8d8, 0x1e1e1e, 0x8a0e14, 0x2a3a6a, 0x6a7078, 0xf0f0f0]);
        // lac (Lac des Quatre-Cantons) a droite, loin derriere les alpages
        const lake = new T.Mesh(new T.PlaneGeometry(200, 400, 10, 80), new T.MeshBasicMaterial({ map:waterTex(T, [[0, '#4a9aa8'], [0.1, '#2a6a8a'], [1, '#5a8aa8']]) }));
        lake.rotation.x = -Math.PI/2; lake.position.set(70 + 100, 0.004, -150); ctx.add(lake);
      },
      buildDecor(T, scene, N){
        const items = [], add = (o)=>{ scene.add(o); items.push(o); return o; };
        const Sc = S(), Kt = K(), wrap = 9;
        for(let i = 0; i < N; i++){
          const z = -12 - i*9;
          add(Kt.guardrail(T, 4.35, z, 1));
          if(i % 3 === 1){ const c = new T.Mesh(chaletGeo(T), vc('chalet')); c.position.set(20 + Math.random()*14, 0, z); c.rotation.y = Math.random() < 0.3 ? Math.PI : 0; add(c); }
          if(i === 4 || i === 12) add(journeyGantry(T, z, '#0a7a3a', wrap * N * 2, this));
          // tunnel (repere rare) : on passe dedans, le plafond fait de l'ombre
          if(i === 8){ const t = roadTunnel(T, z, 90, 'San Gottardo'); t.userData.wrapDist = wrap * N * 3; add(t); }
        }
        // forets d'epiceas et vaches dans les alpages
        add(Sc.strip(T, spruceGeo(T), vc('spruce'), 40, 18, (d, c, i)=>placeRow(d, c, i % 2 ? 1 : -1, 12, 40, 40)));
        add(Sc.strip(T, spruceGeo(T), vc('spruce'), 20, 6, (d, c, i)=>placeRow(d, c, -1, 17, 24, 20)));
        add(Sc.strip(T, cowGeo(T, 'brown', 0x5a2e14, 0xe8e2d4), vc('cow'), 30, 5, (d, c, i)=>{ placeRow(d, c, 1, 10, 30, 30); d.scale.setScalar(1); }));
        add(Sc.strip(T, cowGeo(T, 'bw', 0x141414, 0xf0eee8), vc('cow'), 36, 4, (d, c, i)=>{ placeRow(d, c, i % 2 ? 1 : -1, 10, 28, 36); d.scale.setScalar(1); }));
        return items;
      }
    }
  ];

  DG.ROUTES = (DG.ROUTES || []).concat(ROUTES);
})();
