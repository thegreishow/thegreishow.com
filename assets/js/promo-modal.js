// Shared platform modal behavior for legacy promo pages.
(function () {
  function init() {
    const modal = document.getElementById('stream-modal');
    const openButton = document.getElementById('open-platforms');
    const closeButton = modal?.querySelector('.modal-close');
    if (!modal || !openButton || !closeButton || modal.dataset.bound === 'true') return;

    modal.dataset.bound = 'true';
    let previousFocus = null;

    const open = () => {
      previousFocus = document.activeElement;
      modal.classList.add('open');
      closeButton.focus();
    };

    const close = () => {
      modal.classList.remove('open');
      previousFocus?.focus?.();
    };

    openButton.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
