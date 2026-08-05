// Grei Site - Legacy compatibility entry
(function () {
  if (document.querySelector('script[data-grei-site]')) return;
  const script = document.createElement('script');
  script.src = '/assets/js/core/site.js?v=20260805-1';
  script.defer = true;
  script.dataset.greiSite = 'true';
  document.body.appendChild(script);
})();
