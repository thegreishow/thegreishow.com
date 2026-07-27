(function(){
  function init(){
    const shell=document.querySelector('.promo-shell');
    if(!shell||document.querySelector('.promo-context-nav'))return;

    const nav=document.createElement('nav');
    nav.className='promo-context-nav';
    nav.setAttribute('aria-label','Promo navigation');
    nav.innerHTML='<a class="promo-back-link" href="/music#discography">← Back to Music</a><a href="/promo/">All promos</a>';

    const style=document.createElement('style');
    style.textContent='.promo-context-nav{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 0 0;font-size:.82rem;font-weight:850}.promo-context-nav a{display:inline-flex;align-items:center;min-height:42px;padding:0 15px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(5,10,17,.68);color:#fff;text-decoration:none;backdrop-filter:blur(16px)}.promo-context-nav a:hover{border-color:rgba(216,255,99,.38)}@media(max-width:620px){.promo-context-nav{position:sticky;top:86px;z-index:20;padding:10px 0;background:linear-gradient(180deg,#03060c 65%,transparent)}.promo-context-nav a{min-height:40px;padding:0 12px;font-size:.76rem}}';
    document.head.appendChild(style);
    shell.prepend(nav);

  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
