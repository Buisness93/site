// Catalogue de voitures — source unique utilisee par le garage, la boutique et le jeu.
// Pour ajouter une voiture : dépose son .glb dans /uploads puis ajoute une entrée ici
// (et une ligne correspondante dans supabase/schema.sql -> cars_catalog, meme id/prix).
(function(){
  window.DG = window.DG || {};

  const TIERS = {
    debutant:   { label: 'Débutant',    color: '#8fb0c9' },
    intermediaire: { label: 'Intermédiaire', color: '#7ad1ff' },
    avance:     { label: 'Avancé',       color: '#ffcc00' },
    sportive:   { label: 'Sportive',     color: '#ff9500' },
    hypercar:   { label: 'Hypercar',     color: '#ff4d4d' },
  };

  // stats gameplay 0-10 : speed = vitesse de pointe, accel = montée en régime,
  // handling = vivacité des changements de voie, boost = efficacité du nitro.
  const CARS = [
    { id:'citadine',        brand:'Volko',       name:'Golf Citadine',   tier:'debutant',      price:0,      model:'uploads/sedan.glb',              rotY:Math.PI, glow:0x9fb4c7, body:0x2b3038, edge:0xd7dde3, stats:{speed:4, accel:4, handling:6, boost:4} },
    { id:'kart',            brand:'Loisir',      name:'Kart Sunday',     tier:'debutant',      price:800,    model:'uploads/kart-oobi.glb',          rotY:Math.PI, glow:0x66ff9f, body:0x1c3d2a, edge:0x8fffc0, stats:{speed:3, accel:6, handling:9, boost:5} },
    { id:'compacte-sport',  brand:'Volko',       name:'GTI Compacte',    tier:'intermediaire', price:2500,   model:'uploads/hatchback-sports.glb',   rotY:Math.PI, glow:0xff5a5a, body:0x241417, edge:0xff8080, stats:{speed:5, accel:6, handling:7, boost:5} },
    { id:'berline-sport',   brand:'Stellar',     name:'Berline Sport',   tier:'intermediaire', price:5000,   model:'uploads/sedan-sports.glb',       rotY:Math.PI, glow:0x7aa2ff, body:0x121826, edge:0x8fb4ff, stats:{speed:6, accel:6, handling:6, boost:6} },
    { id:'suv',             brand:'Terrago',     name:'SUV Performance', tier:'intermediaire', price:6500,   model:'uploads/suv.glb',                rotY:Math.PI, glow:0xffa63d, body:0x2a1d0f, edge:0xffbf70, stats:{speed:5, accel:5, handling:5, boost:6} },
    { id:'suv-luxe',        brand:'Terrago',     name:'SUV Luxe',        tier:'avance',        price:12000,  model:'uploads/suv-luxury.glb',         rotY:Math.PI, glow:0xffcc00, body:0x191512, edge:0xffe08a, stats:{speed:6, accel:6, handling:6, boost:7} },
    { id:'gt3',             brand:'Porsche',     name:'911 GT3',         tier:'sportive',      price:25000,  model:'uploads/gt3992.glb',             rotY:Math.PI, glow:0xd5001c, body:0x14161a, edge:0xd6dade, stats:{speed:8, accel:8, handling:8, boost:8} },
    { id:'aventador',       brand:'Lamborghini', name:'Aventador SVJ',   tier:'hypercar',      price:60000,  model:'uploads/AventadorSvj.glb',       rotY:Math.PI, glow:0xffcc00, body:0x0f0f0c, edge:0xffcc00, stats:{speed:9, accel:9, handling:8, boost:9} },
    { id:'centodieci',      brand:'Bugatti',     name:'Centodieci',      tier:'hypercar',      price:150000, model:'uploads/FV8UHMV5GHZGYVYSTV5NOKD56.glb', rotY:0, glow:0x7aa2ff, body:0x0c1220, edge:0x6fa0ff, stats:{speed:10, accel:10, handling:7, boost:10} },
  ];

  const byId = {};
  CARS.forEach(c=>byId[c.id]=c);

  DG.TIERS = TIERS;
  DG.CARS = CARS;
  DG.carById = (id)=>byId[id] || CARS[0];
  DG.defaultCarId = CARS[0].id;
})();
