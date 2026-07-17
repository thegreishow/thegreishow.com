// Grei Site - Global Navigation Injector
// Loads the shared header and marks the current page consistently.

(function () {
  let navInjected = false;

  const parentPages = {
    'music-videos.html': 'visuals.html',
    'documentaries.html': 'visuals.html',
    'live-sessions.html': 'visuals.html',
    'astralthread.html': 'books.html',
    'booking.html': 'connect.html'
  };

  function getPageFromPath(pathname) {
    const path = pathname.split('/').pop();
    return path || 'index.html';
  }

  function getCurrentPage() {
    const page = getPageFromPath(window.location.pathname);
    return parentPages[page] || page;
  }

  function getLinkPage(link) {
    const href = link.getAttribute('href');
    if (!href) return '';

    const url = new URL(href, window.location.href);
    return getPageFromPath(url.pathname);
  }

  function markCurrentNavLink() {
    const currentPage = getCurrentPage();

    document.querySelectorAll('.site-nav a').forEach(link => {
      const isCurrentPage = getLinkPage(link) === currentPage;
      link.toggleAttribute('aria-current', isCurrentPage);
    });

    document.querySelectorAll('.nav-more').forEach(menu => {
      const hasCurrentLink = Boolean(menu.querySelector('a[aria-current="page"]'));
      menu.classList.toggle('has-current', hasCurrentLink);
    });
  }

  function bindNavControls() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggle || !nav || toggle.dataset.bound === 'true') return;

    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = isOpen ? 'Close' : 'Menu';
    });

    nav.addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
      document.querySelectorAll('.nav-more[open]').forEach(menu => menu.removeAttribute('open'));
    });
  }

  function initSiteEvents() {
    if (window.greiTrack) return;

    const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const params = new URLSearchParams(window.location.search);
    const currentCampaign = campaignKeys.reduce((campaign, key) => {
      const value = params.get(key);
      if (value) campaign[key] = value;
      return campaign;
    }, {});

    try {
      if (Object.keys(currentCampaign).length) {
        sessionStorage.setItem('grei_attribution', JSON.stringify(currentCampaign));
      }
    } catch {}

    function getAttribution() {
      try {
        return JSON.parse(sessionStorage.getItem('grei_attribution') || '{}');
      } catch (error) {
        return {};
      }
    }

    function track(eventName, details) {
      const trackedEvent = {
        event: eventName,
        page: window.location.pathname || '/',
        ...getAttribution(),
        ...details
      };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(trackedEvent);
      window.dispatchEvent(new CustomEvent('grei:track', { detail: trackedEvent }));
    }

    function getSafeDestination(target) {
      const rawDestination = target.getAttribute('href') || '';
      if (!rawDestination) return '';
      if (rawDestination.startsWith('#')) return rawDestination;

      try {
        const url = new URL(rawDestination, window.location.href);
        if (url.protocol === 'mailto:' || url.protocol === 'tel:') return url.protocol.slice(0, -1);
        return url.origin === window.location.origin ? url.pathname : `${url.origin}${url.pathname}`;
      } catch (error) {
        return '';
      }
    }

    document.addEventListener('click', event => {
      const target = event.target.closest('[data-track]');
      if (!target) return;

      track('grei_cta_click', {
        action: target.dataset.track,
        label: target.dataset.trackLabel || target.textContent.trim(),
        destination: getSafeDestination(target)
      });
    });

    window.greiTrack = track;
    track('grei_page_view', { title: document.title });
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
    bindNavControls();
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
  document.addEventListener('DOMContentLoaded', () => {
    initSiteEvents();
    loadNav();
  });
})();
