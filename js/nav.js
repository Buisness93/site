// Navigation partagée + démarrage commun (thème, auth, économie) pour toutes les
// pages du site principal. Chaque page inclut : <div id="site-nav" data-active="...">
// et, en bas, <footer class="footer" id="site-footer"></footer> (rempli ici).
(function(){
  const THEMES = [
    { id:'obsidian', label:'Obsidian', ring:'linear-gradient(135deg,#e6edf2,#4d6478)' },
    { id:'emeraude', label:'Émeraude', ring:'linear-gradient(135deg,#7dffb8,#0e5c34)' },
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
    { href:'index.html', label:'Accueil', icon:'🏠' },
    { href:'garage.html', label:'Garage', icon:'🔑' },
    { href:'classement.html', label:'Classement', icon:'🏆' },
    { href:'radio.html', label:'Radio', icon:'📻' },
    { href:'compte.html', label:'Compte', icon:'👤' },
  ];

  const ICON_PALETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15.5" cy="7.5" r="1.2"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';

  function currentPage(){
    return location.pathname.split('/').pop() || 'index.html';
  }

  function render(mount){
    const active = mount.dataset.active || currentPage();
    const cur = getTheme();
    const themeBtns = THEMES.map(t=>(
      '<button type="button" data-theme-pick="' + t.id + '" class="' + (cur===t.id?'on':'') + '">' +
        '<span class="sw" style="background:' + t.ring + '"></span>' + t.label + '<span class="ck">✓</span>' +
      '</button>'
    )).join('');

    mount.innerHTML =
      '<nav class="navbar" aria-label="Navigation principale">' +
        '<a href="index.html" class="brand" aria-label="Deylo Garage — accueil">' +
          '<div class="brand-mark"><span>D</span></div>' +
          '<div><div class="brand-name">DEYLO GARAGE</div><div class="brand-sub">Supercars · 3D</div></div>' +
        '</a>' +
        '<div class="nav-links" id="dgNavLinks">' +
          '<span class="nav-pill" aria-hidden="true"></span>' +
          LINKS.map(l=>'<a href="' + l.href + '" class="' + (l.href===active?'active':'') + '"' + (l.href===active?' aria-current="page"':'') + '><span class="ni">' + l.icon + '</span>' + l.label + '</a>').join('') +
        '</div>' +
        '<div class="nav-right">' +
          '<a href="compte.html" class="nav-avatar" id="dgAvatar" title="Mon compte"><img src="" alt=""></a>' +
          '<a href="garage.html" class="nav-money" id="dgMoney" title="Vos crédits"><span class="coin" aria-hidden="true"></span><span id="dgMoneyVal">—</span></a>' +
          '<div class="nav-theme" style="position:relative">' +
            '<button type="button" class="nav-icon" id="dgThemeToggle" aria-haspopup="true" aria-expanded="false" title="Changer de thème">' + ICON_PALETTE + '</button>' +
            '<div class="theme-menu" id="dgThemeMenu" role="menu"><div class="tm-title">Thème</div>' + themeBtns + '</div>' +
          '</div>' +
          '<a href="game/index.html" class="nav-cta" data-magnetic>' + ICON_PLAY + '<span class="lbl">Jouer</span></a>' +
          '<button type="button" class="nav-icon nav-burger" id="dgBurger" aria-label="Menu" aria-expanded="false"><div><span></span><span></span><span></span></div></button>' +
        '</div>' +
      '</nav>';

    const links = document.getElementById('dgNavLinks');
    const burger = document.getElementById('dgBurger');
    burger.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = links.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
    });
    const themeToggle = document.getElementById('dgThemeToggle');
    const themeMenu = document.getElementById('dgThemeMenu');
    themeToggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = themeMenu.classList.toggle('open');
      themeToggle.setAttribute('aria-expanded', open);
    });
    if(!document.__dgNavDocBound){
      document.__dgNavDocBound = true;
      document.addEventListener('click', (e)=>{
        const m = document.getElementById('dgThemeMenu');
        if(m && !e.target.closest('#dgThemeMenu')) m.classList.remove('open');
        const l = document.getElementById('dgNavLinks'), b = document.getElementById('dgBurger');
        if(l && l.classList.contains('open') && !e.target.closest('#dgNavLinks')){ l.classList.remove('open'); if(b) b.classList.remove('open'); }
      });
      document.addEventListener('keydown', (e)=>{
        if(e.key !== 'Escape') return;
        const m = document.getElementById('dgThemeMenu'); if(m) m.classList.remove('open');
        const l = document.getElementById('dgNavLinks'); if(l) l.classList.remove('open');
        const b = document.getElementById('dgBurger'); if(b) b.classList.remove('open');
      });
    }
    mount.querySelectorAll('[data-theme-pick]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ setTheme(btn.getAttribute('data-theme-pick')); render(mount); });
    });

    // Pastille qui glisse sous le lien survole (bureau uniquement)
    const pill = links.querySelector('.nav-pill');
    const activeLink = links.querySelector('a.active');
    function movePill(a){
      if(!a || innerWidth <= 900){ pill.style.opacity = 0; return; }
      pill.style.opacity = 1;
      pill.style.width = a.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }
    links.querySelectorAll('a').forEach(a=>a.addEventListener('mouseenter', ()=>movePill(a)));
    links.addEventListener('mouseleave', ()=>movePill(activeLink));
    requestAnimationFrame(()=>{ pill.style.transition = 'none'; movePill(activeLink); requestAnimationFrame(()=>{ pill.style.transition = ''; }); });
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>movePill(activeLink));
    addEventListener('resize', ()=>movePill(activeLink));

    paintMoney();
    paintAvatar();
  }

  // Les ecouteurs sont poses une seule fois et relisent le DOM a chaque appel :
  // la nav est re-rendue a chaque changement de theme.
  let econReady = false, listenersBound = false;
  function paintMoney(){
    const el = document.getElementById('dgMoneyVal');
    if(el && econReady && window.DG && DG.Economy) el.textContent = DG.Economy.money.toLocaleString('fr-FR');
  }
  function paintAvatar(){
    const avatarEl = document.getElementById('dgAvatar');
    if(!avatarEl || !window.DG || !DG.Auth) return;
    const url = DG.Auth.avatarUrl && DG.Auth.avatarUrl();
    if(url){ avatarEl.querySelector('img').src = url; avatarEl.style.display = 'block'; }
    else { avatarEl.style.display = 'none'; }
  }
  function bindListeners(){
    if(listenersBound || !window.DG) return;
    listenersBound = true;
    if(DG.Economy) DG.Economy.onChange(()=>{ econReady = true; paintMoney(); });
    if(DG.Auth) DG.Auth.onChange(paintAvatar);
  }

  function renderFooter(){
    const f = document.getElementById('site-footer');
    if(!f) return;
    const year = new Date().getFullYear();
    f.innerHTML =
      '<div class="footer-in">' +
        '<div class="footer-brand"><div class="fb">DEYLO<span>·</span>GARAGE</div>' +
          '<p>Un showroom 3D de supercars et un mini-jeu de réflexes : jouez, gagnez des crédits, débloquez les voitures de vos rêves.</p>' +
          '<a href="game/index.html" class="btn btn-soft btn-sm" style="margin-top:16px">▶ Lancer une partie</a></div>' +
        '<div class="footer-col"><h4>Explorer</h4>' + LINKS.slice(0,4).map(l=>'<a href="' + l.href + '">' + l.label + '</a>').join('') + '</div>' +
        '<div class="footer-col"><h4>Joueur</h4><a href="compte.html">Mon compte</a><a href="game/index.html">Le jeu</a><a href="classement.html">Top 25</a></div>' +
      '</div>' +
      '<div class="footer-bottom"><span>© ' + year + ' Deylo Garage</span><span>Showroom WebGL · Marques citées à titre illustratif.</span></div>';
  }

  function boot(){
    const mount = document.getElementById('site-nav');
    if(mount) render(mount);
    renderFooter();
  }

  async function start(){
    // La nav s'affiche tout de suite ; les credits/avatar arrivent quand l'auth est prete.
    boot();
    if(window.DG && DG.Auth && DG.Economy){
      bindListeners();
      await DG.Auth.init();
      await DG.Economy.init();
      econReady = true; paintMoney(); paintAvatar();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.DG = window.DG || {};
  DG.Theme = { get:getTheme, set:setTheme };
})();
