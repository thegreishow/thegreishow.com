// Grei Site - Release-list enhancement
(function () {
  function initReleaseList() {
    const panel = document.querySelector('.list-panel');
    if (!panel || document.getElementById('release-list-form')) return;

    const placeholder = panel.querySelector('a[href^="mailto:"]');
    const copy = panel.querySelector('.list-copy p:last-child');
    if (copy) {
      copy.textContent = 'Join the release list for new music, story chapters, visual drops, playable experiments, events, and limited releases.';
    }

    const form = document.createElement('form');
    form.id = 'release-list-form';
    form.className = 'release-list-form';
    form.innerHTML = '<label><span>First name</span><input name="first_name" type="text" autocomplete="given-name"></label><label><span>Email</span><input name="email" type="email" autocomplete="email" required></label><label><span>Country</span><input name="country" type="text" autocomplete="country-name"></label><label class="release-consent"><input name="consent" type="checkbox" required><span>I agree to receive release news and can unsubscribe at any time.</span></label><button class="home-button primary" type="submit">Join the list</button><p id="release-list-status" class="form-note" role="status" aria-live="polite"></p>';
    placeholder?.replaceWith(form);

    if (!document.querySelector('script[data-newsletter-client]')) {
      const script = document.createElement('script');
      script.src = '/assets/js/newsletter.js?v=20260727-2';
      script.defer = true;
      script.dataset.newsletterClient = 'true';
      document.body.appendChild(script);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReleaseList, { once: true });
  } else {
    initReleaseList();
  }
})();
