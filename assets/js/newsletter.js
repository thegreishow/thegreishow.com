(function () {
  const form = document.getElementById('release-list-form');
  const status = document.getElementById('release-list-status');
  if (!form || !status) return;

  const endpoint = 'https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/subscribe-release-list';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const original = button.textContent;
    const fields = new FormData(form);

    button.disabled = true;
    button.textContent = 'Joining…';
    status.textContent = '';
    status.dataset.state = '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(fields.get('email') || '').trim().toLowerCase(),
          first_name: String(fields.get('first_name') || '').trim(),
          country: String(fields.get('country') || '').trim(),
          marketing_consent: fields.get('consent') === 'on',
          website: String(fields.get('website') || ''),
          referrer: document.referrer || location.href
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Signup failed');

      form.reset();
      status.textContent = result.message || 'You are on the list. Check your inbox.';
      status.dataset.state = 'success';
      window.greiTrack?.('grei_newsletter_signup', {
        source: location.pathname,
        conversion: true
      });
    } catch (error) {
      status.textContent = 'The list could not be updated right now. Please try again or email thegreishow@gmail.com.';
      status.dataset.state = 'error';
      console.error('Release-list signup failed', error);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
})();