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

    async signInWithDiscord(){
      await DG.ready;
      if(!DG.supabase) throw new Error('Service indisponible');
      const { error } = await DG.supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.href.split('#')[0] }
      });
      if(error) throw error;
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

    // Photo de profil : recadrage carre + 256 px + compression (WebP, sinon JPEG)
    // dans le navigateur, envoi dans le bucket 'avatars' (dossier du joueur), puis
    // enregistrement de l'URL via update_avatar(). file = null : revient a
    // l'avatar du compte Discord (ou aucun).
    async updateAvatar(file){
      await DG.ready;
      if(!DG.supabase || !this.user) throw new Error('Non connecté');
      const notReady = new Error('Fonction pas encore activée : exécute la section AVATARS de supabase/schema.sql dans Supabase.');
      let url = null;
      if(file){
        if(!/^image\//.test(file.type)) throw new Error('Choisis une image (JPG, PNG, WebP…).');
        if(file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (15 Mo max).');
        const blob = await squareImage(file, 256);
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = this.user.id + '/avatar-' + Date.now() + '.' + ext;
        const up = await DG.supabase.storage.from('avatars').upload(path, blob, { contentType:blob.type, cacheControl:'31536000', upsert:false });
        if(up.error){
          if(/bucket|not found|row-level|policy|security/i.test(up.error.message || '')) throw notReady;
          throw up.error;
        }
        url = DG.supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await DG.supabase.rpc('update_avatar', { p_url: url });
      if(error){
        if(/function|update_avatar|schema cache/i.test(error.message || '')) throw notReady;
        throw error;
      }
      await this.refreshProfile();
      listeners.forEach(fn=>fn(this.user, this.profile));
      return this.avatarUrl();
    },
    discordAvatarUrl(){ return (this.user && this.user.user_metadata && this.user.user_metadata.avatar_url) || null; },

    isLoggedIn(){ return !!this.user; },
    displayName(){ return (this.profile && this.profile.username) || (this.user && this.user.email) || 'Pilote'; },
    avatarUrl(){ return this.profile && this.profile.avatar_url; }
  };

  // Recadre au centre en carre, redimensionne et compresse sous ~150 Ko.
  function squareImage(file, size){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = ()=>{
        URL.revokeObjectURL(src);
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        const tryEncode = (type, q)=>new Promise(r=>c.toBlob(b=>r(b), type, q));
        (async ()=>{
          for(const q of [0.9, 0.8, 0.65, 0.5]){
            let b = await tryEncode('image/webp', q);
            if(!b || b.type !== 'image/webp') b = await tryEncode('image/jpeg', q);
            if(b && (b.size <= 150 * 1024 || q === 0.5)) return resolve(b);
          }
        })().catch(reject);
      };
      img.onerror = ()=>{ URL.revokeObjectURL(src); reject(new Error('Image illisible.')); };
      img.src = src;
    });
  }

  DG.Auth = Auth;
})();
