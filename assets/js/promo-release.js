(function(){
  const LOCAL_DATA_URL = '/assets/data/promo-releases.json';
  const $ = id => document.getElementById(id);
  const slug = getSlug();
  init();

  async function init(){
    if(!slug){
      await renderCatalog();
      return;
    }
    const data = await loadReleases();
    const release = data.find(r => r.slug === slug && r.status === 'published');
    if(!release){
      showMissing();
      return;
    }
    renderDetail(release);
  }

  async function loadReleases(){
    try{
      const res = await fetch(LOCAL_DATA_URL, { cache: 'no-store' });
      if(!res.ok) throw new Error('Failed to load promo data');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }catch(err){
      console.error('Promo data load error:', err);
      return [];
    }
  }

  async function renderCatalog(){
    const data = await loadReleases();
    const published = data
      .filter(r => r.status === 'published')
      .sort((a,b) => {
        if(!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return String(b.release_date||'').localeCompare(String(a.release_date||''));
      });

    if(!published.length){
      showMissing('The promo library could not be loaded.');
      return;
    }

    document.title = 'Official Promo Library | The Grei Show';
    $('release-grid').innerHTML = published.map(cardMarkup).join('');
    document.querySelectorAll('.release-art img').forEach(wireImageFallback);
    $('loading').hidden = true;
    $('catalog').hidden = false;
  }

  function cardMarkup(r){
    const image = displayImage(r.artwork_url);
    return `<a class="release-card" href="/promo/${escAttr(r.slug)}/">
      <div class="release-art${image ? '' : ' fallback'}" data-title="${escAttr(r.title)}">
        ${image ? `<img src="${escAttr(image)}" alt="${escAttr(r.title)} artwork" loading="lazy" data-drive-id="${escAttr(driveId(r.artwork_url)||'')}">` : ''}
      </div>
      <div class="release-copy">
        <h2>${esc(r.title)}</h2>
        <div class="release-meta">
          <span>${esc(r.release_type || 'Release')}</span>
          <span>${esc(r.genre || 'The Grei Show')}</span>
        </div>
      </div>
    </a>`;
  }

  function renderDetail(r){
    const title = r.title || 'Official Release';
    const artist = r.artist || 'The Grei Show';

    document.title = `${title} — Official Promo | ${artist}`;
    setMeta('description', r.description || `Official promo page for ${title} by ${artist}.`);
    setMeta('property:og:title', `${title} — ${artist}`);
    setMeta('property:og:description', r.description || `Official release by ${artist}.`);

    const image = displayImage(r.artwork_url);
    setMeta('property:og:image', image || '');
    setCanonical(location.href.split('?')[0]);

    $('artist').textContent = artist;
    $('title').textContent = title;
    $('lead').textContent = r.description || 'Official release information and professional assets.';
    $('cover-box').dataset.title = title;

    if(image){
      $('cover').src = image;
      $('cover').alt = `${title} artwork`;
      $('backdrop').src = image;
      $('cover').dataset.driveId = driveId(r.artwork_url) || '';
      $('backdrop').dataset.driveId = driveId(r.artwork_url) || '';
      wireImageFallback($('cover'));
      wireImageFallback($('backdrop'));
    }else{
      $('cover').remove();
      $('backdrop').remove();
      $('cover-box').classList.add('fallback');
    }

    $('detail-artist').textContent = artist;
    $('detail-title').textContent = title;
    $('detail-date').textContent = formatDate(r.release_date);
    $('detail-type').textContent = r.release_type || 'Release';
    $('detail-genre').textContent = r.genre || '—';

    $('request-link').href = `mailto:wheelitrecords@gmail.com?subject=${encodeURIComponent(title + ' - Professional Request')}`;

    addAction('video-link', r.video_url);
    addAction('audio-link', r.audio_url);
    addAction('artwork-link', artworkDownload(r.artwork_url));
    addAction('press-link', r.press_url);

    const platforms = [
      ['Spotify', r.spotify_url],
      ['Apple Music', r.apple_url],
      ['YouTube Music', r.youtube_url],
      ['Deezer', r.deezer_url],
      ['Amazon Music', r.amazon_url]
    ].filter(x => x[1]);

    $('platforms').innerHTML = platforms.map(([name,url]) =>
      `<a href="${escAttr(url)}" target="_blank" rel="noopener">${esc(name)} <span>↗</span></a>`
    ).join('');

    $('open-platforms').hidden = !platforms.length;
    $('asset-card').hidden = !(r.audio_url || r.artwork_url || r.press_url);

    $('loading').hidden = true;
    $('detail').hidden = false;
    wireModal();
  }

  function getSlug(){
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('promo');
    return i >= 0 && parts[i+1] ? decodeURIComponent(parts[i+1]) : new URLSearchParams(location.search).get('slug') || '';
  }

  function driveId(url){
    if(!url) return '';
    const s = String(url);
    return (s.match(/[?&]id=([\w-]+)/) || s.match(/\/d\/([\w-]+)/) || s.match(/folders\/([\w-]+)/) || [])[1] || '';
  }

  function displayImage(url){
    if(!url) return '';
    const id = driveId(url);
    if(id && String(url).includes('drive.google.com')){
      return `https://lh3.googleusercontent.com/d/${id}=w1600`;
    }
    return String(url);
  }

  function artworkDownload(url){
    if(!url) return '';
    const id = driveId(url);
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
  }

  function wireImageFallback(img){
    img.addEventListener('error', () => {
      const id = img.dataset.driveId;
      if(id && !img.dataset.retried){
        img.dataset.retried = '1';
        img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
        return;
      }
      const box = img.closest('.release-art,.cover');
      if(box){
        box.classList.add('fallback');
        if(!box.dataset.title) box.dataset.title = img.alt.replace(/ artwork$/,'');
      }
      img.remove();
    }, { once: false });
  }

  function addAction(id, url){
    const el = $(id);
    if(url){
      el.href = url;
      el.hidden = false;
    }else{
      el.hidden = true;
    }
  }

  function wireModal(){
    const modal = $('stream-modal');
    $('open-platforms').onclick = () => modal.classList.add('open');
    $('modal-close').onclick = () => modal.classList.remove('open');
    modal.onclick = e => { if(e.target === modal) modal.classList.remove('open'); };
    document.addEventListener('keydown', e => { if(e.key === 'Escape') modal.classList.remove('open'); });
  }

  function showMissing(message = 'This promo page is unpublished or does not exist.'){
    $('loading').innerHTML = `<div>
      <p class="eyebrow">The Grei Show</p>
      <h1>Release unavailable</h1>
      <p>${esc(message)}</p>
      <a class="home-button" href="/promo/">Browse official promos</a>
    </div>`;
  }

  function setMeta(name, value){
    if(!value) return;
    let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name.replace('property:','')}"]`);
    if(!el){
      el = document.createElement('meta');
      if(name.startsWith('property:')) el.setAttribute('property', name.replace('property:',''));
      else el.name = name;
      document.head.appendChild(el);
    }
    el.content = value;
  }

  function setCanonical(url){
    let el = document.querySelector('link[rel="canonical"]');
    if(!el){
      el = document.createElement('link');
      el.rel = 'canonical';
      document.head.appendChild(el);
    }
    el.href = url;
  }

  function formatDate(v){
    if(!v) return 'Date pending';
    return new Date(v + 'T00:00:00').toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  }

  function escAttr(v){ return esc(String(v||'')); }
  function esc(v){
    return String(v??'').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
})();
