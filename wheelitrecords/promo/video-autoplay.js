(() => {
  const sections = [...document.querySelectorAll('.official-video')];
  if (!sections.length) return;

  const youtubeId = value => {
    try {
      const url = new URL(value, location.href);
      if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      const embed = url.pathname.match(/\/embed\/([\w-]{11})/);
      return embed?.[1] || url.searchParams.get('v') || '';
    } catch { return ''; }
  };

  sections.forEach((section, index) => {
    const frame = section.querySelector('iframe');
    const videoId = section.dataset.videoId || youtubeId(frame?.src || '');
    if (!videoId) return;
    section.dataset.videoId = videoId;
    let mount = section.querySelector('.official-video-player');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'official-video-player';
      mount.id = `wheelit-video-${index}`;
      frame?.replaceWith(mount);
    }
    section.querySelector('.official-video-note')?.remove();
  });

  let apiPromise;
  const loadYouTubeApi = () => {
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
  async function createPlayer(section) {
    if (players.has(section)) return players.get(section);
    const videoId = section.dataset.videoId;
    const mount = section.querySelector('.official-video-player');
    if (!videoId || !mount) return null;
    const YT = await loadYouTubeApi();
    const player = new YT.Player(mount, {
      videoId,
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, mute: 1, controls: 1, loop: 1, playlist: videoId, playsinline: 1, rel: 0, origin: location.origin },
      events: {
        onReady(event) { event.target.mute(); event.target.playVideo(); },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED) { event.target.seekTo(0, true); event.target.playVideo(); }
        },
        onAutoplayBlocked() { section.classList.add('autoplay-blocked'); }
      }
    });
    players.set(section, player);
    return player;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(async entry => {
      if (!entry.isIntersecting) return;
      const player = await createPlayer(entry.target);
      try { player?.mute(); player?.playVideo(); } catch {}
    });
  }, { threshold: 0.15, rootMargin: '220px 0px' });

  sections.filter(section => section.dataset.videoId).forEach(section => observer.observe(section));
})();