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

  // === INTERACTION SOUND SYSTEM (Motion/Click/Hit sounds only - no BGM) ===
  let audioCtx;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('AudioContext not supported');
      }
    }
    return audioCtx;
  }

  function playTone(frequency, duration = 80, type = 'sine', volume = 0.3) {
    if (!soundEnabled) return;
    const ctx = initAudio();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    gain.gain.value = volume;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + duration / 1000);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000 + 0.05);
  }

  // Public sound helpers for games
  window.greiPlaySound = {
    click: () => playTone(880, 60, 'square', 0.25),
    hit: () => playTone(220, 120, 'sawtooth', 0.35),
    success: () => { playTone(660, 80, 'sine', 0.3); setTimeout(() => playTone(880, 60, 'sine', 0.25), 90); },
    move: () => playTone(440, 40, 'triangle', 0.2),
    error: () => playTone(180, 150, 'sawtooth', 0.4),
    toggle: () => { soundEnabled = !soundEnabled; return soundEnabled; }
  };

  // === EXISTING STYLES + GAMEBAR ===
  const style = document.createElement('style');
  style.textContent = `
    .grei-gamebar{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;background:rgba(4,5,10,.88);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.12)}
    .grei-gamebar a,.grei-gamebar button{min-height:40px;padding:0 13px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font:800 12px/1 system-ui;letter-spacing:.04em;cursor:pointer}
    .grei-gamebar strong{font:900 13px/1.2 system-ui;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.grei-gamebar-actions{display:flex;gap:7px}.grei-gamebar-spacer{height:58px}
    .grei-pause-screen{position:fixed;inset:0;z-index:99998;display:none;place-items:center;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);color:#fff;text-align:center}.grei-pause-screen.show{display:grid}.grei-pause-screen div{padding:28px}.grei-pause-screen h2{font:900 clamp(2.3rem,10vw,5rem)/.9 system-ui;margin:0 0 12px}.grei-pause-screen p{font:500 15px/1.5 system-ui;color:rgba(255,255,255,.7)}
    .sound-btn.active { background: var(--arcade-green, #4ade80) !important; color: #000 !important; }
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
      <button type="button" data-grei-sound title="Toggle interaction sounds">🔊</button>
      <button type="button" data-grei-pause>Pause</button>
      <button type="button" data-grei-fullscreen>Full screen</button>
    </div>`;

  const spacer = document.createElement('div'); spacer.className = 'grei-gamebar-spacer';
  const pauseScreen = document.createElement('div'); pauseScreen.className = 'grei-pause-screen';
  pauseScreen.innerHTML = '<div><h2>PAUSED</h2><p>Tap Pause again or press P to continue.</p></div>';

  document.body.prepend(spacer);
  document.body.prepend(bar);
  document.body.appendChild(pauseScreen);

  // Sound toggle button
  const soundBtn = bar.querySelector('[data-grei-sound]');
  soundBtn.addEventListener('click', () => {
    const enabled = window.greiPlaySound.toggle();
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    soundBtn.classList.toggle('active', enabled);
  });

  let paused = false;
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
  window.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'p') setPaused(!paused); });

  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

  // Expose pause state
  window.greiIsPaused = () => paused;
})();