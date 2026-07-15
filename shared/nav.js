// Grei Site - Global Navigation Injector
// Loads the shared header and marks the current page consistently.

(function () {
  let navInjected = false;

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

  function injectNav(html) {
    const existing = document.querySelector('.site-header');

    if (navInjected || existing) {
      navInjected = true;
      markCurrentNavLink();
      return;
    }

    const mount = document.getElementById('site-header');

    if (mount) {
      mount.innerHTML = html;
    } else {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
    }

    navInjected = true;
    markCurrentNavLink();
  }

  async function fetchNavHtml() {
    const paths = ['shared/nav.html', '/shared/nav.html'];

    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) return res.text();
      } catch (err) {
        // Try the next path before reporting failure.
      }
    }

    throw new Error('Shared navigation not found');
  }

  async function loadNav() {
    try {
      const html = await fetchNavHtml();
      injectNav(html);
    } catch (err) {
      console.error('[Nav Loader] Failed to load navigation:', err);
    }
  }

  window.markCurrentNavLink = markCurrentNavLink;
  document.addEventListener('DOMContentLoaded', loadNav);
})();
