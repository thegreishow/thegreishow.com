// Grei Site - Global Navigation Injector
(function () {
  let initialized = false;

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = '/assets/favicon.svg';
    document.head.appendChild(icon);
  }

  const parentPages = {
    'music-videos.html': 'visuals.html',
    'documentaries.html': 'visuals.html',
    'live-sessions.html': 'visuals.html',
    'astralthread.html': 'books.html',
    'booking.html': 'connect.html',
    whiteline: 'whiteline.html',
    ilovekingston: 'ilovekingston.html',
    tours: 'ilovekingston.html',
    experiences: 'ilovekingston.html'
  };

  const getPage = pathname => pathname.split('/').pop() || 'index.html';
  const getCurrentPage = () => parentPages[getPage(location.pathname)] || getPage(location.pathname);

  function markCurrentNavLink() {
    const currentPage = getCurrentPage();
    document.querySelectorAll('.site-nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkPage = getPage(new URL(href, location.href).pathname);
      link.toggleAttribute('aria-current', linkPage === currentPage);
    });
    document.querySelectorAll('.nav-more').forEach(menu => {
      menu.classList.toggle('has-current', Boolean(menu.querySelector('a[aria-current="page"]')));
    });
  }

  function closeMobileNav(returnFocus = false) {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Menu';
    document.querySelectorAll('.nav-more[open]').forEach(menu => menu.removeAttribute('open'));
    if (returnFocus) toggle.focus();
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
      if (event.target.closest('a')) closeMobileNav();
    });
    document.addEventListener('click', event => {
      const header = document.querySelector('.site-header');
      if (header && !header.contains(event.target)) closeMobileNav();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileNav(nav.classList.contains('is-open'));
    });
    addEventListener('resize', () => {
      if (innerWidth > 900) closeMobileNav();
    }, { passive: true });
  }

  function initSiteEvents() {
    if (window.greiTrack) return;
    const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const params = new URLSearchParams(location.search);
    const currentCampaign = campaignKeys.reduce((campaign, key) => {
      const value = params.get(key);
      if (value) campaign[key] = value;
      return campaign;
    }, {});
    try {
      if (Object.keys(currentCampaign).length) sessionStorage.setItem('grei_attribution', JSON.stringify(currentCampaign));
    } catch {}
    const getAttribution = () => {
      try { return JSON.parse(sessionStorage.getItem('grei_attribution') || '{}'); }
      catch { return {}; }
    };
    function track(eventName, details = {}) {
      const trackedEvent = { event: eventName, page: location.pathname || '/', ...getAttribution(), ...details };
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(trackedEvent);
      dispatchEvent(new CustomEvent('grei:track', { detail: trackedEvent }));
    }
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-track]');
      if (!target) return;
      track('grei_cta_click', {
        action: target.dataset.track,
        label: target.dataset.trackLabel || target.textContent.trim()
      });
    });
    window.greiTrack = track;
    track('grei_page_view', { title: document.title });
  }

  function injectEmergencyNav() {
    const mount = document.getElementById('site-header');
    if (!mount || mount.children.length) return;
    mount.innerHTML = '<header class="site-header"><div class="nav-container"><a class="brand" href="/">THE GREI SHOW</a><nav class="site-nav is-open" aria-label="Emergency navigation"><a href="/music.html">Music</a><a href="/visuals.html">Visuals</a><a href="/books.html">Books</a><a href="/whiteline.html">Talent Agency</a><a href="/ilovekingston.html">Tours &amp; Experiences</a><a href="/arcade.html">Arcade</a><a href="/about.html">About</a><a href="/connect.html">Connect</a></nav></div></header>';
  }

  async function loadNav() {
    try {
      const response = await fetch('/shared/nav.html', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Navigation unavailable');
      const mount = document.getElementById('site-header');
      if (mount) mount.innerHTML = await response.text();
      bindNavControls();
      markCurrentNavLink();
    } catch (error) {
      console.error('[Nav Loader] Failed to load navigation:', error);
      injectEmergencyNav();
    }
  }

  function enhanceReleaseList() {
    const panel = document.querySelector('.list-panel');
    if (!panel || document.getElementById('release-list-form')) return;
    const placeholder = panel.querySelector('a[href^="mailto:"]');
    panel.querySelector('.list-copy p:last-child').textContent = 'Join the release list for new music, story chapters, visual drops, playable experiments, events, and limited releases.';
    const form = document.createElement('form');
    form.id = 'release-list-form';
    form.className = 'release-list-form';
    form.innerHTML = '<label><span>First name</span><input name="first_name" type="text" autocomplete="given-name"></label><label><span>Email</span><input name="email" type="email" autocomplete="email" required></label><label><span>Country</span><input name="country" type="text" autocomplete="country-name"></label><label class="release-consent"><input name="consent" type="checkbox" required><span>I agree to receive release news and can unsubscribe at any time.</span></label><button class="home-button primary" type="submit">Join the list</button><p id="release-list-status" class="form-note" role="status" aria-live="polite"></p>';
    placeholder?.replaceWith(form);
    const script = document.createElement('script');
    script.src = 'assets/js/newsletter.js';
    document.body.appendChild(script);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensureFavicon();
    initSiteEvents();
    loadNav();
    enhanceReleaseList();
  }

  window.markCurrentNavLink = markCurrentNavLink;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
