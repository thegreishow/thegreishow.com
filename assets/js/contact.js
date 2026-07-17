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
    serviceCards.forEach(card => {
      card.setAttribute('aria-pressed', String(card.dataset.interest === value));
    });
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

  serviceCards.forEach(card => {
    card.addEventListener('click', () => selectInterest(card.dataset.interest, true));
  });

  interest.addEventListener('change', () => syncServiceCards(interest.value));

  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().split('T')[0];

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const serviceLabel = interest.options[interest.selectedIndex].text;
    const subject = `Inquiry - ${serviceLabel}`;
    const body = [
      'Hi Grei,',
      '',
      `Name: ${fields.get('name')}`,
      `Email: ${fields.get('email')}`,
      `WhatsApp / Phone: ${fields.get('phone') || 'Not provided'}`,
      `Request type: ${serviceLabel}`,
      `Preferred date: ${fields.get('date') || 'Not applicable'}`,
      `Timeline: ${fields.get('timeline')}`,
      `Location / venue: ${fields.get('location') || 'Not applicable'}`,
      `Budget range: ${fields.get('budget')}`,
      '',
      'REQUEST DETAILS',
      fields.get('brief'),
      '',
      'Thanks.'
    ].join('\n');

    emailLink.href = `mailto:thegreishow@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    prepared.hidden = false;
    prepared.focus();
    window.greiTrack?.('grei_lead_prepared', { service: interest.value });
  });
})();
