(function () {
  const form = document.getElementById('project-inquiry');
  const interest = document.getElementById('interest');
  const date = document.getElementById('date');
  const prepared = document.getElementById('prepared-inquiry');
  const emailLink = document.getElementById('prepared-email-link');
  const serviceCards = [...document.querySelectorAll('[data-interest]')];
  if (!form || !interest || !date || !prepared || !emailLink) return;

  const interestAliases = {
    'creative-project': 'creative-direction',
    production: 'music-production',
    performance: 'live-performance',
    'The Grei Show — Live Performance': 'live-performance',
    'DJ Set': 'dj-set',
    'Music Production / Studio Session': 'studio-session',
    'Studio Session / Production Consultation': 'studio-session',
    'Photography / Video': 'photo-video',
    'Talent Booking — White Line Entertainment': 'talent-booking',
    'Kingston Experience / Tour': 'kingston-experience'
  };

  const hasInterest = value => [...interest.options].some(option => option.value === value);

  function syncServiceCards(value) {
    serviceCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.interest === value)));
  }

  function selectInterest(value, scrollToForm) {
    if (!hasInterest(value)) return;
    interest.value = value;
    syncServiceCards(value);
    if (scrollToForm) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      interest.focus({ preventScroll: true });
    }
  }

  const params = new URLSearchParams(window.location.search);
  const requestedInterest = params.get('interest') || params.get('service');
  const selectedInterest = interestAliases[requestedInterest] || requestedInterest;
  if (selectedInterest) selectInterest(selectedInterest, false);

  serviceCards.forEach(card => card.addEventListener('click', () => selectInterest(card.dataset.interest, true)));
  interest.addEventListener('change', () => syncServiceCards(interest.value));

  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().split('T')[0];

  document.querySelector('.connect-hero p:last-child')?.replaceChildren(document.createTextNode('Choose what you need, share the essential details, and submit one clear request for review. You will receive an automatic confirmation by email.'));
  document.querySelector('.form-note')?.replaceChildren(document.createTextNode('Your request is submitted securely to White Line Entertainment.'));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Submitting securely…';
    prepared.hidden = true;

    const fields = new FormData(form);
    const serviceLabel = interest.options[interest.selectedIndex].text;
    const details = [
      fields.get('brief'),
      `Timeline: ${fields.get('timeline')}`,
      `Budget range: ${fields.get('budget')}`,
      `Preferred date: ${fields.get('date') || 'Not applicable'}`,
      `Location / venue: ${fields.get('location') || 'Not applicable'}`,
      `WhatsApp / phone: ${fields.get('phone') || 'Not provided'}`
    ].join('\n\n');

    try {
      const selectedService = interest.value;
      const response = await fetch('/api/whiteline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: String(fields.get('name')).trim(),
          email: String(fields.get('email')).trim().toLowerCase(),
          phone: String(fields.get('phone') || '').trim(),
          project_type: selectedService,
          project_description: String(fields.get('brief') || '').trim(),
          timeline: String(fields.get('timeline') || ''),
          budget: String(fields.get('budget') || ''),
          event_date: String(fields.get('date') || ''),
          location: String(fields.get('location') || '').trim(),
          website: String(fields.get('website') || ''),
          turnstile_token: String(fields.get('turnstile_token') || '')
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Request could not be submitted.');

      form.reset();
      syncServiceCards('');
      prepared.hidden = false;
      prepared.querySelector('p').textContent = 'Request received. Check your inbox for an automatic confirmation from White Line Entertainment.';
      emailLink.hidden = true;
      prepared.focus();
      window.greiTrack?.('grei_lead_submitted', { service: selectedService });
    } catch (error) {
      const subject = `Inquiry - ${serviceLabel}`;
      const body = `Name: ${fields.get('name')}\nEmail: ${fields.get('email')}\n\n${details}`;
      emailLink.href = `mailto:bookings@thegreishow.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      emailLink.hidden = false;
      emailLink.textContent = 'Send by email instead';
      prepared.hidden = false;
      prepared.querySelector('p').textContent = 'The secure form could not submit this request. Your information has not been lost; use the email option below.';
      prepared.focus();
      console.error('White Line inquiry submission failed', error);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

})();
