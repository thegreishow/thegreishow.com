(function () {
  const containers = [...document.querySelectorAll('[data-turnstile-action]')];
  if (!containers.length) return;

  fetch('/api/form-security', { headers: { accept: 'application/json' } })
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      if (!config?.turnstileSiteKey) return;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => containers.forEach(container => {
        const form = container.closest('form');
        const input = form?.querySelector('[name="turnstile_token"]');
        const action = container.dataset.turnstileAction;
        window.turnstile.render(container, {
          sitekey: config.turnstileSiteKey,
          action,
          theme: 'dark',
          size: 'flexible',
          callback: token => {
            if (input) input.value = token;
          },
          'expired-callback': () => {
            if (input) input.value = '';
          },
          'error-callback': () => {
            if (input) input.value = '';
          }
        });
      });
      document.head.appendChild(script);
    })
    .catch(() => {});
})();
