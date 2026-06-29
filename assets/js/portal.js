// Portal Transition System v3.0
// Cinematic cross-page transition engine

(function () {
  const overlay = document.createElement('div');
  overlay.className = 'portal-overlay';
  document.body.appendChild(overlay);

  let isTransitioning = false;

  function activateOverlay() {
    overlay.classList.add('active');
    overlay.classList.add('portal-enter');
  }

  function deactivateOverlay() {
    overlay.classList.remove('active');
  }

  function navigate(href) {
    if (isTransitioning) return;
    isTransitioning = true;

    // pre-transition effect
    document.body.classList.add('portal-out');

    activateOverlay();

    setTimeout(() => {
      window.location.href = href;
    }, 520);
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');

    // ignore external / anchors
    if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return;

    e.preventDefault();
    navigate(href);
  });

  window.addEventListener('load', () => {
    setTimeout(() => {
      overlay.classList.remove('active');
      document.body.classList.remove('portal-out');
    }, 280);
  });
})();