(() => {
  if (!location.pathname.startsWith('/promo/')) return;

  const youtubeId = value => {
    try {
      const url = new URL(value, location.href);
      if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      return url.pathname.match(/\/embed\/([\w-]{11})/)?.[1] || url.searchParams.get('v') || '';
    } catch { return ''; }
  };

  const addStyles = () => {
    if (document.getElementById('promo-official-video-styles')) return;
    const style = document.createElement('style');
    style.id = 'promo-official-video-styles';
    style.textContent = '.promo-official-video{padding:24px 0 48px}.promo-video-card{padding:24px;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(5,10,17,.72);backdrop-filter:blur(20px)}.promo-video-card h2{margin:0 0 18px;font-size:clamp(2rem,4vw,3.3rem);letter-spacing:-.045em}.promo-video-frame{position:relative;overflow:hidden;aspect-ratio:16/9;border-radius:18px;background:#000}.promo-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}';
    document.head.appendChild(style);
  };

  let apiPromise;
  const loadApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    });
    return apiPromise;
  };

  const players = new Map();
  async function mountPlayer(section) {
    if (players.has(section)) return players.get(section);
    const YT = await loadApi();
    const videoId = section.dataset.videoId;
    const mount = section.querySelector('.promo-video-player');
    if (!videoId || !mount) return null;
    const player = new YT.Player(mount, {
      videoId,
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, mute: 1, controls: 1, loop: 1, playlist: videoId, playsinline: 1, rel: 0, origin: location.origin },
      events: {
        onReady(event) { event.target.mute(); event.target.playVideo(); },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED) { event.target.seekTo(0, true); event.target.playVideo(); }
        }
      }
    });
    players.set(section, player);
    return player;
  }

  function buildFromLink(link) {
    const videoId = youtubeId(link?.href || '');
    if (!videoId || document.querySelector('.promo-official-video')) return;
    const detail = document.getElementById('detail');
    const staticPromo = document.querySelector('main.promo');
    const anchor = document.getElementById('listen-section') || document.querySelector('.promo-info') || detail?.querySelector('.section');
    const parent = staticPromo || document.querySelector('.promo-shell');
    if (!parent || !anchor) return;

    addStyles();
    const title = document.getElementById('title')?.textContent || document.getElementById('promo-title')?.textContent.trim() || document.title.split('—')[0].trim();
    const section = document.createElement('section');
    section.className = 'promo-official-video';
    section.dataset.videoId = videoId;
    section.innerHTML = `<div class="promo-video-card"><p class="eyebrow">Official Music Video</p><h2>${title}</h2><div class="promo-video-frame"><div class="promo-video-player"></div></div></div>`;
    anchor.insertAdjacentElement('afterend', section);

    const observer = new IntersectionObserver(async entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const player = await mountPlayer(section);
        try { player?.mute(); player?.playVideo(); } catch {}
      }
    }, { threshold: 0.15, rootMargin: '220px 0px' });
    observer.observe(section);
  }

  const findLink = () => document.getElementById('video-link') || [...document.querySelectorAll('a')].find(a => /watch video/i.test(a.textContent) && youtubeId(a.href));
  const existing = findLink();
  if (existing && !existing.hidden) buildFromLink(existing);

  const observer = new MutationObserver(() => {
    const link = findLink();
    if (link && !link.hidden && link.href) buildFromLink(link);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'hidden'] });
})();