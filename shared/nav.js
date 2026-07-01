// Grei Site - Global Navigation Injector
// Fixed pathing issue for nested routes (arcade/, etc.)

async function loadNav() {
  try {
    // FIX: use absolute path so it works from ANY directory level
    const res = await fetch('/shared/nav.html');
    const html = await res.text();

    const mount = document.getElementById('site-header');
    if (!mount) return;

    mount.innerHTML = html;
  } catch (err) {
    console.error('[Nav Loader] Failed to load navigation:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadNav);