// Briques procedurales du decor (textures canvas, geometries fusionnees,
// bandes instanciees qui bouclent, silhouettes lointaines). Tout est genere
// une fois puis partage : aucun telechargement, aucune allocation par frame.
(function(){
  window.DG = window.DG || {};
  const S = {};
  const cache = {};

  function cv(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function css(hex, a){
    const r = (hex>>16)&255, g = (hex>>8)&255, b = hex&255;
    return a == null ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function lerpHex(a, b, t){
    const ar=(a>>16)&255, ag=(a>>8)&255, ab=a&255, br=(b>>16)&255, bg=(b>>8)&255, bb=b&255;
    return (Math.round(ar+(br-ar)*t)<<16) | (Math.round(ag+(bg-ag)*t)<<8) | Math.round(ab+(bb-ab)*t);
  }
  S.css = css; S.lerpHex = lerpHex;

  // Bruit 1D lisse et periodique (period points) : profils de montagnes/collines.
  function noise1(period, seed){
    const tbl = []; let s = seed || 1;
    for(let i=0;i<period;i++){ s = (s*16807) % 2147483647; tbl.push(s/2147483647); }
    return (x)=>{
      const i = Math.floor(x), f = x - i, a = tbl[((i%period)+period)%period], b = tbl[(((i+1)%period)+period)%period];
      const u = f*f*(3-2*f); return a + (b-a)*u;
    };
  }

  function tex(T, c, opts){
    const t = new T.CanvasTexture(c);
    if(opts && opts.repeat){ t.wrapS = t.wrapT = T.RepeatWrapping; }
    if(opts && opts.wrapT){ t.wrapT = T.RepeatWrapping; }
    t.anisotropy = (opts && opts.aniso) || 1;
    // couleurs dessinees = couleurs affichees (sinon la sortie sRGB les eclaircit)
    if(opts && opts.srgb) t.encoding = T.sRGBEncoding;
    return t;
  }
  // Couleur "hex" three.js (lineaire en r128) -> hex sRGB equivalent a l'ecran :
  // pour peindre dans un canvas sRGB une teinte identique au brouillard.
  function lin2srgb(hex){
    const f = (v)=>{ v /= 255; v = v <= 0.0031308 ? v*12.92 : 1.055*Math.pow(v, 1/2.4) - 0.055; return Math.round(Math.min(1, v)*255); };
    return (f((hex>>16)&255)<<16) | (f((hex>>8)&255)<<8) | f(hex&255);
  }
  S.lin2srgb = lin2srgb;

  // ---------- Petites textures partagees ----------
  S.glow = function(T){
    if(cache.glow) return cache.glow;
    const [c, g] = cv(64, 64);
    const gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.3,'rgba(255,255,255,.38)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0,0,64,64);
    return (cache.glow = tex(T, c));
  };
  // Tache de lumiere au sol (sous un lampadaire) : tres douce, sans point chaud.
  S.pool = function(T){
    if(cache.pool) return cache.pool;
    const [c, g] = cv(64, 64);
    const gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(.45,'rgba(255,255,255,.42)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0,0,64,64);
    return (cache.pool = tex(T, c));
  };
  // Reflet etire sur chaussee mouillee : fort au pied de la source (v=1), qui
  // s'etire et s'effiloche vers le spectateur, zebre de petites vaguelettes.
  S.streak = function(T){
    if(cache.streak) return cache.streak;
    const [c, g] = cv(32, 128);
    const img = g.createImageData(32, 128);
    for(let y=0;y<128;y++){
      const v = 1 - y/127; // haut du canvas = v 1 (loin, pied de la source)
      const along = Math.pow(v, 1.6) * (0.65 + 0.35*Math.sin(y*0.9 + Math.sin(y*0.23)*3));
      for(let x=0;x<32;x++){
        const u = (x-15.5)/15.5;
        const across = Math.exp(-u*u*(3.5 + (1-v)*5));
        const a = Math.max(0, Math.min(1, along*across*1.25));
        const k = (y*32+x)*4;
        img.data[k]=img.data[k+1]=img.data[k+2]=255; img.data[k+3]=Math.round(a*255);
      }
    }
    g.putImageData(img, 0, 0);
    return (cache.streak = tex(T, c));
  };
  S.cloud = function(T){
    if(cache.cloud) return cache.cloud;
    const [c, g] = cv(256, 96);
    for(let i=0;i<46;i++){
      const x = 30 + Math.random()*196, y = 42 + (Math.random()-.5)*26*(1 - Math.abs(x-128)/128);
      const r = 10 + Math.random()*26*(1 - Math.abs(x-128)/170);
      const gr = g.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,'rgba(255,255,255,.34)'); gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x-r,y-r,r*2,r*2);
    }
    return (cache.cloud = tex(T, c));
  };
  S.moon = function(T){
    if(cache.moon) return cache.moon;
    const [c, g] = cv(128, 128);
    g.save(); g.beginPath(); g.arc(64,64,54,0,Math.PI*2); g.clip();
    const base = g.createRadialGradient(52,50,6,64,64,58);
    base.addColorStop(0,'#fbfaf3'); base.addColorStop(.75,'#dcdde2'); base.addColorStop(1,'#a9aebd');
    g.fillStyle = base; g.fillRect(0,0,128,128);
    [[46,48,15,.16],[74,40,11,.13],[80,72,17,.14],[52,82,10,.12],[64,62,7,.1],[90,54,6,.1],[38,68,6,.12]].forEach(([x,y,r,a])=>{
      const gr = g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(90,96,120,'+a+')'); gr.addColorStop(1,'rgba(90,96,120,0)');
      g.fillStyle = gr; g.fillRect(x-r,y-r,r*2,r*2);
    });
    g.restore();
    const halo = g.createRadialGradient(64,64,50,64,64,64);
    halo.addColorStop(0,'rgba(220,228,255,.55)'); halo.addColorStop(1,'rgba(220,228,255,0)');
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = halo; g.fillRect(0,0,128,128);
    return (cache.moon = tex(T, c, { srgb:true }));
  };
  S.sun = function(T){
    if(cache.sun) return cache.sun;
    const [c, g] = cv(256, 256);
    const halo = g.createRadialGradient(128,128,90,128,128,128);
    halo.addColorStop(0,'rgba(255,190,120,.6)'); halo.addColorStop(1,'rgba(255,150,90,0)');
    g.fillStyle = halo; g.fillRect(0,0,256,256);
    g.save(); g.beginPath(); g.arc(128,128,96,0,Math.PI*2); g.clip();
    const lin = g.createLinearGradient(0,32,0,224);
    lin.addColorStop(0,'#fff7d6'); lin.addColorStop(.45,'#ffd27a'); lin.addColorStop(.8,'#ff8a4a'); lin.addColorStop(1,'#ff5e3a');
    g.fillStyle = lin; g.fillRect(0,0,256,256);
    // fines bandes de brume devant le disque bas (soleil couchant a travers l'air chaud)
    g.globalCompositeOperation = 'destination-out';
    for(let i=0;i<6;i++){ const y = 150 + i*13; g.fillStyle = 'rgba(0,0,0,' + (0.18 + i*0.07) + ')'; g.fillRect(0, y, 256, 3 + i*0.9); }
    g.restore();
    return (cache.sun = tex(T, c, { srgb:true }));
  };

  // ---------- Textures de sol (niveaux de gris, teintees par la couleur du materiau) ----------
  S.grassTex = function(T){
    if(cache.grass) return cache.grass;
    const [c, g] = cv(128, 128);
    const img = g.createImageData(128,128);
    for(let i=0;i<img.data.length;i+=4){ const v = 170 + Math.random()*60; img.data[i]=v*0.92; img.data[i+1]=v; img.data[i+2]=v*0.9; img.data[i+3]=255; }
    g.putImageData(img,0,0);
    for(let i=0;i<60;i++){ const x=Math.random()*128, y=Math.random()*128, r=3+Math.random()*9; g.fillStyle='rgba(0,0,0,'+(0.08+Math.random()*0.14)+')'; g.beginPath(); g.ellipse(x,y,r,r*0.6,Math.random()*3,0,Math.PI*2); g.fill(); }
    for(let i=0;i<40;i++){ const x=Math.random()*128, y=Math.random()*128, r=2+Math.random()*5; g.fillStyle='rgba(255,255,255,'+(0.05+Math.random()*0.08)+')'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); }
    return (cache.grass = tex(T, c, { repeat:true, aniso:4 }));
  };
  S.sandTex = function(T){
    if(cache.sand) return cache.sand;
    const [c, g] = cv(128, 128);
    const img = g.createImageData(128,128);
    for(let y=0;y<128;y++) for(let x=0;x<128;x++){
      const rip = Math.sin((y + Math.sin(x*0.098)*4) * 0.49) * 0.5 + 0.5; // vaguelettes de vent, periodiques sur 128px
      const v = 196 + rip*34 + Math.random()*22;
      const i = (y*128+x)*4; img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255;
    }
    g.putImageData(img,0,0);
    return (cache.sand = tex(T, c, { repeat:true, aniso:4 }));
  };
  // Dalles de trottoir (centre-ville) : joints sombres, dalles legerement inegales.
  S.slabTex = function(T){
    if(cache.slab) return cache.slab;
    const [c, g] = cv(128, 128);
    g.fillStyle = '#2a2530'; g.fillRect(0,0,128,128);
    for(let y=0;y<2;y++) for(let x=0;x<2;x++){
      const v = 150 + Math.random()*50;
      g.fillStyle = 'rgb(' + (v*0.92|0) + ',' + (v*0.9|0) + ',' + v + ')';
      g.fillRect(x*64+2, y*64+2, 60, 60);
    }
    const img = g.getImageData(0,0,128,128);
    for(let i=0;i<img.data.length;i+=4){ const n = (Math.random()-.5)*26; img.data[i]+=n; img.data[i+1]+=n; img.data[i+2]+=n; }
    g.putImageData(img,0,0);
    return (cache.slab = tex(T, c, { repeat:true, aniso:4 }));
  };
  // Bord de mer : sable mouille qui fonce, puis liseré d'ecume dentele (u = travers,
  // v = le long de la route, periodique pour boucler sans couture).
  S.foamTex = function(T){
    if(cache.foam) return cache.foam;
    const W = 128, H = 128;
    const [c, g] = cv(W, H);
    const img = g.createImageData(W, H);
    for(let y=0;y<H;y++){
      const edge = 0.64 + 0.05*Math.sin(y/H*Math.PI*2*3) + 0.025*Math.sin(y/H*Math.PI*2*7 + 1.3);
      for(let x=0;x<W;x++){
        const u = x/(W-1); const i = (y*W+x)*4;
        let r=60, gg=46, b=36, a=0;
        if(u < edge){ a = Math.pow(u/edge, 1.6) * 0.5; }
        const d = u - edge;
        if(d > -0.035 && d < 0.1){
          const f = Math.max(0, 1 - Math.abs(d-0.01)/0.09) * (0.55 + Math.random()*0.45);
          r = gg = b = 255; a = Math.max(a, f*0.95);
        } else if(d >= 0.1 && d < 0.3 && Math.random() < 0.18*(1-(d-0.1)/0.2)){
          r = gg = b = 240; a = 0.55;
        }
        img.data[i]=r; img.data[i+1]=gg; img.data[i+2]=b; img.data[i+3]=Math.round(a*255);
      }
    }
    g.putImageData(img,0,0);
    const t = tex(T, c, { wrapT:true, aniso:4 });
    return (cache.foam = t);
  };
  S.sparkleTex = function(T){
    if(cache.sparkle) return cache.sparkle;
    const [c, g] = cv(64, 128);
    g.fillStyle = '#000'; g.fillRect(0,0,64,128);
    for(let i=0;i<150;i++){
      const x = Math.random()*64, y = Math.random()*128, w = 2 + Math.random()*9, a = 0.35 + Math.random()*0.65;
      g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(x - w/2, y, w, 1 + (Math.random() < .3 ? 1 : 0));
    }
    return (cache.sparkle = tex(T, c, { repeat:true }));
  };

  // ---------- Enseignes neon ----------
  // Enseigne "drapeau" verticale : lettres empilees, tube neon lumineux.
  S.bladeSignTex = function(T, text, colorHex){
    const key = 'blade:' + text + ':' + colorHex;
    if(cache[key]) return cache[key];
    const [c, g] = cv(64, 256);
    g.fillStyle = '#0b0714'; g.fillRect(0,0,64,256);
    const col = css(colorHex);
    g.shadowColor = col; g.shadowBlur = 10;
    g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(5,5,54,246);
    g.fillStyle = '#ffffff';
    const chars = Array.from(text);
    const step = Math.min(56, 232 / chars.length);
    g.font = '900 ' + Math.round(step*0.82) + 'px "Saira Condensed", Arial Narrow, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    chars.forEach((ch, i)=>{ g.shadowBlur = 14; g.fillStyle = col; g.fillText(ch, 32, 14 + step*(i+0.5)); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(ch, 32, 14 + step*(i+0.5)); });
    return (cache[key] = tex(T, c, { aniso:4, srgb:true }));
  };
  S.bannerTex = function(T, text, colorHex){
    const key = 'banner:' + text + ':' + colorHex;
    if(cache[key]) return cache[key];
    const [c, g] = cv(512, 96);
    g.fillStyle = '#07040d'; g.fillRect(0,0,512,96);
    const col = css(colorHex);
    g.shadowColor = col; g.shadowBlur = 16; g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(8,8,496,80);
    g.font = '900 58px "Saira Condensed", Arial Narrow, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = col; g.fillText(text, 256, 50); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(text, 256, 50);
    return (cache[key] = tex(T, c, { aniso:4, srgb:true }));
  };

  // Carte d'environnement "rue neon" (equirectangulaire) : sert aux reflets de
  // la chaussee/trottoirs mouilles, passee dans un PMREM une seule fois.
  S.neonEnvCanvas = function(T){
    const [c, g] = cv(512, 256);
    const sky = g.createLinearGradient(0,0,0,256);
    sky.addColorStop(0,'#05020b'); sky.addColorStop(.45,'#22103a'); sky.addColorStop(.52,'#3a1656'); sky.addColorStop(1,'#07040c');
    g.fillStyle = sky; g.fillRect(0,0,512,256);
    const cols = ['#ff3df0','#3df0ff','#ffe23d','#7a3dff','#3dffb0','#ff5a8a'];
    for(let i=0;i<70;i++){
      const x = Math.random()*512, w = 4 + Math.random()*22, top = 70 + Math.random()*55, h = 4 + Math.random()*28;
      g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.5 + Math.random()*0.5;
      g.fillRect(x, top, w, h);
    }
    g.globalAlpha = 1;
    for(let i=0;i<14;i++){ const x = Math.random()*512; g.fillStyle = 'rgba(255,220,170,.9)'; g.beginPath(); g.arc(x, 60 + Math.random()*30, 3, 0, Math.PI*2); g.fill(); }
    const t = new T.CanvasTexture(c);
    t.mapping = T.EquirectangularReflectionMapping;
    t.encoding = T.sRGBEncoding;
    return t;
  };

  // ---------- Geometries ----------
  // Fusionne plusieurs primitives (chacune avec sa couleur de sommet) en UNE
  // geometrie non indexee a normales plates : un arbre = 1 seul appel de dessin.
  S.merge = function(T, parts){
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(), col = new T.Color();
    const list = []; let total = 0;
    parts.forEach(pt=>{
      const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
      const r = pt.rot || [0,0,0], ps = pt.pos || [0,0,0], sc = pt.scale || [1,1,1];
      e.set(r[0], r[1], r[2]); q.setFromEuler(e); p.set(ps[0], ps[1], ps[2]); s.set(sc[0], sc[1], sc[2]);
      m.compose(p, q, s); g.applyMatrix4(m);
      list.push({ g, c: pt.color == null ? 0xffffff : pt.color });
      total += g.attributes.position.count;
      pt.geo.dispose();
    });
    const pos = new Float32Array(total*3), cols = new Float32Array(total*3);
    let o = 0;
    list.forEach(({g, c})=>{
      const a = g.attributes.position.array; pos.set(a, o*3);
      col.setHex(c);
      for(let i=0;i<a.length/3;i++){ cols[(o+i)*3] = col.r; cols[(o+i)*3+1] = col.g; cols[(o+i)*3+2] = col.b; }
      o += a.length/3; g.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('color', new T.BufferAttribute(cols, 3));
    out.computeVertexNormals();
    return out;
  };

  // Bande de decor instanciee qui boucle sans couture : on compose UNE tuile de
  // longueur P (place() pose chaque instance, z local dans [-P, 0]), repetee K
  // fois vers l'avant. L'objet defile avec le reste du decor et recule de
  // exactement P (userData.wrapDist) quand il depasse la camera : comme le
  // motif est periodique, le saut est invisible. 1 appel de dessin par bande.
  S.strip = function(T, geo, mat, P, perTile, place, cover){
    const K = Math.ceil((cover || 210) / P) + 1;
    const d = new T.Object3D(), c = new T.Color(), mtx = new T.Matrix4();
    const base = []; let colored = false;
    for(let i=0;i<perTile;i++){
      d.position.set(0,0,0); d.rotation.set(0,0,0); d.scale.set(1,1,1); c.setRGB(1,1,1);
      if(place(d, c, i) === false) continue;
      if(c.r !== 1 || c.g !== 1 || c.b !== 1) colored = true;
      d.updateMatrix();
      base.push({ m:d.matrix.clone(), c:c.clone() });
    }
    const im = new T.InstancedMesh(geo, mat, Math.max(1, base.length*K));
    let n = 0;
    for(let t=0;t<K;t++){
      const off = P - t*P;
      for(const b of base){
        mtx.copy(b.m); mtx.elements[14] += off;
        im.setMatrixAt(n, mtx);
        if(colored) im.setColorAt(n, b.c);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false; // bornes = geometrie de base seule, pas les instances
    im.position.z = 29.9;
    im.userData.wrapDist = P;
    return im;
  };

  // ---------- Silhouettes lointaines (montagnes, collines, skyline) ----------
  // Bande cylindrique autour de la camera (arc avant de 252 deg), texture canvas
  // opaque decoupee en alphaTest : dessinee dans la passe opaque, elle masque
  // correctement les etoiles/astres qui passent derriere. Le pied de chaque
  // silhouette se fond dans la couleur de brume (= couleur de l'horizon du ciel).
  const TH0 = Math.PI*0.3, THL = Math.PI*1.4;
  // angle signe depuis l'avant (-Z) : < 0 = a droite (+X), > 0 = a gauche (-X)
  S.silhouette = function(T, opts){
    const W = opts.width || 2048, H = 256;
    const [c, g] = cv(W, H);
    const angOf = (x)=> TH0 + (x/W)*THL - Math.PI;
    const horizonPx = H - ((opts.eye || 4.2) - opts.yBase) / opts.height * H; // ligne d'horizon dans le canvas
    const profile = [];
    for(let x=0;x<W;x++) profile.push(opts.profile(angOf(x), x));
    const toPx = (h)=> horizonPx - h / opts.height * H;
    g.beginPath(); g.moveTo(0, H);
    for(let x=0;x<W;x++) g.lineTo(x, toPx(profile[x]));
    g.lineTo(W, H); g.closePath();
    const grad = g.createLinearGradient(0, toPx(opts.peak || opts.height*0.6), 0, horizonPx + 2);
    grad.addColorStop(0, css(opts.top)); grad.addColorStop(1, css(lin2srgb(opts.bottom)));
    g.fillStyle = grad; g.fill();
    if(opts.rim){
      g.strokeStyle = css(opts.rim, opts.rimA || 0.5); g.lineWidth = 1.5;
      g.beginPath(); for(let x=0;x<W;x++){ const y = toPx(profile[x]) + 1; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    if(opts.decorate) opts.decorate(g, { W, H, profile, toPx, horizonPx, angOf });
    const t = tex(T, c, { srgb:true });
    t.anisotropy = 2;
    const geo = new T.CylinderGeometry(opts.radius, opts.radius, opts.height, 64, 1, true, TH0, THL);
    const mat = new T.MeshBasicMaterial({ map:t, side:T.BackSide, fog:false, alphaTest:0.5 });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.y = opts.yBase + opts.height/2;
    // convertit un point du canvas (px, py) en position monde (pour y accrocher un feu clignotant)
    mesh.userData.worldAt = (px, py)=>{
      const th = TH0 + (px/W)*THL, r = opts.radius*0.985;
      return new T.Vector3(Math.sin(th)*r, opts.yBase + (1 - py/H)*opts.height, Math.cos(th)*r);
    };
    return mesh;
  };
  S.fbm = function(seed){
    const n1 = noise1(64, seed), n2 = noise1(64, seed*3+7), n3 = noise1(64, seed*7+13);
    return (x)=> n1(x)*0.58 + n2(x*2.1)*0.28 + n3(x*4.3)*0.14;
  };
  S.ridged = function(seed){
    const n1 = noise1(64, seed), n2 = noise1(64, seed*5+3), n3 = noise1(64, seed*11+1);
    const r = (v)=> 1 - Math.abs(v*2 - 1);
    return (x)=> r(n1(x))*0.6 + r(n2(x*2.3))*0.27 + n3(x*5.1)*0.13;
  };

  DG.Scenery = S;
})();
