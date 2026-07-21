(function () {
  const form = document.getElementById('release-list-form');
  const status = document.getElementById('release-list-status');
  if (!form || !status) return;

  const SUPABASE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  let dbPromise;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const original = button.textContent;
    const fields = new FormData(form);
    button.disabled = true;
    button.textContent = 'Joining…';
    status.textContent = '';

    try {
      const db = await getDatabase();
      const email = String(fields.get('email')).trim().toLowerCase();
      const { error } = await db.from('release_list_subscribers').insert({
        email,
        first_name: String(fields.get('first_name') || '').trim() || null,
        country: String(fields.get('country') || '').trim() || null,
        interests: ['music', 'stories', 'games', 'events'],
        source: `thegreishow.com${location.pathname}`,
        consent_to_marketing: fields.get('consent') === 'on'
      });

      if (error) {
        if (error.code === '23505') {
          status.textContent = 'You are already on the list. The next transmission will find you.';
          status.dataset.state = 'success';
          return;
        }
        throw error;
      }

      form.reset();
      status.textContent = 'You are in. Watch your inbox for the next transmission.';
      status.dataset.state = 'success';
      window.greiTrack?.('grei_newsletter_signup', { source: location.pathname });
    } catch (error) {
      status.textContent = 'The list could not be updated right now. Please try again or email thegreishow@gmail.com.';
      status.dataset.state = 'error';
      console.error('Release-list signup failed', error);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  function getDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const connect = () => {
        try { resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)); }
        catch (error) { reject(error); }
      };
      if (window.supabase?.createClient) return connect();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.crossOrigin = 'anonymous';
      script.onload = connect;
      script.onerror = () => reject(new Error('Could not load signup service.'));
      document.head.appendChild(script);
    });
    return dbPromise;
  }
})();