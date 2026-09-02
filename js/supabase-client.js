// Client Supabase partage par tout le site + le jeu.
// Charge le SDK Supabase (CDN) puis expose window.DG.supabase + window.DG.SUPABASE_READY.
(function(){
  const SUPABASE_URL = 'https://uzzlhtaeoybonwljjgge.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_743-QuJyPStJRpC7s61Y1w_4KSRT6YT';

  window.DG = window.DG || {};
  DG.SUPABASE_URL = SUPABASE_URL;
  DG.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  DG.SUPABASE_READY = !SUPABASE_URL.includes('YOUR-PROJECT');
  DG.ready = new Promise((resolve)=>{ DG._resolveReady = resolve; });

  function init(){
    if(window.supabase && window.supabase.createClient){
      DG.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
    DG._resolveReady();
  }

  if(window.supabase){ init(); }
  else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = init;
    s.onerror = ()=>{ DG.SUPABASE_READY = false; DG._resolveReady(); };
    document.head.appendChild(s);
  }
})();
