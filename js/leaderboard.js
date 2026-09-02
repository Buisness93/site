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

  function rowHTML(entry, i){
    const car = DG.carById ? DG.carById(entry.car) : null;
    const rankColor = RANK_COLORS[i] || (i < 10 ? '#9fb4c7' : '#8a8f98');
    const time = entry.time_seconds != null ? Number(entry.time_seconds).toFixed(1) + 's' : '—';
    return (
      '<div class="leaderboard-row" style="background:' + (i % 2 === 0 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.015)') + '">' +
        '<span class="rank" style="color:' + rankColor + '">#' + (i+1) + '</span>' +
        '<span class="name">' + escapeHTML(entry.name || 'Pilote') + '</span>' +
        '<span class="meta">' + (car ? escapeHTML(car.name) : '—') + '</span>' +
        '<span class="meta">' + time + '</span>' +
        '<span class="score">' + entry.score + '</span>' +
      '</div>'
    );
  }

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  DG.Leaderboard = { fetchBoard, rowHTML, escapeHTML };
})();
