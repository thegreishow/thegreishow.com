/* THE GREI SHOW - APP CORE LAYER */

async function loadHeader() {
  const mount = document.getElementById('site-header');
  if (!mount) return;

  try {
    const res = await fetch('assets/components/header.html');
    const html = await res.text();
    mount.innerHTML = html;
  } catch (err) {
    console.error('Header load failed:', err);
  }
}

function initPage() {
  document.body.classList.add('app-loaded');
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  initPage();
});