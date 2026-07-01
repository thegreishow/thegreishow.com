// Grei Site - Global Navigation Injector (Auto + Stable System)
// Ensures navigation is consistent across ALL pages and subroutes

let navInjected = false;

function injectNav(html) {
  if (navInjected) return;

  // Prevent duplicates if script runs twice
  const existing = document.querySelector('.site-header');
  if (existing) return;

  const mount = document.getElementById('site-header');

  if (mount) {
    mount.innerHTML = html;
  } else {
    // AUTO-INJECT MODE (fallback for pages without mount)
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
  }

  navInjected = true;

  hideCurrentPageLink();
}

function getCurrentPage() {
  const path = window.location.pathname.split('/').pop();
  return path || 'index.html';
}

function hideCurrentPageLink() {
  try {
    const currentPage = getCurrentPage();

    document.querySelectorAll('.site-nav a').forEach(a => {
      const href = a.getAttribute('href');

      if (href === currentPage) {
        a.setAttribute('aria-current', 'page');
        a.hidden = true;
      }
    });
  } catch (e) {
    console.warn('Nav current-page cleanup failed', e);
  }
}

async function loadNav() {
  try {
    const res = await fetch('/shared/nav.html');
    const html = await res.text();

    injectNav(html);

  } catch (err) {
    console.error('[Nav Loader] Failed to load navigation:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadNav);
