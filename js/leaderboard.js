// Classement en ligne (table Supabase `leaderboard`, alimentée par submit_run()).
(function(){
  window.DG = window.DG || {};

  const RANK_COLORS = ['#ffcc00', '#cfd6df', '#d98a52'];

  async function fetchBoard(limit){
    limit = limit || 25;
    if(!DG.supabase || !DG.SUPABASE_READY) return [];
    try{
      const { data, error } = await DG.supabase
        .from('leaderboard')
        .select('name,score,car,time_seconds,route_id,created_at')
        .order('score', { ascending:false })
        .limit(limit * 4); // marge pour dédupliquer par joueur
      if(error || !Array.isArray(data)) return [];
      const byName = {};
      for(const row of data){ if(!byName[row.name] || row.score > byName[row.name].score) byName[row.name] = row; }
      return Object.values(byName).sort((a,b)=>b.score-a.score).slice(0, limit);
    } catch(e){ return []; }
  }

  // Teinte stable par pseudo, pour l'avatar a initiale
  function hue(name){ let h = 0; for(const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function myName(){ try { return DG.Auth && DG.Auth.isLoggedIn() ? DG.Auth.displayName() : null; } catch(e){ return null; } }

  function rowHTML(entry, i){
    const car = DG.carById ? DG.carById(entry.car) : null;
    const rankColor = RANK_COLORS[i] || (i < 10 ? 'var(--accent-light)' : 'var(--text-3)');
    const time = entry.time_seconds != null ? Number(entry.time_seconds).toFixed(1) + 's' : '—';
    const isTop3 = i < 3;
    const name = entry.name || 'Pilote';
    const me = myName() && myName() === entry.name;
    const cls = 'leaderboard-row' + (isTop3 ? ' top3 rank-' + (i+1) : '') + (me ? ' me' : '');
    const bg = isTop3 ? '' : ' style="background:' + (i % 2 === 0 ? 'rgba(var(--line-rgb),.035)' : 'rgba(var(--line-rgb),.015)') + '"';
    const carName = car ? escapeHTML(car.name) : '—';
    return (
      '<div class="' + cls + '"' + bg + '>' +
        '<span class="rank" style="color:' + rankColor + '">#' + (i+1) + '</span>' +
        '<span class="who"><span class="av" style="--h:' + hue(name) + '">' + escapeHTML(name.charAt(0).toUpperCase()) + '</span>' +
          '<span style="min-width:0"><span class="name">' + escapeHTML(name) + (me ? '<span class="you">VOUS</span>' : '') + '</span>' +
          '<span class="sub">' + carName + ' · ' + time + '</span></span></span>' +
        '<span class="meta">' + carName + '</span>' +
        '<span class="meta" style="min-width:56px">' + time + '</span>' +
        '<span class="score">' + Number(entry.score).toLocaleString('fr-FR') + '</span>' +
      '</div>'
    );
  }

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  DG.Leaderboard = { fetchBoard, rowHTML, escapeHTML, hue };
})();
