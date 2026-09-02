// Catalogue de voitures — source unique utilisee par le garage, la boutique et le jeu.
// Trie du pire au meilleur : plus une voiture est haut dans la liste, plus elle est
// performante (et chere). Pour ajouter une voiture : depose son .glb dans /uploads,
// ajoute une entree ici, puis une ligne correspondante dans supabase/schema.sql ->
// cars_catalog (meme id/prix), a re-executer dans le SQL Editor de Supabase.
(function(){
  window.DG = window.DG || {};

  const TIERS = {
    debutant:   { label: 'Débutant',    color: '#8fb0c9' },
    intermediaire: { label: 'Intermédiaire', color: '#7ad1ff' },
    avance:     { label: 'Avancé',       color: '#ffcc00' },
    sportive:   { label: 'Sportive',     color: '#ff9500' },
    hypercar:   { label: 'Hypercar',     color: '#ff4d4d' },
  };

  // stats gameplay 0-10, basees sur les vraies caracteristiques (0-100, V-max, agilite) :
  // speed = vitesse de pointe atteignable en jeu, accel = vitesse pour l'atteindre,
  // handling = vivacité des changements de voie, boost = efficacité du nitro.
  const CARS = [
    { id:'citadine',       brand:'Peugeot',     name:'405 GLX',           tier:'debutant',      price:0,      model:'uploads/peugeot-405.glb',            rotY:Math.PI, glow:0x9fb4c7, body:0x2b3038, stats:{speed:2, accel:2, handling:4, boost:2} },
    { id:'kart',           brand:'Loisir',      name:'Kart Sunday',       tier:'debutant',      price:800,    model:'uploads/kart-oobi.glb',              rotY:Math.PI, glow:0x66ff9f, body:0x1c3d2a, stats:{speed:3, accel:6, handling:9, boost:5} },
    { id:'compacte-sport', brand:'Volko',       name:'GTI Compacte',      tier:'intermediaire', price:2500,   model:'uploads/hatchback-sports.glb',       rotY:Math.PI, glow:0xff5a5a, body:0x241417, stats:{speed:5, accel:6, handling:7, boost:5} },
    { id:'berline-sport',  brand:'Stellar',     name:'Berline Sport',     tier:'intermediaire', price:5000,   model:'uploads/sedan-sports.glb',           rotY:Math.PI, glow:0x7aa2ff, body:0x121826, stats:{speed:6, accel:6, handling:6, boost:6} },
    { id:'suv',            brand:'Terrago',     name:'SUV Performance',   tier:'intermediaire', price:6500,   model:'uploads/suv.glb',                    rotY:Math.PI, glow:0xffa63d, body:0x2a1d0f, stats:{speed:5, accel:5, handling:5, boost:6} },
    { id:'golf-r',         brand:'Volkswagen',  name:'Golf R',            tier:'avance',        price:9500,   model:'uploads/golf-r.glb',                 rotY:0, glow:0x3d6bff, body:0x0c1424, stats:{speed:6, accel:7, handling:7, boost:6} },
    { id:'suv-luxe',       brand:'Terrago',     name:'SUV Luxe',          tier:'avance',        price:12000,  model:'uploads/suv-luxury.glb',             rotY:Math.PI, glow:0xffcc00, body:0x191512, stats:{speed:6, accel:6, handling:6, boost:7} },
    { id:'audi-a8',        brand:'Audi',        name:'A8',                tier:'avance',        price:16000,  model:'uploads/audi-a8.glb',                rotY:Math.PI, glow:0xc7ccd4, body:0x14161a, stats:{speed:7, accel:6, handling:6, boost:7} },
    { id:'gt3',            brand:'Porsche',     name:'911 GT3',           tier:'sportive',      price:25000,  model:'uploads/gt3992.glb',                 rotY:Math.PI, glow:0xd5001c, body:0x14161a, stats:{speed:8, accel:8, handling:9, boost:8} },
    { id:'rs6-abt',        brand:'Audi / ABT',  name:'RS6-R',             tier:'sportive',      price:32000,  model:'uploads/audi-rs6-abt.glb',           rotY:0, glow:0xff2d2d, body:0x100c0c, stats:{speed:8, accel:8, handling:7, boost:8} },
    { id:'aventador',      brand:'Lamborghini', name:'Aventador SVJ',     tier:'hypercar',      price:60000,  model:'uploads/AventadorSvj.glb',           rotY:Math.PI, glow:0xffcc00, body:0x0f0f0c, stats:{speed:9, accel:9, handling:8, boost:9} },
    { id:'812-competizione', brand:'Ferrari',   name:'812 Competizione',  tier:'hypercar',      price:75000,  model:'uploads/ferrari-812-competizione.glb', rotY:0, glow:0xff1a1a, body:0x140505, stats:{speed:9, accel:9, handling:9, boost:9} },
    { id:'pagani-huayra-r', brand:'Pagani',     name:'Huayra R',          tier:'hypercar',      price:110000, model:'uploads/pagani-huayra-r.glb',        rotY:Math.PI, glow:0xc0392b, body:0x120c08, stats:{speed:10, accel:9, handling:8, boost:10} },
    { id:'centodieci',     brand:'Bugatti',     name:'Centodieci',        tier:'hypercar',      price:150000, model:'uploads/FV8UHMV5GHZGYVYSTV5NOKD56.glb', rotY:0, glow:0x7aa2ff, body:0x0c1220, stats:{speed:10, accel:10, handling:7, boost:10} },
    { id:'mclaren-p1',     brand:'McLaren',     name:'P1',                tier:'hypercar',      price:180000, model:'uploads/mclaren-p1.glb',             rotY:0, glow:0xff8a00, body:0x0a0a0a, stats:{speed:10, accel:10, handling:8, boost:10} },
    { id:'laferrari',      brand:'Ferrari',     name:'LaFerrari',         tier:'hypercar',      price:220000, model:'uploads/ferrari-laferrari.glb',      rotY:0, glow:0xff0000, body:0x140505, stats:{speed:10, accel:10, handling:9, boost:10} },
  ];

  const byId = {};
  CARS.forEach(c=>byId[c.id]=c);

  DG.TIERS = TIERS;
  DG.CARS = CARS;
  DG.carById = (id)=>byId[id] || CARS[0];
  DG.defaultCarId = CARS[0].id;
})();
