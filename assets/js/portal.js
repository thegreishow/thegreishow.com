// Portal Transition System
// Creates cinematic page transitions across the entire platform

(function () {
  const overlay = document.createElement('div');
  overlay.className = 'portal-overlay';
  document.body.appendChild(overlay);

  function activateOverlay() {
    overlay.classList.add('active');
  }

  function deactivateOverlay() {
    overlay.classList.remove('active');
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');

    if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return;

    e.preventDefault();
    activateOverlay();

    setTimeout(() => {
      window.location.href = href;
    }, 450);
  });

  window.addEventListener('load', () => {
    setTimeout(deactivateOverlay, 300);
  });
})();