(function(){
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const db=window.supabase.createClient(URL,KEY);
  const slug=getSlug();
  const $=id=>document.getElementById(id);
  init();

  async function init(){
    if(!slug){await renderCatalog();return;}
    const {data,error}=await db.from('owner_releases').select('*').eq('slug',slug).eq('status','published').maybeSingle();
    if(error||!data){showMissing();return;}
    render(data);
  }

  async function renderCatalog(){
    const {data,error}=await db.from('owner_releases').select('title,slug,artist,release_type,genre,description,artwork_url,featured').eq('status','published').order('featured',{ascending:false}).order('title',{ascending:true});
    if(error||!data){showMissing();return;}
    document.title='Official Promo Catalog | The Grei Show';
    setMeta('description','Official singles, EPs, albums and professional promo assets from The Grei Show.');
    setCanonical(location.origin+'/promo/');
    const loading=$('loading');
    loading.className='promo-catalog';
    loading.innerHTML=`
      <header class="catalog-head">
        <p class="hero-kicker">The Grei Show · Official Promo</p>
        <h1>Release Library</h1>
        <p>Official music, artwork and downloadable promotional assets for radio, DJs, press, selectors and industry partners.</p>
      </header>
      <section class="catalog-grid" aria-label="Official releases">
        ${data.map(card).join('')}
      </section>`;
    const style=document.createElement('style');
    style.textContent=`
      .promo-catalog{padding:clamp(62px,9vw,110px) 0 80px}.catalog-head{max-width:760px;margin-bottom:38px}.catalog-head h1{margin:0;font-size:clamp(3.6rem,10vw,8rem);line-height:.88;letter-spacing:-.07em}.catalog-head>p:last-child{max-width:650px;color:rgba(255,255,255,.65);font-size:1.05rem;line-height:1.7}.catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.release-card{display:block;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:22px;background:rgba(255,255,255,.035);color:#fff;text-decoration:none;transition:transform .2s ease,border-color .2s ease}.release-card:hover{transform:translateY(-4px);border-color:rgba(216,255,99,.42)}.release-art{aspect-ratio:1;background:#07101a;overflow:hidden}.release-art img{width:100%;height:100%;object-fit:cover}.release-copy{padding:20px}.release-type{margin:0 0 9px;color:#d8ff63;font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.release-copy h2{margin:0;font-size:1.55rem;letter-spacing:-.035em}.release-copy p{margin:9px 0 0;color:rgba(255,255,255,.55);font-size:.9rem;line-height:1.5}.release-arrow{display:inline-block;margin-top:16px;font-weight:850}@media(max-width:900px){.catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:580px){.catalog-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function card(r){
    const image=r.artwork_url||'/assets/img/logo.png';
    return `<a class="release-card" href="/promo/${safePath(r.slug)}">
      <div class="release-art"><img src="${safe(image)}" alt="${esc(r.title)} artwork" loading="lazy"></div>
      <div class="release-copy"><p class="release-type">${esc(r.release_type||'Release')}</p><h2>${esc(r.title)}</h2><p>${esc(r.genre||'The Grei Show')}</p><span class="release-arrow">Open official promo →</span></div>
    </a>`;
  }

  function getSlug(){
    const parts=location.pathname.split('/').filter(Boolean);
    const promoIndex=parts.indexOf('promo');
    return promoIndex>=0&&parts[promoIndex+1]?parts[promoIndex+1]:new URLSearchParams(location.search).get('slug')||'';
  }

  function render(r){
    const title=r.title||'Official Release',artist=r.artist||'The Grei Show';
    document.title=`${title} — Official Promo | ${artist}`;
    setMeta('description',r.description||`Official promo page for ${title} by ${artist}.`);
    setMeta('property:og:title',`${title} — ${artist}`);
    setMeta('property:og:description',r.description||`Official release by ${artist}.`);
    setMeta('property:og:image',r.artwork_url||'');
    setCanonical(location.href.split('?')[0]);
    $('artist').textContent=artist;$('title').textContent=title;$('lead').textContent=r.description||'Official release information and professional assets.';
    $('cover').src=r.artwork_url||'/assets/img/logo.png';$('cover').alt=`${title} artwork`;
    $('detail-artist').textContent=artist;$('detail-title').textContent=title;$('detail-date').textContent=formatDate(r.release_date);$('detail-type').textContent=r.release_type||'Release';$('detail-genre').textContent=r.genre||'—';
    $('request-link').href=`mailto:wheelitrecords@gmail.com?subject=${encodeURIComponent(title+' - Professional Request')}`;
    addAction('video-link',r.video_url);
    addDownload('audio-link',r.audio_url,`${artist} - ${title}`);
    addDownload('artwork-link',r.artwork_url,`${artist} - ${title} Artwork`);
    addAction('press-link',r.press_url);
    const platforms=[['Spotify',r.spotify_url],['Apple Music',r.apple_url],['YouTube Music',r.youtube_url],['Deezer',r.deezer_url],['Amazon Music',r.amazon_url]].filter(x=>x[1]);
    $('platforms').innerHTML=platforms.map(([name,url])=>`<a href="${safe(url)}" target="_blank" rel="noopener">${esc(name)} <span>↗</span></a>`).join('');
    $('open-platforms').hidden=!platforms.length;
    $('asset-card').hidden=!(r.audio_url||r.artwork_url||r.press_url);
    $('loading').hidden=true;$('content').hidden=false;wireModal();
  }

  function addAction(id,url){const el=$(id);if(url){el.href=url;el.hidden=false;}else el.hidden=true;}
  function addDownload(id,url,label){const el=$(id);if(!url){el.hidden=true;return;}el.href=url;el.hidden=false;el.setAttribute('download',safeFileLabel(label));}
  function safeFileLabel(v){return String(v||'download').replace(/[\\/:*?"<>|]+/g,'-').trim();}
  function safePath(v){return encodeURIComponent(String(v||''));}
  function wireModal(){const modal=$('stream-modal');$('open-platforms').onclick=()=>modal.classList.add('open');$('modal-close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});}
  function showMissing(){$('loading').innerHTML='<div><h1>Release unavailable</h1><p>This promo page is unpublished or does not exist.</p><a class="home-button" href="/promo/">Browse official promos</a></div>';}
  function setMeta(name,value){if(!value)return;let el=document.querySelector(`meta[name="${name}"]`)||document.querySelector(`meta[property="${name.replace('property:','')}"]`);if(!el){el=document.createElement('meta');if(name.startsWith('property:'))el.setAttribute('property',name.replace('property:',''));else el.name=name;document.head.appendChild(el);}el.content=value;}
  function setCanonical(url){let el=document.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
  function formatDate(v){if(!v)return'Date pending';return new Date(v+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});}
  function safe(v){return esc(String(v||''));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();