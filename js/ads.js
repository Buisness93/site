// Pont vers un fournisseur de publicités récompensées.
// Aucun fournisseur n'est branché par défaut : tant que c'est le cas, le bouton
// "Regarder une pub" reste visible mais désactivé avec un message clair, plutôt
// que d'afficher une fausse pub qui ne rapporterait rien de réel.
//
// Pour brancher un vrai fournisseur plus tard (ex: Google Ad Manager, AdSense for
// Games, une régie rewarded-video web) : remplace le contenu de `provider.show()`
// pour lancer réellement la pub, et n'appelle `onReward()` que si le fournisseur
// confirme que la vidéo a été vue jusqu'au bout.
(function(){
  window.DG = window.DG || {};

  const provider = {
    configured: false, // passe à true quand un vrai SDK est branché ici
    async show(){
      throw new Error('Aucun fournisseur de publicité n\'est configuré pour le moment.');
    }
  };

  DG.Ads = {
    isAvailable(){ return provider.configured; },
    async watch(){
      if(!provider.configured) return { ok:false, error:"Publicités bientôt disponibles — aucun fournisseur n'est encore branché." };
      try{
        await provider.show();
        const res = await DG.Economy.claimAdReward();
        return res;
      } catch(e){ return { ok:false, error: e.message }; }
    }
  };
})();
