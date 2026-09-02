// Authentification (Supabase Auth) — inscription, connexion, session, profil.
(function(){
  window.DG = window.DG || {};
  const listeners = [];

  const Auth = {
    user: null,
    profile: null,

    async init(){
      await DG.ready;
      if(!DG.supabase) return;
      const { data } = await DG.supabase.auth.getSession();
      await this._applySession(data && data.session);
      DG.supabase.auth.onAuthStateChange((_evt, session)=>{ this._applySession(session); });
    },

    async _applySession(session){
      this.user = (session && session.user) || null;
      this.profile = null;
      if(this.user){ await this.refreshProfile(); }
      listeners.forEach(fn=>fn(this.user, this.profile));
    },

    onChange(fn){ listeners.push(fn); if(this.user!==null || DG.SUPABASE_READY===false) fn(this.user, this.profile); },

    async refreshProfile(){
      if(!this.user || !DG.supabase) return null;
      const { data, error } = await DG.supabase.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
      if(!error) this.profile = data;
      return this.profile;
    },

    async signUp(email, password, username){
      await DG.ready;
      if(!DG.supabase) throw new Error('Service indisponible');
      const { data, error } = await DG.supabase.auth.signUp({
        email, password, options:{ data:{ username: (username||'').slice(0,16) } }
      });
      if(error) throw error;
      return data;
    },

    async signIn(email, password){
      await DG.ready;
      if(!DG.supabase) throw new Error('Service indisponible');
      const { data, error } = await DG.supabase.auth.signInWithPassword({ email, password });
      if(error) throw error;
      await this._applySession(data.session);
      return data;
    },

    async signOut(){
      await DG.ready;
      if(!DG.supabase) return;
      await DG.supabase.auth.signOut();
      await this._applySession(null);
    },

    async updateUsername(username){
      await DG.ready;
      if(!DG.supabase || !this.user) throw new Error('Non connecté');
      const { error } = await DG.supabase.rpc('update_username', { p_username: username });
      if(error) throw error;
      await this.refreshProfile();
    },

    isLoggedIn(){ return !!this.user; },
    displayName(){ return (this.profile && this.profile.username) || (this.user && this.user.email) || 'Pilote'; }
  };

  DG.Auth = Auth;
})();
