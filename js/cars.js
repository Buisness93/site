// Catalogue de voitures — source unique utilisee par le garage, la boutique et le jeu.
// Uniquement les voitures bien modelisees (.glb realistes). Trie du pire au meilleur.
// Pour ajouter une voiture : depose son .glb dans /uploads, ajoute une entree ici,
// puis une ligne correspondante dans supabase/schema.sql -> cars_catalog (meme id/prix),
// a re-executer dans le SQL Editor de Supabase.
(function(){
  window.DG = window.DG || {};

  const TIERS = {
    debutant:   { label: 'Débutant',    color: '#8fb0c9' },
    avance:     { label: 'Avancé',       color: '#ffcc00' },
    sportive:   { label: 'Sportive',     color: '#ff9500' },
    hypercar:   { label: 'Hypercar',     color: '#ff4d4d' },
  };

  // stats gameplay 0-10, basees sur les vraies caracteristiques (0-100, V-max, agilite) :
  // speed = vitesse de pointe atteignable en jeu, accel = vitesse pour l'atteindre,
  // handling = vivacité des changements de voie, boost = efficacité du nitro.
  const CARS = [
    { id:'citadine',        brand:'Peugeot',     name:'405 GLX',           tier:'debutant', price:0,      model:'uploads/peugeot-405.glb',              rotY:-Math.PI/2, glow:0x9fb4c7, body:0x2b3038, stats:{speed:2, accel:2, handling:4, boost:2} },
    { id:'golf-r',          brand:'Volkswagen',  name:'Golf R',            tier:'avance',   price:7500,   model:'uploads/golf-r.glb',                   rotY:0, glow:0x3d6bff, body:0x0c1424, stats:{speed:6, accel:7, handling:7, boost:6} },
    { id:'audi-a8',         brand:'Audi',        name:'A8',                tier:'avance',   price:13000,  model:'uploads/audi-a8.glb',                  rotY:Math.PI, glow:0xc7ccd4, body:0x14161a, stats:{speed:7, accel:6, handling:6, boost:7} },
    { id:'rs6-abt',         brand:'Audi / ABT',  name:'RS6-R',             tier:'sportive', price:26000,  model:'uploads/audi-rs6-abt.glb',             rotY:0, glow:0xff2d2d, body:0x100c0c, stats:{speed:8, accel:8, handling:7, boost:8} },
    { id:'812-competizione', brand:'Ferrari',    name:'812 Competizione',  tier:'hypercar', price:60000,  model:'uploads/ferrari-812-competizione.glb', rotY:0, glow:0xff1a1a, body:0x140505, stats:{speed:9, accel:9, handling:9, boost:9} },
    { id:'pagani-huayra-r',  brand:'Pagani',     name:'Huayra R',          tier:'hypercar', price:88000,  model:'uploads/pagani-huayra-r.glb',          rotY:Math.PI, glow:0xc0392b, body:0x120c08, stats:{speed:9.4, accel:9, handling:8, boost:10} },
    { id:'mclaren-p1',      brand:'McLaren',     name:'P1',                tier:'hypercar', price:145000, model:'uploads/mclaren-p1.glb',               rotY:0, glow:0xff8a00, body:0x0a0a0a, stats:{speed:9.7, accel:10, handling:8, boost:10} },
    { id:'laferrari',       brand:'Ferrari',     name:'LaFerrari',         tier:'hypercar', price:175000, model:'uploads/ferrari-laferrari.glb',        rotY:0, glow:0xff0000, body:0x140505, stats:{speed:10, accel:10, handling:9, boost:10} },
  ];

  const byId = {};
  CARS.forEach(c=>byId[c.id]=c);

  DG.TIERS = TIERS;
  DG.CARS = CARS;
  DG.carById = (id)=>byId[id] || CARS[0];
  DG.defaultCarId = CARS[0].id;
})();
