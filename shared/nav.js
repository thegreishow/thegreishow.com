// Grei Site - Global Navigation Injector (Auto + Stable System)
// Ensures navigation is consistent across ALL pages and subroutes

let navInjected = false;

function injectNav(html) {
  const existing = document.querySelector('.site-header');

  // If another loader already rendered the nav, only apply page cleanup.
  if (navInjected || existing) {
    navInjected = true;
    hideCurrentPageLink();
    return;
  }

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

function getLinkPage(link) {
  const href = link.getAttribute('href');
  if (!href) return '';

  const url = new URL(href, window.location.href);
  const path = url.pathname.split('/').pop();
  return path || 'index.html';
}

function hideCurrentPageLink() {
  try {
    const currentPage = getCurrentPage();

    document.querySelectorAll('.site-nav a').forEach(link => {
      const isCurrentPage = getLinkPage(link) === currentPage;

      link.hidden = isCurrentPage;
      link.style.display = isCurrentPage ? 'none' : '';
      link.toggleAttribute('aria-current', isCurrentPage);
    });
  } catch (e) {
    console.warn('Nav current-page cleanup failed', e);
  }
}

async function fetchNavHtml() {
  const primary = await fetch('/shared/nav.html');
  if (primary.ok) return primary.text();

  const fallback = await fetch('shared/nav.html');
  if (!fallback.ok) throw new Error('Shared navigation not found');

  return fallback.text();
}

async function loadNav() {
  try {
    const html = await fetchNavHtml();
    injectNav(html);
  } catch (err) {
    console.error('[Nav Loader] Failed to load navigation:', err);
  }
}

window.hideCurrentPageLink = hideCurrentPageLink;
document.addEventListener('DOMContentLoaded', loadNav);
