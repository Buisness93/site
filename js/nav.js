// Navigation partagée + démarrage commun (thème, auth, économie) pour toutes les
// pages du site principal. Chaque page inclut : <div id="site-nav" data-active="...">
(function(){
  const THEMES = [
    { id:'obsidian', label:'Obsidian', ring:'linear-gradient(135deg,#e6edf2,#4d6478)' },
    { id:'ivoire', label:'Ivoire', ring:'linear-gradient(135deg,#e6c17d,#8a611f)' },
    { id:'carmin', label:'Carmin', ring:'linear-gradient(135deg,#ff9f80,#8f1912)' },
  ];

  function getTheme(){
    try { const t = localStorage.getItem('dg_theme'); if(THEMES.some(x=>x.id===t)) return t; } catch(e){}
    return 'obsidian';
  }
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('dg_theme', t); } catch(e){}
  }
  setTheme(getTheme());

  const LINKS = [
    { href:'index.html', label:'Accueil' },
    { href:'garage.html', label:'Garage' },
    { href:'classement.html', label:'Classement' },
    { href:'radio.html', label:'Radio' },
    { href:'compte.html', label:'Compte' },
  ];

  function currentPage(){
    const p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function render(mount){
    const active = mount.dataset.active || currentPage();
    const themeBtns = THEMES.map(t=>(
      '<button class="navbtn" data-theme-pick="' + t.id + '" style="display:flex;align-items:center;gap:10px;justify-content:flex-start">' +
        '<span style="width:16px;height:16px;border-radius:50%;background:' + t.ring + ';box-shadow:0 0 0 2px ' + (getTheme()===t.id ? '#fff' : 'transparent') + ' inset"></span>' + t.label +
      '</button>'
    )).join('');

    mount.innerHTML =
      '<nav class="navbar">' +
        '<a href="index.html" class="brand">' +
          '<div class="brand-mark"><span>D</span></div>' +
          '<div><div class="brand-name">DEYLO GARAGE</div><div class="brand-sub">Supercars · 3D</div></div>' +
        '</a>' +
        '<div class="nav-links" id="dgNavLinks">' +
          LINKS.map(l=>'<a href="' + l.href + '" class="' + (l.href===active?'active':'') + '">' + l.label + '</a>').join('') +
          '<div style="position:relative">' +
            '<button class="navbtn" id="dgThemeToggle">🎨 Thème</button>' +
            '<div id="dgThemeMenu" style="display:none;position:absolute;top:calc(100% + 8px);left:0;background:#0d0f14ee;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;flex-direction:column;gap:4px;min-width:170px;backdrop-filter:blur(14px);z-index:50">' + themeBtns + '</div>' +
          '</div>' +
          '<a href="game/index.html" class="nav-cta">▶ Jouer</a>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="nav-money" id="dgMoney" title="Crédits">🪙 —</div>' +
          '<button class="nav-burger" id="dgBurger">☰</button>' +
        '</div>' +
      '</nav>';

    document.getElementById('dgBurger').addEventListener('click', ()=>{
      document.getElementById('dgNavLinks').classList.toggle('open');
    });
    const themeToggle = document.getElementById('dgThemeToggle');
    const themeMenu = document.getElementById('dgThemeMenu');
    themeToggle.addEventListener('click', (e)=>{ e.stopPropagation(); themeMenu.style.display = themeMenu.style.display==='none'?'flex':'none'; });
    document.addEventListener('click', ()=>{ themeMenu.style.display='none'; });
    mount.querySelectorAll('[data-theme-pick]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ setTheme(btn.getAttribute('data-theme-pick')); render(mount); });
    });

    const moneyEl = document.getElementById('dgMoney');
    if(window.DG && DG.Economy){
      DG.Economy.onChange((state)=>{ moneyEl.textContent = '🪙 ' + state.money.toLocaleString('fr-FR'); });
    }
  }

  function boot(){
    const mount = document.getElementById('site-nav');
    if(mount) render(mount);
  }

  async function start(){
    if(window.DG && DG.Auth && DG.Economy){
      await DG.Auth.init();
      await DG.Economy.init();
    }
    boot();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.DG = window.DG || {};
  DG.Theme = { get:getTheme, set:setTheme };
})();
