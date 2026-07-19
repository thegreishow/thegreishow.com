window.WHITE_LINE_DATA = window.WHITE_LINE_DATA || { talent: [], castingCalls: [] };

(() => {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src.includes(src));
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  Promise.resolve()
    .then(() => window.supabase?.createClient ? null : loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'))
    .then(() => window.WHITE_LINE_SUPABASE?.url ? null : loadScript('assets/js/whiteline-supabase-config.js'))
    .then(() => loadScript('assets/js/whiteline-database.js'))
    .then(() => loadScript('assets/js/whiteline-media-enhancements.js'))
    .then(() => loadScript('assets/js/whiteline-live-onboarding.js'))
    .catch((error) => console.error('White Line scripts failed to load', error));
})();
