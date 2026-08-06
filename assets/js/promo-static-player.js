(function () {
  const audioLink = document.querySelector('.asset-actions a[href*="drive.google.com/uc"], .asset-actions a[href*="/api/media"], .asset-actions a[href$=".mp3"], .asset-actions a[href$=".m4a"], .asset-actions a[href$=".wav"]');
  const strip = document.querySelector('.promo-strip');
  const title = document.querySelector('.promo-title')?.textContent?.replace(/\s+/g, ' ').trim() || document.title.split('—')[0].trim();
  if (!audioLink || !strip || document.querySelector('.legacy-promo-player')) return;

  const stylesheetId = 'legacy-promo-player-styles';
  if (!document.getElementById(stylesheetId)) {
    const stylesheet = document.createElement('link');
    stylesheet.id = stylesheetId;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/assets/css/promo-static-player.css';
    document.head.appendChild(stylesheet);
  }

  const section = document.createElement('section');
  section.className = 'legacy-promo-player-section';
  section.setAttribute('aria-label', `Listen to ${title}`);
  section.innerHTML = `
    <div class="legacy-promo-player">
      <button class="legacy-promo-play" type="button" aria-label="Play ${escapeAttribute(title)}">▶</button>
      <div class="legacy-promo-player-copy">
        <strong>${escapeHtml(title)}</strong>
        <small class="legacy-promo-time">0:00 / 0:00</small>
        <div class="legacy-promo-status" aria-live="polite">Ready to play</div>
        <input class="legacy-promo-progress" type="range" min="0" max="100" value="0" aria-label="Track progress">
      </div>
      <a class="home-button legacy-promo-download" href="${escapeAttribute(audioLink.href)}">Download audio</a>
    </div>`;

  strip.insertAdjacentElement('afterend', section);

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.playsInline = true;
  audio.src = audioLink.href;

  const playButton = section.querySelector('.legacy-promo-play');
  const time = section.querySelector('.legacy-promo-time');
  const status = section.querySelector('.legacy-promo-status');
  const progress = section.querySelector('.legacy-promo-progress');

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  function syncTime() {
    progress.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : '0';
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  playButton.addEventListener('click', async () => {
    if (audio.paused) {
      status.textContent = 'Loading audio…';
      try {
        await audio.play();
      } catch (error) {
        console.error('Promo playback failed', error);
        status.innerHTML = `Playback could not start. <a href="${escapeAttribute(audioLink.href)}">Download the track ↗</a>`;
      }
    } else {
      audio.pause();
    }
  });

  progress.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  });

  audio.addEventListener('loadedmetadata', () => {
    status.textContent = 'Ready to play';
    syncTime();
  });
  audio.addEventListener('timeupdate', syncTime);
  audio.addEventListener('waiting', () => { status.textContent = 'Loading audio…'; });
  audio.addEventListener('canplay', () => { status.textContent = audio.paused ? 'Ready to play' : 'Playing'; });
  audio.addEventListener('play', () => {
    playButton.textContent = '❚❚';
    playButton.setAttribute('aria-label', `Pause ${title}`);
    status.textContent = 'Playing';
    window.greiTrack?.('grei_promo_play', { title, source: location.pathname });
  });
  audio.addEventListener('pause', () => {
    playButton.textContent = '▶';
    playButton.setAttribute('aria-label', `Play ${title}`);
    status.textContent = audio.currentTime ? 'Paused' : 'Ready to play';
  });
  audio.addEventListener('ended', () => {
    playButton.textContent = '▶';
    playButton.setAttribute('aria-label', `Play ${title}`);
    status.textContent = 'Finished';
  });
  audio.addEventListener('error', () => {
    playButton.textContent = '▶';
    status.innerHTML = `Preview unavailable. <a href="${escapeAttribute(audioLink.href)}">Download the track ↗</a>`;
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
