// Grei Site - Analytics and campaign attribution
(function () {
  if (window.greiTrack) return;

  const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const params = new URLSearchParams(location.search);
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
    } catch {
      return {};
    }
  }

  function track(eventName, details = {}) {
    const trackedEvent = {
      event: eventName,
      page: location.pathname || '/',
      ...getAttribution(),
      ...details
    };

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
})();
