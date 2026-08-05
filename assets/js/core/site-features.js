// Grei Site - Path-aware feature bootstrap
(function () {
  const loadedScripts = new Set();

  function loadScript(src, datasetKey) {
    const baseSrc = src.split('?')[0];
    if (loadedScripts.has(src) || document.querySelector(`script[src^="${baseSrc}"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    if (datasetKey) script.dataset[datasetKey] = 'true';
    loadedScripts.add(src);
    document.body.appendChild(script);
  }

  function loadGlobalFeatures() {
    loadScript('/assets/js/core/analytics.js?v=20260805-1', 'siteAnalytics');
    if (document.querySelector('.list-panel')) {
      loadScript('/assets/js/features/release-list.js?v=20260805-1', 'releaseList');
    }
  }

  function loadPromoFeatures() {
    if (!location.pathname.startsWith('/promo/')) return;
    loadScript('/assets/js/promo-video.js?v=20260803-1', 'promoVideo');
    loadScript('/assets/js/promo-modal.js?v=20260805-1', 'promoModal');
  }

  function init() {
    loadGlobalFeatures();
    loadPromoFeatures();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
