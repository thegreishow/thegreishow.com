(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/leaderboard') && String(init.method || 'GET').toUpperCase() === 'POST' && init.body) {
      try {
        const account = JSON.parse(localStorage.getItem('grei_arcade_account') || 'null');
        if (account?.playerCode && account?.pin) {
          const payload = JSON.parse(init.body);
          payload.playerCode = account.playerCode;
          payload.playerPin = account.pin;
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch {}
    }
    return nativeFetch(input, init);
  };

  // === SIMPLE & RELIABLE SOUND SYSTEM (HTML5 Audio + Data URIs for max compatibility) ===
  let soundEnabled = true;

  // Short base64 encoded beeps (very small, no external files needed)
  const sounds = {
    click: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', // short click
    hit: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', // placeholder - will use oscillator fallback
    success: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
    move: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
  };

  const discoveryLinks = {
    'dreamweaver-oracle': { href: '../../../astralthread.html', label: 'Read The Astral Thread' },
    'signal-runner': { href: '../../../music.html', label: 'Enter the Audio Universe' },
    'jamaica-run': { href: '../../../music.html', label: 'Explore The Grei Show Music' }
  };

  window.greiShowDiscovery = (container, gameId) => {
    const discovery = discoveryLinks[gameId];
    if (!container || !discovery || container.querySelector('[data-grei-discovery]')) return;
    const link = document.createElement('a');
    link.className = 'grei-game-discovery';
    link.dataset.greiDiscovery = 'true';
    link.href = discovery.href;
    link.textContent = discovery.label;
    container.appendChild(link);
  };

  // Fallback oscillator (more reliable for tones)
  function playTone(frequency, duration = 80, type = 'sine', volume = 0.3) {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0.001, now + duration/1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration/1000 + 0.05);
      // Auto close context after short time
      setTimeout(() => { try { ctx.close(); } catch(e){} }, duration + 200);
    } catch(e) {
      console.warn('Tone error', e);
    }
  }

  window.greiPlaySound = {
    click: () => playTone(880, 60, 'square', 0.3),
    hit: () => playTone(220, 100, 'sawtooth', 0.4),
    success: () => { playTone(660, 70, 'sine', 0.35); setTimeout(() => playTone(880, 55, 'sine', 0.3), 80); },
    move: () => playTone(520, 40, 'triangle', 0.25),
    error: () => playTone(180, 130, 'sawtooth', 0.45),
    toggle: () => { soundEnabled = !soundEnabled; return soundEnabled; }
  };

  // === GAMEBAR ===
  const style = document.createElement('style');
  style.textContent = `
    .grei-gamebar{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;background:rgba(4,5,10,.88);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.12)}
    .grei-gamebar a,.grei-gamebar button{min-height:40px;padding:0 13px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font:800 12px/1 system-ui;letter-spacing:.04em;cursor:pointer}
    .grei-gamebar strong{font:900 13px/1.2 system-ui;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.grei-gamebar-actions{display:flex;gap:7px}.grei-gamebar-spacer{height:58px}
    .grei-pause-screen{position:fixed;inset:0;z-index:99998;display:none;place-items:center;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);color:#fff;text-align:center}.grei-pause-screen.show{display:grid}.grei-pause-screen div{padding:28px}.grei-pause-screen h2{font:900 clamp(2.3rem,10vw,5rem)/.9 system-ui;margin:0 0 12px}.grei-pause-screen p{font:500 15px/1.5 system-ui;color:rgba(255,255,255,.7)}
    .sound-btn.active { background: var(--arcade-green, #4ade80) !important; color: #000 !important; }
    .grei-game-discovery{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:14px 0 0;padding:0 16px;border:1px solid rgba(255,255,255,.26);border-radius:999px;background:rgba(255,255,255,.07);color:#fff;font:800 12px/1 system-ui;letter-spacing:.04em;text-decoration:none}
    .grei-game-discovery:hover{background:rgba(255,255,255,.14)}
    body.grei-immersive{height:100dvh;overflow:hidden}body.grei-immersive .grei-gamebar,body.grei-immersive .grei-gamebar-spacer{display:none!important}body.grei-immersive .wrap{display:block;width:100%;height:100dvh;padding:0}body.grei-immersive .side{display:none}body.grei-immersive .layout{display:block;height:100%}body.grei-immersive .stage,body.grei-immersive .stage canvas{height:100dvh!important;min-height:100dvh!important;border:0!important;border-radius:0!important}body.grei-immersive .wrap>.hud{position:fixed;top:max(8px,env(safe-area-inset-top));left:10px;right:10px;z-index:10;pointer-events:none}
    @media(max-width:560px){.grei-gamebar strong{display:none}.grei-gamebar a,.grei-gamebar button{min-height:44px;padding:0 12px}.grei-gamebar-spacer{height:62px}}
  `;
  document.head.appendChild(style);

  const gameName = document.title.split('|')[0].trim() || 'Arcade Game';
  const bar = document.createElement('nav');
  bar.className = 'grei-gamebar';
  bar.innerHTML = `
    <a href="../../../arcade.html" aria-label="Back to Arcade">← Arcade</a>
    <strong>${gameName}</strong>
    <div class="grei-gamebar-actions">
      <button type="button" data-grei-sound title="Toggle sounds">🔊</button>
      <button type="button" data-grei-pause>Pause</button>
      <button type="button" data-grei-fullscreen>Full screen</button>
    </div>`;

  const spacer = document.createElement('div'); spacer.className = 'grei-gamebar-spacer';
  const pauseScreen = document.createElement('div'); pauseScreen.className = 'grei-pause-screen';
  pauseScreen.innerHTML = '<div><h2>PAUSED</h2><p>Tap Pause again or press Space to continue.</p></div>';

  document.body.prepend(spacer);
  document.body.prepend(bar);
  document.body.appendChild(pauseScreen);

  const soundBtn = bar.querySelector('[data-grei-sound]');
  soundBtn.addEventListener('click', () => {
    const enabled = window.greiPlaySound.toggle();
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    soundBtn.classList.toggle('active', enabled);
  });

  let paused = false;
  let immersive = false;
  const pauseBtn = bar.querySelector('[data-grei-pause]');
  const fullscreenBtn = bar.querySelector('[data-grei-fullscreen]');

  function setPaused(next) {
    paused = Boolean(next);
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseScreen.classList.toggle('show', paused);
    window.dispatchEvent(new CustomEvent('grei:pause', { detail: { paused } }));
  }

  pauseBtn.addEventListener('click', () => setPaused(!paused));
  pauseScreen.addEventListener('click', () => setPaused(false));
  const nativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const updateFullscreenButton = () => { fullscreenBtn.textContent = nativeFullscreenElement() || immersive ? 'Exit full screen' : 'Full screen'; };
  const setImmersive = next => { immersive = Boolean(next); document.body.classList.toggle('grei-immersive', immersive); window.scrollTo(0, 0); updateFullscreenButton(); };
  async function toggleFullscreen() {
    const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (nativeFullscreenElement()) {
      try { await exit?.call(document); } catch {}
      return;
    }
    if (immersive) { setImmersive(false); return; }
    if (request) {
      try { await request.call(document.documentElement); return; } catch {}
    }
    setImmersive(true);
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'Space') { event.preventDefault(); setPaused(!paused); }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
  });

  document.addEventListener('fullscreenchange', () => { if (nativeFullscreenElement()) immersive = false; updateFullscreenButton(); });
  document.addEventListener('webkitfullscreenchange', () => { if (nativeFullscreenElement()) immersive = false; updateFullscreenButton(); });

  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

  window.addEventListener('DOMContentLoaded', () => {
    if (gameName !== 'Jamaica Run') return;
    const endScreen = document.getElementById('endScreen');
    const endCard = endScreen?.querySelector('.card');
    if (!endScreen || !endCard) return;
    const showDiscovery = () => { if (!endScreen.hidden) window.greiShowDiscovery(endCard, 'jamaica-run'); };
    new MutationObserver(showDiscovery).observe(endScreen, { attributes: true, attributeFilter: ['hidden'] });
    showDiscovery();
  });

  window.greiIsPaused = () => paused;
})();
