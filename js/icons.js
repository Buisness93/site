// Jeu d'icones au trait (24x24, currentColor) partage par tout le site.
// En JS : DG.Icon('trophy'). En HTML : <span data-icon="trophy"></span>, rempli au chargement.
(function(){
  window.DG = window.DG || {};
  const P = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8.5 20h7M10 17h4"/>',
    radio:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5"/><circle cx="15.5" cy="14" r="2.5"/><path d="M6.5 12.5h4M6.5 15.5h4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    car:'<path d="M3 16v-3.5l2.2-5A2 2 0 0 1 7 6.3h10a2 2 0 0 1 1.8 1.2l2.2 5V16a1 1 0 0 1-1 1h-1.5M5.5 17H4a1 1 0 0 1-1-1"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
    flag:'<path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/>',
    crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/><path d="M5 19h14"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    play:'<path d="M7 4.5v15l12.5-7.5L7 4.5z" fill="currentColor" stroke="none"/>',
    cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    gauge:'<path d="M4.5 18a9 9 0 1 1 15 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.3"/>',
    bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    music:'<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    ticket:'<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    logout:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevL:'<path d="M15 5l-7 7 7 7"/>',
    chevR:'<path d="M9 5l7 7-7 7"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>',
    map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    road:'<path d="M8 3 4 21M16 3l4 18M12 4v3M12 11v3M12 18v2"/>',
    star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/>',
    sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    wave:'<path d="M2 12h2l2-6 3 12 3-9 2 5 2-3 2 1h4"/>',
    compare:'<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/>',
    shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    city:'<path d="M3 21h18M5 21V9l5-3v15M10 21V4l6 3v14M16 21v-9h3v9"/><path d="M13 9h1M13 12h1M13 15h1M7 12h1M7 15h1"/>',
  };
  function Icon(name, cls){
    const d = P[name] || P.info;
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  function hydrate(scope){
    (scope || document).querySelectorAll('[data-icon]:not([data-icon-done])').forEach(el=>{
      el.insertAdjacentHTML('afterbegin', Icon(el.getAttribute('data-icon')));
      el.setAttribute('data-icon-done', '');
    });
    hydrateLogos(scope);
  }
  // Logo Deylo Garage : gemme d'obsidienne a facettes + monogramme "D" irise
  // traverse d'une ligne de vitesse. Couleurs = variables du theme (s'adapte a
  // Obsidian / Carmin / Emeraude). img/logo.svg en est la version figee (favicon).
  let logoN = 0;
  function logoMark(size, cls){
    const id = 'dgl' + (++logoN);
    return '<svg class="dg-logo' + (cls ? ' ' + cls : '') + '" width="' + (size || 40) + '" height="' + (size || 40) + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--bg2,#0a0a12)"/><stop offset="1" style="stop-color:var(--bg,#040408)"/></linearGradient>' +
        '<linearGradient id="' + id + 'i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-light,#d6d0ff)"/><stop offset=".5" style="stop-color:var(--accent,#8b7cff)"/><stop offset="1" style="stop-color:var(--accent-2,#5ee7ff)"/></linearGradient>' +
      '</defs>' +
      '<path d="M24 2.5 42.6 13v22L24 45.5 5.4 35V13z" fill="url(#' + id + 'b)" stroke="url(#' + id + 'i)" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M24 2.5v12.2M42.6 13 32 19M5.4 13 16 19M24 45.5V34M42.6 35 32 29M5.4 35 16 29" stroke="url(#' + id + 'i)" stroke-width=".7" opacity=".35"/>' +
      '<path fill="url(#' + id + 'i)" fill-rule="evenodd" d="M15.5 13.5h9.3c6 0 10.7 4.6 10.7 10.5s-4.7 10.5-10.7 10.5h-9.3zm5.2 5v11h4c3.1 0 5.5-2.4 5.5-5.5s-2.4-5.5-5.5-5.5z"/>' +
      '<path d="M9 27.5h13.5" stroke="var(--bg,#040408)" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M8 27.5h5" stroke="url(#' + id + 'i)" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>' +
    '</svg>';
  }
  function logoFull(size){
    return '<span class="dg-logofull">' + logoMark(size || 38) +
      '<span class="dg-wm"><span class="dg-wm1">DEYLO</span><span class="dg-wm2">GARAGE</span></span></span>';
  }
  DG.Logo = { mark:logoMark, full:logoFull };
  function hydrateLogos(scope){
    (scope || document).querySelectorAll('[data-logo]:not([data-logo-done])').forEach(el=>{
      el.insertAdjacentHTML('afterbegin', logoMark(+el.getAttribute('data-logo') || 40));
      el.setAttribute('data-logo-done', '');
    });
  }

  DG.Icon = Icon;
  DG.Icon.hydrate = hydrate;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>hydrate()); else hydrate();
})();
