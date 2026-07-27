(function(){
  const PROMO_SLUGS={
    'dark-side':'dark-side-of-the-moon',
    'nothing-believe':'theres-nothing-to-believe-in',
    'psy-phi':'psy-phi',
    '1122':'1122-ep',
    'pineapples':'pineapples-and-hot-sauce',
    'ep2':'ep-2',
    'any-one':'any-one-a-dem',
    '24-days':'24-days',
    'halfway':'halfway',
    'love-alone':'a-love-alone',
    'ppp-remix':'puff-puff-pass-remix-bay-c',
    'choppa-talk':'choppa-talk',
    'river-dreams':'river-of-dreams',
    'rage':'rage',
    'game-hearts':'game-of-hearts',
    'puff-pass':'puff-puff-pass',
    'flame':'the-flame',
    'vibe':'the-vibe',
    'interlude':'2020-interlude',
    'friends':'friends',
    'joy':'joy',
    'squad':'squad-people',
    'blind':'blind-without-shades',
    'full-moon':'full-moon'
  };

  const promoUrl=slug=>`/promo/${encodeURIComponent(slug)}/`;

  function init(){
    document.querySelectorAll('.project-art, .single-art').forEach(art=>{
      const card=art.closest('[data-release]');
      const slug=card&&PROMO_SLUGS[card.dataset.release];
      if(!slug)return;
      art.style.cursor='pointer';
      art.setAttribute('role','link');
      art.setAttribute('tabindex','0');
      art.setAttribute('aria-label',`Open official promo for ${card.querySelector('h3')?.textContent||'release'}`);
      const open=()=>location.href=promoUrl(slug);
      art.addEventListener('click',open);
      art.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
