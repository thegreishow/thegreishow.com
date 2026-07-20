// Grei Site - Global Navigation Injector
(function(){
  let navInjected=false;
  let initialized=false;

  function ensureFavicon(){
    if(document.querySelector('link[rel="icon"]')) return;
    const icon=document.createElement('link');
    icon.rel='icon';
    icon.type='image/svg+xml';
    icon.href='/assets/favicon.svg';
    document.head.appendChild(icon);
  }

  const parentPages={
    'music-videos.html':'visuals.html',
    'documentaries.html':'visuals.html',
    'live-sessions.html':'visuals.html',
    'astralthread.html':'books.html',
    'booking.html':'connect.html',
    'whiteline':'whiteline.html',
    'ilovekingston':'ilovekingston.html',
    'tours':'ilovekingston.html',
    'experiences':'ilovekingston.html'
  };

  const getPageFromPath=pathname=>pathname.split('/').pop()||'index.html';
  const getCurrentPage=()=>parentPages[getPageFromPath(location.pathname)]||getPageFromPath(location.pathname);
  function getLinkPage(link){
    const href=link.getAttribute('href');
    if(!href) return '';
    return getPageFromPath(new URL(href,location.href).pathname);
  }

  function markCurrentNavLink(){
    const currentPage=getCurrentPage();
    document.querySelectorAll('.site-nav a').forEach(link=>link.toggleAttribute('aria-current',getLinkPage(link)===currentPage));
    document.querySelectorAll('.nav-more').forEach(menu=>menu.classList.toggle('has-current',Boolean(menu.querySelector('a[aria-current="page"]'))));
  }

  function closeMobileNav({returnFocus=false}={}){
    const toggle=document.querySelector('.nav-toggle');
    const nav=document.getElementById('primary-nav');
    if(!toggle||!nav) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded','false');
    toggle.textContent='Menu';
    document.querySelectorAll('.nav-more[open]').forEach(menu=>menu.removeAttribute('open'));
    if(returnFocus) toggle.focus();
  }

  function bindNavControls(){
    const toggle=document.querySelector('.nav-toggle');
    const nav=document.getElementById('primary-nav');
    if(!toggle||!nav||toggle.dataset.bound==='true') return;
    toggle.dataset.bound='true';
    toggle.addEventListener('click',()=>{
      const isOpen=nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded',String(isOpen));
      toggle.textContent=isOpen?'Close':'Menu';
      if(!isOpen) document.querySelectorAll('.nav-more[open]').forEach(menu=>menu.removeAttribute('open'));
    });
    nav.addEventListener('click',event=>{if(event.target.closest('a')) closeMobileNav();});
    document.addEventListener('click',event=>{const header=document.querySelector('.site-header');if(header&&!header.contains(event.target)) closeMobileNav();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape') closeMobileNav({returnFocus:nav.classList.contains('is-open')});});
    addEventListener('resize',()=>{if(innerWidth>900) closeMobileNav();},{passive:true});
  }

  function initSiteEvents(){
    if(window.greiTrack) return;
    const campaignKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    const params=new URLSearchParams(location.search);
    const currentCampaign=campaignKeys.reduce((campaign,key)=>{const value=params.get(key);if(value) campaign[key]=value;return campaign;},{});
    try{if(Object.keys(currentCampaign).length) sessionStorage.setItem('grei_attribution',JSON.stringify(currentCampaign));}catch{}
    const getAttribution=()=>{try{return JSON.parse(sessionStorage.getItem('grei_attribution')||'{}');}catch{return {};}};
    function track(eventName,details={}){
      const trackedEvent={event:eventName,page:location.pathname||'/',...getAttribution(),...details};
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push(trackedEvent);
      dispatchEvent(new CustomEvent('grei:track',{detail:trackedEvent}));
    }
    function getSafeDestination(target){
      const raw=target.getAttribute('href')||'';
      if(!raw) return '';
      if(raw.startsWith('#')) return raw;
      try{const url=new URL(raw,location.href);if(url.protocol==='mailto:'||url.protocol==='tel:') return url.protocol.slice(0,-1);return url.origin===location.origin?url.pathname:`${url.origin}${url.pathname}`;}catch{return '';}
    }
    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-track]');
      if(!target) return;
      track('grei_cta_click',{action:target.dataset.track,label:target.dataset.trackLabel||target.textContent.trim(),destination:getSafeDestination(target)});
    });
    window.greiTrack=track;
    track('grei_page_view',{title:document.title});
  }

  function injectEmergencyNav(){
    const mount=document.getElementById('site-header');
    if(!mount||mount.children.length) return;
    mount.innerHTML='<header class="site-header"><div class="nav-container"><a class="brand" href="index.html">THE GREI SHOW</a><nav class="site-nav is-open" aria-label="Emergency navigation"><a href="music.html">Music</a><a href="visuals.html">Visuals</a><a href="books.html">Books</a><a href="whiteline.html">Talent Agency</a><a href="ilovekingston.html">Tours &amp; Experiences</a><a href="arcade.html">Arcade</a><a href="about.html">About</a><a href="connect.html">Connect</a></nav></div></header>';
  }

  function injectNav(html){
    const existing=document.querySelector('.site-header');
    if(navInjected||existing){navInjected=true;bindNavControls();markCurrentNavLink();return;}
    const mount=document.getElementById('site-header');
    if(mount) mount.innerHTML=html;
    else{const wrapper=document.createElement('div');wrapper.innerHTML=html;document.body.insertBefore(wrapper.firstElementChild,document.body.firstChild);}
    navInjected=true;
    bindNavControls();
    markCurrentNavLink();
  }

  async function fetchNavHtml(){
    for(const path of ['shared/nav.html','/shared/nav.html']){
      try{const res=await fetch(path,{cache:'no-cache'});if(res.ok) return res.text();}catch{}
    }
    throw new Error('Shared navigation not found');
  }

  async function loadNav(){try{injectNav(await fetchNavHtml());}catch(error){console.error('[Nav Loader] Failed to load navigation:',error);injectEmergencyNav();}}
  function init(){if(initialized) return;initialized=true;ensureFavicon();initSiteEvents();loadNav();}
  window.markCurrentNavLink=markCurrentNavLink;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();