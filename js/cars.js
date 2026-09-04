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
    { id:'citadine',              brand:'Peugeot',     name:'405 GLX',                    tier:'debutant', price:0,      model:'uploads/peugeot-405.glb',                    rotY:-Math.PI/2, glow:0x9fb4c7, body:0x2b3038, stats:{speed:2,    accel:2,   handling:4,   boost:2} },
    { id:'audi-a3',                brand:'Audi',        name:'A3',                         tier:'debutant', price:4000,   model:'uploads/audi-a3.glb',                        rotY:Math.PI, glow:0x8fb0c9, body:0x1c1e22, stats:{speed:3.5,  accel:3.5, handling:5,   boost:3} },
    { id:'golf-r',                 brand:'Volkswagen',  name:'Golf R',                     tier:'avance',   price:7500,   model:'uploads/golf-r.glb',                         rotY:0, glow:0x3d6bff, body:0x0c1424, stats:{speed:6,    accel:7,   handling:7,   boost:6} },
    { id:'audi-a8',                brand:'Audi',        name:'A8',                         tier:'avance',   price:13000,  model:'uploads/audi-a8.glb',                        rotY:Math.PI, glow:0xc7ccd4, body:0x14161a, stats:{speed:7,    accel:6,   handling:6,   boost:7} },
    { id:'supra',                  brand:'Toyota',      name:'GR Supra',                   tier:'sportive', price:16000,  model:'uploads/toyota_supra_dekztrax_34.glb',       rotY:0, glow:0xff6a00, body:0x140806, stats:{speed:6.5,  accel:6.8, handling:7.8, boost:6} },
    { id:'m4-widebody',            brand:'BMW',         name:'M4 Widebody',                tier:'sportive', price:20000,  model:'uploads/bmw_m4_widebody__www.vecarz.com.glb', rotY:0, glow:0x7a5cff, body:0x101014, stats:{speed:7.2,  accel:7.5, handling:7.6, boost:6.5} },
    { id:'porsche-911',            brand:'Porsche',     name:'911',                        tier:'sportive', price:24000,  model:'uploads/porsche_911_with_interior.glb',      rotY:0, glow:0xc9d3da, body:0x101215, stats:{speed:7,    accel:7.2, handling:8,   boost:6.2} },
    { id:'rs6-abt',                brand:'Audi / ABT',  name:'RS6-R',                      tier:'sportive', price:26000,  model:'uploads/audi-rs6-abt.glb',                   rotY:0, glow:0xff2d2d, body:0x100c0c, stats:{speed:8,    accel:8,   handling:7,   boost:8} },
    { id:'huracan-performante',    brand:'Lamborghini', name:'Huracán Performante',        tier:'sportive', price:45000,  model:'uploads/lamborghini-huracan-performante.glb', rotY:0, glow:0xff8c00, body:0x1a1204, stats:{speed:8.4,  accel:8.6, handling:8.5, boost:8} },
    { id:'gt3-rs',                 brand:'Porsche',     name:'911 GT3 RS',                 tier:'sportive', price:52000,  model:'uploads/2023_porsche_911_gt3_rs_2.7_carrera_tribute_992.glb', rotY:0, glow:0xff6b00, body:0x0c0c0c, stats:{speed:8.3,  accel:8.5, handling:9.3, boost:8} },
    { id:'812-competizione',       brand:'Ferrari',     name:'812 Competizione',           tier:'hypercar', price:60000,  model:'uploads/ferrari-812-competizione.glb',       rotY:0, glow:0xff1a1a, body:0x140505, stats:{speed:8.7,  accel:9,   handling:9,   boost:9} },
    { id:'aston-one77',            brand:'Aston Martin', name:'One-77',                    tier:'hypercar', price:65000,  model:'uploads/2010_aston_martin_one-77.glb',       rotY:0, glow:0x2f8f5c, body:0x0a0f0c, stats:{speed:8.8,  accel:8.8, handling:8.3, boost:8.7} },
    { id:'aventador-svj',          brand:'Lamborghini', name:'Aventador SVJ',              tier:'hypercar', price:82000,  model:'uploads/lamborghini-aventador-svj.glb',      rotY:0, glow:0x2fea6a, body:0x0c1408, stats:{speed:8.9,  accel:9.2, handling:8.7, boost:9.3} },
    { id:'pagani-huayra-r',        brand:'Pagani',      name:'Huayra R',                   tier:'hypercar', price:88000,  model:'uploads/pagani-huayra-r.glb',                rotY:0, glow:0xc0392b, body:0x120c08, stats:{speed:9.05, accel:9,   handling:8,   boost:10} },
    { id:'huayra-roadster',        brand:'Pagani',      name:'Huayra Roadster',            tier:'hypercar', price:92000,  model:'uploads/updated_pagani_huayra_roadster.glb', rotY:0, glow:0xd98a3d, body:0x140f08, stats:{speed:9,    accel:8.9, handling:8,   boost:9.5} },
    { id:'centenario',             brand:'Lamborghini', name:'Centenario Roadster',        tier:'hypercar', price:95000,  model:'uploads/lamborghini_centenario_roadster_sdc.glb', rotY:0, glow:0xff9d2f, body:0x121212, stats:{speed:9.1,  accel:9.5, handling:8.6, boost:9.2} },
    { id:'huayra-bc',              brand:'Pagani',      name:'Huayra BC',                  tier:'hypercar', price:110000, model:'uploads/2016_pagani_huayra_bc.glb',          rotY:0, glow:0x3d6fd9, body:0x0a0d14, stats:{speed:9.15, accel:9.3, handling:8.5, boost:9.6} },
    { id:'daytona-sp3',            brand:'Ferrari',     name:'Daytona SP3',                tier:'hypercar', price:120000, model:'uploads/ferrari-daytona-sp3.glb',            rotY:0, glow:0xff2200, body:0x140505, stats:{speed:9.2,  accel:9.4, handling:8.8, boost:9.4} },
    { id:'pagani-imola',           brand:'Pagani',      name:'Imola',                      tier:'hypercar', price:135000, model:'uploads/2021_pagani_imola.glb',              rotY:0, glow:0x3dd94f, body:0x0a1408, stats:{speed:9.3,  accel:9.5, handling:8.8, boost:9.7} },
    { id:'mclaren-p1',             brand:'McLaren',     name:'P1',                         tier:'hypercar', price:145000, model:'uploads/mclaren-p1.glb',                     rotY:0, glow:0xff8a00, body:0x0a0a0a, stats:{speed:9.35, accel:10,  handling:8,   boost:10} },
    { id:'laferrari',              brand:'Ferrari',     name:'LaFerrari',                  tier:'hypercar', price:175000, model:'uploads/ferrari-laferrari.glb',              rotY:0, glow:0xff0000, body:0x140505, stats:{speed:9.5,  accel:10,  handling:9,   boost:10} },
    { id:'gma-t50',                brand:'Gordon Murray', name:'T.50',                     tier:'hypercar', price:195000, model:'uploads/2023_gordon_murray_automotive_t.50.glb', rotY:0, glow:0x3dd9c8, body:0x0d1414, stats:{speed:9.4,  accel:9.5, handling:9.4, boost:8.8} },
    { id:'aston-valhalla',         brand:'Aston Martin', name:'Valhalla',                  tier:'hypercar', price:210000, model:'uploads/2025_aston_martin_valhalla.glb',     rotY:0, glow:0xaaff2f, body:0x0a0b08, stats:{speed:9.55, accel:9.9, handling:9.2, boost:9.7} },
    { id:'revuelto',               brand:'Lamborghini', name:'Revuelto',                   tier:'hypercar', price:220000, model:'uploads/lamborghini_revuelto_duke_dynamics.glb', rotY:0, glow:0x39ff6a, body:0x081208, stats:{speed:9.6,  accel:9.85, handling:9.1, boost:9.5} },
    { id:'chiron',                 brand:'Bugatti',     name:'Chiron',                     tier:'hypercar', price:230000, model:'uploads/bugatti-chiron.glb',                 rotY:0, glow:0x2244ff, body:0x0a0d1a, stats:{speed:9.65, accel:9.6, handling:7.5, boost:9.6} },
    { id:'veyron-ettore',          brand:'Bugatti',     name:'Veyron Legend Ettore',       tier:'hypercar', price:280000, model:'uploads/bugatti-veyron-ettore.glb',          rotY:0, glow:0xe8d98a, body:0x0d0d0d, stats:{speed:9.75, accel:9.5, handling:7.3, boost:9.7} },
    { id:'w16-mistral',            brand:'Bugatti',     name:'W16 Mistral',                tier:'hypercar', price:340000, model:'uploads/bugatti-w16-mistral.glb',            rotY:0, glow:0x3dd6ff, body:0x0a1418, stats:{speed:9.85, accel:9.7, handling:7.6, boost:9.8} },
    { id:'centodieci',             brand:'Bugatti',     name:'Centodieci',                 tier:'hypercar', price:420000, model:'uploads/bugatti-centodieci.glb',             rotY:0, glow:0xf2f2f2, body:0x101010, stats:{speed:9.93, accel:9.8, handling:8,   boost:9.9} },
    { id:'bolide',                 brand:'Bugatti',     name:'Bolide',                     tier:'hypercar', price:520000, model:'uploads/bugatti-bolide.glb',                 rotY:0, glow:0x3dff8f, body:0x081008, stats:{speed:10,   accel:10,  handling:9,   boost:10} },
  ];

  // Defi du jour : voiture imposee + objectif de score, identiques pour tout le
  // monde et qui changent chaque jour (calcul deterministe, aucun serveur requis
  // pour l'afficher). L'ordre de cette liste doit rester identique a celui utilise
  // par la fonction SQL claim_daily_challenge() (supabase/schema.sql) : si tu
  // ajoutes une voiture ici, ajoute-la aussi la-bas, au meme endroit dans la liste.
  const DAILY_CAR_IDS = CARS.map(c=>c.id);
  function dailyChallenge(){
    const days = Math.floor(Date.now() / 86400000);
    const idx = ((days % DAILY_CAR_IDS.length) + DAILY_CAR_IDS.length) % DAILY_CAR_IDS.length;
    return { days, carId: DAILY_CAR_IDS[idx], target: 300 + (days % 5) * 50, reward: 250 };
  }

  const byId = {};
  CARS.forEach(c=>byId[c.id]=c);

  // Note globale 0-1 basee sur les 4 stats -> multiplicateur de score (jusqu'a
  // quasi x2 avec la meilleure voiture). Utilisee par le moteur (engine.js) et
  // par l'affichage du garage/choix de voiture pour montrer l'enjeu au joueur.
  function carScoreFactor(car){
    const s = car.stats;
    const rating = (s.speed + s.accel + s.handling + s.boost) / 40;
    return 1 + rating;
  }

  DG.TIERS = TIERS;
  DG.CARS = CARS;
  DG.carById = (id)=>byId[id] || CARS[0];
  DG.defaultCarId = CARS[0].id;
  DG.carScoreFactor = carScoreFactor;
  DG.dailyChallenge = dailyChallenge;
})();
