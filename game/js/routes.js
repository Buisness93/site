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

  function guardrail(T, x, z, side){
    const g = new T.Group();
    const railMat = new T.MeshStandardMaterial({ color:0x9aa4ad, metalness:0.75, roughness:0.35 });
    const rail = new T.Mesh(new T.BoxGeometry(0.09, 0.32, 6.6), railMat);
    rail.position.y = 0.62; g.add(rail);
    const postMat = new T.MeshStandardMaterial({ color:0x2a2e35, metalness:0.5, roughness:0.6 });
    for(let k=-1;k<=1;k++){
      const post = new T.Mesh(new T.BoxGeometry(0.08,0.7,0.08), postMat);
      post.position.set(0, 0.35, k*2.2); g.add(post);
    }
    const reflector = new T.Mesh(new T.SphereGeometry(0.045,6,6), new T.MeshBasicMaterial({ color: side<0 ? 0xff5a3d : 0xffe27a }));
    reflector.position.set(0.08, 0.62, 0); g.add(reflector);
    g.position.set(x, 0, z);
    return g;
  }

  function pineTree(T, x, z){
    const g = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(0.13,0.18,1.3,6), new T.MeshStandardMaterial({ color:0x3a2c22, roughness:0.9 }));
    trunk.position.y = 0.65; g.add(trunk);
    const foliageMat = new T.MeshStandardMaterial({ color:0x14351f, roughness:0.85, flatShading:true });
    const tiers = 3;
    for(let i=0;i<tiers;i++){
      const s = 1 - i*0.22;
      const cone = new T.Mesh(new T.ConeGeometry(1.1*s, 1.6, 7), foliageMat);
      cone.position.y = 1.5 + i*1.05;
      g.add(cone);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(0.85 + Math.random()*0.5);
    return g;
  }

  function bush(T, x, z){
    const m = new T.Mesh(new T.SphereGeometry(0.55,7,6), new T.MeshStandardMaterial({ color:0x1f3a22, roughness:0.95, flatShading:true }));
    m.position.set(x, 0.45, z);
    m.scale.set(1, 0.75, 1);
    return m;
  }

  function duneRidge(T, x, z, w, h, hex){
    const m = new T.Mesh(new T.ConeGeometry(w, h, 5, 1), new T.MeshStandardMaterial({ color:hex, roughness:1, flatShading:true }));
    m.rotation.y = Math.random()*Math.PI;
    m.scale.set(1, 0.34, 0.7);
    m.position.set(x, 0, z);
    return m;
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

  // Plan d'ocean cote route, teinte degrade turquoise->bleu profond (meme
  // technique canvas que windowTexture) avec un reflet chaud du coucher de
  // soleil qui glisse dessus : sans ca, "la plage" n'avait pas d'eau du tout.
  let _oceanTex = null;
  function oceanTexture(T){
    if(_oceanTex) return _oceanTex;
    // Degrade le long de la largeur (route -> large) : le plan est construit avec
    // width=across-shore, height=le-long-de-la-route, et le mapping UV par defaut
    // de PlaneGeometry associe U a la largeur — le degrade doit donc etre HORIZONTAL
    // ici (sinon on obtient des bandes repetees a chaque segment le long de la route
    // au lieu d'un degrade continu vers le large).
    const c = document.createElement('canvas');
    c.width = 128; c.height = 8;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0,0,128,0);
    g.addColorStop(0, '#2fb8b0');
    g.addColorStop(0.18, '#1c8fa8');
    g.addColorStop(0.5, '#0f5a86');
    g.addColorStop(1, '#082044');
    ctx.fillStyle = g; ctx.fillRect(0,0,128,8);
    // reflet chaud pres du bord route (proche) qui s'estompe vers le large
    ctx.fillStyle = 'rgba(255,178,110,.65)';
    ctx.fillRect(6,0,5,8);
    ctx.fillStyle = 'rgba(255,205,150,.4)';
    ctx.fillRect(13,0,4,8);
    _oceanTex = new T.CanvasTexture(c);
    _oceanTex.wrapT = T.RepeatWrapping;
    return _oceanTex;
  }
  function oceanPlane(T, x, z, len){
    const tex = oceanTexture(T);
    const mat = new T.MeshBasicMaterial({ map:tex, fog:false });
    const m = new T.Mesh(new T.PlaneGeometry(46, len), mat);
    m.rotation.x = -Math.PI/2;
    m.position.set(x, 0.01, z);
    return m;
  }

  const ROUTES = [
    {
      id:'autoroute-nuit', name:'Autoroute Nocturne', difficulty:'Standard', spacing:9,
      fog:0x090b12, fogNear:30, fogFar:135, ground:0x05060a,
      road:0x0b0d12, stripe:0xd8dee6, edge:0x1b2129, edgeEmissive:0x1a2a3a,
      sky:{ top:0x020207, bottom:0x121a2e },
      light:{ key:0xaebeda, keyI:0.9, hemiSky:0x2c3a5e, hemiGround:0x05050a, hemiI:0.45, ambient:0xffffff, ambientI:0.18 },
      buildDecor(T, scene, N){
        const items = [];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const z = -12 - i*9;

          const rail = guardrail(T, side*4.35, z, side);
          scene.add(rail); items.push(rail);

          if(i % 3 === 0){
            const t = pineTree(T, side*(6.4 + Math.random()*2.4), z + 2.5);
            scene.add(t); items.push(t);
          } else if(i % 3 === 1){
            const b = bush(T, side*(5.6 + Math.random()*2), z + 1.5);
            scene.add(b); items.push(b);
          }

          if(i % 4 === 2){
            const h = 4 + Math.random()*6;
            const m = building(T, 3, h, 3, 0x0a0d14, 0x8fa8d0);
            m.position.set(side*(18 + Math.random()*12), h/2, z - 6);
            scene.add(m); items.push(m);
          }

          if(i % 5 === 0){
            const sl = streetlight(T, side*5.9, z - 3, 0xffc36b);
            scene.add(sl); items.push(sl);
          }
        }
        return items;
      }
    },
    {
      id:'cote-sunset', name:'Côte au Coucher du Soleil', difficulty:'Détente', spacing:8,
      fog:0x35213a, fogNear:24, fogFar:118, ground:0xd9b57c,
      road:0x342a24, stripe:0xf2c78a, edge:0x5a3b2c, edgeEmissive:0xff9a4d,
      sky:{ top:0x3a2350, bottom:0xff9a5a },
      light:{ key:0xffb27a, keyI:1.15, hemiSky:0xff9d6b, hemiGround:0x2a1810, hemiI:0.55, ambient:0xffcfa0, ambientI:0.3 },
      // Cote fixe : l'ocean reste toujours du meme cote de la route (comme une
      // vraie route cotiere), le sable/les palmiers de l'autre — avant, palmiers
      // et "dunes" alternaient des deux cotes sans aucune eau visible, ca ne
      // ressemblait pas a une plage.
      buildDecor(T, scene, N){
        const items = [];
        const umbrellaColors = [0xe2432f, 0x2fa6a0, 0xf2c23d, 0xe8734a, 0x3d6fd9];
        for(let i=0;i<N;i++){
          const z = -16 - i*8;

          // Ocean cote droit (+x), tuiles jointives le long de la route.
          const o = oceanPlane(T, 13 + 23, z, 9.3);
          scene.add(o); items.push(o);

          // Cote gauche (-x) : sable avec palmiers/parasols pres de la route,
          // quelques dunes plus loin pour casser la ligne d'horizon plate.
          if(i % 7 === 6){
            const d = duneRidge(T, -(16+Math.random()*8), z, 8+Math.random()*5, 6+Math.random()*4, 0xc9a869);
            scene.add(d); items.push(d);
          } else if(i % 3 === 1){
            const u = beachUmbrella(T, -(6.5+Math.random()*2.5), z + (Math.random()*2-1), umbrellaColors[i % umbrellaColors.length]);
            scene.add(u); items.push(u);
          } else {
            const p = palmTree(T, -(7.5+Math.random()*3.5), z);
            scene.add(p); items.push(p);
          }

          // Une poignee de palmiers/parasols cote ocean, entre la route et l'eau,
          // pour eviter la coupure trop nette route -> mer.
          if(i % 4 === 2){
            const p2 = palmTree(T, 6.5 + Math.random()*3, z + 3);
            scene.add(p2); items.push(p2);
          }
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
