(function(){
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const db=window.supabase.createClient(URL,KEY);
  const slug=getSlug();
  const $=id=>document.getElementById(id);
  init();

  async function init(){
    const {data,error}=await db.from('owner_releases').select('*').eq('slug',slug).eq('status','published').maybeSingle();
    if(error||!data){showMissing();return;}
    render(data);
  }

  function getSlug(){
    const parts=location.pathname.split('/').filter(Boolean);
    const promoIndex=parts.indexOf('promo');
    return promoIndex>=0&&parts[promoIndex+1]?parts[promoIndex+1]:new URLSearchParams(location.search).get('slug')||'';
  }

  function render(r){
    const title=r.title||'Official Release', artist=r.artist||'The Grei Show';
    document.title=`${title} — Official Promo | ${artist}`;
    setMeta('description',r.description||`Official promo page for ${title} by ${artist}.`);
    setMeta('property:og:title',`${title} — ${artist}`);
    setMeta('property:og:description',r.description||`Official release by ${artist}.`);
    setMeta('property:og:image',r.artwork_url||'');
    setCanonical(location.href.split('?')[0]);
    $('artist').textContent=artist;
    $('title').textContent=title;
    $('lead').textContent=r.description||'Official release information and professional assets.';
    $('cover').src=r.artwork_url||'/assets/img/logo.png';
    $('cover').alt=`${title} artwork`;
    $('detail-artist').textContent=artist;
    $('detail-title').textContent=title;
    $('detail-date').textContent=formatDate(r.release_date);
    $('detail-type').textContent=r.release_type||'Release';
    $('detail-genre').textContent=r.genre||'—';
    $('request-link').href=`mailto:wheelitrecords@gmail.com?subject=${encodeURIComponent(title+' - Professional Request')}`;
    addAction('video-link',r.video_url);
    addAction('audio-link',r.audio_url);
    addAction('press-link',r.press_url);
    const platforms=[['Spotify',r.spotify_url],['Apple Music',r.apple_url],['YouTube Music',r.youtube_url],['Deezer',r.deezer_url],['Amazon Music',r.amazon_url]].filter(x=>x[1]);
    const platformBox=$('platforms');
    platformBox.innerHTML=platforms.map(([name,url])=>`<a href="${safe(url)}" target="_blank" rel="noopener">${esc(name)} <span>↗</span></a>`).join('');
    $('open-platforms').hidden=!platforms.length;
    $('asset-card').hidden=!(r.audio_url||r.press_url);
    $('loading').hidden=true;
    $('content').hidden=false;
    wireModal();
  }

  function addAction(id,url){const el=$(id);if(url){el.href=url;el.hidden=false;}else el.hidden=true;}
  function wireModal(){const modal=$('stream-modal');$('open-platforms').onclick=()=>modal.classList.add('open');$('modal-close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});}
  function showMissing(){$('loading').innerHTML='<h1>Release unavailable</h1><p>This promo page is unpublished or does not exist.</p><a class="home-button" href="/music.html">Browse music</a>';}
  function setMeta(name,value){if(!value)return;let el=document.querySelector(`meta[name="${name}"]`)||document.querySelector(`meta[property="${name.replace('property:','')}"]`);if(!el){el=document.createElement('meta');if(name.startsWith('property:'))el.setAttribute('property',name.replace('property:',''));else el.name=name;document.head.appendChild(el);}el.content=value;}
  function setCanonical(url){let el=document.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
  function formatDate(v){if(!v)return 'Date pending';return new Date(v+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});}
  function safe(v){return esc(String(v||''));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();