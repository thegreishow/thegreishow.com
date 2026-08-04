(() => {
  const sections = [...document.querySelectorAll('.official-video[data-video-id]')];
  if (!sections.length) return;

  let apiPromise;
  const loadYouTubeApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
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
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 1,
        loop: 1,
        playlist: videoId,
        playsinline: 1,
        rel: 0,
        origin: location.origin
      },
      events: {
        onReady(event) {
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(0, true);
            event.target.playVideo();
          }
        },
        onAutoplayBlocked() {
          section.classList.add('autoplay-blocked');
        }
      }
    });
    players.set(section, player);
    return player;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(async entry => {
      if (!entry.isIntersecting) return;
      const player = await createPlayer(entry.target);
      try {
        player?.mute();
        player?.playVideo();
      } catch {}
    });
  }, { threshold: 0.2, rootMargin: '160px 0px' });

  sections.forEach(section => observer.observe(section));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    sections.forEach(async section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const player = await createPlayer(section);
      try {
        player?.mute();
        player?.playVideo();
      } catch {}
    });
  });
})();