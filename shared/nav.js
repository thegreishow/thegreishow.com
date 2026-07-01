// Grei Site - Global Navigation Injector

async function loadNav() {
  try {
    const res = await fetch('./shared/nav.html');
    const html = await res.text();

    const mount = document.getElementById('site-header');
    if (!mount) return;

    mount.innerHTML = html;
  } catch (err) {
    console.error('[Nav Loader] Failed to load navigation:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadNav);