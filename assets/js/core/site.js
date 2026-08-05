// Grei Site - Global bootstrap
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

  function loadScript(src, datasetKey) {
    const baseSrc = src.split('?')[0];
    const existing = document.querySelector(`script[src^="${baseSrc}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      if (datasetKey) script.dataset[datasetKey] = 'true';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.body.appendChild(script);
    });
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    ensureFavicon();

    try {
      await Promise.all([
        loadScript('/assets/js/components/navigation.js?v=20260805-1', 'navigation'),
        loadScript('/assets/js/components/footer.js?v=20260805-1', 'footer')
      ]);
      await Promise.all([
        window.GreiNavigation?.init(),
        window.GreiFooter?.init()
      ]);
    } catch (error) {
      console.error('[Site Bootstrap] Shared components failed to initialize:', error);
    }

    loadScript('/assets/js/core/site-features.js?v=20260805-2', 'siteFeatures').catch(error => {
      console.error('[Site Bootstrap] Feature bootstrap failed to load:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
