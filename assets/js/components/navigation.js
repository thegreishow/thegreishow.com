// Grei Site - Shared navigation component
(function () {
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

  function injectEmergencyNav() {
    const mount = document.getElementById('site-header');
    if (!mount || mount.children.length) return;
    mount.innerHTML = '<header class="site-header"><div class="nav-container"><a class="brand" href="/">THE GREI SHOW</a><nav class="site-nav is-open" aria-label="Emergency navigation"><a href="/music.html">Music</a><a href="/visuals.html">Visuals</a><a href="/books.html">Books</a><a href="/whiteline.html">Talent Agency</a><a href="/ilovekingston.html">Tours &amp; Experiences</a><a href="/arcade.html">Arcade</a><a href="/about.html">About</a><a href="/connect.html">Connect</a></nav></div></header>';
  }

  async function init() {
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

  window.markCurrentNavLink = markCurrentNavLink;
  window.GreiNavigation = { init, markCurrentNavLink, closeMobileNav };
})();
