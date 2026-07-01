/* THE GREI SHOW - APP CORE LAYER */

async function loadHeader() {
  const mount = document.getElementById('site-header');
  if (!mount) return;

  if (document.querySelector('.site-header')) {
    window.hideCurrentPageLink?.();
    return;
  }

  try {
    const res = await fetch('shared/nav.html');
    if (!res.ok) throw new Error('Shared navigation not found');

    const html = await res.text();
    mount.innerHTML = html;
    window.hideCurrentPageLink?.();
  } catch (err) {
    console.error('Header load failed:', err);
  }
}

// =========================
// CMS LAYER (NEW)
// =========================

async function loadCMS() {
  try {
    const res = await fetch('assets/data/cms.json');
    return await res.json();
  } catch (err) {
    console.error('CMS load failed:', err);
    return null;
  }
}

function renderMusic(cms) {
  if (!cms?.music) return;

  const title = document.getElementById('music-title');
  const container = document.getElementById('music-tracks');

  if (title) title.textContent = cms.music.title;

  if (container && cms.music.tracks) {
    container.innerHTML = '';
    cms.music.tracks.forEach(track => {
      const el = document.createElement('div');
      el.innerHTML = `
        <p>${track.name}</p>
        <audio controls src="${track.url}"></audio>
      `;
      container.appendChild(el);
    });
  }
}

async function initCMS() {
  const cms = await loadCMS();
  if (!cms) return;

  renderMusic(cms);
}

// =========================

function initPage() {
  document.body.classList.add('app-loaded');
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  initPage();
  await initCMS();
});