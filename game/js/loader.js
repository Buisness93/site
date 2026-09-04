// Chargement des modèles GLB pour le jeu (avec cache + décodeur meshopt).
(function(){
  window.DG = window.DG || {};
  const cache = {};
  let loader = null;

  function getLoader(){
    if(loader) return loader;
    const T = window.THREE;
    const mgr = new T.LoadingManager();
    const c = document.createElement('canvas'); c.width = c.height = 4;
    const x = c.getContext('2d'); x.fillStyle = '#33383f'; x.fillRect(0,0,4,4);
    const ph = c.toDataURL();
    mgr.setURLModifier((u)=>{ if(/colormap\.png$/i.test(u) || /Textures\//i.test(u)) return ph; return u; });
    loader = new T.GLTFLoader(mgr);
    if(window.MeshoptDecoder){
      window.MeshoptDecoder.ready.then(()=>loader.setMeshoptDecoder(window.MeshoptDecoder)).catch(()=>{});
    }
    return loader;
  }

  function loadModel(url){
    if(cache[url]) return cache[url];
    cache[url] = new Promise((resolve)=>{
      getLoader().load(url,
        (g)=>resolve(g.scene || (g.scenes && g.scenes[0]) || null),
        undefined,
        (err)=>{ console.warn('GLB load failed', url, err); resolve(null); }
      );
    });
    return cache[url];
  }

  // Certains exports (Sketchfab/CGTrader) incluent un plan de sol/backdrop de leur propre
  // scene de presentation (nom/materiau "floor", "ground", "chao"...). Ce plan fausse le
  // calcul de taille (bounding box beaucoup plus grande que la voiture) et laisse un carre
  // colore visible sous le modele une fois importe dans notre scene : on le retire.
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

  function normalizeModel(T, src, targetLen, rotY){
    // src.clone(true) ne recree pas correctement les os d'un modele rigge (SkinnedMesh) :
    // le clone garde une reference vers le squelette ORIGINAL, donc il continue de se
    // dessiner selon la pose du modele source en cache, ignorant toute rotation/anim
    // appliquee au clone (la voiture "ne tourne meme pas"). SkeletonUtils.clone recree
    // aussi les os pour de vrai. On ne l'utilise que si le modele en a besoin (couteux).
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
  }

  function tintModel(T, root, color, emissiveI){
    const c = new T.Color(color);
    root.traverse(o=>{
      if(o.isMesh && o.material){
        const clone1 = (m)=>{
          const nm = m.clone();
          const lum = nm.color ? (nm.color.r+nm.color.g+nm.color.b)/3 : 1;
          if(lum > 0.16){ nm.color.copy(c); nm.map = null; }
          if(emissiveI && nm.emissive){ nm.emissive.copy(c); nm.emissiveIntensity = emissiveI; }
          nm.needsUpdate = true;
          return nm;
        };
        o.material = Array.isArray(o.material) ? o.material.map(clone1) : clone1(o.material);
      }
    });
  }

  // Certains modeles de trafic ont une peinture tres sombre (variantes "dark") ou une
  // benne/caisse noire (camion a plateau) : sur les routes de nuit, peu eclairees, ils
  // deviennent quasi invisibles, fondus dans le ciel/la route. On ajoute un leger
  // surplus emissif (additif, ne change pas la teinte d'origine) pour qu'ils restent
  // reperables meme dans les zones sombres, sans les faire "briller" artificiellement.
  function boostVisibility(T, root, amount){
    root.traverse(o=>{
      if(o.isMesh && o.material){
        const boost1 = (m)=>{
          if(!m.emissive) return m;
          m.emissive.setRGB(
            Math.max(m.emissive.r, amount),
            Math.max(m.emissive.g, amount),
            Math.max(m.emissive.b, amount * 1.08)
          );
          m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 1);
          m.needsUpdate = true;
          return m;
        };
        o.material = Array.isArray(o.material) ? o.material.map(boost1) : boost1(o.material);
      }
    });
  }

  function makeFallbackCar(T, opts){
    opts = opts || {};
    const g = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({ color: opts.body!=null?opts.body:0x161b23, metalness:0.7, roughness:0.35, emissive: opts.emissive!=null?opts.emissive:0x0a0e16, emissiveIntensity:0.4 });
    const body = new T.Mesh(new T.BoxGeometry(1.9, 0.75, 4.2), bodyMat);
    body.position.y = 0.55; g.add(body);
    const cabin = new T.Mesh(new T.BoxGeometry(1.5, 0.55, 2.0), new T.MeshStandardMaterial({ color:0x05070c, metalness:0.4, roughness:0.15 }));
    cabin.position.set(0, 1.05, -0.2); g.add(cabin);
    const wheelGeo = new T.CylinderGeometry(0.42,0.42,0.35,16);
    const wheelMat = new T.MeshStandardMaterial({ color:0x0a0a0b, metalness:0.3, roughness:0.7 });
    [[-0.95,0.42,1.4],[0.95,0.42,1.4],[-0.95,0.42,-1.4],[0.95,0.42,-1.4]].forEach(p=>{
      const w = new T.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI/2; w.position.set(p[0],p[1],p[2]); g.add(w);
    });
    g.userData.len = 4.2;
    return g;
  }

  DG.Loader = { loadModel, normalizeModel, tintModel, boostVisibility, makeFallbackCar };
})();
