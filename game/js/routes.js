// Routes jouables — chaque route ne fait que décrire son décor, le moteur
// (engine.js) reste identique. Pour ajouter une route : ajoute une entrée ici,
// avec une fonction decor() qui pose des objets recyclables des deux côtés.
(function(){
  window.DG = window.DG || {};

  function box(T, w,h,d, color, emissive, ei){
    return new T.Mesh(new T.BoxGeometry(w,h,d), new T.MeshStandardMaterial({ color, emissive: emissive!=null?emissive:0x000000, emissiveIntensity: ei||0, metalness:0.2, roughness:0.8 }));
  }

  const ROUTES = [
    {
      id:'autoroute-nuit', name:'Autoroute Nocturne', difficulty:'Standard', spacing:9,
      fog:0x0b0a1a, fogNear:26, fogFar:120,
      road:0x050609, stripe:0x39404d, edge:0x1b2129, edgeEmissive:0x0a1a3a,
      sky:{ top:0x0b0a1a, bottom:0x1a1830 },
      buildDecor(T, scene, N){
        const items = [];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const h = 6 + Math.random()*22;
          const m = box(T, 3.4, h, 3.4, 0x0e1420, 0x1a2a55, Math.random()*0.6+0.15);
          m.position.set(side*(8 + Math.random()*6), h/2, -20 - i*9);
          scene.add(m); items.push(m);
        }
        return items;
      }
    },
    {
      id:'cote-sunset', name:'Côte au Coucher du Soleil', difficulty:'Détente', spacing:8,
      fog:0x35213a, fogNear:22, fogFar:110,
      road:0x2b2320, stripe:0xf2c78a, edge:0x5a3b2c, edgeEmissive:0xff9a4d,
      sky:{ top:0x4a2a55, bottom:0xff9a5a },
      buildDecor(T, scene, N){
        const items = [];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const trunk = box(T, 0.4, 4.4, 0.4, 0x3a2a1e);
          trunk.position.set(side*(7.5+Math.random()*3), 2.2, -18 - i*8);
          scene.add(trunk);
          const leaves = box(T, 2.4, 0.5, 2.4, 0x1f5c3a, 0x2a7a4c, 0.15);
          leaves.position.set(trunk.position.x, 4.5, trunk.position.z);
          scene.add(leaves);
          items.push(trunk, leaves);
        }
        return items;
      }
    },
    {
      id:'centre-neon', name:'Centre-Ville Néon', difficulty:'Intense', spacing:8,
      fog:0x160a24, fogNear:20, fogFar:100,
      road:0x0a0714, stripe:0xff5ad1, edge:0x2a1044, edgeEmissive:0xb43dff,
      sky:{ top:0x0d0620, bottom:0x2a0f4a },
      buildDecor(T, scene, N){
        const items = [];
        const neon = [0xff3df0, 0x3df0ff, 0xffe23d, 0x7a3dff];
        for(let i=0;i<N;i++){
          const side = i % 2 === 0 ? -1 : 1;
          const h = 10 + Math.random()*28;
          const c = neon[i % neon.length];
          const m = box(T, 3.8, h, 3.8, 0x0c0a16, c, 0.55);
          m.position.set(side*(8 + Math.random()*6), h/2, -18 - i*8);
          scene.add(m); items.push(m);
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
