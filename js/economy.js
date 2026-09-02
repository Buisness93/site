// Portefeuille + garage débloqué. Fonctionne hors connexion (localStorage) et se
// synchronise automatiquement avec Supabase dès qu'un compte est connecté.
(function(){
  window.DG = window.DG || {};
  const GUEST_MONEY_KEY = 'dg_guest_money';
  const GUEST_CARS_KEY = 'dg_guest_cars';
  const GUEST_AD_KEY = 'dg_guest_last_ad';
  const GUEST_START_MONEY = 500;

  function readGuestMoney(){
    try { const v = parseInt(localStorage.getItem(GUEST_MONEY_KEY), 10); return isNaN(v) ? GUEST_START_MONEY : v; }
    catch(e){ return GUEST_START_MONEY; }
  }
  function writeGuestMoney(v){ try { localStorage.setItem(GUEST_MONEY_KEY, String(v)); } catch(e){} }
  function readGuestCars(){
    try { const a = JSON.parse(localStorage.getItem(GUEST_CARS_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function writeGuestCars(a){ try { localStorage.setItem(GUEST_CARS_KEY, JSON.stringify(a)); } catch(e){} }

  const listeners = [];
  const Economy = {
    money: GUEST_START_MONEY,
    unlocked: [DG.defaultCarId || 'citadine'],

    async init(){
      this._load();
      DG.Auth.onChange(()=>{ this._load(); });
    },

    _load(){
      if(DG.Auth.isLoggedIn() && DG.Auth.profile){
        this.money = DG.Auth.profile.money;
        this._loadPlayerCars();
      } else {
        this.money = readGuestMoney();
        this.unlocked = Array.from(new Set([DG.defaultCarId, ...readGuestCars()]));
      }
      this._emit();
    },

    async _loadPlayerCars(){
      if(!DG.supabase || !DG.Auth.user) return;
      const { data, error } = await DG.supabase.from('player_cars').select('car_id').eq('user_id', DG.Auth.user.id);
      if(!error && data){ this.unlocked = Array.from(new Set([DG.defaultCarId, ...data.map(r=>r.car_id)])); this._emit(); }
    },

    onChange(fn){ listeners.push(fn); },
    _emit(){ listeners.forEach(fn=>fn({ money:this.money, unlocked:this.unlocked })); },

    isUnlocked(carId){ return this.unlocked.indexOf(carId) !== -1; },

    async buyCar(carId){
      const car = DG.carById(carId);
      if(this.isUnlocked(carId)) return { ok:true };
      if(DG.Auth.isLoggedIn()){
        try{
          const { data, error } = await DG.supabase.rpc('claim_car', { p_car_id: carId });
          if(error) throw error;
          this.money = data;
          this.unlocked.push(carId);
          this._emit();
          return { ok:true };
        } catch(e){ return { ok:false, error: e.message || 'Achat impossible' }; }
      } else {
        if(this.money < car.price) return { ok:false, error:'Argent insuffisant' };
        this.money -= car.price;
        writeGuestMoney(this.money);
        const cars = readGuestCars(); cars.push(carId); writeGuestCars(cars);
        this.unlocked.push(carId);
        this._emit();
        return { ok:true };
      }
    },

    // Appelé en fin de partie : alimente le classement + crédite l'argent gagné.
    async recordRun({ name, score, carId, timeSeconds, routeId }){
      let credits = Math.max(5, Math.floor(score/10));
      if(DG.supabase && DG.SUPABASE_READY){
        try{
          const { data, error } = await DG.supabase.rpc('submit_run', {
            p_name:name, p_score:score, p_car:carId, p_time:timeSeconds, p_route:routeId
          });
          if(!error && typeof data === 'number') credits = data;
        } catch(e){}
      }
      if(DG.Auth.isLoggedIn()){
        await DG.Auth.refreshProfile();
        this.money = DG.Auth.profile ? DG.Auth.profile.money : this.money;
      } else {
        this.money += credits;
        writeGuestMoney(this.money);
      }
      this._emit();
      return credits;
    },

    // Publicité récompensée volontaire (voir js/ads.js pour l'intégration fournisseur).
    async claimAdReward(){
      if(DG.Auth.isLoggedIn()){
        try{
          const { data, error } = await DG.supabase.rpc('claim_ad_reward');
          if(error) throw error;
          this.money = data; this._emit();
          return { ok:true, amount:150 };
        } catch(e){ return { ok:false, error: e.message }; }
      }
      let last = 0;
      try { last = parseInt(localStorage.getItem(GUEST_AD_KEY),10) || 0; } catch(e){}
      if(Date.now() - last < 60000) return { ok:false, error:'Réessayez dans un instant' };
      this.money += 100;
      writeGuestMoney(this.money);
      try { localStorage.setItem(GUEST_AD_KEY, String(Date.now())); } catch(e){}
      this._emit();
      return { ok:true, amount:100 };
    }
  };

  DG.Economy = Economy;
})();
