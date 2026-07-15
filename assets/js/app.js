/* THE GREI SHOW - APP CORE LAYER */

function getCurrentPage() {
  const path = window.location.pathname.split('/').pop();
  return path || 'index.html';
}

function getLinkPage(link) {
  const href = link.getAttribute('href');
  if (!href) return '';

  const url = new URL(href, window.location.href);
  const path = url.pathname.split('/').pop();
  return path || 'index.html';
}

function markCurrentNavLink() {
  const currentPage = getCurrentPage();

  document.querySelectorAll('.site-nav a').forEach(link => {
    const isCurrentPage = getLinkPage(link) === currentPage;
    link.toggleAttribute('aria-current', isCurrentPage);
  });
}

async function loadHeader() {
  const mount = document.getElementById('site-header');
  if (!mount) return;

  if (document.querySelector('.site-header')) {
    window.markCurrentNavLink?.();
    markCurrentNavLink();
    return;
  }

  try {
    const res = await fetch('shared/nav.html');
    if (!res.ok) throw new Error('Shared navigation not found');

    const html = await res.text();
    mount.innerHTML = html;
    window.markCurrentNavLink?.();
    markCurrentNavLink();
  } catch (err) {
    console.error('Header load failed:', err);
  }
}

// =========================
// CMS LAYER
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

function initPage() {
  document.body.classList.add('app-loaded');
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  initPage();
  await initCMS();
});
