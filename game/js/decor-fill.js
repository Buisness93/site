// Habillage du paysage : couches de details instancies (herbes hautes,
// buissons, rochers, fleurs, arbres, haies, bottes de foin, cactus...) posees
// route par route en plus du decor propre a chaque route. Le paysage etait
// "trop vide" : un sol uni juste apres la glissiere et de grands espaces plats.
// Chaque couche = 1 appel de dessin (S.strip), elle defile et boucle avec le
// reste du decor. Coordonnees x dans le repere du decor (le moteur les
// elargit avec la route) ; on ne pose jamais rien sur l'eau, la ville ou la
// chaussee d'en face (cotes et plages x choisis pour chaque route).
(function(){
  window.DG = window.DG || {};
  const S = ()=>DG.Scenery;
  const geoCache = {};
  const G = (k, f)=>geoCache[k] || (geoCache[k] = f());

  // ---------- Geometries (fusionnees, couleurs par sommet) ----------
  const GEO = {
    grass(T){ return G('grass', ()=>{
      const parts = [];
      for(let k = 0; k < 7; k++){
        const a = k / 7 * Math.PI * 2, h = 0.55 + (k % 3) * 0.22;
        parts.push({ geo:new T.ConeGeometry(0.045, h, 3), pos:[Math.cos(a) * 0.11, h / 2, Math.sin(a) * 0.11], rot:[Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4], color:k % 2 ? 0x9aa85a : 0x6f8a3e });
      }
      return S().merge(T, parts);
    }); },
    bush(T){ return G('bush', ()=>S().merge(T, [
      { geo:new T.IcosahedronGeometry(0.62, 0), pos:[0, 0.42, 0], scale:[1.25, 0.8, 1.1], color:0x3a5a2a },
      { geo:new T.IcosahedronGeometry(0.45, 0), pos:[0.55, 0.32, 0.15], color:0x45683a },
      { geo:new T.IcosahedronGeometry(0.4, 0), pos:[-0.5, 0.28, -0.1], color:0x324e24 },
    ])); },
    flowers(T){ return G('flowers', ()=>{
      const parts = [], cols = [0xf2f2f2, 0xffd23a, 0xe8435a, 0xb48cff, 0xffffff];
      parts.push({ geo:new T.CylinderGeometry(0.42, 0.5, 0.12, 7), pos:[0, 0.06, 0], color:0x587a34 });
      for(let k = 0; k < 9; k++){ const a = k * 2.4, r = 0.12 + (k % 3) * 0.12; parts.push({ geo:new T.OctahedronGeometry(0.055, 0), pos:[Math.cos(a) * r, 0.2 + (k % 2) * 0.05, Math.sin(a) * r], color:cols[k % cols.length] }); }
      return S().merge(T, parts);
    }); },
    rock(T){ return G('rock', ()=>S().merge(T, [
      { geo:new T.DodecahedronGeometry(0.55, 0), pos:[0, 0.18, 0], scale:[1.35, 0.62, 1.05], color:0x8a8478 },
      { geo:new T.DodecahedronGeometry(0.3, 0), pos:[0.58, 0.08, 0.28], scale:[1, 0.7, 1.2], color:0x9a9488 },
    ])); },
    conifer(T){ return G('conifer', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.11, 0.18, 1.2, 5), pos:[0, 0.6, 0], color:0x3a2a1c },
      { geo:new T.ConeGeometry(1.25, 2.2, 7), pos:[0, 1.9, 0], color:0x1f3d22 },
      { geo:new T.ConeGeometry(0.95, 1.9, 7), pos:[0, 2.95, 0], rot:[0, 0.5, 0], color:0x24472a },
      { geo:new T.ConeGeometry(0.6, 1.5, 7), pos:[0, 3.9, 0], rot:[0, 1, 0], color:0x2a5030 },
    ])); },
    leafy(T){ return G('leafy', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.12, 0.19, 1.8, 6), pos:[0, 0.9, 0], color:0x4a3624 },
      { geo:new T.IcosahedronGeometry(1.3, 0), pos:[0, 2.5, 0], scale:[1, 0.88, 1], color:0x3d6a2c },
      { geo:new T.IcosahedronGeometry(0.9, 0), pos:[0.55, 3.15, 0.25], color:0x4a7a34 },
      { geo:new T.IcosahedronGeometry(0.8, 0), pos:[-0.5, 3.0, -0.3], color:0x375f28 },
    ])); },
    cypress(T){ return G('cypress', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.1, 0.14, 0.8, 5), pos:[0, 0.4, 0], color:0x3a2a1c },
      { geo:new T.SphereGeometry(0.7, 7, 8), pos:[0, 3.0, 0], scale:[1, 3.8, 1], color:0x24401f },
    ])); },
    hedge(T){ return G('hedge', ()=>S().merge(T, [
      { geo:new T.BoxGeometry(0.9, 0.95, 5.6), pos:[0, 0.47, 0], color:0x2f4f24 },
      { geo:new T.BoxGeometry(0.98, 0.25, 5.3), pos:[0, 0.98, 0], color:0x3a5f2c },
    ])); },
    fence(T){ return G('fence', ()=>{
      const parts = [];
      for(let k = 0; k < 4; k++) parts.push({ geo:new T.BoxGeometry(0.09, 1.0, 0.09), pos:[0, 0.5, -k * 2.2], color:0x6a4e32 });
      [0.45, 0.85].forEach(y=>parts.push({ geo:new T.BoxGeometry(0.05, 0.08, 6.7), pos:[0, y, -3.3], color:0x7a5a3a }));
      return S().merge(T, parts);
    }); },
    hay(T){ return G('hay', ()=>{ const g = S().merge(T, [{ geo:new T.CylinderGeometry(0.75, 0.75, 1.2, 14), rot:[0, 0, Math.PI / 2], pos:[0, 0.75, 0], color:0xd8b860 }]); return g; }); },
    cactus(T){ return G('cactus', ()=>S().merge(T, [
      { geo:new T.CylinderGeometry(0.22, 0.26, 2.6, 8), pos:[0, 1.3, 0], color:0x3f6a34 },
      { geo:new T.CylinderGeometry(0.15, 0.15, 0.8, 7), pos:[0.42, 1.2, 0], rot:[0, 0, Math.PI / 2], color:0x3f6a34 },
      { geo:new T.CylinderGeometry(0.14, 0.14, 0.9, 7), pos:[0.75, 1.6, 0], color:0x467a3a },
      { geo:new T.CylinderGeometry(0.13, 0.13, 0.7, 7), pos:[-0.38, 1.7, 0], rot:[0, 0, Math.PI / 2], color:0x3f6a34 },
      { geo:new T.CylinderGeometry(0.12, 0.12, 0.7, 7), pos:[-0.68, 2.0, 0], color:0x467a3a },
    ])); },
    shrub(T){ return G('shrub', ()=>{ // broussaille seche du desert
      const parts = [];
      for(let k = 0; k < 8; k++){ const a = k * 0.8; parts.push({ geo:new T.CylinderGeometry(0.012, 0.02, 0.7, 3), pos:[Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12], rot:[Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7], color:0x8a6e44 }); }
      parts.push({ geo:new T.IcosahedronGeometry(0.32, 0), pos:[0, 0.3, 0], scale:[1.2, 0.7, 1.2], color:0x7a7a48 });
      return S().merge(T, parts);
    }); },
    reeds(T){ return G('reeds', ()=>{
      const parts = [];
      for(let k = 0; k < 9; k++){ const a = k * 0.7, h = 1.1 + (k % 3) * 0.3; parts.push({ geo:new T.CylinderGeometry(0.012, 0.018, h, 3), pos:[Math.cos(a) * 0.2, h / 2, Math.sin(a) * 0.2], rot:[Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], color:k % 2 ? 0x8a9a5a : 0x6a7a44 }); }
      return S().merge(T, parts);
    }); },
    azalea(T){ return G('azalea', ()=>S().merge(T, [
      { geo:new T.IcosahedronGeometry(0.55, 0), pos:[0, 0.38, 0], scale:[1.2, 0.75, 1.1], color:0xe86a9a },
      { geo:new T.IcosahedronGeometry(0.38, 0), pos:[0.5, 0.3, 0.1], color:0xf08ab0 },
      { geo:new T.IcosahedronGeometry(0.35, 0), pos:[-0.45, 0.26, -0.1], color:0x3a5a2a },
    ])); },
    lavender(T){ return G('lavender', ()=>S().merge(T, [
      { geo:new T.SphereGeometry(0.42, 7, 5), pos:[0, 0.28, 0], scale:[1.1, 0.7, 1.1], color:0x5a6a3a },
      { geo:new T.SphereGeometry(0.4, 7, 5), pos:[0, 0.48, 0], scale:[1.05, 0.55, 1.05], color:0x9a7ae0 },
    ])); },
  };

  // ---------- Couches par route ----------
  // { g:geometrie, n:instances par tuile, x:[min,max] (distance a l'axe), side:-1|1|0 (0 = les deux),
  //   s:[echelle min, max], tint:[r,g,b] multiplicateur, jit:variation de teinte }
  const NEAR = [6.2, 12];
  const LAYERS = {
    'autoroute-nuit':[
      { g:'grass', n:120, x:NEAR, side:0, s:[0.8, 1.3], tint:[0.55, 0.62, 0.7] },
      { g:'bush', n:26, x:[8, 16], side:-1, s:[0.7, 1.3], tint:[0.45, 0.5, 0.6] },
      { g:'bush', n:14, x:[26, 40], side:1, s:[0.8, 1.4], tint:[0.45, 0.5, 0.6] },
      { g:'rock', n:10, x:[7, 30], side:0, s:[0.5, 1.1], tint:[0.5, 0.55, 0.65] },
      { g:'conifer', n:16, x:[22, 34], side:-1, s:[0.9, 1.5], tint:[0.55, 0.62, 0.7] },
    ],
    'cote-sunset':[
      { g:'grass', n:90, x:[6.2, 20], side:-1, s:[0.8, 1.3], tint:[1.15, 0.95, 0.7] },
      { g:'bush', n:24, x:[8, 30], side:-1, s:[0.7, 1.3], tint:[1.1, 0.9, 0.7] },
      { g:'rock', n:14, x:[7, 34], side:-1, s:[0.6, 1.4], tint:[1.2, 1.0, 0.85] },
      { g:'flowers', n:16, x:[7, 22], side:-1, s:[0.8, 1.2], tint:[1.1, 0.95, 0.85] },
    ],
    'japon-sakura':[
      { g:'grass', n:110, x:NEAR, side:0, s:[0.8, 1.2], tint:[1, 1.05, 0.95] },
      { g:'azalea', n:24, x:[7, 18], side:0, s:[0.7, 1.2], tint:[1, 1, 1] },
      { g:'flowers', n:20, x:[7, 24], side:0, s:[0.8, 1.2], tint:[1.05, 1, 1.05] },
      { g:'rock', n:8, x:[8, 26], side:0, s:[0.5, 1.0], tint:[1, 1, 1.05] },
    ],
    'lac-neuchatel':[
      { g:'grass', n:110, x:[6.2, 18], side:-1, s:[0.8, 1.3], tint:[1.05, 1.1, 0.95] },
      { g:'reeds', n:40, x:[6.2, 9.5], side:1, s:[0.8, 1.3], tint:[1, 1, 0.95] },
      { g:'bush', n:24, x:[8, 26], side:-1, s:[0.7, 1.3], tint:[1.05, 1.1, 1] },
      { g:'flowers', n:20, x:[7, 24], side:-1, s:[0.8, 1.2], tint:[1, 1, 1] },
      { g:'leafy', n:14, x:[13, 40], side:-1, s:[0.8, 1.3], tint:[1.05, 1.1, 1] },
      { g:'fence', n:6, x:[12, 16], side:-1, s:[1, 1], tint:[1, 1, 1], noRot:true },
    ],
    'autostrada':[
      { g:'grass', n:110, x:[6.2, 20], side:1, s:[0.8, 1.3], tint:[1.1, 1.05, 0.85] },
      { g:'bush', n:22, x:[8, 28], side:1, s:[0.7, 1.3], tint:[1.05, 1.05, 0.9] },
      { g:'cypress', n:12, x:[18, 30], side:1, s:[0.8, 1.3], tint:[1, 1, 1] },
      { g:'grass', n:60, x:[17.5, 30], side:-1, s:[0.8, 1.3], tint:[1.1, 1.05, 0.85] },
      { g:'leafy', n:12, x:[20, 45], side:-1, s:[0.9, 1.4], tint:[1.05, 1.05, 0.9] },
      { g:'hay', n:8, x:[30, 60], side:-1, s:[0.9, 1.1], tint:[1, 1, 1] },
    ],
    'route66':[
      { g:'shrub', n:70, x:[6.2, 40], side:0, s:[0.7, 1.4], tint:[1, 1, 1] },
      { g:'rock', n:30, x:[7, 60], side:0, s:[0.6, 2.2], tint:[1.25, 0.95, 0.75] },
      { g:'cactus', n:10, x:[12, 50], side:0, s:[0.7, 1.3], tint:[1, 1, 1] },
    ],
    'provence':[
      { g:'grass', n:70, x:NEAR, side:0, s:[0.8, 1.3], tint:[1.1, 1.05, 0.85] },
      { g:'lavender', n:30, x:[7, 14], side:0, s:[0.8, 1.2], tint:[1, 1, 1] },
      { g:'rock', n:12, x:[7, 30], side:0, s:[0.6, 1.2], tint:[1.2, 1.12, 1.0] },
      { g:'cypress', n:10, x:[30, 60], side:0, s:[0.9, 1.4], tint:[1, 1, 1] },
    ],
    'a7-france':[
      { g:'grass', n:110, x:[6.2, 20], side:1, s:[0.8, 1.3], tint:[1.05, 1.08, 0.9] },
      { g:'bush', n:22, x:[8, 30], side:1, s:[0.7, 1.3], tint:[1.05, 1.1, 0.95] },
      { g:'leafy', n:10, x:[12, 22], side:1, s:[0.8, 1.2], tint:[1.05, 1.1, 0.95] },
      { g:'hedge', n:6, x:[22, 26], side:1, s:[1, 1], tint:[1, 1.05, 0.95], noRot:true },
      { g:'hay', n:8, x:[30, 60], side:1, s:[0.9, 1.1], tint:[1, 1, 1] },
      { g:'grass', n:50, x:[17.5, 28], side:-1, s:[0.8, 1.3], tint:[1.05, 1.08, 0.9] },
      { g:'leafy', n:14, x:[19, 45], side:-1, s:[0.9, 1.4], tint:[1.05, 1.1, 0.95] },
    ],
    'a2-suisse':[
      { g:'grass', n:110, x:[6.2, 20], side:1, s:[0.8, 1.3], tint:[1, 1.1, 0.95] },
      { g:'flowers', n:24, x:[7, 26], side:1, s:[0.8, 1.2], tint:[1, 1, 1] },
      { g:'rock', n:14, x:[8, 34], side:1, s:[0.6, 1.4], tint:[1, 1, 1.05] },
      { g:'conifer', n:16, x:[20, 45], side:1, s:[0.9, 1.6], tint:[1, 1.05, 1] },
      { g:'fence', n:5, x:[14, 18], side:1, s:[1, 1], tint:[1, 1, 1], noRot:true },
      { g:'grass', n:50, x:[17.5, 28], side:-1, s:[0.8, 1.3], tint:[1, 1.1, 0.95] },
      { g:'conifer', n:14, x:[20, 45], side:-1, s:[0.9, 1.6], tint:[1, 1.05, 1] },
    ],
  };

  const DENSITY = { grass:1.9, flowers:1.8, reeds:1.6, shrub:1.6, bush:1.8, rock:1.4, lavender:1.8, azalea:1.6, conifer:1.8, leafy:1.8, cypress:1.6, hedge:1, fence:1, hay:1.2, cactus:1.5 };
  const BIG = { grass:1.5, flowers:1.4, bush:1.35, azalea:1.3, lavender:1.3, shrub:1.3, rock:1.2 };
  const _mats = {};
  function mat(T){ return _mats.lam || (_mats.lam = new T.MeshLambertMaterial({ vertexColors:true })); }

  DG.DecorFill = {
    build(T, route){
      const layers = LAYERS[route.id]; if(!layers || !S() || !S().strip) return [];
      const P = 96, out = [];
      for(const L of layers){
        // (densite et taille relevees : a l'echelle de la route, des touffes d'un
        // demi-metre ne se voyaient pas — l'herbe haute borde maintenant la glissiere)
        const dens = DENSITY[L.g] || 1.5, big = BIG[L.g] || 1;
        const geo = GEO[L.g](T), [x0, x1] = L.x, s0 = L.s[0] * big, s1 = L.s[1] * big, tint = L.tint;
        out.push(S().strip(T, geo, mat(T), P, Math.round(L.n * dens), (d, c)=>{
          const side = L.side || (Math.random() < 0.5 ? -1 : 1);
          d.position.set(side * (x0 + Math.random() * (x1 - x0)), 0, -Math.random() * P);
          if(!L.noRot) d.rotation.y = Math.random() * Math.PI * 2;
          const s = s0 + Math.random() * (s1 - s0); d.scale.set(s * (0.85 + Math.random() * 0.3), s, s * (0.85 + Math.random() * 0.3));
          const j = 0.85 + Math.random() * 0.3;
          c.setRGB(Math.min(2, tint[0] * j), Math.min(2, tint[1] * j), Math.min(2, tint[2] * j));
        }));
      }
      return out;
    }
  };
})();
