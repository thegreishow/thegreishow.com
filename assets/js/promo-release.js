(function(){
  const SUPABASE_URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const SUPABASE_KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const LOCAL_DATA_URL='/assets/data/promo-releases.json';
  const ALIASES={
    'puff-puff-pass-remix-feat-bay-c':'puff-puff-pass-remix-bay-c',
    'puff-puff-pass-remix':'puff-puff-pass-remix-bay-c',
    'theres-nothing-to-believe-in-ep':'theres-nothing-to-believe-in',
    '1122':'1122-ep'
  };
  const $=id=>document.getElementById(id);
  const requestedSlug=getSlug();
  const slug=ALIASES[requestedSlug]||requestedSlug;
  init();

  async function init(){
    const data=await loadReleases();
    if(!slug){renderCatalog(data);return;}
    const release=data.find(r=>r.slug===slug&&r.status==='published');
    if(!release){showMissing();return;}
    renderDetail(release);
  }

  async function loadReleases(){
    try{
      if(!window.supabase) throw new Error('Supabase client unavailable');
      const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {data,error}=await db.from('owner_releases').select('*').eq('status','published').order('featured',{ascending:false}).order('release_date',{ascending:false});
      if(error) throw error;
      if(Array.isArray(data)&&data.length) return data;
      throw new Error('No published promo records returned');
    }catch(error){
      console.warn('Live promo database unavailable; using bundled fallback.',error);
      try{
        const response=await fetch(LOCAL_DATA_URL,{cache:'no-store'});
        if(!response.ok) throw new Error('Fallback promo data unavailable');
        const data=await response.json();
        return Array.isArray(data)?data:[];
      }catch(fallbackError){
        console.error('Promo data load failed:',fallbackError);
        return [];
      }
    }
  }

  function renderCatalog(data){
    const published=data.filter(r=>r.status==='published').sort((a,b)=>{
      if(Boolean(a.featured)!==Boolean(b.featured)) return b.featured?1:-1;
      return String(b.release_date||'').localeCompare(String(a.release_date||''))||String(a.title||'').localeCompare(String(b.title||''));
    });
    if(!published.length){showMissing('The promo library could not be loaded.');return;}
    document.title='Official Promo Library | The Grei Show';
    setMeta('description','Official singles, EPs, albums, artwork and professional promo assets from The Grei Show.');
    setCanonical(location.origin+'/promo/');
    $('release-grid').innerHTML=published.map(cardMarkup).join('');
    document.querySelectorAll('.release-art img').forEach(wireImageFallback);
    $('loading').hidden=true;
    $('catalog').hidden=false;
  }

  function cardMarkup(r){
    const image=displayImage(r.artwork_url);
    const reliableUrl=`/promo/?slug=${encodeURIComponent(r.slug)}`;
    return `<a class="release-card" href="${escAttr(reliableUrl)}" data-pretty-url="/promo/${escAttr(r.slug)}/">
      <div class="release-art${image?'':' fallback'}" data-title="${escAttr(r.title)}">
        ${image?`<img src="${escAttr(image)}" alt="${escAttr(r.title)} artwork" loading="lazy" data-drive-id="${escAttr(driveId(r.artwork_url)||'')}" data-fallback-step="0">`:''}
      </div>
      <div class="release-copy"><h2>${esc(r.title)}</h2><div class="release-meta"><span>${esc(r.release_type||'Release')}</span><span>${esc(r.genre||'The Grei Show')}</span></div></div>
    </a>`;
  }

  function renderDetail(r){
    const title=r.title||'Official Release';
    const artist=r.artist||'The Grei Show';
    const image=displayImage(r.artwork_url);
    document.title=`${title} — Official Promo | ${artist}`;
    setMeta('description',r.description||`Official promo page for ${title} by ${artist}.`);
    setMeta('property:og:title',`${title} — ${artist}`);
    setMeta('property:og:description',r.description||`Official release by ${artist}.`);
    setMeta('property:og:image',image||'');
    setCanonical(`${location.origin}/promo/${encodeURIComponent(r.slug)}/`);
    $('artist').textContent=artist;
    $('title').textContent=title;
    $('lead').textContent=r.description||'Official release information and professional assets.';
    $('cover-box').dataset.title=title;
    if(image){
      for(const id of ['cover','backdrop']){
        const img=$(id);
        img.src=image;
        img.dataset.driveId=driveId(r.artwork_url)||'';
        img.dataset.fallbackStep='0';
        wireImageFallback(img);
      }
      $('cover').alt=`${title} artwork`;
    }else{
      $('cover').remove();$('backdrop').remove();$('cover-box').classList.add('fallback');
    }
    $('detail-artist').textContent=artist;
    $('detail-title').textContent=title;
    $('detail-date').textContent=formatDate(r.release_date);
    $('detail-type').textContent=r.release_type||'Release';
    $('detail-genre').textContent=r.genre||'—';
    $('request-link').href=`mailto:wheelitrecords@gmail.com?subject=${encodeURIComponent(title+' - Professional Request')}`;
    addAction('video-link',r.video_url);
    addAction('audio-link',safeDriveAsset(r.audio_url));
    addAction('artwork-link',artworkDownload(r.artwork_url));
    addAction('press-link',r.press_url);
    const platforms=[['Spotify',r.spotify_url],['Apple Music',r.apple_url],['YouTube Music',r.youtube_url],['Deezer',r.deezer_url],['Amazon Music',r.amazon_url]].filter(x=>x[1]);
    $('platforms').innerHTML=platforms.map(([name,url])=>`<a href="${escAttr(url)}" target="_blank" rel="noopener">${esc(name)} <span>↗</span></a>`).join('');
    $('open-platforms').hidden=!platforms.length;
    $('asset-card').hidden=!(r.audio_url||r.artwork_url||r.press_url);
    $('loading').hidden=true;$('detail').hidden=false;wireModal();
  }

  function getSlug(){
    const querySlug=new URLSearchParams(location.search).get('slug');
    if(querySlug) return querySlug.toLowerCase();
    const parts=location.pathname.split('/').filter(Boolean);
    const i=parts.indexOf('promo');
    return i>=0&&parts[i+1]?decodeURIComponent(parts[i+1]).toLowerCase():'';
  }

  function driveId(url){
    if(!url) return '';
    const s=String(url);
    return (s.match(/[?&]id=([\w-]+)/)||s.match(/\/d\/([\w-]+)/)||s.match(/folders\/([\w-]+)/)||[])[1]||'';
  }

  function displayImage(url){
    if(!url) return '';
    const id=driveId(url);
    return id&&String(url).includes('drive.google.com')?`https://drive.google.com/thumbnail?id=${id}&sz=w2000`:String(url);
  }

  function artworkDownload(url){
    if(!url) return '';
    const id=driveId(url);
    return id?`https://drive.google.com/uc?export=download&id=${id}`:url;
  }

  function safeDriveAsset(url){
    if(!url) return '';
    const id=driveId(url);
    if(id&&String(url).includes('/file/d/')) return `https://drive.google.com/uc?export=download&id=${id}`;
    return String(url);
  }

  function wireImageFallback(img){
    img.addEventListener('error',()=>{
      const id=img.dataset.driveId;
      const step=Number(img.dataset.fallbackStep||0);
      if(id&&step===0){img.dataset.fallbackStep='1';img.src=`https://lh3.googleusercontent.com/d/${id}=w1600`;return;}
      if(id&&step===1){img.dataset.fallbackStep='2';img.src=`https://drive.usercontent.google.com/download?id=${id}&export=view`;return;}
      const box=img.closest('.release-art,.cover');
      if(box){box.classList.add('fallback');if(!box.dataset.title) box.dataset.title=(img.alt||'Official release').replace(/ artwork$/,'');}
      img.remove();
    });
  }

  function addAction(id,url){const el=$(id);if(url){el.href=url;el.hidden=false;}else el.hidden=true;}
  function wireModal(){const modal=$('stream-modal');$('open-platforms').onclick=()=>modal.classList.add('open');$('modal-close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});}
  function showMissing(message='This promo page is unpublished or does not exist.'){$('loading').innerHTML=`<div><p class="eyebrow">The Grei Show</p><h1>Release unavailable</h1><p>${esc(message)}</p><a class="home-button" href="/promo/">Browse official promos</a></div>`;}
  function setMeta(name,value){if(!value)return;let el=document.querySelector(`meta[name="${name}"]`)||document.querySelector(`meta[property="${name.replace('property:','')}"]`);if(!el){el=document.createElement('meta');if(name.startsWith('property:'))el.setAttribute('property',name.replace('property:',''));else el.name=name;document.head.appendChild(el);}el.content=value;}
  function setCanonical(url){let el=document.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
  function formatDate(v){if(!v)return'Date pending';return new Date(v+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});}
  function escAttr(v){return esc(String(v||''));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
