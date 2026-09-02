// Routes jouables — chaque route ne fait que décrire son décor + son ambiance
// (sol, ciel, lumières), le moteur (engine.js) reste identique. Pour ajouter une
// route : ajoute une entrée ici, avec une fonction decor() qui pose des objets
// recyclables des deux côtés de la route.
(function(){
  window.DG = window.DG || {};

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

  function streetlight(T, x, z, headColor){
    const g = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(0.07,0.09,4.2,6), new T.MeshStandardMaterial({ color:0x14161c, metalness:0.6, roughness:0.5 }));
    pole.position.y = 2.1; g.add(pole);
    const arm = new T.Mesh(new T.BoxGeometry(0.9,0.08,0.08), new T.MeshStandardMaterial({ color:0x14161c, metalness:0.6, roughness:0.5 }));
    arm.position.set(x<0?0.45:-0.45, 4.15, 0); g.add(arm);
    const head = new T.Mesh(new T.SphereGeometry(0.16,10,8), new T.MeshBasicMaterial({ color:headColor }));
    head.position.set(x<0?0.85:-0.85, 4.1, 0); g.add(head);
    const glow = new T.PointLight(headColor, 0.9, 9);
    glow.position.copy(head.position); glow.position.y -= 0.05; g.add(glow);
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

  function duneRidge(T, x, z, w, h, hex){
    const m = new T.Mesh(new T.ConeGeometry(w, h, 5, 1), new T.MeshStandardMaterial({ color:hex, roughness:1, flatShading:true }));
    m.rotation.y = Math.random()*Math.PI;
    m.scale.set(1, 0.34, 0.7);
    m.position.set(x, 0, z);
    return m;
  }

  const ROUTES = [
    {
      id:'autoroute-nuit', name:'Autoroute Nocturne', difficulty:'Standard', spacing:9,
      fog:0x0b0a1a, fogNear:26, fogFar:120, ground:0x06070d,
      road:0x050609, stripe:0x39404d, edge:0x1b2129, edgeEmissive:0x0a1a3a,
      sky:{ top:0x05050f, bottom:0x1c1a35 },
      light:{ key:0xcfd8ff, keyI:1.0, hemiSky:0x6a7fd6, hemiGround:0x05050a, hemiI:0.5, ambient:0xffffff, ambientI:0.22 },
      buildDecor(T, scene, N){
        const items = [];
        const lits = [0xffcf7a, 0x8fd0ff, 0xffb3e0];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const h = 7 + Math.random()*24;
          const lit = lits[i % lits.length];
          const m = building(T, 3.4, h, 3.4, 0x0b0e16, lit);
          m.position.set(side*(9 + Math.random()*7), h/2, -20 - i*9);
          scene.add(m); items.push(m);
          if(i % 2 === 0){
            const sl = streetlight(T, side*5.7, -14 - i*9, 0xbcd4ff);
            scene.add(sl); items.push(sl);
          }
        }
        return items;
      }
    },
    {
      id:'cote-sunset', name:'Côte au Coucher du Soleil', difficulty:'Détente', spacing:8,
      fog:0x35213a, fogNear:24, fogFar:118, ground:0x2a2018,
      road:0x342a24, stripe:0xf2c78a, edge:0x5a3b2c, edgeEmissive:0xff9a4d,
      sky:{ top:0x3a2350, bottom:0xff9a5a },
      light:{ key:0xffb27a, keyI:1.15, hemiSky:0xff9d6b, hemiGround:0x2a1810, hemiI:0.55, ambient:0xffcfa0, ambientI:0.3 },
      buildDecor(T, scene, N){
        const items = [];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          if(i % 5 === 4){
            const d = duneRidge(T, side*(16+Math.random()*10), -16-i*8, 9+Math.random()*6, 7+Math.random()*5, 0x241a3a);
            scene.add(d); items.push(d);
            continue;
          }
          const p = palmTree(T, side*(7.5+Math.random()*3.5), -16 - i*8);
          scene.add(p); items.push(p);
        }
        return items;
      }
    },
    {
      id:'centre-neon', name:'Centre-Ville Néon', difficulty:'Intense', spacing:8,
      fog:0x160a24, fogNear:20, fogFar:104, ground:0x0a0714,
      road:0x0a0714, stripe:0xff5ad1, edge:0x2a1044, edgeEmissive:0xb43dff,
      sky:{ top:0x0a0518, bottom:0x321248 },
      light:{ key:0xb98cff, keyI:1.0, hemiSky:0xb43dff, hemiGround:0x0a0518, hemiI:0.55, ambient:0xff9dfa, ambientI:0.26 },
      buildDecor(T, scene, N){
        const items = [];
        const neon = [0xff3df0, 0x3df0ff, 0xffe23d, 0x7a3dff, 0x3dffb0];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const h = 11 + Math.random()*30;
          const c = neon[i % neon.length];
          const m = building(T, 3.9, h, 3.9, 0x0a0812, c);
          m.position.set(side*(9 + Math.random()*7), h/2, -18 - i*8);
          scene.add(m); items.push(m);
          const sl = streetlight(T, side*5.9, -12 - i*8, neon[(i+2) % neon.length]);
          scene.add(sl); items.push(sl);
        }
        return items;
      }
    }
  ];

  const byId = {}; ROUTES.forEach(r=>byId[r.id]=r);
  DG.ROUTES = ROUTES;
  DG.routeById = (id)=>byId[id] || ROUTES[0];
  DG.defaultRouteId = ROUTES[0].id;
})();
